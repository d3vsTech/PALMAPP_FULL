/**
 * Columnas y ejemplos de los dos archivos del cargue.
 * Fuente: docs/ESTRUCTURA_EXCEL_OPERACIONES.md
 *
 * Los nombres son los que reconoce el lector del backend en la fila 1. Si se
 * renombran aquí, la vista previa miente: el archivo real seguiría llevando
 * los de la plantilla descargada.
 */
import type { ColumnaPlantilla } from '../../liquidaciones/historico/comunes';
import type { TipoImportacion } from '../../../../api/importarOperaciones';

export const COLUMNAS_JORNALES: ColumnaPlantilla[] = [
  { nombre: 'fecha', requerida: true },
  { nombre: 'documento', requerida: true },
  { nombre: 'tercero' },
  { nombre: 'labor', requerida: true },
  { nombre: 'actividad' },
  { nombre: 'lote' },
  { nombre: 'sublote' },
  { nombre: 'cantidad_palmas' },
  { nombre: 'insumo' },
  { nombre: 'gramos_por_palma' },
  { nombre: 'descripcion' },
  { nombre: 'ubicacion' },
  { nombre: 'valor_total' },
];

export const FILAS_JORNALES = [
  ['2025-03-04', '1012345678', '', '13 · Plateo', '', '', '3 · Lote 1 › Lote 1.1', '240', '', '', '', '', ''],
  ['2025-03-04', '1012345678; 52000001', '', '13 · Plateo', '', '', '5 · Lote 2 › Lote 2.1', '300', '', '', '', '', ''],
  ['2025-03-04', '1012345678', '', '15 · Fertilización', '', '', '5 · Lote 2 › Lote 2.1', '300', '5 · Urea 46%', '200', '', '', ''],
  ['2025-03-04', '80000001', '2 · Cuadrillas del Sur', '13 · Plateo', '', '', '5 · Lote 2 › Lote 2.1', '400', '', '', '', '', ''],
];

export const COLUMNAS_COSECHAS: ColumnaPlantilla[] = [
  { nombre: 'fecha', requerida: true },
  { nombre: 'lote' },
  { nombre: 'sublote', requerida: true },
  { nombre: 'gajos' },
  { nombre: 'kilos' },
  { nombre: 'cuadrilla' },
  { nombre: 'tercero' },
  { nombre: 'valor_total' },
  { nombre: 'referencia' },
  { nombre: 'observacion' },
];

export const FILAS_COSECHAS = [
  ['2025-03-04', '', '3 · Lote 1 › Lote 1.1', '120', '1800.5', '1012345678; 52000001', '', '', 'TQ-00912', ''],
  ['2025-03-04', '', '5 · Lote 2 › Lote 2.1', '80', '', '52000003', '', '', '', ''],
  ['2025-03-05', '', '3 · Lote 1 › Lote 1.1', '60', '900', '80000001', '900123456', '', 'TQ-00913', ''],
];

interface DefinicionPlantilla {
  columnas: ColumnaPlantilla[];
  ejemplo: string[][];
  titulo: string;
  /** Qué es una fila en este archivo. Va de subtítulo en el paso 3. */
  queEsUnaFila: string;
}

const PLANTILLAS: Record<TipoImportacion, DefinicionPlantilla> = {
  jornales: {
    columnas: COLUMNAS_JORNALES,
    ejemplo: FILAS_JORNALES,
    titulo: 'Jornales',
    queEsUnaFila: 'Una fila es una labor hecha por una o varias personas en una fecha.',
  },
  cosechas: {
    columnas: COLUMNAS_COSECHAS,
    ejemplo: FILAS_COSECHAS,
    titulo: 'Cosechas',
    queEsUnaFila: 'Una fila es una tarjeta de cosecha: un sublote en una fecha con su cuadrilla.',
  },
};

export function plantillaDe(tipo: TipoImportacion): DefinicionPlantilla {
  return PLANTILLAS[tipo];
}
