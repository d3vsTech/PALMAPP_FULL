/**
 * Punto único de lectura de variables de entorno del frontend.
 *
 * Todas las URLs de backend (Laravel, FastAPI del agente, etc.) viven aquí.
 * Ningún otro archivo debería leer `import.meta.env.VITE_*` directamente ni
 * hardcodear hosts/IPs — eso causó bugs cuando migramos el VPS y dejamos
 * `31.97.7.50` regado en 8 archivos. Si necesitas un nuevo entorno, agrega
 * la variable a `.env.example`, expórtala aquí, e importa.
 *
 * Convenciones:
 *  - El valor del .env es la **única** fuente de verdad. Sin fallback a IPs.
 *  - Si falta una variable crítica, `console.error` lo deja registrado al
 *    arrancar la app; las llamadas posteriores fallarán de forma obvia
 *    (no apuntarán a un VPS olvidado).
 *  - Los valores se normalizan: se les quita la barra final para que el
 *    consumidor pueda concatenar siempre con `${BASE}/v1/...`.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function readEnv(key: string, opts: { required: boolean }): string {
  // Vite expone las variables `VITE_*` en `import.meta.env`. El cast a Record
  // evita el any-pollution porque el tipo generado no incluye claves dinámicas.
  const raw = (import.meta.env as unknown as Record<string, string | undefined>)[key];
  const value = (raw ?? '').trim();
  if (!value && opts.required) {
    // eslint-disable-next-line no-console
    console.error(
      `[env] Falta la variable de entorno ${key}. ` +
      'Define el valor en frontend/.env (ver .env.example).',
    );
  }
  return value;
}

/**
 * URL base del backend Laravel.
 * Ejemplos válidos:
 *   - http://localhost:8000/api
 *   - http://agro-campo.test/api
 *   - https://api.tudominio.com/api
 *
 * El consumidor concatena con `${API_URL}/v1/tenant/...` o `${API_URL}/v1/admin-auth/...`.
 */
export const API_URL = stripTrailingSlash(readEnv('VITE_API_URL', { required: true }));

/**
 * URL pública del propio frontend. Usada por el backend para construir
 * enlaces en correos (reset de password, invitaciones, etc.) y por algunas
 * pantallas que arman URLs absolutas para compartir.
 */
export const APP_URL = stripTrailingSlash(readEnv('VITE_APP_URL', { required: false }));

/**
 * URL del backend FastAPI del Agente IA. Por defecto (sin override) usamos
 * rutas relativas:
 *   - En HTTPS (Netlify): `/agro-api` que `public/_redirects` proxea al
 *     backend HTTP del agente para evitar Mixed Content.
 *   - En HTTP local: el proxy de Vite (`/agro-agente` en vite.config.ts)
 *     se encarga.
 * Si está definida `VITE_AGRO_AGENTE_URL` se respeta tal cual (útil para
 * apuntar a un agente desplegado en otro host).
 */
const AGRO_RAW = readEnv('VITE_AGRO_AGENTE_URL', { required: false });
export const AGRO_AGENTE_URL = AGRO_RAW
  ? stripTrailingSlash(AGRO_RAW)
  : ''; // vacío → el cliente del agente decide por protocolo (ver `agroAgente.ts`).
