"""Valida los JSON de data/ contra los esquemas de AGENTS.md.

Uso:  python tools/validate.py          (todo)
      python tools/validate.py psoe     (solo lo de ese partido)
Sale con código 1 si hay errores.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
parties = {p["id"]: p for p in json.loads((D / "parties.json").read_text(encoding="utf-8"))}
pages = {k: v["pages"] for k, v in parties.items()} | {"mesa": 37}
topics = {t["id"] for t in json.loads((D / "topics.json").read_text(encoding="utf-8"))}
errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def check_source(where, src, doc=None):
    if not isinstance(src, dict):
        return err(where, "falta source")
    d, pg = src.get("doc"), src.get("page")
    if d not in pages:
        return err(where, f"doc desconocido {d!r}")
    if doc and d != doc:
        err(where, f"doc {d!r} distinto de {doc!r}")
    if not isinstance(pg, int) or not 1 <= pg <= pages[d]:
        err(where, f"página fuera de rango {pg!r} (1..{pages[d]})")


def check_summary(pid):
    f = D / "summaries" / f"{pid}.json"
    if not f.exists():
        return
    s = json.loads(f.read_text(encoding="utf-8"))
    w = f"summaries/{pid}"
    if s.get("party") != pid:
        err(w, "party incorrecto")
    if not isinstance(s.get("overview"), str):
        err(w, "falta overview")
    for t, body in s.get("topics", {}).items():
        if t not in topics:
            err(w, f"tema desconocido {t!r}")
        pts = body.get("points", [])
        if body.get("notMentioned"):
            if pts:
                err(f"{w}/{t}", "notMentioned con puntos")
            continue
        if not body.get("summary"):
            err(f"{w}/{t}", "falta summary")
        if not pts:
            err(f"{w}/{t}", "sin puntos (usa notMentioned)")
        for i, p in enumerate(pts):
            if not p.get("text"):
                err(f"{w}/{t}[{i}]", "texto vacío")
            check_source(f"{w}/{t}[{i}]", p.get("source"), pid)
    missing = topics - set(s.get("topics", {}))
    if missing:
        err(w, f"faltan temas: {sorted(missing)}")
    for i, d in enumerate(s.get("distinctive", [])):
        if d.get("topic") not in topics:
            err(f"{w}/distinctive[{i}]", "tema desconocido")
        for k in ("text", "why"):
            if not d.get(k):
                err(f"{w}/distinctive[{i}]", f"falta {k}")
        check_source(f"{w}/distinctive[{i}]", d.get("source"), pid)
    for i, g in enumerate(s.get("glossary", [])):
        if not g.get("term") or not g.get("definition"):
            err(f"{w}/glossary[{i}]", "falta term/definition")


def check_positions():
    f = D / "positions.json"
    if not f.exists():
        return
    seen = set()
    for i, st in enumerate(json.loads(f.read_text(encoding="utf-8"))):
        w = f"positions[{st.get('id', i)}]"
        if st.get("id") in seen:
            err(w, "id repetido")
        seen.add(st.get("id"))
        if st.get("topic") not in topics:
            err(w, "tema desconocido")
        for pid, v in st.get("stances", {}).items():
            if pid not in parties:
                err(w, f"partido desconocido {pid}")
                continue
            if v.get("v") is None:
                continue
            if v["v"] not in (-2, -1, 0, 1, 2):
                err(f"{w}/{pid}", f"valor no válido {v['v']}")
            pg = v.get("page")
            if not isinstance(pg, int) or not 1 <= pg <= pages[pid]:
                err(f"{w}/{pid}", f"página fuera de rango {pg}")


if __name__ == "__main__":
    only = sys.argv[1:]
    for pid in only or parties:
        check_summary(pid)
    if not only:
        check_positions()
    print("\n".join(errors) if errors else "OK")
    sys.exit(1 if errors else 0)
