/**
 * API — Nómina (alineado a docs/API_NOMINA.md)
 *
 * Cubre:
 *  - Nóminas (CRUD + indicadores + cerrar)
 *  - NominaEmpleado (preview, resumen-trabajo, liquidar, re-liquidar, desprendible)
 *  - Conceptos (catálogo + select)
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

export type EstadoNomina = 'BORRADOR' | 'CERRADA';
export type EstadoNominaEmpleado = 'PENDIENTE' | 'LIQUIDADO';
export type Periodicidad = 'QUINCENAL' | 'MENSUAL';
export type SalarioTipo = 'FIJO' | 'VARIABLE';
export type ModalidadPago = 'FIJO' | 'PRODUCCION';

/**
 * Tipos de concepto de nómina (API_NOMINA.md §6).
 *  - APORTE_LEGAL: tiene aporte de empleado y empresa (SALUD, PENSION, ARL).
 *  - DEDUCCION_LEGAL: solo descuento al empleado (FSP, RETEFUENTE, EMBARGO).
 *  - DEDUCCION_VOLUNTARIA: solicitudes del empleado (préstamo, libranza, ahorro).
 *  - BONIFICACION_FIJA / BONIFICACION_VARIABLE: pagos extra al devengado.
 */
export type TipoConcepto =
  | 'APORTE_LEGAL'
  | 'DEDUCCION_LEGAL'
  | 'DEDUCCION_VOLUNTARIA'
  | 'BONIFICACION_FIJA'
  | 'BONIFICACION_VARIABLE';

/** Marca si el concepto cuenta para prestaciones sociales (cesantías, prima, vacaciones). */
export type TipoRemuneracion = 'REMUNERADO' | 'NO_REMUNERADO';

export type SubtipoConcepto =
  | 'PRESTAMO'
  | 'AHORRO_VOLUNTARIO'
  | 'LIBRANZA'
  | 'EMBARGO'
  | 'ALIMENTACION'
  | 'ANTIGUEDAD'
  | 'PRODUCTIVIDAD'
  | 'OTRO';

export type AplicaA = 'FIJO' | 'VARIABLE' | 'AMBOS';

export interface Nomina {
  id: number;
  tenant_id?: number;
  mes: number;
  anio: number;
  quincena: number | null;
  tipo_pago_snapshot: Periodicidad;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoNomina;
  observacion?: string | null;
  total_fijos: string;
  total_variables: string;
  total_bonificaciones: string;
  total_deducciones: string;
  total_general: string;
  empleados_count?: number;
  empleados_liquidados_count?: number;
  cerrada_por?: number | null;
  cerrada_at?: string | null;
  cerrada_por_rel?: { id: number; name: string } | null;
}

export interface NominaIndicadores {
  total_periodos: number;
  borradores: number;
  cerradas: number;
  /** Deprecated — quedará una versión más para compatibilidad (doc §2.3). */
  total_devengado: number;
  /** Neto pagado a colaboradores internos (nóminas CERRADAS). */
  total_colaboradores: number;
  /** Total transferido a terceros (estado_pago=PAGADO en nóminas CERRADAS). */
  total_terceros: number;
  /** Suma de los dos anteriores. */
  neto_pagar: number;
  /** Total a transferir a terceros aún en estado_pago=PENDIENTE. */
  pendiente_pagar: number;
}

export interface EmpleadoDisponible {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string;
  modalidad_pago: ModalidadPago;
  salario_base: number;
  predio: { id: number; nombre: string } | null;
}

/** Operario de empresa contratista disponible para agregar a una nómina (doc §3.1). */
export interface OperarioDisponible {
  id: number;
  nombre_completo: string;
  cedula: string;
  cargo: string;
  tercero: { id: number; razon_social: string };
  /** Tarifa diaria estimada (tomada de la labor JORNAL_FIJO más frecuente del tercero). */
  tarifa_dia_estimada?: number;
}

