/**
 * API — Configuración / Paramétricas
 *
 * Cubre las 16 secciones del doc API_PARAMETRICAS.md (Tablas Legales fue
 * eliminada del backend en la última revisión):
 *   1.  Semillas (6 tipos: 4 base + HIBRIDO_TENERA + HIBRIDO_OXG)
 *   2.  Insumos
 *   3.  Precios de Abono (escalas genéricas por gramos)
 *   4.  Labores (catálogo UNIFICADO: palma fijas + custom palma + custom finca).
 *       Reemplaza los antiguos endpoints /precios-palma, /labores-palma y
 *       /labores (legacy). Discriminador: categoria + es_sistema.
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
 *  15.  → vive en `api/viajes.ts` (Extractoras, Empresas Transportadoras,
 *         Transportadores). Re-exportadas desde `api/index.ts`.
 *  16.  Motivos de Ausencia (Tipos de Novedades, con color hex)
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
// 4. LABORES (catálogo unificado: palma + finca)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Catálogo unificado de labores. Reemplaza 3 endpoints antiguos:
 *  - `/precios-palma`         → ahora se gestiona como labores PALMA es_sistema=true
 *  - `/labores-palma`         → ahora son labores PALMA es_sistema=false
 *  - `/labores` (solo finca)  → ahora es labores FINCA es_sistema=false
 *
 * Tipos de registros:
 *  - Fijas del sistema (5/tenant): PALMA + es_sistema=true + tipo∈{COSECHA,
 *    PLATEO, PODA, FERTILIZACION, SANIDAD}. Solo PUT (`tipo_pago`, `precio_palma`,
 *    `estado`). No se crean ni borran.
 *  - Custom palma:   PALMA + es_sistema=false + tipo=null. Aparecen junto a las
 *    fijas en el dropdown del wizard.
 *  - Custom finca:   FINCA + es_sistema=false + tipo=null. tipo_pago siempre
 *    JORNAL_FIJO (forzado por el modelo).
 */

export type CategoriaLabor = 'PALMA' | 'FINCA';
/**
 * Enum de labores fijas del sistema (`es_sistema=true`). Desde agosto 2026
 * OTROS pasó a ser una labor fija sembrada en todo tenant (default JORNAL_FIJO)
 * — antes era solo `tipo=null` en labores custom. La fija OTROS NO admite
 * sub-actividades: el trabajo se describe con `descripcion`/`nombre_trabajo`.
 */
export type TipoLaborPalma = 'COSECHA' | 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';
export type TipoPagoLabor = 'POR_PALMA' | 'JORNAL_FIJO';

export interface Labor {
  id: number;
  tenant_id?: number;
  categoria: CategoriaLabor;
  /** Solo poblado en fijas del sistema; null en custom. */
  tipo: TipoLaborPalma | null;
  nombre: string;
  tipo_pago: TipoPagoLabor;
  /** null = aún no configurado. Si es null al registrar jornal, valor_total queda null. */
  precio_palma: number | string | null;
  /** true = sembrada por el sistema (no se borra, nombre/categoría/tipo inmutables). */
  es_sistema: boolean;
  estado: boolean;
}

/**
 * Item del dropdown `/labores/select`. Incluye `requiere_cosecha_workflow` para
 * que el wizard de operaciones sepa si esta labor activa el flujo especial de
 * cosecha (cuadrilla + peso confirmado vía /operaciones/{id}/cosechas).
 */
export interface LaborSelectItem {
  id: number;
  nombre: string;
  categoria: CategoriaLabor;
  tipo: TipoLaborPalma | null;
  tipo_pago: TipoPagoLabor;
  precio_palma: number | string | null;
  es_sistema: boolean;
  requiere_cosecha_workflow: boolean;
}

export interface LaborPayload {
  categoria: CategoriaLabor;
  nombre: string;
  /** Requerido en POST si categoria=PALMA. FINCA siempre fuerza JORNAL_FIJO. */
  tipo_pago?: TipoPagoLabor;
  precio_palma?: number | null;
  estado?: boolean;
}

/** Filtros del listado paginado §4 GET index. */
export interface LaborParams extends ParametricaParams {
  categoria?: CategoriaLabor;
  tipo?: TipoLaborPalma;
  tipo_pago?: TipoPagoLabor;
  es_sistema?: boolean;
}

/**
 * §19 Actividad de Labor (sublabor). Registro del catálogo predefinido de
 * "trabajos realizados" que aparece en las tabs SANIDAD y OTROS del wizard.
 */
