"""Une los glosarios de data/summaries/*.json (y data/glossary_extra.json si existe) en data/glossary.json.

Si un término se repite, se queda con la definición más corta que tenga al menos 40 caracteres
(suele ser la más clara). Uso: python tools/build_glossary.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
terms = {}
sources = sorted((D / "summaries").glob("*.json"))
extra = D / "glossary_extra.json"


def add(g, origin):
    term, definition = g.get("term", "").strip(), g.get("definition", "").strip()
    if not term or not definition or len(term) > 60:
        return
    key = term.lower()
    prev = terms.get(key)
    if prev is None:
        terms[key] = {"term": term, "definition": definition, "from": [origin]}
        return
    prev["from"].append(origin)
    good = lambda d: (len(d) < 40, len(d))
    if good(definition) < good(prev["definition"]):
        prev["definition"] = definition


for f in sources:
    for g in json.loads(f.read_text(encoding="utf-8")).get("glossary", []):
        add(g, f.stem)
if extra.exists():
    for g in json.loads(extra.read_text(encoding="utf-8")):
        add(g, "extra")

out = sorted(terms.values(), key=lambda g: g["term"].lower())
(D / "glossary.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(out)} términos en data/glossary.json")
