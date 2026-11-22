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
| `d21` | Democracia 21 | programa-democracia21.pdf | 108 | es |
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
- [x] `data/mesa/summary.json`: resumen paso a paso (constitución de la mesa 8:00, votación 9:00–20:00, voto CERA/correo, escrutinio, actas, incidencias), con páginas.
- [x] Página **Mesa electoral**: línea temporal del día + listas de "qué hacer si…".
- [x] `data/questions/mesa.json` + su test (mismo motor de cuestionarios).

## Fase 6 — Prueba de la versión preliminar
- [x] Probar en local y en el móvil (en la misma wifi: `http://<IP-del-PC>:8000`).
- [x] Activar GitHub Pages (rama `main`, carpeta raíz) y probar desde el móvil con datos. → https://drbondyalejuez.github.io/spanish-elections-2026-program-quizz-site/
- [x] Revisar las respuestas: comprobar 5 al azar por partido contra el PDF. Hecho con `tools/check_pages.py` (marca citas cuya página no encaja con el texto) + revisión manual; corregidas ~15 páginas de los resúmenes.

## Fase 7 — Ampliar contenido
- [x] 100 preguntas por programa, repartidas entre todos los temas que trata (unas 8–15 por tema). (1.100 preguntas con 11 programas; con los cuatro añadidos después, ver Fase 7b).
- [x] 100 preguntas del manual de mesa (solo de las páginas de instrucciones/procedimiento).
- [x] `tools/validate.py`: comprueba el esquema, que no haya ids repetidos, que las páginas existan y que la respuesta aparezca cerca de la página citada.

## Fase 7b — Programas añadidos después de la primera versión
- [x] Democracia 21 (`d21`), EH Bildu (`ehbildu`, archivo `PROGRAMA-CAS.pdf`), Drago Canarias (`drago`) y Unidad del Pueblo Canario (`upc`): texto extraído, `topicMap`, resumen, posturas y 100 preguntas cada uno (mínimo 60-70 si el programa es corto). Procedimiento reutilizable en AGENTS.md §10.

> **Orden de trabajo sugerido** (quedan pocos días para el 29N): 8 → 12 (menú desplegable, porque aloja los enlaces nuevos) → 9 → 11 → 10 → 13. Cada fase deja la web funcionando y se publica sola con `git push`.

## Fase 8 — Transparencia y valoración de preguntas
- [x] **Aviso de transparencia en la página de inicio** (`#/`, función `renderInicio` en `assets/app.js`, con las variables de color del tema): explicar que todo el contenido se ha generado con IA ("vibe coding") directamente a partir de los programas oficiales, sin revisión humana de cada dato; que la IA puede tener sus propios sesgos; que se ha intentado ser neutral; y que, por transparencia, las ideas del creador de la web probablemente se inclinan a la izquierda. Invitar a comprobar siempre el documento original (enlaces 📄).
- [x] **Botones 👍 / 👎 en cada pregunta del test** (`assets/quiz.js`, visibles tras corregir) — hecho con "navegador + exportar JSON": las valoraciones se guardan en `localStorage`, el botón "Exportar mis valoraciones" descarga un JSON y `tools/import_ratings.py` lo vuelca en el campo opcional `review` de cada pregunta (ver AGENTS.md §5).
- [ ] Pendiente de revisión humana: algunos distractores de "¿Qué partido…?" se eligieron porque el resumen del otro partido no lo menciona (no porque lo rechace). Si un usuario detecta un fallo, corregir la pregunta.

