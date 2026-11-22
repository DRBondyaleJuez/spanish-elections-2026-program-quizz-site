import { loadBase, loadJSON, parseHash, setParams, esc, pdfLink, chips, bindChips, glossaryText, STANCE, reviewNote } from '../lib.js';

// % de acuerdo = 100 × (1 − media(|pA − pB|) / 4), solo con afirmaciones que tratan ambos.
export function agreement(statements, a, b) {
  let sum = 0, n = 0;
  for (const s of statements) {
    const x = s.stances?.[a]?.v, y = s.stances?.[b]?.v;
    if (x == null || y == null) continue;
    sum += Math.abs(x - y); n++;
  }
  return { pct: n ? Math.round(100 * (1 - sum / n / 4)) : null, n };
}

const color = pct => pct == null ? 'var(--card)' : `hsl(${Math.round(pct * 1.2)} 65% var(--heat-l))`;

export async function render(app) {
  const B = await loadBase();
  const positions = await loadJSON('data/positions.json', []);
  const { list } = parseHash();
  let sel = list('p');
  if (sel.length < 2) sel = ['psoe', 'pp', 'vox', 'podemos', 'frenteamplio'].filter(id => B.party[id]);
  const tsel = list('t');
  let pair = list('par');
  if (pair.length !== 2 || !pair.every(x => sel.includes(x))) pair = sel.slice(0, 2);
  const st = positions.filter(s => !tsel.length || tsel.includes(s.topic));

  const head = `
    <h2>Comparar partidos</h2>
    <p class="muted">Para cada tema hemos elegido varias afirmaciones concretas y anotado la postura de cada partido según su programa (de muy en contra a muy a favor). El % de acuerdo mide lo cerca que están sus posturas en las afirmaciones que tratan los dos; <em>n</em> es cuántas se han podido comparar (con n pequeño el % es poco fiable).
    <a href="#/anexo">¿Cómo se calcula? Ver el anexo con la justificación →</a></p>
    ${reviewNote('Las posturas son una interpretación del texto: lee la nota y la página de cada una.')}
    <div class="filters">
      <div class="flabel">Partidos (2 o más) <button class="link" data-all="p">todos</button></div>
      ${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), sel)}
      <div class="flabel">Temas <button class="link" data-all="t">todos</button></div>
      ${chips('t', B.topics.filter(t => t.id !== 'otros').map(t => ({ id: t.id, label: `${t.icon} ${t.name.split(',')[0]}` })), tsel)}
    </div>`;

  if (!positions.length) {
    app.innerHTML = head + `<div class="card muted">Los datos del comparador aún se están preparando.</div>`;
    return bind();
  }

  // Matriz
  let mat = `<div class="card"><h3>Nivel de acuerdo ${tsel.length ? 'en ' + tsel.map(t => B.topic[t].name.split(',')[0]).join(', ') : 'en todos los temas'}</h3>
    <p class="muted small">Toca una casilla para ver qué les une y qué les separa.</p><div class="scroll-x"><table class="heat"><tr><th></th>${sel.map(p => `<th>${esc(B.party[p].short)}</th>`).join('')}</tr>`;
  for (const a of sel) {
    mat += `<tr><th>${esc(B.party[a].short)}</th>`;
    for (const b of sel) {
      if (a === b) { mat += `<td class="self">—</td>`; continue; }
      const { pct, n } = agreement(st, a, b);
      const on = pair.includes(a) && pair.includes(b);
      mat += `<td class="${on ? 'on' : ''} ${n < 3 ? 'weak' : ''}" style="background:${color(pct)}" data-pair="${a},${b}">${pct == null ? '·' : pct + '%'}<small>n=${n}</small></td>`;
    }
    mat += `</tr>`;
  }
  mat += `</table></div></div>`;

  // Por tema, para la pareja seleccionada
  const [A, Bp] = pair;
  const PA = B.party[A], PB = B.party[Bp];
  const byTopic = B.topics.filter(t => !tsel.length || tsel.includes(t.id)).map(t => {
    const r = agreement(positions.filter(s => s.topic === t.id), A, Bp);
    return { t, ...r };
  }).filter(x => x.n);
  const diffs = st.map(s => {
    const x = s.stances?.[A], y = s.stances?.[Bp];
    if (x?.v == null || y?.v == null) return null;
    return { s, x, y, d: Math.abs(x.v - y.v) };
  }).filter(Boolean);
  const far = [...diffs].sort((p, q) => q.d - p.d).filter(z => z.d >= 2).slice(0, 6);
  const near = diffs.filter(z => z.d === 0 && z.x.v !== 0).slice(0, 6);
  const stanceTag = (P, v) => `<span class="stance ${STANCE[v.v].cls}">${esc(P.short)}: ${STANCE[v.v].label}</span>`;
  const row = z => `<li><strong>${glossaryText(z.s.statement)}</strong><br>${stanceTag(PA, z.x)} ${pdfLink({ doc: A, page: z.x.page })}
      ${stanceTag(PB, z.y)} ${pdfLink({ doc: Bp, page: z.y.page })}
      ${z.x.note || z.y.note ? `<div class="muted small">${esc(PA.short)}: ${esc(z.x.note || '—')}<br>${esc(PB.short)}: ${esc(z.y.note || '—')}</div>` : ''}</li>`;

  const pairBox = `<div class="card"><h3><span class="dot" style="--c:${PA.color}"></span>${esc(PA.short)} vs <span class="dot" style="--c:${PB.color}"></span>${esc(PB.short)}</h3>
    <div class="bars">${byTopic.map(x => `<div class="bar${x.n < 3 ? ' weak' : ''}"><span>${x.t.icon} ${esc(x.t.name.split(',')[0])}</span><div><i style="width:${x.pct}%;background:${color(x.pct)}"></i></div><b>${x.pct}%<small>n=${x.n}</small></b></div>`).join('') || '<p class="muted">No hay afirmaciones comparables.</p>'}</div>
    <h4>🔥 Lo que más les separa</h4><ul class="cmp">${far.map(row).join('') || '<li class="muted">No hay grandes diferencias en estas afirmaciones.</li>'}</ul>
    <h4>🤝 En lo que coinciden</h4><ul class="cmp">${near.map(row).join('') || '<li class="muted">No hay coincidencias claras.</li>'}</ul>
    <p><a href="#/anexo?par=${A},${Bp}">Ver el cálculo paso a paso de ${esc(PA.short)} – ${esc(PB.short)} →</a></p></div>`;

  // Tabla de afirmaciones
  const topicsShown = B.topics.filter(t => st.some(s => s.topic === t.id));
  const table = topicsShown.map(t => `<details class="card"><summary>${t.icon} ${esc(t.name)} · afirmaciones</summary>` +
    st.filter(s => s.topic === t.id).map(s => `<div class="stmt"><p><strong>${glossaryText(s.statement)}</strong></p><div class="stances">` +
      sel.map(pid => {
        const v = s.stances?.[pid] || { v: null };
        const S = STANCE[v.v ?? null];
        return `<div class="stance-row"><span class="stance ${S.cls}">${esc(B.party[pid].short)}</span> <span>${S.label}</span>
          ${v.v != null ? pdfLink({ doc: pid, page: v.page }) : ''}${v.note ? `<div class="muted small">${esc(v.note)}</div>` : ''}</div>`;
      }).join('') + `</div></div>`).join('') + `</details>`).join('');

  app.innerHTML = head + mat + pairBox + `<h3>Todas las afirmaciones</h3>` + table;
  app.querySelectorAll('[data-pair]').forEach(td => td.addEventListener('click', () => setParams({ par: td.dataset.pair.split(',') })));
  bind();

  function bind() {
    bindChips(app, 'p', sel, v => setParams({ p: v }));
    bindChips(app, 't', tsel, v => setParams({ t: v }));
    app.querySelectorAll('[data-all]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.all;
      setParams({ [k]: k === 'p' ? B.parties.map(p => p.id) : [] });
    }));
  }
}
