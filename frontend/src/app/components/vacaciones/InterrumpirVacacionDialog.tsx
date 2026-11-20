/**
 * Interrumpir el disfrute de una vacación (CST art. 188, API_LIQUIDACIONES §10.16).
 *
 * El colaborador volvió a trabajar antes de la fecha fin. En vez de anular y
 * liquidar otra vez, la vacación se acorta por el final: los días no
 * disfrutados vuelven a la bolsa y los valores se recalculan al **mismo**
 * valor día. Lo que ya se pagó de más queda cuantificado como reintegro.
 *
 * Lo usan dos pantallas: el detalle de la vacación y el editor de nómina,
 * que es donde el regreso anticipado se descubre (hay jornal en días de
 * vacación). Hay que interrumpir **antes** de cerrar la nómina: después, los
 * días devueltos quedan en una nómina inmutable y el backend lo bloquea.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { vacacionesApi } from '../../../api/vacaciones';
import type {
  PreviewInterrupcionVacaciones,
  ReintegroVacacion,
  VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

/** El backend manda el total de las deducciones como número; un objeto es defensa. */
export function montoDeducciones(d: ReintegroVacacion['deducciones']): number {
  if (typeof d === 'number') return d;
  return Number(d?.total ?? 0);
}

const fmt = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

interface Props {
  /** La vacación a interrumpir. `null` cierra el diálogo. */
  vacacionId: number | null;
  /** Para el título; opcional porque la nómina solo tiene el comprobante. */
  comprobante?: string | null;
  /** Primer día trabajado según la planilla. Prellena el campo. */
  fechaSugerida?: string | null;
  onClose: () => void;
  /** Se llama tras el 200, con la vacación ya acortada. */
  onInterrumpida?: (vacacion: VacacionItem) => void;
}

