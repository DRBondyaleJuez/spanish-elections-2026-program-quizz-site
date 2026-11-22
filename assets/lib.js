// Utilidades compartidas: carga de datos, hash/filtros, enlaces a PDF, glosario.
const cache = new Map();

export async function loadJSON(path, fallback) {
  if (cache.has(path)) return cache.get(path);
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    cache.set(path, data);
    return data;
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw new Error(`No se pudo cargar ${path}`);
  }
}

let base;
export async function loadBase() {
  if (base) return base;
  const [parties, topics, glossary, coalitions] = await Promise.all([
    loadJSON('data/parties.json'),
    loadJSON('data/topics.json'),
    loadJSON('data/glossary.json', []),
    loadJSON('data/coalitions.json', []),
  ]);
  // Las siglas viven en data/coalitions.json y sustituyen a `short` en toda la web.
  const coal = Object.fromEntries(coalitions.map(c => [c.id, c]));
  for (const p of parties) {
    p.coalition = coal[p.id] || null;
    if (p.coalition) p.short = p.coalition.siglas;
  }
  base = {
    parties, topics, glossary, coalitions: coal,
    party: Object.fromEntries(parties.map(p => [p.id, p])),
    topic: Object.fromEntries(topics.map(t => [t.id, t])),
    docs: Object.fromEntries(parties.map(p => [p.id, p.file])),
  };
  base.docs.mesa = 'sources/MMM_G2026_castellano_para_web.pdf';
  return base;
}

// ---- Hash: #/ruta?p=a,b&t=x ----
export function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, qs = ''] = h.split('?');
  const params = new URLSearchParams(qs);
  const list = k => (params.get(k) || '').split(',').filter(Boolean);
  return { route: route || 'inicio', params, list };
}

export function setParams(changes) {
  const { route, params } = parseHash();
  for (const [k, v] of Object.entries(changes)) {
    const val = Array.isArray(v) ? v.join(',') : v;
    if (val) params.set(k, val); else params.delete(k);
  }
  const qs = params.toString().replace(/%2C/g, ',');
  location.hash = `#/${route}${qs ? '?' + qs : ''}`;
}

// ---- HTML ----
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function pdfLink(src, label) {
  if (!src || !base) return '';
  const file = base.docs[src.doc];
  const text = label || `pág. ${src.page}`;
  return `<a class="src" href="${esc(file)}#page=${src.page}" target="_blank" rel="noopener" title="Abrir el PDF en esta página">📄 ${esc(text)}</a>`;
}

// Selector de chips (multi). items: [{id,label,color?}]
export function chips(name, items, selected, { single = false } = {}) {
  return `<div class="chips" data-chips="${name}" ${single ? 'data-single' : ''}>` +
    items.map(i => `<button type="button" class="chip${selected.includes(i.id) ? ' on' : ''}" data-id="${esc(i.id)}"
      ${i.color ? `style="--c:${i.color}"` : ''} aria-pressed="${selected.includes(i.id)}">${esc(i.label)}</button>`).join('') +
    `</div>`;
}

export function bindChips(root, name, current, onChange) {
  const box = root.querySelector(`[data-chips="${name}"]`);
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const id = b.dataset.id;
    let next;
    if (box.hasAttribute('data-single')) next = [id];
    else next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    onChange(next);
  });
}

// ---- Glosario: subraya términos y muestra su explicación al tocarlos ----
let termRe = null;
let termMap = {};
export function glossaryText(text) {
  const html = esc(text);
  if (!base?.glossary?.length) return html;
  if (!termRe) {
    termMap = Object.fromEntries(base.glossary.map(g => [g.term.toLowerCase(), g]));
    const terms = base.glossary.map(g => g.term).sort((a, b) => b.length - a.length)
      .map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    termRe = new RegExp(`(^|[^\\p{L}\\p{N}])(${terms.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  }
  return html.replace(termRe, (m, pre, t) => `${pre}<button type="button" class="term" data-term="${esc(t.toLowerCase())}">${t}</button>`);
}

export function initGlossaryPopover() {
  const pop = document.createElement('div');
  pop.className = 'popover';
  pop.hidden = true;
  document.body.appendChild(pop);
  document.addEventListener('click', e => {
    const b = e.target.closest('.term');
    if (b) {
      const g = termMap[b.dataset.term] || termMap[b.textContent.toLowerCase()];
      if (!g) return;
      pop.innerHTML = `<strong>${esc(g.term)}</strong><p>${esc(g.definition)}</p><button type="button" class="close">Entendido</button>`;
      pop.hidden = false;
      e.stopPropagation();
      return;
    }
    if (!pop.hidden && (e.target.closest('.close') || !e.target.closest('.popover'))) pop.hidden = true;
  });
}

// Aviso para invitar siempre a consultar la fuente original.
export function reviewNote(extra = '') {
  return `<div class="review">🔎 <b>Comprueba siempre el documento original.</b> Esto es un resumen hecho para estudiar y puede simplificar o contener errores.
    Cada dato lleva un enlace 📄 a la página exacta del programa oficial.${extra ? ' ' + extra : ''}</div>`;
}

export const STANCE = {
  2: { label: 'Muy a favor', cls: 's2' },
  1: { label: 'A favor', cls: 's1' },
  0: { label: 'Neutral / con matices', cls: 's0' },
  '-1': { label: 'En contra', cls: 'sm1' },
  '-2': { label: 'Muy en contra', cls: 'sm2' },
  null: { label: 'No lo menciona', cls: 'sn' },
};

// ---- Leyenda de siglas (panel desplegable accesible desde la cabecera) ----
export function openLegend() {
  let box = document.getElementById('legend-panel');
  if (!box) {
    box = document.createElement('div');
    box.id = 'legend-panel';
    box.className = 'legend-panel';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Leyenda de siglas');
    box.hidden = true;
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || e.target.closest('a')) box.hidden = true;
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') box.hidden = true; });
    document.addEventListener('click', e => {
      if (!box.hidden && !e.target.closest('#legend-panel') && !e.target.closest('#legend-btn')) box.hidden = true;
    });
  }
  if (!box.hidden) { box.hidden = true; return; }
  const B = base;
  box.innerHTML = `<div class="legend-head"><b>🔤 Siglas de los partidos</b><button type="button" class="close" data-close>Cerrar</button></div>
    <p class="small muted">Cada sigla representa a <b>todas</b> las formaciones de la candidatura. Toca una para ver su ficha.</p>
    <ul class="legend-list">${B.parties.map(p => {
      const c = p.coalition;
      const miembros = (c?.tipo === 'coalición' && c.miembros?.length)
        ? 'Formada por: ' + c.miembros.map(m => esc(m.nombre + (m.siglas ? ` (${m.siglas})` : ''))).join(' + ')
        : '';
      return `<li><a href="#/partidos?p=${esc(p.id)}"><span class="dot" style="--c:${p.color}"></span><b>${esc(p.short)}</b></a>
        <span class="small"> — ${esc(c?.nombre || p.name)}</span>
        ${miembros ? `<div class="small muted">${miembros}</div>` : ''}
        ${c?.confirmar ? `<div class="small muted">⚠️ El programa no nombra las formaciones que la integran.</div>` : ''}</li>`;
    }).join('')}</ul>`;
  box.hidden = false;
}
