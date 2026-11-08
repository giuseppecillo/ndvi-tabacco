"""Prepare inactive catalogue SQL offline; never opens a database connection."""
import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path
import uuid

import catalogue_selection as selection
from catalogue_expansion import csv_bytes, load_additions

ROOT = Path(__file__).resolve().parents[2]
PREPARATION = ROOT / "lib/db/migration-preparation/catalogue"
LOCK = PREPARATION / "selection-lock.json"
# Exact crop + variety labels, not row positions, generated values or synonyms.
NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "urn:nitrocrop:agronomy-catalogue:identity:v1")


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value).hexdigest()


def profile_id(row):
    return str(uuid.uuid5(NAMESPACE, canonical([row["Coltura"], row["Varietà"]])))


def literal(value):
    """Quoted UTF-8 SQL string; all generated transactions force standard strings."""
    if "\x00" in value:
        raise ValueError("NUL non consentito")
    return "'" + value.replace("'", "''") + "'"


def load_release(csv_path, audit_path, source_path, lock_path=LOCK):
    """Hashes alone are not authority: reproduce selection from reviewed inputs."""
    payload = csv_path.read_bytes()
    audit_bytes = audit_path.read_bytes()
    audit = json.loads(audit_bytes)
    lock = json.loads(lock_path.read_bytes())
    version_digest = sha((lock["csv_sha256"] + ":" + lock["audit_sha256"]).encode())
    if lock["schema"] != 1 or lock["version"] != "selected-v1-" + version_digest:
        raise ValueError("Identificativo della release incoerente")
    if sha(payload) != lock["csv_sha256"] or sha(audit_bytes) != lock["audit_sha256"]:
        raise ValueError("Hash della selezione diverso dalla release revisionata")
    if audit["csv_sha256"] != sha(payload):
        raise ValueError("CSV non corrispondente al controllo")
    source = source_path.read_bytes()
    rows, reproduced = selection.generate(source, load_additions(source))
    reproduced["csv_sha256"] = sha(csv_bytes(rows))
    if reproduced != audit or csv_bytes(rows) != payload:
        raise ValueError("Selezione non riproducibile dagli input revisionati")
    decoded = list(csv.DictReader(io.StringIO(payload.decode("utf-8-sig")), delimiter=";"))
    if decoded != rows or not rows or list(rows[0]) != selection.DISPLAY_COLUMNS:
        raise ValueError("Colonne o contenuti del CSV inattesi")
    if (not audit["completo_per_il_perimetro_filtrato"]
            or audit["celle_mancanti_in_uscita"]
            or audit["calcolo_automatico_abilitato"] != 0
            or selection.validate_rows(rows)):
        raise ValueError("Catalogo incompleto o calcoli abilitati")
    counts = dict(Counter(row["Coltura"] for row in rows))
    if len(rows) != lock["profile_count"] or counts != lock["crop_counts"]:
        raise ValueError("Conteggi non corrispondenti alla release")
    provenance = {}
    for record in audit["provenienza_parametri"]:
        key = (record["coltura"], record["varieta"])
        if key in provenance or record["calcolo_automatico_abilitato"] is not False:
            raise ValueError("Provenienza duplicata o calcoli abilitati")
        provenance[key] = record
    profiles = [{
        "profile_id": profile_id(row), "data": row,
        "provenance": provenance[(row["Coltura"], row["Varietà"])],
    } for row in rows]
    if (len({p["profile_id"] for p in profiles}) != len(rows)
            or len(provenance) != len(rows)):
        raise ValueError("Identità duplicate o provenienza non allineata")
    manifest = {
        **lock,
        "source_sha256": audit["source_sha256"],
        "dataset_aggiuntivo_sha256": audit["dataset_aggiuntivo_sha256"],
        "revisione_base_sha256": audit["revisione_base_sha256"],
        "evidence_sha256": audit["evidence_sha256"],
        "excluded_profiles": audit["profili_esclusi"],
        "calculations_enabled": False,
        "identity_scheme": "uuid5-exact-crop-variety-v1",
    }
    return manifest, profiles


