/* ============================================================================
   config.js · Configuración del asistente IA (Gemini)
   ----------------------------------------------------------------------------
   La clave NO se guarda en el código fuente: GitHub bloquea secretos en repos
   públicos (Push Protection) y, además, un sitio 100% estático la expondría a
   cualquiera. Por eso se resuelve en tiempo de ejecución, en este orden:
     1) window.RADAR_GEMINI_KEY   (p. ej. un js/secret.js que NO se commitea)
     2) localStorage['radar-gemini-key']
   Para habilitar Gemini en TU navegador, abre la consola (F12) y ejecuta:
     setGeminiKey('TU_API_KEY')      // queda guardada en este navegador
   Si no hay clave, el asistente responde en modo local (resumen del panel).
   ============================================================================ */
export const GEMINI = {
  get apiKey() {
    try { return (typeof window !== 'undefined' && (window.RADAR_GEMINI_KEY || localStorage.getItem('radar-gemini-key'))) || ''; }
    catch { return ''; }
  },
  model: 'gemini-2.5-flash-lite',     // verificado con cuota disponible
  fallbackModel: 'gemini-2.5-flash',
  endpoint: m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
};
