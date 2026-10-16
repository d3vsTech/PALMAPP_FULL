/**
 * Qué va en cada celda de la plantilla de nóminas, igual que la hoja
 * "Columnas" que trae el archivo (`PlantillaNominas::AYUDA_COLUMNAS`).
 * Fuente: API_NOMINA §16.
 *
 * Está en la pantalla porque el usuario llena el Excel fuera de la aplicación.
 * Si para saber si el devengado lleva el auxilio tiene que ir a buscar la
 * documentación, no la busca: lo suma. La hoja de la plantilla y este panel
 * dicen lo mismo a propósito.
 */

/** Los tipos de dato que reconoce el lector, como los nombra la plantilla. */
export type TipoColumna = 'cédula' | 'fecha' | 'entero' | 'valor' | 'decimal' | 'texto' | 'lista';

export interface AyudaColumna {
  columna: string;
  obligatoria: boolean;
  tipo: TipoColumna;
  queVa: string;
  ejemplo: string;
}

/** Cómo se escribe cada tipo en el archivo. */
export const AYUDA_TIPOS: Array<{ tipo: TipoColumna; comoSeEscribe: string }> = [
  {
    tipo: 'cédula',
    comoSeEscribe:
      'Texto, sin puntos ni guiones. La columna ya viene formateada como texto para que Excel no la vuelva 1,09E+09.',
  },
  {
    tipo: 'fecha',
    comoSeEscribe: 'Celda de fecha, 2025-03-01 o 01/03/2025. Nunca futura.',
  },
  { tipo: 'entero', comoSeEscribe: 'Un número sin decimales.' },
  {
    tipo: 'valor',
    comoSeEscribe:
      'Pesos, sin el signo y sin negativos. Valen 711750, 711.750, 711.750,50 y 711750.50.',
  },
  {
    tipo: 'decimal',
    comoSeEscribe:
      'Hasta cuatro decimales. En CSV use uno, dos o cuatro: con tres se lee como separador de miles.',
  },
  { tipo: 'texto', comoSeEscribe: 'Texto libre. Lo que pase de 255 caracteres se recorta.' },
  { tipo: 'lista', comoSeEscribe: 'Se elige de la lista desplegable de la celda.' },
];

