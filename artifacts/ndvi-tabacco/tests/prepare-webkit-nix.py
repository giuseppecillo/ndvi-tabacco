"""Prepare an ignored, browser-only Nix library wrapper for Playwright WebKit.

Usage: python artifacts/ndvi-tabacco/tests/prepare-webkit-nix.py <webkit-dir>
Use the Debian 13 Playwright bundle, whose SONAMEs match available Nix libraries.
No library aliases, package downloads, or application configuration changes.
"""
import glob
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys

bundle = Path(sys.argv[1]).resolve() / "minibrowser-wpe"
executable = bundle / "bin/MiniBrowser"
assert executable.is_file(), executable
output = Path(__file__).resolve().parents[3] / "generated-artifacts/dose-export-languages/webkit-runtime"
output.mkdir(parents=True, exist_ok=True)
directories = [str(bundle / "lib"), str(bundle / "sys/lib")]


def version_key(filename):
    package = Path(filename).parent.parent.name[33:]
    match = re.search(r"-(\d[\d.]*)", package)
    return tuple(int(n) for n in match.group(1).strip(".").split(".")) if match else (0,)


def resolve(name):
    candidates = glob.glob(f"/nix/store/*/lib/{name}")
    assert candidates, f"Missing exact SONAME: {name}"
    return str(Path(max(candidates, key=version_key)).parent)


# Keep current C++ runtime first; older libatomic packages must not select old C++.
directories.append(resolve("libstdc++.so.6"))
loader = Path(resolve("ld-linux-x86-64.so.2")) / "ld-linux-x86-64.so.2"
for _ in range(100):
    result = subprocess.run([str(loader), "--library-path", ":".join(directories),
                             "--list", str(executable)], capture_output=True, text=True)
    # Unlike ldd, ld.so stops at the first missing dependency.
    missing_error = re.findall(r"shared libraries: (\S+): cannot open", result.stderr)
    missing = sorted(set(re.findall(r"(\S+) => not found", result.stdout)))
    missing.extend(missing_error)
    # Also make transitive Nix RUNPATH resolutions explicit for the ELF loader
    # used by MiniBrowser and its subprocesses (which can load in another order).
    for resolved in re.findall(r"=> (/nix/store/\S+)", result.stdout):
        # Replit's shell loader can report virtual hwcaps paths. They are not
        # real files and are unavailable to Node-spawned browser processes.
        directory = str(Path(resolved).parent) if Path(resolved).is_file() else resolve(Path(resolved).name)
        if directory not in directories:
            directories.append(directory)
    if not missing:
        assert result.returncode == 0 and "not found" not in result.stderr, result.stdout + result.stderr
        break
    before = len(directories)
    for name in missing:
        directory = resolve(name)
        if directory not in directories:
            directories.append(directory)
    assert len(directories) > before, result.stdout + result.stderr
else:
    raise RuntimeError("Dependency resolution did not converge.")

# Use the same Nix loader for all bundled child processes; changing only the
# parent would make children use Ubuntu's older glibc loader with newer Nix libc.
for binary in (bundle / "bin").iterdir():
    if binary.is_file() and binary.read_bytes()[:4] == b"\x7fELF":
        subprocess.run(["patchelf", "--set-interpreter", str(loader), str(binary)], check=True)

exports = {
    "LD_LIBRARY_PATH": ":".join(directories),
    "WEBKIT_EXEC_PATH": str(bundle / "bin"),
    "WEBKIT_INJECTED_BUNDLE_PATH": str(bundle / "lib"),
    "WEBKIT_INSPECTOR_RESOURCES_PATH": str(bundle / "share"),
    "WEBKIT_FORCE_COMPLEX_TEXT": "1",
}
tls_modules = glob.glob("/nix/store/*-glib-networking-*/lib/gio/modules")
assert tls_modules, "Install glib-networking to provide GIO TLS support."
exports["GIO_EXTRA_MODULES"] = max(tls_modules)
wrapper = output / "webkit.sh"
wrapper.write_text("#!/bin/sh\n" + "".join(
    f"export {key}={shlex.quote(value)}\n" for key, value in exports.items()
) + f"exec {shlex.quote(str(executable))} \"$@\"\n")
wrapper.chmod(0o755)
(output / "runtime.json").write_text(json.dumps({
    "bundle": str(bundle), "wrapper": str(wrapper), "environment": exports,
    "ldd": result.stdout, "ldd_stderr": result.stderr,
}, indent=2) + "\n")
print(wrapper)
