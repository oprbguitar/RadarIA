# Radar Perú IA

Dashboard web responsivo y demostrativo que reúne, en una sola interfaz, normas oficiales, finanzas, tipo de cambio, BVL/SMV, clima, agricultura, avisos marítimos, sismos y estado de fuentes públicas del Perú.

## Módulos

- Asistente limitado al alcance informativo del panel.
- Tipo de cambio, clima, sismos, agro, marina y normas de El Peruano.
- Mapa interactivo con modos Clima y Sismos.
- Fuentes verificadas: BCRP, SENAMHI, IGP, MIDAGRI, DHN, SMV, BVL y El Peruano.

## Ejecutar localmente

Por usar módulos ES, inicia un servidor estático desde esta carpeta:

```powershell
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

## Datos demostrativos y APIs reales

`data/mock-data.js` contiene datos de ejemplo. Cada registro señala `note: "dato demostrativo"`; no debe interpretarse como información vigente. `app.js` contiene un adaptador independiente por proveedor (`fetchBcrpData()`, `fetchWeatherData()`, `fetchEarthquakeData()`, `fetchElPeruanoData()`, etc.). Para integrar datos reales, sustituye el retorno de cada adaptador por una llamada a la API oficial correspondiente.

GitHub Pages no puede almacenar secretos ni resolver por sí solo bloqueos CORS o scraping. Una fuente que requiera credenciales, scraping o cabeceras de servidor debe conectarse mediante un backend o proxy serverless.

## Publicar en GitHub Pages

En GitHub abre **Settings → Pages**, selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`. El sitio quedará disponible en `https://oprbguitar.github.io/RadarIA/`.

## Archivos

- `index.html`: estructura accesible de la interfaz.
- `styles.css`: sistema visual, escritorio, tablet y móvil.
- `app.js`: adaptadores, renderizado e interacciones.
- `data/mock-data.js`: contrato y datos demostrativos por fuente.
