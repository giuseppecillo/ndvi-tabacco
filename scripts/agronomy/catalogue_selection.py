"""Separate user-selected export; never deletes or changes source catalogues."""
import argparse
import copy
import json
from collections import Counter
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

from catalogue_expansion import (
    ADDITIONS, EVIDENCE_PATH, PARAMETERS, SCRIPT, build, csv_bytes, digest,
    load_additions,
)
from catalogue_phase_defaults import fill_phase_defaults

DISPLAY_COLUMNS = ["Coltura", "Varietà", *PARAMETERS]
CORE = ("Resa media (t/ha)", "Azoto Totale (kg/ha)")
SCALARS = ("Piante/ha", *CORE)
ROLE_TYPES = {"IMPOLLINATORE_MASCHILE", "PORTINNESTO"}
DIRECT = {"FORNITO_NON_VALIDATO", "SPECIFICO_DOCUMENTATO"}


def numeric(value):
    try:
        result = Decimal(str(value).replace(",", "."))
    except InvalidOperation:
        return None
    return result if result.is_finite() and result >= 0 else None


def excluded_role(row):
    return (row.get("Tipo di identità") in ROLE_TYPES
            or row.get("Ruolo") in {"Impollinatore maschile", "Portinnesto"})


def ambiguous_donors(relations):
    """Do not count known/potential aliases or overlapping lots independently."""
    return {
        tuple(member) for relation in relations
        if relation["type"].startswith(("SINONIMIA", "POSSIBILE_"))
        for member in relation["members"]
    }


def fill_crop_scalars(row, entries, snapshot, ambiguous):
    changes = []
    for parameter in SCALARS:
        if str(row[parameter]).strip():
            continue  # No replacement of present values, even inconvenient ones.
        donors = []
        for donor, provenance in snapshot:
            identity = donor["Coltura"], donor["Varietà"]
            value = numeric(donor[parameter])
            if (donor["Coltura"] == row["Coltura"]
                    and identity not in ambiguous and not excluded_role(donor)
                    and provenance[parameter]["stato"] in DIRECT
                    and value is not None and value > 0):
                donors.append((donor, provenance[parameter], value))
        if not donors:
            continue
        if parameter == "Azoto Totale (kg/ha)":
            desired = entries[parameter].get("contesto", {}).get("nitrogen_quantity")
            if desired:
                donors = [(d, p, v) for d, p, v in donors
                          if p.get("contesto", {}).get("nitrogen_quantity") == desired]
            quantities = {p.get("contesto", {}).get("nitrogen_quantity") for _, p, _ in donors}
            if not donors or len(quantities) != 1:
                continue  # Requirements, removals and fertilizer doses are not interchangeable.
        places = min(max(0, -value.as_tuple().exponent) for _, _, value in donors)
        places = min(places, 2)
        average = (sum(v for _, _, v in donors) / len(donors)).quantize(
            Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)
        if average <= 0:
            continue
        row[parameter] = format(average, "f").replace(".", ",")
        entries[parameter] = {
            "stato": "MEDIA_TABELLA_PER_COLTURA" if len(donors) > 1 else "VALORE_TRASFERITO_TABELLA",
            "metodo": "Media aritmetica non ponderata dei valori presenti nella tabella, per coltura",
            "numerosita_profili": len(donors),
            "intervallo_valori_origine": [str(min(v for _, _, v in donors)),
                                          str(max(v for _, _, v in donors))],
            "riferimenti": [
                {"coltura": d["Coltura"], "varieta": d["Varietà"],
                 "valore": d[parameter], "provenienza": p}
                for d, p, _ in donors
            ],
            "validazione_agronomica": False,
        }
        changes.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                        "parametro": parameter, "valore": row[parameter],
                        **entries[parameter]})
    return changes


def validate_rows(rows):
    missing = []
    for row in rows:
        for parameter in PARAMETERS:
            if not str(row[parameter]).strip() or row[parameter] == "NON APPLICABILE":
                missing.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                                "parametro": parameter})
        for parameter in SCALARS:
            value = numeric(row[parameter])
            if value is not None and value <= 0:
                raise ValueError(f"Totale non positivo: {row['Varietà']} / {parameter}")
            if str(row[parameter]).strip() and value is None:
                raise ValueError(f"Numero non valido: {row['Varietà']} / {parameter}")
        phases = [numeric(row[f"N F{p} (kg/ha)"]) for p in range(1, 5)]
        total = numeric(row["Azoto Totale (kg/ha)"])
        if all(v is not None for v in phases) and total is not None:
            if abs(sum(phases) - total) > Decimal(".21"):
                raise ValueError(f"Quote N incoerenti: {row['Varietà']}")
        for p in range(1, 5):
            for parameter in (f"N F{p} (kg/ha)", f"NDVI F{p}"):
                text = row[parameter]
                value = numeric(text)
                if str(text).strip() and (value is None or
                                          (parameter.startswith("NDVI") and value > 1)):
                    raise ValueError(f"Numero di fase non valido: {row['Varietà']} / {parameter}")
    return missing


