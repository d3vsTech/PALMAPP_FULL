/**
 * API — Préstamos a colaboradores (doc API_NOMINA.md §15 + API_PRESTAMOS.md)
 *
 * Módulo independiente accesible desde Pagos/Nómina. Registra adelantos y
 * préstamos a colaboradores internos (solo `Empleado`, nunca operarios de
 * terceros). Los préstamos generan un calendario de cuotas quincenales que
 * aparecen en el preview de liquidación del colaborador
 * (`PreviewLiquidacion.prestamos_pendientes[]`). El liquidador decide en cada
 * quincena si aplica o no el descuento pasando `prestamo_cuota_id` en
 * `deducciones_voluntarias` (ver §5.3).
 */

import { apiClient, PaginatedResponse } from './client';

const T = true;

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Estados del préstamo (backend):
 *  - VIGENTE: hay cuotas pendientes.
 *  - PAGADO: `cuotas_pagadas == num_cuotas` — el motor lo marca al aplicar la
 *    última cuota en la liquidación. NO puede cancelarse (§6 devuelve 422).
 *  - CANCELADO: soft-delete manual desde el listado. Las cuotas PENDIENTE
 *    dejan de aparecer en el preview de liquidación.
 */
export type EstadoPrestamo = 'VIGENTE' | 'PAGADO' | 'CANCELADO';

/**
 * Estado individual de cada cuota del calendario.
 *  - PENDIENTE: aún no aplicada, aparece en el preview de la nómina del período.
 *  - APLICADA: descontada en la liquidación (`prestamo_cuota_id` fue enviado).
 *
 * No existe estado OMITIDA: si el liquidador no descuenta una cuota, queda
 * PENDIENTE y reaparece en el preview del siguiente período (doc §7.4).
 */
export type EstadoCuota = 'PENDIENTE' | 'APLICADA';

/**
 * Frecuencia del préstamo — se DERIVA de `TenantConfig.tipo_pago_nomina` al
 * momento de crearlo. No se envía en el body (doc §4). El backend responde
 * este campo en el listado/detalle para que el frontend sepa qué controles
 * mostrar.
 */
export type FrecuenciaPrestamo = 'QUINCENAL' | 'MENSUAL';

/** Fila individual del calendario de cuotas (doc §3). */
export interface PrestamoCuota {
  id: number;
  numero_cuota: number;
  anio: number;
  mes: number;
  /** null en préstamos MENSUAL; 1 o 2 en QUINCENAL. */
  quincena: number | null;
  monto: number | string;
  estado: EstadoCuota;
  /** Timestamp ISO de cuando se aplicó, o null si aún PENDIENTE. */
  aplicada_at?: string | null;
}

/**
 * Préstamo — shape completo (listar/ver) — doc §2 y §3.
 * El listado devuelve una lista de estos sin `cuotas[]`; el detalle sí
 * trae `cuotas[]` con el calendario completo.
 */
export interface Prestamo {
  id: number;
  /**
   * Subobjeto eager-loaded del colaborador (doc §2). El backend siempre lo
   * incluye en listar/ver — `empleado_id` no aparece como campo raíz.
   */
  empleado: {
    id: number;
    nombre_completo: string;
    documento: string;
    cargo: string;
  };
  concepto: string;
  /** Derivada de `TenantConfig.tipo_pago_nomina` al crear el préstamo. */
  frecuencia: FrecuenciaPrestamo;
  valor_total: number | string;
  saldo_pendiente: number | string;
  /** `floor(valor_total / num_cuotas)`. La última cuota absorbe el residuo. */
  cuota_valor: number | string;
  cuotas_pagadas: number;
  num_cuotas: number;
  /** Precomputado por el backend: "4/10". Ahorra un cálculo en la UI. */
  avance: string;
  /** Fecha ISO YYYY-MM-DD de la última cuota (o null si no calculable). */
  fecha_fin: string | null;
  estado: EstadoPrestamo;
  inicio_anio: number;
  inicio_mes: number;
  /** null en préstamos MENSUAL; 1 o 2 en QUINCENAL. */
  inicio_quincena: number | null;
  observaciones?: string | null;
  created_at?: string;
  /** Solo presente en `GET /prestamos/{id}`. Calendario ordenado por `numero_cuota`. */
  cuotas?: PrestamoCuota[];
}

