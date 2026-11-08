"""Offline checks only. No database, runtime import, credentials or network."""
import copy
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pglast import parse_sql, parse_plpgsql

import catalogue_persistence as persistence

SOURCE = persistence.ROOT / "attached_assets/Database_Colture_1794160273520.csv"


def fixture():
    return (
        {"version": "synthetic-only", "crop_counts": {"Synthetic": 1}},
        [{"profile_id": persistence.profile_id({"Coltura": "Synthetic", "Varietà": "A"}),
          "data": {"Coltura": "Synthetic", "Varietà": "A"},
          "provenance": {"synthetic": True}}],
    )


class PersistenceSQLTests(unittest.TestCase):
    def test_stable_identity_independent_of_order_values_or_release(self):
        first = {"Coltura": "Test", "Varietà": "À's", "N": "100"}
        second = {"N": "200", "Varietà": "À's", "Coltura": "Test"}
        self.assertEqual(persistence.profile_id(first), persistence.profile_id(second))
        for change in ({"Coltura": "Other"}, {"Varietà": "Other"}):
            self.assertNotEqual(persistence.profile_id(first),
                                persistence.profile_id({**first, **change}))
        self.assertNotEqual(
            persistence.profile_id({"Coltura": "A/B", "Varietà": "C"}),
            persistence.profile_id({"Coltura": "A", "Varietà": "B/C"}))

    def test_no_alias_merging_or_case_folding(self):
        self.assertNotEqual(
            persistence.profile_id({"Coltura": "Test", "Varietà": "A"}),
            persistence.profile_id({"Coltura": "Test", "Varietà": "a"}))

    def test_literal_escaping_and_block_delimiter_rejected(self):
        self.assertEqual(persistence.literal("Gardener's Delight\\x"), "'Gardener''s Delight\\x'")
        with self.assertRaises(ValueError):
            persistence.literal("\x00")
        manifest, profiles = fixture()
        profiles[0]["data"]["Varietà"] = "$catalogue$; DELETE FROM other;"
        with self.assertRaises(ValueError):
            persistence.sql(manifest, profiles, "apply")

    def test_all_writes_are_scoped_to_the_two_catalogue_tables(self):
        manifest, profiles = fixture()
        for operation in ("apply", "verify", "rollback"):
            sql = persistence.sql(manifest, profiles, operation)
            writes = re.findall(r"(?:INSERT INTO|DELETE FROM|UPDATE)\s+(\S+)", sql)
            self.assertTrue(set(writes) <= {
                "agronomy_catalogue.versions", "agronomy_catalogue.profiles"})
            self.assertNotRegex(sql, r"\b(?:TRUNCATE|DROP|ALTER|CREATE|CASCADE)\b")
            self.assertNotIn("public.", sql)
            self.assertIn("SET LOCAL ROLE app_migrator;", sql)
            self.assertIn("SET LOCAL search_path = pg_catalog;", sql)
            self.assertIn("SET LOCAL standard_conforming_strings = on;", sql)
            self.assertIn("CATALOGUE_SIDE_EFFECT_OBJECTS", sql)
            self.assertIn("CATALOGUE_UNREVIEWED_FOREIGN_KEY", sql)
            self.assertIn("CATALOGUE_KEYS_MISMATCH", sql)
            self.assertIn("CATALOGUE_PROFILES_SHAPE_MISMATCH", sql)
            self.assertIn("CATALOGUE_UNREVIEWED_ACCESS_POLICY", sql)
            self.assertEqual(sql.count("$catalogue$"), 2)
            self.assertTrue(sql.endswith("COMMIT;\n"))

    def test_verify_is_readonly_and_compares_full_data_both_ways(self):
        sql = persistence.sql(*fixture(), "verify")
        self.assertIn("BEGIN READ ONLY;", sql)
        self.assertNotRegex(sql, r"\b(?:INSERT|DELETE|UPDATE|LOCK TABLE)\b")
        self.assertEqual(len(re.findall(r"\bEXCEPT\b", sql)), 2)
        self.assertIn("manifest = expected_manifest", sql)
        self.assertIn("jsonb_object_agg(crop, total)", sql)
        self.assertIn("jsonb_array_length(expected_profiles)", sql)

    def test_apply_never_overwrites_or_repairs_and_verifies_after_insert(self):
        sql = persistence.sql(*fixture(), "apply")
        self.assertNotIn("ON CONFLICT", sql)
        self.assertNotRegex(sql, r"\b(?:UPDATE|DELETE)\b")
        self.assertIn("IF NOT EXISTS (SELECT 1 FROM agronomy_catalogue.versions", sql)
        self.assertLess(sql.index("INSERT INTO"), sql.index("CATALOGUE_CONTENT_MISMATCH"))
        self.assertIn("IN SHARE ROW EXCLUSIVE MODE", sql)

    def test_rollback_checks_exact_release_before_deleting_and_leaves_schema(self):
        sql = persistence.sql(*fixture(), "rollback")
        self.assertLess(sql.index("CATALOGUE_CONTENT_MISMATCH"), sql.index("DELETE FROM"))
        deletes = re.findall(r"DELETE FROM ([^;]+);", sql)
        self.assertEqual(deletes, [
            "agronomy_catalogue.profiles WHERE version = release_version",
            "agronomy_catalogue.versions WHERE version = release_version"])
        self.assertIn("ELSIF EXISTS", sql)

    def test_schema_keeps_direct_api_and_ordinary_roles_closed(self):
        sql = (persistence.PREPARATION / "schema.sql").read_text()
        self.assertEqual(sql.count("ENABLE ROW LEVEL SECURITY"), 2)
        self.assertNotRegex(sql, r"\bGRANT\b|\bCREATE POLICY\b|\bALTER ROLE\b")
        self.assertNotIn("public.", sql)
        self.assertNotIn("CASCADE", sql)
        self.assertNotIn("DROP", sql)
        self.assertIn("app_runtime, app_readonly", sql)
        self.assertIn("ON DELETE RESTRICT", sql)

    def test_postgresql_parser_accepts_sql_and_procedural_blocks_offline(self):
        for text in [
            (persistence.PREPARATION / "schema.sql").read_text(),
            *(persistence.sql(*fixture(), operation)
              for operation in ("apply", "verify", "rollback")),
        ]:
            self.assertTrue(parse_sql(text))
            self.assertTrue(parse_plpgsql(text))

    def test_generation_is_deterministic_and_manifest_hashes_match(self):
        with tempfile.TemporaryDirectory(dir=persistence.ROOT / "generated-artifacts") as tmp:
            folder = Path(tmp)
            with patch.object(persistence, "load_release", return_value=fixture()):
                package = persistence.prepare(SOURCE, SOURCE, SOURCE, folder)
                before = {p.name: p.read_bytes() for p in folder.iterdir()}
                persistence.prepare(SOURCE, SOURCE, SOURCE, folder)
                self.assertEqual(before, {p.name: p.read_bytes() for p in folder.iterdir()})
            for name, digest in package["files_sha256"].items():
                self.assertEqual(persistence.sha(before[name]), digest)
            self.assertFalse(package["automatic_execution"])
            self.assertEqual(package["status"], "prepared-not-applied")

    def test_outputs_cannot_escape_generated_artifacts_or_overwrite_inputs(self):
        import os
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "solo sotto"):
                persistence.prepare(SOURCE, SOURCE, SOURCE, Path(tmp))
        with tempfile.TemporaryDirectory(dir=persistence.ROOT / "generated-artifacts") as tmp:
            folder = Path(tmp)
            target = folder / "apply.sql"
            target.symlink_to(persistence.LOCK)
            with patch.object(persistence, "load_release", return_value=fixture()):
                with self.assertRaisesRegex(ValueError, "protetta"):
                    persistence.prepare(SOURCE, SOURCE, SOURCE, folder)
            target.unlink()
            sentinel = folder / "untouched.txt"
            sentinel.write_text("protected")
            os.link(sentinel, target)
            with patch.object(persistence, "load_release", return_value=fixture()):
                with self.assertRaisesRegex(ValueError, "protetta"):
                    persistence.prepare(SOURCE, SOURCE, SOURCE, folder)
            self.assertEqual(sentinel.read_text(), "protected")

    def test_not_wired_to_startup_or_postmerge(self):
        for name in ("artifacts/api-server/src/index.ts", "scripts/post-merge.sh",
                     "lib/db/package.json", "lib/db/migration-preparation/manifest.json"):
            text = (persistence.ROOT / name).read_text()
            self.assertNotIn("catalogue_persistence", text)
            self.assertNotIn("agronomy_catalogue", text)
            self.assertNotIn("catalogue/schema.sql", text)


