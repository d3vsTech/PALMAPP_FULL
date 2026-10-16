/**
 * Las advertencias de todo el cargue, las que no son de un viaje ni de una
 * fila concreta.
 *
 * Dos pesan más que las demás y se pintan en ámbar:
 *
 *  - `NOMINA_ABIERTA_EN_RANGO`: esas fechas caen en una nómina sin cerrar, así
 *    que esa liquidación pagaría lo que se está cargando. Va a bloquear el
 *    cargue mientras no se fuerce.
 *  - `NOMINA_LIQUIDADA_EN_RANGO`: ya se pagó sin estos viajes. No bloquea y no
 *    se puede deshacer: lo pagado no cambia, pero los reportes sí.
 */
import { AlertTriangle, Info } from 'lucide-react';
import type { IncidenciaFila } from '../../../../api/historicoComun';
import { ADVERTENCIA_VIAJE_LABEL } from '../../../../api/importarViajes';

const GRAVES = ['NOMINA_ABIERTA_EN_RANGO', 'NOMINA_LIQUIDADA_EN_RANGO'];

function Aviso({ aviso, grave }: { aviso: IncidenciaFila; grave: boolean }) {
  const Icono = grave ? AlertTriangle : Info;
  const tono = grave
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
    : 'border-border bg-muted/30 text-muted-foreground';

  return (
    <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tono}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{aviso.mensaje || ADVERTENCIA_VIAJE_LABEL[aviso.code] || aviso.code}</span>
    </p>
  );
}

export function AvisosCargueViajes({ avisos }: { avisos: IncidenciaFila[] }) {
  if (!avisos || avisos.length === 0) return null;

  return (
    <div className="space-y-2">
      {avisos.map((aviso, i) => (
        <Aviso key={`${aviso.code}-${i}`} aviso={aviso} grave={GRAVES.includes(aviso.code)} />
      ))}
    </div>
  );
}
