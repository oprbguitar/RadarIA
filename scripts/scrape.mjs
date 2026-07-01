/* ============================================================================
   scrape.mjs · SCRAPE-TIER de "Radar Perú IA"
   ----------------------------------------------------------------------------
   Descarga datos que NO se pueden pedir desde el navegador (sin CORS / con
   estado) y los deja como JSON estático en /data. La app solo lee ese JSON.
   Pensado para correr en GitHub Actions (cron) y también de forma local:
       node scripts/scrape.mjs
   Requiere Node 18+ (usa fetch global). Sin dependencias externas.
   ============================================================================ */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const UA = 'RadarPeruIA/1.0 (+https://oprbguitar.github.io/RadarIA/)';
const nowISO = () => new Date().toISOString();

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
const fmtFecha = ymd => {            // "20260621" -> "21 jun. 2026"
  if (!/^\d{8}$/.test(ymd || '')) return ymd || '—';
  return `${ymd.slice(6,8)} ${MESES[+ymd.slice(4,6)-1]}. ${ymd.slice(0,4)}`;
};

async function writeJSON(name, payload) {
  await mkdir(DATA, { recursive: true });
  await writeFile(join(DATA, name), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`✓ data/${name} (${payload.items?.length ?? 0} ítems)`);
}

/* ---------------------------------------------------------------------------
   1) NORMAS LEGALES — REAL · El Peruano (GraphQL público getGenericPublication)
   El backend exige un término de búsqueda; "resolucion" cubre la gran mayoría
   de dispositivos y devuelve resultados ordenados del más reciente al antiguo.
--------------------------------------------------------------------------- */
const EP_GQL = 'https://busquedas.elperuano.pe/api/graphql';
const EP_QUERY = `query G($fechaIni:String,$fechaFin:String,$query:String,$paginatedBy:Int,$start:Int){
  results:getGenericPublication(fechaIni:$fechaIni,fechaFin:$fechaFin,query:$query,paginatedBy:$paginatedBy,start:$start){
    totalHits hasNext hits{ nombreDispositivo sumilla fechaPublicacion sector tipoDispositivo urlPDF }
  }
}`;

async function scrapeNormas() {
  const fin = new Date();
  const ini = new Date(Date.now() - 9 * 864e5);
  const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const body = {
    query: EP_QUERY,
    variables: { query: 'resolucion', fechaIni: ymd(ini), fechaFin: ymd(fin), paginatedBy: 18, start: 0 },
  };
  const res = await fetch(EP_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA, Referer: 'https://busquedas.elperuano.pe/' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`El Peruano HTTP ${res.status}`);
  const json = await res.json();
  const hits = json?.data?.results?.hits;
  if (!Array.isArray(hits) || !hits.length) throw new Error('Sin normas en el rango consultado');

  // Prioriza dispositivos de alcance nacional; descarta ordenanzas locales repetidas.
  const PRIORIDAD = ['LEY', 'DECRETO SUPREMO', 'DECRETO DE URGENCIA', 'RESOLUCIÓN MINISTERIAL', 'RESOLUCION MINISTERIAL', 'RESOLUCIÓN SUPREMA'];
  const rank = t => { const i = PRIORIDAD.findIndex(p => (t || '').toUpperCase().includes(p)); return i === -1 ? 99 : i; };
  const items = hits
    .map(h => ({
      type: [h.tipoDispositivo, h.nombreDispositivo].filter(Boolean).join(' '),
      title: (h.sumilla || '').replace(/\s+/g, ' ').trim(),
      date: fmtFecha(h.fechaPublicacion),
      _ymd: h.fechaPublicacion,
      url: h.urlPDF?.startsWith('http') ? h.urlPDF : 'https://busquedas.elperuano.pe/',
    }))
    .sort((a, b) => rank(a.type) - rank(b.type) || (b._ymd || '').localeCompare(a._ymd || ''))
    .slice(0, 6)
    .map(({ _ymd, ...rest }) => rest);

  await writeJSON('normas.json', {
    generatedAt: nowISO(),
    source: 'El Peruano · Diario Oficial',
    sourceUrl: 'https://busquedas.elperuano.pe/',
    isDemo: false,
    note: 'Dato real · El Peruano (búsqueda oficial)',
    totalHits: json.data.results.totalHits,
    items,
  });
}

/* ---------------------------------------------------------------------------
   1b) NORMAS DEL MES — REAL · todas las normas del mes en curso para la
   página "Normas Peruanas" (buscador + filtro por tipo, client-side).
   Las normas oficiales tienen tipoDispositivo en MAYÚSCULAS (DECRETO SUPREMO,
   RESOLUCIÓN MINISTERIAL…); los avisos notariales/comerciales van en Title
   Case, así que se descartan con isNorm().
--------------------------------------------------------------------------- */
const NORM_RE = /^(DECRETO|RESOLUCIÓN|RESOLUCION|LEY|ORDENANZA|ACUERDO|CIRCULAR|CONVENIO|DIRECTIVA|FE DE ERRATA)\b/;
const isNorm = t => { t = (t || '').trim(); return !!t && t === t.toUpperCase() && NORM_RE.test(t); };
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

