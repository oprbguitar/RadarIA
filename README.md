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
- **Tipo de cambio, agricultura, marina y El Peruano:** datos demostrativos claramente marcados como `DEMO`.
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
