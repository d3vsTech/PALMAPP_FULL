/**
 * api/ajustesCosecha.ts
 *
 * Cliente MOCK del módulo "Ajustes de Cosecha". Resuelve el problema de
 * gajos pendientes clavijo en el flujo de Viajes: cuando un trabajador
 * reporta 220 gajos y en el reconteo aparecen solo 200, los 20 restantes
 * quedan pendientes de asignar viaje tras viaje sin resolverse nunca.
 *
 * A partir del **3er viaje** posterior al reporte con `gajos_pendientes_enviar > 0`,
 * la cosecha se considera candidata a "ajuste" y aparece en esta lista.
 *
 * Toda la lógica está simulada mientras backend implementa la spec
 * (ver `docs/AJUSTES_COSECHA_SPEC.md`). El contrato de las funciones
 * (`listar`, `ajustar`, `historial`) es el que consumiría el backend real
 * — la UI no cambia cuando se conecte.
 */

import { requestConToken } from './request';

export type TipoAjuste = 'CLAVIJO' | 'REASIGNADO' | 'MANTENIDO';

export interface CosechaConAjustePendiente {
  cosecha_id: number;
  planilla_id: number;
  planilla_fecha: string;
  lote: { id: number; nombre: string } | null;
  sublote: { id: number; nombre: string } | null;
  gajos_reportados: number;
  gajos_reconteo: number | null;
  gajos_asignados_total: number;
  gajos_pendientes: number;
  viajes_transcurridos: number;
  primer_viaje_fecha: string | null;
  ultimo_viaje_fecha: string | null;
  reportado_por: string | null;
  peso_promedio_gajo?: number | null;
}

export interface AjustarPayload {
  tipo: TipoAjuste;
  motivo: string;
  /** Solo para REASIGNADO: viaje al que se traslada la cantidad. */
  viaje_destino_id?: number;
  /** Solo para MANTENIDO: cuántos viajes ignora la alerta antes de volver a mostrar. */
  silenciar_por_viajes?: number;
}

export interface RegistroAjuste {
  id: number;
  cosecha_id: number;
  tipo: TipoAjuste;
  gajos_ajustados: number;
  motivo: string;
  gajos_reportados_snapshot: number;
  gajos_reconteo_previo: number | null;
  gajos_reconteo_nuevo: number | null;
  viajes_transcurridos: number;
  created_by_nombre: string;
  created_at: string;
}

// ─── Datos mock ──────────────────────────────────────────────────────────────

const MOCK_COSECHAS: CosechaConAjustePendiente[] = [
  {
    cosecha_id: 142,
    planilla_id: 54,
    planilla_fecha: '2026-07-14',
    lote: { id: 7, nombre: 'Lote 3' },
    sublote: { id: 14, nombre: 'S-14' },
    gajos_reportados: 220,
    gajos_reconteo: 200,
    gajos_asignados_total: 200,
    gajos_pendientes: 20,
    viajes_transcurridos: 3,
    primer_viaje_fecha: '2026-07-15',
    ultimo_viaje_fecha: '2026-07-23',
    reportado_por: 'Juan Pérez',
    peso_promedio_gajo: 21.5,
  },
  {
    cosecha_id: 158,
    planilla_id: 61,
    planilla_fecha: '2026-07-10',
    lote: { id: 3, nombre: 'Lote 1' },
    sublote: { id: 5, nombre: 'S-05' },
    gajos_reportados: 340,
    gajos_reconteo: null,
    gajos_asignados_total: 300,
    gajos_pendientes: 40,
    viajes_transcurridos: 4,
    primer_viaje_fecha: '2026-07-11',
    ultimo_viaje_fecha: '2026-07-25',
    reportado_por: 'Esteban Zapata',
    peso_promedio_gajo: 22.1,
  },
  {
    cosecha_id: 174,
    planilla_id: 68,
    planilla_fecha: '2026-07-05',
    lote: { id: 12, nombre: 'Lote 5' },
    sublote: null,
    gajos_reportados: 180,
    gajos_reconteo: 165,
    gajos_asignados_total: 150,
    gajos_pendientes: 15,
    viajes_transcurridos: 3,
    primer_viaje_fecha: '2026-07-08',
    ultimo_viaje_fecha: '2026-07-22',
    reportado_por: 'Zoe Rincon',
    peso_promedio_gajo: 19.8,
  },
];

