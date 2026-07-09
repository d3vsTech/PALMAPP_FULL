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

/**
 * Preview del cálculo de liquidación (doc §5.1).
 *
 * Para EMPLEADOS internos viene todo poblado.
 *
 * Para OPERARIOS de terceros (`empleado.salario_tipo === null`), la respuesta
 * omite los campos legales: `conceptos_legales`, `subsidio_transporte`,
 * `dias_ausencia_*`, `total_incapacidades`, `total_horas_extra`,
 * `total_recargos` y `total_deducciones_legales`. Tampoco aplica subsidio.
 * Por eso esos campos quedan opcionales en el tipo.
 *
 * `total_neto_propuesto === total_devengado` cuando es operario (sin
 * deducciones). El campo `empleado.tercero` viene poblado cuando aplica.
 */
/**
 * Cuota pendiente de préstamo para el período (doc §5.1 y §15).
 * Solo aparece para colaboradores internos (no operarios). El liquidador
 * decide en cada quincena si aplica la cuota como deducción voluntaria.
 * Al confirmar, pasa el `prestamo_cuota_id` en `deducciones_voluntarias[]`
 * y el backend marca la cuota como APLICADA + actualiza el saldo.
 */
export interface PrestamoCuotaPendiente {
  prestamo_cuota_id: number;
  prestamo_id: number;
  concepto: string;
  numero_cuota: number;
  total_cuotas: number;
  monto: number;
  saldo_restante_prestamo: number;
}

/**
 * Item del detalle de horas extras que aparece en el preview de liquidación
 * (doc §5.1). Solo colaboradores internos. Cada entrada corresponde a una
 * hora extra APROBADA que está siendo incluida en el cálculo.
 */
export interface DetalleHoraExtraPreview {
  id: number;
  /** Fecha de la planilla (YYYY-MM-DD). */
  fecha: string;
  /** HED, HEN, HEDF, HENF, RN, RD, RND. */
  codigo: string;
  tipo_nombre: string;
  /** true = hora extra legal; false = solo recargo. */
  es_extra: boolean;
  cantidad_horas: number;
  valor_hora_base: number;
  porcentaje_recargo: number;
  paga_hora_completa: boolean;
  valor_calculado: number;
  observacion?: string | null;
}

/**
 * Item del detalle de ausencias que aparece en el preview de liquidación
 * (doc §5.1). Solo colaboradores internos. Cada entrada corresponde a una
 * ausencia APROBADA que afecta al empleado en el rango de la nómina.
 */
export interface DetalleAusenciaPreview {
  id: number;
  /** Constante del modelo, ej. INCAPACIDAD_EPS / AUSENCIA_INJUSTIFICADA. */
  tipo: string;
  /** Nombre del motivo del catálogo. */
  motivo_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  /** Días de la ausencia que caen dentro del período de la nómina. */
  dias_en_rango: number;
  es_remunerada: boolean;
  porcentaje_pago: number;
  /** Monto que suma (INCAPACIDAD) o descuenta (DESCUENTO) del pago. */
  valor_calculado: number;
  /** `INCAPACIDAD` = remunerada, suma al devengado.
   *  `DESCUENTO`   = no remunerada, descuenta del salario. */
  afecta: 'INCAPACIDAD' | 'DESCUENTO';
}

/**
 * Conteos de horas extras y ausencias que están en estado PENDIENTE del
 * empleado dentro del período — quedan FUERA del cálculo hasta que alguien
 * las apruebe (doc §5.1). El frontend debe mostrar una advertencia clara
 * si alguno de los conteos es > 0. Solo se envía para colaboradores internos.
 */
export interface PendientesPorAprobar {
  horas_extra: number;
  ausencias: number;
}

