/**
 * Columnas y ejemplo del archivo de viajes.
 * Fuente: docs/ESTRUCTURA_EXCEL_VIAJES.md
 *
 * Los nombres son los que reconoce el lector del backend en la fila 1. Si se
 * renombran aquí, la vista previa miente: el archivo real seguiría llevando
 * los de la plantilla descargada.
 *
 * Las 20 columnas van completas a propósito. Las primeras 17 son del viaje y
 * se heredan dentro del grupo de la misma remisión; `cosecha` y `gajos` son de
 * la fila, y `gajos_total` solo aplica al viaje que no lleva cosechas.
 */
import type { ColumnaPlantilla } from '../../liquidaciones/historico/comunes';

export const COLUMNAS_VIAJES: ColumnaPlantilla[] = [
  { nombre: 'remision', requerida: true },
  { nombre: 'fecha_viaje', requerida: true },
  { nombre: 'hora_salida' },
  { nombre: 'placa', requerida: true },
  { nombre: 'conductor' },
  { nombre: 'extractora', requerida: true },
  { nombre: 'peso_viaje' },
  { nombre: 'remision_extractora' },
  { nombre: 'fecha_llegada' },
  { nombre: 'hora_llegada' },
  { nombre: 'fruto_verde' },
  { nombre: 'sobre_maduro' },
  { nombre: 'podrido' },
  { nombre: 'pedunculo_largo' },
  { nombre: 'mal_formado' },
  { nombre: 'observaciones_extractora' },
  { nombre: 'observaciones' },
  { nombre: 'cosecha' },
  { nombre: 'gajos' },
  { nombre: 'gajos_total' },
];

/** La etiqueta del camión en la lista: placa, conductor y empresa de la ficha. */
const CAMION = '12 · ABC-123 – Carlos Rodríguez · Transportes del Llano';

/**
 * El ejemplo del documento, fila por fila:
 *
 *  - V-0458 lleva dos cosechas del mismo lote. La segunda fila solo repite la
 *    remisión: todo lo demás lo hereda de la primera. Trae el conductor de la
 *    ficha, como la fila de ejemplo que genera la plantilla.
 *  - V-0459 escribe la placa sin guion, elige la planta de la lista y deja el
 *    conductor vacío, que es lo normal: lo pone el camión.
 *  - V-0460 es un viaje que paga por jornal: sin cosecha y con `gajos_total`.
 */
export const FILAS_VIAJES: string[][] = [
  [
    'V-0458', '2025-03-05', '05:45', CAMION, 'Carlos Rodríguez',
    '900.111.222-1', '12500.5', '0042', '', '', '', '', '', '', '', '', '',
    '142 · 2025-03-04 › Lote 1 › Lote 1.1 · 120 gajos · Juan Pérez', '120', '',
  ],
  [
    'V-0458', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'TQ-00913', '80', '',
  ],
  [
    'V-0459', '2025-03-05', '', 'XYZ789', '', '3 · Extractora San Miguel',
    '6400', '0043', '2025-03-05', '11:00', '2', '1.5', '0', '0.5', '0', '', '',
    '150 · 2025-03-04 › Lote 2 › Lote 2.1 · 250 gajos · Luis Ardila', '250', '',
  ],
  [
    'V-0460', '2025-03-06', '', CAMION, '',
    '3 · Extractora San Miguel', '9800', '0051', '', '', '', '', '', '', '',
    '', 'Paga por jornal', '', '', '600',
  ],
];
