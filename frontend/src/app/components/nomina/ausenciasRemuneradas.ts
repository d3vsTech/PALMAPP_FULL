/**
 * La línea de `total_incapacidades` en el devengado.
 *
 * Ese total agrupa toda ausencia remunerada: incapacidad de la EPS, de la
 * ARL, licencias de maternidad, paternidad y luto, calamidad doméstica y
 * permiso remunerado. Llamarla "Incapacidades" a secas le decía al
 * trabajador que estuvo incapacitado cuando lo que tuvo fue un permiso.
 *
 * El backend manda `ausencias_remuneradas_resumen` con una entrada por tipo
 * y `etiqueta_ausencias_remuneradas` con el nombre correcto de la línea
 * única. Las dos son opcionales: si la respuesta viene de un backend
 * anterior, esto devuelve la línea de siempre.
 *
 * En el desprendible de una nómina ya liquidada el valor por tipo no está
 * guardado, así que llega `null` cuando hubo más de un tipo. Ahí no se
 * reparte la cifra a mano: se muestra una sola línea con el total y los
 * tipos como detalle.
 */
import type { AusenciaRemuneradaResumen } from '../../../api/nomina';

export interface LineaAusenciaRemunerada {
  clave: string;
  /** Nombre de la línea, ej. "Permiso remunerado". */
  etiqueta: string;
  /** Lo que va en gris al lado, ej. "1 día". */
  detalle?: string;
  valor: number;
}

const dias = (n: number) => `${n} día${n === 1 ? '' : 's'}`;

interface Args {
  resumen?: AusenciaRemuneradaResumen[];
  etiqueta?: string;
  /** `total_incapacidades` del período. */
  total: number;
  /** Respaldo para backends viejos: los motivos de las filas remuneradas. */
  motivos?: string[];
}

export function lineasAusenciasRemuneradas({
  resumen,
  etiqueta,
  total,
  motivos,
}: Args): LineaAusenciaRemunerada[] {
  const entradas = resumen ?? [];

  if (entradas.length > 0 && entradas.every((e) => e.valor != null)) {
    return entradas.map((e) => ({
      clave: e.tipo,
      etiqueta: e.etiqueta,
      detalle: dias(e.dias),
      valor: Number(e.valor),
    }));
  }

  // Varios tipos sin valor por tipo: la cifra solo puede ir en el total.
  if (entradas.length > 0) {
    return [{
      clave: 'remuneradas',
      etiqueta: etiqueta ?? entradas.map((e) => e.etiqueta).join(' y '),
      detalle: entradas.map((e) => `${e.etiqueta} ${dias(e.dias)}`).join(' · '),
      valor: total,
    }];
  }

  return [{
    clave: 'remuneradas',
    etiqueta: etiqueta ?? 'Incapacidades',
    detalle: motivos && motivos.length > 0 ? motivos.join(', ') : undefined,
    valor: total,
  }];
}

/** Los motivos de las filas que suman al devengado, sin repetir. */
export function motivosRemunerados(
  filas?: { afecta?: string; motivo_nombre?: string }[],
): string[] {
  return Array.from(
    new Set(
      (filas ?? [])
        .filter((a) => a.afecta === 'INCAPACIDAD')
        .map((a) => a.motivo_nombre)
        .filter((m): m is string => Boolean(m)),
    ),
  );
}
