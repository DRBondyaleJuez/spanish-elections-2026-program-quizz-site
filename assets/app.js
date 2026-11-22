// Router por hash. Cada página es un módulo en assets/pages/ con export render(app).
import { parseHash, initGlossaryPopover, esc, loadBase } from './lib.js';

const app = document.getElementById('app');

const pages = {
  inicio: () => ({ render: renderInicio }),
  resumenes: () => import('./pages/resumenes.js'),
  comparar: () => import('./pages/comparar.js'),
  anexo: () => import('./pages/anexo.js'),
  test: () => import('./pages/test.js'),
  mesa: () => import('./pages/mesa.js'),
  'test-mesa': () => import('./pages/test-mesa.js'),
};

const titles = { test: 'Test de programas', mesa: 'La mesa electoral paso a paso', 'test-mesa': 'Test de la mesa electoral' };

async function renderInicio(el) {
  const nParties = (await loadBase().catch(() => null))?.parties.length;
  const days = Math.ceil((new Date('2026-11-29T09:00:00+01:00') - new Date()) / 864e5);
  el.innerHTML = `
    <div class="card hero"><h2>Prepárate para el 29N</h2>
      <p>${days > 0 ? `Quedan <strong>${days} días</strong> para las Elecciones Generales.` : 'Elecciones Generales del 29 de noviembre de 2026.'}
      Aquí tienes los programas de ${nParties || 'varios'} partidos resumidos por temas, un comparador y tests para repasar.</p></div>
    <aside class="review transparency" aria-label="Aviso de transparencia">
      <b>🔎 Aviso de transparencia</b>
      <ul>
        <li>Todo el contenido de esta web (resúmenes, comparaciones, porcentajes y preguntas) se ha generado con inteligencia artificial ("vibe coding") <b>directamente a partir de los programas oficiales</b>, sin que una persona haya revisado cada dato.</li>
        <li>La IA puede equivocarse y también puede tener <b>sus propios sesgos</b>.</li>
        <li>Hemos intentado ser neutrales. Aun así, por transparencia: las ideas de la persona que ha creado esta web probablemente se inclinan hacia la izquierda, y eso puede haber influido en qué se destaca y cómo se redacta.</li>
        <li><b>Comprueba siempre el documento original:</b> cada dato lleva un enlace 📄 a su página en el programa. Si ves un error, usa 👎 en las preguntas del test.</li>
      </ul>
    </aside>
    <div class="grid">
      <a class="card tile" href="#/resumenes">📚<b>Resúmenes</b><span>Qué propone cada partido, tema por tema.</span></a>
      <a class="card tile" href="#/comparar">⚖️<b>Comparar</b><span>% de acuerdo y qué les separa.</span></a>
      <a class="card tile" href="#/test">✅<b>Test</b><span>20 preguntas por partido y tema.</span></a>
      <a class="card tile" href="#/mesa">🗳️<b>Mesa electoral</b><span>Qué hacer si te toca estar en una mesa.</span></a>
    </div>
    <p class="muted small">Resúmenes hechos a partir de los programas oficiales de cada partido, que puedes consultar en la carpeta de fuentes de la web.</p>`;
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

// ---- Tema claro / oscuro ----
const root = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
function paintThemeBtn() {
  const dark = isDark();
  themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* sin almacenamiento */ }
  paintThemeBtn();
});
systemDark.addEventListener('change', paintThemeBtn);
paintThemeBtn();
lastRoute = parseHash().route;
render();
