/**
 * Las advertencias de todo el cargue, las que no son de un período ni de una
 * fila.
 *
 * La que pide acción es `PERIODO_CON_PERSONAL_SIN_NOMINA`: hay gente con
 * contrato vigente que no viene en el archivo y a la que nada explica por qué
 * no se le pagó. Su período quedaría en blanco, y eso baja en silencio la base
 * de sus cesantías y su prima.
 */
import { AlertTriangle, Info } from 'lucide-react';
import type { IncidenciaFila } from '../../../../api/historicoComun';
import { ADVERTENCIA_NOMINA_LABEL } from '../../../../api/importarNominas';

const GRAVES = ['PERIODO_CON_PERSONAL_SIN_NOMINA'];

function Aviso({ aviso, grave }: { aviso: IncidenciaFila; grave: boolean }) {
  const Icono = grave ? AlertTriangle : Info;
  const tono = grave
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
    : 'border-border bg-muted/30 text-muted-foreground';

  return (
    <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tono}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{aviso.mensaje || ADVERTENCIA_NOMINA_LABEL[aviso.code] || aviso.code}</span>
    </p>
  );
}

export function AvisosCargueNominas({ avisos }: { avisos: IncidenciaFila[] }) {
  if (!avisos || avisos.length === 0) return null;

  return (
    <div className="space-y-2">
      {avisos.map((aviso, i) => (
        <Aviso key={`${aviso.code}-${i}`} aviso={aviso} grave={GRAVES.includes(aviso.code)} />
      ))}
    </div>
  );
}
