/**
 * Lo que impide liquidar a este colaborador (API_NOMINA §5.1, PR-N8).
 *
 * No es una advertencia más. Las de `advertencias[]` explican una cifra y
 * dejan seguir; esto es un 409 anticipado: con la lista no vacía el backend
 * rechaza el POST y no persiste nada.
 *
 * Por eso el banner no se limita a avisar: trae el enlace a la acción que lo
 * resuelve. El liquidador no tiene que ir a buscar la ausencia al módulo de
 * Novedades para poder seguir con su quincena.
 */
import { Link } from 'react-router';
import { Ban } from 'lucide-react';
import { Button } from '../ui/button';
import type {
  AusenciaBloqueante,
  BloqueoLiquidacion,
  VacacionBloqueante,
} from '../../../api/nomina';
import { formatFecha } from '../../utils/fecha';

/** Un rango de un solo día se lee mejor sin repetir la fecha. */
function rango(desde: string, hasta: string): string {
  const inicio = formatFecha(desde);
  return desde === hasta ? inicio : `${inicio} a ${formatFecha(hasta)}`;
}

function FilaAusencia({ ausencia }: { ausencia: AusenciaBloqueante }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-background/60 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {ausencia.motivo?.nombre ?? ausencia.tipo}
        </p>
        <p className="text-xs text-muted-foreground">
          {rango(ausencia.fecha_inicio, ausencia.fecha_fin)}
          {' · '}
          {ausencia.dias_en_periodo} día{ausencia.dias_en_periodo === 1 ? '' : 's'} en el período
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={`/novedades?novedad=${ausencia.id}&fuente=AUSENCIA`}>
          Revisar la novedad
        </Link>
      </Button>
    </div>
  );
}

function FilaVacacion({ vacacion }: { vacacion: VacacionBloqueante }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-background/60 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          Solicitud de vacaciones {vacacion.numero_comprobante}
        </p>
        <p className="text-xs text-muted-foreground">
          {rango(vacacion.fecha_inicio, vacacion.fecha_fin)}
          {' · '}
          {vacacion.dias_en_periodo} día{vacacion.dias_en_periodo === 1 ? '' : 's'} en el período
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/liquidaciones?tab=vacaciones">Liquidar o rechazar</Link>
      </Button>
    </div>
  );
}

function Bloqueo({ bloqueo }: { bloqueo: BloqueoLiquidacion }) {
  const ausencias = bloqueo.ausencias ?? [];
  const vacaciones = bloqueo.vacaciones ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-destructive">
        {bloqueo.mensaje ?? bloqueo.message ?? bloqueo.code}
      </p>
      {ausencias.map((a) => (
        <FilaAusencia key={`a-${a.id}`} ausencia={a} />
      ))}
      {vacaciones.map((v) => (
        <FilaVacacion key={`v-${v.id}`} vacacion={v} />
      ))}
    </div>
  );
}

export function BloqueosLiquidacion({ bloqueos }: { bloqueos?: BloqueoLiquidacion[] }) {
  if (!bloqueos || bloqueos.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">No se puede liquidar todavía</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Una novedad sin aprobar no entra al cálculo, y ese día se pagaría como falta
            injustificada. Decídala y vuelva a esta pantalla.
          </p>
        </div>
      </div>
      {bloqueos.map((b, i) => (
        <Bloqueo key={`${b.code}-${i}`} bloqueo={b} />
      ))}
    </div>
  );
}
