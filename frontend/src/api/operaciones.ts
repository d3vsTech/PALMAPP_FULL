/**
 * API Client — Módulo Operaciones (Planilla del Día)
 *
 * Cubre el wizard de 5 pasos:
 *  - Paso 1: Información General
 *  - Paso 2: Labores de Palma (cosecha, plateo, poda, fertilización, sanidad, otros)
 *  - Paso 3: Labores de Finca (categoría=FINCA en jornales)
 *  - Paso 4: Horas Extras
 *  - Paso 5: Finalización + Ausencias
 *
 * Base URL: {host}/api/v1/tenant
 * Headers: Authorization: Bearer {jwt}, X-Tenant-Id: {tenant_id}
 *
 * Alineado con API_OPERACIONES.md (versión vigente). Incluye:
 *  - Indicadores (§2.2.1) con period semanal/quincenal/mensual/personalizado
 *  - Cosecha con peso_confirmado opcional al crear (§3.1)
 *  - Jornales unificados: solo `labor_id` (§3.2 y §3.3). El backend deriva
 *    categoría y tipo desde la labor. Las custom de palma tienen tipo=null.
 *  - SANIDAD con `tipo_pago` dependiente (POR_PALMA vs JORNAL_FIJO)
 *  - Horas Extras con snapshot legal + aprobar/rechazar (§4)
 *  - Ausencias con aprobar/rechazar/documento + snapshot del motivo (§5)
 *  - Selects: labores (catálogo unificado), crearInsumo on-the-fly (§8)
 *  - Códigos de error: OperacionesErrorCodes (§0)
 */
import { requestConToken, fetchConToken } from './request';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoPlanilla = 'BORRADOR' | 'APROBADA';

export interface Planilla {
  id: number;
  fecha: string;            // YYYY-MM-DD
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hubo_lluvia: boolean;
  cantidad_lluvia?: string | number | null;
  observaciones?: string | null;
  estado: EstadoPlanilla;
  creado_por?: number;
  creado_por_rel?: { id: number; name: string } | null;
  aprobado_por?: number | null;
  aprobado_por_rel?: { id: number; name: string } | null;
  jornales_count?: number;
  cosechas_count?: number;
  ausencias_count?: number;
  colaboradores_count?: number;
  total_jornales_sum?: string | number;
  total_cosechas_sum?: string | number;
  total_general?: string | number;
}

/**
 * Planilla con todas sus relaciones eager-loaded (§2.4 GET /operaciones/{id}).
 * Se devuelve en `ver` / `detalle` y se incrusta en `WizardInitBundle.planilla`.
 *
 * Los campos `[k: string]: unknown` se mantienen como escape hatch para que el
 * wizard (que consume muchos atributos auxiliares) no falle por TS. La
 * intención a futuro es ir reemplazando esos accesos por los campos tipados.
 */
export interface PlanillaDetalle extends Planilla {
  cosechas?: Cosecha[];
  jornales?: Jornal[];
  /**
   * Grupos de jornales (§3.2.1): un grupo agrupa N jornales miembros que
   * comparten labor + lote + cantidad_palmas. Cuando el bundle los expone,
   * los `jornales[]` individuales referenciados por cada grupo también
   * pueden venir en `jornales` con `jornal_grupo_id` apuntando al maestro.
   */
  jornal_grupos?: JornalGrupo[];
  ausencias?: Ausencia[];
  horas_extra?: HoraExtra[];
  [k: string]: unknown;
}

/**
 * §6 Resumen del wizard (GET /operaciones/{id}/resumen)
 *
 * Buckets de `labores`:
 *  - `cosecha`, `plateo`, `poda`, `fertilizacion`, `sanidad`: las 5 labores
 *    fijas del sistema (es_sistema=true), una por bucket.
 *  - `otros`: agrupa los jornales custom de palma (categoria=PALMA, tipo=null).
 *  - `labores_finca`: jornales con categoria=FINCA (antes `auxiliares` en el
 *    doc viejo; el backend ya lo renombró).
 */
export interface Resumen {
  fecha: string;
  elaborado_por: string;
  hubo_lluvia: boolean;
  cantidad_lluvia: string | null;
  inicio_labores: string | null;
  estado: EstadoPlanilla;
  labores: {
    cosecha: number;
    plateo: number;
    poda: number;
    fertilizacion: number;
    sanidad: number;
    otros: number;
    labores_finca: number;
  };
  ausencias: {
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    liquidadas: number;
    total: number;
  };
  horas_extra?: {
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    liquidadas: number;
    total: number;
    horas_totales: string;
    valor_total: string;
  };
}

export interface Indicadores {
  periodo: { tipo: string; fecha_desde: string; fecha_hasta: string };
  planillas_borrador: number;
  planillas_aprobadas: number;
  total_planillas: number;
}

export type Periodo = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

/**
 * Response de `GET /operaciones/{id}/cobertura` (§7.1).
 *
 * Lista colaboradores y operarios que deberían aparecer en la planilla
 * (activos y con contrato vigente para colaboradores) pero no tienen
 * jornal, cosecha ni ausencia registrada en ella.
 */
export interface CoberturaColaboradorFaltante {
  id: number;
  nombre_completo: string;
  documento: string;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
}

export interface CoberturaOperarioFaltante {
  id: number;
  nombre_completo: string;
  cedula: string;
  tercero_nombre: string | null;
}

export interface CoberturaPlanilla {
  tiene_faltantes: boolean;
  colaboradores_faltantes: CoberturaColaboradorFaltante[];
  operarios_faltantes: CoberturaOperarioFaltante[];
}

// ─── Entidades del módulo (cuerpo de respuestas) ──────────────────────────────

export type EstadoNovedad = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';

/**
 * Fila de cuadrilla en cosecha. XOR: exactamente uno de `empleado_id` u
 * `operario_id` (§3.1 cuadrilla mixta). El `tercero_id` se inyecta en backend
 * desde el `operario_id` — el cliente no lo envía pero lo recibe.
 */
export interface CosechaCuadrillaItem {
  id: number;
  empleado_id?: number | null;
  operario_id?: number | null;
  tercero_id?: number | null;
  peso_calculado_empleado: string | number | null;
  valor_calculado: string | number | null;
  empleado?: { id: number; primer_nombre?: string; primer_apellido?: string } | null;
  /** Subobjeto eager-loaded cuando la fila es de un operario de tercero. */
  operario?: { id: number; nombres?: string; apellidos?: string; nombre_completo?: string } | null;
}

export interface Cosecha {
  id: number;
  operacion_id: number;
  lote_id: number;
  sublote_id: number | null;
  /**
   * Snapshot de la labor COSECHA del tenant al momento de registrar (§5).
   * El servicio usa esta labor para decidir POR_PALMA vs JORNAL_FIJO al
   * calcular `valor_total`. NULL en cosechas históricas pre-refactor — el
   * backend las resuelve al vuelo a la fija COSECHA del tenant.
   */
  labor_id?: number | null;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado: string | number | null;
  precio_cosecha: string | number | null;
  /**
   * Snapshot VISUAL del promedio kg/gajo del lote en el viaje (§5).
   * NO entra en el cálculo de nómina: el pago real a empleados VARIABLE se
   * recalcula en `NominaCalculationService` usando los `PromedioLote` del
   * período. Este campo solo alimenta la vista de la planilla.
   */
  promedio_kg_gajo?: string | number | null;
  valor_total: string | number | null;
  cuadrilla: CosechaCuadrillaItem[];
  /**
   * Eager-load estándar de `GET /operaciones/{id}` (ver §3.4 doc). El
   * backend siempre pobla `{id, nombre}`. Con esto el frontend no necesita
   * pedir `/lotes/select` ni `/sublotes/select` para resolver nombres.
   */
  lote?: { id: number; nombre: string } | null;
  sublote?: { id: number; nombre: string } | null;
}

