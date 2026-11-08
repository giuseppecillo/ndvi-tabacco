"""Offline selection tests. Synthetic rows must never be used as crop data."""
import copy
import csv
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import catalogue_selection as selection
from catalogue_expansion import PARAMETERS, csv_bytes, digest, load_additions

SOURCE = Path("attached_assets/Database_Colture_1794160273520.csv")


def fixture(name, crop="Synthetic crop", yield_value="10", nitrogen="100"):
    row = {
        "Coltura": crop, "Varietà": name, "Destinazione": "Synthetic edible crop",
        "Impiego": "Synthetic", "Precocità": "Synthetic early",
        "Piante/ha": "1000", "Resa media (t/ha)": yield_value,
        "Azoto Totale (kg/ha)": nitrogen, "Tipo di identità": "CULTIVAR",
        "Ruolo": "Profilo produttivo", "Calcolo automatico abilitato": "NO",
    }
    for p, amount in enumerate(("10", "20", "30", "40"), 1):
        row.update({f"Fase F{p}": f"Synthetic phase {p}", f"N F{p} (kg/ha)": amount,
                    f"BBCH F{p}": str(p * 10), f"NDVI F{p}": "0,60"})
    row["Provenienza parametri JSON"] = json.dumps({
        k: {"stato": "FORNITO_NON_VALIDATO", "fonte": "synthetic fixture"} for k in PARAMETERS
    })
    return row


