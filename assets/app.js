// Router por hash. Cada página es un módulo en assets/pages/ con export render(app).
import { parseHash, initGlossaryPopover, esc, loadBase, openLegend, setGlossaryScope } from './lib.js';

const app = document.getElementById('app');

const pages = {
  inicio: () => ({ render: renderInicio }),
  partidos: () => import('./pages/partidos.js'),
  resumenes: () => import('./pages/resumenes.js'),
  conceptos: () => import('./pages/conceptos.js'),
  comparar: () => import('./pages/comparar.js'),
  anexo: () => import('./pages/anexo.js'),
  test: () => import('./pages/test.js'),
  afinidad: () => import('./pages/afinidad.js'),
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
    <h3 class="home-sec">📚 Programas de los partidos</h3>
    <div class="grid">
      <a class="card tile" href="#/partidos">🏛️<b>Partidos</b><span>Quién es quién: siglas, coaliciones y lo esencial.</span></a>
      <a class="card tile" href="#/resumenes">📚<b>Resúmenes</b><span>Qué propone cada partido, tema por tema.</span></a>
      <a class="card tile" href="#/comparar">⚖️<b>Comparar</b><span>% de acuerdo y qué les separa.</span></a>
      <a class="card tile" href="#/test">✅<b>Test de conocimiento</b><span>¿Cuánto sabes de los programas? 20 preguntas.</span></a>
      <a class="card tile" href="#/afinidad">🧭<b>¿Con quién coincido?</b><span>Di qué opinas y mira qué partidos piensan parecido.</span></a>
    </div>
    <h3 class="home-sec mesa">🗳️ Si te toca estar en una mesa</h3>
    <div class="grid">
      <a class="card tile tile-mesa" href="#/mesa">📋<b>Resumen de la mesa</b><span>Qué hacer en cada momento del día.</span></a>
      <a class="card tile tile-mesa" href="#/test-mesa">📝<b>Test de la mesa</b><span>100 preguntas prácticas del manual.</span></a>
    </div>
    <p class="muted small">Resúmenes hechos a partir de los programas oficiales de cada partido, que puedes consultar en la carpeta de fuentes de la web.</p>`;
}

async function render() {
  const { route } = parseHash();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#/${route}`));
  document.querySelectorAll('#nav .dd').forEach(d => d.classList.toggle('active', d.dataset.routes.split(' ').includes(route)));
  const mesa = route === 'mesa' || route === 'test-mesa';
  document.body.classList.toggle('mesa-mode', mesa);
  document.getElementById('section-tag').hidden = !mesa;
  setGlossaryScope(mesa ? 'mesa' : 'programas');
  closeMenus();
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

// ---- Menús desplegables de la cabecera (se abren como panel fijo para no quedar recortados) ----
function closeMenus(except) {
  document.querySelectorAll('#nav .dd-btn').forEach(b => {
    if (b === except) return;
    b.setAttribute('aria-expanded', 'false');
    document.getElementById(b.getAttribute('aria-controls')).hidden = true;
  });
}
function openMenu(btn) {
  const menu = document.getElementById(btn.getAttribute('aria-controls'));
  closeMenus(btn);
  menu.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(), w = menu.offsetWidth;
  menu.style.top = `${Math.round(r.bottom + 6)}px`;
  menu.style.left = `${Math.round(Math.max(8, Math.min(r.left, innerWidth - w - 8)))}px`;
  return menu;
}
document.querySelectorAll('#nav .dd-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (btn.getAttribute('aria-expanded') === 'true') closeMenus(); else openMenu(btn);
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(btn).querySelector('a')?.focus(); }
  });
});
document.querySelectorAll('#nav .dd-menu').forEach(menu => {
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('a')], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  menu.addEventListener('click', () => closeMenus());
});
document.addEventListener('click', e => { if (!e.target.closest('.dd-menu')) closeMenus(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('#nav .dd-btn[aria-expanded="true"]');
  if (open) { closeMenus(); open.focus(); }
});
addEventListener('resize', () => closeMenus());
document.getElementById('nav').addEventListener('scroll', () => closeMenus());
document.getElementById('legend-btn').addEventListener('click', async () => { await loadBase(); openLegend(); });

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
