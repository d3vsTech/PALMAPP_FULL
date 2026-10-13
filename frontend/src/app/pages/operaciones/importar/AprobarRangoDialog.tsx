/**
 * Aprobación en bloque de las planillas en borrador de un rango
 * (API_OPERACIONES §13.1).
 *
 * Existe porque el cargue puede dejar las planillas en BORRADOR, y aprobarlas
 * una por una en el wizard no es viable con un histórico de meses. Aprueba con
 * la misma cascada de horas extra y ausencias que el botón de la planilla.
 *
 * La guarda es la misma del cargue: si alguna fecha cae en una nómina sin
 * cerrar responde 409 y hay que decidir, no reintentar a ciegas.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  importarOperacionesApi,
  ImportarOperacionesErrorCodes as Codigos,
  MAX_DIAS_APROBAR_RANGO,
} from '../../../../api/importarOperaciones';
import { mensajeArchivo } from '../../liquidaciones/historico/comunes';

function codigoDe(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as { code?: string }).code ?? null;
}

function diasEntre(desde: string, hasta: string): number {
  const ms = new Date(`${hasta}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Se dispara tras aprobar, para refrescar el listado de planillas. */
  onAprobado: () => void;
}

export function AprobarRangoDialog({ abierto, onCerrar, onAprobado }: Props) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [soloImportadas, setSoloImportadas] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState<string | null>(null);

  const dias = desde && hasta ? diasEntre(desde, hasta) : 0;
  const rangoValido = dias > 0 && dias <= MAX_DIAS_APROBAR_RANGO;

  const aprobar = async (forzar: boolean) => {
    setEnviando(true);
    setConflicto(null);
    try {
      const res = await importarOperacionesApi.aprobarRango({
        fecha_desde: desde,
        fecha_hasta: hasta,
        solo_importadas: soloImportadas,
        forzar,
      });
      toast.success(res.message ?? `${res.data.aprobadas} planilla(s) aprobada(s)`);
      onAprobado();
      onCerrar();
    } catch (e) {
      if (codigoDe(e) === Codigos.NOMINA_ABIERTA_EN_RANGO) {
        setConflicto(mensajeArchivo(e));
        return;
      }
      toast.error(mensajeArchivo(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar planillas por rango</DialogTitle>
          <DialogDescription>
            Aprueba de una vez las planillas en borrador del rango, con su cascada de horas extra
            y ausencias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rango-desde">Desde</Label>
              <Input
                id="rango-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rango-hasta">Hasta</Label>
              <Input
                id="rango-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>

          {dias > MAX_DIAS_APROBAR_RANGO && (
            <p className="text-sm text-destructive">
              El rango no puede pasar de {MAX_DIAS_APROBAR_RANGO} días.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloImportadas}
              onChange={(e) => setSoloImportadas(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Solo las que creó una importación
              <span className="block text-xs text-muted-foreground">
                Sin esto también se aprueban los borradores que alguien dejó a medias en el wizard.
              </span>
            </span>
          </label>

          {conflicto && (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {conflicto}
              </p>
              <Button size="sm" variant="outline" onClick={() => void aprobar(true)} disabled={enviando}>
                Aprobar de todas formas
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void aprobar(false)} disabled={!rangoValido || enviando} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
