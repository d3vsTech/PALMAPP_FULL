/**
 * De qué viaje salió el promedio kg/gajo con el que se paga un lote.
 *
 * El bundle de validar-cosecha dice el valor y su `origen`, pero no de cuál
 * medición vino. Sin eso, la pantalla solo puede mostrar "cuándo se tocó el
 * registro", que no es lo que el liquidador necesita saber: él quiere el
 * camión y el día que produjeron ese número.
 *
 * La fuente se reconstruye desde `GET /promedios-lote`, que trae por fila el
 * `viaje` (remisión y fecha) cuando la generó un viaje homogéneo, y nada
 * cuando es un baseline del admin. No se vuelve a decidir la escalera: el
 * `origen` del bundle ya dice qué peldaño ganó y acá solo se busca su fila.
 */
import { configuracionApi, type PromedioLote } from '../../../api/configuracion';

export interface FuentePromedioLote {
  /** `Y-m-d` de la medición o del baseline. `null` si no se encontró. */
  fecha: string | null;
  /** Remisión del viaje homogéneo que la midió. */
  remision?: string | null;
  /** Mediciones del período que entraron al promedio (0 si es estimación). */
  mediciones: number;
}

interface PromedioConOrigen {
  lote_id: number;
  origen?: string | null;
}

/** El día anterior a `fecha`, que es hasta donde mira la última medición. */
function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fechaDeFila(p: PromedioLote): string | null {
  return p.viaje?.fecha_viaje ?? p.fecha ?? null;
}

/** La fila más reciente de la lista, por fecha. */
function masReciente(filas: PromedioLote[]): PromedioLote | null {
  let mejor: PromedioLote | null = null;
  for (const f of filas) {
    const fecha = fechaDeFila(f);
    if (!fecha) continue;
    const actual = mejor ? fechaDeFila(mejor) : null;
    if (!actual || fecha > actual) mejor = f;
  }
  return mejor;
}

function aFuente(fila: PromedioLote | null, mediciones: number): FuentePromedioLote {
  return {
    fecha: fila ? fechaDeFila(fila) : null,
    remision: fila?.viaje?.remision ?? null,
    mediciones,
  };
}

/**
 * Las mediciones del período, de todos los lotes, en una sola petición.
 * `per_page` 200 cubre de sobra una quincena; lo que no quepa queda sin
 * fecha y la columna muestra "—" en vez de inventar una.
 */
async function medicionesDelPeriodo(
  fechaInicio: string,
  fechaFin: string,
): Promise<Map<number, PromedioLote[]>> {
  const res = await configuracionApi.promediosLote.listar({
    fecha_desde: fechaInicio,
    fecha_hasta: fechaFin,
    solo_viajes: true,
    per_page: 200,
  });
  const porLote = new Map<number, PromedioLote[]>();
  for (const fila of res.data ?? []) {
    const filas = porLote.get(fila.lote_id) ?? [];
    filas.push(fila);
    porLote.set(fila.lote_id, filas);
  }
  return porLote;
}

/** La última medición del lote anterior al período (peldaño 3). */
async function ultimaMedicionAnterior(
  loteId: number,
  fechaInicio: string,
): Promise<FuentePromedioLote> {
  const res = await configuracionApi.promediosLote.listar({
    lote_id: loteId,
    fecha_hasta: diaAnterior(fechaInicio),
    solo_viajes: true,
    per_page: 100,
  });
  return aFuente(masReciente(res.data ?? []), 0);
}

/** El baseline del año que el admin configuró para el lote (peldaño 4). */
async function baselineDelAnio(loteId: number, fechaFin: string): Promise<FuentePromedioLote> {
  const res = await configuracionApi.promediosLote.listar({
    lote_id: loteId,
    anio: Number(fechaFin.slice(0, 4)),
    solo_baseline: true,
    per_page: 100,
  });
  return aFuente(masReciente(res.data ?? []), 0);
}

/**
 * Una petición para las mediciones del período y una más por cada lote que
 * se paga con una estimación, que son los pocos cuyo dato vive fuera del
 * rango. Un lote que falle se queda sin fuente y la columna lo dice.
 */
export async function cargarFuentesPromedio(
  promedios: PromedioConOrigen[],
  fechaInicio: string,
  fechaFin: string,
): Promise<Map<number, FuentePromedioLote>> {
  const enRango = await medicionesDelPeriodo(fechaInicio, fechaFin);
  const fuentes = new Map<number, FuentePromedioLote>();

  const SIN_FUENTE: FuentePromedioLote = { fecha: null, remision: null, mediciones: 0 };

  await Promise.all(
    promedios.map(async (p) => {
      const filas = enRango.get(p.lote_id) ?? [];
      if (p.origen !== 'ULTIMO_PROMEDIO_LOTE' && p.origen !== 'BASELINE') {
        fuentes.set(p.lote_id, aFuente(masReciente(filas), filas.length));
        return;
      }
      try {
        fuentes.set(
          p.lote_id,
          p.origen === 'BASELINE'
            ? await baselineDelAnio(p.lote_id, fechaFin)
            : await ultimaMedicionAnterior(p.lote_id, fechaInicio),
        );
      } catch {
        // El lote se queda sin fecha y la columna muestra "—": la fuente es
        // un dato de contexto, no vale tumbar el modal de ajuste por ella.
        fuentes.set(p.lote_id, SIN_FUENTE);
      }
    }),
  );

  return fuentes;
}

/**
 * Cómo se nombra la fuente en una celda: el camión cuando lo hubo, el
 * conteo cuando fueron varios, y el peldaño de la escalera cuando el
 * promedio no salió de este período.
 */
export function etiquetaFuentePromedio(
  origen: string | null | undefined,
  fuente: FuentePromedioLote | undefined,
): string {
  const viaje = fuente?.remision ? `Viaje ${fuente.remision}` : null;

  if (origen === 'ULTIMO_PROMEDIO_LOTE') {
    return viaje ? `Última medición · ${viaje}` : 'Última medición del lote';
  }
  if (origen === 'BASELINE') return 'Baseline del año';
  if (origen === null) return 'Sin promedio';

  const n = fuente?.mediciones ?? 0;
  if (n > 1) return `${n} viajes del período`;
  return viaje ?? (n === 1 ? 'Viaje del período' : '—');
}
