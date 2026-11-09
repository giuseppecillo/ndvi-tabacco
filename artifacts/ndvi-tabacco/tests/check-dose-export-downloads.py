"""Check actual UI downloads with stdlib XML/CSV and independent pdftotext.

Run from workspace: python artifacts/ndvi-tabacco/tests/check-dose-export-downloads.py
Optional first argument overrides the evidence directory. No network or database.
"""
import csv
import io
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / "generated-artifacts/dose-export-languages"
ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
expected = {f"QA-{crop}-{kind}": value for crop in ("T", "K") for kind, value in (("ZERO", 0), ("TENTH", 0.1), ("LEGACY", 0.006))}
report = {}
for language, title, header in (
    ("en", "NDVI observation log", "Point N rate (kg N/ha)"),
    ("es", "Registro de observaciones NDVI", "Dosis N en el punto (kg N/ha)"),
):
    directory = root / language
    data = (directory / "home.csv").read_bytes()
    assert data.startswith(b"\xef\xbb\xbf"), "missing UTF-8 BOM"
    rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
    assert len(rows) == 6 and {r["ID"] for r in rows} == set(expected)
    for row in rows:
        key = row["ID"]
        assert float(row["Dose_o_Indicazione_N_Punto_kg_ha"]) == expected[key]
        assert float(row["Quota_Azoto_kg_ha"]) == expected[key]
        assert row["Coltura"] == ("pomodoro" if key.startswith("QA-T") else "Kiwi")
        assert row["Varieta"] == ("Abraracourcix" if key.startswith("QA-T") else "Hayward")
        assert row["Cliente"] == "Synthetic EN ES"
    with zipfile.ZipFile(directory / "history.xlsx") as z:
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        styles = ET.fromstring(z.read("xl/styles.xml"))
        formats = {f.get("numFmtId"): f.get("formatCode") for f in styles.find("s:numFmts", ns)}
        # OOXML s is a ZERO-based index into cellXfs, not into numFmts.
        cell_styles = list(styles.find("s:cellXfs", ns))
        cells = {c.get("r"): c for c in sheet.findall(".//s:c", ns)}
        text = lambda c: "".join(c.itertext())
        assert text(cells["N6"]) == header
        found = set()
        for index in range(7, 13):
            key = text(cells[f"A{index}"])
            found.add(key)
            assert text(cells[f"B{index}"]) == "Synthetic EN ES"
            assert text(cells[f"F{index}"]) == ("pomodoro" if key.startswith("QA-T") else "Kiwi")
            assert text(cells[f"G{index}"]) == ("Abraracourcix" if key.startswith("QA-T") else "Hayward")
            for column in ("N", "Q"):
                cell = cells[f"{column}{index}"]
                assert cell.get("t") is None, "dose must be numeric, not localized text"
                assert float(cell.find("s:v", ns).text) == expected[key]
                fmt = cell_styles[int(cell.get("s", "0"))].get("numFmtId")
                assert fmt == "0" if key.endswith("LEGACY") else formats[fmt] == "0.0"
        assert found == set(expected)
    pdf_text = subprocess.check_output(["pdftotext", "-layout", str(directory / "home.pdf"), "-"], text=True)
    assert title in pdf_text
    for key, dose in expected.items():
        line, = [line for line in pdf_text.splitlines() if key in line]
        value = "0.006" if dose == 0.006 else f"{dose:.1f}"
        if language == "es":
            value = value.replace(".", ",")
        # Dose immediately precedes the two known GPS columns in this fixture.
        assert line.split()[-3:] == [value, "45.123456".replace(".", "," if language == "es" else "."), "12.345678".replace(".", "," if language == "es" else ".")]
    report[language] = {"records": 6, "pdf": "passed", "csv": "passed", "xlsx_numbers_and_formats": "passed"}
assert (root / "en/home.csv").read_bytes() == (root / "es/home.csv").read_bytes()
(root / "download-checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
