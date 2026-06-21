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

export const fetchExchangeRateData = async () => normalize('exchangeRate', mockData.exchangeRate);
export const fetchBcrpData = async () => normalize('bcrp', mockData.bcrp);
export const fetchAgricultureData = async () => normalize('agriculture', mockData.agriculture);
export const fetchMaritimeData = async () => normalize('maritime', mockData.maritime);
export const fetchElPeruanoData = async () => normalize('elPeruano', mockData.elPeruano);
export const fetchBvlData = async () => unavailable('bvl','BVL','https://www.bvl.com.pe/');
export const fetchSmvData = async () => unavailable('smv','SMV','https://www.smv.gob.pe/');

export const providers = { exchangeRate:fetchExchangeRateData, bcrp:fetchBcrpData, weather:fetchWeatherData, earthquakes:fetchEarthquakeData, agriculture:fetchAgricultureData, maritime:fetchMaritimeData, elPeruano:fetchElPeruanoData, bvl:fetchBvlData, smv:fetchSmvData };
