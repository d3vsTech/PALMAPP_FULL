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
 *
 * El comprobante que firma el colaborador lo emite el backend desde el
 * 2026-10-27 (§12): antes lo armaba el navegador y el logo de la finca no
 * siempre llegaba. El recibo del abono sigue siendo del front.
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
  /**
   * Soporte del préstamo, o `null` si no se ha cargado. Llega tanto en el
   * listado como en el detalle. Puede venir `undefined` en un backend anterior
   * al deploy del soporte: ahí la UI no ofrece la carga.
   */
  documento?: DocumentoPrestamo | null;
}

/**
 * Soporte del préstamo: el pagaré o la autorización de descuento por nómina
 * (CST arts. 149-150), con su propia observación.
 *
 * El archivo no vive en `prestamos`: vive en el expediente del colaborador
 * (categoría `PRESTAMOS`, tipo `SOPORTE_PRESTAMO`) y el préstamo solo guarda la
 * FK. De ahí los tres enlaces: los dos primeros son el proxy del módulo, que
 * funciona con permisos de nómina; `expediente` exige `colaboradores.ver`.
 *
 * `observacion` (singular) es la nota del documento, distinta de
 * `observaciones` (plural) del préstamo.
 */
export interface DocumentoPrestamo {
  id: number;
  nombre_archivo: string;
  mime_type: string;
  archivo_tamano: number | null;
  observacion: string | null;
  subido_por: string | null;
  subido_at: string | null;
  /** Solo pdf, jpeg, png y webp se pueden abrir inline. */
  previsualizable: boolean;
  enlaces: { descargar: string; visualizar: string; expediente: string };
}

/** Lo que admite el soporte: igual que el de una novedad. */
export const SOPORTE_PRESTAMO = {
  MIMES: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'],
  MAX_KB: 10240,
} as const;

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
  /**
   * PR-L9. Solo lo escribe el módulo de liquidaciones al pagar una
   * liquidación final: salda TODAS las cuotas pendientes de una vez con
   * referencia `LIQ-{id}`. El formulario de abono directo no lo acepta.
   */
  | 'LIQUIDACION_FINAL'
  | 'OTRO';

/**
 * Tipo del abono: NOMINA si fue aplicado vía liquidación de nómina,
 * DIRECTO si fue registrado con `POST /prestamos/{id}/abonos`.
 */
export type TipoAbono =
  | 'NOMINA'
  | 'DIRECTO'
  /**
   * PR-L9: el préstamo se saldó al pagar una liquidación final. Todas las
   * cuotas pendientes pasaron a APLICADA de una vez, con referencia LIQ-{id}.
   */
  | 'LIQUIDACION_FINAL';

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
  /**
   * §8.3 — `true` aplica **todas** las cuotas pendientes de una vez, con la
   * misma fecha, medio y referencia, y deja el préstamo PAGADO.
   *
   * No existe el abono parcial por monto libre: el modelo es por cuota, y el
   * valor nunca se envía (es la suma de los montos pendientes). Como la última
   * cuota absorbe el residuo del redondeo, el saldo cierra exacto en cero.
   */
  saldar?: boolean;
}

// ─── Comprobante de préstamo / adelanto (doc §12) ─────────────────────────────

/**
 * El papel que el colaborador firma al recibir el dinero.
 *
 * Hasta el 2026-10-27 lo armaba el front con jsPDF. Ahora lo emite el backend
 * con el membrete y el logo de la empresa, que es lo que faltaba: el logo se
 * leía del navegador y en producción no siempre llegaba.
 *
 * No es el soporte adjunto (`DocumentoPrestamo`): ese es este mismo papel ya
 * firmado y escaneado, que la finca sube después.
 */
export interface ComprobantePrestamoCuota {
  numero_cuota: number;
  anio: number;
  mes: number;
  /** `null` en los préstamos MENSUAL. */
  quincena: number | null;
  /** "1ª quincena de enero de 2026" o "enero de 2026". */
  periodo_label: string;
  monto: number | string;
  estado: EstadoCuota;
  estado_label: string;
  /** Fecha del abono. Solo en las APLICADAS. */
  fecha: string | null;
  medio_pago: MedioPagoAbono | null;
  medio_pago_label: string | null;
  referencia: string | null;
}