/** Respuesta del endpoint /empleados-disponibles con bloques separados (doc §3.1). */
export interface EmpleadosDisponiblesResponse {
  empleados: EmpleadoDisponible[];
  operarios: OperarioDisponible[];
}

export interface NominaEmpleadoConcepto {
  id: number;
  concepto_id: number;
  operacion: 'SUMA' | 'RESTA';
  valor_calculado: string;
  porcentaje_aplicado: string | null;
  base_aplicada: string | null;
  es_manual: boolean;
  observacion?: string | null;
  concepto: { codigo: string; nombre: string };
}

export interface NominaEmpleado {
  id: number;
  nomina_id: number;
  /** XOR con `operario_id` — solo uno de los dos viene poblado (doc §3.2). */
  empleado_id: number | null;
  /** XOR con `empleado_id` — fila de operario de empresa contratista. */
  operario_id: number | null;
  /** Snapshot del tercero al que pertenece el operario. null si la fila es de empleado. */
  tercero_id: number | null;
  /** null cuando la fila es de operario (sin clasificación FIJO/VARIABLE). */
  salario_tipo: SalarioTipo | null;
  salario_base: string;
  estado: EstadoNominaEmpleado;
  dias_trabajados: number | null;
  total_jornales: string;
  total_cosecha: string;
  total_horas_extra: string;
  total_recargos: string;
  total_incapacidades: string;
  total_devengado: string;
  subsidio_transporte: string;
  total_bonificaciones: string;
  total_deducciones: string;
  total_neto: string;
  cargo_snapshot?: string | null;
  predio_snapshot?: string | null;
  salario_minimo_snapshot?: string | null;
  liquidado_por?: number | null;
  liquidado_at?: string | null;
  empleado?: {
    id: number;
    nombre_completo?: string;
    primer_nombre?: string;
    primer_apellido?: string;
    documento?: string;
    cargo?: string;
    predio?: { id: number; nombre: string } | null;
  } | null;
  operario?: {
    id: number;
    nombre_completo?: string;
    cedula?: string;
    cargo?: string;
    tercero?: { id: number; razon_social: string };
  } | null;
  conceptos?: NominaEmpleadoConcepto[];
}

export interface ConceptoLegalPreview {
  concepto_id: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
  base: number;
  valor: number;
}

export interface PreviewLiquidacion {
  dias_periodo: number;
  dias_trabajados: number;
  salario_base: number;
  total_jornales: number;
  total_cosecha: number;
  total_horas_extra: number;
  total_recargos: number;
  total_incapacidades: number;
  dias_ausencia_descontados: number;
  total_ausencias_descuento: number;
  total_devengado: number;
  subsidio_transporte: number;
  conceptos_legales: ConceptoLegalPreview[];
  total_deducciones_legales: number;
  total_neto_propuesto: number;
  empleado: {
    id: number;
    nombre_completo: string;
    documento: string;
    cargo: string;
    salario_tipo: SalarioTipo;
    predio: { id: number; nombre: string } | null;
  };
}

export interface FilaResumenTrabajo {
  fecha: string;
  lote?: string;
  sublote?: string;
  cosecha?: string;
  racimos?: number;
  promedio_kg?: number;
  peso_kg?: number;
  precio_kg?: number;
  total_cosecha?: number;
  jornal: number;
  palmas?: number;
  descripcion?: string;
}

export interface CategoriaResumenTrabajo {
  filas: FilaResumenTrabajo[];
  subtotal_valor?: number;
  subtotal_jornal: number;
  subtotal_racimos?: number;
  subtotal_peso?: number;
  subtotal_palmas?: number;
}

export interface ResumenTrabajo {
  cosecha: CategoriaResumenTrabajo;
  plateo: CategoriaResumenTrabajo;
  poda: CategoriaResumenTrabajo;
  fertilizacion: CategoriaResumenTrabajo;
  sanidad: CategoriaResumenTrabajo;
  otros: CategoriaResumenTrabajo;
  finca: CategoriaResumenTrabajo;
  total_general: number;
}