def guard():
    # No customer schema is referenced. Reject triggers (including on DELETE)
    # that might cause side effects; internal FK triggers are expected.
    shape_guard = (PREPARATION / "schema.sql").read_text(encoding="utf-8")
    # Reuse the exact structural guard; no DDL from schema.sql enters data files.
    shape_guard = shape_guard.split("DECLARE actual text[];\nBEGIN\n", 1)[1]
    shape_guard = shape_guard.split("\nEND;\n$guard$;", 1)[0]
    return """
  IF current_user <> 'app_migrator' THEN
    RAISE EXCEPTION 'CATALOGUE_ROLE_MISMATCH';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace
      WHERE nspname = 'agronomy_catalogue' AND nspowner = current_user::regrole)
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='agronomy_catalogue' AND c.relname IN ('versions','profiles')
           AND c.relkind='r' AND c.relowner=current_user::regrole AND c.relrowsecurity
           AND NOT c.relforcerowsecurity) <> 2 THEN
    RAISE EXCEPTION 'CATALOGUE_SCHEMA_NOT_PREPARED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid IN ('agronomy_catalogue.versions'::regclass,
                       'agronomy_catalogue.profiles'::regclass) AND NOT tgisinternal)
     OR EXISTS (SELECT 1 FROM pg_rewrite
      WHERE ev_class IN ('agronomy_catalogue.versions'::regclass,
                         'agronomy_catalogue.profiles'::regclass)) THEN
    RAISE EXCEPTION 'CATALOGUE_SIDE_EFFECT_OBJECTS';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid IN (
      'agronomy_catalogue.versions'::regclass, 'agronomy_catalogue.profiles'::regclass)) THEN
    RAISE EXCEPTION 'CATALOGUE_UNREVIEWED_ACCESS_POLICY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f'
      AND (conrelid IN ('agronomy_catalogue.versions'::regclass,
                        'agronomy_catalogue.profiles'::regclass)
        OR confrelid IN ('agronomy_catalogue.versions'::regclass,
                         'agronomy_catalogue.profiles'::regclass))
      AND NOT (conrelid='agronomy_catalogue.profiles'::regclass
        AND confrelid='agronomy_catalogue.versions'::regclass
        AND conkey=ARRAY[1]::smallint[] AND confkey=ARRAY[1]::smallint[]
        AND confdeltype='r' AND confupdtype='a')) THEN
    RAISE EXCEPTION 'CATALOGUE_UNREVIEWED_FOREIGN_KEY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid='agronomy_catalogue.versions'::regclass AND contype='p'
        AND conkey=ARRAY[1]::smallint[])
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid='agronomy_catalogue.profiles'::regclass AND contype='p'
        AND conkey=ARRAY[1,2]::smallint[])
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid='agronomy_catalogue.profiles'::regclass AND contype='f'
        AND confrelid='agronomy_catalogue.versions'::regclass
        AND conkey=ARRAY[1]::smallint[] AND confkey=ARRAY[1]::smallint[]
        AND confdeltype='r' AND confupdtype='a') THEN
    RAISE EXCEPTION 'CATALOGUE_KEYS_MISMATCH';
  END IF;
""" + shape_guard


def comparison():
    return """
  IF NOT EXISTS (SELECT 1 FROM agronomy_catalogue.versions
      WHERE version = release_version AND manifest = expected_manifest
        AND calculations_enabled = false) THEN
    RAISE EXCEPTION 'CATALOGUE_VERSION_MISMATCH';
  END IF;
  IF EXISTS (
    (SELECT profile_id, data, provenance FROM agronomy_catalogue.profiles
       WHERE version = release_version
     EXCEPT
     SELECT x.profile_id, x.data, x.provenance FROM jsonb_to_recordset(expected_profiles)
       AS x(profile_id uuid, data jsonb, provenance jsonb))
    UNION ALL
    (SELECT x.profile_id, x.data, x.provenance FROM jsonb_to_recordset(expected_profiles)
       AS x(profile_id uuid, data jsonb, provenance jsonb)
     EXCEPT
     SELECT profile_id, data, provenance FROM agronomy_catalogue.profiles
       WHERE version = release_version)
  ) OR (SELECT count(*) FROM agronomy_catalogue.profiles WHERE version = release_version)
       <> jsonb_array_length(expected_profiles) THEN
    RAISE EXCEPTION 'CATALOGUE_CONTENT_MISMATCH';
  END IF;
  IF (SELECT jsonb_object_agg(crop, total) FROM (
      SELECT data->>'Coltura' AS crop, count(*) AS total
      FROM agronomy_catalogue.profiles WHERE version = release_version
      GROUP BY data->>'Coltura') AS counts)
      IS DISTINCT FROM expected_manifest->'crop_counts' THEN
    RAISE EXCEPTION 'CATALOGUE_COUNTS_MISMATCH';
  END IF;
"""


