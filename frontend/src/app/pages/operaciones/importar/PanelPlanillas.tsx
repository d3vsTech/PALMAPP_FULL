/**
 * Las planillas que el cargue va a crear o a tocar, con el estado en el que
 * quedará cada una.
 *
 * Es el bloque que más importa de toda la pantalla y el que el usuario suele
 * pasar por alto: una planilla aprobada entra derecho al cálculo de nómina, y
 * a quien no aparezca en ella se le descuenta el día y el dominical de esa
 * semana. Por eso el estado va con color y no como texto gris.
 */
import { Badge } from '../../../components/ui/badge';
import { CalendarDays } from 'lucide-react';
import type { PlanillaDelCargue } from '../../../../api/importarOperaciones';
import { formatFecha } from '../../../utils/fecha';

function BadgeEstado({ planilla }: { planilla: PlanillaDelCargue }) {
  if (!planilla.nueva && planilla.estado === 'BORRADOR') {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        Sigue en borrador
      </Badge>
    );
  }
  if (planilla.estado_final === 'APROBADA') {
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
        Quedará aprobada
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      Quedará en borrador
    </Badge>
  );
}

function FilaPlanilla({ planilla }: { planilla: PlanillaDelCargue }) {
  const faltantes = planilla.faltantes?.colaboradores_faltantes.length ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border/60 p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{formatFecha(planilla.fecha)}</p>
          <p className="text-xs text-muted-foreground">
            {planilla.nueva ? 'Planilla nueva' : `Ya existía (#${planilla.operacion_id})`}
            {' · '}
            {planilla.filas} fila{planilla.filas === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {faltantes > 0 && (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {faltantes} sin registrar
          </span>
        )}
        <BadgeEstado planilla={planilla} />
      </div>
    </div>
  );
}

export function PanelPlanillas({ planillas }: { planillas: PlanillaDelCargue[] }) {
  if (planillas.length === 0) return null;

  return (
    <div className="space-y-2">
      {planillas.map((p) => (
        <FilaPlanilla key={p.fecha} planilla={p} />
      ))}
    </div>
  );
}
