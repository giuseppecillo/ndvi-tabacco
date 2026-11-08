"""Checks for the intentionally blocked, offline catalogue expansion."""
import copy
import csv
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import catalogue_expansion as expansion
from catalogue_identity import apply_identity_review, load_evidence

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Database_Colture_1794160273520.csv"


class AdditionEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.source = b"synthetic source, no agronomic values"
        self.data = json.loads(expansion.ADDITIONS.read_text(encoding="utf-8"))
        self.data["original_source_sha256"] = expansion.digest(self.source)

    def load(self, data=None, source=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "additions.json"
            path.write_text(json.dumps(self.data if data is None else data), encoding="utf-8")
            return expansion.load_additions(self.source if source is None else source, path)

    def test_source_binding_and_schema(self):
        self.load()
        with self.assertRaisesRegex(ValueError, "vincolato"):
            self.load(source=self.source + b"\n")
        data = copy.deepcopy(self.data)
        data["schema"] = 2
        with self.assertRaises(ValueError):
            self.load(data)

    def test_crop_coverage_and_separate_beet_destinations(self):
        loaded = self.load()
        self.assertEqual({r["crop"] for r in loaded["records"]}, expansion.EXPECTED_CROPS)
        self.assertNotIn("Peperonone", {r["crop"] for r in loaded["records"]})
        data = copy.deepcopy(self.data)
        data["records"] = [r for r in data["records"] if r["crop"] != "Bietola da zucchero"]
        with self.assertRaisesRegex(ValueError, "Copertura"):
            self.load(data)

    def test_no_unreviewed_numeric_or_analogy_values_are_silently_accepted(self):
        for column in ("density", "yield", "nitrogen", "ndvi", "analogies", "parameters"):
            data = copy.deepcopy(self.data)
            data["records"][0][column] = 0
            with self.subTest(column=column), self.assertRaisesRegex(ValueError, "non supportati"):
                self.load(data)

    def test_sources_need_metadata_and_positive_name_finding(self):
        for field in ("excerpt", "access", "locator", "scope"):
            data = copy.deepcopy(self.data)
            data["sources"]["ioc_frantoio"][field] = ""
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "incompleta"):
                self.load(data)
        for field, bad in (("finding", ""), ("sources", ["missing"]),
                           ("earliness_sources", [])):
            data = copy.deepcopy(self.data)
            data["records"][0][field] = bad
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.load(data)

    def test_duplicate_names_rejected_case_insensitively(self):
        data = copy.deepcopy(self.data)
        duplicate = copy.deepcopy(data["records"][0])
        duplicate["name"] = " frantoio "
        data["records"].append(duplicate)
        with self.assertRaisesRegex(ValueError, "duplicata"):
            self.load(data)

    def test_never_claims_research_complete(self):
        data = copy.deepcopy(self.data)
        data["status"] = "COMPLETO"
        with self.assertRaisesRegex(ValueError, "Stato"):
            self.load(data)


class ExpansionIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SOURCE.exists():
            raise unittest.SkipTest("Allegato CSV originale assente dal checkout")
        cls.source = SOURCE.read_bytes()
        cls.additions = expansion.load_additions(cls.source)
        cls.rows, cls.report = expansion.build(cls.source, cls.additions)

    def test_all_original_identities_and_existing_values_preserved(self):
        original_rows = list(csv.DictReader(io.StringIO(self.source.decode("cp1252")), delimiter=";"))
        self.assertEqual(len(original_rows), 493)
        baseline, audit = self._review(original_rows)
        self.assertEqual(len(self.rows), len(original_rows) + len(self.additions["records"]))
        for before, after in zip(baseline, self.rows[:493], strict=True):
            for column, value in before.items():
                if before["Stato"] == "SOLO_ANAGRAFICA" and column == "Resa media (t/ha)":
                    self.assertEqual(after[column], "NON APPLICABILE")
                else:
                    self.assertEqual(value, after[column], (before["Varietà"], column))
        self.assertEqual(len(self.report["integrazioni_originali"]), 5)
        self.assertEqual(len(self.report["revisioni_originali"]), len(audit))
        self.assertEqual(self.report["revisione_base_sha256"], expansion.digest(expansion.csv_bytes(baseline)))

    def _review(self, rows):
        import importlib.util
        spec = importlib.util.spec_from_file_location("baseline", expansion.SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        reviewed, audit = module.review(rows)
        apply_identity_review(reviewed, audit, load_evidence(self.source, rows))
        return reviewed, audit

    def test_matrix_has_every_parameter_and_missing_is_honest(self):
        missing = 0
        for row, record in zip(self.rows, self.report["matrice_completezza"], strict=True):
            entries = record["parametri"]
            self.assertEqual(set(entries), set(expansion.PARAMETERS))
            self.assertEqual(json.loads(row["Provenienza parametri JSON"]), entries)
            self.assertEqual(row["Calcolo automatico abilitato"], "NO")
            for parameter, entry in entries.items():
                if entry["stato"] == expansion.MISSING:
                    missing += 1
                    self.assertEqual(row[parameter], "")
                elif entry["stato"] == "NON_APPLICABILE":
                    self.assertTrue(entry["motivazione_codice"])
                    self.assertTrue(entry["motivazione"])
                    self.assertTrue(entry["fonti_ruolo"])
                    self.assertEqual(parameter, "Resa media (t/ha)")
                else:
                    self.assertNotEqual(row[parameter], "")
        self.assertEqual(missing, self.report["celle_applicabili_mancanti"])
        self.assertGreater(missing, 0)
        self.assertFalse(self.report["consegna_completa"])
        special = [r for r in self.rows if r["Stato"] == "SOLO_ANAGRAFICA"]
        self.assertEqual(len(special), 5)
        for row in special:
            self.assertEqual(row["Azoto Totale (kg/ha)"], "")
            self.assertEqual(row["Piante/ha"], "")
            self.assertEqual(row["Completezza parametri"], "INCOMPLETO")

    def test_new_values_have_sources_and_no_fictitious_phase_curves(self):
        for row in self.rows[493:]:
            self.assertEqual(row["Esito verifica nome"], "DOCUMENTATO")
            self.assertTrue(row["Fonti identità"])
            self.assertTrue(row["Riscontro identità"])
            for parameter in expansion.PARAMETERS:
                if parameter == "Resa media (t/ha)" and row["Coltura"] == "Cipolla":
                    self.assertEqual(row[parameter], {"Sturon": "63,6", "Red Baron": "49,6"}[row["Varietà"]])
                    meta = json.loads(row["Provenienza parametri JSON"])[parameter]
                    self.assertEqual(meta["stato"], "SPECIFICO_DOCUMENTATO")
                    self.assertEqual(meta["numerosita_varieta"], 1)
                    self.assertEqual(meta["riferimenti"][0]["source_sample_size"], 2)
                elif parameter not in {"Destinazione", "Impiego", "Precocità"}:
                    self.assertEqual(row[parameter], "")
        fiammetta = next(r for r in self.rows if r["Varietà"] == "FIAMMETTA KWS")
        self.assertEqual(fiammetta["Precocità"], "")
        self.assertIn("Media a Tardiva", fiammetta["Riscontro identità"])

    def test_excel_roundtrip_accents_no_excluded_columns(self):
        data = expansion.csv_bytes(self.rows)
        self.assertTrue(data.startswith(b"\xef\xbb\xbf"))
        decoded = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(decoded, self.rows)
        for field in self.rows[0]:
            self.assertFalse(any(excluded in field for excluded in ("P2O5", "K2O", "Acqua", "Note")))

    def test_cli_strict_blocks_and_draft_is_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [sys.executable, str(Path(expansion.__file__).resolve()),
                       str(SOURCE), "--output", directory]
            result = subprocess.run(command, capture_output=True)
            self.assertEqual(result.returncode, 2, result.stderr)
            files = list(Path(directory).glob("*"))
            self.assertEqual(len(files), 2)
            self.assertFalse(list(Path(directory).glob("*.csv")))
            subprocess.run(command + ["--draft"], check=True, capture_output=True)
            first = {p.name: p.read_bytes() for p in Path(directory).iterdir()}
            subprocess.run(command + ["--draft"], check=True, capture_output=True)
            self.assertEqual(first, {p.name: p.read_bytes() for p in Path(directory).iterdir()})
        self.assertEqual(SOURCE.read_bytes(), self.source)

    def test_protected_input_and_original_review_symlinks_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "controlli_ampliamento.json"
            target.symlink_to(SOURCE)
            result = subprocess.run(
                [sys.executable, str(Path(expansion.__file__).resolve()),
                 str(SOURCE), "--output", directory, "--draft"], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"sovrascriverebbe", result.stderr)
        self.assertEqual(SOURCE.read_bytes(), self.source)

    def test_html_escapes_all_evidence(self):
        report = copy.deepcopy(self.report)
        report["fonti_aggiuntive"]["ioc_frantoio"]["excerpt"] = "<script>alert(1)</script>"
        document = expansion.report_html(report)
        self.assertNotIn("<script>", document)
        self.assertIn("&lt;script&gt;", document)


if __name__ == "__main__":
    unittest.main()
