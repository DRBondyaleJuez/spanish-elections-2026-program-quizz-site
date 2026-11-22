"""Detecta citas de página sospechosas comparando palabras clave del texto con extracted/<doc>/pNNN.txt.

Para cada punto de resumen, propuesta distintiva y pregunta, extrae palabras clave (cifras, nombres propios,
palabras largas) y mira en qué página del documento aparecen más. Si la página citada encaja mucho peor que
otra, la marca como sospechosa y sugiere la mejor. Es una heurística: hay que revisar a mano lo que marca.

Uso: python tools/check_pages.py [ids]   →  escribe un informe en scratch (stdout, JSON con --json)
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
STOP = set("""para porque sobre entre desde hasta contra durante mediante según también además
través cuando donde quienes cualquier ningún ninguna todas todos cada otras otros nuestra nuestro
propone proponer propuesta programa partido garantizar impulsar reforzar aumentar crear mejorar
establecer promover desarrollar ampliar política políticas público pública públicos públicas
españa español española nacional estado gobierno medidas medida plan""".split())


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


_pages = {}


def pages(doc):
    if doc not in _pages:
        out = {}
        for f in sorted((ROOT / "extracted" / doc).glob("p*.txt")):
            t = f.read_text(encoding="utf-8")
            t = re.sub(r"[-­]\s*\n\s*", "", t)  # une palabras cortadas a final de línea
            out[int(f.stem[1:])] = norm(re.sub(r"\s+", " ", t))
        _pages[doc] = out
    return _pages[doc]


def keywords(text, lang):
    nums = set(re.findall(r"\d[\d.,]*\d|\d", text))
    nums = {n.rstrip(".,") for n in nums if len(n.rstrip(".,")) >= 2}
    proper = {norm(w) for w in re.findall(r"(?<![.¿¡] )\b[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]{3,}", text)}
    words = set()
    if lang == "es":
        words = {w for w in re.findall(r"[a-záéíóúñü]{7,}", norm(text)) if w not in STOP}
    return nums | proper | words


def score(kws, page_text):
    return sum(1 for k in kws if k in page_text) / len(kws) if kws else 0


def check(doc, text, cited, lang, where, out):
    kws = keywords(text, lang)
    if len(kws) < 3 or doc not in {**{p: 1 for p in LANG}, "mesa": 1}:
        return
    P = pages(doc)
    if cited not in P:
        out.append({"where": where, "cited": cited, "best": None, "msg": "página inexistente"})
        return
    s_cited = score(kws, P[cited])
    # cuenta también la página siguiente (los textos que cruzan de página)
    s_cited = max(s_cited, score(kws, P[cited] + " " + P.get(cited + 1, "")) * 0.9)
    best, s_best = max(((p, score(kws, t)) for p, t in P.items()), key=lambda x: x[1])
    if best != cited and s_best >= 0.45 and s_cited < 0.6 * s_best:
        out.append({"where": where, "cited": cited, "best": best,
                    "scores": [round(s_cited, 2), round(s_best, 2)], "text": text[:140]})


parties = json.loads((D / "parties.json").read_text(encoding="utf-8"))
LANG = {p["id"]: p["lang"] for p in parties}

if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or list(LANG) + ["mesa"]
    report = []
    for pid in ids:
        lang = LANG.get(pid, "es")
        f = D / "summaries" / f"{pid}.json"
        if f.exists():
            s = json.loads(f.read_text(encoding="utf-8"))
            for t, b in s["topics"].items():
                for i, p in enumerate(b.get("points", [])):
                    check(pid, p["text"], p["source"]["page"], lang, f"summaries/{pid}/{t}[{i}]", report)
            for i, d in enumerate(s.get("distinctive", [])):
                check(pid, d["text"], d["source"]["page"], lang, f"summaries/{pid}/distinctive[{i}]", report)
        q = D / "questions" / f"{pid}.json"
        if q.exists():
            for x in json.loads(q.read_text(encoding="utf-8")):
                if x["type"] == "which_not":
                    continue  # su respuesta es algo que NO está en el programa
                right = " ".join(str(x["options"][k]) for k in x["answer"]) if x["type"] not in ("tf", "which_party") else ""
                txt = f'{x["question"]} {right} {x["explanation"]}'
                check(x["source"]["doc"], txt, x["source"]["page"], LANG.get(x["source"]["doc"], "es"), f"questions/{x['id']}", report)
    if "--json" in sys.argv:
        print(json.dumps(report, ensure_ascii=False, indent=1))
    else:
        for r in report:
            print(f'{r["where"]}: citada p{r["cited"]} → mejor p{r["best"]} {r.get("scores", "")} | {r.get("text", r.get("msg"))}')
        print(f"\n{len(report)} citas sospechosas")
