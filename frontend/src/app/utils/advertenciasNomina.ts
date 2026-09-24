/**
 * Cómo se lee cada advertencia de nómina (API_NOMINA §5.1 y §6.1).
 *
 * Ninguna bloquea nada, pero no todas pesan lo mismo, y hasta ahora se
 * pintaban iguales: un calendario de festivos desactualizado se veía exactamente
 * igual que un colaborador que va a liquidar en cero. Esta tabla separa las dos
 * cosas y le pone a cada código un título corto que el usuario pueda leer, en
 * vez del código crudo en mayúsculas.
 *
 * El texto largo lo sigue mandando el backend en `mensaje`: trae los nombres,
 * las fechas y las cifras del caso concreto, y duplicarlo aquí solo lograría
 * que los dos se desincronizaran.
 */

/**
 * `critica` es la que cambia lo que el usuario está a punto de hacer.
 * `informativa` es contexto que explica una cifra.
 */
export type SeveridadAdvertencia = 'critica' | 'informativa';

interface DefinicionAdvertencia {
  titulo: string;
  severidad: SeveridadAdvertencia;
}

const CATALOGO: Record<string, DefinicionAdvertencia> = {
  // Críticas: el resultado de la liquidación no es el que el usuario espera.
  COLABORADOR_SIN_REGISTRO_EN_EL_PERIODO: {
    titulo: 'Sin ningún registro en el período: liquida en cero',
    severidad: 'critica',
  },
  FALTAS_NO_REGISTRADAS_EN_PLANILLA: {
    titulo: 'Días descontados sin novedad registrada',
    severidad: 'critica',
  },
  PLANILLAS_SIN_APROBAR_EN_EL_RANGO: {
    titulo: 'Hay planillas del período sin aprobar',
    severidad: 'critica',
  },
  VACACIONES_CON_TRABAJO_REGISTRADO: {
    titulo: 'Trabajó en días que ya se pagaron como vacaciones',
    severidad: 'critica',
  },

  // Informativas: explican una cifra, no piden una decisión ahora.
  DESCANSO_DOMINICAL_PERDIDO: {
    titulo: 'Se perdieron dominicales por inasistencia',
    severidad: 'informativa',
  },
  CALENDARIO_FESTIVOS_DESACTUALIZADO: {
    titulo: 'El calendario de festivos no coincide con la fuente oficial',
    severidad: 'informativa',
  },
  RECARGO_DOMINICAL_DESACTUALIZADO: {
    titulo: 'El recargo dominical del catálogo no es el vigente',
    severidad: 'informativa',
  },
  INCAPACIDAD_EPS_POSIBLE_FRAGMENTACION: {
    titulo: 'Posible incapacidad partida en tramos',
    severidad: 'informativa',
  },
  COSECHA_GAJOS_SIN_DESPACHAR: {
    titulo: 'Hay gajos sin cargar a ningún camión',
    severidad: 'critica',
  },
};

/**
 * Un código que no está en la tabla se trata como informativo y sin título:
 * se pinta solo el mensaje del backend. Es lo correcto para un código nuevo
 * que el backend agregue antes de que esta tabla lo conozca.
 */
export function definicionAdvertencia(codigo: string): DefinicionAdvertencia | null {
  return CATALOGO[codigo] ?? null;
}

export function severidadAdvertencia(codigo: string): SeveridadAdvertencia {
  return CATALOGO[codigo]?.severidad ?? 'informativa';
}

export function tituloAdvertencia(codigo: string): string | null {
  return CATALOGO[codigo]?.titulo ?? null;
}

/** ¿Hay al menos una que deba frenar al usuario antes de confirmar? */
export function hayCriticas(items: Array<{ codigo: string }> | undefined): boolean {
  return (items ?? []).some((a) => severidadAdvertencia(a.codigo) === 'critica');
}
