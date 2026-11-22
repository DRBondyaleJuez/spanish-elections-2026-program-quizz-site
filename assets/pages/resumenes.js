import { loadBase, loadJSON, parseHash, setParams, esc, pdfLink, chips, bindChips, glossaryText, reviewNote } from '../lib.js';

export async function render(app) {
  const B = await loadBase();
  const { list, params } = parseHash();
  let sel = list('p');
  if (!sel.length) sel = [B.parties[0].id];
  const tsel = list('t');
  const view = params.get('v') || (sel.length > 1 ? 'tema' : 'partido');
  const topics = tsel.length ? B.topics.filter(t => tsel.includes(t.id)) : B.topics;

  const sums = Object.fromEntries(await Promise.all(sel.map(async id =>
    [id, await loadJSON(`data/summaries/${id}.json`, null)])));

  const point = p => `<li>${glossaryText(p.text)} ${pdfLink(p.source)}</li>`;
  const topicBlock = (pid, t, withParty) => {
    const s = sums[pid]?.topics?.[t.id];
    const P = B.party[pid];
    const head = withParty ? `<span class="dot" style="--c:${P.color}"></span>${esc(P.short)}` : `${t.icon} ${esc(t.name)}`;
    if (!s) return `<details class="card"><summary>${head} <span class="muted">· pendiente</span></summary></details>`;
    if (s.notMentioned) return `<div class="card nm">${head} <span class="muted">· No lo menciona en su programa</span></div>`;
    return `<details class="card" open><summary>${head}</summary>
      <p class="lead">${glossaryText(s.summary || '')}</p><ul>${s.points.map(point).join('')}</ul></details>`;
  };

  const distinct = pid => {
    const d = (sums[pid]?.distinctive || []).filter(x => !tsel.length || tsel.includes(x.topic));
    if (!d.length) return '';
    return `<div class="card distinct"><h3>⭐ Lo que distingue a ${esc(B.party[pid].short)}</h3><ul>` +
      d.map(x => `<li><strong>${B.topic[x.topic]?.icon || ''} ${glossaryText(x.text)}</strong><br><span class="muted">${glossaryText(x.why)}</span> ${pdfLink(x.source)}</li>`).join('') +
      `</ul></div>`;
  };

  let body = '';
  if (view === 'partido') {
    for (const pid of sel) {
      const P = B.party[pid];
      const s = sums[pid];
      body += `<section class="party-sec"><h2 style="--c:${P.color}" class="ph">${esc(P.name)}</h2>`;
      if (!s) { body += `<p class="muted card">Resumen aún no disponible.</p></section>`; continue; }
      body += `<p class="card">${glossaryText(s.overview)}<br>${pdfLink({ doc: pid, page: 1 }, 'Programa completo')}</p>`;
      body += distinct(pid);
      body += topics.map(t => topicBlock(pid, t, false)).join('');
      body += `</section>`;
    }
  } else {
    for (const t of topics) {
      body += `<section><h2 class="th">${t.icon} ${esc(t.name)}</h2>${sel.map(pid => topicBlock(pid, t, true)).join('')}</section>`;
    }
    body += sel.map(distinct).join('');
  }

  app.innerHTML = `
    <h2>Resúmenes de los programas</h2>
    <p class="muted">Elige uno o varios partidos y, si quieres, los temas. Toca las palabras <span class="term demo">subrayadas</span> para ver qué significan y 📄 para abrir el programa en esa página.</p>
    ${reviewNote()}
    <div class="filters">
      <div class="flabel">Partidos <button class="link" data-all="p">todos</button></div>
      ${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), sel)}
      <div class="flabel">Temas <button class="link" data-all="t">todos</button></div>
      ${chips('t', B.topics.map(t => ({ id: t.id, label: `${t.icon} ${t.name.split(',')[0]}` })), tsel)}
      <div class="flabel">Agrupar por</div>
      ${chips('v', [{ id: 'tema', label: 'Tema' }, { id: 'partido', label: 'Partido' }], [view], { single: true })}
    </div>
    ${body}`;

  bindChips(app, 'p', sel, v => setParams({ p: v.length ? v : [B.parties[0].id] }));
  bindChips(app, 't', tsel, v => setParams({ t: v }));
  bindChips(app, 'v', [view], v => setParams({ v: v[0] }));
  app.querySelectorAll('[data-all]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.all;
    setParams({ [k]: k === 'p' ? B.parties.map(p => p.id) : [] });
  }));
}