## Fase 9 — Página de partidos y leyenda de siglas
Objetivo: una página que presente a cada partido o candidatura (y los partidos que la forman) y una leyenda de siglas consultable desde toda la web.
- [ ] **9.1 Datos de coaliciones** — crear `data/coalitions.json`: por cada programa, `{ id, nombreCompleto, siglas, formadaPor: [{ nombre, siglas, fuente }], descripcion, fuente }`. La información sale **del propio programa** (portada, introducción, firmas) con su página; si el programa no nombra a las formaciones, poner "no consta en el programa" y pedir al creador que confirme (nunca inventar). Un agente Sonnet por programa, con grep de "coalición", "candidatura", "formaciones", "integran"…
- [ ] **9.2 Reglas de siglas** — cada candidatura se representa por **todas** sus formaciones, nunca solo por una: p. ej. Coalición Canaria + Primero Canarias → **1ºC/CC** (o **Def. Can.**, por el nombre del programa "Defiende Canarias"; decidir con el creador). Siglas cortas (≤ 8 caracteres) y únicas, p. ej. **F. Amp.** para Frente Amplio. Tabla propuesta para revisar: PSOE · PP · VOX · Podemos · F. Amp. · SALF · ERC · Compromís · EAJ-PNV · D21 · 1ºC/CC · Drago · UPC · EH Bildu. Mantener los `id` actuales (no se rompen enlaces ni datos) y añadir los campos `siglas` y `siglasLargas` a `data/parties.json`.
- [ ] **9.3 Usar las siglas en toda la web** — helper `partyLabel(id)` en `assets/lib.js` y sustituir `short` en chips, tablas, matriz de acuerdo, tests y anexo; comprobar que caben en móvil (360 px).
- [ ] **9.4 Leyenda desplegable de siglas** — botón "🔤 Siglas" en la cabecera (visible en cualquier página) que abre un panel (reutilizar el estilo del glosario) con cada sigla → nombre completo → formaciones que la integran, y enlace a su ficha. Cada resumen de partido explica sus siglas.
- [ ] **9.5 Página `#/partidos`** — muestra **un partido cada vez** con un **deslizador** (carrusel con `scroll-snap`, gesto de arrastre en móvil, flechas del teclado y puntos de posición) y, como alternativa accesible, el selector de chips de las otras páginas. Cada ficha: siglas y nombre, formaciones que la integran, resumen de 3-5 líneas de lo que dice su programa (`overview`), prioridades principales, propuestas más distintivas, enlace al programa completo 📄, y atajos a su resumen por temas y a su test.
- [ ] **9.6 Neutralidad y calidad** — descripciones basadas solo en el programa (sin etiquetas ideológicas externas), con página citada; pasar `tools/validate.py` (nuevo chequeo de `coalitions.json`: ids existentes, siglas únicas, fuentes con página válida); actualizar AGENTS.md (rutas, esquema) y probar en móvil y modo oscuro.

## Fase 10 — Test de afinidad: "¿Con qué partido coincido?"
Objetivo: un test de opiniones que, tras responder, muestra con qué partidos coincide más la persona y en qué puntos discrepa. **Es distinto del test de conocimiento** (que mide cuánto sabes de los programas): se renombrarán para que se entiendan solos — **"Test de conocimiento"** (el actual) y **"¿Con quién coincido?"** (el nuevo).
- [ ] **10.1 Diseño del banco de 100 preguntas** — ≈ 7 por cada tema de `topics.json` (14 temas) + preguntas transversales ("ejes") que separan bien a los partidos: economía (más/menos Estado e impuestos), modelo territorial, libertades y seguridad, inmigración, Europa y defensa, ecología/energía, igualdad, instituciones y corrupción. Formatos mezclados: (a) *escala de acuerdo* (muy de acuerdo → muy en desacuerdo) ante una afirmación; (b) *elige la mejor opción* entre 3-4; (c) *elige las afirmaciones* con las que más coincides. Redacción neutral, sin nombrar partidos.
- [ ] **10.2 Datos** — `data/affinity/items.json`: `{ id, tema, eje, tipo, texto, opciones: [{ etiqueta, posturas: { <partido>: { v, page, nota } } }], peso }`. Reutilizar las 80 afirmaciones de `positions.json` (escala −2…+2 ya anotada con página) y escribir 20-30 nuevas, **con la postura de cada partido anotada con su página** (agentes Sonnet por tema; `null` si el programa no lo trata). Revisar que ninguna pregunta tenga las mismas posturas en todos los partidos.
- [ ] **10.3 Informe de discriminación** — `tools/affinity_report.py`: cuántas posturas anotadas tiene cada partido, qué preguntas separan mejor a cada pareja de partidos, huecos por tema y avisos (partidos con pocos datos como 1ºC/CC, PNV, UPC, Drago). Sirve para añadir preguntas hasta que los partidos queden bien diferenciados.
- [ ] **10.4 Cálculo de afinidad** — para cada pregunta contestada, distancia entre la respuesta (−2…+2) y la postura del partido; **% de afinidad = 100 × (1 − media(|respuesta − postura|) / 4)** solo con las preguntas en que el partido tiene postura, mostrando siempre *n* (con n pequeño, el % es poco fiable). Opción "esto me importa mucho" (peso ×2) y "no sé / paso" (no cuenta). Cálculo por tema y total; misma metodología que el Anexo (enlazarla).
- [ ] **10.5 Tandas y memoria** — cada tanda ofrece **20 preguntas** equilibradas por tema, tomadas **solo entre las no respondidas**; si se repite el test se generan las restantes y el resultado se calcula con **todas** las respondidas hasta ese momento. Guardar en `localStorage` (`affinity-answers-v1`: `{ idPregunta: { valor, importante, fecha } }`); botones "Borrar mis respuestas" y "Exportar/importar" (para cambiar de móvil). Animar a seguir: "Has respondido 40 de 100 · con más preguntas el resultado es más fiable". Todo queda en el dispositivo; avisarlo.
- [ ] **10.6 Pantalla de resultados** — ranking de partidos con % y *n*, barras por tema y, para cada partido, **en qué puntos coincide más y en cuáles discrepa más** (las 3 preguntas con mayor/menor acuerdo, con la postura del partido, su nota y enlace 📄 a la página). Mensaje claro de límites ("es una orientación, no un consejo de voto; lee los programas"), enlace a la metodología y al Anexo.
- [ ] **10.7 Interfaz y ruta** — `#/afinidad` (test) y `#/afinidad?r=1` (resultado); reutilizar `quiz.js` donde sea posible (una pregunta por pantalla en móvil, barra de progreso, volver atrás); renombrar los botones del menú y de la portada; modo oscuro; validación en `tools/validate.py` (esquema de `items.json`, páginas existentes, mínimo de posturas por partido).
- [ ] **10.8 (Opcional) Selección adaptativa** — tras las 20 primeras, elegir las siguientes preguntas que más separen a los dos o tres partidos con mayor afinidad.
- [ ] **10.9 Pruebas** — probar con perfiles ficticios (p. ej. responder siempre como un partido ⇒ ese partido debe salir primero con % alto), revisar sesgos del banco (equilibrio en la redacción izquierda/derecha) y activar también las valoraciones 👍/👎 de la Fase 8 en estas preguntas.