export interface LaborActividad {
  id: number;
  tenant_id: number;
  labor_id: number;
  nombre: string;
  estado: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LaborActividadPayload {
  nombre: string;
  estado?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. PROMEDIOS POR LOTE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * §5 Promedio por lote (historial kg/gajo).
 *
 * Dos tipos de registro conviven en la misma tabla, diferenciados por `viaje_id`:
 *  - **Baseline admin** (`viaje_id = null`): lo crea/edita/elimina el admin desde
 *    el CRUD. Sirve como referencia manual.
 *  - **Generado por viaje** (`viaje_id` FK): lo crea automáticamente el backend
 *    al finalizar un viaje homogéneo (ver `ViajeCalculationService`). Es
 *    **inmutable**: PUT/DELETE devuelven 409 `PROMEDIO_DE_VIAJE`.
 *
 * Ya **no hay restricción única `(lote_id, anio)`** — varios baselines para el
 * mismo lote+año son válidos.
 */
export interface PromedioLote {
  id: number;
  lote_id: number;
  /** FK a `viajes` — null si es un baseline admin; presente si lo generó un viaje. */
  viaje_id?: number | null;
  promedio: number | string;
  anio: number;
  /**
   * Fecha del promedio. Usada por nómina para filtrar registros del período.
   * Si se omite, el registro queda sin fecha y **no entra en el cálculo de
   * nómina por período** (solo sirve como fallback baseline).
   */
  fecha?: string | null;
  lote?: { id: number; nombre: string };
  /** Presente cuando `viaje_id` no es null. */
  viaje?: { id: number; remision: string; fecha_viaje: string } | null;
}

export interface PromedioLotePayload {
  lote_id: number;
  promedio: number;
  anio: number;
  /** Opcional. Si se omite, el registro queda sin fecha (fallback baseline). */
  fecha?: string;
}

/** Filtros del listado de promedios por lote (§5 GET index). */
export interface PromedioLoteParams extends ParametricaParams {
  lote_id?: number;
  anio?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  /** Si `true`, solo registros con `viaje_id = null` (baselines admin). */
  solo_baseline?: boolean;
  /** Si `true`, solo registros con `viaje_id IS NOT NULL` (auto-generados). */
  solo_viajes?: boolean;
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
 *  colombianos con metadata para pre-poblar el form "Nuevo Tipo de Hora Extra".
 *  `porcentaje_recargo` corresponde a la **Ley 2466/2025** (HRD 90%, HEDF 115%,
 *  HENF 165%, RND 125%). */
export interface TipoHoraExtraCodigoItem {
  codigo: CodigoHoraExtra;
  nombre: string;
  descripcion: string;
  es_extra: boolean;
  paga_hora_completa: boolean;
  porcentaje_recargo: number | string;
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
// 16. MOTIVOS DE AUSENCIA (Tipos de Novedades)
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
  /** Condición legal / restricción de días (ej. "Día 1-2: 100% / Día 3-90: 66.67%"). Solo informativo. */
  condicion?: string | null;
  /** Norma de referencia (ej. "Art. 227 CST", "Ley 1822 de 2017"). Solo informativo. */
  norma_legal?: string | null;
  /** Descripción libre de la fórmula. Solo informativo. */
  formula_calculo?: string | null;
  /** Se **snapshottea en `ausencias.afecta_seguridad_social`** al crear la ausencia. IBC salud/pensión. */
  afecta_seguridad_social?: boolean;
  /** Snapshoteado en ausencias. Cuenta para SENA, ICBF, Caja de Compensación. */
  afecta_parafiscales?: boolean;
  /** Snapshoteado en ausencias. Cuenta para cesantías, prima, vacaciones. */
  afecta_prestaciones?: boolean;
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
  condicion?: string | null;
  norma_legal?: string | null;
  formula_calculo?: string | null;
  afecta_seguridad_social?: boolean;
  afecta_parafiscales?: boolean;
  afecta_prestaciones?: boolean;
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
  afecta_seguridad_social?: boolean;
  afecta_parafiscales?: boolean;
  afecta_prestaciones?: boolean;
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

  // ── 4. Labores (catálogo unificado: palma fijas + custom palma + custom finca)
  /**
   * Reemplaza los 3 endpoints antiguos:
   *  - /precios-palma  → labores con es_sistema=true (PALMA)
   *  - /labores-palma  → labores con es_sistema=false categoria=PALMA
   *  - /labores legacy → labores con es_sistema=false categoria=FINCA
   *
   * El nuevo /labores cubre todo con un discriminador `categoria` y la bandera
   * `es_sistema`. El wizard de operaciones filtra con ?categoria=PALMA o FINCA.
   */
  labores: {
    listar: (params?: LaborParams) =>
      apiClient.get<PaginatedResponse<Labor>>(
        `/v1/tenant/labores${toQuery(params)}`, T),
    ver: (id: number) =>
      apiClient.get<{ data: Labor }>(`/v1/tenant/labores/${id}`, T),
    /** Dropdown del wizard. Filtros recomendados: ?categoria=PALMA|FINCA. */
    select: (params?: { categoria?: CategoriaLabor; estado?: boolean }) =>
      apiClient.get<{ data: LaborSelectItem[] }>(
        `/v1/tenant/labores/select${toQuery(params)}`, T),
    crear: (payload: LaborPayload) =>
      apiClient.post<{ message: string; data: Labor }>(
        '/v1/tenant/labores', payload, T),
    editar: (id: number, payload: Partial<LaborPayload>) =>
      apiClient.put<{ message: string; data: Labor }>(
        `/v1/tenant/labores/${id}`, payload, T),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/labores/${id}`, T),
  },

  /**
   * §19 Actividades de Labor (Sublabores).
   *
   * Catálogo de actividades predefinidas para las tabs SANIDAD y OTROS
   * (labores custom de PALMA) del wizard de Operaciones. Reemplaza el campo
   * de texto libre "Trabajo Realizado" por un select del catálogo.
   *
   * Alcance: solo aplica a labores donde:
   *  - `tipo = 'SANIDAD'` (fija del sistema), O
   *  - `es_sistema = false` AND `categoria = 'PALMA'` AND `tipo IS NULL`.
   *
   * Endpoints:
   *  GET    /labores/{labor}/actividades              — lista por labor
   *  POST   /labores/{labor}/actividades              — crea desde configuración
   *  POST   /labores/{labor}/actividades/wizard       — quick-create desde wizard
   *  GET    /labor-actividades/{id}                   — detalle
   *  PUT    /labor-actividades/{id}                   — editar
   *  DELETE /labor-actividades/{id}                   — eliminar
   */
  laborActividades: {
    /** Lista actividades de una labor. `estado`: 'all' → todas, false → inactivas,
     *  sin param → solo activas (default backend). */
    listarPorLabor: (laborId: number, params?: { estado?: boolean | 'all' }) =>
      apiClient.get<{ data: LaborActividad[] }>(
        `/v1/tenant/labores/${laborId}/actividades${toQuery(params)}`, T),
    /** Crear desde pantalla de configuración (requiere `configuracion.editar`). */
    crear: (laborId: number, payload: LaborActividadPayload) =>
      apiClient.post<{ message: string; data: LaborActividad }>(
        `/v1/tenant/labores/${laborId}/actividades`, payload, T),
    /**
     * Quick-create desde el wizard (permite `operaciones.crear` u `.editar`,
     * NO requiere `configuracion.editar`). Si el nombre ya existe devuelve
     * 409 `ACTIVIDAD_DUPLICADA` con el registro existente en `data`.
     */
    crearDesdeWizard: (laborId: number, nombre: string) =>
      apiClient.post<{ message: string; data: LaborActividad }>(
        `/v1/tenant/labores/${laborId}/actividades/wizard`, { nombre }, T),
    ver: (id: number) =>
      apiClient.get<{ data: LaborActividad }>(`/v1/tenant/labor-actividades/${id}`, T),
    editar: (id: number, payload: Partial<LaborActividadPayload>) =>
      apiClient.put<{ message: string; data: LaborActividad }>(
        `/v1/tenant/labor-actividades/${id}`, payload, T),
    eliminar: (id: number) =>
      apiClient.delete<{ message: string }>(`/v1/tenant/labor-actividades/${id}`, T),
  },

  // ── 5. Promedios por Lote ──────────────────────────────────────────────────
  // CRUD admin sobre baselines (`viaje_id = null`). Los registros con
  // `viaje_id` (auto-generados por viajes homogéneos) son inmutables y
  // PUT/DELETE responden 409 `PROMEDIO_DE_VIAJE`.
  promediosLote: {
    ...crudParametrica<PromedioLote, PromedioLotePayload>('promedios-lote'),
    listar: (params?: PromedioLoteParams) =>
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

  // ── 17. Bundle "Precios de Labores" ───────────────────────────────────────
  /**
   * §17 del doc API_PARAMETRICAS.md — reemplaza las 6 llamadas paralelas que
   * la pantalla de Precios de Labores disparaba al cargar. Devuelve los 6
   * datasets en una sola respuesta (cacheada server-side, TTL 60s, invalidada
   * automáticamente por POST/PUT/DELETE en labores, precios-cosecha,
   * precios-abono o lotes).
   *
   * Permiso: `configuracion.editar`.
   *
   * Param opcional: `per_page_cosecha` (default 100) — límite de registros de
   * precios_cosecha incluidos en el bundle.
   */
  preciosLaboresBundle: {
    obtener: (params?: { per_page_cosecha?: number }) =>
      apiClient.get<{ data: {
        precios_cosecha: PrecioCosecha[];
        precios_abono: PrecioAbono[];
        labores_palma_fijas: Labor[];
        labores_palma_custom: Labor[];
        labores_finca: Labor[];
        lotes: Array<{ id: number; nombre: string; predio_id: number; predio?: { id: number; nombre: string } }>;
      } }>(`/v1/tenant/configuracion/precios-labores/init${toQuery(params)}`, T),
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

  // ── 16. Motivos de Ausencia (Tipos de Novedades) ──────────────────────────
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
  /** Labor con nombre duplicado en el tenant (§4 unificado). */
  LABOR_DUPLICADA: 'LABOR_DUPLICADA',
  /** Labor con jornales asociados — no se puede eliminar. */
  LABOR_CON_JORNALES: 'LABOR_CON_JORNALES',
  /** Labor COSECHA fija con registros de cosecha asociados. */
  LABOR_CON_COSECHAS: 'LABOR_CON_COSECHAS',
  /** Intento de eliminar una labor `es_sistema=true`. */
  LABOR_DEL_SISTEMA: 'LABOR_DEL_SISTEMA',
  /** @deprecated alias retrocompatible — usar `LABOR_DUPLICADA`. */
  LABOR_PALMA_DUPLICADA: 'LABOR_DUPLICADA',
  /** @deprecated alias retrocompatible — usar `LABOR_CON_JORNALES`. */
  LABOR_PALMA_CON_JORNALES: 'LABOR_CON_JORNALES',
  /** Intento de PUT/DELETE sobre un promedio generado automáticamente por un
   *  viaje homogéneo (`viaje_id IS NOT NULL`). Esos registros son inmutables. */
  PROMEDIO_DE_VIAJE: 'PROMEDIO_DE_VIAJE',
  /** @deprecated El doc viejo ya no usa este código. El modelo nuevo permite
   *  varios baselines para el mismo `(lote_id, anio)`. Mantenemos el alias
   *  para no romper consumidores que aún lo referencien en su catch. */
  PROMEDIO_DUPLICADO: 'PROMEDIO_DE_VIAJE',
  CARGO_CON_EMPLEADOS: 'CARGO_CON_EMPLEADOS',
  MODALIDAD_CON_CARGOS: 'MODALIDAD_CON_CARGOS',
  PRECIO_COSECHA_DUPLICADO: 'PRECIO_COSECHA_DUPLICADO',
  TIPO_HORA_EXTRA_CON_REGISTROS: 'TIPO_HORA_EXTRA_CON_REGISTROS',
  NIT_DUPLICATED: 'NIT_DUPLICATED',
  /** Días Q1/Q2 inconsistentes (fin<inicio o solapamiento). */
  CORTE_QUINCENA_INVALIDO: 'CORTE_QUINCENA_INVALIDO',
  /** Motivo de ausencia con ausencias asociadas — no se puede eliminar. */
  MOTIVO_CON_AUSENCIAS: 'MOTIVO_CON_AUSENCIAS',
  /** §19 — La labor no admite actividades (no es SANIDAD ni custom PALMA). */
  LABOR_NO_ADMITE_ACTIVIDADES: 'LABOR_NO_ADMITE_ACTIVIDADES',
  /** §19 — Nombre de actividad ya existe para esa labor en el tenant. */
  ACTIVIDAD_DUPLICADA: 'ACTIVIDAD_DUPLICADA',
  /** §19 — Actividad con jornales asociados — no se puede eliminar. */
  ACTIVIDAD_CON_JORNALES: 'ACTIVIDAD_CON_JORNALES',
} as const;
