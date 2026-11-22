// Router por hash. Cada página es un módulo en assets/pages/ con export render(app).
import { parseHash, initGlossaryPopover, esc } from './lib.js';

const app = document.getElementById('app');

const pages = {
  inicio: () => ({ render: renderInicio }),
  resumenes: () => import('./pages/resumenes.js'),
  comparar: () => import('./pages/comparar.js'),
  anexo: () => import('./pages/anexo.js'),
  test: () => import('./pages/test.js'),
  mesa: null,
  'test-mesa': null,
};

const titles = { test: 'Test de programas', mesa: 'La mesa electoral paso a paso', 'test-mesa': 'Test de la mesa electoral' };

function renderInicio(el) {
  const days = Math.ceil((new Date('2026-11-29T09:00:00+01:00') - new Date()) / 864e5);
  el.innerHTML = `
    <div class="card hero"><h2>Prepárate para el 29N</h2>
      <p>${days > 0 ? `Quedan <strong>${days} días</strong> para las Elecciones Generales.` : 'Elecciones Generales del 29 de noviembre de 2026.'}
      Aquí tienes los programas de 10 partidos resumidos por temas, un comparador y tests para repasar.</p></div>
    <div class="grid">
      <a class="card tile" href="#/resumenes">📚<b>Resúmenes</b><span>Qué propone cada partido, tema por tema.</span></a>
      <a class="card tile" href="#/comparar">⚖️<b>Comparar</b><span>% de acuerdo y qué les separa.</span></a>
      <a class="card tile" href="#/test">✅<b>Test</b><span>20 preguntas por partido y tema.</span></a>
      <a class="card tile" href="#/mesa">🗳️<b>Mesa electoral</b><span>Qué hacer si te toca estar en una mesa.</span></a>
    </div>
    <p class="muted small">Resúmenes neutrales hechos a partir de los programas oficiales. Cada dato enlaza a su página del PDF original para que puedas comprobarlo.</p>`;
}

async function render() {
  const { route } = parseHash();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#/${route}`));
  const loader = pages[route] === undefined ? pages.inicio : pages[route];
  if (!loader) {
    app.innerHTML = `<div class="card"><h2>${esc(titles[route])}</h2><p class="muted">En construcción.</p></div>`;
    return;
  }
  try {
    const mod = await loader();
    await mod.render(app);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card"><p>Ha ocurrido un error al cargar esta sección.</p><p class="muted small">${esc(e.message)}</p></div>`;
  }
}

let lastRoute = null;
window.addEventListener('hashchange', () => {
  const { route } = parseHash();
  const y = route === lastRoute ? scrollY : 0;
  lastRoute = route;
  render().then(() => scrollTo(0, y));
});
initGlossaryPopover();
lastRoute = parseHash().route;
render();
