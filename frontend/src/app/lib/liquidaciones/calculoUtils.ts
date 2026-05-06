import { esFestivo } from '../data/festivosColombianos';

/**
 * CONSTANTES LEGALES 2026
 */
export const SMMLV_2026 = 1750905;
export const AUXILIO_TRANSPORTE_2026 = 249095;
export const TASA_INTERESES_CESANTIAS = 0.12; // 12% anual
export const SALARIO_INTEGRAL_MINIMO = SMMLV_2026 * 13; // Mínimo 13 SMMLV

/**
 * Convierte días calendario a días de año comercial colombiano (360 días/año, 30 días/mes)
 * Usa el método 30/360: cada mes tiene 30 días, cada año tiene 360 días
 */
export function calcularDiasAnioComercial(fechaInicio: Date, fechaFin: Date): number {
  const anioInicio = fechaInicio.getFullYear();
  const mesInicio = fechaInicio.getMonth() + 1;
  let diaInicio = fechaInicio.getDate();

  const anioFin = fechaFin.getFullYear();
  const mesFin = fechaFin.getMonth() + 1;
  let diaFin = fechaFin.getDate();

  // En año comercial, día 31 se trata como día 30
  if (diaInicio === 31) diaInicio = 30;
  if (diaFin === 31) diaFin = 30;

  const diasAnios = (anioFin - anioInicio) * 360;
  const diasMeses = (mesFin - mesInicio) * 30;
  const diasDias = diaFin - diaInicio + 1;

  return diasAnios + diasMeses + diasDias;
}

/**
 * Calcula días hábiles entre dos fechas (excluye domingos y festivos)
 */
export function calcularDiasHabiles(fechaInicio: Date, fechaFin: Date): number {
  let diasHabiles = 0;
  const fechaActual = new Date(fechaInicio);
  
  while (fechaActual <= fechaFin) {
    const diaSemana = fechaActual.getDay();
    
    if (diaSemana !== 0 && !esFestivo(fechaActual)) {
      diasHabiles++;
    }
    
    fechaActual.setDate(fechaActual.getDate() + 1);
  }
  
  return diasHabiles;
}

export function tieneDerechoAuxilioTransporte(salarioBase: number): boolean {
  return salarioBase <= (SMMLV_2026 * 2);
}

export function esSalarioIntegral(salarioBase: number): boolean {
  return salarioBase >= SALARIO_INTEGRAL_MINIMO;
}

export function calcularBaseCesantiasPrima(
  salarioBase: number,
  promedioVariables: number = 0
): number {
  let base = salarioBase + promedioVariables;
  
  if (tieneDerechoAuxilioTransporte(salarioBase)) {
    base += AUXILIO_TRANSPORTE_2026;
  }
  
  return base;
}

export function calcularCesantias(baseSalarial: number, diasTrabajados: number): number {
  return Math.round((baseSalarial * diasTrabajados) / 360);
}

export function calcularInteresesCesantias(valorCesantias: number, diasTrabajados: number): number {
  // Los intereses se calculan al 12% anual, proporcionales a los días trabajados
  // En liquidación final, se calcula para el período actual (máximo 360 días)
  const diasParaInteres = Math.min(diasTrabajados, 360);
  return Math.round(valorCesantias * TASA_INTERESES_CESANTIAS * (diasParaInteres / 360));
}

export function calcularPrima(baseSalarial: number, diasTrabajados: number): number {
  const diasMaximo = Math.min(diasTrabajados, 180);
  return Math.round((baseSalarial * diasMaximo) / 360);
}

export function calcularDiasVacaciones(diasTrabajados: number): number {
  return parseFloat(((diasTrabajados * 15) / 360).toFixed(2));
}

export function calcularValorVacaciones(salarioBase: number, diasHabiles: number): number {
  return Math.round((salarioBase * diasHabiles) / 30);
}

export function formatearMoneda(valor: number): string {
  const valorRedondeado = Math.round(valor);
  if (valorRedondeado < 0) {
    return `-$${Math.abs(valorRedondeado).toLocaleString('es-CO')}`;
  }
  return `$${valorRedondeado.toLocaleString('es-CO')}`;
}

export function calcularDescuentosSeguridadSocial(salario: number): {
  salud: number;
  pension: number;
  total: number;
} {
  const salud = Math.round(salario * 0.04);
  const pension = Math.round(salario * 0.04);

  return {
    salud,
    pension,
    total: salud + pension,
  };
}

export const calcularDeduccionesSeguridadSocial = calcularDescuentosSeguridadSocial;
