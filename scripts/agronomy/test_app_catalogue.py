import json
import unittest

from catalogue_expansion import digest, load_additions, ADDITIONS
from catalogue_selection import generate, DISPLAY_COLUMNS
from export_app_catalogue import ROOT, SNAPSHOT, TRACE, snapshot_and_trace

SOURCE = ROOT / "attached_assets/Database_Colture_1794160273520.csv"


class AppCatalogueTests(unittest.TestCase):
    def test_committed_snapshot_and_trace_are_consistent(self):
        snapshot_bytes = SNAPSHOT.read_bytes()
        snapshot = json.loads(snapshot_bytes)
        trace = json.loads(TRACE.read_bytes())
        self.assertEqual(digest(snapshot_bytes), trace["app_snapshot_sha256"])
        self.assertEqual(snapshot["columns"], DISPLAY_COLUMNS)
        self.assertEqual(len(snapshot["rows"]), 488)
        self.assertEqual(len({r[0] for r in snapshot["rows"]}), 9)
        self.assertEqual(len({tuple(r[:2]) for r in snapshot["rows"]}), 488)
        self.assertTrue(all(len(r) == len(DISPLAY_COLUMNS) for r in snapshot["rows"]))
        self.assertTrue(all(all(v.strip() for v in r) for r in snapshot["rows"]))
        self.assertEqual(trace["calcolo_automatico_abilitato"], 0)
        self.assertEqual(len(trace["profili_esclusi"]), 28)
        self.assertEqual(len(trace["provenienza_raggruppata"]), 488)
        self.assertEqual({tuple(r[:2]) for r in snapshot["rows"]},
                         {(r["coltura"], r["varieta"])
                          for r in trace["provenienza_raggruppata"]})
        for record in trace["provenienza_raggruppata"]:
            self.assertFalse(record["calcolo_automatico_abilitato"])
            parameters = [p for group in record["gruppi"] for p in group["parametri"]]
            self.assertCountEqual(parameters, DISPLAY_COLUMNS[2:])
        self.assertTrue(all(r[0].lower() not in {"tabacco", "grano duro", "pomodoro"}
                            for r in snapshot["rows"]))
        self.assertTrue(all(r[1] not in {"Tomuri", "Matua", "Chieftain", "Belen", "Bounty71"}
                            for r in snapshot["rows"]))

    @unittest.skipUnless(SOURCE.exists(), "Original attachment not present")
    def test_exact_selection_and_lossless_provenance_roundtrip(self):
        source = SOURCE.read_bytes()
        payload, trace_bytes = snapshot_and_trace(source)
        self.assertEqual(payload, SNAPSHOT.read_bytes())
        self.assertEqual(trace_bytes, TRACE.read_bytes())
        selected, report = generate(source, load_additions(source, ADDITIONS))
        self.assertEqual(json.loads(payload)["rows"],
                         [[r[c] for c in DISPLAY_COLUMNS] for r in selected])
        expanded = []
        for record in json.loads(trace_bytes)["provenienza_raggruppata"]:
            record = dict(record)
            groups = record.pop("gruppi")
            record["parametri"] = {p: {k: v for k, v in group.items() if k != "parametri"}
                                    for group in groups for p in group["parametri"]}
            expanded.append(record)
        self.assertEqual(expanded, report["provenienza_parametri"])


if __name__ == "__main__":
    unittest.main()