export interface BonificacionInput {
  nombre: string;
  valor: number;
}

export interface DeduccionVoluntariaInput {
  concepto_id: number;
  valor: number;
  observacion?: string;
}

export interface LiquidarPayload {
  dias_trabajados?: number;
  bonificaciones?: BonificacionInput[];
  deducciones_voluntarias?: DeduccionVoluntariaInput[];
}

export interface DesprendibleData {
  finca: string;
  empleado: {
    id: number;
    nombre_completo: string;
    documento: string;
    cargo: string;
    salario_tipo: SalarioTipo;
    salario_base: number;
  };
  nomina: {
    id: number;
    periodo_label: string;
    mes: number;
    anio: number;
    quincena: number | null;
    tipo_pago: Periodicidad;
    fecha_inicio: string;
    fecha_fin: string;
    estado: EstadoNomina;
  };
  liquidacion: {
    fecha: string;
    fecha_humana: string;
    liquidado_por: string;
    dias_trabajados: number;
    total_jornales: number;
    total_cosecha: number;
    total_horas_extra: number;
    total_recargos: number;
    total_incapacidades: number;
    subsidio_transporte: number;
    total_devengado: number;
    total_bonificaciones: number;
    total_deducciones: number;
    total_neto: number;
    bonificaciones: { codigo?: string; nombre: string; valor: number; observacion?: string }[];
    deducciones: {
      codigo: string;
      nombre: string;
      porcentaje?: number;
      base?: number;
      valor: number;
      es_manual: boolean;
      observacion?: string;
    }[];
  };
  resumen_trabajo: ResumenTrabajo | null;
}

// ─── Paso 3 — Validar Cosecha (doc §4) ────────────────────────────────────────

export interface ValidacionCosechaDetalleColaborador {
  tipo: 'EMPLEADO' | 'OPERARIO';
  colaborador_id: number;
  nombre_completo: string;
  cargo: string;
  kg: number;
}

/** Bundle calculado de comparación: lo registrado vs el reporte de la extractora. */
export interface ValidacionCosechaBundle {
  total_kg_colaboradores: number;
  total_kg_extractora: number;
  diferencia_kg: number;
  detalle_por_colaborador: ValidacionCosechaDetalleColaborador[];
  /** null si el paso aún no fue confirmado. */
  validado_at: string | null;
  /** null si el paso aún no fue confirmado. */
  validado_por: string | null;
}

export interface PromedioLoteAjustado {
  id: number;
  lote_id: number;
  viaje_id: number | null;
  promedio: string;
  anio: number;
  fecha: string;
}

export interface ValidacionCosechaConfirmada {
  id: number;
  nomina_id: number;
  total_kg_colaboradores: string;
  total_kg_extractora: string;
  diferencia_kg: string;
  validado_por: number;
  validado_at: string;
}

// ─── Liquidación de Terceros (doc §6 — agregado por PR-4 del roadmap) ─────────

export type EstadoPagoTercero = 'PENDIENTE' | 'PAGADO';
export type MetodoPagoTercero = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE';

export interface NominaTerceroOperario {
  id: number;
  nomina_tercero_id: number;
  operario_id: number;
  dias: number;
  tarifa_dia: string;
  ajuste: string;
  subtotal: string;
  /** Labores realizadas (JSON con tipo + lote + sublote + cantidad). */
  labores_realizadas: Array<{
    tipo: string;
    lote?: string;
    sublote?: string;
    cantidad: number;
    precio_unitario?: number;
    total?: number;
  }>;
  observacion?: string | null;
  operario?: {
    id: number;
    nombre_completo: string;
    cedula: string;
    cargo: string;
  };
}

