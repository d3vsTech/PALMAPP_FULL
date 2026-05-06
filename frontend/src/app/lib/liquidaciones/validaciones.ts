import { SMMLV_2026, AUXILIO_TRANSPORTE_2026 } from './calculoUtils';

/**
 * VALIDACIONES PARA MÓDULO DE LIQUIDACIONES
 * Incluye validaciones legales y de negocio para todos los tipos de liquidación
 */

// Tipos de error
export interface ErrorValidacion {
  campo: string;
  mensaje: string;
  tipo: 'ERROR' | 'ADVERTENCIA';
}

/**
 * Valida que un salario cumpla con el SMMLV
 */
export function validarSalarioMinimo(salario: number): ErrorValidacion | null {
  if (salario < SMMLV_2026) {
    return {
      campo: 'salarioBasico',
      mensaje: `El salario no puede ser inferior al SMMLV 2026 (${formatearMoneda(SMMLV_2026)})`,
      tipo: 'ERROR',
    };
  }
  return null;
}

/**
 * Valida el derecho a auxilio de transporte
 */
export function validarAuxilioTransporte(salario: number, auxilioTransporte: number): ErrorValidacion | null {
  // Solo tienen derecho quienes ganan hasta 2 SMMLV
  const tieneDerecho = salario <= SMMLV_2026 * 2;

  if (!tieneDerecho && auxilioTransporte > 0) {
    return {
      campo: 'auxilioTransporte',
      mensaje: 'El colaborador no tiene derecho a auxilio de transporte (salario superior a 2 SMMLV)',
      tipo: 'ADVERTENCIA',
    };
  }

  if (tieneDerecho && auxilioTransporte !== AUXILIO_TRANSPORTE_2026) {
    return {
      campo: 'auxilioTransporte',
      mensaje: `El auxilio de transporte debe ser ${formatearMoneda(AUXILIO_TRANSPORTE_2026)}`,
      tipo: 'ADVERTENCIA',
    };
  }

  return null;
}

/**
 * Valida fechas de ingreso y retiro
 */
export function validarFechas(fechaIngreso: string, fechaRetiro?: string): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();

  // Validar que fecha de ingreso no sea futura
  if (ingreso > hoy) {
    errores.push({
      campo: 'fechaIngreso',
      mensaje: 'La fecha de ingreso no puede ser futura',
      tipo: 'ERROR',
    });
  }

  // Validar fecha de retiro si existe
  if (fechaRetiro) {
    const retiro = new Date(fechaRetiro);

    if (retiro < ingreso) {
      errores.push({
        campo: 'fechaRetiro',
        mensaje: 'La fecha de retiro no puede ser anterior a la fecha de ingreso',
        tipo: 'ERROR',
      });
    }

    if (retiro > hoy) {
      errores.push({
        campo: 'fechaRetiro',
        mensaje: 'La fecha de retiro no puede ser futura',
        tipo: 'ADVERTENCIA',
      });
    }
  }

  return errores;
}

/**
 * Valida período de cesantías
 */
export function validarPeriodoCesantias(periodoInicio: string, periodoFin: string): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const inicio = new Date(periodoInicio);
  const fin = new Date(periodoFin);

  if (fin <= inicio) {
    errores.push({
      campo: 'periodo',
      mensaje: 'La fecha fin debe ser posterior a la fecha inicio',
      tipo: 'ERROR',
    });
  }

  // Advertir si el período es mayor a 1 año
  const diasDiferencia = Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDiferencia > 366) {
    errores.push({
      campo: 'periodo',
      mensaje: 'El período de cesantías supera un año, verifique las fechas',
      tipo: 'ADVERTENCIA',
    });
  }

  return errores;
}

/**
 * Valida fecha límite de consignación de cesantías (14 de febrero)
 */
export function validarFechaLimiteCesantias(fechaConsignacion?: string): ErrorValidacion | null {
  if (!fechaConsignacion) return null;

  const consignacion = new Date(fechaConsignacion);
  const año = consignacion.getFullYear();
  const fechaLimite = new Date(año, 1, 14); // 14 de febrero

  if (consignacion > fechaLimite) {
    const diasRetraso = Math.floor((consignacion.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));
    return {
      campo: 'fechaConsignacion',
      mensaje: `Consignación tardía: ${diasRetraso} días de retraso. Se debe calcular sanción moratoria`,
      tipo: 'ADVERTENCIA',
    };
  }

  return null;
}

