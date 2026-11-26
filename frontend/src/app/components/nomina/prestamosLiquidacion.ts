/**
 * Reglas del bloque de préstamos del editor de liquidación
 * (ENTREGA_FRONT_PRESTAMO_APLICADO_POR_DEFECTO.md, 2026-11-19).
 *
 * Aquí vive solo lo que no depende de React: la etiqueta del período de una
 * cuota, el concepto bajo el que entra el descuento y las filas que el editor
 * debe traer ya aplicadas al abrir. La pantalla las usa; no las recalcula.
 */
import type {
  NominaConcepto,
  PrestamoCuotaPendiente,
  PrestamoVigentePreview,
} from '../../../api/nomina';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * "2ª quincena de octubre de 2026" para una cuota quincenal, "octubre de
 * 2026" para una mensual. Cadena vacía si el backend no manda el período
 * (contrato anterior a 2026-11-19), y entonces la UI no pinta la línea.
 */
export function etiquetaPeriodoCuota(
  anio?: number | null,
  mes?: number | null,
  quincena?: number | null,
): string {
  if (!anio || !mes || mes < 1 || mes > 12) return '';
  const periodo = `${MESES[mes - 1]} de ${anio}`;
  if (quincena === 1 || quincena === 2) {
    return `${quincena}ª quincena de ${periodo}`;
  }
  return periodo;
}

/**
 * El concepto bajo el que entra un descuento de préstamo: el de subtipo
 * PRESTAMO (`DCTO_ADELANTO` sembrado por defecto) o, si el tenant no lo
 * tiene, el primer concepto de deducción voluntaria del catálogo.
 *
 * `null` con el catálogo vacío. El backend exige `concepto_id` en cada
 * deducción voluntaria, así que sin concepto no se puede proponer nada.
 */
export function conceptoParaPrestamo(
  lista: NominaConcepto[],
): NominaConcepto | null {
  const propio = lista.find(
    (c) => c.subtipo === 'PRESTAMO' || c.codigo === 'DCTO_ADELANTO',
  );
  return propio ?? lista[0] ?? null;
}

/** La observación que viaja al backend y luego sale en el desprendible. */
export function observacionCuota(cuota: PrestamoCuotaPendiente): string {
  const base = `Cuota ${cuota.numero_cuota}/${cuota.total_cuotas} - ${cuota.concepto}`;
  return cuota.atrasada ? `${base} (atrasada)` : base;
}

/** La observación del renglón que descuenta el saldo completo. */
export function observacionSaldo(p: PrestamoVigentePreview): string {
  return `Saldo del préstamo - ${p.concepto}`;
}

/**
 * Una fila del payload que el editor arma. Es el mismo shape que
 * `deducciones_voluntarias[]` más la marca de qué préstamo la originó.
 */
export interface FilaPrestamo {
  concepto_id: number;
  valor: number;
  observacion: string;
  prestamo_cuota_id?: number;
  prestamo_id?: number;
  saldar?: boolean;
}

/**
 * Las filas con las que el editor abre: las cuotas que el preview marca con
 * `aplicar_por_defecto` y los saldos que esta misma fila ya descontó.
 *
 * `aplicar_por_defecto` ausente se trata como `true` solo si la cuota viene
 * listada y el preview no dice nada (backend anterior al contrato): listar
 * una cuota siempre quiso decir "esta se puede descontar en este período".
 */
export function filasPorDefecto(
  cuotas: PrestamoCuotaPendiente[],
  vigentes: PrestamoVigentePreview[],
  concepto: NominaConcepto | null,
): FilaPrestamo[] {
  if (!concepto) return [];

  const saldados = new Set(
    vigentes
      .filter((p) => p.saldado_en_esta_liquidacion)
      .map((p) => p.prestamo_id),
  );

  const filas: FilaPrestamo[] = [];

  for (const c of cuotas) {
    // El saldo ya incluye todas las cuotas del préstamo: mandar las dos cosas
    // responde 422.
    if (saldados.has(c.prestamo_id)) continue;
    if (c.aplicar_por_defecto === false) continue;
    filas.push({
      concepto_id: concepto.id,
      valor: c.monto,
      observacion: observacionCuota(c),
      prestamo_cuota_id: c.prestamo_cuota_id,
    });
  }

  for (const p of vigentes) {
    if (!p.saldado_en_esta_liquidacion || p.saldo_pendiente <= 0) continue;
    filas.push({
      concepto_id: concepto.id,
      valor: p.saldo_pendiente,
      observacion: observacionSaldo(p),
      prestamo_id: p.prestamo_id,
      saldar: true,
    });
  }

  return filas;
}

/** Un préstamo con sus cuotas del período y su saldo, para pintarlo junto. */
export interface GrupoPrestamo {
  prestamo_id: number;
  concepto: string;
  /** `null` si el préstamo no viene en `prestamos_vigentes` (ya está PAGADO). */
  vigente: PrestamoVigentePreview | null;
  /** Cuotas listadas para este período: las atrasadas primero, como llegan. */
  cuotas: PrestamoCuotaPendiente[];
}

/**
 * Junta cada préstamo con sus cuotas. El preview los manda por separado
 * porque son dos decisiones distintas, pero en pantalla son un solo
 * préstamo: tres filas para una deuda se leen como tres deudas.
 */
export function agruparPrestamos(
  cuotas: PrestamoCuotaPendiente[],
  vigentes: PrestamoVigentePreview[],
): GrupoPrestamo[] {
  const grupos = new Map<number, GrupoPrestamo>();

  for (const p of vigentes) {
    grupos.set(p.prestamo_id, {
      prestamo_id: p.prestamo_id,
      concepto: p.concepto,
      vigente: p,
      cuotas: [],
    });
  }

  for (const c of cuotas) {
    const grupo = grupos.get(c.prestamo_id);
    if (grupo) {
      grupo.cuotas.push(c);
      continue;
    }
    // Una cuota sin su préstamo en `prestamos_vigentes` igual se tiene que
    // poder descontar: sin esto desaparecería de la pantalla.
    grupos.set(c.prestamo_id, {
      prestamo_id: c.prestamo_id,
      concepto: c.concepto,
      vigente: null,
      cuotas: [c],
    });
  }

  return [...grupos.values()];
}
