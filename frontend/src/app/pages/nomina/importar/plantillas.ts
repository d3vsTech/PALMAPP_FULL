/**
 * Columnas y ejemplo del archivo de nóminas históricas.
 * Fuente: docs/ESTRUCTURA_EXCEL_NOMINAS.md
 *
 * Los nombres son los que reconoce el lector del backend en la fila 1. Si se
 * renombran aquí, la vista previa miente: el archivo real seguiría llevando
 * los de la plantilla descargada.
 *
 * Solo cuatro son obligatorias. Todas las demás se guardan tal cual en su
 * columna de la fila de nómina, y lo que no cuadra avisa en vez de bloquear.
 */
import type { ColumnaPlantilla } from '../../liquidaciones/historico/comunes';

export const COLUMNAS_NOMINAS: ColumnaPlantilla[] = [
  { nombre: 'documento', requerida: true },
  { nombre: 'nombres' },
  { nombre: 'apellidos' },
  { nombre: 'fecha_inicio', requerida: true },
  { nombre: 'fecha_fin', requerida: true },
  { nombre: 'modalidad' },
  { nombre: 'dias_trabajados' },
  { nombre: 'salario_contractual' },
  { nombre: 'sueldo' },
  { nombre: 'jornales' },
  { nombre: 'cosecha' },
  { nombre: 'gajos' },
  { nombre: 'promedio_kg_gajo' },
  { nombre: 'complemento_smlv' },
  { nombre: 'dominicales_festivos' },
  { nombre: 'recargo_dominical' },
  { nombre: 'horas_extra' },
  { nombre: 'recargos' },
  { nombre: 'recargo_nocturno' },
  { nombre: 'incapacidades' },
  { nombre: 'devengado_total', requerida: true },
  { nombre: 'auxilio_transporte' },
  { nombre: 'bonificaciones' },
  { nombre: 'detalle_bonificaciones' },
  { nombre: 'salud' },
  { nombre: 'pension' },
  { nombre: 'fondo_solidaridad' },
  { nombre: 'prestamos' },
  { nombre: 'otras_deducciones' },
  { nombre: 'detalle_otras_deducciones' },
  { nombre: 'neto' },
  { nombre: 'fecha_pago' },
];

/**
 * El ejemplo del documento: la primera quincena de marzo de 2025 de una finca
 * con salario mínimo de 1.423.500.
 *
 *  - Carlos es FIJO con sueldo y una cuota de préstamo.
 *  - Ana es de producción: jornales, cosecha con sus gajos y su promedio, y
 *    dominicales. El desglose suma el devengado total.
 *  - Luis no trae modalidad ni desglose: se toman de la ficha y el total entra
 *    como jornales, con su aviso.
 */
const VACIAS = (n: number): string[] => Array.from({ length: n }, () => '');

export const FILAS_NOMINAS: string[][] = [
  [
    '1098765432', 'Carlos', 'Martínez', '2025-03-01', '2025-03-15', 'FIJO', '15',
    '1423500', '711750', '', '', '', '', '', '', '', '', '', '', '',
    '711750', '100000', '', '', '28470', '28470', '', '50000', '', '',
    '704810', '2025-03-16',
  ],
  [
    '52000001', 'Ana', 'López', '2025-03-01', '2025-03-15', 'PRODUCCION', '13',
    '', '', '320000', '500172', '820', '14,5230', '', '60000', '', '', '', '', '',
    '880172', '100000', '', '', '35207', '35207', '', '', '', '',
    '909758', '2025-03-16',
  ],
  [
    '52000002', 'Luis', 'Ardila', '2025-03-01', '2025-03-15', ...VACIAS(15),
    '650000', '100000', '', '', '26000', '26000', '', '', '', '',
    '698000', '2025-03-16',
  ],
];
