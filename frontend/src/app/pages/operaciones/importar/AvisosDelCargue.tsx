/**
 * Las advertencias de todo el cargue, las que no son de una fila concreta.
 *
 * La que decide algo es `NOMINA_ABIERTA_EN_RANGO`: esas fechas caen en una
 * nómina sin cerrar, así que esa liquidación pagaría lo que se está cargando.
 * Se pinta distinto de las demás porque no es informativa: va a bloquear el
 * cargue si el estado final es APROBADA.
 */
import { AlertTriangle, Info } from 'lucide-react';
import type { IncidenciaFila } from '../../../../api/historicoComun';
import { ADVERTENCIA_OPERACION_LABEL } from '../../../../api/importarOperaciones';

const CODIGO_NOMINA_ABIERTA = 'NOMINA_ABIERTA_EN_RANGO';

function Aviso({ aviso, grave }: { aviso: IncidenciaFila; grave: boolean }) {
  const Icono = grave ? AlertTriangle : Info;
  const tono = grave
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
    : 'border-border bg-muted/30 text-muted-foreground';

  return (
    <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tono}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{aviso.mensaje || ADVERTENCIA_OPERACION_LABEL[aviso.code] || aviso.code}</span>
    </p>
  );
}

export function AvisosDelCargue({ avisos }: { avisos: IncidenciaFila[] }) {
  if (!avisos || avisos.length === 0) return null;

  return (
    <div className="space-y-2">
      {avisos.map((aviso, i) => (
        <Aviso
          key={`${aviso.code}-${i}`}
          aviso={aviso}
          grave={aviso.code === CODIGO_NOMINA_ABIERTA}
        />
      ))}
    </div>
  );
}
