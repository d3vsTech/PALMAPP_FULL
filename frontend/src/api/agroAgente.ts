/**
 * agroAgente.ts
 * Servicio API para el chat del Agente IA (AgroAgente / FastAPI).
 *
 * Backend:
 *   Producción: http://31.97.7.50/agro-agente/api
 *   Desarrollo: proxy de Vite en /agro-agente/api (ver vite.config.ts)
 *
 * Auth:
 *   Reutiliza el JWT que ya tiene el usuario en localStorage bajo la clave
 *   'palmapp_token'. La API de AgroAgente verifica el token con el mismo
 *   JWT_SECRET que Laravel, así que no requiere login adicional.
 *
 *   IMPORTANTE: el JWT debe incluir `tenant_id`, es decir, el usuario debe
 *   haber llamado antes a /select-tenant en Laravel. Si no, el backend
 *   responde 400 "Debe seleccionar una finca".
 */

// URL base del backend del Agente IA (FastAPI).
// Por defecto apunta directo al server de producción para evitar depender
// de configuración de proxy. FastAPI tiene CORS abierto (allow_origins=["*"]),
// así que las llamadas cross-origin desde localhost funcionan.
// Para overridear, usar la env var VITE_AGRO_AGENTE_URL.
const AGRO_API =
  (import.meta.env.VITE_AGRO_AGENTE_URL as string | undefined)?.trim() ??
  'http://31.97.7.50/agro-agente/api';

// ────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: number;
  titulo: string;
  created_at: string;
  updated_at: string;
  last_message_preview?: string | null;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

// ────────────────────────────────────────────────────────────────────────
// Helper: hacer una petición HTTP autenticada
// ────────────────────────────────────────────────────────────────────────

interface AgroError extends Error {
  status: number;
  detail?: string;
}

async function agroFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('palmapp_token');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${AGRO_API}${path}`;

  // ── Hacer la petición ──
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (netErr: any) {
    console.error('[AgroAgente] Error de red:', netErr, 'URL:', url);
    const err: AgroError = Object.assign(
      new Error('No se pudo conectar al servidor del Agente IA. Verifica tu conexión o que el backend esté disponible.'),
      { status: 0 as const },
    );
    throw err;
  }

  // ── Leer el body ──
  let body: any = null;
  if (res.status !== 204) {
    const ct = res.headers.get('content-type') ?? '';
    try {
      body = ct.includes('application/json') ? await res.json() : await res.text();
    } catch {
      body = null;
    }
  }

  // ── OK ──
  if (res.ok) {
    return body as T;
  }

  // ── Error ──
  // FastAPI devuelve { detail: "mensaje" } o { detail: [{msg:...}] }
  let detail = '';
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') detail = body.detail;
    else if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0];
      detail = typeof first === 'string' ? first : (first?.msg ?? '');
    }
  }

  let message: string;
  switch (res.status) {
    case 400: message = detail || 'Debes seleccionar una finca antes de usar el chat.'; break;
    case 401: message = 'Tu sesión expiró. Inicia sesión de nuevo.'; break;
    case 403: message = detail || 'No tienes permiso para usar el chat.'; break;
    case 404: message = detail || 'Conversación no encontrada.'; break;
    case 502: message = 'El asistente no está disponible. Intenta en unos segundos.'; break;
    default:  message = detail || `Error ${res.status}`; break;
  }

  console.warn(`[AgroAgente] ${res.status} ${path}:`, message);
  const err: AgroError = Object.assign(new Error(message), {
    status: res.status,
    detail,
  });
  throw err;
}

// ────────────────────────────────────────────────────────────────────────
// Endpoints públicos del API
// ────────────────────────────────────────────────────────────────────────

export const agroAgenteApi = {
  /** GET /chat/sessions — lista las conversaciones del usuario actual. */
  listarSesiones: async (): Promise<ChatSession[]> => {
    const r = await agroFetch<any>('/chat/sessions');
    // Puede venir como array directo o envuelto en {data: [...]}
    const lista = Array.isArray(r) ? r : (r?.data ?? []);
    console.log('[AgroAgente] listarSesiones:', lista);
    return lista;
  },

  /** POST /chat/sessions — crea una nueva conversación (opcionalmente con título). */
  crearSesion: async (titulo?: string): Promise<ChatSession> => {
    const r = await agroFetch<any>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ titulo: titulo ?? '' }),
    });
    // Puede venir como objeto directo o envuelto en {data: {...}}
    const sesion = r?.data ?? r;
    console.log('[AgroAgente] crearSesion respuesta:', r, '→ extraída:', sesion);
    if (!sesion || typeof sesion.id !== 'number') {
      throw new Error('El backend devolvió una conversación con formato inesperado');
    }
    return sesion;
  },

  /** GET /chat/sessions/{id}/messages — historial de mensajes de una sesión. */
  cargarMensajes: async (sessionId: number): Promise<ChatMessage[]> => {
    const r = await agroFetch<any>(`/chat/sessions/${sessionId}/messages`);
    const lista = Array.isArray(r) ? r : (r?.data ?? []);
    console.log(`[AgroAgente] cargarMensajes(${sessionId}):`, lista);
    return lista;
  },

  /** POST /chat/sessions/{id}/messages — envía un mensaje; devuelve user + assistant. */
  enviarMensaje: async (sessionId: number, content: string): Promise<SendMessageResponse> => {
    console.log(`[AgroAgente] enviarMensaje → sesión ${sessionId}:`, content);
    const r = await agroFetch<any>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    const resp: SendMessageResponse = r?.data ?? r;
    console.log('[AgroAgente] enviarMensaje respuesta:', resp);
    return resp;
  },

  /** DELETE /chat/sessions/{id} — elimina la conversación y sus mensajes. */
  eliminarSesion: (sessionId: number): Promise<void> =>
    agroFetch<void>(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),
};