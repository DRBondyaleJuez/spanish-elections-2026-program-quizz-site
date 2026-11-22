"""Vuelca en data/questions/*.json las valoraciones 👍/👎 exportadas desde la web.

Uso: python tools/import_ratings.py valoraciones-preguntas-2026-11-23.json [otro.json ...]

Cada pregunta valorada recibe (o actualiza) el campo opcional:
  "review": { "up": n, "down": n, "notes": ["…"], "seen": ["<ts>", …] }
`seen` guarda las marcas de tiempo ya importadas, así que importar dos veces el mismo archivo no duplica votos.
Al final lista las preguntas con más 👎 para revisarlas.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QDIR = ROOT / "data" / "questions"

if len(sys.argv) < 2:
    sys.exit(__doc__)

ratings = []
for arg in sys.argv[1:]:
    ratings += json.loads(Path(arg).read_text(encoding="utf-8")).get("ratings", [])

files = {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in QDIR.glob("*.json")}
index = {q["id"]: (name, q) for name, qs in files.items() for q in qs}
touched, unknown, added = set(), [], 0

for r in ratings:
    hit = index.get(r.get("id"))
    if not hit:
        unknown.append(r.get("id"))
        continue
    name, q = hit
    rev = q.setdefault("review", {"up": 0, "down": 0, "notes": [], "seen": []})
    key = f'{r.get("ts")}|{r.get("v")}|{r.get("note", "")}'
    if key in rev["seen"]:
        continue
    rev["seen"].append(key)
    if r.get("v") == 1:
        rev["up"] += 1
    elif r.get("v") == -1:
        rev["down"] += 1
    if r.get("note"):
        rev["notes"].append(r["note"])
    touched.add(name)
    added += 1

for name in touched:
    (QDIR / f"{name}.json").write_text(json.dumps(files[name], ensure_ascii=False, indent=1), encoding="utf-8")

print(f"{added} valoraciones nuevas importadas en: {', '.join(sorted(touched)) or '—'}")
if unknown:
    print(f"Ids desconocidos (ignorados): {unknown}")
worst = sorted((q for _, q in index.values() if q.get("review", {}).get("down")), key=lambda q: -q["review"]["down"])
if worst:
    print("\nPreguntas para revisar (más 👎):")
    for q in worst[:30]:
        rv = q["review"]
        print(f'  {q["id"]}: 👎{rv["down"]} 👍{rv["up"]}  {" | ".join(rv["notes"])[:120]}')