export interface NominaTercero {
  id: number;
  nomina_id: number;
  tercero_id: number;
  total_a_transferir: string;
  estado_pago: EstadoPagoTercero;
  metodo_pago: MetodoPagoTercero | null;
  referencia_pago: string | null;
  orden_pago_numero: string | null;
  pagado_at: string | null;
  pagado_por: number | null;
  observacion: string | null;
  tercero?: {
    id: number;
    razon_social: string;
    nit: string;
    contacto?: string;
    telefono?: string;
    banco?: string | null;
    tipo_cuenta?: 'AHORROS' | 'CORRIENTE' | null;
    numero_cuenta?: string | null;
    titular_cuenta?: string | null;
    datos_bancarios_completos?: boolean;
  };
  operarios?: NominaTerceroOperario[];
}

export interface ActualizarOperarioActaPayload {
  dias?: number;
  tarifa_dia?: number;
  ajuste?: number;
  observacion?: string;
}

export interface RegistrarPagoTerceroPayload {
  metodo_pago: MetodoPagoTercero;
  /** Requerido si metodo_pago=TRANSFERENCIA. */
  referencia_pago?: string;
  /** Datetime ISO. Default: ahora. */
  pagado_at?: string;
  orden_pago_numero?: string;
  observacion?: string;
}