/** Cards superiores del listado (doc §1). */
export interface IndicadoresPrestamos {
  /** Conteo de préstamos con `estado=VIGENTE` del tenant. */
  prestamos_vigentes: number;
  /** Suma de `saldo_pendiente` de todos los préstamos VIGENTES. */
  saldo_total_pendiente: number;
}

/**
 * Payload de creación (doc §4).
 *
 * La frecuencia (QUINCENAL/MENSUAL) NO se envía — se lee de
 * `TenantConfig.tipo_pago_nomina`. El frontend debe:
 *   1. Consultar `GET /configuracion/nomina` antes de renderizar.
 *   2. Si `tipo_pago_nomina=QUINCENAL`, enviar `inicio_quincena` (1 o 2).
 *   3. Si `tipo_pago_nomina=MENSUAL`, OMITIR `inicio_quincena` (o enviar null).
 */
export interface CrearPrestamoPayload {
  empleado_id: number;
  concepto: string;
  valor_total: number;
  /** 1–120 (validado por backend). */
  num_cuotas: number;
  /** >= 2020. */
  inicio_anio: number;
  /** 1–12. */
  inicio_mes: number;
  /**
   * Requerido si el tenant es QUINCENAL (1 o 2). Omitir para tenants MENSUAL.
   */
  inicio_quincena?: number | null;
  /** Notas internas — max 500 chars. */
  observaciones?: string | null;
}

/**
 * Payload de edición.
 *
 * Restricción: si `cuotas_pagadas > 0`, solo `concepto` y `observaciones` son
 * editables — el backend responde `422 PRESTAMO_NO_EDITABLE` si intentas
 * cambiar campos financieros con cuotas ya aplicadas.
 */
export interface EditarPrestamoPayload {
  concepto?: string;
  observaciones?: string | null;
  valor_total?: number;
  num_cuotas?: number;
  inicio_anio?: number;
  inicio_mes?: number;
  inicio_quincena?: number | null;
}

// ─── Abonos (doc §8) ──────────────────────────────────────────────────────────

/**
 * Medios de pago aceptados por el endpoint de abonos directos (doc §8.2).
 * El backend responde también con `medio_pago_label` con la etiqueta legible.
 */
export type MedioPagoAbono =
  | 'DESCUENTO_NOMINA'
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'CHEQUE'
  | 'OTRO';

/**
 * Tipo del abono: NOMINA si fue aplicado vía liquidación de nómina,
 * DIRECTO si fue registrado con `POST /prestamos/{id}/abonos`.
 */
export type TipoAbono = 'NOMINA' | 'DIRECTO';

/** Fila del historial unificado de abonos (doc §8.1). */
export interface AbonoPrestamo {
  id: number;
  numero_cuota: number;
  /** YYYY-MM-DD. */
  fecha: string;
  valor: number | string;
  medio_pago: MedioPagoAbono;
  /** Etiqueta legible provista por el backend, ej. "Descuento nómina". */
  medio_pago_label: string;
  referencia: string | null;
  nota: string | null;
  saldo_tras_abono: number | string;
  tipo: TipoAbono;
  /** Nombre del usuario que registró el abono. */
  registrado_por: string;
}

/** Resumen financiero del préstamo devuelto por `GET /prestamos/{id}/abonos`. */
export interface PrestamoResumenAbonos {
  id: number;
  concepto: string;
  estado: EstadoPrestamo;
  valor_total: number | string;
  total_abonado: number | string;
  saldo_pendiente: number | string;
  cuota_valor: number | string;
  cuotas_pagadas: number;
  num_cuotas: number;
  /** Porcentaje 0–100 calculado por el backend. */
  avance_pct: number;
}

/** Respuesta de `GET` y `POST /prestamos/{id}/abonos`. */
export interface HistorialAbonos {
  prestamo: PrestamoResumenAbonos;
  abonos: AbonoPrestamo[];
}

