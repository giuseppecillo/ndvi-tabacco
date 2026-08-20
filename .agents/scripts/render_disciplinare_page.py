import fitz
from pathlib import Path

pdf_path = Path("attached_assets/Nuovo_Disciplinare_2023-2024_(1)_1787219090380.pdf")
output_path = Path(".agents/outputs/disciplinare-pagina-6.png")
output_path.parent.mkdir(parents=True, exist_ok=True)

with fitz.open(pdf_path) as document:
    page = document[5]
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixmap.save(output_path)

print(output_path)