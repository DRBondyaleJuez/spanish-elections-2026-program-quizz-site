import { loadBase, loadJSON, parseHash, setParams, chips, bindChips, esc } from '../lib.js';
import { runQuiz, failedIds } from '../quiz.js';

export async function render(app) {
  await loadBase();
  const { list, params } = parseHash();
  const { sections } = await loadJSON('data/mesa/sections.json');
  const quizSecs = sections.filter(s => s.quiz);
  const secName = Object.fromEntries(sections.map(s => [s.id, s.name]));
  const ssel = list('s');
  const count = +(params.get('n') || 20);
  const onlyFailed = params.get('f') === '1';
  const all = await loadJSON('data/questions/mesa.json', []);
  const failed = new Set(failedIds());
  const pool = all.filter(q => (!ssel.length || ssel.includes(q.topic)) && (!onlyFailed || failed.has(q.id)));
  const failedHere = all.filter(q => failed.has(q.id)).length;

  app.innerHTML = `
    <h2>Test de la mesa electoral</h2>
    <p class="muted">Preguntas prácticas sobre el <a href="#/mesa">manual para miembros de mesa</a>. Al corregir verás la explicación y la página del manual.</p>
    <div class="filters">
      <div class="flabel">Apartados <button class="link" data-all>todos</button></div>
      ${chips('s', quizSecs.map(s => ({ id: s.id, label: s.name.replace(/^[^·]*·\s*/, '').split('(')[0].trim() })), ssel)}
      <div class="flabel">Número de preguntas</div>
      ${chips('n', [10, 20, 30].map(n => ({ id: String(n), label: String(n) })), [String(count)], { single: true })}
      <div class="flabel">Modo</div>
      ${chips('f', [{ id: '0', label: 'Todas' }, { id: '1', label: `Solo mis fallos (${failedHere})` }], [onlyFailed ? '1' : '0'], { single: true })}
      <p class="small"><b>${pool.length}</b> preguntas disponibles${pool.length && pool.length < count ? ` (el test tendrá ${pool.length})` : ''}.</p>
      <button type="button" class="btn primary" id="start" ${pool.length ? '' : 'disabled'}>Empezar test</button>
    </div>
    <div id="quiz"></div>`;

  bindChips(app, 's', ssel, v => setParams({ s: v }));
  bindChips(app, 'n', [String(count)], v => setParams({ n: v[0] === '20' ? '' : v[0] }));
  bindChips(app, 'f', [onlyFailed ? '1' : '0'], v => setParams({ f: v[0] === '1' ? '1' : '' }));
  app.querySelector('[data-all]').addEventListener('click', () => setParams({ s: [] }));

  app.querySelector('#start').addEventListener('click', () => {
    app.querySelector('.filters').hidden = true;
    runQuiz(app.querySelector('#quiz'), pool, {
      count,
      label: q => esc(secName[q.topic] || ''),
      onRestart: act => { if (act === 'failed') setParams({ f: '1' }); else render(app); scrollTo(0, 0); },
    });
    scrollTo(0, 0);
  });
}
