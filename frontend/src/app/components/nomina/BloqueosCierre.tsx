/**
 * Lo que hoy impediría cerrar la nómina (API_NOMINA §3.6 y §6.1).
 *
 * Los tres bloqueos viejos se explican con una línea de texto. Los dos nuevos
 * no, y por motivos distintos:
 *
 * - `NOMINA_CON_NOVEDADES_PENDIENTES` (PR-N8) trae `colaboradores[]` porque la
 *   novedad se registró **después** de liquidar su fila, así que aprobarla no
 *   basta y hay que volver a liquidar a esa persona.
 * - `NOMINA_CON_VACACION_TRABAJADA` (PR-V2) trae la vacación y su fecha de
 *   reintegro sugerida: o el colaborador volvió antes y hay que interrumpirla
 *   (CST art. 188), o la planilla está mal. Es el único bloqueo forzable, y
 *   hay que resolverlo antes de cerrar: después, los días devueltos quedan en
 *   una nómina inmutable y la interrupción ya no es posible.
 */
import { Link } from 'react-router';
import { Ban } from 'lucide-react';
import { Button } from '../ui/button';
import type {
  BloqueoCierre,
  ColaboradorConNovedadesPendientes,
  ColaboradorConVacacionTrabajada,
  VacacionTrabajadaEnNomina,
} from '../../../api/nomina';
import { NominaErrorCodes } from '../../../api/nomina';
import { formatFecha } from '../../utils/fecha';

/** Un rango de un solo día se lee mejor sin repetir la fecha. */
function rango(desde: string, hasta: string): string {
  const inicio = formatFecha(desde);
  return desde === hasta ? inicio : `${inicio} a ${formatFecha(hasta)}`;
}

function FilaColaborador({ col }: { col: ColaboradorConNovedadesPendientes }) {
  const ausencias = col.ausencias ?? [];
  const vacaciones = col.vacaciones ?? [];

  return (
    <li className="rounded-md bg-card p-3">
      <p className="text-sm font-medium text-foreground">{col.nombre_completo}</p>
      <p className="text-xs text-muted-foreground">{col.documento}</p>
      <ul className="mt-1.5 space-y-1">
        {ausencias.map((a) => (
          <li key={`a-${a.id}`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-foreground">{a.motivo?.nombre ?? a.tipo}</span>
            <span className="text-muted-foreground">{rango(a.fecha_inicio, a.fecha_fin)}</span>
            <Link
              to={`/novedades?novedad=${a.id}&fuente=AUSENCIA`}
              className="underline underline-offset-2"
            >
              Revisar
            </Link>
          </li>
        ))}
        {vacaciones.map((v) => (
          <li key={`v-${v.id}`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-foreground">Solicitud {v.numero_comprobante}</span>
            <span className="text-muted-foreground">{rango(v.fecha_inicio, v.fecha_fin)}</span>
            <Link to="/liquidaciones?tab=vacaciones" className="underline underline-offset-2">
              Liquidar o rechazar
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Por qué una vacación no se puede interrumpir, en palabras del liquidador. */
const NO_INTERRUMPIBLE: Record<string, string> = {
  SIN_DISFRUTE: 'Trabajó desde el primer día: lo que corresponde es anularla.',
  YA_INTERRUMPIDA: 'Ya se interrumpió una vez.',
  HISTORICO: 'Es un registro histórico: no se interrumpe.',
  ESTADO: 'Su estado no admite interrupción.',
};

function FilaVacacionTrabajada({
  col,
  onInterrumpir,
}: {
  col: ColaboradorConVacacionTrabajada;
  onInterrumpir?: (v: VacacionTrabajadaEnNomina) => void;
}) {
  return (
    <li className="rounded-md bg-card p-3">
      <p className="text-sm font-medium text-foreground">{col.nombre_completo}</p>
      <p className="text-xs text-muted-foreground">{col.documento}</p>
      <ul className="mt-1.5 space-y-1.5">
        {(col.vacaciones ?? []).map((v) => (
          <li key={`vt-${v.vacacion_id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-foreground">{v.numero_comprobante}</span>
            {v.fecha_desde && v.fecha_hasta && (
              <span className="text-muted-foreground">{rango(v.fecha_desde, v.fecha_hasta)}</span>
            )}
            <span className="text-muted-foreground">
              {(v.fechas?.length ?? 0)} día(s) con trabajo
            </span>
            {v.interrumpible && onInterrumpir ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => onInterrumpir(v)}
                title={v.fecha_reintegro_sugerida
                  ? `La planilla dice que volvió el ${formatFecha(v.fecha_reintegro_sugerida)}`
                  : undefined}
              >
                Interrumpir vacación
              </Button>
            ) : (
              <span className="text-muted-foreground">
                {NO_INTERRUMPIBLE[v.motivo_no_interrumpible ?? ''] ?? 'Revise la planilla.'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function BloqueosCierre({
  bloqueos,
  onInterrumpir,
}: {
  bloqueos: BloqueoCierre[];
  /** PR-V2 — Abre el modal de interrupción con la fecha que sugiere la planilla. */
  onInterrumpir?: (v: VacacionTrabajadaEnNomina) => void;
}) {
  if (bloqueos.length === 0) return null;

  return (
    <div className="flex gap-2 rounded-lg bg-destructive-soft p-3">
      <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
      <div className="min-w-0 flex-1 text-sm text-foreground">
        <p className="font-medium">
          {bloqueos.length === 1
            ? 'Hay algo que impide cerrar'
            : `Hay ${bloqueos.length} cosas que impiden cerrar`}
        </p>
        <ul className="mt-2 space-y-2">
          {bloqueos.map((b) => {
            const esVacacionTrabajada = b.code === NominaErrorCodes.NOMINA_CON_VACACION_TRABAJADA;
            const colaboradores = b.colaboradores ?? [];
            return (
              <li key={b.code}>
                <p>{b.mensaje ?? b.message}</p>
                {colaboradores.length > 0 && (
                  <>
                    <ul className="mt-2 space-y-2">
                      {esVacacionTrabajada
                        ? (colaboradores as ColaboradorConVacacionTrabajada[]).map((c) => (
                          <FilaVacacionTrabajada
                            key={c.nomina_empleado_id}
                            col={c}
                            onInterrumpir={onInterrumpir}
                          />
                        ))
                        : (colaboradores as ColaboradorConNovedadesPendientes[]).map((c) => (
                          <FilaColaborador key={c.nomina_empleado_id} col={c} />
                        ))}
                    </ul>
                    {/* §6.1 — La fila ya liquidada quedó vieja: decidir la novedad
                        o interrumpir la vacación no la recalcula. */}
                    <p className="mt-2 text-muted-foreground">
                      {esVacacionTrabajada
                        ? 'Después de interrumpir la vacación o corregir la planilla, vuelva a liquidar a esos colaboradores.'
                        : 'Después de decidir cada novedad, vuelva a liquidar a esos colaboradores.'}
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
