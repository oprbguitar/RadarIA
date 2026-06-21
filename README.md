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

## Datos y arquitectura de proveedores

Todos los proveedores de `js/providers.js` devuelven el contrato normalizado `sourceName`, `sourceUrl`, `category`, `lastUpdated`, `status`, `isDemo`, `data`, `error` y `note`.

- **Clima:** dato real desde Open-Meteo, consumido directamente desde el navegador.
- **Sismos:** dato real desde USGS como respaldo público mientras IGP/CENSIS no exponga un endpoint frontend estable.
- **Tipo de cambio:** dato real (USD/PEN de mercado) desde open.er-api.com (sin API key, con CORS). Es una tasa **referencial de mercado**, no el oficial SUNAT (este exige token + backend). El historial/variación del sparkline se construye con tasas reales guardadas en `localStorage` entre refrescos.
- **Marina:** estado del mar real (altura, periodo y dirección de ola frente al Callao) desde Open-Meteo Marine.
- **Normas / El Peruano:** dato real desde la búsqueda oficial de El Peruano (GraphQL `getGenericPublication`). No tiene CORS para el navegador, así que lo descarga el SCRAPE-TIER y la app lee `data/normas.json`.
- **Agricultura:** servida desde `data/agro.json`. Hoy es un set **referencial** (`DEMO`): la fuente real (EMMSA) expone los precios tras un grid con estado que requiere navegador headless; queda documentado en `scripts/scrape.mjs`.

## SCRAPE-TIER (`scripts/scrape.mjs` + GitHub Actions)

GitHub Pages no puede llamar fuentes sin CORS ni con estado. Para esas fuentes hay un scraper Node sin dependencias (`scripts/scrape.mjs`) que corre en GitHub Actions (`.github/workflows/scrape.yml`, cron diario 05:10 hora de Lima) y deja JSON estático en `/data`. La app solo lee ese JSON (rápido, sin CORS). Para ejecutarlo localmente:

```powershell
node scripts/scrape.mjs
```

Genera `data/normas.json` (real) y `data/agro.json` (referencial). El workflow commitea los JSON al repo cuando cambian, lo que dispara el redeploy de Pages.
- **BVL y SMV:** estado inactivo con mensaje `Conector backend requerido`; no se fabrican cotizaciones.
- **BCRP:** adaptador preparado. La integración real depende de un endpoint compatible con CORS o un proxy.

Las respuestas reales exitosas se guardan en `localStorage`. Si una fuente falla, el panel conserva el último resultado exitoso y lo marca como `CACHÉ`; si no existe caché, muestra `Fuente no disponible temporalmente`.

El panel se actualiza automáticamente cada cinco minutos y permite actualización manual. GitHub Pages no puede almacenar secretos ni resolver bloqueos CORS, autenticación o scraping: esas fuentes requieren un backend o proxy serverless.

## Cartografía

El contorno nacional se renderiza desde `data/peru.geojson`, extraído del dataset abierto **Natural Earth Admin 0 Countries (1:110m)**. Natural Earth publica sus datos en dominio público. El archivo se sirve localmente para evitar dependencias externas en tiempo de ejecución.

## Publicar en GitHub Pages

En GitHub abre **Settings → Pages**, selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`. El sitio quedará disponible en `https://oprbguitar.github.io/RadarIA/`.

## Archivos

- `index.html`: estructura accesible de la interfaz.
- `styles.css`: sistema visual, escritorio, tablet y móvil.
- `app.js`: estado, renderizado, mapa, chatbot e interacciones.
- `js/providers.js`: adaptadores normalizados, APIs públicas y caché.
- `data/mock-data.js`: contrato y datos demostrativos por fuente.