/** Payload de `POST /prestamos/{id}/abonos` (doc §8.2). */
export interface RegistrarAbonoPayload {
  /** YYYY-MM-DD. No puede ser fecha futura. */
  fecha: string;
  medio_pago: MedioPagoAbono;
  /** Nº transferencia, comprobante, etc. Max 100. */
  referencia?: string | null;
  /** Observación interna. Max 500. */
  nota?: string | null;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const prestamosApi = {
  /** GET /prestamos/indicadores — 2 cards: vigentes + saldo total. */
  indicadores: () =>
    apiClient.get<{ data: IndicadoresPrestamos }>(
      `/v1/tenant/prestamos/indicadores`,
      T,
    ),

  /** GET /prestamos — listado paginado con filtros. */
  listar: (params?: {
    empleado_id?: number;
    estado?: EstadoPrestamo;
    anio?: number;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<Prestamo>>(
      `/v1/tenant/prestamos${toQuery(params)}`,
      T,
    ),

  /** GET /prestamos/{id} — detalle con calendario `cuotas[]`. */
  ver: (id: number) =>
    apiClient.get<{ data: Prestamo }>(`/v1/tenant/prestamos/${id}`, T),

  /**
   * POST /prestamos — crea el préstamo y genera todas las cuotas del
   * calendario a partir de `inicio_anio/mes/quincena`. `cuota_valor` se
   * calcula automáticamente.
   */
  crear: (payload: CrearPrestamoPayload) =>
    apiClient.post<{ data: Prestamo; message: string }>(
      `/v1/tenant/prestamos`,
      payload,
      T,
    ),

  /**
   * PUT /prestamos/{id}. Si el préstamo ya tiene cuotas aplicadas
   * (`cuotas_pagadas > 0`), el backend rechaza con `PRESTAMO_NO_EDITABLE`
   * cualquier campo financiero — solo permite `concepto` y `observaciones`.
   */
  editar: (id: number, payload: EditarPrestamoPayload) =>
    apiClient.put<{ data: Prestamo; message: string }>(
      `/v1/tenant/prestamos/${id}`,
      payload,
      T,
    ),

  /**
   * DELETE /prestamos/{id} — soft-delete. El préstamo pasa a CANCELADO y
   * las cuotas PENDIENTES asociadas quedan inaccesibles.
   */
  eliminar: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/prestamos/${id}`, T),

  /**
   * GET /prestamos/{id}/abonos — historial unificado (nómina + directos)
   * ordenado por `numero_cuota` ASC + resumen financiero del préstamo
   * (doc §8.1).
   */
  historialAbonos: (id: number) =>
    apiClient.get<{ data: HistorialAbonos }>(
      `/v1/tenant/prestamos/${id}/abonos`,
      T,
    ),

  /**
   * POST /prestamos/{id}/abonos — registra un abono DIRECTO (no proveniente
   * de nómina). El backend auto-aplica la próxima cuota PENDIENTE del
   * calendario y devuelve resumen + historial actualizado (doc §8.2).
   *
   * Errores: 422 `PRESTAMO_NO_VIGENTE`, 422 `PRESTAMO_SIN_CUOTAS_PENDIENTES`.
   */
  registrarAbono: (id: number, payload: RegistrarAbonoPayload) =>
    apiClient.post<{ data: HistorialAbonos; message: string }>(
      `/v1/tenant/prestamos/${id}/abonos`,
      payload,
      T,
    ),
};

// ─── Códigos de error específicos (doc §15) ───────────────────────────────────

export const PrestamoErrorCodes = {
  /** Intento de cambiar `valor_total`/`num_cuotas`/fechas con cuotas ya aplicadas. */
  PRESTAMO_NO_EDITABLE: 'PRESTAMO_NO_EDITABLE',
  /** `prestamo_cuota_id` en liquidación referencia una cuota ya APLICADA o inexistente. */
  PRESTAMO_CUOTA_NO_PENDIENTE: 'PRESTAMO_CUOTA_NO_PENDIENTE',
  /** La cuota no pertenece al empleado que se está liquidando. */
  PRESTAMO_CUOTA_EMPLEADO_MISMATCH: 'PRESTAMO_CUOTA_EMPLEADO_MISMATCH',
  /** Intento de crear un préstamo para un operario de tercero (doc §0). */
  PRESTAMO_SOLO_COLABORADORES: 'PRESTAMO_SOLO_COLABORADORES',
  /** Intento de registrar abono en préstamo CANCELADO o PAGADO (doc §8.2). */
  PRESTAMO_NO_VIGENTE: 'PRESTAMO_NO_VIGENTE',
  /** Todas las cuotas del préstamo ya fueron aplicadas (doc §8.2). */
  PRESTAMO_SIN_CUOTAS_PENDIENTES: 'PRESTAMO_SIN_CUOTAS_PENDIENTES',
} as const;

export type PrestamoErrorCode =
  typeof PrestamoErrorCodes[keyof typeof PrestamoErrorCodes];
