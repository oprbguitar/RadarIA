import { mockData } from '../data/mock-data.js';

const CACHE_PREFIX = 'radar-peru:';
const normalize = (key, value) => ({ sourceName:value.sourceName, sourceUrl:value.sourceUrl, category:key, lastUpdated:value.lastUpdated, status:value.status, isDemo:true, data:structuredClone(value.data), error:null, note:value.note || 'Dato demostrativo' });
const unavailable = (category, sourceName, sourceUrl, note='Conector backend requerido') => ({ sourceName, sourceUrl, category, lastUpdated:new Date().toISOString(), status:'unavailable', isDemo:false, data:null, error:note, note });

async function withCache(category, request) {
  try {
    const result = await request();
    if (result.status === 'available' && !result.isDemo) localStorage.setItem(CACHE_PREFIX + category, JSON.stringify(result));
    return result;
  } catch (error) {
    const cached = localStorage.getItem(CACHE_PREFIX + category);
    if (cached) return { ...JSON.parse(cached), status:'stale', error:error.message, note:'Último dato real guardado · fuente temporalmente no disponible' };
    return unavailable(category, category, '#', 'Fuente no disponible temporalmente');
  }
}

export function fetchWeatherData() {
  return withCache('weather', async () => {
    const url='https://api.open-meteo.com/v1/forecast?latitude=-12.0464&longitude=-77.0428&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America%2FLima&forecast_days=3';
    const response=await fetch(url); if(!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const json=await response.json();
    return { sourceName:'Open-Meteo', sourceUrl:'https://open-meteo.com/', category:'weather', lastUpdated:json.current.time, status:'available', isDemo:false, data:{ city:'Lima', temp:json.current.temperature_2m, humidity:json.current.relative_humidity_2m, wind:`${json.current.wind_speed_10m} km/h`, weatherCode:json.current.weather_code, forecast:json.daily.time.map((day,i)=>({day,max:json.daily.temperature_2m_max[i],min:json.daily.temperature_2m_min[i],code:json.daily.weather_code[i]})) }, error:null, note:'Dato real · Open-Meteo' };
  });
}

export function fetchEarthquakeData() {
  return withCache('earthquakes', async () => {
    const start=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    const url=`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minlatitude=-20&maxlatitude=1&minlongitude=-82&maxlongitude=-68&orderby=time&limit=1`;
    const response=await fetch(url); if(!response.ok) throw new Error(`USGS HTTP ${response.status}`);
    const json=await response.json(); const feature=json.features?.[0]; if(!feature) throw new Error('Sin eventos recientes en el área consultada');
    return { sourceName:'USGS (respaldo público)', sourceUrl:'https://earthquake.usgs.gov/', category:'earthquakes', lastUpdated:new Date(feature.properties.time).toISOString(), status:'available', isDemo:false, data:{ magnitude:feature.properties.mag, depth:`${feature.geometry.coordinates[2].toFixed(0)} km`, location:feature.properties.place, datetime:new Date(feature.properties.time).toISOString(), lon:feature.geometry.coordinates[0], lat:feature.geometry.coordinates[1] }, error:null, note:'Dato real · respaldo USGS' };
  });
}

// Tipo de cambio REAL · open.er-api.com (sin API key, con CORS).
// Tasa de mercado USD/PEN referencial (no es el oficial SUNAT, que exige backend).
// El historial/variación se construye con tasas reales guardadas entre refrescos.
const FX_HISTORY_KEY = CACHE_PREFIX + 'fx-history';
export function fetchExchangeRateData() {
  return withCache('exchangeRate', async () => {
    const response = await fetch('https://open.er-api.com/v6/latest/USD'); if(!response.ok) throw new Error(`open.er-api HTTP ${response.status}`);
    const json = await response.json(); const pen = json?.rates?.PEN; if(!pen) throw new Error('Tasa PEN no disponible');
    const sell = Number(pen.toFixed(4)); const buy = Number((pen * 0.997).toFixed(4));
    let history = []; try { history = JSON.parse(localStorage.getItem(FX_HISTORY_KEY)) || []; } catch {}
    if (!history.length || Math.abs(history[history.length-1] - sell) > 1e-6) history.push(sell);
    history = history.slice(-12); localStorage.setItem(FX_HISTORY_KEY, JSON.stringify(history));
    const prev = history.length > 1 ? history[history.length-2] : sell;
    const variation = prev ? Number((((sell - prev) / prev) * 100).toFixed(2)) : 0;
    return { sourceName:'open.er-api.com (mercado)', sourceUrl:'https://www.exchangerate-api.com/', category:'exchangeRate', lastUpdated:json.time_last_update_utc || new Date().toISOString(), status:'available', isDemo:false, data:{ buy, sell, variation, history }, error:null, note:'Dato real · tasa de mercado referencial' };
  });
}
export const fetchBcrpData = async () => normalize('bcrp', mockData.bcrp);
export const fetchAgricultureData = async () => normalize('agriculture', mockData.agriculture);

// Estado del mar REAL · Open-Meteo Marine (sin API key, con CORS) frente al Callao.
const degToCompass = d => ['N','NE','E','SE','S','SO','O','NO'][Math.round(((d||0) % 360) / 45) % 8];
export function fetchMaritimeData() {
  return withCache('maritime', async () => {
    const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=-12.06&longitude=-77.16&current=wave_height,wave_direction,wave_period&timezone=America%2FLima';
    const response = await fetch(url); if(!response.ok) throw new Error(`Open-Meteo Marine HTTP ${response.status}`);
    const json = await response.json(); const cur = json.current || {}; const h = cur.wave_height; if(h == null) throw new Error('Sin dato de oleaje');
    const level = h >= 2.5 ? 'ALTO' : h >= 1.5 ? 'MODERADO' : 'NORMAL';
    return { sourceName:'Open-Meteo Marine', sourceUrl:'https://open-meteo.com/en/docs/marine-weather-api', category:'maritime', lastUpdated:cur.time || new Date().toISOString(), status:'available', isDemo:false, data:{ title:'Estado del mar · Callao', level, coast:'Callao · litoral central', waves:`Altura ${h} m · periodo ${cur.wave_period} s · dirección ${degToCompass(cur.wave_direction)} (${Math.round(cur.wave_direction)}°)`, validity:'Condición actual' }, error:null, note:'Dato real · Open-Meteo Marine' };
  });
}
export const fetchElPeruanoData = async () => normalize('elPeruano', mockData.elPeruano);
export const fetchBvlData = async () => unavailable('bvl','BVL','https://www.bvl.com.pe/');
export const fetchSmvData = async () => unavailable('smv','SMV','https://www.smv.gob.pe/');

export const providers = { exchangeRate:fetchExchangeRateData, bcrp:fetchBcrpData, weather:fetchWeatherData, earthquakes:fetchEarthquakeData, agriculture:fetchAgricultureData, maritime:fetchMaritimeData, elPeruano:fetchElPeruanoData, bvl:fetchBvlData, smv:fetchSmvData };
