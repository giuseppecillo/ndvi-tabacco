"""Offline curation, not an agronomic calibration or application import.

Never connects to a database or changes the supplied source file. Outputs only
nitrogen/NDVI-related catalogue fields and an explicit eligibility status.
"""
import argparse
import csv
import hashlib
import html
import io
import json
from collections import Counter
from pathlib import Path
from catalogue_identity import (
    EVIDENCE_PATH, apply_identity_review, load_evidence, render_identity_report,
)

BBCH_SOURCE = "https://www.julius-kuehn.de/media/Veroeffentlichungen/bbch%20epaper%20en/page.pdf"
KIWI_SOURCE = "https://www.iniav.pt/images/publicacoes/livros-manuais/manual_de_fruticultura_Kiwi_9.pdf"
ROOTSTOCK_SOURCE = "https://www.eastpack.co.nz/vdb/document/24645"
MODEL_SOURCE = "https://doi.org/10.1007/s11119-024-10185-2"
MALES = {"Tomuri (Impollinatore)", "Matua", "Chieftain", "Belen"}
ROLES = {**{name: "Impollinatore maschile" for name in MALES}, "Bounty71": "Portinnesto"}
LEAF_CROPS = {"Lattuga", "Spinacio", "Spinacino (4 gamma)"}
N_KEYS = [
    "N Fase 1: Sviluppo (15%)", "N Fase 2: Fioritura (30%)",
    "N Fase 3: Ingrossamento (45%)", "N Fase 4: Maturazione (10%)",
]
BBCH_KEYS = [
    "BBCH F1 (Sviluppo)", "BBCH F2 (Fioritura)",
    "BBCH F3 (Ingrossamento)", "BBCH F4 (Maturazione)",
]
NDVI_KEYS = [
    "NDVI F1 (Sviluppo)", "NDVI F2 (Fioritura)",
    "NDVI F3 (Ingrossamento)", "NDVI F4 (Maturazione)",
]
IDENTITY_KEYS = ["Coltura", "Varietà", "Destinazione", "Impiego", "Precocità"]
BASE_KEYS = ["Piante/ha", "Resa media (t/ha)", "Azoto Totale (kg/ha)"]
NUMERIC_KEYS = BASE_KEYS + N_KEYS + NDVI_KEYS


def numeric(value):
    number = float(value.replace(",", "."))
    if not 0 <= number < float("inf"):
        raise ValueError("Numero negativo o non finito")
    return number