export interface PreviewLiquidacion {
  dias_periodo: number;
  dias_trabajados: number;
  salario_base: number;
  total_jornales: number;
  total_cosecha: number;
  total_horas_extra?: number;
  total_recargos?: number;
  total_incapacidades?: number;
  dias_ausencia_descontados?: number;
  total_ausencias_descuento?: number;
  total_devengado: number;
  subsidio_transporte?: number;
  conceptos_legales?: ConceptoLegalPreview[];
  total_deducciones_legales?: number;
  total_neto_propuesto: number;
  /**
   * Cuotas de préstamos VIGENTES cuyo período coincide con el de la nómina
   * actual (doc §5.1). Solo aparece en preview de empleados internos.
   * Puede llegar vacío `[]`.
   */
  prestamos_pendientes?: PrestamoCuotaPendiente[];
  /**
   * Horas extras APROBADAS del empleado que están siendo incluidas en el
   * cálculo actual (doc §5.1). Permite mostrar el tipo real (HED, HEN, etc.)
   * en el desprendible. Solo empleados internos. Puede llegar vacío `[]`.
   */
  detalle_horas_extra?: DetalleHoraExtraPreview[];
  /**
   * Ausencias APROBADAS del empleado que afectan el cálculo en el rango
   * (doc §5.1). Muestra el motivo real y si suma (INCAPACIDAD) o descuenta
   * (DESCUENTO). Solo empleados internos. Puede llegar vacío `[]`.
   */
  detalle_ausencias?: DetalleAusenciaPreview[];
  /**
   * Conteos de horas extras y ausencias PENDIENTES de aprobar del período.
   * Si alguno es > 0, el frontend debe mostrar advertencia (esos registros
   * NO están incluidos en el cálculo actual). Solo empleados internos.
   */
  pendientes_por_aprobar?: PendientesPorAprobar;
  empleado: {
    id: number;
    nombre_completo: string;
    documento: string;
    cargo: string;
    /** null = operario de tercero (sin deducciones legales ni subsidio). */
    salario_tipo: SalarioTipo | null;
    predio: { id: number; nombre: string } | null;
    /** Solo presente para operarios. */
    tercero?: { id: number; razon_social: string };
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
  /**
   * Vincula la deducción a una cuota de préstamo (doc §5.3 + §15). Si se
   * envía, el backend marca `PrestamoCuota` como APLICADA y actualiza el
   * saldo del préstamo. Cuando `cuotas_pagadas == num_cuotas`, el préstamo
   * pasa a `estado=PAGADO` automáticamente.
   *
   * Errores posibles: `PRESTAMO_CUOTA_NO_PENDIENTE`, `PRESTAMO_CUOTA_EMPLEADO_MISMATCH`.
   */
  prestamo_cuota_id?: number;
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
    /** null = operario de tercero. */
    salario_tipo: SalarioTipo | null;
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
    /**
     * Mismo shape que en el preview (§5.1). En el desprendible la fuente es
     * la BD (registros ya con `nomina_id` porque la nómina está CERRADA).
     * Array vacío `[]` si el empleado no tuvo horas extras en el período.
     */
    detalle_horas_extra?: DetalleHoraExtraPreview[];
    /**
     * Detalle de ausencias en el desprendible (§6.2). En este endpoint el
     * campo `dias_calendario` reemplaza a `dias_en_rango` — son los días
     * totales de la ausencia, no los que caen en el período.
     * Array vacío `[]` si no hubo ausencias.
     */
    detalle_ausencias?: (Omit<DetalleAusenciaPreview, 'dias_en_rango' | 'valor_calculado'> & {
      dias_calendario: number;
    })[];
  };
  resumen_trabajo: ResumenTrabajo | null;
}

// ─── Paso 3 — Validar Cosecha (doc §4) ────────────────────────────────────────

/**
 * Detalle de una cosecha individual del colaborador en el período (doc §4.1).
 * Comparación gajos/kg trabajados vs gajos/kg verificados (extractora).
 */
export interface ValidacionCosechaItem {
  fecha: string;
  lote: string;
  sublote: string | null;
  /** `viaje.numero_remision_extractora` — null si no hay viaje vinculado. */
  remision: string | null;
  gajos_trabajados: number;
  gajos_verificados: number;
  diferencia_gajos: number;
  /** floor(gajos_efectivos / N) × promedio_efectivo_del_lote */
  kg_trabajado: number;
  /** peso_calculado_empleado del viaje, o fallback legacy, o 0. */
  kg_extractora: number;
  diferencia_kg: number;
}