const MOCK_HISTORIAL: Map<number, RegistroAjuste[]> = new Map();
let mockAjusteIdSeq = 1000;

// Cosechas eliminadas del listado tras aplicar ajuste. Mock: al conectar
// backend, esto lo maneja `gajos_pendientes = 0` calculado en query.
const MOCK_ELIMINADAS = new Set<number>();

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const ajustesCosechaApi = {
  /**
   * Lista cosechas con gajos pendientes desde hace >= UMBRAL_VIAJES.
   * REAL: GET /viajes/ajustes-cosecha
   * Query params: `umbral_viajes` (default 3).
   */
  async listar(): Promise<{ data: CosechaConAjustePendiente[] }> {
    await delay(400);
    const data = MOCK_COSECHAS.filter((c) => !MOCK_ELIMINADAS.has(c.cosecha_id));
    return { data };
  },

  /**
   * Aplica un ajuste a una cosecha con pendientes.
   * REAL: POST /viajes/ajustes-cosecha/{cosechaId}
   */
  async ajustar(cosechaId: number, payload: AjustarPayload): Promise<{ data: RegistroAjuste }> {
    await delay(700);
    const cosecha = MOCK_COSECHAS.find((c) => c.cosecha_id === cosechaId);
    if (!cosecha) throw new Error('Cosecha no encontrada');

    const registro: RegistroAjuste = {
      id: ++mockAjusteIdSeq,
      cosecha_id: cosechaId,
      tipo: payload.tipo,
      gajos_ajustados: cosecha.gajos_pendientes,
      motivo: payload.motivo,
      gajos_reportados_snapshot: cosecha.gajos_reportados,
      gajos_reconteo_previo: cosecha.gajos_reconteo,
      gajos_reconteo_nuevo:
        payload.tipo === 'CLAVIJO'
          ? cosecha.gajos_asignados_total
          : cosecha.gajos_reconteo,
      viajes_transcurridos: cosecha.viajes_transcurridos,
      created_by_nombre: 'Camilo (mock)',
      created_at: new Date(2026, 6, 28).toISOString(),
    };
    const previo = MOCK_HISTORIAL.get(cosechaId) ?? [];
    MOCK_HISTORIAL.set(cosechaId, [registro, ...previo]);

    // CLAVIJO y REASIGNADO cierran la cosecha (0 pendientes).
    // MANTENIDO solo silencia la alerta N viajes.
    if (payload.tipo !== 'MANTENIDO') MOCK_ELIMINADAS.add(cosechaId);

    return { data: registro };
  },

  /**
   * Devuelve el historial de ajustes de una cosecha (para el timeline
   * del detalle). REAL: GET /viajes/ajustes-cosecha/{cosechaId}/historial
   */
  async historial(cosechaId: number): Promise<{ data: RegistroAjuste[] }> {
    await delay(300);
    return { data: MOCK_HISTORIAL.get(cosechaId) ?? [] };
  },
};

// Sirve para "silenciar el compilador" si `requestConToken` aún no se usa —
// se importa para que quede claro que la migración a HTTP real va aquí.
void requestConToken;

// ─── Etiquetas UI ────────────────────────────────────────────────────────────

export const TIPO_AJUSTE_LABEL: Record<TipoAjuste, { label: string; color: string; descripcion: string }> = {
  CLAVIJO: {
    label: 'Clavijo',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    descripcion: 'Los gajos nunca existieron (clavijos). Se baja el reconteo al total real asignado.',
  },
  REASIGNADO: {
    label: 'Reasignado a otro viaje',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    descripcion: 'Los gajos sí existían; se agregan al viaje que se seleccione.',
  },
  MANTENIDO: {
    label: 'Mantenido pendiente',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    descripcion: 'Silencia la alerta N viajes más; no modifica cantidades.',
  },
};
