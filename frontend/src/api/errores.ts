/**
 * Cómo se lee un error de la API.
 *
 * `apiClient` lanza un objeto plano, no una instancia de `Error`, así que el
 * `err instanceof Error ? err.message : …` que se repetía en las pantallas
 * nunca entraba: el mensaje del backend se perdía y el usuario veía siempre el
 * texto por defecto. En el login eso decía "Credenciales inválidas" aunque la
 * causa fuera otra.
 */
import type { ApiError } from './client';

/** Lo que el backend responde cuando corta por intentos repetidos. */
export const DEMASIADOS_INTENTOS = 'DEMASIADOS_INTENTOS';

function esApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'message' in err;
}

/**
 * El texto que se le muestra al usuario. El mensaje del backend manda, porque
 * ya viene redactado y en español; `respaldo` es para cuando no llegó ninguno,
 * como en un corte de red.
 */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (esApiError(err) && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return respaldo;
}

/**
 * El mensaje de un corte por intentos repetidos, con la espera cuando el
 * servidor la informó. Sin ella queda el texto del backend, que ya dice que
 * hay que esperar un momento.
 */
export function mensajeDeEspera(err: unknown): string {
  const base = mensajeDeError(err, 'Demasiados intentos. Espere un momento y vuelva a intentarlo.');
  const segundos = esApiError(err) ? err.retryAfter : undefined;
  if (!segundos) return base;
  const minutos = Math.ceil(segundos / 60);
  return segundos < 60
    ? `${base} Vuelva a intentarlo en ${segundos} segundos.`
    : `${base} Vuelva a intentarlo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`;
}

/** El código del backend, para distinguir un caso concreto. */
export function codigoDeError(err: unknown): string | undefined {
  return esApiError(err) ? err.code : undefined;
}

/**
 * El servidor cortó por demasiados intentos seguidos. Se reconoce por el
 * código y, si el backend no lo mandó, por el 429.
 */
export function esDemasiadosIntentos(err: unknown): boolean {
  if (!esApiError(err)) return false;
  return err.code === DEMASIADOS_INTENTOS || err.status === 429;
}
