"""Construye el índice de la página "Buscar por concepto" (#/conceptos).

Entrada:  data/concepts/terms.json  ({id, label, topic, v: [variantes]})
          extracted/<partido>/pNNN.txt, data/summaries/<partido>.json, data/positions.json
Salida:   data/concepts/index.json         lista de conceptos con nº de menciones por partido (ligero)
          data/concepts/t/<id>.json        detalle por partido: páginas, fragmentos, puntos del resumen, posturas

Reglas de coincidencia (sin tildes ni mayúsculas, uniendo palabras cortadas por guion):
- Siglas (≥ 2 mayúsculas, p. ej. IVA, OTAN): palabra exacta respetando mayúsculas.
- Variantes cortas (≤ 5 letras): palabra completa (admite plural -s/-es).
- El resto: coincide al principio de palabra (así "alquiler" encuentra "alquileres").
Uso: python tools/build_concepts.py
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
OUT = D / "concepts"
(OUT / "t").mkdir(parents=True, exist_ok=True)


def fold(c):
    """Un carácter → un carácter sin tilde (mantiene la longitud para poder recortar fragmentos)."""
    d = unicodedata.normalize("NFD", c)
    return d[0] if d else c


def clean(raw):
    raw = re.sub(r"[-­]\s*\n\s*", "", raw)       # palabras partidas a final de línea
    return re.sub(r"\s+", " ", raw).strip()


def compile_variant(v):
    acro = sum(ch.isupper() for ch in v) >= 2 or any(ch.isdigit() for ch in v)
    vf = "".join(fold(c) for c in v)
    if acro:
        return re.compile(r"(?<![\w])" + re.escape(vf) + r"(?![\w])"), False
    vf = vf.lower()
    if len(vf) <= 5 and " " not in vf:
        return re.compile(r"(?<![a-z0-9])" + re.escape(vf) + r"(?:s|es)?(?![a-z0-9])"), True
    return re.compile(r"(?<![a-z0-9])" + re.escape(vf)), True


terms = json.loads((OUT / "terms.json").read_text(encoding="utf-8"))
parties = [p["id"] for p in json.loads((D / "parties.json").read_text(encoding="utf-8"))]
positions = json.loads((D / "positions.json").read_text(encoding="utf-8"))
pats = {t["id"]: [compile_variant(v) for v in t["v"]] for t in terms}

# Texto por página: original (para fragmentos), plegado sensible y plegado en minúsculas (misma longitud)
pages = {}
for pid in parties:
    pages[pid] = {}
    for f in sorted((ROOT / "extracted" / pid).glob("p*.txt")):
        raw = clean(f.read_text(encoding="utf-8"))
        folded = "".join(fold(c) for c in raw)
        pages[pid][int(f.stem[1:])] = (raw, folded, folded.lower())


def finds(tid, folded, lower):
    out = []
    for rx, low in pats[tid]:
        out += [m.span() for m in rx.finditer(lower if low else folded)]
    return sorted(set(out))


def matches_text(tid, text):
    folded = "".join(fold(c) for c in text)
    return bool(finds(tid, folded, folded.lower()))


def snippet(raw, span, width=90):
    a, b = span
    s, e = max(0, a - width), min(len(raw), b + width)
    pre = ("…" if s > 0 else "") + raw[s:a]
    post = raw[b:e] + ("…" if e < len(raw) else "")
    return {"pre": pre.lstrip(), "hit": raw[a:b], "post": post.rstrip()}


summaries = {pid: json.loads((D / "summaries" / f"{pid}.json").read_text(encoding="utf-8"))
             for pid in parties if (D / "summaries" / f"{pid}.json").exists()}

index = []
for t in terms:
    tid, det, counts = t["id"], {}, {}
    for pid in parties:
        per_page = []
        for pg, (raw, folded, lower) in pages[pid].items():
            sp = finds(tid, folded, lower)
            if sp:
                per_page.append((pg, len(sp), sp[0], raw))
        n = sum(c for _, c, _, _ in per_page)
        if not n:
            continue
        counts[pid] = n
        best = sorted(per_page, key=lambda x: -x[1])[:3]
        S = summaries.get(pid, {})
        pts = [p for b in S.get("topics", {}).values() for p in b.get("points", []) if matches_text(tid, p["text"])]
        pts += [d for d in S.get("distinctive", []) if matches_text(tid, d["text"])]
        sts = [{"statement": s["statement"], "v": s["stances"][pid]["v"], "page": s["stances"][pid]["page"],
                "note": s["stances"][pid].get("note", "")}
               for s in positions if pid in s["stances"] and matches_text(tid, s["statement"])]
        det[pid] = {
            "n": n,
            "pages": [[pg, c] for pg, c, _, _ in sorted(per_page)],
            "snippets": [{"page": pg, **snippet(raw, span)} for pg, _, span, raw in sorted(best)],
            "points": [{"text": p["text"], "page": p["source"]["page"]} for p in pts[:4]],
            "stances": sts[:4],
        }
    (OUT / "t" / f"{tid}.json").write_text(json.dumps({"id": tid, "label": t["label"], "parties": det}, ensure_ascii=False), encoding="utf-8")
    index.append({"id": tid, "label": t["label"], "topic": t["topic"], "counts": counts})

(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=0), encoding="utf-8")
empty = [x["label"] for x in index if not x["counts"]]
print(f"{len(index)} conceptos indexados. Sin ninguna mención: {empty or '-'}")
top = sorted(index, key=lambda x: -sum(x["counts"].values()))[:5]
print("Más mencionados:", [(x["label"], sum(x["counts"].values())) for x in top])
