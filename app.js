import { mockData } from './data/mock-data.js';

// Provider adapters: replace each return with fetch() to the named official service.
// Sources requiring keys, scraping or CORS workarounds must use a backend/serverless proxy.
const clone = value => structuredClone(value);
export async function fetchBcrpData() { return clone(mockData.bcrp); } // BCRP API economic series
export async function fetchExchangeRateData() { return clone(mockData.exchangeRate); } // SUNAT or BCRP
export async function fetchBvlData() { return clone(mockData.bvl); } // BVL market feed
export async function fetchSmvData() { return clone(mockData.smv); } // SMV SIMV
export async function fetchWeatherData() { return clone(mockData.weather); } // SENAMHI or Open-Meteo
export async function fetchAgricultureData() { return clone(mockData.agriculture); } // MIDAGRI/SIEA/SISAP
export async function fetchMaritimeData() { return clone(mockData.maritime); } // DHN/DIHIDRONAV
export async function fetchEarthquakeData() { return clone(mockData.earthquakes); } // IGP/CENSIS or USGS
export async function fetchElPeruanoData() { return clone(mockData.elPeruano); } // El Peruano official norms
export async function fetchSourcesStatus() { return clone(mockData.sourcesStatus); }

const $ = selector => document.querySelector(selector);
const sparkline = points => `<svg class="spark" viewBox="0 0 130 42" aria-label="Variación histórica demostrativa"><polyline points="${points.map((p,i)=>`${i*11.7},${42-p*1.7}`).join(' ')}"/></svg>`;
const unavailable = '<p class="unavailable">fuente no disponible</p>';

const cities = [{n:'Tumbes',x:95,y:102},{n:'Piura',x:105,y:150},{n:'Chiclayo',x:117,y:201},{n:'Trujillo',x:132,y:245},{n:'Lima',x:155,y:319,a:true},{n:'Huancayo',x:219,y:324},{n:'Cusco',x:267,y:371},{n:'Arequipa',x:227,y:438},{n:'Tacna',x:267,y:490}];
function renderMap(mode='clima') {
  $('#city-points').innerHTML = cities.map((c,i)=>`<g class="city ${c.a&&mode==='sismos'?'alert':''}" transform="translate(${c.x} ${c.y})"><circle r="${c.a&&mode==='sismos'?12:6}"/><circle r="2"/><text x="${c.x<150?-12:10}" y="4" text-anchor="${c.x<150?'end':'start'}">${c.n}</text></g>`).join('');
}