## Fase 11 — Programas por concepto (búsqueda de términos)
Objetivo: separar la vista **por tema** (Resúmenes) de una vista **por concepto**: elegir partidos, buscar un término y ver en qué páginas de cada programa aparece y qué opina cada partido.
- [ ] **11.1 Lista de conceptos** — generar candidatos con `tools/candidate_terms.py` (frecuencia/TF-IDF por partido + glosario + temas) y curar a mano ~150-300 términos útiles con sus variantes (alquiler/arrendamiento, IVA, OTAN, nuclear, IRPF, okupación, vivienda pública…). Archivo `data/concepts/terms.json`: `{ id, etiqueta, variantes: [], tema }`.
- [ ] **11.2 Índice** — `tools/build_concepts.py` recorre `extracted/<partido>/pNNN.txt` (uniendo palabras cortadas por guion, sin tildes ni mayúsculas) y genera `data/concepts/index.json`: por término y partido, las páginas donde aparece, nº de menciones y 1-2 fragmentos cortos de contexto (≤ 200 caracteres).
- [ ] **11.3 "Opinión relevante"** — para cada partido y término, enlazar los puntos de su resumen (`summaries/<id>.json`) y las posturas de `positions.json` cuyas palabras clave coincidan, con su nota y enlace 📄; si no hay, decir "aparece en el programa pero sin una propuesta resumida".
- [ ] **11.4 Página `#/conceptos`** — selector de partidos (igual que las otras páginas) y un **desplegable con buscador** con la lista de conceptos. Si la persona escribe una palabra que no está en la lista, mostrar un mensaje claro ("esta búsqueda es solo para los conceptos de la lista; prueba con uno de ellos") y sugerir los más parecidos. Resultado por partido: páginas (enlaces 📄 a cada página del PDF), nº de menciones, fragmentos y opinión relevante; ordenar por menciones y dejar al final los partidos que no lo mencionan.
- [ ] **11.5 (Opcional, si sobra tiempo) Búsqueda libre** — índice de texto completo por partido cargado bajo demanda (el texto extraído pesa ≈ 3,5 MB: no cargarlo todo en el móvil), de modo que cualquier palabra funcione; mantener la lista de conceptos como atajo.
- [ ] **11.6 Integración y calidad** — enlace desde Resúmenes ("¿Prefieres buscar por concepto?"), `reviewNote()`, pruebas en móvil y modo oscuro, `validate.py` (términos existentes, páginas válidas), actualizar AGENTS.md.

