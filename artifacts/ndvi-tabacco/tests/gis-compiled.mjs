import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "@playwright/test";
import { runGisLimitsBrowserPass } from "./gis-limits-browser-pass.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, "generated-artifacts/gis-compiled");
// These values are test-only. The production configuration is still loaded,
// including localization, aliases and worker.format = "es".
process.env.PORT = "5173";
process.env.NODE_ENV = "production";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

async function serve(directory, prefix) {
  const denied = [];
  const requests = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://synthetic.invalid");
    requests.push(url.pathname);
    // Static files only, no SPA fallback, proxy, API handler, cookies or DB.
    const relative = decodeURIComponent(url.pathname).slice(prefix.length);
    const filename = path.resolve(directory, relative);
    if (req.method !== "GET" || !url.pathname.startsWith(prefix)
      || /(^|\/)api(\/|$)/.test(url.pathname)
      || !filename.startsWith(`${directory}/`)) {
      denied.push(url.pathname);
      res.writeHead(403).end(); return;
    }
    try {
      const data = await readFile(filename);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(filename)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; worker-src 'self' blob:; object-src 'none'",
      }).end(data);
    } catch {
      denied.push(url.pathname);
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, denied, requests, origin: `http://127.0.0.1:${server.address().port}` };
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
const reports = [];
try {
  for (const prefix of ["/", "/qa/nitrocrop/"]) {
    process.env.BASE_PATH = prefix;
    const directory = path.join(output, prefix === "/" ? "root" : "prefixed");
    await build({
      configFile: path.join(root, "vite.config.ts"),
      mode: "production",
      base: prefix,
      // Disable public copying: this test serves only its compiled output.
      publicDir: false,
      build: { outDir: directory, emptyOutDir: true,
        rollupOptions: { input: path.join(root, "tests/gis-compiled.html") } },
    });
    const assets = await readdir(path.join(directory, "assets"));
    const worker = assets.find(name => /^gisImportWorker-.*\.js$/.test(name));
    assert(worker, "Vite must emit the actual GIS module worker");
    const workerCode = await readFile(path.join(directory, "assets", worker), "utf8");
    const workerChunks = [...workerCode.matchAll(/import\(["']\.\/([^"']+\.js)["']\)/g)]
      .map(match => match[1]);
    assert(workerChunks.length > 0, "lazy SHP parser chunk must be emitted");
    for (const chunk of workerChunks) assert(assets.includes(chunk), `missing worker chunk: ${chunk}`);
    const service = await serve(directory, prefix);
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false });
    const unexpected = [];
    const failures = [];
    let page;
    try {
      context.on("request", request => {
        if (/(^|\/)api(\/|$)/.test(new URL(request.url()).pathname)) {
          unexpected.push(new URL(request.url()).pathname);
        }
      });
      // Only static build files may leave the page. APIs and all external hosts
      // are blocked even if the in-memory fetch shim accidentally regresses.
      await context.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin === service.origin && url.pathname.startsWith(prefix)
          && !/(^|\/)api(\/|$)/.test(url.pathname)) return route.continue();
        // Basemap images are intentionally blocked; they are not test inputs.
        if (!url.hostname.endsWith("tile.openstreetmap.org")) unexpected.push(url.pathname);
        return route.abort("blockedbyclient");
      });
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("response", response => {
        if (response.url().startsWith(service.origin) && !response.ok()) failures.push(response.url());
      });
      const workerURLs = [];
      page.on("worker", instance => workerURLs.push(instance.url()));
      await runGisLimitsBrowserPass(page, {
        baseURL: service.origin,
        entry: `${prefix}tests/gis-compiled.html`,
      });
      // Demonstrate the browser worker environment has no native XML DOM.
      // The successful KML/KMZ imports above therefore require the bundled DOM.
      const nativeDOM = await page.evaluate(() => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(new Blob(["postMessage(typeof DOMParser)"], { type: "text/javascript" }));
        const worker = new Worker(url, { type: "module" });
        worker.onmessage = event => { worker.terminate(); URL.revokeObjectURL(url); resolve(event.data); };
        worker.onerror = () => { worker.terminate(); URL.revokeObjectURL(url); reject(new Error("DOM probe failed")); };
      }));
      assert.equal(nativeDOM, "undefined");
      assert(workerURLs.includes(`${service.origin}${prefix}assets/${worker}`));
      for (const chunk of workerChunks) assert(service.requests.includes(`${prefix}assets/${chunk}`),
        "worker dynamic imports must actually load under the configured prefix");
      assert(service.requests.includes(`${prefix}assets/${worker}`));
      assert.deepEqual(unexpected, [], "no API or unexpected network requests");
      assert.deepEqual(failures, [], "no failed compiled resources");
      assert.deepEqual(service.denied, [], "no missing chunks or escaped prefix");
      await page.screenshot({ path: path.join(output, prefix === "/" ? "root.png" : "prefixed.png") });
      reports.push({ prefix, status: "passed", nativeWorkerDOMParser: nativeDOM,
        worker, staticRequests: service.requests.length });
      console.log(`PASS compiled GIS at ${prefix}`);
    } catch (error) {
      if (page) {
        await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
        await writeFile(path.join(output, "failure.txt"), await page.locator("body").innerText());
      }
      throw error;
    } finally {
      await context.close();
      await new Promise((resolve, reject) => service.server.close(error => error ? reject(error) : resolve()));
    }
  }
  // The real application build must not contain the synthetic entry or data.
  process.env.BASE_PATH = "/";
  const application = await build({
    configFile: path.join(root, "vite.config.ts"), mode: "production", base: "/",
    build: { outDir: path.join(output, "application"), emptyOutDir: true },
  });
  for (const result of [application].flat()) {
    for (const file of result.output) {
      assert(!file.fileName.includes("gis-compiled"), "test entry leaked into application build");
      if (file.type === "chunk") {
        assert(!file.code.includes("qa-gis-compiled-synthetic-only"), "test identity leaked into application build");
        assert(!file.code.includes("QA-IDW-"), "synthetic observations leaked into application build");
      }
    }
  }
  console.log("PASS normal application build excludes the synthetic harness");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "report.json"), JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