export type CategoriaJornal = 'PALMA' | 'FINCA';
/** Tipos snapshoteados en el jornal. Las labores custom de palma tienen tipo=null. */
/**
 * Snapshots del jornal. Desde agosto 2026 OTROS también es una labor fija,
 * así que puede aparecer como `tipo='OTROS'` cuando el jornal usa la fija.
 * Las labores custom de palma siguen con `tipo=null`.
 */
export type TipoJornalPalma = 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';

/**
 * Jornal — registro de trabajo de un colaborador (o un operario de tercero)
 * en una planilla. XOR: exactamente uno de `empleado_id` u `operario_id`
 * (§3.2 selector de persona). El backend inyecta `tercero_id` desde
 * `operario_id` — el cliente no lo envía pero lo recibe.
 */
export interface Jornal {
  id: number;
  operacion_id: number;
  empleado_id?: number | null;
  /** Nuevo (§3.2): jornal de un operario de tercero. */
  operario_id?: number | null;
  /** Inyectado por backend cuando hay `operario_id`. */
  tercero_id?: number | null;
  /**
   * Nuevo (§3.2.1): cuando el jornal pertenece a un grupo, apunta al
   * `jornal_grupos.id` maestro. Los jornales individuales tienen `null`.
   * El frontend usa este campo para NO renderizar dos veces (una desde
   * `planilla.jornales` y otra desde `planilla.jornal_grupos[].jornales`).
   */
  jornal_grupo_id?: number | null;
  categoria: CategoriaJornal;
  tipo?: TipoJornalPalma | null;
  lote_id?: number | null;
  sublote_id?: number | null;
  /** Referencia al catálogo unificado de labores (PALMA fijas + custom + FINCA). */
  labor_id?: number | null;
  cantidad_palmas?: number | null;
  insumo_id?: number | null;
  gramos_por_palma?: number | null;
  /**
   * §4.7 LABORES_JORNALES — FK a `labor_actividades`. Solo aplica a jornales
   * de SANIDAD o de labor custom PALMA con `tipo=null`. NULL en jornales
   * históricos (o cuando el usuario escribió `descripcion` a mano).
   * Backend snapshotea `descripcion = actividad.nombre` cuando se envía este id
   * sin `descripcion`.
   */
  labor_actividad_id?: number | null;
  descripcion?: string | null;
  nombre_trabajo?: string | null;
  ubicacion?: string | null;
  valor_unitario: string | number | null;
  /**
   * Solo FERTILIZACION POR_PALMA (§4.1). Snapshot del `precio_abono.precio_palma`
   * del rango que matcheó `gramos_por_palma` al momento de crear el jornal.
   * Permite que el desprendible muestre el precio aplicado aunque la tabla
   * `precio_abono` luego se ajuste.
   */
  precio_insumo_snapshot?: string | number | null;
  valor_total: string | number | null;
  estado: boolean;
  /** Subobjetos eager-loaded — null cuando la fila es de operario. */
  empleado?: EmpleadoRef | null;
  /** Subobjeto eager-loaded cuando la fila es de un operario de tercero. */
  operario?: { id: number; nombres?: string; apellidos?: string; nombre_completo?: string } | null;
  labor?: LaborWizardItem | Record<string, unknown> | null;
  lote?: { id: number; nombre: string } | Record<string, unknown> | null;
  sublote?: { id: number; nombre: string } | Record<string, unknown> | null;
  insumo?: InsumoWizardItem | Record<string, unknown> | null;
}

/** Estado de la hora extra. `LIQUIDADA` se llena al cerrar la nómina (snapshot
 *  en `nomina_hora_extra_ref`). Una vez LIQUIDADA, el registro es inmutable. */
export type EstadoHoraExtra = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';

/** Subobjeto eager-loaded en `HoraExtra.tipoHoraExtra` (camelCase del backend). */
export interface HoraExtraTipoRef {
  id: number;
  codigo: string;
  nombre: string;
  porcentaje_recargo: string | number;
  franja_horaria?: string;
  aplica_festivo?: boolean;
  es_extra?: boolean;
  paga_hora_completa?: boolean;
}

export interface HoraExtra {
  id: number;
  operacion_id: number;
  empleado_id: number;
  tipo_hora_extra_id: number;
  /** Snapshot del tipo al crear el registro. */
  codigo: string;
  /** Snapshot. */
  porcentaje_recargo: string | number;
  /** Snapshot. */
  paga_hora_completa: boolean;
  cantidad_horas: string | number;
  /** Snapshot: `salario_base / tenant_config.divisor_jornada_mensual` al crear. */
  valor_hora_base: string | number;
  /** Total a pagar. Fórmula §2.3 del doc API_HORAS_EXTRA.md. */
  valor_calculado: string | number;
  estado: EstadoHoraExtra;
  observacion?: string | null;
  aprobado_por?: number | null;
  aprobado_at?: string | null;
  motivo_rechazo?: string | null;
  /** Se llena al cerrar nómina → estado LIQUIDADA. */
  nomina_id?: number | null;
  empleado?: { id: number; primer_nombre?: string; primer_apellido?: string; [k: string]: any };
  tipoHoraExtra?: HoraExtraTipoRef;
}

/** Payload del wizard Paso 4 — POST /operaciones/{id}/horas-extra. */
export interface HoraExtraPayload {
  empleado_id: number;
  tipo_hora_extra_id: number;
  /** 0.25 a 12. */
  cantidad_horas: number;
  observacion?: string;
}