async function scrapeNormasMes() {
  const now = new Date();
  const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const fin = ymd(now);
  const ini = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}01`;
  const MAX_PAGES = 25, PER = 100;
  const raw = [];
  let start = 0, page = 0, hasNext = true;
  while (hasNext && page < MAX_PAGES) {
    const res = await fetch(EP_GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA, Referer: 'https://busquedas.elperuano.pe/' },
      body: JSON.stringify({ query: EP_QUERY, variables: { query: 'de', fechaIni: ini, fechaFin: fin, paginatedBy: PER, start } }),
    });
    if (!res.ok) throw new Error(`El Peruano HTTP ${res.status}`);
    const r = (await res.json())?.data?.results;
    raw.push(...(r?.hits || []));
    hasNext = !!r?.hasNext; start += PER; page++;
  }
  const seen = new Set();
  const items = raw
    .filter(h => isNorm(h.tipoDispositivo))
    .map(h => ({
      type: (h.tipoDispositivo || '').trim(),
      name: (h.nombreDispositivo || '').trim(),
      title: (h.sumilla || '').replace(/\s+/g, ' ').trim(),
      date: fmtFecha(h.fechaPublicacion),
      ymd: h.fechaPublicacion,
      url: h.urlPDF?.startsWith('http') ? h.urlPDF : 'https://busquedas.elperuano.pe/',
    }))
    .filter(x => { const k = `${x.name}|${x.ymd}|${x.title.slice(0, 40)}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.ymd || '').localeCompare(a.ymd || ''));
  if (!items.length) throw new Error('Sin normas del mes');
  const counts = {};
  items.forEach(x => { counts[x.type] = (counts[x.type] || 0) + 1; });
  const types = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));
  await writeJSON('normas-mes.json', {
    generatedAt: nowISO(),
    periodo: `${MESES_L[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
    periodoIni: ini, periodoFin: fin,
    source: 'El Peruano · Diario Oficial',
    sourceUrl: 'https://busquedas.elperuano.pe/',
    total: items.length,
    types,
    items,
  });
}

/* ---------------------------------------------------------------------------
   2) AGRO — precios mayoristas.
   La fuente real (EMMSA "Gran Mercado Mayorista de Lima") publica sus precios
   tras un grid JS con estado en old.emmsa.com.pe; requiere navegador headless
   (Playwright) en el runner, no un simple fetch. Hasta integrarlo, se publica
   un set REFERENCIAL claramente marcado isDemo:true para no inventar precios.
   TODO(headless): extraer la tabla de
   https://old.emmsa.com.pe/emmsa_spv/rpEstadistica/rpt_precios-diarios-web.php
--------------------------------------------------------------------------- */
async function scrapeAgro() {
  const items = [
    { product: 'Papa blanca',  unit: 'kg', price: 1.30, variation: -1.5 },
    { product: 'Limón sutil',  unit: 'kg', price: 4.10, variation:  3.8 },
    { product: 'Cebolla roja', unit: 'kg', price: 1.55, variation: -0.8 },
    { product: 'Arroz pilado', unit: 'kg', price: 3.62, variation:  0.6 },
  ];
  await writeJSON('agro.json', {
    generatedAt: nowISO(),
    source: 'MIDAGRI / EMMSA (referencial)',
    sourceUrl: 'https://www.emmsa.com.pe/index.php/precios-diarios/',
    isDemo: true,
    note: 'Precio referencial · conector EMMSA (headless) en preparación',
    items,
  });
}

/* ---------------------------------------------------------------------------
   3) MERCADOS — REAL · Yahoo Finance (chart API, sin CORS al llamarse server-side).
   Índice general de la BVL (S&P/BVL Perú General) + referencias internacionales
   (S&P 500, Dow Jones, Nasdaq) para dar contexto comparativo.
--------------------------------------------------------------------------- */
const YF_SYMBOLS = [
  { symbol: '^SPBLPGPT', name: 'S&P/BVL Perú General', market: 'pe' },
  { symbol: '^GSPC',     name: 'S&P 500',               market: 'us' },
  { symbol: '^DJI',      name: 'Dow Jones',              market: 'us' },
  { symbol: '^IXIC',     name: 'Nasdaq Composite',       market: 'us' },
];

async function fetchYahooQuote({ symbol, name, market }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} (${symbol})`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error(`Sin cotización para ${symbol}`);
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;
  return {
    symbol, name, market,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    currency: meta.currency || 'USD',
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : nowISO(),
  };
}

async function scrapeMarkets() {
  const settled = await Promise.allSettled(YF_SYMBOLS.map(fetchYahooQuote));
  const items = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
  settled.forEach((r, i) => { if (r.status === 'rejected') console.warn(`  · ${YF_SYMBOLS[i].symbol}: ${r.reason.message}`); });
  if (!items.length) throw new Error('Sin cotizaciones de mercado disponibles');
  await writeJSON('markets.json', {
    generatedAt: nowISO(),
    source: 'Yahoo Finance · índices de mercado',
    sourceUrl: 'https://finance.yahoo.com/quote/%5ESPBLPGPT',
    isDemo: false,
    note: 'Dato real · Yahoo Finance (BVL + referencias internacionales)',
    items,
  });
}

/* --------------------------------------------------------------------------- */
async function main() {
  const tasks = [['normas', scrapeNormas], ['normas-mes', scrapeNormasMes], ['agro', scrapeAgro], ['markets', scrapeMarkets]];
  let failed = 0;
  for (const [name, fn] of tasks) {
    try { await fn(); }
    catch (e) { failed++; console.error(`✗ ${name}: ${e.message}`); }
  }
  if (failed === tasks.length) process.exit(1);   // todo falló → marca el job en rojo
}

main();