export function InterrumpirVacacionDialog({
  vacacionId, comprobante, fechaSugerida, onClose, onInterrumpida,
}: Props) {
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [autorizacion, setAutorizacion] = useState(false);
  const [preview, setPreview] = useState<PreviewInterrupcionVacaciones | null>(null);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const abierto = vacacionId != null;

  // Al abrir, la fecha del primer día trabajado ya viene propuesta.
  useEffect(() => {
    if (!abierto) return;
    setFecha(fechaSugerida ?? '');
    setMotivo('');
    setAutorizacion(false);
    setPreview(null);
    setErrorPreview(null);
  }, [abierto, fechaSugerida]);

  const calcular = useCallback(async (id: number, dia: string) => {
    setCalculando(true);
    try {
      const res = await vacacionesApi.interrumpirPreview(id, dia);
      setPreview(res.data);
      setErrorPreview(null);
    } catch (err) {
      setPreview(null);
      setErrorPreview((err as ApiError).message ?? 'No se pudo calcular la interrupción');
    } finally {
      setCalculando(false);
    }
  }, []);

  // El preview se pide al escoger la fecha; un debounce corto evita pedirlo
  // mientras el datepicker todavía se está armando.
  useEffect(() => {
    if (!abierto || !vacacionId || !fecha) { setPreview(null); return; }
    const t = setTimeout(() => { void calcular(vacacionId, fecha); }, 350);
    return () => clearTimeout(t);
  }, [abierto, vacacionId, fecha, calcular]);

  const bloqueantes = preview?.bloqueantes ?? [];
  const reintegro = preview?.reintegro;
  const hayReintegro = reintegro?.estado === 'PENDIENTE';
  const puedeConfirmar = Boolean(preview)
    && bloqueantes.length === 0
    && motivo.trim().length >= 5
    && !enviando;

  const confirmar = async () => {
    if (!vacacionId || !puedeConfirmar) return;
    setEnviando(true);
    try {
      const res = await vacacionesApi.interrumpir(vacacionId, {
        fecha_reintegro: fecha,
        motivo: motivo.trim(),
        autorizacion_descuento: hayReintegro ? autorizacion : undefined,
      });
      toast.success(res.message ?? 'Vacaciones interrumpidas');
      onInterrumpida?.(res.data);
      onClose();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo interrumpir la vacación', { duration: 9000 });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            El colaborador volvió antes
            {comprobante ? ` — ${comprobante}` : ''}
          </DialogTitle>
          <DialogDescription>
            Primer día en que volvió a trabajar. El disfrute termina el último día hábil
            anterior y los días restantes vuelven a su saldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha-reintegro">Fecha de reintegro</Label>
            <Input
              id="fecha-reintegro"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {calculando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando cómo queda…
            </p>
          )}

          {errorPreview && !calculando && (
            <p className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorPreview}</span>
            </p>
          )}

          {preview && !calculando && (
            <ComparacionInterrupcion preview={preview} />
          )}

          {bloqueantes.length > 0 && (
            <div className="space-y-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {bloqueantes.map((b, i) => (
                <p key={`${b.code}-${i}`} className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{b.mensaje ?? b.code}</span>
                </p>
              ))}
            </div>
          )}

          {(preview?.advertencias?.length ?? 0) > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
              {preview!.advertencias.map((a, i) => (
                <p key={`${a.code}-${i}`}>{a.mensaje ?? a.code}</p>
              ))}
            </div>
          )}

          {preview && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="motivo-interrupcion">Motivo</Label>
                <Textarea
                  id="motivo-interrupcion"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Por qué volvió antes"
                  maxLength={500}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Queda en el comprobante y en la auditoría. Mínimo 5 caracteres.
                </p>
              </div>

              {/* CST arts. 149-150: descontar por nómina exige autorización escrita. */}
              {hayReintegro && (
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={autorizacion}
                    onCheckedChange={(v) => setAutorizacion(v === true)}
                    className="mt-0.5"
                  />
                  <span>El colaborador autorizó por escrito el descuento</span>
                </label>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Interrumpir disfrute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Original → Nueva: lo que el liquidador tiene que poder comparar de un vistazo. */
function ComparacionInterrupcion({ preview }: { preview: PreviewInterrupcionVacaciones }) {
  const { original, nuevo, devueltos, saldo, reintegro, pago_despues: pago } = preview;
  const netoOriginal = original.valor_neto ?? original.valor_total;
  const netoNuevo = nuevo.valor_neto ?? nuevo.valor_total;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <span className="text-muted-foreground">Concepto</span>
        <span className="text-muted-foreground">Original</span>
        <span className="font-medium text-foreground">Nueva</span>

        <span className="text-muted-foreground">Período</span>
        <span>
          {original.fecha_inicio ? `${formatFecha(original.fecha_inicio)} – ` : ''}
          {original.fecha_fin ? formatFecha(original.fecha_fin) : '—'}
        </span>
        <span className="font-medium">
          {nuevo.fecha_inicio ? `${formatFecha(nuevo.fecha_inicio)} – ` : ''}
          {nuevo.fecha_fin ? formatFecha(nuevo.fecha_fin) : '—'}
        </span>

        <span className="text-muted-foreground">Días hábiles</span>
        <span>{original.dias_habiles}</span>
        <span className="font-medium">{nuevo.dias_habiles}</span>

        <span className="text-muted-foreground">Disfrute</span>
        <span>{fmt(original.valor_disfrute)}</span>
        <span className="font-medium">{fmt(nuevo.valor_disfrute)}</span>

        <span className="text-muted-foreground">Neto</span>
        <span>{fmt(netoOriginal)}</span>
        <span className="font-medium">{fmt(netoNuevo)}</span>
      </div>

      <p className="border-t border-border pt-2 text-sm">
        Vuelven <strong>{devueltos.dias_habiles}</strong> día(s) hábil(es) al saldo
        {' '}({formatFecha(devueltos.desde)} a {formatFecha(devueltos.hasta)}).
        {' '}Saldo exigible: {saldo.dias_disponibles_exigibles_antes}
        {' → '}
        <strong>{saldo.dias_disponibles_exigibles_despues}</strong>.
      </p>

      {reintegro.estado === 'PENDIENTE' ? (
        <p className="rounded-md bg-amber-500/10 px-2.5 py-2 text-sm text-amber-700">
          Se pagaron <strong>{fmt(reintegro.bruto)}</strong> de más. Descontando los aportes
          devueltos ({fmt(montoDeducciones(reintegro.deducciones))}), quedan
          {' '}<strong>{fmt(reintegro.neto)}</strong> por reintegrar.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No hay dinero que recuperar.</p>
      )}

      {pago?.se_completa && (
        <p className="text-xs text-muted-foreground">
          Lo que ya pagaron las nóminas cubre el nuevo total: la vacación queda PAGADA.
        </p>
      )}
    </div>
  );
}
