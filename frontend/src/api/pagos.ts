/**
 * api/pagos.ts
 *
 * Cliente de la pasarela de pagos del Market — integración real con ePayco
 * Checkout v2 (ver API_MARKET.md §10 y PLAN_INTEGRACION_EPAYCO.md).
 *
 * Endpoints backend:
 *   POST /api/v1/tenant/market/pedidos/{codigo}/pago/iniciar
 *   GET  /api/v1/tenant/market/pedidos/{codigo}/pago/estado
 *
 * Flujo:
 *   1. Frontend crea pedido con `metodo_pago = 'epayco'` (ya existe en marketApi).
 *   2. Llama `pagosApi.iniciar(codigo, billing)` → recibe { session_id, test }.
 *   3. Abre el widget ePayco: `ePayco.checkout.configure({sessionId, type:'onpage', test}).open()`.
 *   4. Al terminar el usuario (`onResponse` del SDK) se hace polling a
 *      `pagosApi.estado(codigo)` hasta que el estado deje de ser 'procesando'.
 *   5. Redirige a `/market/pago/resultado?x_extra1=<codigo>` mostrando el estado real.
 *
 * NOTA: `estado_pago` del pedido no es el mismo que `estado` de un intento
 * individual (`MarketPedidoPago`). El primero refleja el resumen; el segundo
 * viene en `ultimo_pago`.
 */

import { requestConToken } from './request';

const BASE = '/api/v1/tenant/market';

function tkn() { return localStorage.getItem('palmapp_token'); }

function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, tkn());
}
function get<T>(path: string): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, { method: 'GET' }, tkn());
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** §10.3 — valores de `estado_pago` en el pedido. */
export type EstadoPago =
  | 'pendiente'    // Estado inicial; sin pago procesado
  | 'procesando'   // Sesión ePayco iniciada o webhook pendiente
  | 'pagado'       // Pago aprobado (Aceptada)
  | 'rechazado'    // Pago rechazado
  | 'fallido';     // Pago fallido

/** §10.2 — métodos de pago permitidos por el backend. */
export type MetodoPago = 'epayco' | 'transferencia' | 'contra_entrega';

/** Datos de facturación requeridos por ePayco (§10.4). */
export interface BillingInfo {
  email: string;
  name: string;
  doc_type: 'CC' | 'CE' | 'NIT' | 'TI' | 'PPN';
  doc_number: string;
  phone: string;
  address?: string;
  city?: string;
  /** ISO alpha-2. */
  country?: string;
}

export interface IniciarPagoResponse {
  data: {
    session_id: string;
    test: boolean;
  };
}

export interface UltimoPago {
  estado: 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado' | 'fallido';
  franchise?: string | null;
  approval_code?: string | null;
  response_reason?: string | null;
  fecha_procesado?: string | null;
}

export interface EstadoPagoResponse {
  data: {
    estado_pago: EstadoPago;
    estado_pedido: string;
    ultimo_pago: UltimoPago | null;
  };
}

/** Códigos de error específicos de la pasarela (§10.6). */
export const PagoErrorCodes = {
  PAGO_METODO_INVALIDO: 'PAGO_METODO_INVALIDO',
  PAGO_YA_APROBADO: 'PAGO_YA_APROBADO',
  PEDIDO_CANCELADO: 'PEDIDO_CANCELADO',
  EPAYCO_UNAVAILABLE: 'EPAYCO_UNAVAILABLE',
  PEDIDO_NOT_FOUND: 'PEDIDO_NOT_FOUND',
} as const;

// ─── API ─────────────────────────────────────────────────────────────────────

export const pagosApi = {
  /**
   * Crea la sesión ePayco para un pedido con `metodo_pago='epayco'`.
   * POST /market/pedidos/{codigo}/pago/iniciar
   */
  iniciar: (codigo: string, billing: BillingInfo) =>
    post<IniciarPagoResponse>(`/pedidos/${codigo}/pago/iniciar`, { billing }),

  /**
   * Consulta el estado actual del pago del pedido. Se usa para polling tras
   * el `onResponse` del widget y en la pantalla de resultado.
   * GET /market/pedidos/{codigo}/pago/estado
   */
  estado: (codigo: string) =>
    get<EstadoPagoResponse>(`/pedidos/${codigo}/pago/estado`),
};

// ─── Widget ePayco (client-side) ─────────────────────────────────────────────

/**
 * Handler global del SDK checkout-v2.js. Se carga desde index.html:
 *   <script src="https://checkout.epayco.co/checkout-v2.js"></script>
 */
declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (opts: { sessionId: string; type: 'onpage' | 'standard'; test: boolean }) => {
          setHooks: (hooks: {
            onCreated?: (data?: any) => void;
            onResponse?: (response?: any) => void;
            onErrors?: (error?: any) => void;
            onClosed?: (errors?: any) => void;
          }) => void;
          open: () => void;
        };
      };
    };
  }
}

export interface AbrirCheckoutHooks {
  /** Se dispara cuando el usuario termina/intenta pagar. Aquí se hace polling
   *  al backend porque `response` no es autoritativo. */
  onResponse?: (response?: any) => void;
  /** Error abriendo el widget (SDK no disponible, session_id inválida, etc). */
  onErrors?: (error?: any) => void;
  /** Usuario cerró el modal sin completar. */
  onClosed?: (errors?: any) => void;
  /** Modal abierto — útil para ocultar spinner. */
  onCreated?: (data?: any) => void;
}

/**
 * Abre el widget de checkout de ePayco. Requiere que `checkout-v2.js` esté
 * cargado (lo agregamos en `index.html`).
 */
export function abrirCheckoutEpayco(
  sessionId: string,
  test: boolean,
  hooks: AbrirCheckoutHooks = {},
): void {
  if (!window.ePayco?.checkout) {
    throw new Error(
      'El SDK de ePayco no está cargado. Verifica que index.html incluya checkout-v2.js.',
    );
  }
  const checkout = window.ePayco.checkout.configure({
    sessionId,
    type: 'onpage',
    test,
  });
  // setHooks() debe ir ANTES de open() (§10.5 del doc).
  checkout.setHooks({
    onCreated: hooks.onCreated,
    onResponse: hooks.onResponse,
    onErrors: hooks.onErrors,
    onClosed: hooks.onClosed,
  });
  checkout.open();
}

// ─── Etiquetas UI ────────────────────────────────────────────────────────────

export const ESTADO_PAGO_LABEL: Record<EstadoPago, { label: string; color: string }> = {
  pendiente:  { label: 'Sin pagar',    color: 'bg-muted text-muted-foreground border-border' },
  procesando: { label: 'Procesando',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  pagado:     { label: 'Pagado',       color: 'bg-success/10 text-success border-success/30' },
  rechazado:  { label: 'Rechazado',    color: 'bg-destructive/10 text-destructive border-destructive/30' },
  fallido:    { label: 'Fallido',      color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  epayco:        'Pago en línea (ePayco)',
  transferencia: 'Transferencia bancaria',
  contra_entrega: 'Pago contra entrega',
};
