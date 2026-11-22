// Anexo: justificación de los % de acuerdo (metodología, cálculo paso a paso y ejemplos con página).
import { loadBase, loadJSON, parseHash, setParams, esc, pdfLink, chips, bindChips, glossaryText, STANCE, reviewNote } from '../lib.js';
import { agreement } from './comparar.js';

const sv = v => `<span class="stance ${STANCE[v].cls}">${v > 0 ? '+' : ''}${v}</span>`;

export async function render(app) {
  const B = await loadBase();
  const positions = await loadJSON('data/positions.json', []);
  const { list } = parseHash();
  let sel = list('p');
  if (sel.length < 2) sel = B.parties.map(p => p.id);
  const open = list('par').join('|');

  const pairs = [];
  for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) {
    const a = sel[i], b = sel[j];
    pairs.push({ a, b, ...agreement(positions, a, b) });
  }
  pairs.sort((x, y) => (y.pct ?? -1) - (x.pct ?? -1));

  const detail = ({ a, b, pct, n }) => {
    const A = B.party[a], Bp = B.party[b];
    const rows = positions.filter(s => s.stances[a] && s.stances[b])
      .map(s => ({ s, x: s.stances[a], y: s.stances[b], d: Math.abs(s.stances[a].v - s.stances[b].v) }));
    const sum = rows.reduce((t, r) => t + r.d, 0);
    const far = [...rows].sort((p, q) => q.d - p.d).slice(0, 3).filter(r => r.d >= 2);
    const near = rows.filter(r => r.d === 0 && r.x.v !== 0).slice(0, 3);
    const ex = r => `<li><strong>${glossaryText(r.s.statement)}</strong> <span class="muted small">(${esc(B.topic[r.s.topic].name.split(',')[0])})</span><br>
      ${esc(A.short)} ${sv(r.x.v)}: ${esc(r.x.note || STANCE[r.x.v].label)} ${pdfLink({ doc: a, page: r.x.page })}<br>
      ${esc(Bp.short)} ${sv(r.y.v)}: ${esc(r.y.note || STANCE[r.y.v].label)} ${pdfLink({ doc: b, page: r.y.page })}</li>`;
    const byTopic = B.topics.map(t => ({ t, ...agreement(positions.filter(s => s.topic === t.id), a, b) })).filter(x => x.n);
    return `
      <p>Afirmaciones que tratan los dos: <b>n = ${n}</b>. Suma de diferencias = ${sum}. Diferencia media = ${n ? (sum / n).toFixed(2).replace('.', ',') : '—'} (sobre un máximo de 4).<br>
      <b>% de acuerdo = 100 × (1 − ${n ? (sum / n).toFixed(2).replace('.', ',') : '—'} / 4) = ${pct ?? '—'} %</b></p>
      <p class="small">Por tema: ${byTopic.map(x => `${x.t.icon} ${x.pct}% <span class="muted">(n=${x.n})</span>`).join(' · ')}</p>
      <h4>🔥 Mayores desacuerdos</h4><ul class="cmp">${far.map(ex).join('') || '<li class="muted">No hay desacuerdos grandes (diferencia ≥ 2).</li>'}</ul>
      <h4>🤝 Acuerdos claros</h4><ul class="cmp">${near.map(ex).join('') || '<li class="muted">No hay coincidencias exactas con postura definida.</li>'}</ul>
      <details><summary class="small">Ver el cálculo completo (${n} afirmaciones)</summary>
        <div class="scroll-x"><table class="calc"><tr><th>Afirmación</th><th>${esc(A.short)}</th><th>${esc(Bp.short)}</th><th>|dif.|</th></tr>
        ${rows.map(r => `<tr><td>${esc(r.s.statement)}</td><td>${sv(r.x.v)} ${pdfLink({ doc: a, page: r.x.page }, 'p.' + r.x.page)}</td><td>${sv(r.y.v)} ${pdfLink({ doc: b, page: r.y.page }, 'p.' + r.y.page)}</td><td>${r.d}</td></tr>`).join('')}
        </table></div></details>`;
  };

  app.innerHTML = `
    <h2>Anexo: cómo se calcula el % de acuerdo</h2>
    ${reviewNote()}
    <div class="card">
      <h3>1. Qué comparamos</h3>
      <p>Para cada tema hemos redactado entre 4 y 7 <b>afirmaciones concretas</b> (${positions.length} en total), por ejemplo <em>"${esc(positions[0]?.statement || '')}"</em>.
      Para cada partido se ha anotado su postura <b>solo según lo que dice su programa</b>, con la página donde se apoya:</p>
      <p>${[2, 1, 0, -1, -2].map(v => `${sv(v)} ${STANCE[v].label}`).join(' &nbsp; ')} &nbsp; <span class="stance sn">—</span> No lo menciona (no cuenta)</p>
      <h3>2. La fórmula</h3>
      <p>Entre dos partidos A y B solo se usan las afirmaciones en las que <b>los dos</b> tienen postura. En cada una se mira la distancia |A − B| (de 0, igual postura, a 4, posturas opuestas: +2 frente a −2). Después:</p>
      <p class="formula">% de acuerdo = 100 × (1 − media de las distancias / 4)</p>
      <p>Ejemplo: si en 3 afirmaciones las distancias son 0, 1 y 4, la media es 5/3 ≈ 1,67 → 100 × (1 − 1,67/4) ≈ <b>58 %</b>.</p>
      <h3>3. Límites (léelo antes de sacar conclusiones)</h3>
      <ul>
        <li><b>n importa:</b> un % calculado con pocas afirmaciones (n &lt; 10 en total, n &lt; 3 en un tema) es poco fiable. Los programas cortos (CC, PNV, SALF) tratan menos afirmaciones.</li>
        <li>Las afirmaciones y posturas las ha preparado este proyecto (con ayuda de IA y revisión) a partir de los textos; <b>pueden contener errores o matices perdidos</b>. Por eso cada postura enlaza a su página.</li>
        <li>Un programa no es todo lo que un partido piensa o hará; aquí solo se mide lo que está escrito en él.</li>
        <li>El resultado depende de qué afirmaciones se han elegido: otras afirmaciones darían otros porcentajes.</li>
      </ul>
    </div>
    <div class="filters">
      <div class="flabel">Partidos <button class="link" data-all>todos</button></div>
      ${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), sel)}
    </div>
    <h3>4. Todas las parejas, de más a menos acuerdo</h3>
    <p class="muted small">Toca una pareja para ver el cálculo, los mayores desacuerdos y acuerdos, con su página en cada programa.</p>
    ${pairs.map(p => `<details class="card pair" data-k="${p.a}|${p.b}" ${open === `${p.a}|${p.b}` || open === `${p.b}|${p.a}` ? 'open' : ''}>
      <summary><span class="dot" style="--c:${B.party[p.a].color}"></span>${esc(B.party[p.a].short)} – <span class="dot" style="--c:${B.party[p.b].color}"></span>${esc(B.party[p.b].short)}
      <b class="pct">${p.pct ?? '—'}%</b> <span class="muted small">n=${p.n}${p.n < 10 ? ' · poco fiable' : ''}</span></summary>
      <div class="pair-body"></div></details>`).join('')}`;

  // El detalle se genera al abrir (más rápido en móvil)
  app.querySelectorAll('details.pair').forEach(d => {
    const fill = () => {
      const body = d.querySelector('.pair-body');
      if (body.innerHTML) return;
      const [a, b] = d.dataset.k.split('|');
      body.innerHTML = detail(pairs.find(p => p.a === a && p.b === b));
    };
    if (d.open) fill();
    d.addEventListener('toggle', () => d.open && fill());
  });
  app.querySelector('details.pair[open]')?.scrollIntoView({ block: 'start' });
  bindChips(app, 'p', sel, v => setParams({ p: v, par: '' }));
  app.querySelector('[data-all]').addEventListener('click', () => setParams({ p: B.parties.map(p => p.id) }));
}
