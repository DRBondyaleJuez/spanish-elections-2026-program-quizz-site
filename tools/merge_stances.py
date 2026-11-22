"""Une data/stances/<partido>.json en data/positions.json y calcula data/agreement.json.

% de acuerdo entre A y B = 100 × (1 − media(|vA − vB|) / 4), solo con las afirmaciones
que tratan los dos (v no nulo). n = número de afirmaciones comparadas.
Uso: python tools/merge_stances.py
"""
import json
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
positions = json.loads((D / "positions.json").read_text(encoding="utf-8"))
parties = [p["id"] for p in json.loads((D / "parties.json").read_text(encoding="utf-8"))]
ids = {s["id"] for s in positions}

for pid in parties:
    f = D / "stances" / f"{pid}.json"
    if not f.exists():
        print(f"  (sin posturas de {pid})")
        continue
    st = json.loads(f.read_text(encoding="utf-8"))
    missing = ids - set(st)
    if missing:
        print(f"  {pid}: faltan {sorted(missing)}")
    for s in positions:
        v = st.get(s["id"])
        if not v or v.get("v") is None:
            s["stances"].pop(pid, None)
            continue
        s["stances"][pid] = {"v": int(v["v"]), "page": int(v["page"]), "note": (v.get("note") or "").strip()}

(D / "positions.json").write_text(json.dumps(positions, ensure_ascii=False, indent=1), encoding="utf-8")


def agree(sts, a, b):
    diffs = [abs(s["stances"][a]["v"] - s["stances"][b]["v"]) for s in sts if a in s["stances"] and b in s["stances"]]
    return {"pct": round(100 * (1 - sum(diffs) / len(diffs) / 4)) if diffs else None, "n": len(diffs)}


topics = sorted({s["topic"] for s in positions})
out = {"overall": {}, "byTopic": {t: {} for t in topics}}
for a, b in combinations(parties, 2):
    key = f"{a}|{b}"
    out["overall"][key] = agree(positions, a, b)
    for t in topics:
        out["byTopic"][t][key] = agree([s for s in positions if s["topic"] == t], a, b)
(D / "agreement.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

cover = {p: sum(p in s["stances"] for s in positions) for p in parties}
print("Posturas anotadas por partido:", cover)
best = sorted(((v["pct"], k) for k, v in out["overall"].items() if v["pct"] is not None and v["n"] >= 10), reverse=True)
print("Más afines:", best[:3])
print("Menos afines:", best[-3:])
