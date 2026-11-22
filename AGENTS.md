# AGENTS.md — Guía para agentes de IA y colaboradores

Léelo antes de tocar nada. La planificación está en [ROADMAP.md](ROADMAP.md): marca las casillas cuando termines una tarea.

## 1. Qué es
Web estática en **español** para preparar las Elecciones Generales del **29/11/2026**: resúmenes de los programas, comparador con % de acuerdo, tests y la guía de la mesa electoral. Público: una persona que estudia desde el móvil. El tono es **didáctico, cercano y neutral**.

## 2. Reglas básicas
- **Sin compilación ni frameworks.** HTML + CSS + JS (módulos ES) normales. No usar npm, bundlers ni CDNs salvo que haga falta de verdad (excepción: PDF.js, si se añade).
- **Primero el móvil**: a partir de 360 px de ancho, botones fáciles de pulsar (≥44 px), que nunca haya scroll horizontal.
- El **contenido** va en `data/*.json` y nunca escrito dentro del HTML/JS. La interfaz solo muestra los datos.
- Rutas **relativas** siempre (GitHub Pages lo sirve desde `/<repo>/`).
- Navegación por hash: `#/resumenes`, `#/comparar`, `#/test`, `#/mesa`, `#/test-mesa`. Los filtros van en la query del hash (`#/resumenes?p=psoe,pp&t=vivienda`) para poder compartir el enlace.
- Selección de **uno o varios partidos** en todas las páginas que muestran información de partidos.

## 3. Precisión y fuentes (lo más importante)
- **Cada** afirmación, punto de resumen, postura y respuesta lleva `source: { "doc": "<id>", "page": N }`.
- `page` = número de página **física del PDF** (empezando en 1), NO el número impreso en la página. Así funciona `sources/<archivo>.pdf#page=N`.
- Comprobar siempre con `extracted/<id>/pNNN.txt`. Si no se encuentra en el programa: **no se inventa** → `"no lo menciona"` / `null`.
- Neutralidad: explicar lo que propone cada partido con sus propias ideas. Sin adjetivos que valoren ("absurdo", "valiente"). "Radical/novedoso" significa *muy distinto de los demás o nuevo*, no es un juicio.
- Programas en catalán/valenciano: resumir en castellano.
- Cuando aparezca un término técnico, añadirlo a `data/glossary.json` en vez de explicarlo cada vez en el texto.

## 4. Lista común de temas (`data/topics.json`)
Usar estos ids en todo el proyecto. Si un tema no encaja, ponerlo en `otros`. No crear temas nuevos sin actualizar este archivo.

| id | Tema |
|---|---|
| `vivienda` | Vivienda |
| `empleo` | Empleo, salarios y condiciones laborales |
| `economia` | Economía, impuestos y empresas |
| `pensiones` | Pensiones y protección social |
| `sanidad` | Sanidad y salud |
| `educacion` | Educación y universidades |
| `igualdad` | Igualdad, feminismo y derechos LGTBI |
| `inmigracion` | Inmigración |
| `medioambiente` | Medio ambiente, energía y clima |
| `rural` | Agricultura, pesca y mundo rural |
| `territorio` | Modelo territorial, autogobierno y financiación autonómica |
| `instituciones` | Instituciones, justicia, corrupción y seguridad |
| `exterior` | Política exterior, UE y defensa |
| `cultura` | Cultura, ciencia, digital y medios |
| `otros` | Otros |

## 5. Esquemas de datos

**`data/parties.json`** — `[{ "id", "name", "short", "color", "file", "pages", "lang", "topicMap": { "<tema>": [pagInicio, pagFin] } }]`

**`data/summaries/<id>.json`**
```json
{ "party": "psoe",
  "topics": { "vivienda": { "points": [ { "text": "…", "source": { "doc": "psoe", "page": 12 } } ] } },
  "distinctive": [ { "topic": "vivienda", "text": "…", "why": "Ningún otro partido propone…", "source": { "doc": "psoe", "page": 12 } } ] }
```

**`data/positions.json`** — `[{ "id", "topic", "statement", "stances": { "<party>": { "v": -2..2 | null, "page": N, "note": "…" } } }]`

**`data/questions/<id>.json`** (también `mesa.json`)
```json
[{ "id": "psoe-vivienda-001",
   "doc": "psoe", "topic": "vivienda",
   "type": "tf | single | multi | which_party | which_not | match",
   "question": "…",
   "options": ["…"],            // en tf: ["Verdadero","Falso"]; en which_party: ids de partidos
   "answer": [0],               // índices de las opciones correctas (siempre un array)
   "explanation": "…",          // por qué es así, en lenguaje sencillo
   "tip": "…",                  // pista que ayuda sin dar la respuesta
   "source": { "doc": "psoe", "page": 12, "section": "nombre de la sección del programa" },
   "difficulty": 1 }]           // 1 fácil · 2 media · 3 difícil
```
- Los ids son estables y únicos: `<doc>-<tema>-<nnn>` (en la mesa: `mesa-<apartado>-<nnn>`).
- Las opciones incorrectas deben ser creíbles (por ejemplo, propuestas de otro partido) y nunca de broma.

## 6. Estructura
```
index.html          app de una sola página
assets/app.js       router + páginas
assets/style.css
data/               todo el contenido (JSON)
sources/            PDFs originales (se sirven tal cual para los enlaces #page=N)
extracted/          texto por página (lo genera tools/extract_text.py)
tools/              scripts de Python (extracción, validación, cálculo de acuerdo)
```

## 7. Probar en local
Hace falta un servidor (con `file://` no se pueden cargar los JSON):
```
python -m http.server 8000
```
→ http://localhost:8000. Desde el móvil, en la misma wifi: `http://<IP-del-PC>:8000`.
En Claude Code Desktop: `preview_start` con el nombre `site` (`.claude/launch.json`).

## 8. Usar bien los modelos (ahorrar)
- **Opus / mucho esfuerzo**: solo para decisiones de diseño (temas, afirmaciones de `positions.json`, metodología de acuerdo) y para revisar.
- **Sonnet / esfuerzo medio**: resúmenes y preguntas, **un partido por subagente** (que lea solo `extracted/<id>/`). Darle este archivo y el esquema.
- **Haiku / poco esfuerzo**: tareas mecánicas (validar JSON, comprobar páginas, formato).
- Leer el texto de `extracted/`, nunca volver a abrir los PDF. Leer solo las páginas del `topicMap` del tema que toca.
- Crear las preguntas por tandas (p. ej. 25 por tema y partido) y pasar `tools/validate.py` al acabar cada tanda.

## 9. Git
- Rama `main` = lo que está publicado en Pages. Commits pequeños con un mensaje que diga lo que se ha hecho (`content(psoe): resúmenes de vivienda`, `feat(test): modo repasar fallos`).
- No subir archivos de más de 50 MB sin comprimirlos antes (ver riesgos en ROADMAP).
