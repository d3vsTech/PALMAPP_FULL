/**
 * api/pagos.ts
 *
 * Cliente de la pasarela de pagos del Market. **Todo el módulo está mockeado
 * mientras el backend construye los endpoints reales.** El objetivo es que
 * todo el flujo UI (Checkout, modal de pago, callback, badges de estado)
 * quede armado y navegable, y cuando el backend entregue las rutas solo se
 * reemplace el cuerpo de las funciones de `pagosApi` — la UI no se toca.
 *
 * Contrato eventual con backend (propuesta):
 *   POST /market/pedidos/{codigo}/iniciar-pago
 *     → { reference: string, public_key: string, amount_cents: number }
 *   POST /market/pedidos/{codigo}/confirmar-pago
 *     body: { transaction_id: string, provider: 'WOMPI' | 'EPAYCO' | 'MOCK' }
 *     → { estado_pago: EstadoPago, provider_reference: string }
 *   GET  /market/pedidos/{codigo}/estado-pago
 *     → { estado_pago: EstadoPago, transaction_id?: string, fecha_pago?: string }
 *
 * Mientras tanto, persistimos el estado del pago en `sessionStorage` bajo la
 * clave `palmapp:pagos:{codigo}`. Esto es solo para poder ver el estado
 * en `Pedidodetalle` y `Pedidos` durante la demo — se elimina al conectar
 * con el backend real.
 */

export type EstadoPago =
  | 'no_iniciado'   // El pedido se creó pero aún no se ha intentado pagar.
  | 'procesando'   // El widget está abierto o el gateway está confirmando.
  | 'aprobado'    // Cobro exitoso.
  | 'rechazado'   // Tarjeta rechazada / fondos insuficientes.
  | 'fallido';    // Error del gateway / timeout.

export interface IniciarPagoResponse {
  reference: string;
  public_key: string;
  amount_cents: number;
  provider: 'WOMPI' | 'EPAYCO' | 'MOCK';
}

export interface ConfirmarPagoResponse {
  estado_pago: EstadoPago;
  provider_reference: string;
  fecha_pago: string;
}

export interface EstadoPagoResponse {
  estado_pago: EstadoPago;
  transaction_id?: string;
  provider_reference?: string;
  fecha_pago?: string;
  provider?: string;
}

const STORAGE_PREFIX = 'palmapp:pagos:';

interface PagoLocal {
  estado_pago: EstadoPago;
  transaction_id?: string;
  provider_reference?: string;
  fecha_pago?: string;
  provider?: string;
  amount_cents: number;
}

function leerPago(codigo: string): PagoLocal | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${codigo}`);
    if (!raw) return null;
    return JSON.parse(raw) as PagoLocal;
  } catch {
    return null;
  }
}

function guardarPago(codigo: string, pago: PagoLocal): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${codigo}`, JSON.stringify(pago));
  } catch {
    // sessionStorage lleno — ignorar (el pago sigue funcionando en memoria).
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generarReferencia(codigo: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `MOCK-${codigo}-${rand}`;
}

function generarTransactionId(): string {
  const rand = Math.random().toString(36).slice(2, 12).toUpperCase();
  return `TXN-${rand}`;
}

export const pagosApi = {
  /**
   * Registra la intención de pago en el backend (o mock). Devuelve la
   * referencia y la public_key necesarias para abrir el widget.
   * REAL: POST /market/pedidos/{codigo}/iniciar-pago
   */
  async iniciarPago(codigo: string, totalPesos: number): Promise<IniciarPagoResponse> {
    await delay(600);
    const reference = generarReferencia(codigo);
    guardarPago(codigo, {
      estado_pago: 'procesando',
      amount_cents: Math.round(totalPesos * 100),
      provider_reference: reference,
      provider: 'MOCK',
    });
    return {
      reference,
      public_key: 'pub_test_MOCK_PUBLIC_KEY',
      amount_cents: Math.round(totalPesos * 100),
      provider: 'MOCK',
    };
  },

  /**
   * Confirma en backend el resultado que devolvió el widget. Backend real
   * consulta la API del gateway con su private_key para verificar que la
   * transacción existe y el monto coincide antes de marcar aprobado.
   * REAL: POST /market/pedidos/{codigo}/confirmar-pago
   */
  async confirmarPago(
    codigo: string,
    transactionId: string,
    resultado: 'aprobado' | 'rechazado' | 'fallido',
  ): Promise<ConfirmarPagoResponse> {
    await delay(900);
    const previo = leerPago(codigo);
    const providerRef = previo?.provider_reference ?? generarReferencia(codigo);
    const fecha = new Date().toISOString();
    guardarPago(codigo, {
      estado_pago: resultado,
      transaction_id: transactionId,
      provider_reference: providerRef,
      fecha_pago: fecha,
      provider: 'MOCK',
      amount_cents: previo?.amount_cents ?? 0,
    });
    return {
      estado_pago: resultado,
      provider_reference: providerRef,
      fecha_pago: fecha,
    };
  },

  /**
   * Consulta el estado actual del pago de un pedido. Se usa en la pantalla
   * de callback y en el detalle del pedido para mostrar el badge.
   * REAL: GET /market/pedidos/{codigo}/estado-pago
   */
  async estadoPago(codigo: string): Promise<EstadoPagoResponse> {
    await delay(200);
    const pago = leerPago(codigo);
    if (!pago) return { estado_pago: 'no_iniciado' };
    return {
      estado_pago: pago.estado_pago,
      transaction_id: pago.transaction_id,
      provider_reference: pago.provider_reference,
      fecha_pago: pago.fecha_pago,
      provider: pago.provider,
    };
  },

  /**
   * Solo mock — permite forzar un resultado desde el modal simulado.
   * En producción esta función no existe: el gateway devuelve el resultado
   * al widget o al webhook.
   */
  simularResultadoWidget(resultado: 'aprobado' | 'rechazado' | 'fallido'): {
    transaction_id: string;
    resultado: 'aprobado' | 'rechazado' | 'fallido';
  } {
    return { transaction_id: generarTransactionId(), resultado };
  },
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, { label: string; color: string }> = {
  no_iniciado: { label: 'Sin pagar',    color: 'bg-muted text-muted-foreground border-border' },
  procesando:  { label: 'Procesando',  color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  aprobado:    { label: 'Pagado',      color: 'bg-success/10 text-success border-success/30' },
  rechazado:   { label: 'Rechazado',   color: 'bg-destructive/10 text-destructive border-destructive/30' },
  fallido:     { label: 'Fallido',     color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};
