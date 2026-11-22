"""Extrae el texto de cada PDF a extracted/<id>/pNNN.txt (una página física por archivo).

Uso:  python tools/extract_text.py            (todos)
      python tools/extract_text.py vox mesa   (solo esos ids)
Lee la lista de partidos de data/parties.json; 'mesa' es el manual de la mesa electoral.
"""
import json
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DOCS = {p["id"]: p["file"] for p in json.loads((ROOT / "data/parties.json").read_text(encoding="utf-8"))}
DOCS["mesa"] = "sources/MMM_G2026_castellano_para_web.pdf"


def extract(doc_id: str, rel: str) -> None:
    out = ROOT / "extracted" / doc_id
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("p*.txt"):
        old.unlink()
    with pymupdf.open(ROOT / rel) as pdf:
        for i, page in enumerate(pdf, start=1):
            text = page.get_text(sort=True).replace("­", "").strip()
            (out / f"p{i:03d}.txt").write_text(text + "\n", encoding="utf-8")
        print(f"{doc_id:14s} {pdf.page_count:4d} páginas -> extracted/{doc_id}/")


if __name__ == "__main__":
    ids = sys.argv[1:] or list(DOCS)
    for doc_id in ids:
        extract(doc_id, DOCS[doc_id])