export const AYUDA_COLUMNAS: AyudaColumna[] = [
  {
    columna: 'documento',
    obligatoria: true,
    tipo: 'cédula',
    queVa: 'La cédula tal como está en la ficha. Los retirados y los inactivos se cargan igual.',
    ejemplo: '1098765432',
  },
  {
    columna: 'nombres',
    obligatoria: false,
    tipo: 'texto',
    queVa: 'Informativo: el cruce es por la cédula.',
    ejemplo: 'Carlos',
  },
  {
    columna: 'apellidos',
    obligatoria: false,
    tipo: 'texto',
    queVa: 'Informativo: si no se parece al de la ficha, avisa.',
    ejemplo: 'Martínez',
  },
  {
    columna: 'fecha_inicio',
    obligatoria: true,
    tipo: 'fecha',
    queVa: 'Primer día del período pagado.',
    ejemplo: '2025-03-01',
  },
  {
    columna: 'fecha_fin',
    obligatoria: true,
    tipo: 'fecha',
    queVa:
      'Último día del período, del mismo año que el inicio. Las filas con estas dos fechas iguales forman una nómina.',
    ejemplo: '2025-03-15',
  },
  {
    columna: 'modalidad',
    obligatoria: false,
    tipo: 'lista',
    queVa: 'FIJO o PRODUCCION. Vacía, toma la de la ficha.',
    ejemplo: 'FIJO',
  },
  {
    columna: 'dias_trabajados',
    obligatoria: false,
    tipo: 'entero',
    queVa: 'Días pagados. Vacío, pone los del período.',
    ejemplo: '15',
  },
  {
    columna: 'salario_contractual',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'El salario mensual del contrato en esa época. Conviene traerlo en los fijos.',
    ejemplo: '1423500',
  },
  {
    columna: 'sueldo',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Sueldo básico del período, en los fijos.',
    ejemplo: '711750',
  },
  {
    columna: 'jornales',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Jornales o labores a destajo, en producción.',
    ejemplo: '320000',
  },
  {
    columna: 'cosecha',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Valor pagado por cosecha, en producción.',
    ejemplo: '500172',
  },
  {
    columna: 'gajos',
    obligatoria: false,
    tipo: 'decimal',
    queVa: 'Gajos pagados. No suma a nada: queda como registro y sale en el desprendible.',
    ejemplo: '820',
  },
  {
    columna: 'promedio_kg_gajo',
    obligatoria: false,
    tipo: 'decimal',
    queVa: 'Kilos por gajo con que se pagó la cosecha. Fuera de 3 a 60, avisa.',
    ejemplo: '14,5230',
  },
  {
    columna: 'complemento_smlv',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Lo que se agregó para llegar al mínimo.',
    ejemplo: '0',
  },
  {
    columna: 'dominicales_festivos',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Descanso dominical y festivos pagados.',
    ejemplo: '60000',
  },
  {
    columna: 'recargo_dominical',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Recargo por haber trabajado un domingo o un festivo.',
    ejemplo: '20000',
  },
  {
    columna: 'horas_extra',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Horas extra pagadas.',
    ejemplo: '45000',
  },
  {
    columna: 'recargos',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Recargos pagados, el nocturno incluido.',
    ejemplo: '25000',
  },
  {
    columna: 'recargo_nocturno',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'La parte de los recargos que es nocturna de jornada ordinaria.',
    ejemplo: '10000',
  },
  {
    columna: 'incapacidades',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Auxilio de incapacidad de la EPS o la ARL, que no es salario.',
    ejemplo: '126535',
  },
  {
    columna: 'devengado_total',
    obligatoria: true,
    tipo: 'valor',
    queVa:
      'El total devengado, sin el auxilio ni las bonificaciones. Si traes el desglose, debe ser su suma.',
    ejemplo: '880172',
  },
  {
    columna: 'auxilio_transporte',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Auxilio de transporte pagado.',
    ejemplo: '100000',
  },
  {
    columna: 'bonificaciones',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Bonificaciones. Quedan fuera de la base de las prestaciones.',
    ejemplo: '50000',
  },
  {
    columna: 'detalle_bonificaciones',
    obligatoria: false,
    tipo: 'texto',
    queVa: 'Por qué se dio la bonificación.',
    ejemplo: 'Bono de cosecha',
  },
  {
    columna: 'salud',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Descuento de salud.',
    ejemplo: '35207',
  },
  {
    columna: 'pension',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Descuento de pensión.',
    ejemplo: '35207',
  },
  {
    columna: 'fondo_solidaridad',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Descuento del fondo de solidaridad pensional.',
    ejemplo: '0',
  },
  {
    columna: 'prestamos',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Descuento por préstamos o adelantos. Queda como concepto, sin tocar las cuotas.',
    ejemplo: '50000',
  },
  {
    columna: 'otras_deducciones',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Los demás descuentos.',
    ejemplo: '30000',
  },
  {
    columna: 'detalle_otras_deducciones',
    obligatoria: false,
    tipo: 'texto',
    queVa: 'Por qué se hizo ese descuento.',
    ejemplo: 'Dotación',
  },
  {
    columna: 'neto',
    obligatoria: false,
    tipo: 'valor',
    queVa: 'Lo que se le pagó. Si viene, manda sobre la suma, y si no cuadra avisa.',
    ejemplo: '909758',
  },
  {
    columna: 'fecha_pago',
    obligatoria: false,
    tipo: 'fecha',
    queVa: 'El día del pago, no futuro. Vacía, toma la fecha final del período.',
    ejemplo: '2025-03-16',
  },
];