def select(rows, audit):
    """Means use a frozen snapshot, never outputs of earlier means.

    Phase defaults additionally use the general profile of the same crop,
    destination and available earliness class. Any remaining applicable gap
    blocks export. Neither BBCH codes nor categorical phase names are averaged.
    """
    original = copy.deepcopy(rows)
    metadata = [json.loads(r["Provenienza parametri JSON"]) for r in original]
    snapshot = list(zip(original, metadata, strict=True))
    ambiguous = ambiguous_donors(audit["relazioni_identita"])
    phase_donors = [(r, p) for r, p in snapshot
                    if not excluded_role(r) and (r["Coltura"], r["Varietà"]) not in ambiguous]
    retained, removed, changes, provenance = [], [], [], []
    for source_row, source_entries in snapshot:
        row, entries = copy.deepcopy(source_row), copy.deepcopy(source_entries)
        if excluded_role(row):
            removed.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                            "motivo": "IMPOLLINATORE_O_PORTINNESTO"})
            continue
        changes.extend(fill_crop_scalars(row, entries, snapshot, ambiguous))
        unavailable = [p for p in CORE if numeric(row[p]) is None or numeric(row[p]) <= 0]
        if unavailable:
            removed.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                            "motivo": "RESA_O_AZOTO_TOTALE_NON_DISPONIBILI",
                            "parametri": unavailable})
            continue
        changes.extend(fill_phase_defaults(row, entries, phase_donors))
        retained.append({k: row[k] for k in DISPLAY_COLUMNS})
        provenance.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                           "calcolo_automatico_abilitato": False,
                           "parametri": entries})
    missing = validate_rows(retained)
    return retained, {
        "schema": 1,
        "completo_per_il_perimetro_filtrato": bool(retained) and not missing,
        "profili_in_ingresso": len(rows), "profili_in_uscita": len(retained),
        "colture_in_uscita": dict(Counter(r["Coltura"] for r in retained)),
        "profili_esclusi": removed, "integrazioni": changes,
        "celle_mancanti_in_uscita": missing,
        "provenienza_parametri": provenance,
        "calcolo_automatico_abilitato": 0,
        "criterio": "Escludere impollinatori/portinnesti e profili senza resa o N totale dopo le medie disponibili",
        "ambito": "Selezione distinta dal catalogo ampliato integrale; input e revisione vincolata all'hash invariati",
    }


def generate(source, additions):
    rows, expansion = build(source, additions)
    evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
    selected, report = select(rows, {"relazioni_identita": evidence["relations"]})
    report.update({
        "source_sha256": digest(source),
        "dataset_aggiuntivo_sha256": digest(json.dumps(additions, ensure_ascii=False,
                                                     sort_keys=True).encode("utf-8")),
        "revisione_base_sha256": expansion["revisione_base_sha256"],
        "evidence_sha256": expansion["evidence_sha256"],
        "profili_originali": expansion["profili_originali"],
        "profili_aggiunti_in_ingresso": expansion["profili_aggiunti"],
    })
    return selected, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--additions", type=Path, default=ADDITIONS)
    parser.add_argument("--output", type=Path,
                        default=Path("generated-artifacts/crop-selection"))
    args = parser.parse_args()
    # Protect every offline input and the two earlier generated revisions,
    # including symlinks and hard links to an existing protected file.
    protected = {
        p.resolve() for p in (args.source, args.additions, EVIDENCE_PATH, SCRIPT,
                              *Path(__file__).parent.glob("*.py"),
                              *Path(__file__).parent.glob("*.json"))
    }
    protected.update(p.resolve() for folder in ("crop-review", "crop-expansion")
                     for p in Path("generated-artifacts", folder).glob("*") if p.is_file())
    targets = [args.output / n for n in ("catalogo_colture.csv", "controlli_selezione.json")]
    if targets[0].resolve() == targets[1].resolve() or (
            all(p.exists() for p in targets) and targets[0].samefile(targets[1])):
        raise ValueError("Le due destinazioni coincidono")
    for target in targets:
        if target.resolve() in protected or (target.exists() and any(
                p.exists() and target.samefile(p) for p in protected)):
            raise ValueError("La destinazione sovrascriverebbe un input o una revisione precedente")
    source = args.source.read_bytes()
    rows, report = generate(source, load_additions(source, args.additions))
    if not report["completo_per_il_perimetro_filtrato"]:
        parser.exit(2, "Selezione non esportabile: parametri applicabili mancanti o nessun profilo.\n")
    payload = csv_bytes(rows)
    report["csv_sha256"] = digest(payload)
    args.output.mkdir(parents=True, exist_ok=True)
    targets[0].write_bytes(payload)
    targets[1].write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in (
        "completo_per_il_perimetro_filtrato", "profili_in_ingresso", "profili_in_uscita",
        "colture_in_uscita", "calcolo_automatico_abilitato")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