/**
 * Valida fecha límite de pago de intereses (31 de enero)
 */
export function validarFechaLimiteIntereses(fechaPago?: string): ErrorValidacion | null {
  if (!fechaPago) return null;

  const pago = new Date(fechaPago);
  const año = pago.getFullYear();
  const fechaLimite = new Date(año, 0, 31); // 31 de enero

  if (pago > fechaLimite) {
    const diasRetraso = Math.floor((pago.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));
    return {
      campo: 'fechaPago',
      mensaje: `Pago tardío: ${diasRetraso} días de retraso`,
      tipo: 'ADVERTENCIA',
    };
  }

  return null;
}

/**
 * Valida fecha límite de pago de prima
 */
export function validarFechaLimitePrima(
  semestre: 'PRIMER_SEMESTRE' | 'SEGUNDO_SEMESTRE',
  fechaPago?: string
): ErrorValidacion | null {
  if (!fechaPago) return null;

  const pago = new Date(fechaPago);
  const año = pago.getFullYear();

  // Fecha límite según semestre
  const fechaLimite = semestre === 'PRIMER_SEMESTRE'
    ? new Date(año, 5, 30) // 30 de junio
    : new Date(año, 11, 20); // 20 de diciembre

  if (pago > fechaLimite) {
    const diasRetraso = Math.floor((pago.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));
    return {
      campo: 'fechaPago',
      mensaje: `Pago tardío: ${diasRetraso} días de retraso`,
      tipo: 'ADVERTENCIA',
    };
  }

  return null;
}

/**
 * Valida días de vacaciones causados
 */
export function validarDiasVacaciones(
  diasCausados: number,
  diasDisfrutados: number,
  diasCompensados: number
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (diasCausados < 0) {
    errores.push({
      campo: 'diasCausados',
      mensaje: 'Los días causados no pueden ser negativos',
      tipo: 'ERROR',
    });
  }

  if (diasDisfrutados < 0) {
    errores.push({
      campo: 'diasDisfrutados',
      mensaje: 'Los días disfrutados no pueden ser negativos',
      tipo: 'ERROR',
    });
  }

  if (diasCompensados < 0) {
    errores.push({
      campo: 'diasCompensados',
      mensaje: 'Los días compensados no pueden ser negativos',
      tipo: 'ERROR',
    });
  }

  const diasUsados = diasDisfrutados + diasCompensados;
  if (diasUsados > diasCausados) {
    errores.push({
      campo: 'diasVacaciones',
      mensaje: 'Los días disfrutados/compensados no pueden superar los días causados',
      tipo: 'ERROR',
    });
  }

  // Advertir si acumula más de 2 períodos (30 días)
  const diasPendientes = diasCausados - diasUsados;
  if (diasPendientes > 30) {
    errores.push({
      campo: 'diasPendientes',
      mensaje: 'El colaborador tiene acumulados más de 2 períodos de vacaciones (máximo legal)',
      tipo: 'ADVERTENCIA',
    });
  }

  return errores;
}

/**
 * Valida compensación de vacaciones en dinero
 */
export function validarCompensacionVacaciones(
  diasCompensados: number,
  tieneRetiro: boolean
): ErrorValidacion | null {
  // Solo se pueden compensar vacaciones en caso de retiro
  if (diasCompensados > 0 && !tieneRetiro) {
    return {
      campo: 'diasCompensados',
      mensaje: 'Las vacaciones solo pueden compensarse en dinero en caso de terminación de contrato',
      tipo: 'ADVERTENCIA',
    };
  }

  return null;
}

/**
 * Valida indemnización según tipo de contrato y causa de terminación
 */