export interface Ausencia {
  id: number;
  operacion_id: number;
  empleado_id: number;
  motivo_ausencia_id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_calendario: number;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago: string | number;
  estado: EstadoNovedad;
  motivo?: string | null;
  documento_soporte?: string | null;
  entidad?: string | null;
  numero_radicado?: string | null;
  empleado?: EmpleadoRef | Record<string, unknown> | null;
  motivo_ausencia?: MotivoAusenciaWizardItem | Record<string, unknown> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Bundle del wizard (§1.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Subobjeto eager-loaded en jornales/cosechas/ausencias/horas extra. */
export interface EmpleadoRef {
  id: number;
  primer_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_nombre?: string | null;
  segundo_apellido?: string | null;
  /**
   * `FIJO` | `PRODUCCION`. Presente en los subobjetos que la API §3.2.1
   * devuelve dentro de `jornales[].empleado` — sirve para que la UI
   * marque visualmente por qué un jornal FIJO tiene `valor_total = 0.00`
   * ("la nómina lo paga por salario_base").
   */
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string | null;
  [k: string]: unknown;
}

/** Item de `parametricas.colaboradores` del bundle del wizard. */
export interface ColaboradorWizardItem {
  id: number;
  nombre_completo: string;
  documento: string;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
}

/**
 * Item de `parametricas.operarios` del bundle del wizard.
 *
 * Operarios son trabajadores de terceros contratistas. La UI los muestra en
 * el mismo dropdown que `colaboradores`, diferenciados por `tercero_nombre`.
 * En los payloads se envían como `operario_id` (XOR con `empleado_id`).
 */
export interface OperarioWizardItem {
  id: number;
  tercero_id: number;
  nombre_completo: string;
  cedula: string;
  tercero_nombre: string;
}

export interface LoteWizardItem {
  id: number;
  nombre: string;
  predio_id: number;
  predio?: { id: number; nombre: string };
}

export interface SubloteWizardItem {
  id: number;
  nombre: string;
  lote_id: number;
  /** Usado para autofill del input "Número de Palmas" cuando POR_PALMA. */
  cantidad_palmas: number;
}

export interface InsumoWizardItem {
  id: number;
  nombre: string;
  unidad_medida?: string;
}

export interface LaborWizardItem {
  id: number;
  nombre: string;
  categoria: CategoriaJornal;
  /** `null` para custom de palma (las que el admin crea sin tipo fijo). */
  tipo: 'COSECHA' | 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | null;
  tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
  precio_palma: string | number | null;
  es_sistema: boolean;
  requiere_cosecha_workflow: boolean;
}

export interface MotivoAusenciaWizardItem {
  id: number;
  nombre: string;
  tipo_base: string;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago_default: string | number;
  requiere_soporte: boolean;
  color?: string;
  afecta_seguridad_social?: boolean;
  afecta_parafiscales?: boolean;
  afecta_prestaciones?: boolean;
}

export interface TipoHoraExtraWizardItem {
  id: number;
  codigo: string;
  nombre: string;
  porcentaje_recargo: string | number;
  franja_horaria: string;
  aplica_festivo: boolean;
  es_extra: boolean;
  paga_hora_completa: boolean;
  descripcion?: string;
}

/**
 * Override por tercero+labor que viene en el bundle de Operaciones (§1.1 de
 * `API_OPERACIONES.md`). Se usa en el frontend para resolver el precio y modo
 * de pago efectivos cuando la persona seleccionada en un jornal es un operario
 * de tercero (no un colaborador propio).
 *
 *  - `tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO'` → override explícito del modo de
 *    pago. Aplica solo a labores PALMA (FINCA siempre es JORNAL_FIJO).
 *  - `tipo_pago: null` → override solo de monto; el modo de pago efectivo lo
 *    hereda del catálogo (`labor.tipo_pago`).
 *
 * El backend hace la misma resolución al validar el POST/PUT; el preview del
 * frontend siempre coincide con `valor_total` que devuelve el servidor.
 */
export interface TerceroLaborOverride {
  tercero_id: number;
  labor_id: number;
  tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO' | null;
  precio_palma: string | number;
}

/**
 * Bundle único del wizard. Modo creación: `planilla` y `resumen` son `null`.
 * Modo edición: ambos vienen con la planilla y el resumen calculado.
 */
export interface WizardInitBundle {
  planilla: PlanillaDetalle | null;
  resumen: Resumen | null;
  parametricas: {
    colaboradores: ColaboradorWizardItem[];
    /** Nuevo en §1.1: operarios de terceros. Se unifican con colaboradores en el dropdown. */
    operarios: OperarioWizardItem[];
    lotes: LoteWizardItem[];
    sublotes: SubloteWizardItem[];
    insumos: InsumoWizardItem[];
    labores_palma: LaborWizardItem[];
    labores_finca: LaborWizardItem[];
    motivos_ausencia: MotivoAusenciaWizardItem[];
    tipos_hora_extra: TipoHoraExtraWizardItem[];
    /**
     * Todos los overrides activos de `tercero_labor_precios` del tenant
     * (PALMA + FINCA). El frontend los usa con `resolverPrecioPersonaLabor()`
     * para mostrar el preview correcto cuando la persona del jornal es un
     * operario de un tercero específico.
     */
    tercero_labor_overrides: TerceroLaborOverride[];
    /**
     * §19 API_PARAMETRICAS — actividades predefinidas (sublabores) indexadas
     * por `labor_id`. Solo aplica a las labores fijas SANIDAD y OTROS más las
     * custom de PALMA (`es_sistema=false`, `tipo=null`). Alimenta el select
     * "Trabajo realizado" en las tabs SANIDAD y OTROS del wizard.
     *
     * `precio` es el precio propio de la sublabor (`null` = hereda
     * `labor.precio_palma`). Solo aplica a colaboradores propios: los
     * operarios de tercero usan siempre `tercero_labor_precios` — ver el
     * algoritmo de resolución de §4.3 LABORES_JORNALES.
     */
    actividades_por_labor?: Record<string, Array<{
      id: number;
      labor_id: number;
      nombre: string;
      precio?: string | number | null;
    }>>;
  };
}

/**
 * Resuelve el `tipo_pago` y `precio_palma` efectivos para una combinación
 * (labor, persona, actividad) — dos cascadas distintas según quién hace el
 * jornal (§4.3 LABORES_JORNALES / §1.1 API_OPERACIONES):
 *
 *  - **Operario de tercero:** manda lo pactado con el contratista. La sublabor
 *    NO participa. `tercero_labor_precios` ?? `labor.precio_palma`.
 *  - **Colaborador propio:** la sublabor overridea el monto; el modo siempre
 *    viene de la labor. `actividad.precio` ?? `labor.precio_palma`.
 *
 * El `tipo_pago` nunca cambia por la sublabor — solo puede cambiar por
 * override explícito de tercero (POR_PALMA ↔ JORNAL_FIJO).
 *
 * El backend hace exactamente la misma resolución al calcular `valor_total`;
 * este helper solo sirve para el preview en la UI.
 */
export function resolverPrecioPersonaLabor(
  labor: Pick<LaborWizardItem, 'id' | 'tipo_pago' | 'precio_palma'>,
  persona: { tipo: 'colaborador'; id: number } | { tipo: 'operario'; id: number; tercero_id: number },
  overrides: TerceroLaborOverride[],
  /** Actividad del select "Trabajo Realizado", si el usuario eligió una. */
  actividad?: { precio?: string | number | null } | null,
): { tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO'; precio_palma: string | number | null } {
  if (persona.tipo === 'operario') {
    const ov = overrides.find(
      (o) => o.tercero_id === persona.tercero_id && o.labor_id === labor.id,
    );
    if (!ov) return { tipo_pago: labor.tipo_pago, precio_palma: labor.precio_palma };
    return {
      tipo_pago: (ov.tipo_pago ?? labor.tipo_pago) as 'POR_PALMA' | 'JORNAL_FIJO',
      precio_palma: ov.precio_palma ?? labor.precio_palma,
    };
  }
  // Colaborador propio — la sublabor solo overridea el monto.
  // OJO (§19 API_PARAMETRICAS): `precio` en 0 cuenta como SIN precio propio y
  // hereda el de la labor. No se puede usar `??` directo — `0 ?? x` devuelve 0
  // y dejaría el jornal en cero teniendo la labor padre una tarifa válida.
  // Cero no es una tarifa de cero pesos: es lo que manda el formulario cuando
  // el campo se deja vacío.
  const precioSublabor = Number(actividad?.precio) > 0 ? Number(actividad!.precio) : null;
  return {
    tipo_pago: labor.tipo_pago,
    precio_palma: precioSublabor ?? labor.precio_palma,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/tenant';

/** Meta de paginación estándar Laravel (replica `PaginatedResponse` del cliente). */
export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Error enriquecido que arroja `smartRequest` — agrega `code` y `status` al
 * `Error` estándar para que los componentes puedan distinguir por código
 * (ej. `OPERACION_APROBADA`, `CALC_ERROR`) sin hacer string-matching del
 * mensaje. Es la versión local del `ApiError` de `apiClient`.
 */
export interface OperacionesApiError extends Error {
  code?: string;
  status?: number;
  data?: unknown;
}

function qs(params: Record<string, unknown> = {}): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

/**
 * Forma cruda del JSON de error del backend. No exportado: solo usado para
 * el parseo defensivo en `parseError`.
 */
interface RawErrorBody {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string[] | string>;
}

/** Parsea respuestas no-OK e incluye el `code` y `data` del backend cuando aplica. */
async function parseError(res: Response): Promise<{ message: string; code?: string; data?: unknown }> {
  let raw: unknown = null;
  try {
    const ct = res.headers.get('content-type') ?? '';
    raw = ct.includes('application/json') ? await res.json() : await res.text();
  } catch {
    // Si el body no es parseable, `raw` queda `null` y caemos al fallback.
  }
  if (raw && typeof raw === 'object') {
    const body = raw as RawErrorBody & { data?: unknown };
    const firstFieldError = (() => {
      if (!body.errors || typeof body.errors !== 'object') return null;
      for (const k of Object.keys(body.errors)) {
        const arr = body.errors[k];
        if (Array.isArray(arr) && arr.length && typeof arr[0] === 'string') return arr[0];
        if (typeof arr === 'string' && arr.trim()) return arr;
      }
      return null;
    })();
    const msg = firstFieldError ?? body.message ?? body.error ?? 'Error al comunicarse con el servidor';
    return { message: typeof msg === 'string' ? msg : 'Error', code: body.code, data: body.data };
  }
  return { message: typeof raw === 'string' && raw.trim() ? raw : 'Error al comunicarse con el servidor' };
}

/** Versión de request que devuelve `{ message, code }` en errores HTTP. */
async function smartRequest<T = unknown>(endpoint: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchConToken(endpoint, undefined, opciones);
  if (!res.ok) {
    const { message, code, data } = await parseError(res);
    const err: OperacionesApiError = new Error(message);
    if (code) err.code = code;
    err.status = res.status;
    if (data !== undefined) err.data = data;
    throw err;
  }
  if (res.status === 204) return null as unknown as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. operacionesApi (Planilla)
// ─────────────────────────────────────────────────────────────────────────────

export const operacionesApi = {
  listar: (params: {
    estado?: EstadoPlanilla;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  } = {}) =>
    requestConToken<{ data: Planilla[]; meta: PaginatedMeta }>(`${BASE}/operaciones${qs(params)}`),

  /**
   * Trae el detalle completo de una planilla incluyendo:
   *  - cosechas[].cuadrilla[].empleado
   *  - jornales[] con empleado, labor, lote, sublote, insumo
   *  - ausencias[] con empleado y motivo_ausencia
   *  - horas_extra[]
   *  - creado_por_rel, aprobado_por_rel
   */
  ver: (id: number) =>
    requestConToken<{ data: PlanillaDetalle }>(`${BASE}/operaciones/${id}`),

  // Alias para compat con código que ya llamaba .detalle(...)
  detalle: (id: number) =>
    requestConToken<{ data: PlanillaDetalle }>(`${BASE}/operaciones/${id}`),

  crear: (payload: {
    fecha: string;
    elaborado_por?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia: number | null;
    observaciones?: string | null;
  }) =>
    smartRequest<{ data: Planilla; message?: string }>(`${BASE}/operaciones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    fecha: string;
    elaborado_por: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia: number | null;
    observaciones: string | null;
  }>) =>
    smartRequest<{ data: Planilla }>(`${BASE}/operaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/operaciones/${id}`, { method: 'DELETE' }),

  /**
   * POST /operaciones/{id}/aprobar (§7)
   * Aprueba la planilla + en cascada todas las HorasExtra y Ausencias
   * PENDIENTE de esa planilla. El response incluye `aprobaciones_cascada`
   * con los conteos aprobados automáticamente.
   *
   * §7.2 — Puede traer `advertencias[]` con `PLANILLA_CON_PERSONAL_SIN_REGISTRAR`
   * cuando hay colaboradores propios que no aparecen en la planilla. Es
   * informativo: la planilla queda APROBADA. El frontend puede usar el
   * `detalle.colaboradores_faltantes[]` para ofrecer registro masivo vía
   * `POST /operaciones/{id}/ausencias/faltantes` (que sí funciona con
   * planilla ya aprobada). Los operarios de tercero NO entran aquí.
   */
  aprobar: (id: number) =>
    smartRequest<{
      message: string;
      data: Planilla;
      aprobaciones_cascada?: { horas_extra: number; ausencias: number };
      advertencias?: Array<{
        code:
          | 'PLANILLA_CON_PERSONAL_SIN_REGISTRAR'
          | string;
        message: string;
        detalle?: {
          colaboradores_faltantes?: Array<{
            id: number;
            nombre_completo: string;
            documento?: string;
            modalidad_pago?: string;
          }>;
        };
      }>;
    }>(`${BASE}/operaciones/${id}/aprobar`, { method: 'POST' }),

  resumen: (id: number) =>
    requestConToken<{ data: Resumen }>(`${BASE}/operaciones/${id}/resumen`),

  /**
   * GET /operaciones/{id}/cobertura (§7.1)
   *
   * Devuelve qué colaboradores activos con contrato vigente y qué operarios
   * activos NO aparecen en la planilla (sin labor de palma, sin labor de
   * finca ni ausencia registrada). Se llama en el Paso 5 antes de aprobar
   * para mostrar un banner informativo.
   *
   * Es INFORMATIVO, no bloqueante — el endpoint /aprobar no verifica
   * cobertura, el usuario decide si aprueba con faltantes.
   */
  cobertura: (id: number) =>
    requestConToken<{ data: CoberturaPlanilla }>(
      `${BASE}/operaciones/${id}/cobertura`,
    ),

  /**
   * Bundle único para abrir el wizard. Reemplaza las ~10 peticiones que el
   * componente disparaba (7 catálogos + sublotes + ver + resumen) por una
   * sola respuesta cacheada por tenant en el backend.
   *
   * - Sin id → modo creación: `planilla` y `resumen` son null, `parametricas`
   *   trae todos los catálogos.
   * - Con id → modo lectura/edición: además trae la planilla con sus
   *   relaciones y el resumen calculado.
   */
  wizardInit: (id?: number) =>
    requestConToken<{ data: WizardInitBundle }>(
      id != null
        ? `${BASE}/operaciones/${id}/wizard-init`
        : `${BASE}/operaciones/wizard-init`
    ),

  indicadores: (params: { periodo?: Periodo; fecha_desde?: string; fecha_hasta?: string } = {}) =>
    requestConToken<{ data: Indicadores }>(`${BASE}/operaciones/indicadores${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. cosechasApi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fila de cuadrilla del payload de cosechas. XOR: `empleado_id` u `operario_id`
 * (§3.1 cuadrilla mixta). El cliente envía solo uno; el backend infiere el
 * `tercero_id` cuando aplica. La clave de dedup en backend es
 * `CONCAT('E_', empleado_id)` o `CONCAT('O_', operario_id)`.
 */
export interface CuadrillaPayloadItem {
  empleado_id?: number;
  operario_id?: number;
}

export const cosechasApi = {
  crear: (operacionId: number, payload: {
    lote_id: number;
    sublote_id?: number | null;
    gajos_reportados: number;
    peso_confirmado?: number | null;
    cuadrilla: CuadrillaPayloadItem[];
  }) =>
    smartRequest<{ data: Cosecha; message?: string }>(
      `${BASE}/operaciones/${operacionId}/cosechas`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  bulkCrear: (operacionId: number, items: Array<{
    lote_id: number;
    sublote_id?: number | null;
    gajos_reportados: number;
    peso_confirmado?: number | null;
    cuadrilla: CuadrillaPayloadItem[];
  }>) =>
    smartRequest<{ data: Array<{ id: number }> }>(
      `${BASE}/operaciones/${operacionId}/cosechas/bulk`,
      { method: 'POST', body: JSON.stringify({ items }) },
    ),

  editar: (id: number, payload: Partial<{
    gajos_reportados: number;
    gajos_reconteo: number;
    peso_confirmado: number | null;
    cuadrilla: CuadrillaPayloadItem[];
  }>) =>
    smartRequest<{ data: Cosecha; message?: string }>(`${BASE}/cosechas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/cosechas/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. jornalesApi (catálogo unificado — solo se envía labor_id)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload único para jornales (PALMA fijas, custom de palma y FINCA).
 *
 * El cliente solo envía `labor_id`. El backend deriva `categoria` y `tipo` desde
 * la labor y los snapshotea en el jornal. NO enviar `categoria` ni `tipo` (son
 * silenciosamente descartados, pero conviene omitirlos).
 *
 * **Selector de persona — XOR `empleado_id` vs `operario_id` (§3.2):**
 *  - Colaborador propio → `empleado_id`.
 *  - Operario de tercero → `operario_id`. El backend inyecta el `tercero_id`.
 *
 * Enviar ambos o ninguno → 422 con error en `empleado_id`.
 *
 * Reglas resumidas (según labor seleccionada):
 *  - `tipo_pago='POR_PALMA'` → enviar `cantidad_palmas` (requerido).
 *  - `tipo_pago='JORNAL_FIJO'` → no enviar `cantidad_palmas`.
 *  - `tipo='FERTILIZACION'` + `POR_PALMA` → además `insumo_id` + `gramos_por_palma`.
 *  - `tipo='SANIDAD'` → `descripcion` requerida.
 *  - `categoria='FINCA'` → opcional `ubicacion` (texto libre).
 *  - COSECHA NO usa este endpoint; va por `POST /operaciones/{id}/cosechas`.
 */
export interface JornalPayload {
  labor_id: number;
  /** Una de las dos: `empleado_id` u `operario_id` (XOR). */
  empleado_id?: number;
  /** Nuevo (§3.2). XOR con `empleado_id`. */
  operario_id?: number;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number;
  insumo_id?: number;
  gramos_por_palma?: number;
  /**
   * §4.7 LABORES_JORNALES — id de una actividad del catálogo (SANIDAD y
   * custom PALMA). Si se envía sin `descripcion`, el backend snapshotea
   * `descripcion = actividad.nombre`. Para SANIDAD basta con enviar
   * `labor_actividad_id` O `descripcion` (al menos uno).
   */
  labor_actividad_id?: number | null;
  descripcion?: string;
  nombre_trabajo?: string;
  ubicacion?: string;
  observacion?: string | null;
}

/** @deprecated Usar `JornalPayload`. La API ya no requiere `categoria`/`tipo`. */
export type JornalPalma = JornalPayload;
/** @deprecated Usar `JornalPayload`. La API ya no requiere `categoria`. */
export type JornalFinca = JornalPayload;

// ─────────────────────────────────────────────────────────────────────────────
// GRUPOS DE JORNALES  (§3.2.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un miembro del grupo. XOR estricto: exactamente uno de `empleado_id`
 * u `operario_id` — enviar ambos o ninguno responde 422.
 * `tercero_id` NO se envía: el backend lo inyecta desde `operario_id`.
 */
export interface JornalGrupoMiembroPayload {
  empleado_id?: number;
  operario_id?: number;
}

/**
 * Payload de `POST /operaciones/{id}/jornal-grupos` (§3.2.1).
 *
 * Se usa cuando varios colaboradores realizan la MISMA labor juntos (mismo
 * lote, mismo `cantidad_palmas` compartida). El backend crea el registro
 * maestro y un `jornal` por cada miembro, distribuyendo el valor según:
 *
 *   POR_PALMA   → `valor_grupo / N` a cada miembro PRODUCCION/operario.
 *                 Los miembros FIJO reciben `0.00` (la nómina los paga por
 *                 salario_base). N = total de miembros incluyendo FIJOs.
 *   JORNAL_FIJO → `labor.precio_palma` completo a cada miembro
 *                 PRODUCCION/operario (NO se divide). FIJOs reciben `0.00`.
 *
 * `miembros` debe traer entre 1 y 50 filas.
 */
export interface CrearJornalGrupoPayload {
  labor_id: number;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number;
  insumo_id?: number;
  gramos_por_palma?: number;
  /**
   * §4.7 LABORES_JORNALES — id de una actividad del catálogo. Se propaga
   * a cada jornal hijo del grupo. Ver notas en `JornalPayload`.
   */
  labor_actividad_id?: number | null;
  descripcion?: string;
  nombre_trabajo?: string;
  ubicacion?: string;
  observacion?: string | null;
  miembros: JornalGrupoMiembroPayload[];
}

/**
 * Respuesta de `POST /operaciones/{id}/jornal-grupos` y `GET /jornal-grupos/{id}`.
 *
 * `valor_grupo` = valor total antes de dividir (para POR_PALMA es
 * `cantidad_palmas × precio`; para JORNAL_FIJO es `labor.precio_palma`).
 * `valor_unitario` = precio por unidad usado en el cálculo (por palma o
 * por jornal según el modo).
 *
 * Los `jornales[]` traen el `valor_total` ya calculado y dividido por
 * miembro, junto con su empleado/operario expandido (con `modalidad_pago`
 * para que la UI pueda distinguir por qué un FIJO trae `0.00`).
 */
export interface JornalGrupo {
  id: number;
  operacion_id: number;
  labor_id: number;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number | null;
  insumo_id?: number | null;
  gramos_por_palma?: number | null;
  descripcion?: string | null;
  nombre_trabajo?: string | null;
  ubicacion?: string | null;
  observacion?: string | null;
  valor_grupo: string | number | null;
  valor_unitario: string | number | null;
  labor?: LaborWizardItem | Record<string, unknown> | null;
  lote?: { id: number; nombre: string } | Record<string, unknown> | null;
  sublote?: { id: number; nombre: string } | Record<string, unknown> | null;
  jornales: Jornal[];
}

/**
 * Cliente del sub-recurso "grupos de jornales" (§3.2.1).
 *
 * Permisos (Spatie):
 *  - crear   → `operaciones.crear`
 *  - ver     → `operaciones.ver`
 *  - editar  → `operaciones.editar`
 *  - eliminar→ `operaciones.eliminar`
 *
 * Bloqueos:
 *  - Toda mutación (`crear`/`editar`/`eliminar`) falla con 409
 *    `OPERACION_APROBADA` si la planilla padre está APROBADA.
 *  - `eliminar` es en cascada: borra el grupo maestro Y todos sus
 *    jornales miembro en una transacción atómica.
 *
 * Edición: el `PUT` recibe el mismo payload que el `POST` y el backend
 * sincroniza `miembros` (agrega nuevos, elimina los que no vinieron,
 * recalcula `valor_total` de todos con el nuevo N).
 */
export const jornalGruposApi = {
  crear: (operacionId: number, payload: CrearJornalGrupoPayload) =>
    smartRequest<{ data: JornalGrupo; message?: string }>(
      `${BASE}/operaciones/${operacionId}/jornal-grupos`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  ver: (id: number) =>
    requestConToken<{ data: JornalGrupo }>(`${BASE}/jornal-grupos/${id}`),

  editar: (id: number, payload: CrearJornalGrupoPayload) =>
    smartRequest<{ data: JornalGrupo; message?: string }>(
      `${BASE}/jornal-grupos/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    ),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/jornal-grupos/${id}`, {
      method: 'DELETE',
    }),
};

export const jornalesApi = {
  crear: (operacionId: number, payload: JornalPayload) =>
    smartRequest<{ data: Jornal; message?: string }>(
      `${BASE}/operaciones/${operacionId}/jornales`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  bulkCrear: (operacionId: number, items: JornalPayload[]) =>
    smartRequest<{ data: Array<{ id: number; sync_uuid: string | null }> }>(
      `${BASE}/operaciones/${operacionId}/jornales/bulk`,
      { method: 'POST', body: JSON.stringify({ items }) },
    ),

  /**
   * Actualiza N jornales existentes de una misma operación en una sola
   * petición. Reemplaza el patrón anterior de N `PUT /jornales/{id}` en
   * paralelo por 1 sola llamada.
   *
   * Cada item debe traer `id` del jornal + los campos a modificar (mismo
   * schema que `JornalPayload`, con XOR `empleado_id`/`operario_id` y las
   * reglas de labor). El backend valida por item y responde 200 con los
   * jornales completos ya recalculados.
   *
   * Errores del bloque:
   *  - 409 `OPERACION_APROBADA`: la planilla está aprobada.
   *  - 422 `CALC_ERROR`: validación o cálculo (campo faltante).
   */
  bulkUpdate: (
    operacionId: number,
    items: Array<Partial<JornalPayload> & { id: number }>,
  ) =>
    smartRequest<{ data: Jornal[] }>(
      `${BASE}/operaciones/${operacionId}/jornales/bulk-update`,
      { method: 'PUT', body: JSON.stringify({ items }) },
    ),

  editar: (id: number, payload: Partial<JornalPayload>) =>
    smartRequest<{ data: Jornal; message?: string }>(`${BASE}/jornales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/jornales/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. horasExtraApi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cliente del módulo Horas Extras (doc API_HORAS_EXTRA.md §2.4).
 *
 * Permisos por acción:
 *  - `crear` / `editar` / `eliminar`: `operaciones.{crear|editar|eliminar}`.
 *  - `aprobar` / `rechazar`: `configuracion.editar`.
 *
 * Máquina de estados (§2.2):
 *   PENDIENTE → APROBADA (vía aprobar) → LIQUIDADA (al cerrar nómina).
 *   PENDIENTE → RECHAZADA (vía rechazar).
 * Toda mutación está bloqueada si la planilla padre está `APROBADA`
 * (`OPERACION_APROBADA`), salvo aprobar/rechazar que sí funcionan ahí.
 * Una vez `LIQUIDADA`, el registro es inmutable (`HORA_EXTRA_LIQUIDADA`).
 *
 * El backend snapshotea `codigo`, `porcentaje_recargo`, `paga_hora_completa`
 * y `valor_hora_base` al crear, y recalcula `valor_calculado` si cambian
 * `empleado_id`/`tipo_hora_extra_id`/`cantidad_horas` al editar.
 */
export const horasExtraApi = {
  /**
   * Lista horas extras con filtros. Usado por el desprendible de nómina para
   * mostrar el tipo específico (HED, HEN, etc.) junto al total.
   */
  listar: (params?: {
    empleado_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado?: string;
    per_page?: number;
  }) =>
    requestConToken<{ data: HoraExtra[] }>(
      `${BASE}/horas-extra${qs(params as Record<string, unknown>)}`
    ),

  crear: (operacionId: number, payload: HoraExtraPayload) =>
    smartRequest<{ data: HoraExtra; message?: string }>(
      `${BASE}/operaciones/${operacionId}/horas-extra`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

  bulkCrear: (operacionId: number, items: HoraExtraPayload[]) =>
    smartRequest<{ data: Array<{ id: number }> }>(
      `${BASE}/operaciones/${operacionId}/horas-extra/bulk`,
      { method: 'POST', body: JSON.stringify({ items }) },
    ),

  editar: (id: number, payload: Partial<HoraExtraPayload>) =>
    smartRequest<{ data: HoraExtra; message?: string }>(`${BASE}/horas-extra/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/horas-extra/${id}`, { method: 'DELETE' }),

  aprobar: (id: number) =>
    smartRequest<{ data: HoraExtra; message?: string }>(
      `${BASE}/horas-extra/${id}/aprobar`, { method: 'POST' }),

  rechazar: (id: number, motivo_rechazo: string) =>
    smartRequest<{ data: HoraExtra; message?: string }>(
      `${BASE}/horas-extra/${id}/rechazar`, {
        method: 'POST',
        body: JSON.stringify({ motivo_rechazo }),
      }),
};

/**
 * Pre-cálculo en frontend del `valor_calculado` para vista previa en el
 * wizard antes de enviar al backend. Aplica exactamente la fórmula §2.3:
 *
 *   valor_hora_base = salario_base / divisor_jornada_mensual
 *   pagaCompleta=true  → cantidad × valor_hora_base × (1 + pct/100)
 *   pagaCompleta=false → cantidad × valor_hora_base × (pct/100)
 *
 * Si no hay `salario_base` (empleados PRODUCCION) se debe pasar el SMMLV
 * del tenant como fallback. Devuelve `null` si los inputs no son finitos.
 *
 * El backend confirma el cálculo en la respuesta 201 y snapshotea el valor
 * en el registro, así que esto es solo para UX (no autoritativo).
 */
export function calcularValorHoraExtra(input: {
  salario_base: number;
  divisor_jornada_mensual: number;
  porcentaje_recargo: number | string;
  paga_hora_completa: boolean;
  cantidad_horas: number | string;
}): { valor_hora_base: number; valor_calculado: number } | null {
  const sal = Number(input.salario_base);
  const div = Number(input.divisor_jornada_mensual);
  const pct = Number(input.porcentaje_recargo);
  const qty = Number(input.cantidad_horas);
  if (!Number.isFinite(sal) || !Number.isFinite(div) || div <= 0) return null;
  if (!Number.isFinite(pct) || !Number.isFinite(qty)) return null;
  const valor_hora_base = sal / div;
  const factor = input.paga_hora_completa ? 1 + pct / 100 : pct / 100;
  return {
    valor_hora_base: Number(valor_hora_base.toFixed(2)),
    valor_calculado: Number((qty * valor_hora_base * factor).toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ausenciasApi
// ─────────────────────────────────────────────────────────────────────────────

export const ausenciasApi = {
  /**
   * Lista ausencias con filtros. Útil para el desprendible de nómina cuando
   * necesitamos mostrar el motivo específico junto al total de incapacidades.
   *
   * Filtros aceptados por el backend (§5 API_OPERACIONES / API_AUSENCIAS):
   *  - empleado_id: ausencias de un colaborador específico.
   *  - fecha_desde / fecha_hasta: rango del período.
   *  - estado: `PENDIENTE|APROBADA|RECHAZADA|LIQUIDADA`.
   */
  listar: (params?: {
    empleado_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado?: string;
    per_page?: number;
  }) =>
    requestConToken<{ data: Ausencia[] }>(
      `${BASE}/ausencias${qs(params as Record<string, unknown>)}`
    ),

  crear: (operacionId: number, payload: {
    empleado_id: number;
    motivo_ausencia_id: number;
    motivo?: string;
    fecha_fin?: string;
    entidad?: string;
    numero_radicado?: string;
    porcentaje_pago?: number;
  }) =>
    smartRequest<{ data: Ausencia; message?: string }>(
      `${BASE}/operaciones/${operacionId}/ausencias`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  bulkCrear: (operacionId: number, items: Array<{
    empleado_id: number;
    motivo_ausencia_id: number;
    motivo?: string;
  }>) =>
    smartRequest<{ data: Array<{ id: number }> }>(
      `${BASE}/operaciones/${operacionId}/ausencias/bulk`,
      { method: 'POST', body: JSON.stringify({ items }) },
    ),

  /**
   * POST /operaciones/{id}/ausencias/faltantes (API_AUSENCIAS.md §2.8)
   *
   * Registra la MISMA novedad para varios colaboradores faltantes en una sola
   * operación. Cierre del círculo de `GET /operaciones/{id}/cobertura` y de la
   * advertencia `PLANILLA_CON_PERSONAL_SIN_REGISTRAR` que devuelve `aprobar`.
   *
   * Diferencias con `bulkCrear`:
   *  - Un solo `motivo_ausencia_id` para todos los `empleado_ids`.
   *  - Funciona con la planilla APROBADA (post-cierre).
   *  - Deduplica: si un colaborador ya tenía novedad ese día, va a `omitidas[]`
   *    con `motivo: 'YA_TIENE_NOVEDAD_ESE_DIA'`.
   *
   * Requiere permiso `operaciones.crear`.
   */
  crearFaltantes: (
    operacionId: number,
    payload: { motivo_ausencia_id: number; empleado_ids: number[]; motivo?: string },
  ) =>
    smartRequest<{
      message: string;
      data: {
        creadas: Array<{ id: number; empleado_id: number }>;
        omitidas: Array<{ empleado_id: number; motivo: string }>;
      };
    }>(`${BASE}/operaciones/${operacionId}/ausencias/faltantes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    motivo_ausencia_id: number;
    motivo: string;
    fecha_fin: string;
    entidad: string;
    numero_radicado: string;
    porcentaje_pago: number;
  }>) =>
    smartRequest<{ data: Ausencia; message?: string }>(`${BASE}/ausencias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/ausencias/${id}`, { method: 'DELETE' }),

  aprobar: (id: number) =>
    smartRequest<{ data: Ausencia; message?: string }>(
      `${BASE}/ausencias/${id}/aprobar`,
      { method: 'POST' },
    ),

  rechazar: (id: number, motivo_rechazo: string) =>
    smartRequest<{ data: Ausencia; message?: string }>(`${BASE}/ausencias/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo }),
    }),

  subirDocumento: (id: number, documento: File) => {
    const fd = new FormData();
    fd.append('documento', documento);
    return smartRequest<{ data: Ausencia; message?: string }>(
      `${BASE}/ausencias/${id}/documento`,
      {
        method: 'POST',
        body: fd,
      },
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. selectsApi (dropdowns auxiliares del wizard)
// ─────────────────────────────────────────────────────────────────────────────

export const selectsApi = {
  colaboradores: (params: { modalidad_pago?: string; predio_id?: number } = {}) =>
    requestConToken<{ data: any[] }>(`${BASE}/colaboradores/select${qs(params)}`),

  /** Endpoint dedicado del wizard. Solo requiere operaciones.crear|editar. */
  lotes: (params: { predio_id?: number } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; predio_id: number }> }>(
      `${BASE}/operaciones/lotes/select${qs(params)}`
    ),

  /** Endpoint dedicado del wizard. Trae cantidad_palmas para autofill. */
  sublotes: (params: { lote_id?: number } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; lote_id: number; cantidad_palmas: number }> }>(
      `${BASE}/operaciones/sublotes/select${qs(params)}`
    ),

  insumos: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string; unidad_medida?: string }> }>(
      `${BASE}/insumos/select`
    ),

  /**
   * §4 unificado: GET /labores/select devuelve TODAS las labores activas con
   * el `categoria`, `tipo`, `tipo_pago`, `precio_palma`, `es_sistema`,
   * `requiere_cosecha_workflow`.
   * Filtros: `?categoria=PALMA|FINCA`, `?estado=false` para inactivas.
   */
  labores: (params: { categoria?: 'PALMA' | 'FINCA'; estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      categoria: 'PALMA' | 'FINCA';
      tipo: 'COSECHA' | 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | null;
      tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
      precio_palma: string | number | null;
      es_sistema: boolean;
      requiere_cosecha_workflow: boolean;
    }> }>(`${BASE}/labores/select${qs(params)}`),

  motivosAusencia: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      tipo_base?: string;
      es_remunerada?: boolean;
      afecta_nomina?: boolean;
      requiere_soporte?: boolean;
      color?: string;
    }> }>(`${BASE}/motivos-ausencia/select${qs(params)}`),

  /** §1.3 — dropdown del wizard. Default `estado=true`. */
  tiposHoraExtra: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      codigo: string;
      porcentaje_recargo: string | number;
      franja_horaria: 'DIURNO' | 'NOCTURNO' | 'MIXTO';
      aplica_festivo: boolean;
      es_extra: boolean;
      paga_hora_completa: boolean;
    }> }>(`${BASE}/tipos-hora-extra/select${qs(params)}`),

  /**
   * Crear insumo "on-the-fly" desde el wizard cuando el operador selecciona
   * "Otro" en el dropdown de Tipo de Fertilizante.
   *
   * Endpoint: POST /operaciones/insumos
   * Permisos: operaciones.crear u operaciones.editar
   *
   * Respuesta 201: { data: { id, nombre, unidad_medida: "GRAMOS" } }
   * Respuesta 409 INSUMO_DUPLICADO: el front debe pedir al usuario que lo
   *   seleccione del dropdown en lugar de crearlo.
   *
   * @example
   *   try {
   *     const r = await selectsApi.crearInsumo('Urea 46%');
   *     // → r.data.id, r.data.nombre, r.data.unidad_medida
   *   } catch (err: any) {
   *     if (err.code === 'INSUMO_DUPLICADO') {
   *       // Pedir al usuario que use el dropdown
   *     }
   *   }
   */
  crearInsumo: (nombre: string) =>
    smartRequest<{ data: { id: number; nombre: string; unidad_medida: string } }>(
      `${BASE}/operaciones/insumos`,
      {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      }
    ),

  /**
   * Crear labor de finca "on-the-fly" desde el wizard cuando el operador
   * elige "Otro" en el dropdown de Labor (Paso 3, Labores de Finca).
   *
   * Endpoint: POST /operaciones/labores-finca
   * Permisos: operaciones.crear u operaciones.editar
   *
   * El backend fuerza `categoria=FINCA`, `tipo_pago=JORNAL_FIJO`, `tipo=null`,
   * `es_sistema=false`. `precio_palma` queda null; el admin lo ajusta luego
   * desde Configuración → Labores.
   *
   * Respuesta 201: `{ data: { id, nombre, categoria, tipo, tipo_pago, precio_palma, es_sistema } }`.
   * Respuesta 409 `LABOR_FINCA_DUPLICADA`: ya existe una labor con ese nombre.
   *   El backend igual devuelve `data.id` en el error → el frontend usa ese
   *   id directamente en el bulk (no hay que crear duplicado).
   *
   * @example
   *   try {
   *     const r = await selectsApi.crearLaborFinca('Pintura de galpón');
   *     laboresMap.set(r.data.nombre, r.data.id);
   *   } catch (err: any) {
   *     if (err.code === 'LABOR_FINCA_DUPLICADA' && err.data?.id) {
   *       laboresMap.set(err.data.nombre, err.data.id);
   *     }
   *   }
   */
  crearLaborFinca: (nombre: string) =>
    smartRequest<{
      data: {
        id: number;
        nombre: string;
        categoria: 'FINCA';
        tipo: null;
        tipo_pago: 'JORNAL_FIJO';
        precio_palma: string | null;
        es_sistema: boolean;
      };
    }>(
      `${BASE}/operaciones/labores-finca`,
      {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      }
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGOS DE ERROR DEL MÓDULO (§0 del doc)
// ─────────────────────────────────────────────────────────────────────────────

export const OperacionesErrorCodes = {
  /** Intento de mutar una planilla ya aprobada. */
  OPERACION_APROBADA: 'OPERACION_APROBADA',
  /** La cosecha ya está asignada a un viaje. */
  COSECHA_EN_VIAJE: 'COSECHA_EN_VIAJE',
  /** Falta precio configurado, insumo sin rango, precios_cosecha sin registro, etc. */
  CALC_ERROR: 'CALC_ERROR',
  /** Intento de editar/eliminar una ausencia ya liquidada en nómina. */
  AUSENCIA_LIQUIDADA: 'AUSENCIA_LIQUIDADA',
  /** Aprobar/rechazar una ausencia que no está en PENDIENTE. */
  AUSENCIA_ESTADO_INVALIDO: 'AUSENCIA_ESTADO_INVALIDO',
  /** Eliminar un motivo de ausencia con ausencias asociadas. */
  MOTIVO_CON_AUSENCIAS: 'MOTIVO_CON_AUSENCIAS',
  /** Editar/eliminar una hora extra ya liquidada en nómina. */
  HORA_EXTRA_LIQUIDADA: 'HORA_EXTRA_LIQUIDADA',
  /** Aprobar/rechazar una hora extra que no está en PENDIENTE. */
  HORA_EXTRA_ESTADO_INVALIDO: 'HORA_EXTRA_ESTADO_INVALIDO',
  /** Eliminar un tipo paramétrico de hora extra con registros asociados. */
  TIPO_HORA_EXTRA_CON_REGISTROS: 'TIPO_HORA_EXTRA_CON_REGISTROS',
  /** Insumo creado desde el wizard ya existe. Pedir al usuario seleccionarlo del dropdown. */
  INSUMO_DUPLICADO: 'INSUMO_DUPLICADO',
  /**
   * Labor de finca creada desde el wizard ("Otro") ya existe.
   * El backend devuelve `data.id` en el error → el frontend lo usa igual
   * y no crea duplicado.
   */
  LABOR_FINCA_DUPLICADA: 'LABOR_FINCA_DUPLICADA',
  /** Usuario sin permiso para la acción. */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type OperacionesErrorCode =
  typeof OperacionesErrorCodes[keyof typeof OperacionesErrorCodes];

// ─────────────────────────────────────────────────────────────────────────────
// ADVERTENCIAS (§3.2 del doc): array `advertencias` que devuelven POST/PUT de
// jornales, cosechas y bulk. Son AVISOS informativos, no errores. El registro
// ya quedó guardado. En endpoints bulk vienen consolidadas por código.
// ─────────────────────────────────────────────────────────────────────────────

export const OperacionesAdvertenciaCodes = {
  /** POR_PALMA sin precio configurado → `valor_total = null` (limbo). */
  SIN_PRECIO_LABOR: 'SIN_PRECIO_LABOR',
  /** FERTILIZACION POR_PALMA sin rango en `precio_abono` que cubra los gramos. */
  SIN_RANGO_ABONO: 'SIN_RANGO_ABONO',
  /** Labor de FINCA sin tarifa para colaborador propio → jornal mínimo aplicado. */
  JORNAL_MINIMO_APLICADO: 'JORNAL_MINIMO_APLICADO',
  /** Labor de FINCA sin tarifa para operario de tercero → `valor_total = 0`. */
  SIN_TARIFA_TERCERO: 'SIN_TARIFA_TERCERO',
  /** COSECHA con peso pero sin `precio_cosecha` para lote+año. */
  SIN_PRECIO_COSECHA: 'SIN_PRECIO_COSECHA',
  /** COSECHA JORNAL_FIJO sin tarifa → `valor_total = 0`. */
  SIN_TARIFA_COSECHA: 'SIN_TARIFA_COSECHA',
} as const;

export type OperacionesAdvertenciaCode =
  typeof OperacionesAdvertenciaCodes[keyof typeof OperacionesAdvertenciaCodes];

export interface OperacionAdvertencia {
  codigo: OperacionesAdvertenciaCode | string;
  mensaje: string;
}

/**
 * Wrapper genérico de respuestas de creación/edición del módulo Operaciones.
 * Además de `data`, el backend puede devolver `advertencias` con avisos NO
 * bloqueantes que el frontend debe mostrar como banners/toasts informativos.
 */
export interface OperacionResponseConAdvertencias<T> {
  message?: string;
  data: T;
  advertencias?: OperacionAdvertencia[];
}