def sql(manifest, profiles, operation):
    if operation not in {"apply", "verify", "rollback"}:
        raise ValueError("Operazione sconosciuta")
    start = "BEGIN READ ONLY;" if operation == "verify" else "BEGIN;"
    # The immutable version binds both the selected CSV and its technical audit.
    declarations = f"""
DO $catalogue$
DECLARE
  actual text[];
  release_version constant text := {literal(manifest['version'])};
  expected_manifest constant jsonb := {literal(canonical(manifest))}::jsonb;
  expected_profiles constant jsonb := {literal(canonical(profiles))}::jsonb;
BEGIN
"""
    body = guard()
    if operation != "verify":
        # Serializes all prepared catalogue writers, never locks customer tables.
        body += """
  LOCK TABLE agronomy_catalogue.versions, agronomy_catalogue.profiles
    IN SHARE ROW EXCLUSIVE MODE;
"""
    if operation == "apply":
        body += """
  IF NOT EXISTS (SELECT 1 FROM agronomy_catalogue.versions WHERE version = release_version) THEN
    IF EXISTS (SELECT 1 FROM agronomy_catalogue.profiles WHERE version = release_version) THEN
      RAISE EXCEPTION 'CATALOGUE_ORPHAN_PROFILES';
    END IF;
    INSERT INTO agronomy_catalogue.versions (version, manifest, calculations_enabled)
      VALUES (release_version, expected_manifest, false);
    INSERT INTO agronomy_catalogue.profiles (version, profile_id, data, provenance)
      SELECT release_version, x.profile_id, x.data, x.provenance
      FROM jsonb_to_recordset(expected_profiles)
        AS x(profile_id uuid, data jsonb, provenance jsonb);
  END IF;
"""
        body += comparison()
    elif operation == "verify":
        body += comparison()
    else:
        body += """
  IF EXISTS (SELECT 1 FROM agronomy_catalogue.versions WHERE version = release_version) THEN
"""
        body += comparison()
        body += """
    DELETE FROM agronomy_catalogue.profiles WHERE version = release_version;
    DELETE FROM agronomy_catalogue.versions WHERE version = release_version;
  ELSIF EXISTS (SELECT 1 FROM agronomy_catalogue.profiles WHERE version = release_version) THEN
    RAISE EXCEPTION 'CATALOGUE_ORPHAN_PROFILES';
  END IF;
"""
    result = f"""-- INACTIVE / MANUAL ONLY. Target: existing Supabase Agri Precision.
-- {operation}: version {manifest['version']}; {len(profiles)} profiles.
-- No connections, credentials or automatic invocation are provided by the generator.
{start}
SET LOCAL ROLE app_migrator;
SET LOCAL search_path = pg_catalog;
SET LOCAL standard_conforming_strings = on;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(84688001);
{declarations}{body}
END;
$catalogue$;
COMMIT;
"""
    # A dollar delimiter is recognized even inside SQL literals in the DO body.
    # Refuse collisions rather than permitting text to terminate the block.
    if result.count("$catalogue$") != 2:
        raise ValueError("Delimitatore SQL presente nei dati")
    return result


def prepare(csv_path, audit_path, source_path, output):
    # All generated artifacts must remain excluded from Git and deployment.
    allowed = (ROOT / "generated-artifacts").resolve()
    if not output.resolve().is_relative_to(allowed):
        raise ValueError("Output consentito solo sotto generated-artifacts/")
    manifest, profiles = load_release(csv_path, audit_path, source_path)
    files = {f"{operation}.sql": sql(manifest, profiles, operation)
             for operation in ("apply", "verify", "rollback")}
    # Preserve input files, even when output paths are symlinks/hard links.
    protected = [csv_path, audit_path, source_path, LOCK,
                 *PREPARATION.glob("*"), *Path(__file__).parent.glob("*")]
    for name in [*files, "package.json"]:
        target = output / name
        if target.is_symlink() or (target.exists() and (
            target.stat().st_nlink > 1 or any(
                p.is_file() and target.samefile(p) for p in protected
            )
        )):
            raise ValueError("Destinazione protetta o collegamento simbolico")
    package = {
        "status": "prepared-not-applied", "automatic_execution": False,
        "version": manifest["version"], "profile_count": len(profiles),
        "crop_counts": manifest["crop_counts"],
        "files_sha256": {name: sha(text.encode("utf-8")) for name, text in files.items()},
        "schema_sha256": sha((PREPARATION / "schema.sql").read_bytes()),
    }
    output.mkdir(parents=True, exist_ok=True)
    for name, text in files.items():
        (output / name).write_text(text, encoding="utf-8")
    (output / "package.json").write_text(
        json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return package


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path,
                        default=Path("generated-artifacts/crop-selection/catalogo_colture.csv"))
    parser.add_argument("--audit", type=Path,
                        default=Path("generated-artifacts/crop-selection/controlli_selezione.json"))
    parser.add_argument("--source", type=Path,
                        default=Path("attached_assets/Database_Colture_1794160273520.csv"))
    parser.add_argument("--output", type=Path,
                        default=Path("generated-artifacts/catalogue-persistence"))
    args = parser.parse_args()
    print(json.dumps(prepare(args.csv, args.audit, args.source, args.output), ensure_ascii=False))


if __name__ == "__main__":
    main()
