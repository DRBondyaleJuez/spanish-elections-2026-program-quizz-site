// Test de afinidad "¿Con quién coincido?": la persona opina sobre las afirmaciones de
// data/positions.json y se compara con la postura anotada de cada partido (misma fórmula que el Anexo).
import { loadBase, loadJSON, parseHash, esc, pdfLink, glossaryText, STANCE } from '../lib.js';

const KEY = 'affinity-answers-v1';
const BATCH = 20;
const SCALE = [
  { v: 2, label: 'Muy de acuerdo' },
  { v: 1, label: 'De acuerdo' },
  { v: 0, label: 'Neutral' },
  { v: -1, label: 'En desacuerdo' },
  { v: -2, label: 'Muy en desacuerdo' },
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* sin almacenamiento */ } };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const text = s => s.userText || s.statement;

// Afinidad entre las respuestas y un partido (solo afirmaciones respondidas en las que el partido tiene postura)
export function affinity(statements, answers, pid) {
  let wsum = 0, dsum = 0, n = 0;
  const rows = [];
  for (const s of statements) {
    const a = answers[s.id], p = s.stances?.[pid];
    if (!a || a.v == null || !p || p.v == null) continue;
    const w = a.imp ? 2 : 1, d = Math.abs(a.v - p.v);
    wsum += w; dsum += w * d; n++;
    rows.push({ s, a, p, d });
  }
  return { pct: n ? Math.round(100 * (1 - dsum / wsum / 4)) : null, n, rows };
}

