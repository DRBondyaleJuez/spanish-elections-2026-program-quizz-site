// Fichas de partidos y candidaturas, de una en una, con deslizador.
import { loadBase, loadJSON, parseHash, esc, pdfLink, chips, bindChips, glossaryText, reviewNote } from '../lib.js';

export async function render(app) {
  const B = await loadBase();
  const ids = B.parties.map(p => p.id);
  const { list } = parseHash();
  let cur = Math.max(0, ids.indexOf(list('p')[0]));
  const filled = new Set();

  const members = c => {
    if (!c) return '';
    const list = c.miembros?.length
      ? `<ul class="members">${c.miembros.map(m => `<li>${esc(m.nombre)}${m.siglas ? ` <span class="muted">(${esc(m.siglas)})</span>` : ''}</li>`).join('')}</ul>` : '';
    const label = c.tipo === 'coalición' ? 'Coalición / candidatura formada por' : 'Formación';
    return `<p class="small muted">${label}:</p>${list}
      <p class="small muted">${esc(c.nota || '')} ${c.fuente ? pdfLink(c.fuente) : ''}</p>
      ${c.confirmar ? '<p class="small">⚠️ <b>Por confirmar:</b> el programa no nombra a las formaciones que integran esta candidatura.</p>' : ''}`;
  };

  const slide = id => {
    const P = B.party[id], c = P.coalition;
    return `<section class="pslide" data-id="${esc(id)}" aria-label="${esc(P.short)}">
      <div class="card">
        <div class="pcard-head"><span class="sigla-big" style="--c:${P.color}">${esc(P.short)}</span>
          <div><b>${esc(c?.nombre || P.name)}</b><div class="small muted">Programa: ${esc(c?.programa || '')}</div></div></div>
        <p class="small muted">La sigla «${esc(P.short)}» representa a ${c?.tipo === 'coalición' ? 'todas las formaciones de la candidatura' : 'esta formación'}.</p>
        ${members(c)}
      </div>
      <div class="pbody"><div class="card muted">Cargando resumen…</div></div></section>`;
  };

  async function fill(i) {
    const id = ids[i];
    if (id === undefined || filled.has(id)) return;
    filled.add(id);
    const S = await loadJSON(`data/summaries/${id}.json`, null);
    const box = app.querySelector(`.pslide[data-id="${id}"] .pbody`);
    if (!box) return;
    if (!S) { box.innerHTML = '<div class="card muted">Resumen aún no disponible.</div>'; return; }
    const topicsN = Object.entries(S.topics).filter(([, b]) => !b.notMentioned)
      .sort((a, b) => b[1].points.length - a[1].points.length).slice(0, 4);
    box.innerHTML = `
      <div class="card"><h3>📝 Qué dice su programa</h3><p>${glossaryText(S.overview)}</p>
        <p>${pdfLink({ doc: id, page: 1 }, 'Abrir el programa completo')}</p></div>
      <div class="card"><h3>📌 Temas en los que más se detiene</h3><ul>
        ${topicsN.map(([t, b]) => `<li>${B.topic[t]?.icon || ''} <b>${esc(B.topic[t]?.name.split(',')[0] || t)}</b>: ${glossaryText(b.summary || '')}</li>`).join('')}</ul></div>
      <div class="card distinct"><h3>⭐ Propuestas que la distinguen</h3><ul>
        ${S.distinctive.slice(0, 4).map(d => `<li>${glossaryText(d.text)} ${pdfLink(d.source)}</li>`).join('')}</ul></div>
      <p><a class="btn" href="#/resumenes?p=${esc(id)}&v=partido">Ver resumen por temas →</a>
         <a class="btn" href="#/test?p=${esc(id)}">Test de su programa →</a></p>`;
  }

  app.innerHTML = `
    <h2>Partidos y candidaturas</h2>
    <p class="muted">Desliza hacia los lados (o usa las flechas) para ver cada partido o coalición. Si quieres saber qué significan las siglas, toca <b>🔤 Siglas</b> arriba.</p>
    ${reviewNote()}
    <div class="filters">${chips('p', B.parties.map(p => ({ id: p.id, label: p.short, color: p.color })), [ids[cur]], { single: true })}</div>
    <div class="pnav"><button type="button" class="btn" id="prev" aria-label="Partido anterior">←</button>
      <div class="dots" id="dots">${ids.map((id, i) => `<i data-i="${i}" title="${esc(B.party[id].short)}" class="${i === cur ? 'on' : ''}"></i>`).join('')}</div>
      <button type="button" class="btn" id="next" aria-label="Partido siguiente">→</button></div>
    <div class="pslider" id="slider" tabindex="0" aria-label="Fichas de partidos">${ids.map(slide).join('')}</div>`;

  const slider = app.querySelector('#slider');
  const slides = [...slider.querySelectorAll('.pslide')];
  const goto = (i, smooth = true) => {
    i = Math.min(ids.length - 1, Math.max(0, i));
    slider.style.scrollBehavior = smooth ? 'smooth' : 'auto';
    slider.scrollTo({ left: slides[i].offsetLeft - slider.offsetLeft });
  };
  const mark = i => {
    cur = i;
    app.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    app.querySelectorAll('[data-chips="p"] .chip').forEach(c => { const on = c.dataset.id === ids[i]; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    history.replaceState(null, '', `#/partidos?p=${ids[i]}`);  // sin recargar la página ni llenar el historial
    fill(i); fill(i + 1); fill(i - 1);
  };

  // El partido visible es el que más ocupa el deslizador
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting && e.intersectionRatio > 0.6) mark(slides.indexOf(e.target));
  }, { root: slider, threshold: [0.6] });
  slides.forEach(s => io.observe(s));

  bindChips(app, 'p', [ids[cur]], v => goto(ids.indexOf(v[0])));
  app.querySelector('#prev').addEventListener('click', () => goto(cur - 1));
  app.querySelector('#next').addEventListener('click', () => goto(cur + 1));
  app.querySelector('#dots').addEventListener('click', e => { const d = e.target.closest('i'); if (d) goto(+d.dataset.i); });
  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goto(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goto(cur - 1); }
  });

  goto(cur, false);
  fill(cur); fill(cur + 1); fill(cur - 1);
}
