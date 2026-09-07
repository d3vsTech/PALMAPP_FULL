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
  nombre: string;
  labor: string;
  otraLabor?: string;
  lugar: string;
}

export interface AusenteRegistro {
  id: string;
  colaboradorId: string;
  motivo: string;
  otroMotivo?: string;
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
export interface ColaboradorWizard {
  id: string;
  nombres: string;
  apellidos: string;
  terceroNombre?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
}
