// Motor de cuestionarios reutilizable (test de programas y test de la mesa electoral).
import { esc, pdfLink, glossaryText, loadBase } from './lib.js';

const STORE = 'quiz-stats-v1';
export function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function saveStats(s) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* sin almacenamiento */ }
}
export const failedIds = () => Object.entries(loadStats()).filter(([, v]) => v.last === false).map(([k]) => k);

// ---- Valoraciones 👍/👎 (se guardan en este navegador y se exportan a un JSON) ----
const RATE = 'quiz-ratings-v1';
export function loadRatings() {
  try { return JSON.parse(localStorage.getItem(RATE)) || {}; } catch { return {}; }
}
function saveRatings(r) {
  try { localStorage.setItem(RATE, JSON.stringify(r)); } catch { /* sin almacenamiento */ }
}
function setRating(id, patch) {
  const r = loadRatings();
  r[id] = { ...(r[id] || {}), ...patch, ts: new Date().toISOString() };
  if (r[id].v == null && !r[id].note) delete r[id];
  saveRatings(r);
}
export function exportRatings() {
  const r = loadRatings();
  const ratings = Object.entries(r).map(([id, x]) => ({ id, v: x.v ?? null, note: x.note || '', ts: x.ts }));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ratings }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `valoraciones-preguntas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
/** Botón "Exportar mis valoraciones (n)" para las páginas de test. */
export function exportButtonHTML() {
  const n = Object.keys(loadRatings()).length;
  return n ? `<button type="button" class="btn small-btn" data-export-ratings>⬇️ Exportar mis valoraciones (${n})</button>` : '';
}
export function bindExport(root) {
  root.querySelectorAll('[data-export-ratings]').forEach(b => b.addEventListener('click', exportRatings));
}
function rateHTML(id) {
  const cur = loadRatings()[id] || {};
  return `<div class="rate" data-id="${esc(id)}"><span class="small muted">¿Es una buena pregunta?</span>
    <button type="button" class="rate-btn${cur.v === 1 ? ' on' : ''}" data-v="1" aria-pressed="${cur.v === 1}" title="Buena pregunta">👍</button>
    <button type="button" class="rate-btn${cur.v === -1 ? ' on' : ''}" data-v="-1" aria-pressed="${cur.v === -1}" title="Pregunta mala o errónea">👎</button>
    <input type="text" class="rate-note" placeholder="¿Qué falla? (opcional: respuesta, página, redacción…)" maxlength="300" value="${esc(cur.note || '')}" ${cur.v === -1 ? '' : 'hidden'}>
  </div>`;
}
function bindRate(root) {
  root.querySelectorAll('.rate').forEach(box => {
    const id = box.dataset.id, note = box.querySelector('.rate-note');
    box.querySelectorAll('.rate-btn').forEach(b => b.addEventListener('click', () => {
      const v = +b.dataset.v;
      const was = b.classList.contains('on');
      box.querySelectorAll('.rate-btn').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      if (!was) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); }
      setRating(id, { v: was ? null : v });
      note.hidden = !(v === -1 && !was);
      if (!note.hidden) note.focus();
    }));
    note.addEventListener('change', () => setRating(id, { note: note.value.trim() }));
  });
}

const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const HINT = { tf: 'Verdadero o falso', single: 'Elige una respuesta', multi: 'Marca todas las correctas', which_party: '¿Qué partido?', which_not: 'Elige la que NO está' };

/**
 * Ejecuta un test. questions: array con el esquema de AGENTS.md §5.
 * opts: { count, onRestart(), label(q) → texto de cabecera, docName(doc) }
 */
export async function runQuiz(root, questions, opts = {}) {
  const B = await loadBase();
  const picked = shuffle(questions).slice(0, opts.count || 20).map(q => {
    const order = q.type === 'tf' ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i));
    return { q, order };
  });
  const optLabel = (q, o) => q.type === 'which_party' ? (B.party[o]?.short || o) : o;
  const docName = d => d === 'mesa' ? 'Manual de la mesa electoral' : `Programa de ${B.party[d]?.short || d}`;

  const card = ({ q, order }, i) => {
    const multi = q.type === 'multi';
    return `<div class="card qcard" data-i="${i}">
      <div class="qhead muted small">${i + 1}/${picked.length} · ${opts.label ? opts.label(q) : ''} · ${HINT[q.type] || ''}</div>
      <p class="qtext">${glossaryText(q.question)}</p>
      <div class="opts">${order.map(k => `<label class="opt"><input type="${multi ? 'checkbox' : 'radio'}" name="q${i}" value="${k}">
        <span>${glossaryText(optLabel(q, q.options[k]))}</span></label>`).join('')}</div>
      ${q.tip ? `<details class="tip"><summary>💡 Pista</summary><p>${glossaryText(q.tip)}</p></details>` : ''}
      <div class="feedback" hidden></div></div>`;
  };

  root.innerHTML = `<div id="score"></div>${picked.map(card).join('')}
    <div class="qbar"><button type="button" class="btn primary" id="submit">Corregir test</button></div>`;

  root.querySelector('#submit').addEventListener('click', () => {
    const unanswered = picked.filter((_, i) => !root.querySelector(`[name="q${i}"]:checked`)).length;
    if (unanswered && !confirm(`Te quedan ${unanswered} sin responder (contarán como fallo). ¿Corregir igualmente?`)) return;
    grade();
  });

  function grade() {
    const stats = loadStats();
    let ok = 0;
    picked.forEach(({ q }, i) => {
      const el = root.querySelector(`.qcard[data-i="${i}"]`);
      const chosen = [...el.querySelectorAll('input:checked')].map(x => +x.value).sort();
      const right = [...q.answer].sort();
      const good = chosen.length === right.length && chosen.every((v, k) => v === right[k]);
      if (good) ok++;
      const s = stats[q.id] || { ok: 0, ko: 0 };
      good ? s.ok++ : s.ko++;
      s.last = good;
      stats[q.id] = s;
      el.classList.add(good ? 'good' : 'bad');
      el.querySelectorAll('input').forEach(inp => {
        inp.disabled = true;
        const k = +inp.value, lab = inp.closest('.opt');
        if (q.answer.includes(k)) lab.classList.add('right');
        else if (inp.checked) lab.classList.add('wrong');
      });
      const fb = el.querySelector('.feedback');
      const correctTxt = q.answer.map(k => optLabel(q, q.options[k])).join(' · ');
      fb.hidden = false;
      fb.innerHTML = `<p><b>${good ? '✅ ¡Correcto!' : '❌ Incorrecto.'}</b> Respuesta: <b>${glossaryText(correctTxt)}</b></p>
        <p>${glossaryText(q.explanation)}</p>
        <p class="small">Fuente: ${pdfLink(q.source, `${docName(q.source.doc)}, pág. ${q.source.page}`)}${q.source.section ? ` · <span class="muted">${esc(q.source.section)}</span>` : ''}</p>
        ${rateHTML(q.id)}`;
    });
    saveStats(stats);
    bindRate(root);
    const pct = Math.round(100 * ok / picked.length);
    const msg = pct >= 90 ? '¡Excelente! 🏆' : pct >= 70 ? '¡Muy bien! 👏' : pct >= 50 ? 'Vas por buen camino 💪' : 'Toca repasar un poco más 📚';
    const sc = root.querySelector('#score');
    sc.innerHTML = `<div class="card score"><div class="big">${ok}/${picked.length}</div><div>${pct}% · ${msg}</div>
      <p class="small muted">Abajo tienes cada respuesta explicada con el enlace a su página. Comprueba siempre el documento original.
      Si una pregunta te parece mala o errónea, márcala con 👎 y luego exporta tus valoraciones desde la pantalla del test.</p>
      <div class="row"><button type="button" class="btn primary" data-act="again">Otro test</button>
      ${picked.length - ok ? `<button type="button" class="btn" data-act="failed">Repasar mis fallos</button>` : ''}</div></div>`;
    sc.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => opts.onRestart?.(b.dataset.act)));
    root.querySelector('.qbar').remove();
    sc.scrollIntoView({ behavior: 'smooth' });
  }
}
