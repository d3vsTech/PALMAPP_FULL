/**
 * Los tres diálogos de la liquidación final: aprobar, pagar y anular.
 *
 * Aprobar es el que más cuidado pide: además de congelar el cálculo, termina
 * el contrato y escribe el retiro en la ficha del colaborador. Por eso el
 * diálogo dice qué va a pasar antes de que el usuario confirme.
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { AlertTriangle, Ban, Banknote, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionFinalApi,
  esBloqueanteForzable,
  type ComprobanteLiquidacionFinal,
  type MetodoPagoLiquidacion,
} from '../../../../api/liquidacionFinal';
import { fmtCOP, fmtFecha, mensajeErrorLiquidacion, tieneCodigo } from './comunes';
import { LiquidacionFinalErrorCodes as E } from '../../../../api/liquidacionFinal';

const METODOS: Array<{ valor: MetodoPagoLiquidacion; label: string }> = [
  { valor: 'TRANSFERENCIA', label: 'Transferencia' },
  { valor: 'EFECTIVO', label: 'Efectivo' },
  { valor: 'CHEQUE', label: 'Cheque' },
];

const hoyISO = () => new Date().toISOString().slice(0, 10);

// ─── Aprobar ──────────────────────────────────────────────────────────────────

interface PropsAprobar {
  liquidacion: ComprobanteLiquidacionFinal | null;
  onCerrar: () => void;
  onAprobada: (c: ComprobanteLiquidacionFinal) => void;
  /** Se llama cuando el hash quedó viejo: hay que recargar el comprobante. */
  onDesactualizada: () => void;
}

