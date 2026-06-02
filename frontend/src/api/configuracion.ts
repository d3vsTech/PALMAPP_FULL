/**
 * API — Configuración / Paramétricas
 *
 * Cubre las 17 secciones del doc API_PARAMETRICAS.md:
 *   1.  Semillas (6 tipos: 4 base + HIBRIDO_TENERA + HIBRIDO_OXG)
 *   2.  Insumos
 *   3.  Precios de Abono (escalas genéricas por gramos)
 *   4.  Labores de Finca (nombre + valor_base)
 *   4b. Precios de Palma (PLATEO/PODA/SANIDAD/OTROS — solo GET/PUT, es_sistema)
 *   4c. Labores de Palma Personalizadas (CRUD del tenant — tab OTROS del wizard)
 *   5.  Promedios por Lote (kg/gajo por año)
 *   6.  Cargos (con modalidad y salario_tipo FIJO/VARIABLE)
 *   7.  Modalidades de Contrato
 *   8.  Configuración de Nómina (periodicidad + cortes Q1/Q2 + SMMLV)
 *   9.  Precios de Cosecha (por lote + año)
 *  10.  Auditoría del tenant (read-only, shape paginación no estándar)
 *  11.  Tipos de Hora Extra (7 códigos + descripcion libre)
 *  12.  Paramétricas del Colaborador — 5 catálogos:
 *         EPS, Fondos Pensión, Fondos Cesantías, ARL, Entidades Bancarias
 *  13.  Info Empresa (datos de la finca + logo opcional)
 *  14.  Constantes Legales (SMMLV, fechas legales, días vacaciones)
 *  15.  Tablas Legales (Salud, Pensión, ARL — % por vigencia)
 *  17.  Motivos de Ausencia (Tipos de Novedades, con color hex)
 *
 * §16 Paramétricas de Viajes (Extractoras, Empresas Transportadoras,
 * Transportadores) vive en `api/viajes.ts` porque comparte tipos con el
 * módulo de Viajes (se exportan también desde `api/index.ts`).
 *
 * Base: /api/v1/tenant — todas las llamadas requieren tenant flag (T=true).
 * Permiso típico: `configuracion.editar` (algunos selects aceptan permisos
 * de los módulos que los consumen — ver doc).
 */

import { apiClient, PaginatedResponse } from './client';

const T = true;