export interface NominaConcepto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  subtipo: SubtipoConcepto | null;
  operacion: 'SUMA' | 'RESTA';
  calculo: 'PORCENTAJE' | 'VALOR_FIJO';
  /** Porcentaje legacy (cuando solo se usaba uno). Suele venir null si los campos
   *  `porcentaje_empleado`/`porcentaje_empresa` están poblados. */
  porcentaje?: number | null;
  valor_referencia?: number | null;
  /** Base sobre la que se calcula. Editable vía PUT (doc §6.3). */
  base_calculo?: string | null;
  aplica_a: AplicaA;
  activo: boolean;
  /** Si true, el concepto no se puede eliminar (SALUD/PENSION). Editable vía PUT como `es_obligatorio`. */
  es_obligatorio?: boolean;
  /** Alias legacy de `es_obligatorio` (algunos endpoints lo devuelven así). */
  obligatorio?: boolean;

  // ─── Campos nuevos del doc API_NOMINA.md §6.1/§6.3 ────────────────────────
  /** % que descuenta al empleado. Para APORTE_LEGAL y DEDUCCION_LEGAL %. */
  porcentaje_empleado?: number | string | null;
  /** % que asume la empresa. Solo APORTE_LEGAL (SALUD 8.5%, PENSION 12%, ARL 0.522%). */
  porcentaje_empresa?: number | string | null;
  /** Vigencia (formato `yyyy-mm-dd` en el wire; FormRequest acepta `dd/mm/yyyy` y normaliza). */
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
  /** Si true, el concepto cuenta para el cálculo del salario mínimo legal. */
  afecta_salario_minimo?: boolean;
  /** REMUNERADO: cuenta para prestaciones sociales. NO_REMUNERADO: no. */
  tipo_remuneracion?: TipoRemuneracion;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const nominaApi = {
  // ─── Nóminas ───────────────────────────────────────────────────────────────
  listar: (params?: { estado?: EstadoNomina; mes?: number; anio?: number; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Nomina>>(`/v1/tenant/nominas${toQuery(params)}`, T),

  indicadores: () =>
    apiClient.get<{ data: NominaIndicadores }>(`/v1/tenant/nominas/indicadores`, T),

  ver: (id: number) =>
    apiClient.get<{ data: Nomina & { empleados?: NominaEmpleado[] } }>(`/v1/tenant/nominas/${id}`, T),

  crear: (payload: {
    mes: number;
    anio: number;
    periodicidad: Periodicidad;
    quincena?: 1 | 2 | null;
    observacion?: string | null;
  }) =>
    apiClient.post<{ data: Nomina; message: string }>(`/v1/tenant/nominas`, payload, T),

  editar: (id: number, payload: Partial<{
    mes: number;
    anio: number;
    periodicidad: Periodicidad;
    quincena: 1 | 2 | null;
    observacion: string | null;
  }>) =>
    apiClient.put<{ data: Nomina; message: string }>(`/v1/tenant/nominas/${id}`, payload, T),

  eliminar: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/nominas/${id}`, T),

  cerrar: (id: number) =>
    apiClient.post<{ data: Nomina; message: string }>(`/v1/tenant/nominas/${id}/cerrar`, undefined, T),

  /**
   * Lista empleados internos y operarios de terceros disponibles para esta nómina.
   * Respuesta extendida (doc §3.1): { empleados: [...], operarios: [...] }.
   *
   * Opcional `?tercero_id=N` para filtrar solo operarios de un tercero.
   */
  empleadosDisponibles: (id: number, params?: { tercero_id?: number }) =>
    apiClient.get<{ data: EmpleadosDisponiblesResponse }>(
      `/v1/tenant/nominas/${id}/empleados-disponibles${toQuery(params)}`,
      T,
    ),

  /**
   * Agrega cualquier combinación de empleados internos y operarios de terceros.
   * Al menos uno de los dos arrays debe traer elementos (doc §3.2).
   */
  agregarEmpleados: (
    id: number,
    payload: { empleado_ids?: number[]; operario_ids?: number[] } | number[],
  ) => {
    const body = Array.isArray(payload) ? { empleado_ids: payload } : payload;
    return apiClient.post<{ data: NominaEmpleado[]; message: string }>(
      `/v1/tenant/nominas/${id}/empleados`,
      body,
      T,
    );
  },

  // ─── Paso 3 — Validar Cosecha (doc §4) ─────────────────────────────────────
  /**
   * Bundle con totales kg colaboradores vs kg extractora.
   * Recalcula en cada llamada — no persiste.
   */
  validarCosecha: (nominaId: number) =>
    apiClient.get<{ data: ValidacionCosechaBundle }>(
      `/v1/tenant/nominas/${nominaId}/validar-cosecha`,
      T,
    ),

  /**
   * Ajusta el promedio baseline de un lote (kg/gajo). Solo en BORRADOR.
   * Idempotente (upsert sobre `promedio_lote` con viaje_id=null).
   */
  ajustarPromedioLote: (nominaId: number, loteId: number, promedio: number) =>
    apiClient.put<{ data: PromedioLoteAjustado; message: string }>(
      `/v1/tenant/nominas/${nominaId}/promedios-lote/${loteId}`,
      { promedio },
      T,
    ),

  /**
   * Persiste el snapshot del bundle calculado. Idempotente (upsert).
   * El cierre de nómina exige este paso si hay cosechas en el período.
   */
  confirmarValidacionCosecha: (nominaId: number) =>
    apiClient.post<{ data: ValidacionCosechaConfirmada; message: string }>(
      `/v1/tenant/nominas/${nominaId}/validar-cosecha/confirmar`,
      undefined,
      T,
    ),

  // ─── Terceros — actas, pagos, PDF (doc §6 / roadmap PR-4) ──────────────────
  terceros: {
    /** GET /nominas/{id}/terceros — listado agrupado por empresa contratista. */
    listar: (nominaId: number) =>
      apiClient.get<{ data: NominaTercero[] }>(
        `/v1/tenant/nominas/${nominaId}/terceros`,
        T,
      ),

    /** GET /nominas/{id}/terceros/{terceroId} — acta detallada con operarios. */
    ver: (nominaId: number, terceroId: number) =>
      apiClient.get<{ data: NominaTercero }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}`,
        T,
      ),

    /**
     * POST .../liquidar — calcula totales y crea/actualiza la acta del tercero.
     * Idempotente: re-ejecutar reescribe `nomina_tercero_operario`.
     */
    liquidar: (nominaId: number, terceroId: number) =>
      apiClient.post<{ data: NominaTercero; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/liquidar`,
        undefined,
        T,
      ),

    /** PUT .../operarios/{op} — ajustar dias, tarifa, ajuste, observación. */
    actualizarOperario: (
      nominaId: number,
      terceroId: number,
      operarioId: number,
      payload: ActualizarOperarioActaPayload,
    ) =>
      apiClient.put<{ data: NominaTerceroOperario; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/operarios/${operarioId}`,
        payload,
        T,
      ),

    /**
     * POST .../registrar-pago — marca el acta como pagada.
     * Permitido aunque la nómina esté CERRADA (excepción documentada al patrón
     * "CERRADA = inmutable", doc §6).
     */
    registrarPago: (
      nominaId: number,
      terceroId: number,
      payload: RegistrarPagoTerceroPayload,
    ) =>
      apiClient.post<{ data: NominaTercero; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/registrar-pago`,
        payload,
        T,
      ),

    /** GET .../acta/pdf — descarga el PDF del acta (DomPDF). */
    actaPdf: (nominaId: number, terceroId: number) =>
      apiClient.getBlob(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/acta/pdf`,
        T,
      ),
  },

  // ─── NominaEmpleado ────────────────────────────────────────────────────────
  quitarEmpleado: (nominaEmpleadoId: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/nomina-empleado/${nominaEmpleadoId}`, T),

  preview: (nominaEmpleadoId: number) =>
    apiClient.get<{ data: PreviewLiquidacion }>(
      `/v1/tenant/nomina-empleado/${nominaEmpleadoId}/preview`,
      T,
    ),

  resumenTrabajo: (nominaEmpleadoId: number) =>
    apiClient.get<{ data: ResumenTrabajo }>(
      `/v1/tenant/nomina-empleado/${nominaEmpleadoId}/resumen-trabajo`,
      T,
    ),

  liquidar: (nominaEmpleadoId: number, payload: LiquidarPayload) =>
    apiClient.post<{ data: NominaEmpleado; message: string }>(
      `/v1/tenant/nomina-empleado/${nominaEmpleadoId}/liquidar`,
      payload,
      T,
    ),

  reLiquidar: (nominaEmpleadoId: number, payload: LiquidarPayload) =>
    apiClient.put<{ data: NominaEmpleado; message: string }>(
      `/v1/tenant/nomina-empleado/${nominaEmpleadoId}/liquidacion`,
      payload,
      T,
    ),

  desprendible: (nominaEmpleadoId: number) =>
    apiClient.get<{ data: DesprendibleData }>(
      `/v1/tenant/nomina-empleado/${nominaEmpleadoId}/desprendible`,
      T,
    ),

  desprendiblePdf: (nominaEmpleadoId: number) =>
    apiClient.getBlob(`/v1/tenant/nomina-empleado/${nominaEmpleadoId}/desprendible/pdf`, T),

  desprendibleWhatsapp: (nominaEmpleadoId: number) =>
    apiClient.post<{
      message: string;
      data: { url: string; filename: string; expires_at: string };
    }>(`/v1/tenant/nomina-empleado/${nominaEmpleadoId}/desprendible/whatsapp`, undefined, T),

  // ─── Conceptos ─────────────────────────────────────────────────────────────
  conceptos: {
    listar: (params?: { tipo?: TipoConcepto; activo?: boolean }) =>
      apiClient.get<{ data: NominaConcepto[] }>(
        `/v1/tenant/nomina-conceptos${toQuery(params)}`,
        T,
      ),

    /** GET /v1/tenant/nomina-conceptos/{id} — detalle completo (incluye
     *  porcentaje/valor_referencia que a veces no vienen en el listar). */
    ver: (id: number) =>
      apiClient.get<{ data: NominaConcepto }>(
        `/v1/tenant/nomina-conceptos/${id}`,
        T,
      ),

    select: (params?: { tipo?: TipoConcepto; aplica_a?: AplicaA }) =>
      apiClient.get<{ data: NominaConcepto[] }>(
        `/v1/tenant/nomina-conceptos/select${toQuery(params)}`,
        T,
      ),

    crear: (payload: Partial<NominaConcepto>) =>
      apiClient.post<{ data: NominaConcepto; message: string }>(
        `/v1/tenant/nomina-conceptos`,
        payload,
        T,
      ),

    editar: (id: number, payload: Partial<NominaConcepto>) =>
      apiClient.put<{ data: NominaConcepto; message: string }>(
        `/v1/tenant/nomina-conceptos/${id}`,
        payload,
        T,
      ),

    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/nomina-conceptos/${id}`, T),
  },
};

