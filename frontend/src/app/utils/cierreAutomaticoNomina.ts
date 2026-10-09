/**
 * Qué hacer con el `cierre_automatico` de una liquidación (API_NOMINA §5.3).
 *
 * Desde el 2026-10-09 la nómina se cierra **sola** cuando una liquidación deja
 * cero filas PENDIENTES. El bloque viaja en el 200 de liquidar, re-liquidar y
 * liquidar el acta de un tercero, y dice si cerró o por qué no.
 *
 * Lo importante de leerlo: un cierre bloqueado **no deshace la liquidación**.
 * La fila queda LIQUIDADO y la nómina sigue "En progreso", así que sin este
 * aviso el usuario cree que terminó y la nómina se queda abierta sin que nada
 * se lo diga.
 */
import { toast } from 'sonner';
import type { CierreAutomaticoNomina } from '../../api/nomina';

/** Qué hacer con cada bloqueo, en palabras del usuario. */
const QUE_HACER: Record<string, string> = {
  NOMINA_VALIDACION_COSECHA_REQUERIDA:
    'Confirme la validación de cosecha y luego cierre la nómina.',
  NOMINA_TERCERO_NO_LIQUIDADO:
    'Falta liquidar el acta de un contratista. Hágalo y la nómina se cierra sola.',
  VACACIONES_DESACTUALIZADAS_EN_NOMINA:
    'Vuelva a liquidar los colaboradores con vacaciones; eso reintenta el cierre.',
  NOMINA_CON_PENDIENTES:
    'Todavía quedan colaboradores por liquidar.',
};

/**
 * Muestra el resultado del cierre. Devuelve `true` si la nómina quedó cerrada,
 * para que la pantalla sepa que ya es inmutable y recargue el detalle.
 */
export function avisarCierreAutomatico(cierre?: CierreAutomaticoNomina | null): boolean {
  if (!cierre?.intentado) return false;

  if (cierre.cerrada) {
    const pagadas = cierre.vacaciones_pagadas ?? [];
    toast.success('Nómina finalizada', {
      duration: 8000,
      description: pagadas.length > 0
        ? `Se cerró con la última liquidación y pagó ${pagadas.length} vacación${pagadas.length !== 1 ? 'es' : ''}.`
        : 'Se cerró con la última liquidación y ya no se puede modificar.',
    });
    // El cierre no bloquea por gajos sin despachar: avisa después (§4.4).
    if (cierre.advertencia?.code === 'COSECHA_GAJOS_SIN_DESPACHAR') {
      toast.warning(cierre.advertencia.texto, { duration: 10000 });
    }
    return true;
  }

  toast.warning('La liquidación se guardó, pero la nómina no se cerró', {
    duration: 10000,
    description: (cierre.code && QUE_HACER[cierre.code]) ?? cierre.message ?? undefined,
  });
  return false;
}

/**
 * ¿Esta liquidación va a cerrar la nómina? Se pregunta **antes** de enviar,
 * porque después no hay vuelta atrás: no existe reabrir.
 */
export function esLaUltimaPendiente(
  totalColaboradores: number,
  liquidados: number,
  yaEstabaLiquidado: boolean,
): boolean {
  if (totalColaboradores === 0) return false;
  // Re-liquidar una fila ya liquidada no baja el contador de pendientes.
  const pendientesDespues = totalColaboradores - liquidados - (yaEstabaLiquidado ? 0 : 1);
  return pendientesDespues <= 0;
}
