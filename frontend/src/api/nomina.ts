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

export type TipoConcepto =
  | 'DEDUCCION_LEGAL'
  | 'DEDUCCION_VOLUNTARIA'
  | 'BONIFICACION_FIJA'
  | 'BONIFICACION_VARIABLE';

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
  total_devengado: number;
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
  empleado_id: number;
  salario_tipo: SalarioTipo;
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
  };
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

export interface NominaConcepto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  subtipo: SubtipoConcepto | null;
  operacion: 'SUMA' | 'RESTA';
  calculo: 'PORCENTAJE' | 'VALOR_FIJO';
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

  empleadosDisponibles: (id: number) =>
    apiClient.get<{ data: EmpleadoDisponible[] }>(`/v1/tenant/nominas/${id}/empleados-disponibles`, T),

  agregarEmpleados: (id: number, empleado_ids: number[]) =>
    apiClient.post<{ data: NominaEmpleado[]; message: string }>(
      `/v1/tenant/nominas/${id}/empleados`,
      { empleado_ids },
      T,
    ),

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
  /** Usuario sin permiso para la acción. */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type NominaErrorCode =
  typeof NominaErrorCodes[keyof typeof NominaErrorCodes];