export function validarIndemnizacion(
  tipoContrato: 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR',
  causaTerminacion: string,
  indemnizacion: number,
  salarioMensual: number,
  tiempoServicioDias: number
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Casos donde NO hay indemnización
  const sinIndemnizacion = [
    'RENUNCIA',
    'DESPIDO_JUSTA_CAUSA',
    'MUTUO_ACUERDO',
  ];

  if (sinIndemnizacion.includes(causaTerminacion) && indemnizacion > 0) {
    errores.push({
      campo: 'indemnizacion',
      mensaje: `No corresponde indemnización en caso de ${causaTerminacion.replace(/_/g, ' ').toLowerCase()}`,
      tipo: 'ADVERTENCIA',
    });
  }

  // Validar indemnización por despido sin justa causa
  if (causaTerminacion === 'DESPIDO_SIN_JUSTA_CAUSA' && tipoContrato === 'INDEFINIDO') {
    const añosServicio = tiempoServicioDias / 360;
    let indemnizacionMinima = 0;

    if (añosServicio < 1) {
      // Menos de 1 año: 30 días de salario
      indemnizacionMinima = salarioMensual;
    } else if (añosServicio < 10) {
      // 1 a 10 años: 30 días por año
      indemnizacionMinima = salarioMensual * Math.ceil(añosServicio);
    } else {
      // Más de 10 años: 30 días por año + 20 días adicionales por cada año después del 10
      const añosBase = 10 * salarioMensual;
      const añosAdicionales = (Math.ceil(añosServicio) - 10) * (salarioMensual * 20/30);
      indemnizacionMinima = añosBase + añosAdicionales;
    }

    if (indemnizacion < indemnizacionMinima * 0.9) { // Tolerancia del 10%
      errores.push({
        campo: 'indemnizacion',
        mensaje: `La indemnización parece baja. Mínimo sugerido: ${formatearMoneda(indemnizacionMinima)}`,
        tipo: 'ADVERTENCIA',
      });
    }
  }

  // Validar indemnización contrato fijo
  if (causaTerminacion === 'DESPIDO_SIN_JUSTA_CAUSA' && tipoContrato === 'FIJO') {
    errores.push({
      campo: 'indemnizacion',
      mensaje: 'En contrato a término fijo debe indemnizarse el tiempo faltante hasta la finalización del contrato',
      tipo: 'ADVERTENCIA',
    });
  }

  return errores;
}

/**
 * Valida montos negativos
 */
export function validarMontosPositivos(valores: { [campo: string]: number }): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  Object.entries(valores).forEach(([campo, valor]) => {
    if (valor < 0) {
      errores.push({
        campo,
        mensaje: `El valor no puede ser negativo`,
        tipo: 'ERROR',
      });
    }
  });

  return errores;
}

/**
 * Valida coherencia entre devengado, deducciones y neto
 */
export function validarCoherenciaLiquidacion(
  totalDevengado: number,
  totalDeducciones: number,
  netoAPagar: number
): ErrorValidacion | null {
  const netoCalculado = totalDevengado - totalDeducciones;
  const diferencia = Math.abs(netoCalculado - netoAPagar);

  // Tolerancia de 1 peso por redondeos
  if (diferencia > 1) {
    return {
      campo: 'netoAPagar',
      mensaje: `El neto a pagar no coincide con devengado - deducciones. Esperado: ${formatearMoneda(netoCalculado)}`,
      tipo: 'ERROR',
    };
  }

  return null;
}

// Helper para formatear moneda
function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Ejecuta todas las validaciones para una liquidación de cesantías
 */
