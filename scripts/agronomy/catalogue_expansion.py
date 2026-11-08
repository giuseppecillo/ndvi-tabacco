"""Offline draft and completeness audit. Never fills gaps with guessed numbers.

The original hash-bound review is called unmodified, not read from stale outputs.
Only source-backed observations and explicitly comparable cohorts can fill gaps.
"""
import argparse
import csv
import hashlib
import html
import importlib.util
import io
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from catalogue_identity import EVIDENCE_PATH, apply_identity_review, load_evidence
from catalogue_averages import UNITS, estimate, validate_observations

ADDITIONS = Path(__file__).with_name("catalogue-additions.json")
SCRIPT = Path(__file__).with_name("review-crop-catalogue.py")
EXPECTED_CROPS = {
    "Olivo", "Ciliegio", "Aglio", "Cipolla", "Zucchino", "Peperone", "Scarola",
    "Bietola da costa/foglia", "Bietola da zucchero",
}
PARAMETERS = [
    "Destinazione", "Impiego", "Precocità", "Piante/ha",
    "Resa media (t/ha)", "Azoto Totale (kg/ha)",
] + [key for p in range(1, 5) for key in
     (f"Fase F{p}", f"N F{p} (kg/ha)", f"BBCH F{p}", f"NDVI F{p}")]
ALLOWED_RECORD_KEYS = {
    "crop", "name", "kind", "sources", "finding", "destination", "use",
    "earliness", "earliness_sources",
    "comparison_context", "context_sources", "canonical_variety", "phase_contexts",
}
MISSING = "MANCANTE_APPLICABILE"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def csv_bytes(rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), delimiter=";")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode("utf-8-sig")


def load_additions(source, path=ADDITIONS):
    data = json.loads(path.read_text(encoding="utf-8"))
    if data["schema"] != 1 or data["original_source_sha256"] != digest(source):
        raise ValueError("Dataset aggiuntivo non vincolato a questo originale")
    if data["status"] != "RICERCA_INCOMPLETA_NON_CONSEGNABILE_COME_DEFINITIVA":
        raise ValueError("Stato di ricerca non supportato")
    for info in data["sources"].values():
        if urlparse(info["url"]).scheme != "https" or not all(
            info.get(k, "").strip()
            for k in ("title", "access", "scope", "locator", "excerpt")
        ):
            raise ValueError("Fonte aggiuntiva incompleta")
    seen = set()
    for record in data["records"]:
        key = (record["crop"], record["name"].casefold().strip())
        if key in seen or record["crop"] not in EXPECTED_CROPS:
            raise ValueError("Identità aggiuntiva duplicata o coltura inattesa")
        seen.add(key)
        # Values go through the observations verifier, never arbitrary cells.
        if set(record) - ALLOWED_RECORD_KEYS:
            raise ValueError("Parametri aggiuntivi non supportati: serve revisione delle evidenze")
        if not all(record.get(k, "").strip() for k in
                   ("name", "kind", "finding", "destination", "use")):
            raise ValueError("Identità aggiuntiva incompleta")
        ids = record["sources"]
        if record.get("earliness"):
            ids = ids + record.get("earliness_sources", [])
            if not record.get("earliness_sources"):
                raise ValueError("Precocità senza fonte specifica")
        if not ids or any(s not in data["sources"] for s in ids):
            raise ValueError("Fonte aggiuntiva sconosciuta")
        if record.get("comparison_context") or record.get("phase_contexts"):
            context_sources = record.get("context_sources", [])
            if not context_sources or any(s not in data["sources"] for s in context_sources):
                raise ValueError("Contesto di confronto senza fonte")
    if {r["crop"] for r in data["records"]} != EXPECTED_CROPS:
        raise ValueError("Copertura delle nuove colture incompleta")
    validate_observations(data.get("observations", []), data["sources"])
    return data