// ─── Códigos de error específicos del módulo (doc §0) ─────────────────────────
export const NominaErrorCodes = {
  /** Ya existe una nómina con (tenant, año, mes, quincena). */
  NOMINA_DUPLICADA: 'NOMINA_DUPLICADA',
  /** Intento de mutar una nómina ya CERRADA. */
  NOMINA_CERRADA: 'NOMINA_CERRADA',
  /** Intento de editar/eliminar nómina con empleados ya LIQUIDADOS. */
  NOMINA_CON_LIQUIDADOS: 'NOMINA_CON_LIQUIDADOS',
  /** Intento de cerrar nómina con empleados aún PENDIENTES. */
  NOMINA_CON_PENDIENTES: 'NOMINA_CON_PENDIENTES',
  /** Intento de quitar un empleado ya liquidado. */
  EMPLEADO_LIQUIDADO: 'EMPLEADO_LIQUIDADO',
  /** Intento de pedir desprendible a un empleado aún PENDIENTE. */
  EMPLEADO_NO_LIQUIDADO: 'EMPLEADO_NO_LIQUIDADO',
  /** Intento de pedir resumen-trabajo a un empleado FIJO. */
  EMPLEADO_NO_VARIABLE: 'EMPLEADO_NO_VARIABLE',
  /** Falta `salario_minimo_vigente` o FIJO sin `salario_base`. */
  CALC_ERROR: 'CALC_ERROR',
  /** Concepto referenciado por nóminas existentes — no se puede eliminar. */
  CONCEPTO_EN_USO: 'CONCEPTO_EN_USO',
  /** Concepto obligatorio (SALUD/PENSIÓN/etc.) — no se puede eliminar. */
  CONCEPTO_OBLIGATORIO: 'CONCEPTO_OBLIGATORIO',
  /** Cierre falla porque hay cosechas y no se confirmó el paso 3. */
  NOMINA_VALIDACION_COSECHA_REQUERIDA: 'NOMINA_VALIDACION_COSECHA_REQUERIDA',
  /** Cierre falla porque hay un tercero presente sin `nomina_tercero` calculado. */
  NOMINA_TERCERO_NO_LIQUIDADO: 'NOMINA_TERCERO_NO_LIQUIDADO',
  /** El operario reportó una labor sin precio en `tercero_labor_precios`. */
  TERCERO_LABOR_SIN_PRECIO: 'TERCERO_LABOR_SIN_PRECIO',
  /** `operario_ids[]` incluye un operario cuyo `tercero_id` no está habilitado. */
  OPERARIO_NO_PERTENECE_A_TERCERO: 'OPERARIO_NO_PERTENECE_A_TERCERO',
  /** Intento de quitar un operario con `nomina_tercero` ya liquidado. */
  OPERARIO_LIQUIDADO_EN_TERCERO: 'OPERARIO_LIQUIDADO_EN_TERCERO',
  /** `metodo_pago=TRANSFERENCIA` sin `banco`/`numero_cuenta`/etc. en el tercero. */
  TERCERO_SIN_DATOS_BANCARIOS: 'TERCERO_SIN_DATOS_BANCARIOS',
  /** Usuario sin permiso para la acción. */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type NominaErrorCode =
  typeof NominaErrorCodes[keyof typeof NominaErrorCodes];