async function renderDashboard() {
  const [exchange, weather, quake, agriculture, maritime, norms, sources] = await Promise.all([fetchExchangeRateData(),fetchWeatherData(),fetchEarthquakeData(),fetchAgricultureData(),fetchMaritimeData(),fetchElPeruanoData(),fetchSourcesStatus()]);
  $('#exchange-content').innerHTML = exchange.status!=='available'?unavailable:`<div class="split-values"><div><small>Compra</small><strong>S/ ${exchange.data.buy.toFixed(3)}</strong></div><div><small>Venta</small><strong>S/ ${exchange.data.sell.toFixed(3)}</strong></div></div><div class="variation"><span><small>Variación (24 h)</small><b>${exchange.data.variation}% ↓</b></span>${sparkline(exchange.data.history)}</div><footer>${exchange.note}<time>08:30</time></footer>`;
  const w=weather.data; $('#weather-content').innerHTML=weather.status!=='available'?unavailable:`<div class="weather-now"><strong>${w.temp}°C</strong><span class="weather-icon">🌤️</span><p><b>${w.city}</b><br>${w.condition}<small>Humedad: ${w.humidity}%<br>Viento: ${w.wind}</small></p></div><div class="forecast">${w.forecast.map(f=>`<span><small>${f.day}</small>${f.range} ${f.icon}</span>`).join('')}</div><footer>${weather.note}</footer>`;
  const q=quake.data; $('#quake-content').innerHTML=quake.status!=='available'?unavailable:`<div class="quake-grid"><div><small>Magnitud</small><strong>${q.magnitude}</strong></div><p><small>Profundidad</small><b>${q.depth}</b><small>Ubicación</small><b>${q.location}</b></p><div class="target"></div></div><footer><span>${q.datetime}</span><time>${quake.note}</time></footer>`;
  $('#agro-content').innerHTML=agriculture.status!=='available'?unavailable:`<div class="table-head">Producto <span>Unidad</span><span>Precio S/</span><span>Var. 24 h</span></div>${agriculture.data.map(r=>`<div class="table-row"><b>${r.product}</b><span>${r.unit}</span><span>${r.price.toFixed(2)}</span><span class="${r.variation<0?'down':'up'}">${r.variation>0?'▲':'▼'} ${Math.abs(r.variation)}%</span></div>`).join('')}<footer>Fuente: MIDAGRI · SIAP <time>08:30</time></footer>`;
  const m=maritime.data; $('#maritime-content').innerHTML=maritime.status!=='available'?unavailable:`<h3>${m.title}</h3><div class="maritime-info"><div><small>Nivel</small><strong>${m.level}</strong><div class="wave">≈</div></div><p><b>${m.coast}</b><br>${m.waves}<small>Vigencia<br>${m.validity}</small></p></div><footer>Fuente: DHN <time>08:30</time></footer>`;
  $('#norms-content').innerHTML=norms.status!=='available'?unavailable:norms.data.map(n=>`<a class="norm-row" href="${norms.sourceUrl}" target="_blank" rel="noreferrer"><span>▧</span><p><b>${n.type}</b><small>${n.title}</small></p><time>${n.date}</time></a>`).join('')+`<footer>Fuente: El Peruano <time>08:30</time></footer>`;
  $('#source-grid').innerHTML=sources.data.map(s=>`<a href="${s.url}" target="_blank" rel="noreferrer" class="source-card"><span>${s.badge}</span><p><b>${s.name} <i class="online"></i></b><small>${s.description}</small></p></a>`).join('');
  $('#sources-count').textContent=`${sources.data.filter(s=>s.status==='online').length} / ${sources.data.length}`;
}

const answers={resumen:'Resumen demostrativo: fuentes activas, clima estable en Lima, tipo de cambio y alertas actualizados en el panel.',clima:'Clima demostrativo en Lima: 20 °C, parcialmente nublado, humedad de 78%.',sismos:'Último sismo demostrativo: magnitud 4.8, profundidad 42 km, al SO de Chala, Arequipa.',cambio:'Tipo de cambio demostrativo: compra S/ 3.724 y venta S/ 3.729.',agro:'Precios demostrativos: limón sutil S/ 4.20, papa blanca S/ 1.28 y arroz pilado S/ 3.60.'};
function answer(text,key){ $('#assistant-message').innerHTML=`<b>Radar Perú IA</b><br>${text}<time>${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</time>`; if(key&&document.getElementById(key)) document.getElementById(key).scrollIntoView({behavior:'smooth',block:'center'}); }
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>answer(answers[b.dataset.query],b.dataset.query==='cambio'?'finanzas':b.dataset.query)));
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#chat-input');const q=input.value.toLowerCase();const key=Object.keys(answers).find(k=>q.includes(k))||(q.includes('tiempo')?'clima':q.includes('terremoto')?'sismos':null);answer(key?answers[key]:'Solo puedo ayudarte con información del panel Radar Perú IA: normas, finanzas, clima, agro, marina, bolsa y sismos.',key);input.value='';});
document.querySelectorAll('[data-map]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-map]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMap(b.dataset.map);}));
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'center'});$('#sidebar').classList.remove('open');$('#mobile-menu').setAttribute('aria-expanded','false');}));
$('#mobile-menu').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#mobile-menu').setAttribute('aria-expanded',String(open));});
renderMap(); renderDashboard();
