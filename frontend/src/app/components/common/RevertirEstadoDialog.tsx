/**
 * Diálogo de reversión: desaprobar una planilla o reabrir un viaje.
 *
 * Los dos casos son el mismo flujo (API_OPERACIONES §7.3 y API_VIAJES §5.10),
 * así que viven en un solo componente: verificar al abrir, pintar bloqueos y
 * avisos, pedir un motivo de 5 a 500 caracteres y confirmar.
 *
 * Lo que cambia entre uno y otro es el texto y los efectos previstos, y eso
 * entra por props. Lo que no cambia es lo importante: **la guarda de nómina no
 * tiene salida**. Si una nómina que cubre la fecha ya liquidó, el botón queda
 * apagado y no se ofrece ningún "continuar de todas formas", porque no existe.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Info, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import {
  AVISO_REVERSION_LABEL,
  MOTIVO_MAX,
  MOTIVO_MIN,
  type AvisoReversion,
  type BloqueoReversion,
} from '../../../api/reversionEstados';

interface Verificacion {
  permitido: boolean;
  bloqueos: BloqueoReversion[];
  advertencias: AvisoReversion[];
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Encabezado y botón, distintos en planilla y viaje. */
  titulo: string;
  descripcion: string;
  etiquetaAccion: string;
  /** Qué va a pasar, en frases cortas. Lo arma quien usa el diálogo. */
  efectos?: string[];
  verificar: () => Promise<Verificacion>;
  confirmar: (motivo: string) => Promise<void>;
  /** Se dispara tras confirmar, para recargar la pantalla de atrás. */
  onHecho: () => void;
}

function Bloqueo({ bloqueo }: { bloqueo: BloqueoReversion }) {
  return (
    <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <p className="flex items-start gap-2 text-sm text-destructive">
        <Ban className="mt-0.5 h-4 w-4 shrink-0" />
        {bloqueo.message}
      </p>
      {/* El bloqueo por viaje sí tiene salida, y es una secuencia concreta:
          reabrir el camión, quitarle la cosecha y volver aquí. */}
      {(bloqueo.viajes ?? []).length > 0 && (
        <ul className="ml-6 list-disc space-y-0.5 text-xs text-muted-foreground">
          {bloqueo.viajes!.map((v) => (
            <li key={v.id}>
              {v.remision} ({v.estado.toLowerCase()}){' '}
              {v.estado === 'FINALIZADO'
                ? 'reábralo y quítele la cosecha'
                : 'quítele la cosecha'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Aviso({ aviso }: { aviso: AvisoReversion }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{aviso.mensaje || aviso.message || AVISO_REVERSION_LABEL[aviso.code] || aviso.code}</span>
    </p>
  );
}

export function RevertirEstadoDialog({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  etiquetaAccion,
  efectos,
  verificar,
  confirmar,
  onHecho,
}: Props) {
  const [verificacion, setVerificacion] = useState<Verificacion | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const correrVerificacion = useCallback(async () => {
    setVerificando(true);
    try {
      setVerificacion(await verificar());
    } catch {
      // Sin verificación no se puede decidir nada, así que se asume bloqueado.
      setVerificacion({
        permitido: false,
        bloqueos: [{ code: 'SIN_VERIFICAR', message: 'No se pudo comprobar si la reversión es posible. Intente de nuevo.' }],
        advertencias: [],
      });
    } finally {
      setVerificando(false);
    }
  }, [verificar]);

  useEffect(() => {
    if (!abierto) return;
    setMotivo('');
    setVerificacion(null);
    void correrVerificacion();
  }, [abierto, correrVerificacion]);

  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX;
  const puedeConfirmar = verificacion?.permitido === true && motivoValido && !enviando;

  const ejecutar = async () => {
    setEnviando(true);
    try {
      await confirmar(motivo.trim());
      onHecho();
      onCerrar();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? 'No se pudo revertir');
      // El estado pudo cambiar entre la verificación y el clic.
      void correrVerificacion();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {verificando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Comprobando si se puede...
            </p>
          )}

          {verificacion?.bloqueos.map((b, i) => <Bloqueo key={`${b.code}-${i}`} bloqueo={b} />)}
          {verificacion?.advertencias.map((a, i) => <Aviso key={`${a.code}-${i}`} aviso={a} />)}

          {verificacion?.permitido && (efectos?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Qué va a pasar
              </p>
              <ul className="mt-1.5 ml-4 list-disc space-y-0.5 text-sm text-muted-foreground">
                {efectos!.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}

          {verificacion?.permitido && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo-reversion">Motivo</Label>
              <Textarea
                id="motivo-reversion"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={MOTIVO_MAX}
                rows={3}
                placeholder="Por qué hay que revertirlo. Queda en la auditoría."
              />
              <p className="text-xs text-muted-foreground">
                {motivo.trim().length < MOTIVO_MIN
                  ? `Mínimo ${MOTIVO_MIN} caracteres.`
                  : `${motivo.trim().length} de ${MOTIVO_MAX}.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void ejecutar()} disabled={!puedeConfirmar} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {etiquetaAccion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