export interface ValidacionCosechaDetalleColaborador {
  tipo: 'EMPLEADO' | 'OPERARIO';
  colaborador_id: number;
  nombre_completo: string;
  cargo: string;
  kg: number;
  /** Detalle por cosecha (doc §4.1). */
  cosechas?: ValidacionCosechaItem[];
}

/**
 * Promedios efectivos por lote en esta nómina (doc §4.1).
 *
 * Origen del `promedio_efectivo` (orden de prioridad):
 *  1. `promedio_manual` (override admin en `nomina_promedio_lote`).
 *  2. AVG de `promedio_lote` auto-generado por viajes en el período.
 *  3. Baseline del año con `viaje_id IS NULL`.
 */
export interface ValidacionCosechaPromedioLote {
  lote_id: number;
  lote_nombre: string;
  /** AVG calculado por backend desde `promedio_lote` en el período. */
  promedio_auto: number;
  /** Override manual del admin para esta nómina × lote (null = sin ajuste). */
  promedio_manual: number | null;
  /** El que realmente se usa en los cálculos de pago y cierre. */
  promedio_efectivo: number;
}

/** Bundle calculado de comparación: lo registrado vs el reporte de la extractora. */
export interface ValidacionCosechaBundle {
  total_kg_colaboradores: number;
  total_kg_extractora: number;
  diferencia_kg: number;
  /** Promedios efectivos por lote del período (con auto/manual/efectivo). */
  promedios_por_lote: ValidacionCosechaPromedioLote[];
  detalle_por_colaborador: ValidacionCosechaDetalleColaborador[];
  /** null si el paso aún no fue confirmado. */
  validado_at: string | null;
  /** null si el paso aún no fue confirmado. */
  validado_por: string | null;
}

/**
 * Respuesta del PUT /promedios-lote/{lote} (doc §4.2).
 *
 * Persiste en `nomina_promedio_lote` (override admin por nómina × lote).
 * **NO** escribe en `promedio_lote` global — esa tabla es solo lectura,
 * la mantiene `ViajeCalculationService` al finalizar viajes.
 *
 * El frontend debe volver a llamar GET /validar-cosecha tras este PUT para
 * refrescar la tabla de diferencias y los totales.
 */