def build(source, additions):
    spec = importlib.util.spec_from_file_location("original_crop_review", SCRIPT)
    original = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(original)
    try:
        text = source.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = source.decode("cp1252")
    supplied = list(csv.DictReader(io.StringIO(text), delimiter=";"))
    evidence = load_evidence(source, supplied)
    rows, original_audit = original.review(supplied)
    apply_identity_review(rows, original_audit, evidence)
    original_keys = [(r["Coltura"], r["Varietà"]) for r in rows]
    baseline_hash = digest(csv_bytes(rows))
    matrix, changes = [], []
    sources = additions["sources"]
    for number, row in enumerate(rows, 2):
        entries = {}
        for parameter in PARAMETERS:
            value = row[parameter]
            entry = {
                "stato": "FORNITO_NON_VALIDATO" if value else MISSING,
                "fonte": f"originale_sha256:{digest(source)};riga:{number}",
                "metodo": "Conservazione della revisione preesistente, non media",
            }
            # Only absence of a fruit yield is intrinsically explained by role.
            # A male plant still has a real N requirement and a planting density.
            # Missing role-specific N/NDVI must never be relabelled inapplicable.
            if row["Stato"] == "SOLO_ANAGRAFICA" and parameter == "Resa media (t/ha)":
                row[parameter] = "NON APPLICABILE"
                entry.update({
                    "stato": "NON_APPLICABILE",
                    "motivazione_codice": "NESSUNA_RESA_FRUTTIFERA_AUTONOMA",
                    "motivazione": "Impollinatore maschile o portinnesto, non cultivar fruttifera autonoma.",
                    "fonti_ruolo": row["Fonti identità"],
                })
                changes.append({
                    "riga_originale": number, "parametro": parameter,
                    "prima": value, "dopo": row[parameter], **entry,
                })
            entries[parameter] = entry
        matrix.append(entries)

    # Same columns and same identity evidence as the existing revision.
    columns = list(rows[0])
    for record in additions["records"]:
        row = dict.fromkeys(columns, "")
        row.update({
            "Coltura": record["crop"], "Varietà": record["name"],
            "Destinazione": record["destination"], "Impiego": record["use"],
            "Precocità": record.get("earliness", ""),
            "Ruolo": "Profilo produttivo, parametri da documentare",
            "Stato": "INCOMPLETO_NON_CONSEGNABILE",
            "Calcolo automatico abilitato": "NO",
            "Tipo di identità": record["kind"], "Esito verifica nome": "DOCUMENTATO",
            "Denominazione documentata o candidata": record["name"],
            "Fonti identità": " | ".join(sources[s]["url"] for s in record["sources"]),
            "Riscontro identità": record["finding"],
            "Fonti consultate per coltura": " | ".join(dict.fromkeys(
                sources[s]["url"] for r in additions["records"]
                if r["crop"] == record["crop"] for s in r["sources"])),
            "Data revisione nomi": additions["reviewed_on"],
        })
        entries = {}
        for parameter in PARAMETERS:
            ids = record.get("earliness_sources", []) if parameter == "Precocità" else record["sources"]
            entries[parameter] = {
                "stato": ("DESCRIZIONE_DA_FONTE" if parameter in {"Destinazione", "Impiego"}
                          else "SPECIFICO_DOCUMENTATO") if row[parameter] else MISSING,
                "fonti": [sources[s]["url"] for s in ids] if row[parameter] else [],
                "metodo": "Traduzione descrittiva, nessuna media" if row[parameter] else "Nessun valore assegnato",
            }
            if not row[parameter] and parameter in UNITS:
                result = estimate(record, parameter, additions.get("observations", []), sources)
                if result is not None:
                    row[parameter], entries[parameter] = result
        rows.append(row)
        matrix.append(entries)

    if [(r["Coltura"], r["Varietà"]) for r in rows[:len(supplied)]] != original_keys:
        raise ValueError("Identità originali alterate")
    keys = [(r["Coltura"], r["Varietà"].strip().casefold()) for r in rows]
    if len(set(keys)) != len(rows):
        raise ValueError("Identità duplicata fra originale e aggiunte")
    blockers = []
    audit = []
    for i, (row, entries) in enumerate(zip(rows, matrix, strict=True), 2):
        missing = [k for k, v in entries.items() if v["stato"] == MISSING]
        if missing:
            blockers.append({"riga_csv": i, "coltura": row["Coltura"],
                             "varieta": row["Varietà"], "parametri": missing})
        row["Completezza parametri"] = "INCOMPLETO" if missing else "PRESENTI_NON_VALIDATI"
        row["Provenienza parametri JSON"] = json.dumps(entries, ensure_ascii=False, sort_keys=True)
        audit.append({"riga_csv": i, "coltura": row["Coltura"],
                      "varieta": row["Varietà"], "parametri": entries})
    return rows, {
        "consegna_completa": False,
        "stato": "BLOCCATO_DATI_APPLICABILI_MANCANTI",
        "source_sha256": digest(source), "revisione_base_sha256": baseline_hash,
        "evidence_sha256": digest(EVIDENCE_PATH.read_bytes()),
        "profili_originali": len(supplied), "profili_aggiunti": len(additions["records"]),
        "profili_totali": len(rows),
        "nuovi_per_coltura": dict(Counter(r["crop"] for r in additions["records"])),
        "calcolo_automatico_abilitato": 0,
        "celle_applicabili_mancanti": sum(len(b["parametri"]) for b in blockers),
        "parametri_nuovi_da_osservazioni": dict(Counter(
            entry["stato"] for entries in matrix[len(supplied):] for entry in entries.values()
            if entry["stato"] in {"SPECIFICO_DOCUMENTATO", "MEDIA_PER_ANALOGIA", "VALORE_TRASFERITO"}
        )),
        "bloccanti": blockers, "integrazioni_originali": changes,
        "revisioni_originali": original_audit,
        "matrice_completezza": audit,
        "fonti_aggiuntive": sources,
        "limiti": additions["limits"],
    }


