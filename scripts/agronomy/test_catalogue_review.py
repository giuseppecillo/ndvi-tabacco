"""Run with: python -m unittest discover -s scripts/agronomy -p 'test_*.py'."""
import copy
import csv
import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

from catalogue_identity import (
    EVIDENCE_PATH, apply_identity_review, load_evidence, render_identity_report,
)

SCRIPT = Path(__file__).with_name("review-crop-catalogue.py")
ROOT = SCRIPT.resolve().parents[2]
SOURCE = ROOT / "attached_assets/Database_Colture_1794160273520.csv"
spec = importlib.util.spec_from_file_location("crop_review", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.source = b"synthetic,not agronomic data"
        self.rows = [{"Coltura": "Test", "Varietà": "A"}]
        self.evidence = {
            "schema": 1, "source_sha256": hashlib.sha256(self.source).hexdigest(),
            "expected_profiles": 1, "reviewed_on": "2026-11-08",
            "sources": {"s": {"title": "Synthetic test source",
                             "url": "https://example.org/test",
                             "scope": "test only", "access": "synthetic"}},
            "consulted_by_crop": {"Test": ["s"]},
            "claims": [], "relations": [],
        }

    def load(self, evidence=None, source=None, rows=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "evidence.json"
            path.write_text(json.dumps(evidence or self.evidence), encoding="utf-8")
            return load_evidence(
                self.source if source is None else source,
                self.rows if rows is None else rows, path,
            )

    def test_source_hash_binding(self):
        self.load()
        with self.assertRaisesRegex(ValueError, "CSV diverso"):
            self.load(source=self.source + b"\n")

    def test_count_and_crop_coverage(self):
        changed = copy.deepcopy(self.evidence)
        changed["expected_profiles"] = 2
        with self.assertRaisesRegex(ValueError, "Numero di profili"):
            self.load(changed)
        changed = copy.deepcopy(self.evidence)
        changed["consulted_by_crop"] = {}
        with self.assertRaisesRegex(ValueError, "Copertura"):
            self.load(changed)

    def test_unverified_is_default_and_not_promoted_by_similar_names(self):
        evidence = self.load()
        reviewed = [{"Coltura": "Test", "Varietà": "A",
                     "Stato": "RIFERIMENTO_NON_VALIDATO"}]
        audit = [{}]
        summary = apply_identity_review(reviewed, audit, evidence)
        self.assertEqual(summary["esiti"], {"NON_VERIFICATO": 1})
        self.assertEqual(reviewed[0]["Fonti identità"], "")
        self.assertIn("https://example.org", reviewed[0]["Fonti consultate per coltura"])
        self.assertEqual(audit[0]["identita"]["fonti_attestazione"], [])

    def test_claim_requires_evidence_and_valid_source(self):
        claim = {"crop": "Test", "names": ["A"], "kind": "CULTIVAR",
                 "sources": ["s"], "evidence": "Explicit synthetic assertion"}
        changed = copy.deepcopy(self.evidence)
        changed["claims"] = [claim]
        self.load(changed)
        for field, bad in [("sources", ["missing"]), ("evidence", ""),
                           ("status", "INESISTENTE"), ("names", ["B"])]:
            broken = copy.deepcopy(changed)
            broken["claims"][0][field] = bad
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.load(broken)
        changed["claims"].append(copy.deepcopy(claim))
        with self.assertRaisesRegex(ValueError, "duplicata"):
            self.load(changed)

    def test_relations_require_existing_distinct_members(self):
        broken = copy.deepcopy(self.evidence)
        broken["relations"] = [{"members": [["Test", "A"], ["Test", "B"]],
                                "type": "POSSIBILE_SINONIMO", "sources": ["s"],
                                "reason": "Synthetic"}]
        with self.assertRaisesRegex(ValueError, "Relazione"):
            self.load(broken)

    def test_report_escapes_source_and_profile_text(self):
        row = {"Coltura": "Test", "Varietà": "<script>alert(1)</script>",
               "Stato": "RIFERIMENTO_NON_VALIDATO"}
        audit = [{}]
        summary = apply_identity_review([row], audit, self.evidence)
        report = render_identity_report([row], summary)
        self.assertNotIn("<script>", report)
        self.assertIn("&lt;script&gt;", report)


class CatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SOURCE.exists():
            raise unittest.SkipTest("Allegato CSV originale assente dal checkout")
        cls.source = SOURCE.read_bytes()
        cls.rows = list(csv.DictReader(
            io.StringIO(cls.source.decode("cp1252")), delimiter=";"
        ))
        cls.evidence = load_evidence(cls.source, cls.rows)
        cls.output, cls.audit = module.review(cls.rows)
        cls.summary = apply_identity_review(cls.output, cls.audit, cls.evidence)
        cls.by_key = {(r["Coltura"], r["Varietà"]): r for r in cls.output}

    def test_all_profiles_remain_in_order_without_renames(self):
        keys = lambda rows: [(r["Coltura"], r["Varietà"]) for r in rows]
        self.assertEqual(len(self.output), 493)
        self.assertEqual(keys(self.rows), keys(self.output))
        self.assertEqual(sum(self.summary["esiti"].values()), 493)
        self.assertEqual(len(self.audit), 493)
        for row, audit in zip(self.output, self.audit, strict=True):
            self.assertEqual(row["Calcolo automatico abilitato"], "NO")
            self.assertEqual(row["Esito verifica nome"], audit["identita"]["esito"])
            self.assertTrue(audit["identita"]["fonti_consultate"])
            if row["Esito verifica nome"] != "NON_VERIFICATO":
                self.assertTrue(audit["identita"]["fonti_attestazione"])
            for field in row:
                self.assertFalse(any(
                    excluded in field for excluded in ("P2O5", "K2O", "Acqua", "Note")
                ))

    def test_five_special_kiwis_keep_unavailable_not_zero_parameters(self):
        special = [r for r in self.output if r["Stato"] == "SOLO_ANAGRAFICA"]
        self.assertEqual({r["Varietà"] for r in special},
                         {"Tomuri (Impollinatore)", "Matua", "Chieftain", "Belen", "Bounty71"})
        for row in special:
            for column in module.BASE_KEYS + ["Precocità"]:
                self.assertEqual(row[column], "")
            for phase in range(1, 5):
                for prefix in ("Fase", "BBCH", "NDVI"):
                    self.assertEqual(row[f"{prefix} F{phase}"], "")
                self.assertEqual(row[f"N F{phase} (kg/ha)"], "")
            self.assertEqual(row["Esito verifica nome"], "DOCUMENTATO")

    def test_species_geographic_trade_and_unknown_are_not_cultivars(self):
        for crop, name, kind in [
            ("Kiwi", "Arguta", "SPECIE"),
            ("Pere", "Pera Mantovana", "INDICAZIONE_GEOGRAFICA"),
            ("Pere", "Pera dell'Emilia Romagna", "INDICAZIONE_GEOGRAFICA"),
            ("Lattuga", "Butterhead", "TIPOLOGIA_COMMERCIALE"),
            ("Vite da tavola", "Cotton Candy", "MARCHIO_COMMERCIALE"),
        ]:
            self.assertEqual(self.by_key[(crop, name)]["Tipo di identità"], kind)
        for crop, name in [
            ("Broccoli", "Bacchus"), ("Broccoli", "Iron"),
            ("Broccoli", "Apollo Green"), ("Broccoli", "Goliath (var. Broccoli)"),
            ("Spinacino (4 gamma)", "Shark"),
        ]:
            row = self.by_key[(crop, name)]
            self.assertEqual(row["Esito verifica nome"], "NON_VERIFICATO")
            self.assertEqual(row["Calcolo automatico abilitato"], "NO")

    def test_related_profiles_are_preserved_and_not_used_as_keys(self):
        for name in ("Zesy002 (SunGold)", "Zesy003", "Skelton", "Skelton1", "Skelton2"):
            self.assertIn(("Kiwi", name), self.by_key)
        for name in ("Ribier", "Alphonse Lavallee"):
            self.assertIn(("Vite da tavola", name), self.by_key)
        self.assertEqual(self.summary["profili_accorpati"], 0)
        self.assertEqual(self.summary["nomi_originali_modificati"], 0)
        self.assertEqual(len(self.summary["relazioni"]), 25)
        self.assertTrue(self.by_key[("Vite da tavola", "Ribier")]["Relazioni identità"])

    def test_original_agronomic_safeguards_are_unchanged(self):
        for original, result in zip(self.rows, self.output, strict=True):
            if result["Stato"] == "SOLO_ANAGRAFICA":
                continue
            for column in module.BASE_KEYS:
                self.assertEqual(original[column], result[column])
            for phase in range(4):
                self.assertEqual(original[module.N_KEYS[phase]],
                                 result[f"N F{phase + 1} (kg/ha)"])
                self.assertEqual(original[module.NDVI_KEYS[phase]],
                                 result[f"NDVI F{phase + 1}"])
            if result["Coltura"] == "Broccoli":
                self.assertEqual(result["BBCH F4"], "49")

    def test_offline_cli_is_deterministic_and_does_not_change_input(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [sys.executable, str(SCRIPT), str(SOURCE), "--output", directory]
            subprocess.run(command, check=True, capture_output=True)
            first = {p.name: p.read_bytes() for p in Path(directory).iterdir()}
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(first, {p.name: p.read_bytes() for p in Path(directory).iterdir()})
            self.assertEqual(SOURCE.read_bytes(), self.source)
            report = json.loads(first["controlli_catalogo.json"])
            self.assertEqual(len(report["revisioni"]), 493)
            class RowsParser(HTMLParser):
                count = 0
                def handle_starttag(self, tag, attrs):
                    if tag == "tr":
                        self.count += 1
            parser = RowsParser()
            parser.feed(first["verifica_identita.html"].decode())
            self.assertEqual(parser.count, 494)
            self.assertIn("verifica_identita.html", first["revisione_agronomica.html"].decode())
            self.assertEqual(len(list(csv.DictReader(
                io.StringIO(first["colture_revisionate.csv"].decode("utf-8-sig")),
                delimiter=";"
            ))), 493)


if __name__ == "__main__":
    unittest.main()
