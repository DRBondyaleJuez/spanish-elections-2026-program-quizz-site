// Router mínimo por hash. Cada página se irá implementando según ROADMAP.md.
const app = document.getElementById('app');

const pages = {
  resumenes: { title: 'Resúmenes por partido y tema', phase: 2 },
  comparar: { title: 'Comparar partidos', phase: 3 },
  test: { title: 'Test de programas', phase: 4 },
  mesa: { title: 'La mesa electoral paso a paso', phase: 5 },
  'test-mesa': { title: 'Test de la mesa electoral', phase: 5 },
};

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`No se pudo cargar ${path}`);
  return r.json();
}

async function render() {
  const route = (location.hash.replace(/^#\//, '').split('?')[0]) || 'resumenes';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#/${route}`));
  const page = pages[route] || pages.resumenes;
  let parties = [];
  try { parties = await loadJSON('data/parties.json'); } catch (e) { /* aún no existe */ }
  app.innerHTML = `
    <div class="card">
      <h2>${page.title}</h2>
      <p class="muted">En construcción (fase ${page.phase} del roadmap).</p>
      <p>Partidos cargados: ${parties.length ? parties.map(p => p.short).join(', ') : '—'}</p>
    </div>`;
}

window.addEventListener('hashchange', render);
render();
