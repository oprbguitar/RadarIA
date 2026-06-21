/* Normas Peruanas · lee data/normas-mes.json (REAL · El Peruano vía scraper)
   Buscador por palabras + filtro por tipo de norma, todo client-side. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const norm = s => String(s).toLowerCase().normalize('NFD').replace(DIACRITICS, '');

let DATA = { items: [], types: [] };
const state = { q: '', type: 'all' };

function renderChips() {
  const chips = [`<button class="np-chip" data-type="all">Todas <em>${DATA.items.length}</em></button>`]
    .concat(DATA.types.map(t => `<button class="np-chip" data-type="${esc(t.type)}">${esc(t.type)} <em>${t.count}</em></button>`));
  const box = $('#np-types');
  box.innerHTML = chips.join('');
  box.querySelectorAll('.np-chip').forEach(b => b.addEventListener('click', () => { state.type = b.dataset.type; render(); }));
}

function render() {
  const q = norm(state.q.trim());
  const list = DATA.items.filter(x =>
    (state.type === 'all' || x.type === state.type) &&
    (!q || norm(`${x.title} ${x.name} ${x.type}`).includes(q))
  );
  $('#np-count').textContent = list.length;
  $('#np-types').querySelectorAll('.np-chip').forEach(b => b.classList.toggle('on', b.dataset.type === state.type));
  $('#np-list').innerHTML = list.length
    ? list.map(x => `<article class="np-card">
        <header><span class="np-badge">${esc(x.type)}</span><time>${esc(x.date)}</time></header>
        <b>${esc(x.name) || 'Norma'}</b>
        <p>${esc(x.title) || '—'}</p>
        <a href="${esc(x.url)}" target="_blank" rel="noreferrer">Ver norma (PDF) ↗</a>
      </article>`).join('')
    : `<div class="np-empty">Sin resultados para “${esc(state.q)}”.</div>`;
}

async function init() {
  try {
    const r = await fetch('./data/normas-mes.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DATA = await r.json();
  } catch {
    $('#np-sub').textContent = 'No se pudo cargar la lista de normas.';
    $('#np-list').innerHTML = '<div class="np-empty">Lista no disponible por ahora. Intenta más tarde.</div>';
    return;
  }
  $('#np-sub').textContent = `Diario Oficial El Peruano · ${DATA.periodo} · ${DATA.total} normas`;
  document.title = `Normas Peruanas · ${DATA.periodo}`;
  renderChips();
  render();
  $('#np-q').addEventListener('input', e => { state.q = e.target.value; render(); });
}

init();
