/**
 * Tipos del wizard de Planilla Diaria (NuevaPlanillaWizard).
 *
 * Son la forma LOCAL de las tarjetas del formulario, no el contrato del API.
 * El payload real se arma al persistir con los tipos de `api/operaciones`.
 */

export interface TrabajoCosecha {
  id: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  gajosRecogidos: number;
  kilos: number;
}

/**
 * Campo común opcional para los 5 tipos de labores de palma con N miembros.
 *
 * Cuando la tarjeta representa un GRUPO persistido en el backend (`jornal_grupos`),
 * este campo lleva el id numérico del grupo (como string). Cuando la tarjeta
 * es un jornal INDIVIDUAL (1 colaborador), este campo es `undefined` y el `id`
 * apunta al `jornales.id` clásico.
 *
 * El wizard usa esta bandera para decidir qué endpoint llamar al persistir:
 *   - N === 1 sin grupoId  → jornalesApi (bulk POST / PUT individual)
 *   - N >= 2 sin grupoId   → jornalGruposApi.crear (nuevo grupo)
 *   - grupoId presente     → jornalGruposApi.editar (grupo existente)
 */
export interface TrabajoPlateo {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

export interface TrabajoPoda {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  numeroPalmas: number;
}

export interface TrabajoFertilizacion {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  palmas: number;
  tipoFertilizante: string;
  otroFertilizante?: string;
  cantidadGramos: number;
}

export interface TrabajoSanidad {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  lote: string;
  sublote: string;
  /** Nombre visible del trabajo. Snapshot para render. */
  trabajoRealizado: string;
  /**
   * §4.7 LABORES_JORNALES — FK a `labor_actividades`. Se envía al backend
   * cuando existe. `null` significa "texto libre" (histórico o el usuario
   * escribió a mano) — el backend acepta ambos casos en SANIDAD.
   */
  laborActividadId?: number | null;
}

export interface TrabajoOtros {
  id: string;
  grupoId?: string;
  colaboradores: string[];
  /**
   * Referencia al catálogo unificado de Labores (categoria=PALMA, custom, tipo=null).
   * El wizard envía `labor_id = laborOtrosRawId` al endpoint unificado.
   */
  laborOtrosKey?: string;          // ej. "palma-3"
  laborOtrosRawId?: number;
  /** Snapshot del `tipo_pago` de la labor — define qué campos pinta el form
   *  (POR_PALMA → cantidad_palmas; JORNAL_FIJO → nombre_trabajo). */
  laborOtrosTipoPago?: 'POR_PALMA' | 'JORNAL_FIJO';
  nombre: string;
  laborRealizada: string;
  /**
   * §4.7 LABORES_JORNALES — FK a `labor_actividades`. Ver nota en
   * `TrabajoSanidad.laborActividadId`.
   */
  laborActividadId?: number | null;
  /** Solo POR_PALMA — autofill desde sublote.cantidad_palmas, editable. */
  numeroPalmas?: number;
  /** Solo JORNAL_FIJO — opcional, texto libre para detallar el trabajo. */
  nombreTrabajo?: string;
  lote: string;
  sublote: string;
}

export interface TrabajoAuxiliar {
  id: string;
  /** Id del colaborador de ESTA tarjeta. Una tarjeta = un jornal. */
  nombre: string;
  labor: string;
  otraLabor?: string;
  lugar: string;
  /**
   * Selección del formulario mientras se edita. Solo vive ahí: al guardar se
   * expande a una tarjeta por colaborador, porque el backend crea un jornal
   * por empleado (§3.3). Las tarjetas ya guardadas no lo llevan.
   */
  colaboradores?: string[];
}

export interface AusenteRegistro {
  id: string;
  colaboradorId: string;
  motivo: string;
  otroMotivo?: string;
  /**
   * PR-N3 — "Hasta". Vacío = un solo día, el de la planilla. Es el campo que
   * convierte una falta puntual en una incapacidad de varios días; sin él una
   * incapacidad de 10 días quedaba registrada como un día y las planillas
   * siguientes la volvían a pedir.
   */
  fechaFin?: string;
  /**
   * PR-N3 — "Horario", `HH:MM`. Las dos o ninguna. Con horas la novedad es
   * PARCIAL: un solo día, informativa, no descuenta día en nómina ni cubre
   * el día en la cobertura.
   */
  horaInicio?: string;
  horaFin?: string;
  /**
   * ID del motivo del catálogo (`motivos_ausencia.id`) — se guarda al cargar
   * la planilla desde el backend para que el render pueda resolver el nombre
   * contra `motivosMap` incluso si al momento del prefill ese mapa no estaba
   * listo (evita mostrar texto libre viejo en lugar del nombre correcto).
   */
  motivoAusenciaId?: number;
}

export interface HoraExtra {
  id: string;
  colaboradorId: string;
  tipoHora: string;
  numeroHoras: number;
  observacion: string;
}

export const ETAPAS = [
  { numero: 1, nombre: 'Info. General' },
  { numero: 2, nombre: 'Labores de Palma' },
  { numero: 3, nombre: 'Labores de Finca' },
  { numero: 4, nombre: 'Horas Extras' },
  { numero: 5, nombre: 'Finalización' },
];

/** Forma mínima de un colaborador para chips y selects del wizard. */
/**
 * PR-L8 — Vacaciones liquidadas que cubren la fecha de la planilla.
 * Se guarda el rango completo, no solo el comprobante, porque el selector
 * muestra "De vacaciones del 05-ene al 22-ene (VAC-1)".
 */
/** Ventana de contrato del colaborador, tal como llega del bundle. */
export type VentanaVinculacion = import('../../../../api/operaciones').VentanaVinculacion;

/**
 * PR-N3 — Novedad ya vigente el día de la planilla, venga de donde venga
 * (otra planilla, el módulo de Novedades o una importación). Forma local de
 * `novedades_vigentes[]` del wizard-init.
 */
export interface NovedadEnPlanilla {
  fuente: 'AUSENCIA' | 'VACACION' | 'TERMINACION';
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  parcial: boolean;
  horario: string | null;
  /** True si la registró esta misma planilla: entonces no es un conflicto. */
  deEstaPlanilla: boolean;
}

export interface VacacionEnPlanilla {
  comprobante: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface ColaboradorWizard {
  id: string;
  nombres: string;
  apellidos: string;
  terceroNombre?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
  /**
   * Ventanas de contrato (API_OPERACIONES §1.1). Deciden si la persona puede
   * aparecer en la planilla de una fecha. Vacío o ausente = sin contratos
   * registrados, y entonces no se filtra. Ver `vinculacionPlanilla`.
   */
  vinculacion?: VentanaVinculacion[];
  /** Fecha de retiro de la ficha, para explicar por qué no aparece. */
  fechaRetiro?: string | null;
  /**
   * Presente cuando no tenía contrato el día de la planilla. Los selectores
   * lo esconden; las tarjetas ya guardadas lo siguen mostrando.
   */
  noVinculado?: { motivo: string };
  /**
   * PR-L8 — Presente cuando la fecha de la planilla cae dentro de unas
   * vacaciones liquidadas. Bloquea la seleccion; en jornales, cosecha y
   * horas extra el usuario puede forzarla, porque las vacaciones se pueden
   * interrumpir y el trabajador pudo haber ido de verdad.
   */
  enVacaciones?: VacacionEnPlanilla;
  /**
   * PR-N3 — Presente cuando ya hay una novedad que cubre la fecha. Una
   * novedad PARCIAL no se marca: son horas sueltas y el día sigue siendo
   * trabajado. Solo bloquea registrar OTRA novedad (el backend responde 422
   * `NOVEDAD_SOLAPADA`); el jornal se sigue permitiendo.
   */
  novedadVigente?: NovedadEnPlanilla;
}