export interface PromedioLoteAjustado {
  lote_id: number;
  lote_nombre: string;
  promedio_auto: number;
  promedio_manual: number;
  promedio_efectivo: number;
  ajustado_at: string;
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

// ─── Liquidación de Terceros / Acta (doc §7) ──────────────────────────────────

export type EstadoPagoTercero = 'PENDIENTE' | 'PAGADO';
export type MetodoPagoTercero = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE';

/**
 * Descuento aplicado a un operario dentro del acta de tercero (doc §7.2 —
 * tabla `nomina_tercero_operario_descuento`). Un operario puede tener N
 * descuentos del mismo o distinto concepto. Se agregan/eliminan con los
 * endpoints §7.5 y §7.6.
 */
export interface DescuentoOperarioActa {
  /** ID de la fila `nomina_tercero_operario_descuento`. */
  id: number;
  concepto_id: number;
  concepto_codigo: string;
  concepto_nombre: string;
  valor: number;
  observacion: string | null;
}

/**
 * Línea de operario dentro del acta (doc §7.2 - `operarios[]`).
 *
 * **Vista solo-lectura:** los campos NO son editables directamente. El único
 * ajuste manual permitido son los descuentos con concepto (§7.5 y §7.6).
 *
 * Fórmula del subtotal (doc §7.0):
 * ```
 * subtotal = total_jornales + total_cosecha − SUM(descuentos.valor)
 * ```
 */
export interface NominaTerceroOperario {
  /** ID de la fila `nomina_tercero_operario`. */
  id: number;
  operario_id: number;
  nombre_completo: string;
  cedula: string;
  cargo: string;
  /** Snapshot JSON de labores realizadas por el operario en el período. */
  labores_realizadas: string[];
  /** Total de jornales del operario en el período. */
  total_jornales: number;
  /** Total de cosecha del operario en el período. */
  total_cosecha: number;
  /** SUM(descuentos.valor). Calculado por el backend. */
  total_descuentos: number;
  /** Lista de descuentos del operario. Puede llegar vacía `[]`. */
  descuentos: DescuentoOperarioActa[];
  /** total_jornales + total_cosecha − total_descuentos. Puede ser negativo. */
  subtotal: number;
  observacion: string | null;
}

/**
 * Fila del desglose de labores de un operario (doc §7.4). Devuelto por
 * `GET /nominas/{id}/terceros/{tercero}/operarios/{op}/detalle`. Usado
 * por el frontend para el acordeón de detalle al expandir una fila.
 */
export interface DetalleLaborCosecha {
  lote_id: number;
  lote: string;
  sublote_id: number | null;
  sublote: string | null;
  gajos: number;
  promedio_kg_gajo: number;
  peso_kg: number;
  precio_unit_kg: number;
  total: number;
}

export interface DetalleLaborJornal {
  labor_id: number;
  labor_nombre: string;
  categoria: 'PALMA' | 'FINCA';
  tipo_pago: string;
  lote: string | null;
  sublote: string | null;
  unidades: number;
  unidad: string;
  precio_unit: number;
  total: number;
}

export interface DetalleLaboresOperario {
  cosecha: DetalleLaborCosecha[];
  jornales: DetalleLaborJornal[];
}

/**
 * Fila de resumen del acta (doc §7.1 - `terceros-actas`).
 * Una por contratista con operarios en la nómina.
 */
export interface NominaTerceroActaResumen {
  id: number;
  tercero_id: number;
  tercero_nombre: string;
  total_dias: number;
  total_jornales: number;
  total_cosecha: number;
  total_bruto: number;
  total_a_transferir: number;
  estado_pago: EstadoPagoTercero;
  orden_pago_numero: string | null;
  metodo_pago: MetodoPagoTercero | null;
  pagado_at: string | null;
}

/** Bloque `resumen` que trae el listado `terceros-actas` (doc §7.1). */
export interface NominaTerceroActaResumenGlobal {
  total_a_transferir_global: number;
  pendiente: number;
  pagado: number;
  contratistas: number;
}

/** Detalle del acta (doc §7.2 - `GET /nominas/{id}/terceros/{tercero}`). */
export interface NominaTerceroActaDetalle {
  tercero: {
    id: number;
    tipo_persona: 'NATURAL' | 'JURIDICA';
    nombre: string;
    nit: string | null;
    cedula: string | null;
    representante: string | null;
    telefono: string | null;
    email: string | null;
    banco: string | null;
    tipo_cuenta: 'AHORROS' | 'CORRIENTE' | null;
    numero_cuenta: string | null;
    titular_cuenta: string | null;
  };
  nomina: {
    id: number;
    periodo_label: string;
    mes: number;
    anio: number;
    quincena: number | null;
    fecha_inicio: string;
    fecha_fin: string;
    estado: EstadoNomina;
  };
  acta: {
    id: number;
    total_dias: number;
    total_jornales: number;
    total_cosecha: number;
    total_bruto: number;
    total_a_transferir: number;
    estado_pago: EstadoPagoTercero;
    orden_pago_numero: string | null;
    metodo_pago: MetodoPagoTercero | null;
    referencia_pago: string | null;
    pagado_at: string | null;
    pagado_por: number | null;
    observacion: string | null;
  };
  operarios: NominaTerceroOperario[];
}

/**
 * Alias tipográfico para el shape original. Mantiene la compatibilidad con
 * código que aún referencia `NominaTercero` — apunta al nuevo shape combinado.
 */
export type NominaTercero = NominaTerceroActaResumen;

/**
 * Payload para `POST /nominas/{id}/terceros/{tercero}/operarios/{op}/descuentos`
 * (doc §7.5). Agrega un descuento con concepto identificado a la línea del
 * operario. El backend recalcula subtotal y total_a_transferir.
 *
 * Reglas:
 *  - `concepto_id` debe existir en el catálogo con `tipo=DEDUCCION_VOLUNTARIA`
 *    y `activo=true`. Usar `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA`
 *    para el dropdown.
 *  - `valor` > 0 (sin límite superior — el subtotal puede quedar negativo).
 *  - Un operario puede tener N descuentos del mismo o distinto concepto.
 */
export interface AgregarDescuentoOperarioPayload {
  concepto_id: number;
  valor: number;
  observacion?: string;
}

/**
 * @deprecated Removido en la nueva versión del acta (doc §7). El endpoint
 * `PUT /operarios/{op}` ya no existe. Los días/tarifa/ajuste ya no son
 * editables directamente — el subtotal se calcula desde `total_jornales +
 * total_cosecha` con descuentos que se agregan/eliminan vía §7.5 y §7.6.
 */
export interface ActualizarOperarioActaPayload {
  dias?: number;
  tarifa_dia?: number;
  ajuste?: number;
  observacion?: string;
  descuento_concepto_id?: number | null;
  descuento_valor?: number;
  descuento_observacion?: string | null;
}

/**
 * Payload para POST `/nominas/{id}/terceros/{tercero}/registrar-pago` (doc §7.5).
 *
 * Todos los campos son opcionales — body vacío `{}` es válido. El backend no
 * valida los datos bancarios del tercero — la responsabilidad de confirmar
 * viabilidad de la transferencia queda en el operador. Este endpoint sigue
 * habilitado incluso con la nómina CERRADA (única excepción documentada).
 */
export interface RegistrarPagoTerceroPayload {
  metodo_pago?: MetodoPagoTercero;
  referencia_pago?: string;
  /** Datetime ISO. Default: `now()`. */
  pagado_at?: string;
  orden_pago_numero?: string;
  observacion?: string;
}

// ─── Alias §3.4 — agregar solo operarios con 3 shapes ─────────────────────────

/** Shape A — lista plana de operarios individuales (doc §3.4). */
export interface AgregarTercerosPayloadA {
  operario_ids: number[];
}

/** Shape B — contratistas (expande a TODOS sus operarios activos). */
export interface AgregarTercerosPayloadB {
  tercero_ids: number[];
}

/** Shape C — anidado (validación XOR de pertenencia). */
export interface AgregarTercerosPayloadC {
  terceros: Array<{ tercero_id: number; operario_ids: number[] }>;
}

export type AgregarTercerosPayload =
  | AgregarTercerosPayloadA
  | AgregarTercerosPayloadB
  | AgregarTercerosPayloadC;

// ─── Checklist paso 4 wizard (doc §3.6) ───────────────────────────────────────

export interface PasoCuatroChecklist {
  nomina_empleado_empleados: number;
  nomina_empleado_operarios: number;
  nomina_tercero_creados: number;
  nomina_tercero_operario_creados: number;
  nomina_promedio_lote_ajustados: number;
  nomina_validacion_cosecha_confirmada: boolean;
  requiere_validacion_cosecha: boolean;
  listo_para_cerrar: boolean;
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