export async function render(app) {
  const B = await loadBase();
  const S = await loadJSON('data/positions.json', []);
  const { params } = parseHash();
  let answers = load();
  const answered = () => S.filter(s => answers[s.id]);
  const opinions = () => S.filter(s => answers[s.id] && answers[s.id].v != null).length;

  // 20 preguntas no respondidas, repartidas por temas
  function nextBatch() {
    const byTopic = {};
    for (const s of shuffle(S.filter(s => !answers[s.id]))) (byTopic[s.topic] ||= []).push(s);
    const out = [], topics = shuffle(Object.keys(byTopic));
    while (out.length < BATCH && topics.some(t => byTopic[t].length)) {
      for (const t of topics) if (byTopic[t].length && out.length < BATCH) out.push(byTopic[t].shift());
    }
    return out;
  }

  function intro() {
    const done = answered().length, total = S.length;
    app.innerHTML = `
      <h2>¿Con quién coincido?</h2>
      <p class="muted">Test de <b>afinidad</b>: di si estás de acuerdo con propuestas concretas y te mostramos qué partidos han escrito en su programa algo parecido a lo que piensas. <b>No es un test de conocimiento</b> (ese es el <a href="#/test">Test de conocimiento</a>).</p>
      <div class="card">
        <div class="progress"><i style="width:${Math.round(100 * done / total)}%"></i></div>
        <p>Has respondido <b>${done} de ${total}</b> preguntas.
        ${done < total ? `Cada tanda tiene ${BATCH} preguntas nuevas; cuantas más respondas, más fiable será el resultado.` : '¡Las has respondido todas!'}</p>
        <div class="row">
          ${done < total ? `<button type="button" class="btn primary" id="go">${done ? `Responder ${Math.min(BATCH, total - done)} más` : `Empezar (${BATCH} preguntas)`}</button>` : ''}
          ${opinions() ? '<button type="button" class="btn" id="res">Ver mi resultado</button>' : ''}
        </div>
      </div>
      <details class="card"><summary>¿Cómo funciona?</summary>
        <ul class="small">
          <li>Cada pregunta es una de las afirmaciones del <a href="#/comparar">comparador</a>, con la postura de cada partido anotada a partir de su programa (con página).</li>
          <li>Tu % de afinidad con un partido = 100 × (1 − diferencia media / 4), contando solo las preguntas en las que el partido tiene postura. Es la misma fórmula del <a href="#/anexo">Anexo</a>. Lo que marques como "me importa mucho" cuenta el doble.</li>
          <li>"No lo sé" no cuenta. Si un partido no dice nada sobre un tema, no suma ni resta.</li>
          <li>Tus respuestas se guardan <b>solo en este dispositivo</b>; no se envían a ningún sitio.</li>
          <li>Es una orientación para leer los programas, no un consejo de voto.</li>
        </ul></details>
      <details class="card"><summary>Mis respuestas (borrar, exportar o importar)</summary>
        <div class="row">
          <button type="button" class="btn small-btn" id="exp" ${done ? '' : 'disabled'}>⬇️ Exportar</button>
          <label class="btn small-btn">⬆️ Importar<input type="file" id="imp" accept="application/json" hidden></label>
          <button type="button" class="btn small-btn" id="del" ${done ? '' : 'disabled'}>🗑️ Borrar todas</button>
        </div><p class="small muted">Exportar sirve para pasar tus respuestas a otro móvil u ordenador.</p></details>`;
    app.querySelector('#go')?.addEventListener('click', () => quiz(nextBatch()));
    app.querySelector('#res')?.addEventListener('click', results);
    app.querySelector('#del')?.addEventListener('click', () => {
      if (confirm('¿Borrar todas tus respuestas del test de afinidad?')) { answers = {}; save(answers); intro(); }
    });
    app.querySelector('#exp')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), answers }, null, 1)], { type: 'application/json' }));
      a.download = 'mis-respuestas-afinidad.json';
      document.body.appendChild(a); a.click(); a.remove();
    });
    app.querySelector('#imp')?.addEventListener('change', async e => {
      try {
        const data = JSON.parse(await e.target.files[0].text());
        answers = { ...answers, ...(data.answers || {}) };
        save(answers); intro();
      } catch { alert('No se pudo leer el archivo.'); }
    });
  }

  function quiz(batch) {
    let i = 0;
    const show = () => {
      if (i >= batch.length) return results();
      const s = batch[i], cur = answers[s.id] || {};
      const t = B.topic[s.topic];
      app.innerHTML = `
        <div class="aff-top"><button type="button" class="link" id="exit">✕ Salir</button>
          <span class="small muted">${i + 1} / ${batch.length} · ${answered().length} respondidas en total</span></div>
        <div class="progress"><i style="width:${Math.round(100 * i / batch.length)}%"></i></div>
        <div class="card aff-q">
          <div class="small muted">${t?.icon || ''} ${esc(t?.name.split(',')[0] || '')}</div>
          <p class="qtext">${glossaryText(text(s))}</p>
          <div class="aff-opts">${SCALE.map(o => `<button type="button" class="opt aff-opt${cur.v === o.v ? ' on' : ''}" data-v="${o.v}">${o.label}</button>`).join('')}
            <button type="button" class="opt aff-opt skip${cur.v === null ? ' on' : ''}" data-v="skip">No lo sé / prefiero no responder</button></div>
          <label class="aff-imp"><input type="checkbox" id="imp" ${cur.imp ? 'checked' : ''}> Esto me importa mucho (cuenta el doble)</label>
        </div>
        <div class="row">${i ? '<button type="button" class="btn" id="back">← Anterior</button>' : ''}
          <button type="button" class="btn" id="later">Ver resultado ahora</button></div>`;
      app.querySelectorAll('.aff-opt').forEach(b => b.addEventListener('click', () => {
        answers[s.id] = { v: b.dataset.v === 'skip' ? null : +b.dataset.v, imp: app.querySelector('#imp').checked, ts: Date.now() };
        save(answers);
        i++; show(); scrollTo(0, 0);
      }));
      app.querySelector('#imp').addEventListener('change', e => {
        if (answers[s.id]) { answers[s.id].imp = e.target.checked; save(answers); }
      });
      app.querySelector('#back')?.addEventListener('click', () => { i--; show(); });
      app.querySelector('#exit').addEventListener('click', intro);
      app.querySelector('#later').addEventListener('click', results);
    };
    show();
  }

  function results() {
    const ranking = B.parties.map(p => ({ P: p, ...affinity(S, answers, p.id) }))
      .filter(r => r.n).sort((a, b) => (b.n >= 5) - (a.n >= 5) || b.pct - a.pct);
    const nAns = opinions(), left = S.length - answered().length;
    const label = v => STANCE[v]?.label || '';
    const yours = v => SCALE.find(o => o.v === v)?.label || '';
    const row = r => `<li><b>${glossaryText(text(r.s))}</b><br>
      <span class="small">Tú: <b>${yours(r.a.v)}</b>${r.a.imp ? ' ⭐' : ''} · Partido: <span class="stance ${STANCE[r.p.v].cls}">${label(r.p.v)}</span> ${pdfLink({ doc: r.P, page: r.p.page })}</span>
      ${r.p.note ? `<div class="small muted">${esc(r.p.note)}</div>` : ''}</li>`;
    const detail = r => {
      const rows = r.rows.map(x => ({ ...x, P: r.P.id }));
      const agree = rows.filter(x => x.d <= 1 && x.a.v !== 0).sort((a, b) => a.d - b.d || (b.a.imp - a.a.imp)).slice(0, 3);
      const disagree = rows.filter(x => x.d >= 2).sort((a, b) => b.d - a.d || (b.a.imp - a.a.imp)).slice(0, 3);
      const byTopic = B.topics.map(t => ({ t, ...affinity(S.filter(s => s.topic === t.id), answers, r.P.id) })).filter(x => x.n);
      return `<div class="bars">${byTopic.map(x => `<div class="bar${x.n < 2 ? ' weak' : ''}"><span>${x.t.icon} ${esc(x.t.name.split(',')[0])}</span><div><i style="width:${x.pct}%;background:hsl(${Math.round(x.pct * 1.2)} 65% var(--heat-l))"></i></div><b>${x.pct}%<small>n=${x.n}</small></b></div>`).join('')}</div>
        <h4>🤝 Donde más coincides</h4><ul class="cmp">${agree.map(row).join('') || '<li class="muted">Aún no hay coincidencias claras.</li>'}</ul>
        <h4>⚡ Donde más discrepas</h4><ul class="cmp">${disagree.map(row).join('') || '<li class="muted">No hay grandes discrepancias en lo que has respondido.</li>'}</ul>`;
    };
    app.innerHTML = `
      <h2>Tu resultado de afinidad</h2>
      <p class="muted">Calculado con tus <b>${nAns}</b> respuestas con opinión${left ? ` (te quedan ${left} preguntas: <a href="#" id="more">responder ${Math.min(BATCH, left)} más</a> hará el resultado más fiable)` : ''}.</p>
      <div class="review">⚠️ <b>Es una orientación, no un consejo de voto.</b> Solo compara tus respuestas con lo que cada partido ha escrito en su programa, según nuestra lectura (hecha con IA). Un partido con pocas posturas anotadas (<i>n</i> pequeño) puede salir muy alto o muy bajo por casualidad. Lee siempre los programas 📄.</div>
      ${ranking.map((r, k) => `<details class="card aff-res" ${k === 0 ? 'open' : ''}>
        <summary><span class="dot" style="--c:${r.P.color}"></span><b>${esc(r.P.short)}</b>
          <span class="aff-bar"><i style="width:${r.pct}%;background:${r.P.color}"></i></span>
          <b class="pct">${r.pct}%</b> <span class="small muted">n=${r.n}${r.n < 5 ? ' · pocos datos' : ''}</span></summary>
        <div class="aff-body"></div></details>`).join('') || '<div class="card muted">Responde algunas preguntas con tu opinión para ver el resultado.</div>'}
      <div class="row"><button type="button" class="btn" id="back">← Volver al test</button></div>
      <p class="small muted">Método: el mismo que el <a href="#/anexo">Anexo del comparador</a>. Las respuestas "No lo sé" no cuentan.</p>`;
    app.querySelectorAll('details.aff-res').forEach((d, k) => {
      const fill = () => { const b = d.querySelector('.aff-body'); if (!b.innerHTML) b.innerHTML = detail(ranking[k]); };
      if (d.open) fill();
      d.addEventListener('toggle', () => d.open && fill());
    });
    app.querySelector('#back').addEventListener('click', intro);
    app.querySelector('#more')?.addEventListener('click', e => { e.preventDefault(); quiz(nextBatch()); });
    scrollTo(0, 0);
  }

  if (params.get('r') === '1' && opinions()) results(); else intro();
}
