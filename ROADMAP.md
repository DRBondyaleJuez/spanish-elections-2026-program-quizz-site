# Roadmap — Programas 29N (Elecciones Generales 29/11/2026)

Web estática en español, para móvil, para estudiar los programas electorales y el manual de la mesa electoral.
Se publica con **GitHub Pages**. No hay paso de compilación: HTML + CSS + JS normal, con los datos en JSON.

> ⏰ **Plazo real: las elecciones son el 29/11/2026.** Las fases 0–3 deberían estar listas en ~2–3 días para tener tiempo de estudiar.
> Prioridad: **contenido correcto > funciones > aspecto visual**.

## Fuentes (`sources/`)

| id | Partido | Archivo | Págs | Idioma |
|---|---|---|---|---|
| `psoe` | PSOE | PROGRAMAPSOE29N26.pdf | 114 | es |
| `pp` | PP | PROGRAMA-ELECTORAL-PP-2026-RECONSTRUCCION-NACIONAL.pdf | 64 | es |
| `vox` | VOX | Programa-completo-A5-1.pdf | 66 | es |
| `podemos` | Podemos | 29N-programa-Podemos.-Paz-casa-y-trabajo.pdf | 141 | es |
| `frenteamplio` | Frente Amplio | ProgramaFrenteAmplio.pdf | 151 | es |
| `salf` | Se Acabó La Fiesta | SALF_Contrato_Electoral_29N.pdf | 40 | es |
| `erc` | ERC | e2026-programa.pdf | 48 | ca |
| `compromis` | Compromís | programa-compromis-front-valencia.pdf | 57 | ca/va |
| `pnv` | EAJ-PNV | programa-electoral-29n.pdf | 43 | es (+eu) |
| `cc` | Coalición Canaria | CCA-26-Programa_Electoral-29NOV.pdf | 23 | es |
| `mesa` | Manual de la mesa electoral | MMM_G2026_castellano_para_web.pdf | 37 | es |

## Fase 0 — Base del proyecto ✅ (esta sesión)
- [x] ROADMAP.md y AGENTS.md
- [x] Esqueleto de la web (`index.html`, `assets/`, `data/`) + servidor local
- [x] Repositorio git + repositorio público en GitHub

## Fase 1 — Extraer el texto y definir los temas
- [x] `tools/extract_text.py` (PyMuPDF) → `extracted/<id>/p001.txt …` (un archivo por página **física** del PDF, que es el número que usa `#page=N`).
- [x] Definir la **lista común de temas** en `data/topics.json` (propuesta en AGENTS.md §4) y asignar a cada tema la sección/páginas que le tocan en cada programa (`data/parties.json → topicMap`).
- [x] Apartados del manual de la mesa con sus páginas → `data/mesa/sections.json`.
- [x] Revisar los temas que faltan (buscando en todo el texto). Sin sección encontrada: **SALF** → medio ambiente, rural, territorio, cultura. Confirmarlo en la fase 2 y marcarlo como "no lo menciona".

## Fase 2 — Resúmenes por partido y tema
- [x] `data/summaries/<id>.json`: para cada tema, 3–6 puntos clave en lenguaje sencillo, cada uno con su página.
- [x] `distinctive`: propuestas que **solo** tiene este partido o que son radicales o nuevas.
- [x] `data/glossary.json`: términos técnicos (p. ej. "IRPF", "cupo vasco", "SMI", "concierto económico") con una explicación de una línea; la web los subraya y los explica al tocarlos.
- [x] Página **Resúmenes**: elegir uno o varios partidos y temas; tarjetas que se pueden plegar; botón "ver en el PDF" que abre la página exacta en otra pestaña.

## Fase 3 — Comparador y nivel de acuerdo
- [x] `data/positions.json`: para cada tema, 4–8 **afirmaciones** concretas (p. ej. "Topar el precio del alquiler en zonas tensionadas"). Cada partido tiene una postura: `+2` muy a favor, `+1`, `0` neutral, `-1`, `-2` muy en contra, o `null` (no lo menciona), siempre con la página como fuente.
- [x] **% de acuerdo** entre A y B en un tema = 100 × (1 − media(|pA − pB|) / 4), contando solo las afirmaciones que tratan los dos. Junto al % se muestra cuántas afirmaciones se han comparado (n), para no fiarse de un % calculado con pocos datos.
- [x] Página **Comparar**: elegir partidos y temas → tabla/mapa de calor de % + "lo que más les separa" (las afirmaciones con más diferencia) con citas.
- [x] 80 afirmaciones; posturas por partido en `data/stances/<id>.json` → `python tools/merge_stances.py` las une y genera `data/agreement.json` (la web calcula el % en vivo con los mismos datos).