  /**
   * Indicadores (cards superiores). Filtros opcionales combinables (doc §2.3).
   * Response incluye `meta.filtros` con los filtros aplicados (útil para
   * pintar chips en la UI).
   */
  indicadores: (params?: {
    anio?: number;
    mes?: number;
    estado?: EstadoNomina;
  }) =>
    apiClient.get<{
      data: NominaIndicadores;
      meta?: { filtros: Partial<{ anio: number; mes: number; estado: EstadoNomina }> };
    }>(`/v1/tenant/nominas/indicadores${toQuery(params)}`, T),

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

  // ─── Terceros — actas, pagos, PDF (doc §7) ─────────────────────────────────
  terceros: {
    /**
     * GET /nominas/{id}/terceros-actas (doc §7.1) — resumen agrupado por
     * contratista + bloque global `resumen`.
     *
     * Nota de ruta: la ruta cambió de `/terceros` a `/terceros-actas` porque
     * `POST /nominas/{id}/terceros` (doc §3.4) ahora es el alias para
     * AGREGAR operarios en el paso 4 del wizard.
     */
    listar: (nominaId: number) =>
      apiClient.get<{
        data: NominaTerceroActaResumen[];
        resumen: NominaTerceroActaResumenGlobal;
      }>(`/v1/tenant/nominas/${nominaId}/terceros-actas`, T),

    /**
     * GET /nominas/{id}/terceros/{terceroId} (doc §7.2) — detalle del acta
     * con datos del contratista, nómina, acta y líneas por operario.
     */
    ver: (nominaId: number, terceroId: number) =>
      apiClient.get<{ data: NominaTerceroActaDetalle }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}`,
        T,
      ),

    /**
     * POST .../liquidar (doc §7.3) — calcula totales del acta y persiste.
     * Idempotente. Auto-liquida operarios PENDIENTES si los encuentra.
     * Preserva descuentos existentes al recalcular.
     */
    liquidar: (nominaId: number, terceroId: number) =>
      apiClient.post<{ data: NominaTerceroActaDetalle; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/liquidar`,
        undefined,
        T,
      ),

