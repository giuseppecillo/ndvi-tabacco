"""Check and render only synthetic reports emitted by observationPdf.test.ts."""
import re
import sys
from pathlib import Path

import pymupdf

directory = Path(sys.argv[1])
compact = lambda text: re.sub(r"\s+", "", text)
titles = {
    "it": ("Registro osservazioni NDVI", "Esportato il:", "Pagina", "Ottimale", "Gg"),
    "en": ("NDVI observation log", "Exported on:", "Page", "Optimal", "Days"),
    "es": ("Registro de observaciones NDVI", "Exportado el:", "Página", "Óptimo", "Días"),
}
for language, labels in titles.items():
    for scenario in ("empty", "single", "accents", "multipage"):
        path = directory / f"{language}-{scenario}.pdf"
        with pymupdf.open(path) as pdf:
            text = "\n".join(page.get_text() for page in pdf)
            normalized = compact(text)
            for label in labels:
                assert compact(label) in normalized, (path, label)
            # Locale data can pad the day differently across ICU versions.
            assert re.search(r"0?6/11/2026", normalized), path
            assert "\ufffd" not in text, path
            if scenario in ("single", "accents"):
                for value in ("SYN-ñ-01", "Media", "Fioritura"):
                    assert compact(value) in normalized, (path, value)
                for value in ("0.610", "0.790", "0.180", "39.9", "-34.123456", "-58.654321"):
                    expected = value if language == "en" else value.replace(".", ",")
                    assert expected in normalized, (path, expected)
            if scenario in ("accents", "multipage"):
                for value in ("Peña áéíóúü ¡Sí!", "Parcela ¿Niño? · Caffè"):
                    assert compact(value) in normalized, (path, value)
            if scenario == "multipage":
                assert len(pdf) > 1, path
                for i in range(90):
                    assert f"SYN-{i:03}" in normalized, (path, i)
            for i, page in enumerate(pdf):
                assert labels[2] in page.get_text(), (path, "missing footer", i)
                for word in page.get_text("words"):
                    assert 0 <= word[0] < word[2] <= page.rect.width, (path, "horizontal overflow", word)
                    assert 0 <= word[1] < word[3] <= page.rect.height, (path, "vertical overflow", word)
                page.get_pixmap(matrix=pymupdf.Matrix(1, 1)).save(
                    directory / f"{language}-{scenario}-{i + 1}.png")
            print(f"OK {path.name}: {len(pdf)} page(s), text/accents/values/bounds verified")
