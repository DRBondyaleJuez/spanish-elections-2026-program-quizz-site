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


def check_coalitions():
    f = D / "coalitions.json"
    if not f.exists():
        return
    data = json.loads(f.read_text(encoding="utf-8"))
    seen, ids = set(), set()
    for c in data:
        w = f"coalitions[{c.get('id')}]"
        if c.get("id") not in parties:
            err(w, "id de partido desconocido")
        if c.get("id") in ids:
            err(w, "id repetido")
        ids.add(c.get("id"))
        sg = c.get("siglas", "")
        if not sg or len(sg) > 8:
            err(w, f"siglas vacías o de más de 8 caracteres: {sg!r}")
        if sg in seen:
            err(w, f"siglas repetidas: {sg}")
        seen.add(sg)
        if c.get("tipo") not in ("partido", "coalición"):
            err(w, "tipo debe ser partido o coalición")
        for k in ("nombre", "programa", "nota"):
            if not c.get(k):
                err(w, f"falta {k}")
        if c.get("tipo") == "coalición" and not c.get("miembros") and not c.get("confirmar"):
            err(w, "coalición sin miembros: marcar confirmar:true")
        if c.get("fuente"):
            check_source(w, c["fuente"], c["id"])
    for p in parties:
        if p not in ids:
            err("coalitions", f"falta la ficha de {p}")


def check_concepts():
    f = D / "concepts" / "index.json"
    if not f.exists():
        return
    for c in json.loads(f.read_text(encoding="utf-8")):
        t = D / "concepts" / "t" / f"{c['id']}.json"
        if not t.exists():
            err(f"concepts[{c['id']}]", "falta el detalle (ejecuta tools/build_concepts.py)")
            continue
        for pid, x in json.loads(t.read_text(encoding="utf-8"))["parties"].items():
            if pid not in parties:
                err(f"concepts[{c['id']}]", f"partido desconocido {pid}")
                continue
            for pg, _ in x["pages"]:
                if not 1 <= pg <= pages[pid]:
                    err(f"concepts[{c['id']}]/{pid}", f"página fuera de rango {pg}")


TYPES = {"tf", "single", "multi", "which_party", "which_not", "match"}


def check_questions(name):
    f = D / "questions" / f"{name}.json"
    if not f.exists():
        return
    for i, q in enumerate(json.loads(f.read_text(encoding="utf-8"))):
        w = f"questions/{name}[{q.get('id', i)}]"
        for k in ("id", "doc", "topic", "type", "question", "options", "answer", "explanation", "tip", "source"):
            if not q.get(k) and q.get(k) != 0:
                err(w, f"falta {k}")
        if q.get("id") in QIDS:
            err(w, "id repetido")
        QIDS.add(q.get("id"))
        if q.get("type") not in TYPES:
            err(w, f"tipo desconocido {q.get('type')}")
        if name != "mesa" and q.get("topic") not in topics:
            err(w, "tema desconocido")
        if name == "mesa" and q.get("topic") not in MESA_SECS:
            err(w, "apartado de la mesa desconocido")
        opts, ans = q.get("options", []), q.get("answer", [])
        if not isinstance(ans, list) or not ans or any(not isinstance(a, int) or not 0 <= a < len(opts) for a in ans):
            err(w, "answer no válido")
        if q.get("type") == "tf" and opts != ["Verdadero", "Falso"]:
            err(w, "tf debe tener opciones Verdadero/Falso")
        if q.get("type") == "which_party" and any(o not in parties for o in opts):
            err(w, "which_party con partido desconocido")
        if q.get("type") in ("single", "tf", "which_party", "which_not") and len(ans) != 1:
            err(w, "debe tener una sola respuesta")
        check_source(w, q.get("source"))


QIDS = set()
MESA_SECS = {x["id"] for x in json.loads((D / "mesa" / "sections.json").read_text(encoding="utf-8"))["sections"]}


if __name__ == "__main__":
    only = sys.argv[1:]
    for pid in only or parties:
        check_summary(pid)
        check_questions(pid)
    if not only:
        check_questions("mesa")
        check_positions()
        check_coalitions()
        check_concepts()
    print("\n".join(errors) if errors else "OK")
    sys.exit(1 if errors else 0)