function toQuery(params?: object): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Parámetros comunes de listados paginados. */
export interface ParametricaParams {
  search?: string;
  estado?: boolean;
  per_page?: number;
  page?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. SEMILLAS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Tipos válidos según la última versión del doc (§1):
 *  - 4 variedades base (Africana, Híbrido, Compacta, Americana)
 *  - 2 híbridos específicos (HIBRIDO_TENERA DxP, HIBRIDO_OXG E. oleifera × E. guineensis)
 */
export type TipoSemilla =
  | 'Africana'
  | 'Híbrido'
  | 'Compacta'
  | 'Americana'
  | 'HIBRIDO_TENERA'
  | 'HIBRIDO_OXG';

export interface Semilla {
  id: number;
  tipo: TipoSemilla;
  nombre: string;
  estado: boolean;
}

export interface SemillaPayload {
  tipo: TipoSemilla;
  nombre: string;
  estado?: boolean;
}

/** Item devuelto por `/semillas/select` (sin paginación, solo activas). */
export interface SemillaSelectItem {
  id: number;
  tipo: TipoSemilla;
  nombre: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. INSUMOS
// ═════════════════════════════════════════════════════════════════════════════

export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: string;
  estado: boolean;
}

export interface InsumoPayload {
  nombre: string;
  unidad_medida: string;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. PRECIOS DE ABONO (escalas por gramos)
// ═════════════════════════════════════════════════════════════════════════════

export interface PrecioAbono {
  id: number;
  gramos_min: number;
  gramos_max: number;
  precio_palma: number | string;
  estado: boolean;
}

export interface PrecioAbonoPayload {
  gramos_min: number;
  gramos_max: number;
  precio_palma: number;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. LABORES DE FINCA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Trabajos manuales de mantenimiento (reparaciones, transporte interno, etc.).
 * NO confundir con las Labores de Palma (PLATEO/PODA/SANIDAD/OTROS), que son
 * tipos fijos cuyos precios se configuran en `preciosPalma` (§4b).
 *
 * Schema actualizado: ya no hay tipo_pago ni insumo_id ni unidad_medida.
 * Es una labor simple con nombre + valor_base.
 */
export interface Labor {
  id: number;
  nombre: string;
  valor_base: number | string;
  estado: boolean;
}

export interface LaborPayload {
  nombre: string;
  valor_base: number;
  estado?: boolean;
}

/** Item del select de labores (incluye `valor_base` para el wizard). */
export interface LaborSelectItem {
  id: number;
  nombre: string;
  valor_base: number | string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4b. PRECIOS DE PALMA (PLATEO/PODA/SANIDAD/OTROS)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Tipos de palma con precio configurable. Son 4 registros fijos que se siembran
 * al crear el tenant — solo se ACTUALIZA su `precio_palma`. No hay POST ni
 * DELETE (estructura inmutable).
 *
 * - COSECHA       → usa `preciosCosecha` (§9), no esta tabla
 * - FERTILIZACION → usa `preciosAbono` (§3), tampoco esta tabla
 */
export type TipoPalmaPrecio = 'PLATEO' | 'PODA' | 'SANIDAD' | 'OTROS';
export type TipoPagoPalma = 'POR_PALMA' | 'JORNAL_FIJO';

export interface PrecioPalma {
  id: number;
  tipo: TipoPalmaPrecio;
  /**
   * Define cómo se cobra la labor:
   *  - `POR_PALMA`: `valor_total = precio_palma × cantidad_palmas` (el UI muestra
   *    el input "Cantidad Palmas" en el wizard).
   *  - `JORNAL_FIJO`: `valor_total = precio_palma` (valor plano, sin cantidad).
   * Default histórico: PLATEO/PODA `POR_PALMA`; SANIDAD/OTROS `JORNAL_FIJO`.
   */
  tipo_pago: TipoPagoPalma;
  /** null = no configurado. Si es null al registrar jornal, valor_total queda null. */
  precio_palma: number | string | null;
  /**
   * Bandera del backend: `true` para los 4 registros sembrados por el sistema
   * (PLATEO/PODA/SANIDAD/OTROS) que solo aceptan PUT. Las labores creadas por
   * el tenant (§4c) llegan con `es_sistema=false` por el endpoint /labores-palma.
   */
  es_sistema?: boolean;
  estado: boolean;
}

export interface PrecioPalmaPayload {
  tipo_pago?: TipoPagoPalma;
  precio_palma?: number | null;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4c. LABORES DE PALMA PERSONALIZADAS (catálogo custom del tenant)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Labores de palma creadas por el tenant — alimentan el tab OTROS del wizard
 * de planilla diaria. Viven en la misma tabla `precios_palma` con
 * `es_sistema = false`. El select del wizard devuelve solo activas.
 *
 * Reglas clave (doc §4c):
 *  - `nombre` único por tenant (409 `LABOR_PALMA_DUPLICADA`).
 *  - `precio` requerido en POST (no acepta `null`).
 *  - `tipo_pago` `POR_PALMA` o `JORNAL_FIJO`.
 *  - DELETE bloqueado con 409 `LABOR_PALMA_CON_JORNALES` si tiene jornales.
 *  - Intento de editar/eliminar una labor `es_sistema=true` por este endpoint
 *    → 403 (esas se gestionan en §4b vía `preciosPalma`).
 */
export interface LaborPalma {
  id: number;
  nombre: string;
  tipo_pago: TipoPagoPalma;
  /** Precio/palma (POR_PALMA) o valor plano (JORNAL_FIJO). Nunca null. */
  precio_palma: number | string;
  /** Siempre `false` para items creados por este CRUD. */
  es_sistema: false;
  estado: boolean;
}

/** Item del dropdown `/labores-palma/select` (sin paginación, solo activas). */
export interface LaborPalmaSelectItem {
  id: number;
  nombre: string;
  tipo_pago: TipoPagoPalma;
  precio_palma: number | string;
}

export interface LaborPalmaPayload {
  nombre: string;
  tipo_pago: TipoPagoPalma;
  /** Backend lo guarda en `precio_palma`. Requerido en POST; opcional en PUT. */
  precio: number;
  estado?: boolean;
}

/** Filtros de listado paginado (§4c GET index). */
export interface LaborPalmaParams extends ParametricaParams {
  tipo_pago?: TipoPagoPalma;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. PROMEDIOS POR LOTE
// ═════════════════════════════════════════════════════════════════════════════

export interface PromedioLote {
  id: number;
  lote_id: number;
  lote?: { id: number; nombre: string };
  promedio: number | string;
  anio: number;
}

export interface PromedioLotePayload {
  lote_id: number;
  promedio: number;
  anio: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. CARGOS
// ═════════════════════════════════════════════════════════════════════════════

export type SalarioTipoCargo = 'FIJO' | 'VARIABLE';

export interface Cargo {
  id: number;
  modalidad_id: number;
  modalidad?: ModalidadContrato;
  nombre: string;
  salario_tipo: SalarioTipoCargo;
  salario: number | string | null;
  empleados_count?: number;
  estado: boolean;
}

export interface CargoPayload {
  modalidad_id: number;
  nombre: string;
  salario_tipo: SalarioTipoCargo;
  /** null cuando salario_tipo='VARIABLE'. Requerido cuando es FIJO. */
  salario?: number | null;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. MODALIDADES DE CONTRATO
// ═════════════════════════════════════════════════════════════════════════════

export interface ModalidadContrato {
  id: number;
  nombre: string;
  descripcion?: string | null;
  cargos_count?: number;
  estado: boolean;
}

export interface ModalidadContratoPayload {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. CONFIGURACIÓN DE NÓMINA
// ═════════════════════════════════════════════════════════════════════════════

export type TipoPagoNomina = 'QUINCENAL' | 'MENSUAL';

export interface ConfiguracionNomina {
  tipo_pago_nomina: TipoPagoNomina;
  salario_minimo_vigente: number | string;
  auxilio_transporte: number | string;
  divisor_jornada_mensual: number;
  /**
   * Horas/semana (1-96). Devuelto por el GET junto con `divisor_jornada_mensual`.
   * Valores típicos: 48 (CST tradicional → divisor 240) o 42 (Ley 2101/2021 →
   * divisor 210). El backend acepta cualquier número; el divisor lo calcula
   * como `horas × 5`.
   */
  horas_semanales?: number;
  /** Día (1-31) de inicio de la 1ª quincena. Default 1. */
  dia_inicio_q1: number;
  /** Día (1-31) de fin de la 1ª quincena. Default 15. ≥ dia_inicio_q1. */
  dia_fin_q1: number;
  /** Día (1-31) de inicio de la 2ª quincena. Default 16. > dia_fin_q1. */
  dia_inicio_q2: number;
  /** Día (1-31) de fin de la 2ª quincena. Default 31 (clampea al último día del mes). */
  dia_fin_q2: number;
  moneda: string;
  zona_horaria: string;
  pais: string;
}

/**
 * El PUT acepta payloads parciales. Todos los campos son opcionales — la UI
 * está partida en varias vistas y cada una manda solo los que controla.
 * La validación cruzada de fechas Q1/Q2 combina lo enviado con lo actual en BD.
 */
export interface ConfiguracionNominaPayload {
  tipo_pago_nomina?: TipoPagoNomina;
  salario_minimo_vigente?: number;
  auxilio_transporte?: number;
  /** 240 (CST tradicional) o 210 (Ley 2101/2021, 42h/sem). */
  divisor_jornada_mensual?: number;
  /**
   * Alias conveniente del backend — acepta cualquier número de horas semanales
   * (1-96) y calcula `divisor = horas × 5`. Si se mandan ambos, este campo
   * tiene prioridad.
   */
  horas_semanales?: number;
  dia_inicio_q1?: number;
  dia_fin_q1?: number;
  dia_inicio_q2?: number;
  dia_fin_q2?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. PRECIOS DE COSECHA
// ═════════════════════════════════════════════════════════════════════════════

export interface PrecioCosecha {
  id: number;
  lote_id: number;
  lote?: { id: number; nombre: string };
  precio: number | string;
  anio: number;
}

export interface PrecioCosechaPayload {
  lote_id: number;
  precio: number;
  anio: number;
}

export interface PrecioCosechaParams extends ParametricaParams {
  lote_id?: number;
  anio?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. AUDITORÍA
// ═════════════════════════════════════════════════════════════════════════════

export type AuditoriaAccion =
  | 'CREAR' | 'EDITAR' | 'ELIMINAR'
  | 'ACTUALIZAR_PERMISOS' | 'REVOCAR_PERMISOS';

export interface AuditoriaRegistro {
  id: number;
  accion: AuditoriaAccion | string;
  fecha: string;
  usuario: string;
  correo: string;
  modulo: string;
  observaciones: string | null;
  direccion_ip: string | null;
  user_agent: string | null;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  created_at?: string;
}

export interface AuditoriaListadoParams {
  search?: string;
  accion?: AuditoriaAccion | string;
  modulo?: string;
  user_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  sort_by?: 'created_at' | 'accion' | 'modulo' | 'usuario';
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/** El listado de auditoría no usa el `meta:` wrapper, pone los campos al root. */
export interface AuditoriaListadoResponse {
  data: AuditoriaRegistro[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. TIPOS DE HORA EXTRA
// ═════════════════════════════════════════════════════════════════════════════

export type CodigoHoraExtra = 'HED' | 'HEN' | 'RN' | 'HRD' | 'HEDF' | 'HENF' | 'RND';
export type FranjaHoraria = 'DIURNO' | 'NOCTURNO' | 'MIXTO';

export interface TipoHoraExtra {
  id: number;
  codigo: CodigoHoraExtra | string;
  nombre: string;
  porcentaje_recargo: number | string;
  franja_horaria: FranjaHoraria;
  aplica_festivo: boolean;
  es_extra: boolean;
  paga_hora_completa: boolean;
  /** Texto libre para la UI (ej. "Lunes a sábado 6:00 AM - 9:00 PM"). Solo display, no afecta cálculo. */
  descripcion?: string | null;
  estado: boolean;
}

export interface TipoHoraExtraPayload {
  codigo: string;
  nombre: string;
  porcentaje_recargo: number;
  franja_horaria: FranjaHoraria;
  aplica_festivo?: boolean;
  es_extra?: boolean;
  paga_hora_completa?: boolean;
  descripcion?: string | null;
  estado?: boolean;
}

/** Item devuelto por `GET /tipos-hora-extra/codigos` — los 7 códigos legales
 *  colombianos con metadata para pre-poblar el form "Nuevo Tipo de Hora Extra". */
export interface TipoHoraExtraCodigoItem {
  codigo: CodigoHoraExtra;
  nombre: string;
  descripcion: string;
  es_extra: boolean;
  paga_hora_completa: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. PARAMÉTRICAS DEL COLABORADOR (EPS, Fondos Pensión, Fondos Cesantías, ARL, Bancos)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Shape básica: EPS, FondoPension y Arl. Solo `nombre` + `estado`.
 * (Entidades Bancarias usa una versión extendida — ver abajo).
 */
export interface ParametricaColaborador {
  id: number;
  nombre: string;
  estado: boolean;
}

export interface ParametricaColaboradorPayload {
  nombre: string;
  estado?: boolean;
}

/**
 * Entidad Bancaria: extiende la base con `codigo` y `contacto` opcionales,
 * exclusivos de este recurso según el doc §12.
 */
export interface EntidadBancaria extends ParametricaColaborador {
  /** Código del banco (ej. "001" para Bancolombia). Opcional. */
  codigo: string | null;
  /** Línea de atención / contacto. Opcional. */
  contacto: string | null;
}

export interface EntidadBancariaPayload {
  nombre: string;
  codigo?: string | null;
  contacto?: string | null;
  estado?: boolean;
}

/** Item devuelto por `/entidades-bancarias/select` (incluye codigo + contacto). */
export interface EntidadBancariaSelectItem {
  id: number;
  nombre: string;
  codigo: string | null;
  contacto: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 13. INFO EMPRESA
// ═════════════════════════════════════════════════════════════════════════════

export type TipoPersona = 'NATURAL' | 'JURIDICA';

export interface InfoEmpresa {
  id: number;
  nombre: string;
  tipo_persona: TipoPersona;
  nit: string | null;
  razon_social: string | null;
  actividad_economica: string | null;
  representante_nombre: string | null;
  representante_cedula: string | null;
  representante_cargo: string | null;
  direccion: string | null;
  departamento: string | null;
  municipio: string | null;
  correo_contacto: string | null;
  telefono: string | null;
  telefono_fijo: string | null;
  sitio_web: string | null;
  logo_url: string | null;
}

/** Payload multipart — `logo` es File (no string). */
export interface InfoEmpresaPayload {
  nombre?: string;
  tipo_persona?: TipoPersona;
  nit?: string;
  razon_social?: string;
  actividad_economica?: string;
  representante_nombre?: string;
  representante_cedula?: string;
  representante_cargo?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
  correo_contacto?: string;
  telefono?: string;
  telefono_fijo?: string;
  sitio_web?: string;
  logo?: File;
}

// ═════════════════════════════════════════════════════════════════════════════
// 14. CONSTANTES LEGALES
// ═════════════════════════════════════════════════════════════════════════════

export interface ConstantesLegales {
  anio_vigente: number;
  salario_minimo_vigente: number | string;
  auxilio_transporte: number | string;
  tasa_interes_cesantias: number | string;
  fecha_limite_consignacion_cesantias: string;
  fecha_limite_pago_intereses_cesantias: string;
  fecha_limite_prima_primer_semestre: string;
  fecha_limite_prima_segundo_semestre: string;
  dias_vacaciones_anuales: number;
  dias_anio_comercial: number;
  dias_mes_comercial: number;
}

export type ConstantesLegalesPayload = Partial<ConstantesLegales>;

// ═════════════════════════════════════════════════════════════════════════════
// 15. TABLAS LEGALES (% Salud/Pensión/ARL por vigencia)
// ═════════════════════════════════════════════════════════════════════════════

export interface TablaLegalConcepto {
  id: number;
  nombre: string;
  subtipo: 'SALUD' | 'PENSION' | 'ARL';
}

export interface TablaLegal {
  id: number;
  concepto_id: number;
  concepto?: TablaLegalConcepto;
  porcentaje_empleado: number | string;
  porcentaje_empresa: number | string;
  /** dd/mm/yyyy */
  vigente_desde: string;
  /** dd/mm/yyyy o null (vigente indefinidamente). */
  vigente_hasta: string | null;
}

export interface TablaLegalPayload {
  concepto_id: number;
  porcentaje_empleado: number;
  porcentaje_empresa: number;
  /** dd/mm/yyyy */
  vigente_desde: string;
  /** dd/mm/yyyy */
  vigente_hasta?: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 17. MOTIVOS DE AUSENCIA (Tipos de Novedades)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 11 tipos base fijos del enum del backend. Discriminador de regla de cálculo
 * en nómina (dias 1-2 EPS al 100%, dias 3+ al 66.67%, etc.).
 */
export type TipoBaseAusencia =
  | 'INCAPACIDAD_EPS'
  | 'INCAPACIDAD_ARL'
  | 'LICENCIA_MATERNIDAD'
  | 'LICENCIA_PATERNIDAD'
  | 'LICENCIA_LUTO'
  | 'PERMISO_REMUNERADO'
  | 'PERMISO_NO_REMUNERADO'
  | 'AUSENCIA_INJUSTIFICADA'
  | 'CALAMIDAD_DOMESTICA'
  | 'SUSPENSION_DISCIPLINARIA'
  | 'OTRO';

export interface MotivoAusencia {
  id: number;
  nombre: string;
  tipo_base: TipoBaseAusencia;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago_default: number | string;
  requiere_soporte: boolean;
  /** Hex `#RRGGBB` (regex `/^#[0-9a-fA-F]{6}$/`). Usado para el punto de color del listado. */
  color: string;
  estado: boolean;
}

export interface MotivoAusenciaPayload {
  nombre: string;
  tipo_base: TipoBaseAusencia;
  es_remunerada?: boolean;
  afecta_nomina?: boolean;
  porcentaje_pago_default?: number;
  requiere_soporte?: boolean;
  /** Hex `#RRGGBB`. */
  color?: string;
  estado?: boolean;
}

export interface MotivoAusenciaSelectItem {
  id: number;
  nombre: string;
  tipo_base: TipoBaseAusencia;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago_default: number | string;
  requiere_soporte: boolean;
  color: string;
}

export interface MotivoAusenciaListadoParams extends ParametricaParams {
  tipo_base?: TipoBaseAusencia;
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENTE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper para construir endpoints CRUD estándar de una paramétrica que sigue
 * el patrón GET listar / GET ver / POST crear / PUT editar / DELETE eliminar.
 * Evita repetir 5 líneas por cada paramétrica.
 */
function crudParametrica<T, P>(base: string) {
  return {
    listar: (params?: ParametricaParams) =>
      apiClient.get<PaginatedResponse<T>>(`/v1/tenant/${base}${toQuery(params)}`, true),
    ver: (id: number) =>
      apiClient.get<{ data: T }>(`/v1/tenant/${base}/${id}`, true),
    crear: (payload: P) =>
      apiClient.post<{ message: string; data: T }>(`/v1/tenant/${base}`, payload, true),
    editar: (id: number, payload: Partial<P> & { estado?: boolean }) =>
      apiClient.put<{ message: string; data: T }>(`/v1/tenant/${base}/${id}`, payload, true),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/${base}/${id}`, true),
  };
}

/**
 * Helper para paramétricas del colaborador (EPS, Fondos, ARL, Bancos) que
 * además exponen un endpoint /select sin paginación (solo activos).
 */
function crudParametricaColaborador(base: string) {
  return {
    ...crudParametrica<ParametricaColaborador, ParametricaColaboradorPayload>(base),
    select: () =>
      apiClient.get<{ data: ParametricaColaborador[] }>(`/v1/tenant/${base}/select`, true),
  };
}

export const configuracionApi = {
  // ── 1. Semillas (con /select para dropdowns de Lotes) ──────────────────────
  semillas: {
    ...crudParametrica<Semilla, SemillaPayload>('semillas'),
    /** Dropdown sin paginación, solo activas, ordenado por nombre. */
    select: () =>
      apiClient.get<{ data: SemillaSelectItem[] }>('/v1/tenant/semillas/select', T),
  },

  // ── 2. Insumos ─────────────────────────────────────────────────────────────
  insumos: crudParametrica<Insumo, InsumoPayload>('insumos'),

  // ── 3. Precios de Abono (sin paginación; pocos rangos) ─────────────────────
  preciosAbono: {
    listar: () =>
      apiClient.get<{ data: PrecioAbono[] }>('/v1/tenant/precios-abono', T),
    crear: (payload: PrecioAbonoPayload) =>
      apiClient.post<{ message: string; data: PrecioAbono }>('/v1/tenant/precios-abono', payload, T),
    editar: (id: number, payload: Partial<PrecioAbonoPayload>) =>
      apiClient.put<{ message: string; data: PrecioAbono }>(`/v1/tenant/precios-abono/${id}`, payload, T),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/precios-abono/${id}`, T),
  },

  // ── 4. Labores de Finca (con /select para wizard de Operaciones) ───────────
  labores: {
    ...crudParametrica<Labor, LaborPayload>('labores'),
    /** Dropdown del wizard. Incluye `valor_base`. `?estado=false` para inactivas. */
    select: (params?: { estado?: boolean }) =>
      apiClient.get<{ data: LaborSelectItem[] }>(
        `/v1/tenant/labores/select${toQuery(params)}`, T),
  },

  // ── 4b. Precios de Palma (PLATEO/PODA/SANIDAD/OTROS — solo GET/PUT) ────────
  preciosPalma: {
    listar: () =>
      apiClient.get<{ data: PrecioPalma[] }>('/v1/tenant/precios-palma', T),
    ver: (id: number) =>
      apiClient.get<{ data: PrecioPalma }>(`/v1/tenant/precios-palma/${id}`, T),
    /**
     * Solo PUT — los 4 registros son inmutables en estructura, solo cambia
     * `precio_palma`, `tipo_pago` y/o `estado`. No hay POST ni DELETE.
     */
    editar: (id: number, payload: PrecioPalmaPayload) =>
      apiClient.put<{ message: string; data: PrecioPalma }>(
        `/v1/tenant/precios-palma/${id}`, payload, T),
  },

  // ── 4c. Labores de Palma Personalizadas (catálogo custom del tenant) ───────
  laboresPalma: {
    /** Dropdown del wizard (tab OTROS). Permiso ampliado: configuracion.editar
     *  o operaciones.crear|editar. Sin paginación, solo activas. */
    select: () =>
      apiClient.get<{ data: LaborPalmaSelectItem[] }>(
        '/v1/tenant/labores-palma/select', T),
    listar: (params?: LaborPalmaParams) =>
      apiClient.get<PaginatedResponse<LaborPalma>>(
        `/v1/tenant/labores-palma${toQuery(params)}`, T),
    ver: (id: number) =>
      apiClient.get<{ data: LaborPalma }>(`/v1/tenant/labores-palma/${id}`, T),
    crear: (payload: LaborPalmaPayload) =>
      apiClient.post<{ message: string; data: LaborPalma }>(
        '/v1/tenant/labores-palma', payload, T),
    editar: (id: number, payload: Partial<LaborPalmaPayload>) =>
      apiClient.put<{ message: string; data: LaborPalma }>(
        `/v1/tenant/labores-palma/${id}`, payload, T),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/labores-palma/${id}`, T),
  },

  // ── 5. Promedios por Lote ──────────────────────────────────────────────────
  promediosLote: {
    ...crudParametrica<PromedioLote, PromedioLotePayload>('promedios-lote'),
    listar: (params?: ParametricaParams & { lote_id?: number; anio?: number }) =>
      apiClient.get<PaginatedResponse<PromedioLote>>(`/v1/tenant/promedios-lote${toQuery(params)}`, T),
  },

  // ── 6. Cargos (con filtro salario_tipo) ────────────────────────────────────
  cargos: {
    ...crudParametrica<Cargo, CargoPayload>('cargos'),
    listar: (params?: ParametricaParams & { salario_tipo?: SalarioTipoCargo }) =>
      apiClient.get<PaginatedResponse<Cargo>>(`/v1/tenant/cargos${toQuery(params)}`, T),
  },

  // ── 7. Modalidades de Contrato ─────────────────────────────────────────────
  modalidades: crudParametrica<ModalidadContrato, ModalidadContratoPayload>('modalidades'),

  // ── 8. Configuración de Nómina (singular: GET/PUT) ─────────────────────────
  configuracionNomina: {
    obtener: () =>
      apiClient.get<{ data: ConfiguracionNomina }>('/v1/tenant/configuracion/nomina', T),
    actualizar: (payload: ConfiguracionNominaPayload) =>
      apiClient.put<{ message: string; data: ConfiguracionNomina }>(
        '/v1/tenant/configuracion/nomina', payload, T),
  },

  // ── 9. Precios de Cosecha ──────────────────────────────────────────────────
  preciosCosecha: {
    ...crudParametrica<PrecioCosecha, PrecioCosechaPayload>('precios-cosecha'),
    listar: (params?: PrecioCosechaParams) =>
      apiClient.get<PaginatedResponse<PrecioCosecha>>(`/v1/tenant/precios-cosecha${toQuery(params)}`, T),
  },

  // ── 10. Auditoría (solo lectura, shape de paginación no estándar) ──────────
  auditoria: {
    listar: (params?: AuditoriaListadoParams) =>
      apiClient.get<AuditoriaListadoResponse>(`/v1/tenant/auditorias${toQuery(params)}`, T),
    ver: (id: number) =>
      apiClient.get<{ data: AuditoriaRegistro }>(`/v1/tenant/auditorias/${id}`, T),
  },

  // ── 11. Tipos de Hora Extra ────────────────────────────────────────────────
  tiposHoraExtra: {
    ...crudParametrica<TipoHoraExtra, TipoHoraExtraPayload>('tipos-hora-extra'),
    /** Sin paginación. Permiso ampliado (configuración o operaciones). */
    select: () =>
      apiClient.get<{ data: TipoHoraExtra[] }>('/v1/tenant/tipos-hora-extra/select', T),
    /** Lista estática de los 7 códigos legales colombianos (HED, HEN, RN, HRD,
     *  HEDF, HENF, RND). Sirve para poblar el selector de `codigo` al crear un
     *  nuevo tipo y pre-llenar `nombre`, `descripcion`, `es_extra`,
     *  `paga_hora_completa` según el código elegido. */
    codigos: () =>
      apiClient.get<{ data: TipoHoraExtraCodigoItem[] }>('/v1/tenant/tipos-hora-extra/codigos', T),
  },

  // ── 12. Paramétricas del Colaborador ───────────────────────────────────────
  // EPS / Fondos Pensión / Fondos Cesantías / ARL: shape básica (solo nombre + estado).
  eps: crudParametricaColaborador('eps'),
  fondosPension: crudParametricaColaborador('fondos-pension'),
  fondosCesantias: crudParametricaColaborador('fondos-cesantias'),
  arl: crudParametricaColaborador('arl'),

  /**
   * Entidades Bancarias: shape extendida con `codigo` y `contacto` (§12).
   * No reusamos el helper genérico porque el shape difiere.
   */
  entidadesBancarias: {
    ...crudParametrica<EntidadBancaria, EntidadBancariaPayload>('entidades-bancarias'),
    /** `/entidades-bancarias/select` incluye codigo + contacto. */
    select: () =>
      apiClient.get<{ data: EntidadBancariaSelectItem[] }>(
        '/v1/tenant/entidades-bancarias/select', T),
  },

  // ── 13. Info Empresa ───────────────────────────────────────────────────────
  // Si el payload incluye `logo` (File) → multipart. En cualquier otro caso
  // mandamos JSON con PUT normal (el backend Laravel no parsea multipart en
  // métodos PUT, así que solo lo usamos cuando es estrictamente necesario).
  infoEmpresa: {
    obtener: () =>
      apiClient.get<{ data: InfoEmpresa }>('/v1/tenant/configuracion/info-empresa', T),
    actualizar: (payload: InfoEmpresaPayload) => {
      const tieneLogo = payload.logo instanceof File;
      if (!tieneLogo) {
        const { logo: _ignored, ...resto } = payload;
        return apiClient.put<{ message: string; data: InfoEmpresa }>(
          '/v1/tenant/configuracion/info-empresa', resto, T);
      }
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        form.append(k, v as string | Blob);
      });
      return apiClient.putForm<{ message: string; data: InfoEmpresa }>(
        '/v1/tenant/configuracion/info-empresa', form, T);
    },
  },

  // ── 14. Constantes Legales (singular: GET/PUT) ─────────────────────────────
  constantesLegales: {
    obtener: () =>
      apiClient.get<{ data: ConstantesLegales }>('/v1/tenant/configuracion/constantes-legales', T),
    actualizar: (payload: ConstantesLegalesPayload) =>
      apiClient.put<{ message: string; data: ConstantesLegales }>(
        '/v1/tenant/configuracion/constantes-legales', payload, T),
  },

  // ── 15. Tablas Legales (sin paginación; pocos registros) ───────────────────
  tablasLegales: {
    listar: () =>
      apiClient.get<{ data: TablaLegal[] }>('/v1/tenant/configuracion/tablas-legales', T),
    /** Conceptos disponibles para el dropdown (Salud, Pensión, ARL). */
    conceptosSelect: () =>
      apiClient.get<{ data: TablaLegalConcepto[] }>(
        '/v1/tenant/configuracion/tablas-legales/conceptos-select', T),
    crear: (payload: TablaLegalPayload) =>
      apiClient.post<{ message: string; data: TablaLegal }>(
        '/v1/tenant/configuracion/tablas-legales', payload, T),
    editar: (id: number, payload: Partial<TablaLegalPayload>) =>
      apiClient.put<{ message: string; data: TablaLegal }>(
        `/v1/tenant/configuracion/tablas-legales/${id}`, payload, T),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(
        `/v1/tenant/configuracion/tablas-legales/${id}`, T),
  },

  // ── 17. Motivos de Ausencia (Tipos de Novedades) ──────────────────────────
  motivosAusencia: {
    /** Dropdown sin paginación (solo activos). Acepta permiso `configuracion.editar` o `operaciones.{crear|editar}`. */
    select: () =>
      apiClient.get<{ data: MotivoAusenciaSelectItem[] }>('/v1/tenant/motivos-ausencia/select', T),
    listar: (params?: MotivoAusenciaListadoParams) =>
      apiClient.get<PaginatedResponse<MotivoAusencia>>(
        `/v1/tenant/motivos-ausencia${toQuery(params)}`, T),
    ver: (id: number) =>
      apiClient.get<{ data: MotivoAusencia }>(`/v1/tenant/motivos-ausencia/${id}`, T),
    crear: (payload: MotivoAusenciaPayload) =>
      apiClient.post<{ message: string; data: MotivoAusencia }>(
        '/v1/tenant/motivos-ausencia', payload, T),
    editar: (id: number, payload: Partial<MotivoAusenciaPayload>) =>
      apiClient.put<{ message: string; data: MotivoAusencia }>(
        `/v1/tenant/motivos-ausencia/${id}`, payload, T),
    /** Falla con 409 `MOTIVO_CON_AUSENCIAS` si tiene ausencias asociadas. */
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/motivos-ausencia/${id}`, T),
  },

  // ── Legacy: perfil y password (siguen en /tenant/perfil, no en este doc) ──
  editarPerfil: (payload: { name?: string; email?: string }) =>
    apiClient.put<{ message: string }>('/v1/tenant/perfil', payload, T),
  cambiarPassword: (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) =>
    apiClient.put<{ message: string }>('/v1/tenant/perfil/password', payload, T),
};

// ─── Códigos de error específicos del módulo (doc) ────────────────────────────
export const ConfiguracionErrorCodes = {
  /** Semilla asignada a uno o más lotes — no se puede eliminar. */
  SEMILLA_CON_LOTES: 'SEMILLA_CON_LOTES',
  INSUMO_CON_LABORES: 'INSUMO_CON_LABORES',
  RANGO_SOLAPADO: 'RANGO_SOLAPADO',
  /** Labor de Finca con jornales asociados — no se puede eliminar. */
  LABOR_CON_JORNALES: 'LABOR_CON_JORNALES',
  /** Labor de Palma personalizada con nombre duplicado en el tenant (§4c). */
  LABOR_PALMA_DUPLICADA: 'LABOR_PALMA_DUPLICADA',
  /** Labor de Palma personalizada con jornales asociados — no se puede eliminar. */
  LABOR_PALMA_CON_JORNALES: 'LABOR_PALMA_CON_JORNALES',
  PROMEDIO_DUPLICADO: 'PROMEDIO_DUPLICADO',
  CARGO_CON_EMPLEADOS: 'CARGO_CON_EMPLEADOS',
  MODALIDAD_CON_CARGOS: 'MODALIDAD_CON_CARGOS',
  PRECIO_COSECHA_DUPLICADO: 'PRECIO_COSECHA_DUPLICADO',
  TIPO_HORA_EXTRA_CON_REGISTROS: 'TIPO_HORA_EXTRA_CON_REGISTROS',
  NIT_DUPLICATED: 'NIT_DUPLICATED',
  /** Días Q1/Q2 inconsistentes (fin<inicio o solapamiento). */
  CORTE_QUINCENA_INVALIDO: 'CORTE_QUINCENA_INVALIDO',
  /** Motivo de ausencia con ausencias asociadas — no se puede eliminar. */
  MOTIVO_CON_AUSENCIAS: 'MOTIVO_CON_AUSENCIAS',
} as const;
