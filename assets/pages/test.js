import { loadBase, loadJSON, parseHash, setParams, esc, chips, bindChips } from '../lib.js';
import { runQuiz, failedIds } from '../quiz.js';

export async function render(app) {
  const B = await loadBase();
  const { list, params } = parseHash();
  const sel = list('p').length ? list('p') : B.parties.map(p => p.id);
  const tsel = list('t');
  const count = +(params.get('n') || 20);
  const onlyFailed = params.get('f') === '1';

  const all = (await Promise.all(B.parties.map(p => loadJSON(`data/questions/${p.id}.json`, [])))).flat();
  const failed = new Set(failedIds());
  // Una pregunta entra si es del programa de un partido elegido, o si un partido elegido aparece como opción en "¿qué partido…?"
  const pool = all.filter(q =>
    (sel.includes(q.doc) || (q.type === 'which_party' && q.options.some(o => sel.includes(o)))) &&
    (!tsel.length || tsel.includes(q.topic)) &&
    (!onlyFailed || failed.has(q.id)));

  app.innerHTML = `
    <h2>Test de los programas</h2>
    <p class="muted">Elige partidos y temas, responde y al corregir verás la explicación y la página del programa donde comprobarlo.</p>
    <div class="filters">
      <div class="flabel">Partidos <button class="link" data-all="p">todos</button></div>
      ${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), sel)}
      <div class="flabel">Temas <button class="link" data-all="t">todos</button></div>
      ${chips('t', B.topics.map(t => ({ id: t.id, label: `${t.icon} ${t.name.split(',')[0]}` })), tsel)}
      <div class="flabel">Número de preguntas</div>
      ${chips('n', [10, 20, 30].map(n => ({ id: String(n), label: String(n) })), [String(count)], { single: true })}
      <div class="flabel">Modo</div>
      ${chips('f', [{ id: '0', label: 'Todas' }, { id: '1', label: `Solo mis fallos (${failed.size})` }], [onlyFailed ? '1' : '0'], { single: true })}
      <p class="small"><b>${pool.length}</b> preguntas disponibles con estos filtros${pool.length < count ? ` (el test tendrá ${pool.length})` : ''}.</p>
      <button type="button" class="btn primary" id="start" ${pool.length ? '' : 'disabled'}>Empezar test</button>
    </div>
    <div id="quiz"></div>`;

  bindChips(app, 'p', sel, v => setParams({ p: v }));
  bindChips(app, 't', tsel, v => setParams({ t: v }));
  bindChips(app, 'n', [String(count)], v => setParams({ n: v[0] === '20' ? '' : v[0] }));
  bindChips(app, 'f', [onlyFailed ? '1' : '0'], v => setParams({ f: v[0] === '1' ? '1' : '' }));
  app.querySelectorAll('[data-all]').forEach(b => b.addEventListener('click', () => setParams({ [b.dataset.all]: [] })));

  app.querySelector('#start').addEventListener('click', () => {
    app.querySelector('.filters').hidden = true;
    runQuiz(app.querySelector('#quiz'), pool, {
      count,
      label: q => `<span class="dot" style="--c:${B.party[q.doc]?.color}"></span>${esc(B.topic[q.topic]?.name.split(',')[0] || '')}`,
      onRestart: act => {
        if (act === 'failed') setParams({ f: '1' });
        else render(app);
        scrollTo(0, 0);
      },
    });
    scrollTo(0, 0);
  });
}