@unittest.skipUnless(SOURCE.exists(), "Allegato originale non disponibile")
class ReleaseInputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import catalogue_selection as selection
        from catalogue_expansion import csv_bytes, load_additions
        cls.tmp = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.tmp.name)
        rows, audit = selection.generate(SOURCE.read_bytes(), load_additions(SOURCE.read_bytes()))
        payload = csv_bytes(rows)
        audit["csv_sha256"] = persistence.sha(payload)
        cls.csv = cls.folder / "selected.csv"
        cls.audit = cls.folder / "audit.json"
        cls.csv.write_bytes(payload)
        cls.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_real_selection_matches_reviewed_hashes_and_exclusions(self):
        manifest, profiles = persistence.load_release(self.csv, self.audit, SOURCE)
        self.assertEqual(len(profiles), 488)
        self.assertEqual(len(manifest["crop_counts"]), 9)
        self.assertEqual(len(manifest["excluded_profiles"]), 28)
        self.assertFalse(manifest["calculations_enabled"])
        self.assertTrue(all(p["provenance"]["calcolo_automatico_abilitato"] is False
                            for p in profiles))
        self.assertFalse(any(p["data"]["Coltura"] == "Peperone" for p in profiles))
        for operation in ("apply", "verify", "rollback"):
            text = persistence.sql(manifest, profiles, operation)
            self.assertTrue(parse_sql(text))
            self.assertTrue(parse_plpgsql(text))

    def test_tampered_csv_or_audit_rejected_before_output(self):
        for file in (self.csv, self.audit):
            with self.subTest(file=file.name):
                tampered = self.folder / "tampered"
                tampered.write_bytes(file.read_bytes() + b" ")
                with self.assertRaisesRegex(ValueError, "Hash"):
                    persistence.load_release(
                        tampered if file == self.csv else self.csv,
                        tampered if file == self.audit else self.audit, SOURCE)

    def test_forged_lock_or_counts_rejected(self):
        original = json.loads(persistence.LOCK.read_bytes())
        for field, value in (("version", "arbitrary"), ("profile_count", 487),
                             ("crop_counts", {"Kiwi": 488})):
            lock = {**copy.deepcopy(original), field: value}
            path = self.folder / "bad-lock.json"
            path.write_text(json.dumps(lock))
            with self.subTest(field=field), self.assertRaises(ValueError):
                persistence.load_release(self.csv, self.audit, SOURCE, path)

    def test_source_tampering_rejected(self):
        path = self.folder / "source.csv"
        path.write_bytes(SOURCE.read_bytes() + b" ")
        with self.assertRaises(ValueError):
            persistence.load_release(self.csv, self.audit, path)


if __name__ == "__main__":
    unittest.main()