/** Primer o último periodo de descuento del calendario. */
export interface PeriodoComprobantePrestamo {
  anio?: number;
  mes?: number;
  quincena?: number | null;
  /** Día 1 o 16 de la quincena, o fin de mes. */
  fecha: string | null;
  etiqueta: string;
}

export interface ComprobantePrestamo {
  id: number;
  /** `PRE-{id}`. */
  numero_comprobante: string;
  titulo: string;
  estado: EstadoPrestamo;
  estado_label: string;
  empleado: {
    id: number;
    nombre_completo: string;
    tipo_documento: string | null;
    documento: string;
    /** El documento con su tipo delante: "C.C. 1098765432". */
    documento_label: string;
    cargo: string | null;
  };
  concepto: string;
  valor_total: number | string;
  /** "UN MILLÓN QUINIENTOS MIL PESOS M/CTE". */
  valor_en_letras: string;
  frecuencia: FrecuenciaPrestamo;
  frecuencia_label: string;
  plan: {
    cuota_valor: number | string;
    num_cuotas: number;
    inicio: PeriodoComprobantePrestamo;
    fin: PeriodoComprobantePrestamo;
  };
  avance: {
    cuotas_pagadas: number;
    cuotas_pendientes: number;
    /** `valor_total - saldo_pendiente`. */
    total_abonado: number | string;
    saldo_pendiente: number | string;
    /** "4/10". */
    avance: string;
  };
  /** El calendario completo, en orden. */
  cuotas: ComprobantePrestamoCuota[];
  observaciones: string | null;
  /** El soporte adjunto, si lo hay. */
  documento: DocumentoPrestamo | null;
  registro: { fecha: string; fecha_humana: string; registrado_por: string | null };
  generado_el: string;
  filename: string;
}

/** Lo que devuelve `comprobanteWhatsapp`. La URL vive 7 días. */
export interface EnlaceComprobantePrestamo {
  url: string;
  filename: string;
  expires_at: string;
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
   * calendario, o **todas** con `saldar: true` (§8.3), y devuelve resumen +
   * historial actualizado (doc §8.2).
   *
   * Errores: 422 `PRESTAMO_NO_VIGENTE`, 422 `PRESTAMO_SIN_CUOTAS_PENDIENTES`.
   */
  registrarAbono: (id: number, payload: RegistrarAbonoPayload) =>
    apiClient.post<{ data: HistorialAbonos; message: string }>(
      `/v1/tenant/prestamos/${id}/abonos`,
      payload,
      T,
    ),

  /**
   * POST /prestamos/{id}/documento — sube, reemplaza o solo edita la nota.
   *
   * El archivo es obligatorio la **primera** vez; después se puede mandar solo
   * `observacion` para corregir la nota sin volver a subir el PDF, y una
   * `observacion` vacía la borra. Subir otro archivo **reemplaza** el anterior:
   * un préstamo tiene un soporte, no varios.
   *
   * Permiso `nomina.editar`. Un préstamo CANCELADO responde 404.
   */
  subirDocumento: (id: number, archivo: File | null, observacion?: string | null) => {
    const fd = new FormData();
    if (archivo) fd.append('documento', archivo);
    if (observacion !== undefined) fd.append('observacion', observacion ?? '');
    return apiClient.postForm<{ data: Prestamo; message: string }>(
      `/v1/tenant/prestamos/${id}/documento`,
      fd,
      T,
    );
  },

  /**
   * GET /prestamos/{id}/documento — descarga, o visualiza con `inline`.
   *
   * Es el proxy del módulo: sirve el archivo con permiso `nomina.ver`, sin
   * exigir `colaboradores.ver`. `inline` sobre un doc o docx responde 415
   * `MIME_NOT_PREVIEWABLE`; sin soporte, 404 `PRESTAMO_SIN_DOCUMENTO`.
   */
  descargarDocumento: (id: number, inline = false) =>
    apiClient.getBlob(
      `/v1/tenant/prestamos/${id}/documento${inline ? '?inline=1' : ''}`,
      T,
    ),

