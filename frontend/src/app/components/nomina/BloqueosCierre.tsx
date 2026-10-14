/**
 * Lo que hoy impediría cerrar la nómina (API_NOMINA §3.6 y §6.1).
 *
 * Los tres bloqueos viejos se explican con una línea de texto. El de PR-N8,
 * `NOMINA_CON_NOVEDADES_PENDIENTES`, no: trae `colaboradores[]` porque la
 * novedad se registró **después** de liquidar su fila, así que aprobarla no
 * basta y hay que volver a liquidar a esa persona. Sin la lista el liquidador
 * lee "hay novedades sin aprobar" y no sabe de quién ni qué hacer.
 */
import { Link } from 'react-router';
import type {
  BloqueoCierre,
  ColaboradorConNovedadesPendientes,
} from '../../../api/nomina';
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
    <li className="rounded-lg border border-destructive/20 bg-background/60 p-2.5">
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

export function BloqueosCierre({ bloqueos }: { bloqueos: BloqueoCierre[] }) {
  if (bloqueos.length === 0) return null;

  return (
    <div className="my-2 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm font-semibold text-destructive">
        {bloqueos.length === 1
          ? 'Hay algo que impide cerrar'
          : `Hay ${bloqueos.length} cosas que impiden cerrar`}
      </p>
      <ul className="mt-2 space-y-2 text-xs text-destructive/90">
        {bloqueos.map((b) => (
          <li key={b.code}>
            <p>{b.mensaje ?? b.message}</p>
            {(b.colaboradores?.length ?? 0) > 0 && (
              <>
                <ul className="mt-2 space-y-2">
                  {b.colaboradores!.map((c) => (
                    <FilaColaborador key={c.nomina_empleado_id} col={c} />
                  ))}
                </ul>
                {/* §6.1 — La fila ya liquidada quedó vieja: aprobar la novedad
                    no la recalcula. */}
                <p className="mt-2 text-destructive/80">
                  Después de decidir cada novedad, vuelva a liquidar a esos colaboradores.
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