## Fase 12 — Separar la mesa electoral del resto (menú desplegable)
Objetivo: que lo que sirve para ser miembro de mesa no se mezcle con el contenido de los programas.
- [ ] **12.1 Componente de menú desplegable** en la cabecera, accesible (botón con `aria-expanded`, se cierra con Esc, al tocar fuera y al elegir una opción; manejable con teclado) y pensado para móvil: como el menú de pestañas se desplaza en horizontal, el desplegable debe abrirse como panel flotante (`position: fixed`) para que no quede recortado.
- [ ] **12.2 Botón "🗳️ Mesa electoral ▾"** con dos entradas: **"Resumen de la mesa"** (`#/mesa`) y **"Test de conceptos de la mesa"** (`#/test-mesa`). Quitar de la barra principal las pestañas sueltas "Mesa electoral" y "Test mesa" (las rutas se mantienen: no se rompe ningún enlace guardado).
- [ ] **12.3 Separación visual y de contenido** — color/etiqueta propia para la sección de la mesa; el glosario de la mesa solo se aplica en las páginas de la mesa; en la portada, dos bloques claros: "Programas de los partidos" y "Si te toca estar en una mesa".
- [ ] **12.4 Agrupar el resto del menú** — usar el mismo desplegable para agrupar las páginas de programas (p. ej. "Programas ▾": Partidos, Resúmenes por tema, Por concepto, Comparar, Anexo) y de tests ("Tests ▾": Test de conocimiento, ¿Con quién coincido?) cuando existan las fases 9-11.
- [ ] **12.5 Pruebas y documentación** — probar a 360 px, modo oscuro y teclado; actualizar la lista de rutas en AGENTS.md §2.

## Fase 13 — Conexión con NotebookLM (explorar)
Objetivo: aprovechar el cuaderno de NotebookLM del proyecto (con los mismos PDFs) para compartir su material y, si es posible, preguntarle desde la web. *El enlace del cuaderno no se guarda en este repositorio (es público); se mantiene en privado.*

Opciones, de la más fácil a la más difícil:
- [ ] **A. Enlace desde la web** (fácil, sin código nuevo): botón "Pregúntale al cuaderno en NotebookLM" en cada página. Requiere compartir el cuaderno con "cualquiera con el enlace" (modo solo chat/lector) y que quien lo abra tenga cuenta de Google. Decidir antes qué se comparte: el cuaderno incluye las fuentes (PDFs públicos), pero conviene revisar notas propias antes de hacerlo público.
- [ ] **B. Importar su material a la web** (medio): descargar lo que genera NotebookLM (guía de estudio, FAQ, resumen, audio "Audio Overview", mapa mental) y publicarlo en una página **Material extra** (audio con `<audio>`, texto en `data/extra/`). Es contenido estático, funciona en GitHub Pages. Mantener las reglas de AGENTS.md: cada dato debe poder contrastarse con una página del PDF; el material de NotebookLM se etiqueta como "generado por IA" y se revisa antes de publicarlo.
- [ ] **C. Chat integrado en la web** (difícil / dudoso): NotebookLM para particulares **no tiene API pública**; solo parece haber API en la versión Enterprise de Google Cloud (a verificar), que necesita proyecto de pago y servidor. Una web estática en GitHub Pages no puede llamar a NotebookLM directamente ni guardar claves de forma segura.
- [ ] **D. Alternativa propia a C** (medio-difícil): un chat "pregunta al programa" con nuestro propio texto (`extracted/`) usando la API de Claude a través de un servicio intermedio gratuito/barato (Cloudflare Workers o similar) que guarde la clave. Habría que definir límites de uso/coste, respuestas siempre con cita de página y enlace al PDF, y un aviso de que puede equivocarse.
- [ ] **Decisión**: probar A (30 min) y B; dejar C/D solo si después del 29N sigue interesando (el valor mayor está antes de las elecciones).

## Extras hechos
- [x] Modo oscuro con botón en la cabecera (recuerda tu elección; por defecto sigue el tema del móvil/PC).

## Ideas opcionales
- Tarjetas de memoria (flashcards) y modo "repaso rápido de 5 min".
- PWA (que funcione sin conexión desde el móvil).

## Riesgos / decisiones
- **PDF en el móvil**: Android/Chrome no muestra los PDF dentro del navegador e ignora `#page=N` (lo descarga). Solución si molesta: incluir el visor **PDF.js** (`viewer.html?file=…#page=N`).
- **PDFs pesados**: el de CC se comprimió de 66 MB a 0,8 MB (mismas páginas y texto). Hacer lo mismo con cualquier PDF de más de 50 MB.
- **Programas en catalán/valenciano** (ERC, Compromís): resumen en castellano; las citas se pueden dejar en el idioma original.
- **Neutralidad**: se resume lo que dice cada programa, sin dar opinión. Si algo no aparece en un programa, se pone "no lo menciona".