  /**
   * DELETE /prestamos/{id}/documento — borra el archivo del expediente y deja
   * la FK en null. Cancelar el préstamo **no** borra el soporte: queda como
   * evidencia en la ficha del colaborador.
   */
  eliminarDocumento: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/prestamos/${id}/documento`, T),

  /**
   * GET /prestamos/{id}/comprobante - el mismo contenido del PDF, en JSON.
   *
   * Sirve para previsualizarlo en pantalla sin descargar el archivo. El PDF
   * es la fuente: lo que se firma es `comprobantePdf`.
   */
  comprobante: (id: number) =>
    apiClient.get<{ data: ComprobantePrestamo }>(
      `/v1/tenant/prestamos/${id}/comprobante`,
      T,
    ),

  /**
   * GET /prestamos/{id}/comprobante/pdf - el pagaré con el membrete de la finca.
   *
   * Se puede pedir en cualquier momento de la vida del préstamo, VIGENTE o
   * PAGADO: refleja el avance real. Un préstamo CANCELADO está soft-deleted y
   * responde 404 `PRESTAMO_NO_ENCONTRADO`. `inline` lo abre en el visor en vez
   * de forzar la descarga, que es lo que quiere el botón "Imprimir".
   */
  comprobantePdf: (id: number, inline = false) =>
    apiClient.getBlob(
      `/v1/tenant/prestamos/${id}/comprobante/pdf${inline ? '?inline=1' : ''}`,
      T,
    ),

  /**
   * POST /prestamos/{id}/comprobante/whatsapp - devuelve **solo** la URL
   * firmada (7 días) a la ruta pública del PDF.
   *
   * El backend no arma el mensaje ni conoce el teléfono: el front abre
   * `https://wa.me/?text=` + `encodeURIComponent(url)` y el usuario elige el
   * contacto. Quien tenga el enlace mientras viva puede abrirlo.
   */
  comprobanteWhatsapp: (id: number) =>
    apiClient.post<{ data: EnlaceComprobantePrestamo }>(
      `/v1/tenant/prestamos/${id}/comprobante/whatsapp`,
      {},
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
  /** GET o DELETE del soporte cuando no hay, o el archivo ya no está en disco. */
  PRESTAMO_SIN_DOCUMENTO: 'PRESTAMO_SIN_DOCUMENTO',
  /** `?inline=1` sobre un doc o docx: hay que descargarlo. */
  MIME_NOT_PREVIEWABLE: 'MIME_NOT_PREVIEWABLE',
  /** Intento de registrar abono en préstamo CANCELADO o PAGADO (doc §8.2). */
  PRESTAMO_NO_VIGENTE: 'PRESTAMO_NO_VIGENTE',
  /** Todas las cuotas del préstamo ya fueron aplicadas (doc §8.2). */
  PRESTAMO_SIN_CUOTAS_PENDIENTES: 'PRESTAMO_SIN_CUOTAS_PENDIENTES',
  /** El préstamo es de otro tenant, o está CANCELADO (doc §0 y §12.1). */
  PRESTAMO_NO_ENCONTRADO: 'PRESTAMO_NO_ENCONTRADO',
  /** Ruta pública del comprobante: la firma fue alterada o ya venció (§12.4). */
  ENLACE_INVALIDO_O_VENCIDO: 'ENLACE_INVALIDO_O_VENCIDO',
  /** Ruta pública del comprobante: el préstamo se borró o se canceló (§12.4). */
  DOCUMENTO_NO_DISPONIBLE: 'DOCUMENTO_NO_DISPONIBLE',
} as const;

export type PrestamoErrorCode =
  typeof PrestamoErrorCodes[keyof typeof PrestamoErrorCodes];
