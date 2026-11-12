/**
 * De dónde sale el promedio kg/gajo con el que se paga un lote.
 *
 * 2026-11-11 — El backend dejó de promediar el baseline del admin con las
 * mediciones de báscula y, cuando el período no tiene ningún camión
 * homogéneo, toma la última medición anterior del lote en vez de saltar al
 * baseline. El baseline queda solo para un lote que nunca se ha pesado.
 *
 * Para la pantalla la distinción importante no es cuál de los tres es: es
 * si el número está **medido** o **estimado**. Con una estimación, los dos
 * lados de la conciliación usan el mismo promedio y la diferencia da 0 sin
 * que nadie haya pesado esa fruta: ese cero se ve mejor que el de un lote
 * que sí se midió, y es al revés.
 */

export interface DescripcionOrigen {
  /** Chip corto, para la celda. */
  etiqueta: string;
  /** Frase larga, para el `title`. */
  detalle: string;
  /** `false` = estimación: una diferencia en 0 no confirma nada. */
  medido: boolean;
}

interface PromedioLoteParcial {
  origen?: string | null;
  mediciones_bascula?: number;
}

function descripcionBascula(mediciones?: number): DescripcionOrigen {
  const n = mediciones ?? 0;
  return {
    etiqueta: 'Báscula',
    detalle: n > 0
      ? `Báscula: ${n} viaje${n === 1 ? '' : 's'} homogéneo${n === 1 ? '' : 's'} del período.`
      : 'Báscula: viajes homogéneos del período.',
    medido: true,
  };
}

/**
 * `null` cuando la respuesta no trae ninguno de los dos campos: un backend
 * anterior a este cambio no permite afirmar que el promedio esté medido, y
 * callar es más honesto que pintar un chip inventado.
 */
export function describirOrigenPromedio(
  origen: string | null | undefined,
  mediciones: number | undefined,
): DescripcionOrigen | null {
  if (origen === undefined && mediciones === undefined) return null;
  if (origen === 'BASCULA') return descripcionBascula(mediciones);
  if (origen === undefined) {
    return (mediciones ?? 0) > 0
      ? descripcionBascula(mediciones)
      : { etiqueta: 'Estimado', detalle: 'Sin mediciones de báscula en el período.', medido: false };
  }
  if (origen === 'ULTIMO_PROMEDIO_LOTE') {
    return {
      etiqueta: 'Última medición',
      detalle: 'Última medición del lote: en este período no salió ningún camión homogéneo.',
      medido: false,
    };
  }
  if (origen === 'BASELINE') {
    return {
      etiqueta: 'Baseline',
      detalle: 'Baseline del año: el lote nunca se ha pesado.',
      medido: false,
    };
  }
  if (origen === null) {
    return {
      etiqueta: 'Sin promedio',
      detalle: 'Sin promedio que aplicar: configure un baseline o finalice un viaje del lote.',
      medido: false,
    };
  }
  // `MIXTO` quedó derogado el 2026-11-11 y lo que venga después todavía no
  // existe: cualquier valor desconocido se trata como estimación, que es la
  // lectura segura, y no rompe la tabla.
  return { etiqueta: 'Estimado', detalle: `Promedio estimado (${origen}).`, medido: false };
}

/** Atajo para el aviso del "cero falso": el promedio del lote no es medición. */
export function esPromedioEstimado(promedio: PromedioLoteParcial): boolean {
  const d = describirOrigenPromedio(promedio.origen, promedio.mediciones_bascula);
  return d != null && !d.medido;
}

const REGLAS_FUERA_DEL_PERIODO: Record<string, string> = {
  VIAJE_HOMOGENEO: 'Se estimó con el promedio del propio camión (medición).',
  ULTIMO_PROMEDIO_LOTE: 'Se estimó con la última medición del lote anterior al camión.',
  BASELINE: 'Se estimó con el baseline del año del lote.',
  PESO_CONFIRMADO: 'Se tomó del peso confirmado a mano.',
  MIXTO: 'Se aplicó más de una regla dentro del mismo camión.',
};

/** La regla con la que concilió la porción que viajó en otra quincena. */
export function describirReglaFueraDelPeriodo(regla: string | null | undefined): string | null {
  if (!regla) return null;
  return REGLAS_FUERA_DEL_PERIODO[regla] ?? regla;
}