    /**
     * GET .../operarios/{op}/detalle (doc §7.4) — desglose de lo que hizo el
     * operario en el período (cosecha por lote + jornales por labor). Usado
     * por el frontend para el acordeón de detalle. Solo-lectura.
     */
    detalleOperario: (nominaId: number, terceroId: number, operarioId: number) =>
      apiClient.get<{ data: DetalleLaboresOperario }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/operarios/${operarioId}/detalle`,
        T,
      ),

    /**
     * POST .../operarios/{op}/descuentos (doc §7.5) — agrega un descuento
     * con concepto identificado a la línea del operario. El backend recalcula
     * subtotal y total_a_transferir. Devuelve el acta completa actualizada.
     *
     * Errores: 422 `DESCUENTO_CONCEPTO_INVALIDO`, 422 `OPERARIO_NO_PERTENECE_A_TERCERO`,
     * 404 `ACTA_NO_CALCULADA`, 409 `NOMINA_CERRADA`.
     */
    agregarDescuento: (
      nominaId: number,
      terceroId: number,
      operarioId: number,
      payload: AgregarDescuentoOperarioPayload,
    ) =>
      apiClient.post<{ data: NominaTerceroActaDetalle; message?: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/operarios/${operarioId}/descuentos`,
        payload,
        T,
      ),

    /**
     * DELETE .../operarios/{op}/descuentos/{descuento} (doc §7.6) — elimina
     * un descuento de la línea del operario. Recalcula subtotal y
     * total_a_transferir. Devuelve el acta completa actualizada.
     *
     * Errores: 404 `DESCUENTO_NO_ENCONTRADO`, 422 `OPERARIO_NO_PERTENECE_A_TERCERO`,
     * 404 `ACTA_NO_CALCULADA`, 409 `NOMINA_CERRADA`.
     */
    eliminarDescuento: (
      nominaId: number,
      terceroId: number,
      operarioId: number,
      descuentoId: number,
    ) =>
      apiClient.delete<{ data: NominaTerceroActaDetalle; message?: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/operarios/${operarioId}/descuentos/${descuentoId}`,
        T,
      ),

    /**
     * @deprecated Removido en la nueva API (doc §7). El endpoint
     * `PUT /operarios/{op}` ya no existe. Usar `agregarDescuento` /
     * `eliminarDescuento` para modificar los descuentos del operario; el resto
     * de campos no son editables directamente.
     */
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
     * POST .../registrar-pago (doc §7.7) — marca el acta como PAGADO.
     * Requiere permiso `nomina.pagar-tercero`. Permitido incluso con la
     * nómina CERRADA (excepción documentada).
     */
    registrarPago: (
      nominaId: number,
      terceroId: number,
      payload: RegistrarPagoTerceroPayload,
    ) =>
      apiClient.post<{ data: NominaTerceroActaDetalle; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/registrar-pago`,
        payload,
        T,
      ),

    /** GET .../acta/pdf (doc §7.8) — descarga el PDF del acta (DomPDF). */
    actaPdf: (nominaId: number, terceroId: number) =>
      apiClient.getBlob(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}/acta/pdf`,
        T,
      ),

    /**
     * POST /nominas/{id}/terceros (doc §3.4) — alias de agregar operarios,
     * acepta 3 shapes (A: operario_ids, B: tercero_ids, C: terceros anidados).
     * Pre-hidrata `nomina_tercero` y `nomina_tercero_operario` con totales 0.
     */
    agregar: (nominaId: number, payload: AgregarTercerosPayload) =>
      apiClient.post<{ data: NominaEmpleado[]; message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros`,
        payload,
        T,
      ),

    /**
     * DELETE /nominas/{id}/terceros/{tercero} (doc §3.5) — elimina TODOS
     * los operarios pendientes del contratista + su acta + líneas. Falla si
     * al menos un operario ya fue LIQUIDADO.
     */
    eliminarPorContratista: (nominaId: number, terceroId: number) =>
      apiClient.delete<{ message: string }>(
        `/v1/tenant/nominas/${nominaId}/terceros/${terceroId}`,
        T,
      ),
  },

  /**
   * GET /nominas/{id}/paso-4-checklist (doc §3.6) — diagnóstico del estado de
   * hidratación de las 4 tablas que el paso 4 del wizard debe dejar
   * consistentes antes de cerrar la nómina. Útil para mostrar banner
   * "Acciones pendientes antes de cerrar".
   */
  pasoCuatroChecklist: (nominaId: number) =>
    apiClient.get<{ data: PasoCuatroChecklist }>(
      `/v1/tenant/nominas/${nominaId}/paso-4-checklist`,
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
  /**
   * @deprecated Desde doc §7.5: el endpoint `POST /registrar-pago` YA NO
   * valida los datos bancarios del tercero. Este código se mantiene por
   * compatibilidad con backends antiguos pero no debería activarse.
   */
  TERCERO_SIN_DATOS_BANCARIOS: 'TERCERO_SIN_DATOS_BANCARIOS',
  /**
   * `concepto_id` al agregar un descuento no existe, no es
   * `tipo=DEDUCCION_VOLUNTARIA` o está inactivo (doc §7.5).
   */
  DESCUENTO_CONCEPTO_INVALIDO: 'DESCUENTO_CONCEPTO_INVALIDO',
  /**
   * El `id` de descuento no existe o no pertenece al operario solicitado
   * (doc §7.6). Aplica a DELETE `.../descuentos/{descuento}`.
   */
  DESCUENTO_NO_ENCONTRADO: 'DESCUENTO_NO_ENCONTRADO',
  /**
   * Intento de eliminar/liquidar un tercero que no tiene operarios en esa
   * nómina. Aplica a DELETE /nominas/{id}/terceros/{tercero} y POST /liquidar
   * (doc §3.5 y §7.3). HTTP 404 o 422.
   */
  TERCERO_SIN_OPERARIOS_EN_NOMINA: 'TERCERO_SIN_OPERARIOS_EN_NOMINA',
  /** Intento de registrar pago sobre un acta ya en PAGADO (doc §7.5). */
  ACTA_TERCERO_YA_PAGADA: 'ACTA_TERCERO_YA_PAGADA',
  /** Acta no calculada aún; ejecutar `POST /liquidar` primero (doc §7.2). */
  ACTA_NO_CALCULADA: 'ACTA_NO_CALCULADA',
  /**
   * Intento de editar `valor_total`/`num_cuotas`/fechas de un préstamo con
   * cuotas ya aplicadas (doc §15). Solo se permiten cambios en `concepto`
   * y `observaciones` en ese estado.
   */
  PRESTAMO_NO_EDITABLE: 'PRESTAMO_NO_EDITABLE',
  /**
   * `prestamo_cuota_id` en `deducciones_voluntarias[]` referencia una cuota
   * que ya está APLICADA (doc §5.3 + §15).
   */
  PRESTAMO_CUOTA_NO_PENDIENTE: 'PRESTAMO_CUOTA_NO_PENDIENTE',
  /**
   * La cuota de préstamo no pertenece al empleado que se está liquidando
   * (doc §15).
   */
  PRESTAMO_CUOTA_EMPLEADO_MISMATCH: 'PRESTAMO_CUOTA_EMPLEADO_MISMATCH',
  /**
   * Intento de crear un préstamo para un operario de tercero — solo
   * colaboradores internos son elegibles (API_PRESTAMOS §0).
   */
  PRESTAMO_SOLO_COLABORADORES: 'PRESTAMO_SOLO_COLABORADORES',
  /** Usuario sin permiso para la acción. */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type NominaErrorCode =
  typeof NominaErrorCodes[keyof typeof NominaErrorCodes];