export function validarCesantias(data: {
  salarioBasico: number;
  auxilioTransporte: number;
  fechaIngreso: string;
  periodoInicio: string;
  periodoFin: string;
  fechaConsignacion?: string;
  cesantiasCalculadas: number;
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Validar salario mínimo
  const errorSalario = validarSalarioMinimo(data.salarioBasico);
  if (errorSalario) errores.push(errorSalario);

  // Validar auxilio de transporte
  const errorAuxilio = validarAuxilioTransporte(data.salarioBasico, data.auxilioTransporte);
  if (errorAuxilio) errores.push(errorAuxilio);

  // Validar fechas
  errores.push(...validarFechas(data.fechaIngreso));
  errores.push(...validarPeriodoCesantias(data.periodoInicio, data.periodoFin));

  // Validar fecha límite de consignación
  const errorFechaLimite = validarFechaLimiteCesantias(data.fechaConsignacion);
  if (errorFechaLimite) errores.push(errorFechaLimite);

  // Validar monto positivo
  errores.push(...validarMontosPositivos({ cesantias: data.cesantiasCalculadas }));

  return errores;
}

/**
 * Ejecuta todas las validaciones para intereses sobre cesantías
 */
export function validarIntereses(data: {
  saldoCesantias: number;
  interesesCalculados: number;
  fechaPago?: string;
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Validar montos positivos
  errores.push(...validarMontosPositivos({
    saldoCesantias: data.saldoCesantias,
    intereses: data.interesesCalculados,
  }));

  // Validar fecha límite de pago
  const errorFechaLimite = validarFechaLimiteIntereses(data.fechaPago);
  if (errorFechaLimite) errores.push(errorFechaLimite);

  return errores;
}

/**
 * Ejecuta todas las validaciones para prima de servicios
 */
export function validarPrima(data: {
  salarioBasico: number;
  auxilioTransporte: number;
  semestre: 'PRIMER_SEMESTRE' | 'SEGUNDO_SEMESTRE';
  diasTrabajados: number;
  primaCalculada: number;
  fechaPago?: string;
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Validar salario mínimo
  const errorSalario = validarSalarioMinimo(data.salarioBasico);
  if (errorSalario) errores.push(errorSalario);

  // Validar auxilio de transporte
  const errorAuxilio = validarAuxilioTransporte(data.salarioBasico, data.auxilioTransporte);
  if (errorAuxilio) errores.push(errorAuxilio);

  // Validar días trabajados
  if (data.diasTrabajados < 0 || data.diasTrabajados > 180) {
    errores.push({
      campo: 'diasTrabajados',
      mensaje: 'Los días trabajados deben estar entre 0 y 180',
      tipo: 'ERROR',
    });
  }

  // Validar monto positivo
  errores.push(...validarMontosPositivos({ prima: data.primaCalculada }));

  // Validar fecha límite de pago
  const errorFechaLimite = validarFechaLimitePrima(data.semestre, data.fechaPago);
  if (errorFechaLimite) errores.push(errorFechaLimite);

  return errores;
}

/**
 * Ejecuta todas las validaciones para vacaciones
 */
export function validarVacacionesCompleto(data: {
  salarioBasico: number;
  diasCausados: number;
  diasDisfrutados: number;
  diasCompensados: number;
  fechaRetiro?: string;
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Validar salario mínimo
  const errorSalario = validarSalarioMinimo(data.salarioBasico);
  if (errorSalario) errores.push(errorSalario);

  // Validar días de vacaciones
  errores.push(...validarDiasVacaciones(
    data.diasCausados,
    data.diasDisfrutados,
    data.diasCompensados
  ));

  // Validar compensación
  const errorCompensacion = validarCompensacionVacaciones(
    data.diasCompensados,
    !!data.fechaRetiro
  );
  if (errorCompensacion) errores.push(errorCompensacion);

  return errores;
}

/**
 * Ejecuta todas las validaciones para liquidación final
 */
export function validarLiquidacionFinal(data: {
  salarioBasico: number;
  auxilioTransporte: number;
  fechaIngreso: string;
  fechaRetiro: string;
  tipoContrato: 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR';
  causaTerminacion: string;
  indemnizacion: number;
  totalDevengado: number;
  totalDeducciones: number;
  netoAPagar: number;
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  // Validar salario mínimo
  const errorSalario = validarSalarioMinimo(data.salarioBasico);
  if (errorSalario) errores.push(errorSalario);

  // Validar auxilio de transporte
  const errorAuxilio = validarAuxilioTransporte(data.salarioBasico, data.auxilioTransporte);
  if (errorAuxilio) errores.push(errorAuxilio);

  // Validar fechas
  errores.push(...validarFechas(data.fechaIngreso, data.fechaRetiro));

  // Calcular tiempo de servicio
  const ingreso = new Date(data.fechaIngreso);
  const retiro = new Date(data.fechaRetiro);
  const tiempoServicioDias = Math.floor((retiro.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24));

  // Validar indemnización
  errores.push(...validarIndemnizacion(
    data.tipoContrato,
    data.causaTerminacion,
    data.indemnizacion,
    data.salarioBasico,
    tiempoServicioDias
  ));

  // Validar montos positivos
  errores.push(...validarMontosPositivos({
    totalDevengado: data.totalDevengado,
    totalDeducciones: data.totalDeducciones,
    netoAPagar: data.netoAPagar,
  }));

  // Validar coherencia de cálculos
  const errorCoherencia = validarCoherenciaLiquidacion(
    data.totalDevengado,
    data.totalDeducciones,
    data.netoAPagar
  );
  if (errorCoherencia) errores.push(errorCoherencia);

  return errores;
}
