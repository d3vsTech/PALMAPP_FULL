/**
 * Festivos oficiales de Colombia 2024-2030
 * Según Ley 51 de 1983 (Ley Emiliani)
 * 
 * Festivos fijos: 1 enero, 1 mayo, 20 julio, 7 agosto, 8 diciembre, 25 diciembre
 * Festivos trasladables: se trasladan al lunes siguiente si caen entre martes y sábado
 * Festivos variables: dependen de Semana Santa (Jueves Santo, Viernes Santo, Ascensión, Corpus Christi, Sagrado Corazón)
 */

export interface Festivo {
  fecha: string; // formato YYYY-MM-DD
  nombre: string;
  tipo: 'fijo' | 'trasladable' | 'variable';
}

export const festivosColombianos: Record<number, Festivo[]> = {
  2024: [
    { fecha: '2024-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2024-01-08', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2024-03-25', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2024-03-28', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2024-03-29', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2024-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2024-05-13', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2024-06-03', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2024-06-10', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2024-07-01', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2024-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2024-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2024-08-19', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2024-10-14', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2024-11-04', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2024-11-11', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2024-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2024-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2025: [
    { fecha: '2025-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2025-01-06', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2025-03-24', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2025-04-17', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2025-04-18', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2025-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2025-06-02', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2025-06-23', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2025-06-30', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2025-06-30', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2025-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2025-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2025-08-18', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2025-10-13', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2025-11-03', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2025-11-17', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2025-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2025-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2026: [
    { fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2026-01-12', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2026-03-23', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2026-04-02', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2026-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2026-05-18', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2026-06-08', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2026-06-15', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2026-06-29', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2026-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2026-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2026-08-17', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2026-10-12', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2026-11-02', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2026-11-16', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2026-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2027: [
    { fecha: '2027-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2027-01-11', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2027-03-22', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2027-03-25', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2027-03-26', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2027-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2027-05-10', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2027-05-31', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2027-06-07', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2027-06-28', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2027-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2027-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2027-08-16', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2027-10-18', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2027-11-01', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2027-11-15', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2027-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2027-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2028: [
    { fecha: '2028-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2028-01-10', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2028-03-20', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2028-04-13', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2028-04-14', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2028-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2028-05-29', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2028-06-19', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2028-06-26', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2028-07-03', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2028-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2028-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2028-08-21', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2028-10-16', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2028-11-06', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2028-11-13', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2028-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2028-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2029: [
    { fecha: '2029-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2029-01-08', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2029-03-19', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2029-03-29', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2029-03-30', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2029-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2029-05-14', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2029-06-04', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2029-06-11', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2029-07-02', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2029-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2029-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2029-08-20', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2029-10-15', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2029-11-05', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2029-11-12', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2029-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2029-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
  2030: [
    { fecha: '2030-01-01', nombre: 'Año Nuevo', tipo: 'fijo' },
    { fecha: '2030-01-07', nombre: 'Reyes Magos', tipo: 'trasladable' },
    { fecha: '2030-03-25', nombre: 'San José', tipo: 'trasladable' },
    { fecha: '2030-04-18', nombre: 'Jueves Santo', tipo: 'variable' },
    { fecha: '2030-04-19', nombre: 'Viernes Santo', tipo: 'variable' },
    { fecha: '2030-05-01', nombre: 'Día del Trabajo', tipo: 'fijo' },
    { fecha: '2030-06-03', nombre: 'Ascensión del Señor', tipo: 'variable' },
    { fecha: '2030-06-24', nombre: 'Corpus Christi', tipo: 'variable' },
    { fecha: '2030-07-01', nombre: 'Sagrado Corazón de Jesús', tipo: 'variable' },
    { fecha: '2030-07-01', nombre: 'San Pedro y San Pablo', tipo: 'trasladable' },
    { fecha: '2030-07-20', nombre: 'Independencia de Colombia', tipo: 'fijo' },
    { fecha: '2030-08-07', nombre: 'Batalla de Boyacá', tipo: 'fijo' },
    { fecha: '2030-08-19', nombre: 'Asunción de la Virgen', tipo: 'trasladable' },
    { fecha: '2030-10-14', nombre: 'Día de la Raza', tipo: 'trasladable' },
    { fecha: '2030-11-04', nombre: 'Todos los Santos', tipo: 'trasladable' },
    { fecha: '2030-11-11', nombre: 'Independencia de Cartagena', tipo: 'trasladable' },
    { fecha: '2030-12-08', nombre: 'Inmaculada Concepción', tipo: 'fijo' },
    { fecha: '2030-12-25', nombre: 'Navidad', tipo: 'fijo' },
  ],
};

/**
 * Verifica si una fecha es festivo en Colombia
 */
export function esFestivo(fecha: Date): boolean {
  const year = fecha.getFullYear();
  const dateStr = fecha.toISOString().split('T')[0];
  
  const festivosDelAnio = festivosColombianos[year];
  if (!festivosDelAnio) return false;
  
  return festivosDelAnio.some(f => f.fecha === dateStr);
}

/**
 * Obtiene el nombre del festivo si la fecha es festiva
 */
export function getNombreFestivo(fecha: Date): string | null {
  const year = fecha.getFullYear();
  const dateStr = fecha.toISOString().split('T')[0];
  
  const festivosDelAnio = festivosColombianos[year];
  if (!festivosDelAnio) return null;
  
  const festivo = festivosDelAnio.find(f => f.fecha === dateStr);
  return festivo ? festivo.nombre : null;
}