- [x] **Anexo `#/anexo`**: justificación del % (escala, fórmula, límites), cálculo paso a paso de cada pareja, mayores desacuerdos y acuerdos con página en cada programa. Aviso "comprueba el documento original" en Resúmenes, Comparar y Anexo.
- [ ] Revisar a mano las afirmaciones más ambiguas (p. ej. ter-1, ins-4, eco-1) y ampliar a ~6 por tema para que n sea mayor en los programas cortos.

## Fase 4 — Cuestionarios (versión preliminar: 2 preguntas por programa)
- [x] `data/questions/<id>.json` con el esquema de AGENTS.md §5 (tema, página, pista, explicación). **Versión preliminar: 3 por partido (30).** Pendiente revisar que `source.section` coincide con el título real de la sección.
- [x] Tipos (falta `match`, relacionar): verdadero/falso, opción única, opción múltiple, **"¿Qué partido lo propone?"** (cruza partidos), **"¿Quién NO lo propone?"**, y relacionar propuesta↔partido.
- [x] Página **Test**: filtrar por partidos y/o temas → 20 preguntas al azar (o menos si no hay tantas) → enviar → nota, corrección, explicación y enlace a la fuente `pdf#page=N` (en otra pestaña).
- [x] Guardar en el móvil (localStorage) el historial y las preguntas falladas → modo "repasar fallos".

## Fase 5 — Mesa electoral
- [ ] `data/mesa/summary.json`: resumen paso a paso (constitución de la mesa 8:00, votación 9:00–20:00, voto CERA/correo, escrutinio, actas, incidencias), con páginas.
- [ ] Página **Mesa electoral**: línea temporal del día + listas de "qué hacer si…".
- [ ] `data/questions/mesa.json` + su test (mismo motor de cuestionarios).

## Fase 6 — Prueba de la versión preliminar
- [ ] Probar en local y en el móvil (en la misma wifi: `http://<IP-del-PC>:8000`).
- [ ] Activar GitHub Pages (rama `main`, carpeta raíz) y probar desde el móvil con datos.
- [ ] Revisar las respuestas: comprobar 5 al azar por partido contra el PDF.

## Fase 7 — Ampliar contenido
- [ ] 100 preguntas por programa, repartidas entre todos los temas que trata (unas 8–15 por tema).
- [ ] 100 preguntas del manual de mesa (solo de las páginas de instrucciones/procedimiento).
- [ ] `tools/validate.py`: comprueba el esquema, que no haya ids repetidos, que las páginas existan y que la respuesta aparezca cerca de la página citada.

## Extras hechos
- [x] Modo oscuro con botón en la cabecera (recuerda tu elección; por defecto sigue el tema del móvil/PC).

## Ideas opcionales
- Tarjetas de memoria (flashcards) y modo "repaso rápido de 5 min".
- PWA (que funcione sin conexión desde el móvil).
- "Brújula": responder a las afirmaciones de `positions.json` y ver con qué partido coincides más (con los mismos datos del comparador).

## Riesgos / decisiones
- **PDF en el móvil**: Android/Chrome no muestra los PDF dentro del navegador e ignora `#page=N` (lo descarga). Solución si molesta: incluir el visor **PDF.js** (`viewer.html?file=…#page=N`).
- **PDFs pesados**: el de CC se comprimió de 66 MB a 0,8 MB (mismas páginas y texto). Hacer lo mismo con cualquier PDF de más de 50 MB.
- **Programas en catalán/valenciano** (ERC, Compromís): resumen en castellano; las citas se pueden dejar en el idioma original.
- **Neutralidad**: se resume lo que dice cada programa, sin dar opinión. Si algo no aparece en un programa, se pone "no lo menciona".