class SelectionPolicyTests(unittest.TestCase):
    def select(self, rows, relations=None):
        return selection.select(rows, {"relazioni_identita": relations or []})

    def test_roles_and_core_gaps_removed_without_changing_input(self):
        productive = fixture("Productive")
        male = fixture("Male")
        male["Tipo di identità"] = "IMPOLLINATORE_MASCHILE"
        root = fixture("Root")
        root["Ruolo"] = "Portinnesto"
        absent = fixture("No data", crop="Other crop", yield_value="", nitrogen="")
        rows = [productive, male, root, absent]
        before = copy.deepcopy(rows)
        kept, report = self.select(rows)
        self.assertEqual(rows, before)
        self.assertEqual([r["Varietà"] for r in kept], ["Productive"])
        self.assertEqual([r["motivo"] for r in report["profili_esclusi"]], [
            "IMPOLLINATORE_O_PORTINNESTO", "IMPOLLINATORE_O_PORTINNESTO",
            "RESA_O_AZOTO_TOTALE_NON_DISPONIBILI"])
        self.assertEqual(report["profili_esclusi"][-1]["parametri"], list(selection.CORE))

    def test_mean_all_same_crop_available_values_and_preserve_existing(self):
        rows = [fixture("A", yield_value="10"), fixture("B", yield_value="20")]
        rows[1]["Precocità"] = "Synthetic late"
        rows.append(fixture("C", yield_value=""))
        kept, report = self.select(rows)
        self.assertEqual([r["Resa media (t/ha)"] for r in kept], ["10", "20", "15"])
        meta = report["integrazioni"][0]
        self.assertEqual(meta["numerosita_profili"], 2)
        self.assertFalse(meta["validazione_agronomica"])
        self.assertEqual(meta["intervallo_valori_origine"], ["10", "20"])

    def test_no_recursive_means_or_role_donors_or_cross_crop_transfer(self):
        rows = [fixture("A", yield_value="10"), fixture("B", yield_value=""),
                fixture("C", yield_value=""), fixture("D", crop="Other", yield_value="")]
        male = fixture("Male", yield_value="1000")
        male["Tipo di identità"] = "IMPOLLINATORE_MASCHILE"
        rows.append(male)
        kept, report = self.select(rows)
        self.assertEqual([r["Resa media (t/ha)"] for r in kept], ["10", "10", "10"])
        self.assertEqual([x["numerosita_profili"] for x in report["integrazioni"]], [1, 1])

    def test_ambiguous_aliases_not_counted_twice(self):
        rows = [fixture("A", yield_value="10"), fixture("Alias A", yield_value="100"),
                fixture("B", yield_value="20"), fixture("Target", yield_value="")]
        relation = {"type": "SINONIMIA_DOCUMENTATA",
                    "members": [["Synthetic crop", "A"], ["Synthetic crop", "Alias A"]]}
        kept, report = self.select(rows, [relation])
        self.assertEqual(kept[-1]["Resa media (t/ha)"], "20")
        self.assertEqual(report["integrazioni"][0]["numerosita_profili"], 1)

    def test_n_total_does_not_mix_plant_requirement_and_fertilizer_dose(self):
        donors = [fixture("A"), fixture("B")]
        target = fixture("Target", nitrogen="")
        for donor, quantity in zip(donors, ("PLANT_REQUIREMENT", "FERTILIZER_DOSE")):
            provenance = json.loads(donor["Provenienza parametri JSON"])
            provenance["Azoto Totale (kg/ha)"]["contesto"] = {"nitrogen_quantity": quantity}
            donor["Provenienza parametri JSON"] = json.dumps(provenance)
        kept, report = self.select([*donors, target])
        self.assertEqual([r["Varietà"] for r in kept], ["A", "B"])
        self.assertEqual(report["profili_esclusi"][0]["parametri"], ["Azoto Totale (kg/ha)"])

    def test_phase_defaults_transfer_coherent_scheme_and_scale_n(self):
        target = fixture("Target", nitrogen="200")
        for p in range(1, 5):
            for k in (f"Fase F{p}", f"BBCH F{p}", f"N F{p} (kg/ha)", f"NDVI F{p}"):
                target[k] = ""
        kept, report = self.select([fixture("A"), target])
        result = kept[-1]
        self.assertEqual([result[f"N F{p} (kg/ha)"] for p in range(1, 5)],
                         ["20,0", "40,0", "60,0", "80,0"])
        self.assertEqual(result["BBCH F1"], "10")
        self.assertEqual(result["Fase F4"], "Synthetic phase 4")
        self.assertEqual(result["NDVI F1"], "0,60")
        self.assertTrue(report["completo_per_il_perimetro_filtrato"])

    def test_phenology_does_not_mix_earliness_or_incompatible_phase_schemes(self):
        target = fixture("Target")
        target["NDVI F1"] = ""
        other = fixture("Other")
        other["Precocità"] = "Synthetic late"
        _, report = self.select([other, target])
        self.assertFalse(report["completo_per_il_perimetro_filtrato"])
        other["Precocità"] = target["Precocità"]
        other["BBCH F1"] = "99"
        _, report = self.select([other, target])
        self.assertFalse(report["completo_per_il_perimetro_filtrato"])

    def test_sensor_mismatch_not_averaged(self):
        target = fixture("Target")
        target["NDVI F1"] = ""
        donors = [fixture("A"), fixture("B")]
        for donor, sensor in zip(donors, ("sensor A", "sensor B")):
            provenance = json.loads(donor["Provenienza parametri JSON"])
            provenance["NDVI F1"]["contesto"] = {"sensor": sensor}
            donor["Provenienza parametri JSON"] = json.dumps(provenance)
        _, report = self.select([*donors, target])
        self.assertFalse(report["completo_per_il_perimetro_filtrato"])

    def test_named_standard_transfers_whole_ndvi_curve_not_phasewise_mixture(self):
        target = fixture("Target")
        for p in range(1, 5):
            target[f"NDVI F{p}"] = ""
        donors = [fixture("Standard A"), fixture("Standard B")]
        for donor in donors:
            donor["Esito verifica nome"] = "DOCUMENTATO"
        for p, value in enumerate(("0,30", "0,50", "0,80", "0,60"), 1):
            donors[0][f"NDVI F{p}"] = value
        kept, report = self.select([*donors, target])
        result = kept[-1]
        self.assertEqual([result[f"NDVI F{p}"] for p in range(1, 5)],
                         ["0,30", "0,50", "0,80", "0,60"])
        ndvi_changes = [r for r in report["integrazioni"] if r["parametro"].startswith("NDVI")]
        self.assertEqual(len(ndvi_changes), 4)
        self.assertTrue(all(r["riferimenti"][0]["varieta"] == "Standard A" for r in ndvi_changes))

    def test_explicit_standard_respected_and_existing_values_preserved(self):
        target = fixture("Target")
        target["Varietà riferimento fenologico"] = "Standard B"
        for p in range(2, 5):
            target[f"NDVI F{p}"] = ""
        donor = fixture("Standard B")
        donor["NDVI F2"] = "0,70"
        kept, report = self.select([fixture("Standard A"), donor, target])
        self.assertEqual(kept[-1]["NDVI F1"], "0,60")
        self.assertEqual(kept[-1]["NDVI F2"], "0,70")
        self.assertNotIn("Varietà riferimento fenologico", kept[-1])
        self.assertTrue(report["completo_per_il_perimetro_filtrato"])

    def test_no_hiding_applicable_missing_values(self):
        row = fixture("Target")
        row["Precocità"] = ""
        row["NDVI F1"] = ""
        _, report = self.select([row])
        self.assertFalse(report["completo_per_il_perimetro_filtrato"])
        self.assertEqual({r["parametro"] for r in report["celle_mancanti_in_uscita"]},
                         {"Precocità", "NDVI F1"})

    def test_invalid_phase_numbers_and_n_sums_rejected(self):
        for parameter, value in (("NDVI F1", "1,2"), ("N F1 (kg/ha)", "-1"),
                                 ("N F1 (kg/ha)", "50"), ("Piante/ha", "0")):
            row = fixture("Invalid")
            row[parameter] = value
            with self.subTest(parameter=parameter), self.assertRaises(ValueError):
                self.select([row])

    def test_display_columns_only_and_metadata_separate(self):
        kept, report = self.select([fixture("Test àè")])
        self.assertEqual(list(kept[0]), selection.DISPLAY_COLUMNS)
        self.assertNotIn("Provenienza parametri JSON", kept[0])
        self.assertNotIn("Stato", kept[0])
        roundtrip = list(csv.DictReader(io.StringIO(csv_bytes(kept).decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(roundtrip, kept)
        self.assertEqual(report["calcolo_automatico_abilitato"], 0)
        self.assertFalse(report["provenienza_parametri"][0]["calcolo_automatico_abilitato"])


@unittest.skipUnless(SOURCE.exists(), "Allegato originale non disponibile")
class SelectionIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_bytes()
        cls.rows, cls.report = selection.generate(cls.source, load_additions(cls.source))

    def test_actual_selection_is_488_complete_rows_from_516(self):
        self.assertEqual(len(self.rows), 488)
        self.assertEqual(self.report["profili_in_ingresso"], 516)
        self.assertEqual(len(self.report["profili_esclusi"]), 28)
        self.assertEqual(CounterReason(self.report), {
            "IMPOLLINATORE_O_PORTINNESTO": 5, "RESA_O_AZOTO_TOTALE_NON_DISPONIBILI": 23})
        self.assertTrue(self.report["completo_per_il_perimetro_filtrato"])
        self.assertEqual(self.report["celle_mancanti_in_uscita"], [])
        self.assertEqual(self.report["integrazioni"], [])
        self.assertEqual(len(self.report["colture_in_uscita"]), 9)

    def test_all_surviving_original_identities_and_values_preserved(self):
        from catalogue_expansion import build
        expanded, _ = build(self.source, load_additions(self.source))
        expected = [{k: r[k] for k in selection.DISPLAY_COLUMNS}
                    for r in expanded[:493] if not selection.excluded_role(r)]
        self.assertEqual(self.rows, expected)
        self.assertEqual(len({(r["Coltura"], r["Varietà"]) for r in self.rows}), 488)

    def test_deterministic_cli_roundtrip_and_source_untouched(self):
        with tempfile.TemporaryDirectory() as folder:
            cmd = [sys.executable, str(Path(selection.__file__)), str(SOURCE), "--output", folder]
            subprocess.run(cmd, check=True, capture_output=True)
            outputs = {p.name: p.read_bytes() for p in Path(folder).iterdir()}
            subprocess.run(cmd, check=True, capture_output=True)
            self.assertEqual(outputs, {p.name: p.read_bytes() for p in Path(folder).iterdir()})
            with (Path(folder) / "catalogo_colture.csv").open(encoding="utf-8-sig", newline="") as f:
                self.assertEqual(list(csv.DictReader(f, delimiter=";")), self.rows)
            audit = json.loads(outputs["controlli_selezione.json"])
            self.assertEqual(audit["csv_sha256"], digest(outputs["catalogo_colture.csv"]))
            self.assertEqual(SOURCE.read_bytes(), self.source)

    def test_source_symlink_and_hardlink_protected(self):
        import os
        with tempfile.TemporaryDirectory(dir=SOURCE.parent) as folder:
            target = Path(folder) / "catalogo_colture.csv"
            for link in (lambda: target.symlink_to(SOURCE.resolve()),
                         lambda: os.link(SOURCE.resolve(), target)):
                link()
                result = subprocess.run([
                    sys.executable, str(Path(selection.__file__)), str(SOURCE), "--output", folder
                ], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("sovrascriverebbe", result.stderr)
                self.assertEqual(SOURCE.read_bytes(), self.source)
                target.unlink()


def CounterReason(report):
    from collections import Counter
    return dict(Counter(r["motivo"] for r in report["profili_esclusi"]))


if __name__ == "__main__":
    unittest.main()
