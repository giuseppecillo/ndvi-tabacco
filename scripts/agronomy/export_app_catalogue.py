"""Build the read-only application snapshot and separate lossless trace.

Uses the hash-checked selection, never the diagnostic expansion CSV.
No network, database, calculation catalogue or observation access.
"""
import argparse
import json
from pathlib import Path

from catalogue_expansion import csv_bytes, digest, load_additions, ADDITIONS
from catalogue_selection import DISPLAY_COLUMNS, generate

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "lib/crop-calculations/src/catalogue.json"
TRACE = ROOT / "scripts/agronomy/selected-catalogue-trace.json"


def snapshot_and_trace(source):
    rows, report = generate(source, load_additions(source, ADDITIONS))
    if not report["completo_per_il_perimetro_filtrato"]:
        raise ValueError("Selezione incompleta: nessun aggiornamento dell'app")
    identities = [(row["Coltura"], row["Varietà"]) for row in rows]
    if len(set(identities)) != len(identities):
        raise ValueError("Identità duplicate: nessuna unione automatica")
    snapshot = {
        "columns": DISPLAY_COLUMNS,
        "rows": [[row[column] for column in DISPLAY_COLUMNS] for row in rows],
    }
    payload = (json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    # Group identical entries *within* each identity; this preserves every
    # parameter's evidence without repeating its source 22 times.
    provenance = report.pop("provenienza_parametri")
    report["provenienza_raggruppata"] = []
    for record in provenance:
        groups = {}
        for parameter, entry in record.pop("parametri").items():
            key = json.dumps(entry, ensure_ascii=False, sort_keys=True)
            groups.setdefault(key, []).append(parameter)
        report["provenienza_raggruppata"].append({
            **record,
            "gruppi": [{"parametri": names, **json.loads(entry)}
                       for entry, names in groups.items()],
        })
    report["csv_sha256"] = digest(csv_bytes(rows))
    report["app_snapshot_sha256"] = digest(payload)
    report["separazione"] = (
        "Solo consultazione. Nessuna unione con i profili applicativi di "
        "grano duro, tabacco e pomodoro. Identità coltura/varietà inalterate."
    )
    trace = (json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    return payload, trace


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--check", action="store_true",
                        help="Verify committed files without modifying them")
    args = parser.parse_args()
    payload, trace = snapshot_and_trace(args.source.read_bytes())
    if args.check:
        if SNAPSHOT.read_bytes() != payload or TRACE.read_bytes() != trace:
            parser.exit(1, "Snapshot o tracciabilità non corrispondono alla selezione.\n")
    else:
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_bytes(payload)
        TRACE.write_bytes(trace)
    print("Catalogo applicativo: 488 profili selezionati, sola consultazione.")


if __name__ == "__main__":
    main()
