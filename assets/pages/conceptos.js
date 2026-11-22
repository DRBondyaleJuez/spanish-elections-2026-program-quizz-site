// Buscar por concepto: dónde aparece un término en cada programa (páginas, fragmentos) y qué propone cada partido.
import { loadBase, loadJSON, parseHash, setParams, esc, pdfLink, chips, bindChips, glossaryText, STANCE, reviewNote } from '../lib.js';

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function dist(a, b) { // distancia de edición (para sugerir conceptos parecidos)
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

export async function render(app) {
  const B = await loadBase();
  const idx = await loadJSON('data/concepts/index.json', []);
  const byId = Object.fromEntries(idx.map(x => [x.id, x]));
  const { list, params } = parseHash();
  const sel = list('p').length ? list('p') : B.parties.map(p => p.id);
  const cid = params.get('c');
  const C = byId[cid];

  const matchList = q => {
    const n = norm(q);
    if (!n) return idx.slice().sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return idx.filter(x => norm(x.label).includes(n) || norm(x.id).includes(n.replace(/\s+/g, '-')));
  };
  const suggest = q => {
    const n = norm(q);
    return idx.map(x => ({ x, d: Math.min(...norm(x.label).split(/[ /()]+/).filter(Boolean).map(w => dist(n, w))) }))
      .sort((a, b) => a.d - b.d).slice(0, 5).map(o => o.x);
  };

  app.innerHTML = `
    <h2>Buscar por concepto</h2>
    <p class="muted">Elige partidos y un concepto (por ejemplo <i>alquiler</i>, <i>OTAN</i> o <i>nuclear</i>) y verás en qué páginas de cada programa aparece, un fragmento del texto y lo que propone cada partido. Si prefieres verlo por temas, ve a <a href="#/resumenes">Resúmenes</a>.</p>
    ${reviewNote('Que una palabra aparezca no significa que el partido esté a favor: lee el fragmento y la página.')}
    <div class="filters">
      <div class="flabel">Partidos <button class="link" data-all>todos</button></div>
      ${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), sel)}
      <div class="flabel">Concepto (${idx.length} disponibles)</div>
      <div class="combo">
        <input type="search" id="cq" class="search" placeholder="Escribe para buscar un concepto…" autocomplete="off"
          aria-autocomplete="list" aria-controls="clist" value="${esc(C ? C.label : '')}">
        <div class="combo-list" id="clist" role="listbox" hidden></div>
      </div>
      <p class="small" id="cmsg"></p>
    </div>
    <div id="cres">${C ? '<div class="card muted">Cargando…</div>' : '<div class="card muted">Elige un concepto de la lista para ver los resultados.</div>'}</div>`;

  const input = app.querySelector('#cq'), box = app.querySelector('#clist'), msg = app.querySelector('#cmsg');
  const pick = id => setParams({ c: id });
  const total = x => sel.reduce((t, p) => t + (x.counts[p] || 0), 0);
  const showList = () => {
    const items = matchList(input.value);
    box.innerHTML = items.slice(0, 60).map(x => `<button type="button" role="option" data-id="${esc(x.id)}">${esc(x.label)} <small>${total(x)} menciones</small></button>`).join('');
    box.hidden = !items.length;
    msg.innerHTML = items.length ? '' : notInList(input.value);
    bindSuggest();
  };
  const notInList = q => `🔎 «${esc(q)}» no está en la lista. Esta búsqueda funciona solo con los <b>${idx.length} conceptos de la lista</b> (para que los resultados sean fiables). ¿Querías decir…? ` +
    suggest(q).map(x => `<button type="button" class="chip sug" data-id="${esc(x.id)}">${esc(x.label)}</button>`).join(' ');
  const bindSuggest = () => msg.querySelectorAll('.sug').forEach(b => b.addEventListener('click', () => pick(b.dataset.id)));

  input.addEventListener('focus', showList);
  input.addEventListener('input', showList);
  input.addEventListener('keydown', e => {
    const opts = [...box.querySelectorAll('button')];
    if (e.key === 'ArrowDown' && opts.length) { e.preventDefault(); opts[0].focus(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const n = norm(input.value), exact = idx.find(x => norm(x.label) === n), m = matchList(input.value);
      if (exact) pick(exact.id); else if (m.length === 1) pick(m[0].id);
      else if (!m.length) { box.hidden = true; msg.innerHTML = notInList(input.value); bindSuggest(); }
    }
    if (e.key === 'Escape') box.hidden = true;
  });
  box.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b.dataset.id); });
  box.addEventListener('keydown', e => {
    const opts = [...box.querySelectorAll('button')], i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? input : opts[i - 1]).focus(); }
    if (e.key === 'Escape') { box.hidden = true; input.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.combo')) box.hidden = true; }, { once: false });
  bindChips(app, 'p', sel, v => setParams({ p: v }));
  app.querySelector('[data-all]').addEventListener('click', () => setParams({ p: [] }));

  if (!C) return;
  const D = await loadJSON(`data/concepts/t/${C.id}.json`, { parties: {} });
  const hit = sel.filter(p => D.parties[p]).sort((a, b) => D.parties[b].n - D.parties[a].n);
  const miss = sel.filter(p => !D.parties[p]);
  const card = pid => {
    const P = B.party[pid], x = D.parties[pid];
    return `<div class="card">
      <h3><span class="dot" style="--c:${P.color}"></span>${esc(P.short)} <span class="small muted">· ${x.n} ${x.n === 1 ? 'mención' : 'menciones'} en ${x.pages.length} página${x.pages.length === 1 ? '' : 's'}</span></h3>
      <div class="pages">Páginas: ${x.pages.map(([pg, c]) => pdfLink({ doc: pid, page: pg }, `${pg}${c > 1 ? ` ×${c}` : ''}`)).join(' ')}</div>
      ${x.snippets.map(s => `<blockquote class="snip"><span class="small muted">pág. ${s.page}:</span> ${esc(s.pre)}<mark>${esc(s.hit)}</mark>${esc(s.post)}</blockquote>`).join('')}
      ${x.points.length ? `<h4>📝 Lo que propone (resumen)</h4><ul>${x.points.map(p => `<li>${glossaryText(p.text)} ${pdfLink({ doc: pid, page: p.page })}</li>`).join('')}</ul>` : ''}
      ${x.stances.length ? `<h4>⚖️ Su postura en el comparador</h4><ul>${x.stances.map(s => `<li>${glossaryText(s.statement)} <span class="stance ${STANCE[s.v].cls}">${STANCE[s.v].label}</span> ${pdfLink({ doc: pid, page: s.page })}${s.note ? `<div class="small muted">${esc(s.note)}</div>` : ''}</li>`).join('')}</ul>` : ''}
      ${!x.points.length && !x.stances.length ? '<p class="small muted">Aparece en el programa, pero no tenemos una propuesta resumida sobre esto: lee las páginas.</p>' : ''}
    </div>`;
  };
  app.querySelector('#cres').innerHTML = `
    <h3>«${esc(C.label)}» en los programas</h3>
    ${hit.map(card).join('') || ''}
    ${miss.length ? `<div class="card nm"><b>No lo mencionan:</b> ${miss.map(p => esc(B.party[p].short)).join(', ')}
      <div class="small muted">(Puede que lo traten con otras palabras: prueba un concepto relacionado.)</div></div>` : ''}`;
}
