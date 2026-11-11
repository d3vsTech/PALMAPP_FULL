import { botonTour, buscadorRapido, menu, type PasoTour, type Tour } from './tourEngine';
import { TOURS_FINCA } from './toursFinca';
import { TOURS_PROVEEDOR } from './toursProveedor';
import { TOURS_SUPER_ADMIN } from './toursSuperAdmin';

// Registro de tours. Cada pantalla se reconoce por su ruta.
// Guía de textos: lenguaje natural y profesional, sin términos técnicos. Un concepto por paso.

/** Último paso de los recorridos principales. */
export const pasoCierre: PasoTour = {
  donde: botonTour,
  titulo: 'Vuelve cuando quieras',
  texto: 'Cada pantalla tiene su propia guía. Ábrela desde este botón siempre que la necesites.',
};

export const TOUR_GENERAL: Tour = {
  id: 'general',
  nombre: 'Cómo moverte por PalmApp',
  pasos: [
    {
      titulo: 'Cómo moverte por PalmApp',
      texto: 'Te mostramos dónde encontrar lo que necesitas.',
    },
    {
      donde: menu,
      titulo: 'El menú',
      texto: 'Desde aquí entras a cada parte de PalmApp.',
      lado: 'right',
    },
    {
      donde: buscadorRapido,
      titulo: 'Búsqueda rápida',
      texto: 'Escribe el nombre de un colaborador, un lote o una sección y llega directo.',
      lado: 'bottom',
    },
    pasoCierre,
  ],
};

const TODOS: { ruta: RegExp; tour: Tour }[] = [...TOURS_SUPER_ADMIN, ...TOURS_PROVEEDOR, ...TOURS_FINCA];

/** La guía de la pantalla actual. Las pestañas de Liquidaciones tienen cada una la suya. */
export function tourParaRuta(pathname: string, search = ''): Tour {
  const destino = pathname === '/liquidaciones' ? `${pathname}${search}` : pathname;
  return TODOS.find(t => t.ruta.test(destino))?.tour ?? TOUR_GENERAL;
}
