// La mesa electoral paso a paso (data/mesa/summary.json).
import { loadBase, loadJSON, esc, pdfLink, glossaryText, reviewNote } from '../lib.js';

export async function render(app) {
  await loadBase();
  const S = await loadJSON('data/mesa/summary.json', null);
  const sections = await loadJSON('data/mesa/sections.json');
  const manual = { doc: 'mesa', page: 1 };

  if (!S) {
    app.innerHTML = `<h2>La mesa electoral paso a paso</h2><div class="card muted">El resumen se está preparando.</div>`;
    return;
  }

  const step = s => `<li>${glossaryText(s.text)} ${pdfLink(s.source)}</li>`;

  app.innerHTML = `
    <h2>🗳️ La mesa electoral paso a paso</h2>
    <p class="muted">Si te ha tocado formar parte de una mesa el 29 de noviembre, aquí tienes qué hacer en cada momento del día. Toca 📄 para ver la página del manual oficial.</p>
    ${reviewNote('Lleva el manual oficial contigo el día de la votación.')}
    <div class="card">${glossaryText(S.intro)}<br>${pdfLink(manual, 'Manual completo (PDF)')}</div>

    <nav class="toc card"><b>Ir a:</b>
      <a href="#mesa-timeline">El día, hora a hora</a> · <a href="#mesa-facts">Datos clave</a> · <a href="#mesa-incidents">¿Qué hago si…?</a> · <a href="#/test-mesa">Ponte a prueba ✅</a></nav>

    <h3 id="mesa-timeline">⏰ El día, hora a hora</h3>
    <ol class="timeline">${S.timeline.map(t => `
      <li class="tl-item"><details class="card" ${t === S.timeline[0] ? 'open' : ''}>
        <summary><span class="tl-time">${esc(t.time || '')}</span> ${esc(t.title)}</summary>
        <ul>${t.steps.map(step).join('')}</ul></details></li>`).join('')}</ol>

    <h3 id="mesa-facts">📌 Datos clave para recordar</h3>
    <div class="card"><ul>${S.keyFacts.map(step).join('')}</ul></div>

    <h3 id="mesa-incidents">🆘 ¿Qué hago si…?</h3>
    <input type="search" id="inc-q" class="search" placeholder="Busca: identificación, interventor, papeleta, sobre…" aria-label="Buscar incidencias">
    <div id="inc-list">${S.incidents.map(i => `<details class="card inc"><summary>${esc(i.q)}</summary>
      <p>${glossaryText(i.a)} ${pdfLink(i.source)}</p></details>`).join('')}</div>
    <p class="muted small" id="inc-none" hidden>No hay incidencias con esa palabra. Prueba con otra o consulta la Parte II del manual
      ${pdfLink({ doc: 'mesa', page: sections.sections.find(s => s.id === 'incidencias')?.pages[0][0] || 23 })}.</p>
    <p><a class="btn primary" href="#/test-mesa">Hacer el test de la mesa →</a></p>`;

  // Navegación interna sin cambiar la ruta
  app.querySelectorAll('.toc a[href^="#mesa-"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }));
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  app.querySelector('#inc-q').addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    let shown = 0;
    app.querySelectorAll('.inc').forEach(d => {
      const hit = !q || norm(d.textContent).includes(q);
      d.hidden = !hit;
      if (hit) shown++;
      d.open = !!q && hit;
    });
    app.querySelector('#inc-none').hidden = shown > 0;
  });
}
