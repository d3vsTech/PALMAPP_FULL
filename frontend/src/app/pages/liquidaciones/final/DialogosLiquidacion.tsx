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
import { AlertTriangle, Ban, Banknote, CheckCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionFinalApi,
  esBloqueanteForzable,
  type ComprobanteLiquidacionFinal,
  type MetodoPagoLiquidacion,
} from '../../../../api/liquidacionFinal';
import { fmtCOP, fmtDias, fmtFecha, mensajeErrorLiquidacion, tieneCodigo } from './comunes';
import { FilaMonto } from '../../../components/nomina/piezas';
import { LiquidacionFinalErrorCodes as E } from '../../../../api/liquidacionFinal';

const METODOS: Array<{ valor: MetodoPagoLiquidacion; label: string }> = [
  { valor: 'TRANSFERENCIA', label: 'Transferencia' },
  { valor: 'EFECTIVO', label: 'Efectivo' },
  { valor: 'CHEQUE', label: 'Cheque' },
];

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Colaborador y neto a pagar, en el recuadro gris de los diálogos del diseño. */
function ResumenDialogo({ liquidacion }: { liquidacion: ComprobanteLiquidacionFinal }) {
  return (
    <div className="space-y-1 rounded-lg bg-muted/60 px-4 py-3">
      <FilaMonto label="Colaborador" value={liquidacion.empleado.nombre_completo} />
      <FilaMonto label="Neto a pagar" value={fmtCOP(liquidacion.totales.total_neto)} strong />
    </div>
  );
}

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
          <DialogTitle>Aprobar liquidación</DialogTitle>
          <DialogDescription>Confirma la liquidación final de este colaborador.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ResumenDialogo liquidacion={liquidacion} />

          <div className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <div className="space-y-1">
              <p>Al aprobar, el cálculo queda congelado y los valores ya no se recalculan.</p>
              <p>
                El contrato termina y el retiro del {fmtFecha(liquidacion.retiro.fecha_retiro)} queda
                registrado en la ficha del colaborador.
              </p>
              {liquidacion.vacaciones.saldo_dias > 0 && (
                <p>
                  Se crea la compensación de {fmtDias(liquidacion.vacaciones.saldo_dias)} días de vacaciones.
                </p>
              )}
              <p className="text-muted-foreground">
                Se puede anular después, pero solo si nadie toca la ficha ni el contrato entretanto.
              </p>
            </div>
          </div>

          {duros.map((b, i) => (
            <div key={`${b.code}-${i}`} className="flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
              <p>{b.mensaje}</p>
            </div>
          ))}

          {forzables.map((b, i) => (
            <div key={`${b.code}-${i}`} className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <p>{b.mensaje}</p>
            </div>
          ))}

          {forzables.length > 0 && (
            <div className="space-y-1.5">
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
          <Button onClick={() => void aprobar()} disabled={!listo || enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <CheckCircle strokeWidth={2} />}
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
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Registra el pago de la liquidación final.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ResumenDialogo liquidacion={liquidacion} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="medio-pago">
                Medio de pago <span className="text-destructive">*</span>
              </Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagoLiquidacion)}>
                <SelectTrigger id="medio-pago">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="referencia-pago">
              Referencia <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="referencia-pago"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de transferencia o comprobante"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacion-pago">
              Observación <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="observacion-pago"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
            />
          </div>

          {hayPrestamos && (
            <div className="flex gap-2 rounded-lg bg-info-soft p-3 text-sm text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
              <p>Al registrar el pago, los préstamos descontados quedan saldados por completo.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void registrar()} disabled={!fechaPago || enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : <Banknote strokeWidth={2} />}
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
          <DialogTitle>{esPago ? 'Anular pago' : 'Anular liquidación'}</DialogTitle>
          <DialogDescription>
            {esPago
              ? 'La liquidación vuelve a quedar aprobada y sin pagar. Los préstamos vuelven a tener saldo.'
              : 'La liquidación queda sin efecto. El comprobante se conserva con la marca de anulada.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 empty:hidden">
          {!esPago && aplicoRetiro && (
            <div className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <p>
                Esta liquidación aplicó el retiro. Al anularla se intenta revertirlo; si alguien
                cambió la ficha o el contrato después, habrá que corregirlo a mano.
              </p>
            </div>
          )}

          {!esPago && (
            <div className="space-y-1.5">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void anular()}
            disabled={!listo || enviando}
          >
            {enviando ? <Loader2 className="animate-spin" /> : <Ban strokeWidth={2} />}
            {esPago ? 'Anular pago' : 'Anular liquidación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
