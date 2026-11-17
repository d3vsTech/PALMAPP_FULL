/**
 * Del catálogo de `wizard-init` a la fila del selector de personas.
 *
 * El catálogo trae el nombre completo en una sola cadena y el selector lo
 * quiere partido en dos para pintar las iniciales. Vivía dentro del efecto de
 * carga del wizard; salió aquí porque el catálogo se pide dos veces: al abrir
 * la pantalla, sin fecha, y otra vez al elegir el día en el paso 1, que es
 * cuando el backend ancla la ventana de retirados a esa fecha
 * (API_OPERACIONES §1.1, 2026-11-05).
 */
import type { ColaboradorWizardItem, VentanaVinculacion } from '../../../../api/operaciones';

export interface PersonaWizard {
  id: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
  terceroNombre?: string;
  vinculacion?: VentanaVinculacion[];
  fechaRetiro?: string | null;
  _raw?: unknown;
}

/** "Juan Carlos Pérez Gómez" → ["Juan Carlos", "Pérez Gómez"]. */
function partirNombre(completo: string): [string, string] {
  const partes = completo.trim().split(/\s+/);
  const mitad = Math.ceil(partes.length / 2);
  return [partes.slice(0, mitad).join(' '), partes.slice(mitad).join(' ')];
}

/**
 * Un colaborador propio del catálogo. El id va sin prefijo: el del operario
 * lleva `O_` delante y así el wizard sabe si manda `empleado_id` u
 * `operario_id` al guardar.
 */
export function aPersonaDelWizard(
  c: ColaboradorWizardItem & Partial<{
    primer_nombre: string; primer_apellido: string;
    nombres: string; apellidos: string; nombre: string; apellido: string;
    full_name: string; name: string;
  }>,
): PersonaWizard {
  const completoApi = c.nombre_completo ?? c.full_name ?? c.name ?? '';
  let nombres = c.primer_nombre ?? c.nombres ?? c.nombre ?? '';
  let apellidos = c.primer_apellido ?? c.apellidos ?? c.apellido ?? '';
  // Sin las partes separadas el badge quedaba vacío y se veía como un bloque
  // verde: se parte el nombre completo en dos mitades.
  if (!nombres && !apellidos && completoApi) [nombres, apellidos] = partirNombre(completoApi);
  if (!nombres && !apellidos) {
    nombres = 'Colaborador';
    apellidos = String(c.id);
  }
  return {
    id: String(c.id),
    nombres,
    apellidos,
    nombre_completo: completoApi || `${nombres} ${apellidos}`.trim(),
    // La UI pinta un badge con `FIJO` para explicar el jornal en $0 (§3.2).
    modalidad_pago: c.modalidad_pago,
    // §1.1 — Un catálogo cacheado antes del 2026-09-23 llega sin el campo:
    // `[]` es "sin contratos registrados" y el filtro deja pasar a la persona.
    vinculacion: Array.isArray(c.vinculacion) ? c.vinculacion : [],
    fechaRetiro: c.fecha_retiro ?? null,
    _raw: c,
  };
}
