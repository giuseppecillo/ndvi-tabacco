"""Import the approved 360-profile workbook without optional Excel dependencies.

Offline only. Existing catalogues and client observations are never rewritten.
"""
import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE_HASH = "e12fea3aec0cd4bb528417686a585bf5ff9de0041e18b0b1108652d65fb5c858"
OUTPUT = ROOT / "lib/crop-calculations/src/extra-catalogue.json"
TRACE = ROOT / "scripts/agronomy/excel-360-trace.json"
NATIVE = ROOT / "artifacts/api-server/src/data/native-tobacco.json"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
LABELS = {
    "Aglio": ["Sviluppo vegetativo", "Formazione del bulbo", "Ingrossamento del bulbo", "Maturazione del bulbo"],
    "Cipolla": ["Sviluppo vegetativo", "Formazione del bulbo", "Ingrossamento del bulbo", "Maturazione del bulbo"],
    "Olivo": ["Ripresa vegetativa", "Bottoni fiorali e fioritura", "Accrescimento delle drupe", "Invaiatura e maturazione"],
    "Ciliegio": ["Ripresa vegetativa", "Bottoni fiorali e fioritura", "Accrescimento dei frutti", "Maturazione"],
    "Zucchino": ["Sviluppo vegetativo", "Bottoni fiorali e fioritura", "Accrescimento dei frutti", "Maturazione"],
    "Melanzana": ["Sviluppo vegetativo", "Bottoni fiorali e fioritura", "Accrescimento dei frutti", "Maturazione"],
}
HEADERS = ["Coltura", "Varietà", "Destinazione", "Impiego", "Precocità", "Piante/ha",
           "Resa media (t/ha)", "Azoto Totale (kg/ha)",
           "N Fase 1: Sviluppo (kg/ha)", "N Fase 2: Fioritura (kg/ha)",
           "N Fase 3: Ingrossamento (kg/ha)", "N Fase 4: Maturazione (kg/ha)",
           "P2O5 (kg/ha)", "K2O (kg/ha)", "BBCH F1 (Sviluppo)", "BBCH F2 (Fioritura)",
           "BBCH F3 (Ingrossamento)", "BBCH F4 (Maturazione)", "Acqua (m3/ha/stagione)",
           "NDVI F1 (Sviluppo)", "NDVI F2 (Fioritura)", "NDVI F3 (Ingrossamento)",
           "NDVI F4 (Maturazione)", "Note"]


def read_workbook(path):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_HASH:
        raise ValueError("Excel diverso da quello approvato: revisione richiesta.")
    with zipfile.ZipFile(path) as archive:
        if sum(i.file_size for i in archive.infolist()) > 12_000_000:
            raise ValueError("Archivio Excel troppo grande.")
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(t.text or "" for t in node.findall(".//s:t", NS))
                       for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        tree = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        result = []
        for row in tree.findall(".//s:sheetData/s:row", NS):
            values = [""] * 24
            for cell in row.findall("s:c", NS):
                if cell.find("s:f", NS) is not None:
                    raise ValueError("Formula Excel non autorizzata.")
                letters = re.match(r"[A-Z]+", cell.attrib["r"])[0]
                index = 0
                for char in letters:
                    index = index * 26 + ord(char) - 64
                if index > 24:
                    raise ValueError("Colonna inattesa.")
                val = cell.find("s:v", NS)
                text = val.text if val is not None else "".join(
                    t.text or "" for t in cell.findall(".//s:t", NS))
                values[index - 1] = strings[int(text)] if cell.get("t") == "s" else (text or "")
            result.append(values)
    if result[0] != HEADERS or len(result) != 361:
        raise ValueError("Struttura o conteggio Excel inattesi.")
    return result[1:]


def number(value, positive=False, ndvi=False):
    result = float(value.replace(",", "."))
    if not math.isfinite(result) or result < 0 or (positive and result <= 0) or (ndvi and not 0 < result <= 1):
        raise ValueError(f"Parametro numerico non valido: {value!r}")
    # Excel contains binary float artefacts (e.g. 0.5600000000000001).
    # Fifteen significant digits preserve the meaningful supplied precision.
    return format(result, ".15g")


def convert(path):
    original = read_workbook(path)
    columns = json.loads((ROOT / "lib/crop-calculations/src/catalogue.json").read_text())["columns"]
    records, identities, trace = [], set(), []
    counts = collections.Counter()
    for line, row in enumerate(original, 2):
        crop, name = row[:2]
        identity = (crop, name)
        if crop not in LABELS or not name or identity in identities:
            raise ValueError(f"Identità inattesa/duplicata alla riga {line}.")
        identities.add(identity)
        counts[crop] += 1
        record = row[:5] + [number(row[i], positive=True) for i in (5, 6, 7)]
        nitrogen = float(record[7])
        phases = [number(row[i]) for i in range(8, 12)]
        if abs(sum(float(n) for n in phases) - nitrogen) > .21:
            raise ValueError(f"Ripartizione N non coerente alla riga {line}.")
        for phase in range(4):
            codes = row[14 + phase].replace("–", "-").split("-")
            if len(codes) not in (1, 2) or any(not c.isdigit() or not 0 <= int(c) <= 99 for c in codes):
                raise ValueError(f"BBCH non valido alla riga {line}.")
            record += [LABELS[crop][phase], phases[phase],
                       "-".join(c.zfill(2) for c in codes), number(row[19 + phase], ndvi=True)]
        records.append(record)
        trace.append({"crop": crop, "variety": name, "sheet": "Database_360", "row": line})
    if counts != collections.Counter({crop: 60 for crop in LABELS}):
        raise ValueError("Conteggi per coltura inattesi.")
    payload = (json.dumps({"columns": columns, "rows": records}, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    evidence = {"source_sha256": SOURCE_HASH, "snapshot_sha256": hashlib.sha256(payload).hexdigest(),
                "counts": dict(counts), "profiles": trace,
                "criteria": ["Valori forniti dal titolare; non certificazione sperimentale indipendente.",
                             "Esclusi fosforo, potassio, acqua e note.",
                             "Etichette di fase coerenti con coltura e BBCH; codici a due cifre.",
                             "N, NDVI, resa e densità conservati a 15 cifre significative."]}
    return payload, (json.dumps(evidence, ensure_ascii=False, indent=2) + "\n").encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    payload, trace = convert(args.source)
    # Snapshot the existing tobacco defaults, without importing the browser app
    # into the API or changing any original variety or calculation.
    app = (ROOT / "artifacts/ndvi-tabacco/src/App.tsx").read_text()
    block = re.search(r"export const VARIETA_DB:[^=]+=\s*(\{.*?\n\});", app, re.S)
    if not block:
        raise ValueError("Catalogo tabacco non riconosciuto.")
    literal = re.sub(r"//[^\n]*", "", block[1])
    literal = re.sub(r"(\b[a-zA-Z]\w*)\s*:", r'"\1":', literal)
    literal = re.sub(r",(\s*[}\]])", r"\1", literal)
    tobacco = (json.dumps(json.loads(literal), ensure_ascii=False, indent=2) + "\n").encode()
    for destination, content in ((OUTPUT, payload), (TRACE, trace), (NATIVE, tobacco)):
        if args.check:
            if destination.read_bytes() != content:
                raise ValueError(f"Output non riproducibile: {destination.name}")
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
    print("360 profili completi, 6 colture; nessuna connessione al database.")


if __name__ == "__main__":
    main()