export function AprobarLiquidacionDialog({
  liquidacion,
  onCerrar,
  onAprobada,
  onDesactualizada,
}: PropsAprobar) {
  const [motivoForzado, setMotivoForzado] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (liquidacion) setMotivoForzado('');
  }, [liquidacion]);

  if (!liquidacion?.id) return null;

  const forzables = liquidacion.bloqueantes.filter(esBloqueanteForzable);
  const duros = liquidacion.bloqueantes.filter((b) => !esBloqueanteForzable(b));
  const necesitaMotivo = forzables.length > 0;
  const listo = duros.length === 0 && (!necesitaMotivo || motivoForzado.trim().length >= 5);

  const aprobar = async () => {
    if (!liquidacion.id || !liquidacion.calculo_hash) return;
    setEnviando(true);
    try {
      const res = await liquidacionFinalApi.aprobar(liquidacion.id, {
        calculo_hash: liquidacion.calculo_hash,
        forzar: necesitaMotivo || undefined,
        motivo_forzado: necesitaMotivo ? motivoForzado.trim() : undefined,
      });
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success('Liquidación aprobada. El retiro quedó aplicado en la ficha.');
      onAprobada(res.data);
      onCerrar();
    } catch (e) {
      if (tieneCodigo(e, E.LIQUIDACION_DESACTUALIZADA)) {
        toast.error(
          'Los datos cambiaron mientras revisaba. Se recargó el cálculo: revíselo y vuelva a aprobar.',
        );
        onDesactualizada();
        onCerrar();
        return;
      }
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo aprobar la liquidación'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Aprobar liquidación
          </DialogTitle>
          <DialogDescription>
            {liquidacion.empleado.nombre_completo} · {fmtCOP(liquidacion.totales.total_neto)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
            <p className="font-medium">Al aprobar, el sistema hace tres cosas:</p>
            <ul className="ml-4 list-disc space-y-1 text-xs">
              <li>Congela el cálculo: los valores ya no se recalculan.</li>
              <li>
                Termina el contrato y registra el retiro el{' '}
                {fmtFecha(liquidacion.retiro.fecha_retiro)} en la ficha del colaborador.
              </li>
              {liquidacion.vacaciones.saldo_dias > 0 && (
                <li>
                  Crea la compensación de {liquidacion.vacaciones.saldo_dias} días de vacaciones.
                </li>
              )}
            </ul>
            <p className="text-xs">
              Se puede anular después, pero solo si nadie toca la ficha ni el contrato entretanto.
            </p>
          </div>

          {duros.map((b, i) => (
            <p
              key={`${b.code}-${i}`}
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {b.mensaje}
            </p>
          ))}

          {forzables.length > 0 && (
            <div className="space-y-2">
              {forzables.map((b, i) => (
                <p
                  key={`${b.code}-${i}`}
                  className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {b.mensaje}
                </p>
              ))}
              <Label htmlFor="motivo-forzado">
                Motivo para continuar igual <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="motivo-forzado"
                value={motivoForzado}
                onChange={(e) => setMotivoForzado(e.target.value)}
                placeholder="Por ejemplo: la nómina de la quincena se cierra el lunes"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Queda guardado en el comprobante.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void aprobar()} disabled={!listo || enviando} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Aprobar y aplicar el retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pago ─────────────────────────────────────────────────────────────────────

interface PropsPago {
  liquidacion: ComprobanteLiquidacionFinal | null;
  onCerrar: () => void;
  onPagada: (c: ComprobanteLiquidacionFinal) => void;
}

export function PagoLiquidacionDialog({ liquidacion, onCerrar, onPagada }: PropsPago) {
  const [fechaPago, setFechaPago] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagoLiquidacion>('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (liquidacion) {
      setFechaPago(hoyISO());
      setMetodo('TRANSFERENCIA');
      setReferencia('');
      setObservacion('');
    }
  }, [liquidacion]);

  if (!liquidacion?.id) return null;

  const registrar = async () => {
    if (!liquidacion.id) return;
    setEnviando(true);
    try {
      const res = await liquidacionFinalApi.registrarPago(liquidacion.id, {
        fecha_pago: fechaPago,
        metodo_pago: metodo,
        referencia_pago: referencia.trim() || undefined,
        observacion: observacion.trim() || undefined,
      });
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      (res.prestamos ?? []).forEach((p) =>
        toast.info(`Préstamo #${p.prestamo_id} saldado: ${fmtCOP(p.valor_aplicado)}`),
      );
      toast.success('Pago registrado');
      onPagada(res.data);
      onCerrar();
    } catch (e) {
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo registrar el pago'));
    } finally {
      setEnviando(false);
    }
  };

  const hayPrestamos = liquidacion.conceptos.deducciones.some((d) => d.codigo === 'PRESTAMO');

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Registrar pago
          </DialogTitle>
          <DialogDescription>
            {liquidacion.empleado.nombre_completo} · {fmtCOP(liquidacion.totales.total_neto)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha-pago">
              Fecha del pago <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fecha-pago"
              type="date"
              max={hoyISO()}
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Medio de pago <span className="text-destructive">*</span>
            </Label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagoLiquidacion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m.valor} value={m.valor}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia-pago">Referencia</Label>
            <Input
              id="referencia-pago"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de transferencia o comprobante"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion-pago">Observación</Label>
            <Textarea
              id="observacion-pago"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
            />
          </div>

          {hayPrestamos && (
            <p className="text-xs text-muted-foreground">
              Al registrar el pago, los préstamos descontados quedan saldados por completo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void registrar()} disabled={!fechaPago || enviando} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Anular ───────────────────────────────────────────────────────────────────

export type ModoAnulacion = 'pago' | 'liquidacion';

interface PropsAnular {
  liquidacion: ComprobanteLiquidacionFinal | null;
  modo: ModoAnulacion;
  onCerrar: () => void;
  onAnulada: (c: ComprobanteLiquidacionFinal) => void;
}

export function AnularLiquidacionDialog({
  liquidacion,
  modo,
  onCerrar,
  onAnulada,
}: PropsAnular) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (liquidacion) setMotivo('');
  }, [liquidacion, modo]);

  if (!liquidacion?.id) return null;

  const esPago = modo === 'pago';
  const aplicoRetiro = liquidacion.retiro.retiro_aplicado_por_liquidacion;

  const anular = async () => {
    if (!liquidacion.id) return;
    setEnviando(true);
    try {
      const res = esPago
        ? await liquidacionFinalApi.anularPago(liquidacion.id)
        : await liquidacionFinalApi.anular(liquidacion.id, motivo.trim());
      (res.advertencias ?? []).forEach((a) => toast.warning(a.mensaje));
      toast.success(esPago ? 'Pago anulado' : 'Liquidación anulada');
      onAnulada(res.data);
      onCerrar();
    } catch (e) {
      toast.error(
        mensajeErrorLiquidacion(e, esPago ? 'No se pudo anular el pago' : 'No se pudo anular'),
      );
    } finally {
      setEnviando(false);
    }
  };

  const listo = esPago || motivo.trim().length >= 5;

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {esPago ? 'Anular el pago' : 'Anular la liquidación'}
          </DialogTitle>
          <DialogDescription>
            {esPago
              ? 'La liquidación vuelve a quedar aprobada y sin pagar. Los préstamos vuelven a tener saldo.'
              : 'La liquidación queda sin efecto. El comprobante se conserva con la marca de anulada.'}
          </DialogDescription>
        </DialogHeader>

        {!esPago && aplicoRetiro && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Esta liquidación aplicó el retiro. Al anularla se intenta revertirlo; si alguien
            cambió la ficha o el contrato después, habrá que corregirlo a mano.
          </p>
        )}

        {!esPago && (
          <div className="space-y-2">
            <Label htmlFor="motivo-anulacion">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se anula"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Mínimo cinco caracteres.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void anular()}
            disabled={!listo || enviando}
            className="gap-2"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {esPago ? 'Anular pago' : 'Anular liquidación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