def report_html(report):
    esc = lambda x: html.escape(str(x), quote=True)
    counts = "".join(f"<li>{esc(c)}: {n}</li>" for c, n in report["nuovi_per_coltura"].items())
    missing = "".join(
        f'<tr><td>{b["riga_csv"]}</td><td>{esc(b["coltura"])}</td>'
        f'<td>{esc(b["varieta"])}</td><td>{esc(", ".join(b["parametri"]))}</td></tr>'
        for b in report["bloccanti"])
    links = "".join(
        f'<li><a href="{esc(s["url"])}">{esc(s["title"])}</a>: '
        f'{esc(s["access"])}. {esc(s["scope"])} Riscontro: {esc(s["excerpt"])}</li>'
        for s in report["fonti_aggiuntive"].values())
    return f"""<!doctype html><html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catalogo ampliato — ricerca incompleta</title>
<style>body{{font:16px/1.5 system-ui;margin:24px;max-width:1200px}}
table{{border-collapse:collapse}}td,th{{border:1px solid #bbb;padding:8px;text-align:left}}
a{{overflow-wrap:anywhere}}.warning{{border:3px solid #a40;padding:16px}}</style>
<h1>Ricerca incompleta: non è il catalogo definitivo</h1>
<p class="warning">Consegna bloccata: {report["celle_applicabili_mancanti"]} parametri
applicabili mancanti. Nessun valore numerico assegnato per semplice plausibilità.
La presenza di un numero originale non ne certifica la validità varietale.</p>
<p>{report["profili_originali"]} identità originali conservate +
{report["profili_aggiunti"]} nuove = {report["profili_totali"]} righe.
Zero calcoli abilitati. Nessuna modifica all'app o ai database.</p>
<h2>Nuove identità documentate</h2><ul>{counts}</ul>
<h2>Impedimenti e contesto da definire</h2>
<ul><li>NDVI: sensore, bande, geometria, distanza/risoluzione, copertura o maschera
suolo/chioma e fasi di misura comparabili. SAVI e NDRE non sostituiscono NDVI.</li>
<li>Densità e resa: regione, ambiente, ciclo, pieno campo/serra, sistema produttivo,
portinnesto e forma di allevamento per arboree, singolo taglio o raccolte ripetute per foglie.</li>
<li>Azoto: distinguere dose fertilizzante, fabbisogno e asportazioni; fonte
del totale e delle quote per fase, senza imporre 15/30/45/10.</li>
<li>I cinque kiwi anagrafici non ricevono N fittizio: resa fruttifera non applicabile;
densità e N richiedono un contesto proprio. Lacune non mascherate da NON APPLICABILE.</li>
<li>FIAMMETTA KWS: chiarire la divergenza fra sottotitolo e tabella di raccolta.</li></ul>
<h2>Matrice delle lacune per record e parametro</h2>
<table><tr><th>Riga CSV</th><th>Coltura</th><th>Varietà</th><th>Parametri applicabili mancanti</th></tr>{missing}</table>
<p>La matrice completa, inclusi parametri presenti e provenienza, è nel JSON e nel CSV
diagnostico. La bozza non è una consegna finale e mantiene le celle mancanti vuote,
non zeri né etichette sostitutive. Nessuna media o valore trasferito è stato prodotto.</p>
<h2>Fonti realmente consultate e limiti</h2><ul>{links}</ul></html>"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--additions", type=Path, default=ADDITIONS)
    parser.add_argument("--output", type=Path, default=Path("generated-artifacts/crop-expansion"))
    parser.add_argument("--draft", action="store_true",
                        help="Scrive solo una bozza diagnostica, mai una consegna finale")
    args = parser.parse_args()
    names = ("controlli_ampliamento.json", "lacune_ampliamento.html",
             "BOZZA_INCOMPLETA_colture_ampliate.csv")
    inputs = {p.resolve() for p in (args.source, args.additions, EVIDENCE_PATH, SCRIPT,
                                   Path(__file__), Path(__file__).with_name("catalogue_averages.py"))}
    for name in names:
        target = (args.output / name).resolve()
        if target in inputs or target in {p.resolve() for p in
                Path("generated-artifacts/crop-review").glob("*")}:
            raise ValueError("La destinazione sovrascriverebbe un input o la revisione originale")
    source = args.source.read_bytes()
    additions = load_additions(source, args.additions)
    rows, report = build(source, additions)
    report["additions_sha256"] = digest(args.additions.read_bytes())
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / names[0]).write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output / names[1]).write_text(report_html(report), encoding="utf-8")
    if args.draft:
        (args.output / names[2]).write_bytes(csv_bytes(rows))
    print(json.dumps({k: report[k] for k in
                      ("stato", "profili_totali", "profili_aggiunti", "celle_applicabili_mancanti")},
                     ensure_ascii=False))
    # A successful diagnostic run must not be mistaken for final acceptance.
    if not args.draft:
        parser.exit(2, "Consegna definitiva bloccata: consultare lacune_ampliamento.html.\n")


if __name__ == "__main__":
    main()