def review(rows):
    output, changes = [], []
    seen = set()
    for index, row in enumerate(rows, 2):
        key = (row["Coltura"], row["Varietà"])
        if key in seen:
            raise ValueError(f"Identità duplicata alla riga {index}")
        seen.add(key)
        for column in NUMERIC_KEYS:
            value = numeric(row[column])
            if column in NDVI_KEYS and value > 1:
                raise ValueError(f"NDVI fuori intervallo alla riga {index}")
        if any(numeric(row[column]) <= 0 for column in BASE_KEYS):
            raise ValueError(f"Riferimento non positivo alla riga {index}")
        if abs(sum(numeric(row[column]) for column in N_KEYS)
               - numeric(row["Azoto Totale (kg/ha)"])) > .21:
            raise ValueError(f"Quote N incoerenti alla riga {index}")

        result = {column: row[column] for column in IDENTITY_KEYS + BASE_KEYS}
        result.update({"Ruolo": "Coltura produttiva",
                       "Stato": "RIFERIMENTO_NON_VALIDATO",
                       "Calcolo automatico abilitato": "NO"})
        # Generic phase keys do not falsely impose flowering on leaf crops or
        # certify the file's universal 15/30/45/10 split as a recommendation.
        if row["Coltura"] in LEAF_CROPS:
            labels = ["Sviluppo fogliare", "Sviluppo iniziale della parte raccolta",
                      "Accrescimento della parte raccolta", "Maturità commerciale"]
        elif row["Coltura"] == "Broccoli":
            labels = ["Sviluppo fogliare", "Formazione della testa",
                      "Accrescimento della testa", "Maturità commerciale"]
        else:
            labels = ["Ripresa vegetativa", "Fioritura",
                      "Accrescimento dei frutti", "Maturazione dei frutti"]
        for phase in range(4):
            result[f"Fase F{phase + 1}"] = labels[phase]
            result[f"N F{phase + 1} (kg/ha)"] = row[N_KEYS[phase]]
            result[f"BBCH F{phase + 1}"] = row[BBCH_KEYS[phase]]
            result[f"NDVI F{phase + 1}"] = row[NDVI_KEYS[phase]]

        flags = ["N_QUOTE_E_NDVI_DA_CALIBRARE"]
        if row["Coltura"] in LEAF_CROPS | {"Broccoli"}:
            flags.append("ETICHETTE_FENOLOGICHE_CORRETTE")
        if row["Coltura"] == "Broccoli":
            # JKI: 49 = commercial head maturity; 51 = inflorescence elongation.
            # Do not continue the commercial-harvest phase into bolting.
            result["BBCH F4"] = "49"
            flags.append("BBCH_F4_LIMITATO_ALLA_MATURITA_COMMERCIALE")
        if numeric(row[NDVI_KEYS[3]]) > .92:
            # High NDVI alone is not proof of an error; never invent a lower one.
            flags.append("NDVI_F4_ALTO_NON_MODIFICATO")
        if row["Coltura"] == "Kiwi" and row["Varietà"] in ROLES:
            role = ROLES[row["Varietà"]]
            result.update({"Ruolo": role, "Destinazione": role, "Impiego": role,
                           "Precocità": "", "Stato": "SOLO_ANAGRAFICA"})
            # Blank means unavailable, NOT zero N requirement. An orchard's
            # male plants/rootstock cannot be modelled as a fruiting scion.
            for column in BASE_KEYS:
                result[column] = ""
            for phase in range(1, 5):
                for prefix in ("Fase", "BBCH", "NDVI"):
                    result[f"{prefix} F{phase}"] = ""
                result[f"N F{phase} (kg/ha)"] = ""
            flags.append("PROFILO_FRUTTIFERO_NON_APPLICABILE")
        output.append(result)
        changes.append({"riga_originale": index, "coltura": key[0],
                        "varieta": key[1], "controlli": flags})
    return output, changes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("generated-artifacts/crop-review"))
    args = parser.parse_args()
    source_path = args.source.resolve()
    output_path = args.output.resolve()
    # Avoid overwriting the input (even under a different spelling/symlink).
    output_names = (
        "colture_revisionate.csv", "controlli_catalogo.json",
        "revisione_agronomica.html", "verifica_identita.html",
    )
    if any((output_path / name).resolve() in {source_path, EVIDENCE_PATH.resolve()}
           for name in output_names):
        raise ValueError("La destinazione sovrascriverebbe un input della revisione")
    source = args.source.read_bytes()
    try:
        text = source.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = source.decode("cp1252")
    rows = list(csv.DictReader(io.StringIO(text), delimiter=";"))
    evidence = load_evidence(source, rows)
    reviewed, audit = review(rows)
    identity_summary = apply_identity_review(reviewed, audit, evidence)
    counts = Counter(row["Coltura"] for row in reviewed)
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "colture_revisionate.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(reviewed[0]), delimiter=";")
        writer.writeheader()
        writer.writerows(reviewed)
    report = {
        "source_sha256": hashlib.sha256(source).hexdigest(), "profili": len(rows),
        "colture": dict(counts), "profili_solo_anagrafica": sum(
            row["Stato"] == "SOLO_ANAGRAFICA" for row in reviewed),
        "calcolo_automatico_abilitato": 0,
        "esclusi": ["P2O5", "K2O", "Acqua", "Note"],
        "fonti": [BBCH_SOURCE, KIWI_SOURCE, ROOTSTOCK_SOURCE, MODEL_SOURCE],
        "revisione_identita": identity_summary,
        "evidence_sha256": hashlib.sha256(EVIDENCE_PATH.read_bytes()).hexdigest(),
        "revisioni": audit,
    }
    (args.output / "controlli_catalogo.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output / "verifica_identita.html").write_text(
        render_identity_report(reviewed, identity_summary), encoding="utf-8")
    table = "".join(f"<tr><td>{html.escape(crop)}</td><td>{count}</td></tr>"
                    for crop, count in counts.items())
    links = "".join(f'<li><a href="{url}">{name}</a></li>' for name, url in [
        ("JKI: BBCH Monograph 2018, sezioni 1.3.21–23", BBCH_SOURCE),
        ("INIAV: Manual de Boas Práticas de Fruticultura — Kiwi", KIWI_SOURCE),
        ("EastPack: Bounty 71, portinnesto", ROOTSTOCK_SOURCE),
        ("Silvestri et al., 2024: integrazione NDVI e dati agronomici", MODEL_SOURCE)])
    document = f"""<!doctype html><html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisione del catalogo colture</title>
<style>body{{font:16px/1.6 system-ui;color:#183e2a;background:#f2f6f0;margin:0}}
main{{max-width:850px;margin:auto;padding:30px}}section{{background:white;padding:24px;border-radius:16px;margin:18px 0}}
table{{border-collapse:collapse;width:100%}}td,th{{text-align:left;padding:8px;border-bottom:1px solid #ddd}}
a{{color:#175634;overflow-wrap:anywhere}}.warning{{border-left:5px solid #b87320}}</style>
<main><h1>Revisione agronomica preliminare</h1>
<p>{len(rows)} profili · {len(counts)} colture · file originale conservato invariato.</p>
<section><h2>Verifica separata delle identità</h2>
<p><a href="verifica_identita.html">Esiti nominativi, fonti e relazioni di tutti i 493 profili</a>.
La conferma di un nome non valida i parametri agronomici.
Nessun nome è stato rinominato e nessuna riga accorpata.</p></section>
<section><h2>Contenuto</h2><table><tr><th>Coltura</th><th>Profili</th></tr>{table}</table>
<p>Esclusi potassio, fosforo, acqua e note del file originale.</p></section>
<section><h2>Correzioni documentate</h2><ul>
<li>Tomuri, Matua, Chieftain e Belen: impollinatori maschili, non varietà da modellare sulla resa in frutti.</li>
<li>Bounty71: portinnesto, non cultivar fruttifera autonoma.</li>
<li>Per questi cinque profili sono rimossi dalla copia revisionata resa, densità, precocità e parametri produttivi non applicabili. Celle vuote significano dati non disponibili, non fabbisogno nullo.</li>
<li>Le fasi delle 218 orticole sono rinominate secondo lo sviluppo della parte raccolta, evitando la falsa fioritura a BBCH 41–43.</li>
<li>Per i 53 broccoli la fase commerciale F4 termina a BBCH 49, senza includere il successivo allungamento dell'infiorescenza a BBCH 51. Questo non calibra il riferimento NDVI associato.</li>
<li>Gli 11 NDVI finali 0,93–0,94 dello spinacio non sono abbassati arbitrariamente: restano da verificare rispetto al sensore e alla copertura.</li></ul></section>
<section class="warning"><h2>Limite: non è una validazione dei modelli</h2>
<p>I valori produttivi dei restanti 488 profili restano riferimenti forniti, non parametri varietali scientificamente validati. La plausibilità numerica non dimostra accuratezza o conformità a un disciplinare.</p>
<p>La ripartizione 15/30/45/10 comune a tutte le colture e i riferimenti NDVI non sono sostituiti con numeri inventati. Nel CSV ogni profilo è escluso dall'abilitazione automatica del calcolo.</p>
<p>Per un modello operativo occorrono un piano N totale e per fase verificato per coltura e appezzamento e un riferimento NDVI confrontabile per fase, sensore e modalità di misura. Regione, disciplinare, disponibilità di N nel terreno e gestione dell'impianto non sono definiti dal file.</p>
<p>Nessuna delle nove colture è stata attivata nell'app. Nessun database, dato utente o sito pubblico è stato modificato.</p></section>
<section><h2>Fonti delle correzioni</h2><ul>{links}</ul>
<p>Le fonti documentano ruoli e significato delle fasi; non convalidano i 493 piani N/NDVI del file.</p></section></main></html>"""
    (args.output / "revisione_agronomica.html").write_text(document, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items()
                      if key not in {"revisioni", "fonti", "revisione_identita"}},
                     ensure_ascii=False))
    print(json.dumps({"identita": identity_summary["esiti"],
                      "relazioni": len(identity_summary["relazioni"])},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
