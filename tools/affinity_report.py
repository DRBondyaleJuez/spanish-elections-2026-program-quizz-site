"""Informe del test de afinidad ("¿Con quién coincido?") a partir de data/positions.json.

- Posturas anotadas por partido y por tema (huecos).
- Afirmaciones que no separan a nadie (todas las posturas iguales).
- Prueba con perfiles ficticios: si alguien responde exactamente como un partido,
  ese partido debería salir el primero (misma fórmula que assets/pages/afinidad.js).
Uso: python tools/affinity_report.py
"""
import json
from collections import Counter
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "data"
S = json.loads((D / "positions.json").read_text(encoding="utf-8"))
parties = [p["id"] for p in json.loads((D / "parties.json").read_text(encoding="utf-8"))]
topics = sorted({s["topic"] for s in S})


def affinity(answers, pid):
    num = den = n = 0
    for s in S:
        a, p = answers.get(s["id"]), s["stances"].get(pid)
        if a is None or p is None:
            continue
        num += abs(a - p["v"]); den += 1; n += 1
    return (round(100 * (1 - num / den / 4)) if den else None), n


print(f"{len(S)} afirmaciones\n\nPosturas anotadas por partido (temas sin ninguna):")
for pid in parties:
    c = Counter(s["topic"] for s in S if pid in s["stances"])
    print(f"  {pid:13s} {sum(c.values()):3d}  huecos: {', '.join(t for t in topics if not c[t]) or '-'}")

flat = [s["id"] for s in S if len({v["v"] for v in s["stances"].values()}) <= 1]
print(f"\nAfirmaciones que no separan a nadie: {', '.join(flat) or '-'}")

print("\nPerfiles ficticios (responder como cada partido):")
bad = 0
for pid in parties:
    ans = {s["id"]: s["stances"][pid]["v"] for s in S if pid in s["stances"]}
    res = sorted(((affinity(ans, q), q) for q in parties), key=lambda x: -(x[0][0] or -1))
    top = [q for (pct, n), q in res if n >= 5][:3]
    ok = top and top[0] == pid
    bad += not ok
    print(f"  {'OK ' if ok else '!! '}{pid:13s} → {', '.join(f'{q} {affinity(ans, q)[0]}% (n={affinity(ans, q)[1]})' for q in top)}")
print(f"\n{len(parties) - bad}/{len(parties)} perfiles salen con su propio partido en primer lugar.")
