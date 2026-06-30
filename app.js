import { providers } from './js/providers.js?v=2';
import { GEMINI } from './js/config.js?v=2';

const $=s=>document.querySelector(s);
const state={data:{},map:{weather:[],quakes:[]},mapMode:'weather',refreshAt:Date.now()+300000};

/* ---------- helpers ---------- */
const weatherLabel=code=>({0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla',51:'Llovizna',53:'Llovizna',55:'Llovizna intensa',61:'Lluvia',63:'Lluvia',65:'Lluvia fuerte',71:'Nieve',80:'Chubascos',81:'Chubascos',82:'Chubascos fuertes',95:'Tormenta',96:'Tormenta',99:'Tormenta'}[code]||'Condición variable');
const weatherIcon=code=>code<=1?'☀️':code<=3?'🌤️':code>=95?'⛈️':code>=61?'🌧️':code>=45?'🌫️':'☁️';
const weatherSeverity=code=>code>=95?'red':code>=61?'yellow':'cyan';
const quakeSeverity=m=>m>=5?'red':m>=4?'yellow':'cyan';
const formatTime=value=>value?new Date(value).toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const badgeFor=d=>d?.status==='available'?(d.isDemo?['DEMO','demo']:['REAL','real']):d?.status==='stale'?['CACHÉ','warn']:['NO DISP.','off'];
const card=key=>document.querySelector(`[data-card="${key}"]`);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mdLite=s=>escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
const unavailable=d=>`<div class="unavailable"><b>${d.note}</b><span>${d.error||'No se publicarán datos inventados.'}</span></div>`;
const demoNote=d=>d.isDemo?`<p class="data-note">Dato demostrativo</p>`:'';
const setCard=(key,html)=>{const el=card(key),d=state.data[key],badge=badgeFor(d);const body=el.querySelector('.card-body');body.classList.remove('skeleton');body.innerHTML=html;el.querySelector('.data-badge').textContent=badge[0];el.querySelector('.data-badge').className=`data-badge ${badge[1]}`;el.querySelector('footer').innerHTML=`<span>${d.sourceName}</span><time>${formatTime(d.lastUpdated)}</time>`;};

/* ---------- cards ---------- */
function exchangeInner(e){const h=e.history?.length?e.history:[e.sell];const mn=Math.min(...h),mx=Math.max(...h),span=(mx-mn)||1,step=h.length>1?120/(h.length-1):0;const pts=h.map((v,i)=>`${(i*step).toFixed(1)},${(33-((v-mn)/span)*28).toFixed(1)}`).join(' ');const v=e.variation||0,up=v>=0,arrow=v>0?'▲':v<0?'▼':'■';return{pts,up,arrow,v};}
function renderCards(){
  const e=state.data.exchangeRate;let exHtml=unavailable(e);if(e.data){const x=exchangeInner(e.data);exHtml=`<div class="exchange"><p><small>Compra</small><strong>S/ ${e.data.buy.toFixed(3)}</strong></p><p><small>Venta</small><strong>S/ ${e.data.sell.toFixed(3)}</strong></p></div><div class="variation"><span><small>Variación</small><b class="${x.up?'up':'down'}">${x.arrow} ${Math.abs(x.v)}%</b></span><svg viewBox="0 0 120 35"><polyline points="${x.pts}"/></svg></div>${demoNote(e)}`;}setCard('exchangeRate',exHtml);
  const w=state.data.weather;setCard('weather',w.data?`<div class="weather-now"><strong>${Math.round(w.data.temp)}°C</strong><span>${weatherIcon(w.data.weatherCode)}</span><p><b>${w.data.city}</b>${weatherLabel(w.data.weatherCode)}<small>Humedad: ${w.data.humidity}%<br>Viento: ${w.data.wind}</small></p></div><div class="forecast">${w.data.forecast.map((f,i)=>`<span><small>${i?'Día '+(i+1):'Hoy'}</small>${Math.round(f.max)}° / ${Math.round(f.min)}° ${weatherIcon(f.code)}</span>`).join('')}</div>`:unavailable(w));
  const q=state.data.earthquakes;setCard('earthquakes',q.data?`<div class="quake-data"><p><small>Magnitud</small><strong>${q.data.magnitude.toFixed(1)}</strong></p><p><small>Profundidad</small><b>${q.data.depth}</b><small>Ubicación</small><b>${q.data.location}</b></p><i class="target"></i></div>`:unavailable(q));
  const a=state.data.agriculture;setCard('agriculture',a.data?`<div class="mini-table"><div class="table-head">Producto <span>Unidad</span><span>Precio S/</span><span>Var. 24 h</span></div>${a.data.map(r=>`<div><b>${r.product}</b><span>${r.unit}</span><span>${r.price.toFixed(2)}</span><span class="${r.variation<0?'down':'up'}">${r.variation<0?'▼':'▲'} ${Math.abs(r.variation)}%</span></div>`).join('')}</div>${demoNote(a)}`:unavailable(a));
  const m=state.data.maritime;setCard('maritime',m.data?`<h3>${m.data.title}</h3><div class="marine"><p><small>Nivel</small><strong>${m.data.level}</strong><i>≈</i></p><p><b>${m.data.coast}</b>${m.data.waves}<small>Vigencia<br>${m.data.validity}</small></p></div>${demoNote(m)}`:unavailable(m));
  const n=state.data.elPeruano;setCard('elPeruano',n.data?n.data.slice(0,4).map(item=>`<a href="${item.url||n.sourceUrl}" target="_blank" rel="noreferrer"><span>▧</span><p><b>${item.type}</b><small>${item.title}</small></p><time>${item.date}</time></a>`).join('')+demoNote(n):unavailable(n));
}

/* ---------- modal de detalle ---------- */
const titles={exchangeRate:'Tipo de cambio · USD/PEN',weather:'Clima',earthquakes:'Sismos',agriculture:'Agro · precios mayoristas',maritime:'Marina · estado del mar',elPeruano:'Normas · El Peruano'};
const detail={
  exchangeRate(d){if(!d.data)return unavailable(d);const e=d.data,x=exchangeInner(e);return`<div class="d-stats"><div><small>Compra</small><b>S/ ${e.buy.toFixed(3)}</b></div><div><small>Venta</small><b>S/ ${e.sell.toFixed(3)}</b></div><div><small>Variación</small><b class="${x.up?'up':'down'}">${x.arrow} ${Math.abs(x.v)}%</b></div></div><svg class="d-spark" viewBox="0 0 120 35" preserveAspectRatio="none"><polyline points="${x.pts}"/></svg><p class="d-text">Tasa de mercado <b>referencial</b> USD/PEN (no es el tipo de cambio oficial SUNAT). Historial reciente (${(e.history||[]).length} lecturas): ${(e.history||[]).map(v=>v.toFixed(3)).join(' · ')||'—'}.</p>`;},
  weather(d){if(!d.data)return unavailable(d);const w=d.data;const cities=state.map.weather.filter(c=>c.temp!=null);return`<div class="d-hero"><strong>${Math.round(w.temp)}°C</strong><span>${weatherIcon(w.weatherCode)}</span><div><b>${w.city}</b><p>${weatherLabel(w.weatherCode)} · Humedad ${w.humidity}% · Viento ${w.wind}</p></div></div><div class="d-forecast">${w.forecast.map((f,i)=>`<div><small>${i?new Date(f.day).toLocaleDateString('es-PE',{weekday:'short'}):'Hoy'}</small><span>${weatherIcon(f.code)}</span><b>${Math.round(f.max)}°</b><i>${Math.round(f.min)}°</i></div>`).join('')}</div>${cities.length?`<h4 class="d-sub">Temperatura por ciudad</h4><div class="d-citygrid">${cities.map(c=>`<div><b>${c.n}</b><span>${Math.round(c.temp)}° ${weatherIcon(c.code)}</span></div>`).join('')}</div>`:''}`;},
  earthquakes(d){if(!d.data)return unavailable(d);const q=d.data;const list=state.map.quakes||[];return`<div class="d-hero quake"><strong>${q.magnitude.toFixed(1)}</strong><div><b>Último evento</b><p>${q.location}<br>Profundidad ${q.depth} · ${formatTime(q.datetime)}</p></div></div>${list.length?`<h4 class="d-sub">Sismos recientes (${list.length}) · USGS</h4><div class="d-quakelist">${list.map(k=>`<div><b class="sev-${quakeSeverity(k.mag)}">M ${k.mag?.toFixed(1)}</b><span>${k.place||'—'}</span><i>${Math.round(k.depth)} km</i><time>${formatTime(k.time)}</time></div>`).join('')}</div>`:''}`;},
  agriculture(d){if(!d.data)return unavailable(d);return`<div class="mini-table d-table"><div class="table-head">Producto <span>Unidad</span><span>Precio S/</span><span>Var. 24 h</span></div>${d.data.map(r=>`<div><b>${r.product}</b><span>${r.unit}</span><span>${r.price.toFixed(2)}</span><span class="${r.variation<0?'down':'up'}">${r.variation<0?'▼':'▲'} ${Math.abs(r.variation)}%</span></div>`).join('')}</div><p class="d-text">${d.note||''}. Fuente: <a href="${d.sourceUrl}" target="_blank" rel="noreferrer">${d.sourceName}</a>.</p>`;},
  maritime(d){if(!d.data)return unavailable(d);const m=d.data;return`<div class="d-hero"><strong class="sev-${m.level==='ALTO'?'red':m.level==='MODERADO'?'yellow':'cyan'}">${m.level}</strong><div><b>${m.title}</b><p>${m.coast}<br>${m.waves}</p></div></div><p class="d-text">Vigencia: ${m.validity}. ${d.note||''}.</p>`;},
  elPeruano(d){if(!d.data)return unavailable(d);return`<a class="d-allnorms" href="normas.html" target="_blank" rel="noreferrer">📚 Ver todas las Normas Peruanas del mes <span>con buscador y filtro por tipo →</span></a><h4 class="d-sub">Últimas normas nacionales</h4><div class="d-norms">${d.data.map(item=>`<a href="${item.url||d.sourceUrl}" target="_blank" rel="noreferrer"><b>${item.type}</b><small>${item.title}</small><time>${item.date}</time></a>`).join('')}</div>`;},
};
async function refreshNormas(){
  try{
    const r=await fetch('./data/normas.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw 0;const j=await r.json();if(!j.items?.length)throw 0;
    state.data.elPeruano={sourceName:j.source||'El Peruano',sourceUrl:j.sourceUrl||'https://busquedas.elperuano.pe/',category:'elPeruano',lastUpdated:j.generatedAt,status:'available',isDemo:!!j.isDemo,data:j.items,error:null,note:j.note||'Dato real · El Peruano'};
  }catch{}
}
async function openDetail(key){let d=state.data[key];if(!d)return;
  if(key==='elPeruano'){await refreshNormas();d=state.data[key];renderCards();renderSources();}
  const badge=badgeFor(d);$('#modal-title').textContent=titles[key]||key;const mb=$('#modal-badge');mb.textContent=badge[0];mb.className=`data-badge ${badge[1]}`;$('#modal-body').innerHTML=(detail[key]||(()=>'<p class="d-text">Sin detalle.</p>'))(d);$('#modal-foot').innerHTML=`<span>${d.sourceName||''}</span><time>Actualizado: ${formatTime(d.lastUpdated)}</time>`;$('#detail-modal').hidden=false;}
function closeModal(){$('#detail-modal').hidden=true;}

/* ---------- mapa ---------- */
const cities=[{n:'Tumbes',lon:-80.45,lat:-3.57},{n:'Piura',lon:-80.63,lat:-5.19},{n:'Chiclayo',lon:-79.84,lat:-6.77},{n:'Trujillo',lon:-79.03,lat:-8.11},{n:'Lima',lon:-77.04,lat:-12.05},{n:'Huancayo',lon:-75.20,lat:-12.07},{n:'Cusco',lon:-71.97,lat:-13.52},{n:'Arequipa',lon:-71.54,lat:-16.40},{n:'Iquitos',lon:-73.25,lat:-3.75},{n:'Puno',lon:-70.02,lat:-15.84},{n:'Tacna',lon:-70.25,lat:-18.01}];
const bounds={minLon:-81.55,maxLon:-68.5,minLat:-18.5,maxLat:.1};
const project=(lon,lat)=>({x:24+((lon-bounds.minLon)/(bounds.maxLon-bounds.minLon))*330,y:24+((bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat))*500});

async function fetchMapWeather(){
  const lat=cities.map(c=>c.lat).join(','),lon=cities.map(c=>c.lon).join(',');
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&timezone=America%2FLima`;
  const j=await(await fetch(url)).json();const arr=Array.isArray(j)?j:[j];
  return cities.map((c,i)=>{const cur=arr[i]?.current||{};return{...c,temp:cur.temperature_2m,code:cur.weather_code,humidity:cur.relative_humidity_2m,feels:cur.apparent_temperature,wind:cur.wind_speed_10m,windDir:cur.wind_direction_10m};});
}
const compass=d=>['N','NE','E','SE','S','SO','O','NO'][Math.round(((d||0)%360)/45)%8];
async function fetchMapQuakes(){
  const start=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const url=`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minlatitude=-20&maxlatitude=1&minlongitude=-82&maxlongitude=-68&minmagnitude=3&orderby=time&limit=14`;
  const j=await(await fetch(url)).json();
  return(j.features||[]).map(f=>({mag:f.properties.mag,place:f.properties.place,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],depth:f.geometry.coordinates[2],time:f.properties.time}));
}
async function loadMapData(){
  const[w,q]=await Promise.allSettled([fetchMapWeather(),fetchMapQuakes()]);
  state.map.weather=w.status==='fulfilled'?w.value:[];
  state.map.quakes=q.status==='fulfilled'?q.value:[];
}

let lmap=null,peruOutlineLayer=null,deptLayer=null,weatherLayer=null,quakeLayer=null;
const sevColor=s=>s==='red'?'#ff4355':s==='yellow'?'#ffc52e':'#17e8f4';
const isMobileMap=()=>window.innerWidth<=760;
const departmentName=f=>String(f.properties.NOMBDEP||f.properties.name||'Departamento').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const departmentStyle=()=>({
  color:'#69f2ff',
  weight:isMobileMap()?1.8:1.35,
  opacity:0.95,
  fillColor:'#18e6ff',
  fillOpacity:0.18,
  dashArray:'2 3',
  lineJoin:'round'
});
const departmentHoverStyle=()=>({
  color:'#ffffff',
  weight:isMobileMap()?2.8:2.3,
  opacity:1,
  fillColor:'#5ff7ff',
  fillOpacity:0.26,
  dashArray:'',
  lineJoin:'round'
});
const peruOutlineStyle=()=>({
  color:'#d8feff',
  weight:isMobileMap()?6.4:5.4,
  opacity:1,
  fillOpacity:0,
  dashArray:'',
  lineJoin:'round'
});
function peruBoundaryFromDepartments(geo){
  const counts=new Map(),coords=new Map(),prec=5;
  const keyFor=pt=>`${Number(pt[0]).toFixed(prec)},${Number(pt[1]).toFixed(prec)}`;
  const addRing=ring=>{
    for(let i=0;i<ring.length-1;i++){
      const a=keyFor(ring[i]),b=keyFor(ring[i+1]);
      if(a===b)continue;
      const key=a<b?`${a}|${b}`:`${b}|${a}`;
      counts.set(key,(counts.get(key)||0)+1);
      coords.set(key,[ring[i],ring[i+1]]);
    }
  };
  (geo.features||[]).forEach(f=>{
    const g=f.geometry;if(!g)return;
    if(g.type==='Polygon')g.coordinates.forEach(addRing);
    if(g.type==='MultiPolygon')g.coordinates.forEach(poly=>poly.forEach(addRing));
  });
  return{type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Perú'},geometry:{type:'MultiLineString',coordinates:[...counts].filter(([,n])=>n===1).map(([key])=>coords.get(key))}}]};
}
function initLeaflet(){
  if(lmap||typeof L==='undefined'||!document.getElementById('map'))return;
  const bounds=L.latLngBounds([[-18.8,-82.3],[0.6,-68.2]]);
  lmap=L.map('map',{zoomControl:true,attributionControl:true,zoomSnap:0.25,minZoom:4,maxZoom:9,scrollWheelZoom:true,maxBounds:bounds.pad(0.3),maxBoundsViscosity:0.85});
  lmap.createPane('peru-outline-pane');
  lmap.getPane('peru-outline-pane').classList.add('peru-outline-pane');
  lmap.getPane('peru-outline-pane').style.zIndex=390;
  lmap.createPane('peru-departments-pane');
  lmap.getPane('peru-departments-pane').classList.add('peru-departments-pane');
  lmap.getPane('peru-departments-pane').style.zIndex=400;
  lmap.fitBounds([[-18.5,-81.4],[0.0,-68.6]]);
  lmap.setMinZoom(Math.max(4,isMobileMap()?lmap.getZoom()-0.25:lmap.getZoom()-0.4));
  lmap.attributionControl.setPrefix('Radar Perú IA');
  // Base vectorial local (sin tiles externos): Perú real por departamentos.
  weatherLayer=L.layerGroup();quakeLayer=L.layerGroup();
  fetch('./data/peru-departamentos.geojson').then(r=>r.json()).then(geo=>{
    peruOutlineLayer=L.geoJSON(peruBoundaryFromDepartments(geo),{
      pane:'peru-outline-pane',
      style:peruOutlineStyle,
      interactive:false
    }).addTo(lmap);
    deptLayer=L.geoJSON(geo,{attribution:'Límites: INEI · Natural Earth',
      pane:'peru-departments-pane',
      style:departmentStyle,
      onEachFeature:(f,layer)=>{const name=departmentName(f);layer.bindTooltip(name,{sticky:true,className:'rt-tip',direction:'top'});layer.on('mouseover',()=>{layer.setStyle(departmentHoverStyle());layer.bringToFront();});layer.on('mouseout',()=>deptLayer.resetStyle(layer));layer.on('click',e=>{layer.setStyle(departmentHoverStyle());layer.openTooltip(e.latlng);setTimeout(()=>deptLayer&&deptLayer.resetStyle(layer),1200);});}});
    deptLayer.addTo(lmap);
    peruOutlineLayer.bringToBack();
    weatherLayer.addTo(lmap);
    renderMap();
  }).catch(()=>{weatherLayer.addTo(lmap);});
  setTimeout(()=>lmap.invalidateSize(),120);
}
function renderWeatherMarkers(){
  if(!weatherLayer)return;weatherLayer.clearLayers();
  const src=state.map.weather.length?state.map.weather:cities;
  src.forEach(c=>{const sev=c.code!=null?weatherSeverity(c.code):'cyan',col=sevColor(sev),temp=c.temp!=null?Math.round(c.temp)+'°':'s/d';
    const popup=`<div class="wpop"><b>${weatherIcon(c.code)} ${c.n}</b>`
      +`<span class="wpop-t">${c.temp!=null?Math.round(c.temp)+' °C':'sin dato'}</span>`
      +`<small>${c.code!=null?weatherLabel(c.code):'—'}</small>`
      +`<div class="wpop-grid">`
      +(c.feels!=null?`<span>Sensación</span><b>${Math.round(c.feels)}°</b>`:'')
      +(c.humidity!=null?`<span>Humedad</span><b>${c.humidity}%</b>`:'')
      +(c.wind!=null?`<span>Viento</span><b>${Math.round(c.wind)} km/h ${compass(c.windDir)}</b>`:'')
      +`</div></div>`;
    const m=L.circleMarker([c.lat,c.lon],{radius:5,color:col,weight:2,fillColor:'#062a38',fillOpacity:1,className:'wk'})
      .bindTooltip(`${c.n} ${temp}`,{permanent:true,direction:'right',offset:[7,0],className:'rt-city rt-'+sev})
      .bindPopup(popup,{className:'wpop-wrap',closeButton:false})
      .addTo(weatherLayer);
    m.on('mouseover',()=>m.openPopup());m.on('mouseout',()=>m.closePopup());});
}
function renderQuakeMarkers(){
  if(!quakeLayer)return;quakeLayer.clearLayers();
  state.map.quakes.forEach(k=>{const sev=quakeSeverity(k.mag),col=sevColor(sev),r=4+(k.mag||3)*1.6;
    L.circleMarker([k.lat,k.lon],{radius:r,color:col,weight:1.6,fillColor:col,fillOpacity:0.22,className:'qk qk-'+sev})
      .bindTooltip(`M${(k.mag||0).toFixed(1)}`,{permanent:true,direction:'right',offset:[6,0],className:'rt-mag rt-'+sev})
      .bindPopup(`<b>Magnitud ${(k.mag||0).toFixed(1)}</b><br>${k.place||'—'}<br>Prof. ${Math.round(k.depth)} km · ${formatTime(k.time)}`)
      .addTo(quakeLayer);});
}
async function renderMap(){
  initLeaflet();if(!lmap)return;
  if(state.mapMode==='weather'){if(quakeLayer&&lmap.hasLayer(quakeLayer))lmap.removeLayer(quakeLayer);if(weatherLayer&&!lmap.hasLayer(weatherLayer))weatherLayer.addTo(lmap);renderWeatherMarkers();}
  else{if(weatherLayer&&lmap.hasLayer(weatherLayer))lmap.removeLayer(weatherLayer);if(quakeLayer&&!lmap.hasLayer(quakeLayer))quakeLayer.addTo(lmap);renderQuakeMarkers();}
  const wx=state.map.weather.filter(c=>c.temp!=null);
  if(state.mapMode==='weather'){$('#map-legend-label').textContent='TEMP. PROMEDIO';$('#map-legend-value').textContent=wx.length?Math.round(wx.reduce((a,c)=>a+c.temp,0)/wx.length)+'°C':'—';}
  else{$('#map-legend-label').textContent='SISMOS (30 d · M≥3)';$('#map-legend-value').textContent=state.map.quakes.length||'—';}
  setTimeout(()=>lmap&&lmap.invalidateSize(),60);
}

/* ---------- fuentes ---------- */
const sourceMeta=[['BCRP','Banco Central de Reserva','bcrp','BCR'],['SENAMHI / OPEN-METEO','Meteorología','weather','☀'],['IGP / USGS','Sismos','earthquakes','IGP'],['MIDAGRI','Desarrollo agrario','agriculture','♧'],['DHN','Hidrografía','maritime','⚓'],['SMV','Mercado de valores','smv','SMV'],['BVL','Bolsa de Lima','bvl','BVL'],['EL PERUANO','Diario Oficial','elPeruano','EP']];
function renderSources(){let active=0;$('#source-grid').innerHTML=sourceMeta.map(([name,desc,key,icon])=>{const d=state.data[key],on=d&&(d.status==='available'||d.status==='stale');if(on)active++;return`<a href="${d?.sourceUrl||'#'}" target="_blank" rel="noreferrer" class="source ${on?'on':'off'}"><i>${icon}</i><p><b>${name}<em></em></b><small>${desc}</small></p></a>`}).join('');$('#sources-count').textContent=`${active} / 8`;}

/* ---------- asistente IA (Gemini) ---------- */
const SYSTEM_PROMPT=`Eres "Radar Perú IA", el asistente del panel Radar Perú IA. Respondes SIEMPRE en español, breve y claro (máximo 4 frases). Tu único alcance es la información pública del Perú que muestra el panel: tipo de cambio, clima, sismos, agro (precios mayoristas), marina (estado del mar) y normas legales de El Peruano. Usa solo los DATOS ACTUALES que te entrego; no inventes cifras. Si preguntan algo fuera de ese alcance, redirígelo con amabilidad al contenido del panel.`;
const chatHistory=[];
function buildContext(){const d=state.data,L=[];const e=d.exchangeRate?.data;if(e)L.push(`Tipo de cambio (mercado referencial): compra S/ ${e.buy.toFixed(3)}, venta S/ ${e.sell.toFixed(3)}, variación ${e.variation}%.`);const w=d.weather?.data;if(w)L.push(`Clima en Lima: ${Math.round(w.temp)}°C, ${weatherLabel(w.weatherCode)}, humedad ${w.humidity}%, viento ${w.wind}.`);const q=d.earthquakes?.data;if(q)L.push(`Último sismo: magnitud ${q.magnitude.toFixed(1)}, ${q.location}, profundidad ${q.depth}.`);const a=d.agriculture?.data;if(a)L.push(`Agro (S/): ${a.map(r=>`${r.product} ${r.price.toFixed(2)}`).join(', ')}.`);const m=d.maritime?.data;if(m)L.push(`Marina (Callao): nivel ${m.level}, ${m.waves}.`);const n=d.elPeruano?.data;if(n)L.push(`Normas recientes (El Peruano): ${n.slice(0,4).map(x=>x.type).join('; ')}.`);if(state.map.quakes?.length)L.push(`Sismos recientes en Perú (30 d, M≥3): ${state.map.quakes.slice(0,6).map(x=>`M${x.mag}`).join(', ')}.`);const wx=state.map.weather.filter(c=>c.temp!=null);if(wx.length)L.push(`Temperatura por ciudad: ${wx.map(c=>`${c.n} ${Math.round(c.temp)}°`).join(', ')}.`);return L.join('\n')||'(sin datos cargados aún)';}
async function callGemini(model){
  const body={system_instruction:{parts:[{text:`${SYSTEM_PROMPT}\n\nDATOS ACTUALES DEL PANEL:\n${buildContext()}`}]},contents:chatHistory.slice(-8),generationConfig:{temperature:0.4,maxOutputTokens:600}};
  const r=await fetch(`${GEMINI.endpoint(model)}?key=${GEMINI.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json();const out=j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('').trim();
  if(!out)throw new Error('respuesta vacía');return out;
}
async function askGemini(text){if(!GEMINI.apiKey)throw new Error('sin API key (modo local)');chatHistory.push({role:'user',parts:[{text}]});let out;try{out=await callGemini(GEMINI.model);}catch(e){out=await callGemini(GEMINI.fallbackModel);}chatHistory.push({role:'model',parts:[{text:out}]});return out;}
if(typeof window!=='undefined')window.setGeminiKey=k=>{localStorage.setItem('radar-gemini-key',String(k||'').trim());return '✓ Clave Gemini guardada en este navegador.';};
function localAnswer(text){const t=(text||'').toLowerCase();const d=state.data;
  if(t.includes('clima')&&d.weather?.data){const w=d.weather.data;return`**Clima en Lima:** ${Math.round(w.temp)} °C, ${weatherLabel(w.weatherCode).toLowerCase()}.\nHumedad ${w.humidity}% · viento ${w.wind}.`;}
  if(t.includes('sismo')&&d.earthquakes?.data){const q=d.earthquakes.data;return`**Último sismo:** magnitud ${q.magnitude.toFixed(1)}.\n${q.location} · profundidad ${q.depth}.`;}
  if(t.includes('cambio')||t.includes('dólar')||t.includes('dolar')){const e=d.exchangeRate?.data;if(e)return`**Tipo de cambio (referencial):**\nCompra S/ ${e.buy.toFixed(3)} · venta S/ ${e.sell.toFixed(3)} (${e.variation}%).`;}
  if(t.includes('agro')||t.includes('precio')){const a=d.agriculture?.data;if(a)return`**Agro (precios mayoristas):**\n`+a.map(r=>`• ${r.product}: S/ ${r.price.toFixed(2)}/${r.unit}`).join('\n');}
  const d2=state.data,L=['**Resumen del panel:**'];const e=d2.exchangeRate?.data;if(e)L.push(`• **Dólar:** S/ ${e.sell.toFixed(3)} (venta)`);const w=d2.weather?.data;if(w)L.push(`• **Clima Lima:** ${Math.round(w.temp)}°C, ${weatherLabel(w.weatherCode).toLowerCase()}`);const q=d2.earthquakes?.data;if(q)L.push(`• **Sismo:** M${q.magnitude.toFixed(1)}, ${q.location}`);const m=d2.maritime?.data;if(m)L.push(`• **Mar (Callao):** nivel ${m.level}`);const a=d2.agriculture?.data;if(a)L.push(`• **Agro:** ${a.slice(0,3).map(r=>r.product+' S/'+r.price.toFixed(2)).join(' · ')}`);const n=d2.elPeruano?.data;if(n)L.push(`• **Normas:** ${n.length} recientes en El Peruano`);return L.join('\n');}

function pushMsg(who,html){const log=$('#assistant-log');const el=document.createElement('div');el.className='msg '+who;el.innerHTML=html;log.appendChild(el);log.scrollTop=log.scrollHeight;return el;}
let sending=false;
async function sendToAssistant(text){if(!text||sending)return;sending=true;pushMsg('user',escapeHtml(text));const typing=pushMsg('bot','<i class="dots"><b></b><b></b><b></b></i>');try{const reply=await askGemini(text);typing.innerHTML=mdLite(reply);}catch(e){typing.innerHTML=mdLite(localAnswer(text))+`<small class="warn-note">⚠ Modo local · Gemini no conectado</small>`;}$('#assistant-log').scrollTop=1e9;sending=false;}
function openAssistant(){const win=$('#assistant-window');win.hidden=false;$('#assistant-fab').classList.add('hide');const log=$('#assistant-log');if(!log.dataset.init){log.dataset.init='1';pushMsg('bot',`<b>Radar Perú IA</b><br>${mdLite('Hola 👋 Te informo del panel en tiempo real: tipo de cambio, clima, sismos, agro, marina y normas. Pregúntame lo que quieras o usa un atajo.')}`);}setTimeout(()=>$('#chat-input').focus(),50);}
function closeAssistant(){$('#assistant-window').hidden=true;$('#assistant-fab').classList.remove('hide');}

/* ---------- refresco ---------- */
async function refresh(){
  const btn=$('#refresh-btn');btn.classList.add('loading');document.querySelectorAll('.data-badge').forEach(x=>{if(x.closest('.metric-card')){x.textContent='CARGANDO';x.className='data-badge';}});
  const[entries]=await Promise.all([Promise.all(Object.entries(providers).map(async([k,p])=>[k,await p()])),loadMapData()]);
  state.data=Object.fromEntries(entries);
  renderCards();renderSources();await renderMap();
  $('#last-review').textContent=new Date().toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  state.refreshAt=Date.now()+300000;btn.classList.remove('loading');
}

/* ---------- listeners ---------- */
document.querySelectorAll('.metric-card').forEach(c=>{const open=()=>openDetail(c.dataset.card);c.addEventListener('click',e=>{if(e.target.closest('a'))return;open();});c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});
$('#modal-close').addEventListener('click',closeModal);$('#detail-modal').querySelector('[data-close]').addEventListener('click',closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
document.querySelectorAll('[data-map]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-map]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mapMode=b.dataset.map;renderMap();}));
$('#assistant-fab').addEventListener('click',openAssistant);$('#assistant-close').addEventListener('click',closeAssistant);
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();const v=$('#chat-input').value.trim();$('#chat-input').value='';sendToAssistant(v);});
const presets={summary:'Dame un resumen general del panel ahora.',weather:'¿Cómo está el clima en Lima y otras ciudades?',earthquakes:'¿Cuál fue el último sismo y los más recientes?',exchangeRate:'¿A cuánto está el tipo de cambio?',agriculture:'¿Cómo están los precios de agro?'};
document.querySelectorAll('.aw-chips button').forEach(b=>b.addEventListener('click',()=>sendToAssistant(presets[b.dataset.query]||b.textContent)));
$('#refresh-btn').addEventListener('click',refresh);
setInterval(()=>{const s=Math.max(0,Math.ceil((state.refreshAt-Date.now())/1000));$('#refresh-countdown').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(s===0)refresh();},1000);
refresh();
