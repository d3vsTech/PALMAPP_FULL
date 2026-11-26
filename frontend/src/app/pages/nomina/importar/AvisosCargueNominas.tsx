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
  const tono = grave ? 'bg-warning-soft' : 'bg-info-soft';

  return (
    <div className={`flex gap-2 rounded-lg p-3 ${tono}`}>
      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${grave ? 'text-warning' : 'text-info'}`} strokeWidth={2} />
      <p className="text-sm text-foreground">
        {aviso.mensaje || ADVERTENCIA_NOMINA_LABEL[aviso.code] || aviso.code}
      </p>
    </div>
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
