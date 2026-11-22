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
- Cuando aparezca un término técnico, añadirlo al `glossary` del resumen (o a `data/glossary_extra.json`) y ejecutar `python tools/build_glossary.py`, que genera `data/glossary.json`. La web subraya esos términos automáticamente.
- Validar siempre con `python tools/validate.py [id]`.
- Tras añadir contenido, ejecutar `python tools/check_pages.py [id]`: marca citas cuya página no encaja con el texto (heurística; en programas en catalán/valenciano da falsos positivos, revisar a mano).

- **Temas claro/oscuro**: nunca escribir colores fijos en `style.css` ni en el JS; usar las variables de `:root` (`--bg --fg --card --border --accent --on-accent --warn --shadow --s2…`). Cada variable nueva se define en los tres bloques (claro, `[data-theme="dark"]` y `@media (prefers-color-scheme: dark)`). El botón 🌙/☀️ de la cabecera guarda la elección en `localStorage('theme')`; sin elección se sigue el tema del sistema.
- Toda página que muestre resúmenes, posturas o porcentajes incluye `reviewNote()` (invita a consultar el documento original).

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

**`data/parties.json`** — `[{ "id", "name", "short", "color", "file", "pages", "lang", "topicMap": { "<tema>": [[pagInicio, pagFin], …] } }]`
- `topicMap` es **orientativo**: dice dónde está cada tema según los títulos del programa. Antes de poner "no lo menciona", buscar también palabras clave en todo `extracted/<id>/` (con grep), porque algunas propuestas aparecen en otras secciones. Si un tema no está en `topicMap` es que no se encontró ninguna sección sobre él.
- Página física de VOX = página impresa. Compromís y el manual de la mesa: física = impresa + 1. En los demás, comprobarlo siempre en `extracted/`.

**`data/topics.json`** — `[{ "id", "name", "icon" }]` (los temas del §4).

**`data/mesa/sections.json`** — apartados del manual de la mesa con sus páginas (`pages: [[a,b]]`) y si entran en el test (`quiz`).

**`data/summaries/<id>.json`**
```json
{ "party": "psoe",
  "overview": "2-3 frases sobre el programa",
  "topics": { "vivienda": { "summary": "1 frase", "points": [ { "text": "…", "source": { "doc": "psoe", "page": 12 } } ] },
              "cultura": { "notMentioned": true, "points": [] } },
  "distinctive": [ { "topic": "vivienda", "text": "…", "why": "Es de los pocos que…", "source": { "doc": "psoe", "page": 12 } } ],
  "glossary": [ { "term": "SMI", "definition": "…" } ] }
```

**`data/positions.json`** — `[{ "id", "topic", "statement", "stances": { "<party>": { "v": -2..2 | null, "page": N, "note": "…" } } }]`
- No editar `stances` a mano en positions.json: editar `data/stances/<partido>.json` y ejecutar `python tools/merge_stances.py`. `v: null` = no lo menciona (no se deduce por ideología).

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
assets/app.js       router (rutas → assets/pages/*.js)
assets/lib.js       utilidades: carga de datos, filtros en el hash, enlaces a PDF, glosario, reviewNote()
assets/quiz.js      motor de tests reutilizable (runQuiz); historial de fallos en localStorage
assets/pages/       inicio, resumenes, comparar, anexo, test (y mesa / test-mesa en la fase 5)
assets/style.css
data/               todo el contenido (JSON)
sources/            PDFs originales (se sirven tal cual para los enlaces #page=N)
extracted/          texto por página: python tools/extract_text.py [ids]  (se sube al repo para no repetirlo)
tools/              scripts de Python (extracción, validación, cálculo de acuerdo)
```

## 7. Probar en local
Hace falta un servidor (con `file://` no se pueden cargar los JSON):
```
python tools/serve.py
```
→ http://localhost:8000. Desde el móvil, en la misma wifi: `http://<IP-del-PC>:8000`.
En Claude Code Desktop: `preview_start` con el nombre `site` (`.claude/launch.json`).

## 8. Usar bien los modelos (ahorrar)
- **Opus / mucho esfuerzo**: solo para decisiones de diseño (temas, afirmaciones de `positions.json`, metodología de acuerdo) y para revisar.
- **Sonnet / esfuerzo medio**: resúmenes y preguntas, **un partido por subagente** (que lea solo `extracted/<id>/`). Darle este archivo y el esquema.
- **Haiku / poco esfuerzo**: tareas mecánicas (validar JSON, comprobar páginas, formato).
- Leer el texto de `extracted/`, nunca volver a abrir los PDF. Leer solo las páginas del `topicMap` del tema que toca.
- Los subagentes en paralelo comparten la carpeta temporal (scratchpad): cada uno debe trabajar en su propia subcarpeta (`scratchpad/<id>/`) para no pisarse scripts.
- Crear las preguntas por tandas (p. ej. 25 por tema y partido) y pasar `tools/validate.py` al acabar cada tanda.

## 9. Git
- Rama `main` = lo que está publicado en Pages. Commits pequeños con un mensaje que diga lo que se ha hecho (`content(psoe): resúmenes de vivienda`, `feat(test): modo repasar fallos`).
- No subir archivos de más de 50 MB sin comprimirlos antes (ver riesgos en ROADMAP).
