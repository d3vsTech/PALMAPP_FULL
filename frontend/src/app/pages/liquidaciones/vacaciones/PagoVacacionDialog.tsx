/**
 * Registro del pago de una vacación (API_LIQUIDACIONES §10.9).
 * No hay fondo ni PILA: el dinero va directo al trabajador.
 *
 * PR-L15 — En `modo_pago = NOMINA` el giro ya no es el total: las nóminas
 * cerradas pagaron sus tramos y aquí solo se cubre el saldo (`pago.pendiente`).
 * El monto lo pone el backend; este formulario solo manda cómo y cuándo. Por
 * eso `NOMINA` nunca aparece como método: es un modo, no una forma de giro.
 *
 * v1.11 (ajuste A) — En `DIRECTO` lo que se le entrega al trabajador es el
 * **neto**: el comprobante ya descontó salud, pensión y FSP sobre el disfrute.
 * `total_pagado` sigue registrando el bruto, así que el diálogo muestra los
 * dos y nombra el que de verdad sale de caja.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { Banknote, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  type MetodoPagoVacacion,
  type VacacionItem,
} from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';
import { fmtCOP } from './comunes';
import { formatFecha } from '../../../utils/fecha';

const METODOS: Array<{ valor: MetodoPagoVacacion; label: string }> = [
  { valor: 'TRANSFERENCIA', label: 'Transferencia' },
  { valor: 'EFECTIVO', label: 'Efectivo' },
  { valor: 'CHEQUE', label: 'Cheque' },
];

interface Props {
  vacacion: VacacionItem | null;
  onCerrar: () => void;
  onPagada: (v: VacacionItem) => void;
}

export default function PagoVacacionDialog({ vacacion, onCerrar, onPagada }: Props) {
  // Lo que falta por girar. En DIRECTO es el total; en NOMINA, el saldo.
  const porNomina = vacacion?.modo_pago === 'NOMINA';
  const pagado = vacacion?.pago.total_pagado ?? 0;
  const aPagar = porNomina
    ? vacacion?.pago.pendiente ?? Math.max((vacacion?.valor_total ?? 0) - pagado, 0)
    : vacacion?.valor_neto ?? vacacion?.valor_total ?? 0;
  const tramos = vacacion?.pago.nominas ?? [];
  // El saldo de una NOMINA se gira bruto: ninguna nómina lo descontó.
  const deducciones = porNomina ? null : vacacion?.deducciones ?? null;
  const totalDeducciones = deducciones?.total ?? 0;

  const [fechaPago, setFechaPago] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagoVacacion>('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!vacacion) return;
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMetodo('TRANSFERENCIA');
    setReferencia('');
    setObservacion('');
  }, [vacacion]);

  const guardar = async () => {
    if (!vacacion) return;
    if (!fechaPago) { toast.error('Indica la fecha del pago'); return; }
    setGuardando(true);
    try {
      const res = await vacacionesApi.registrarPago(vacacion.id, {
        fecha_pago: fechaPago,
        metodo_pago: metodo,
        referencia_pago: referencia.trim() || undefined,
        observacion: observacion.trim() || undefined,
      });
      toast.success(res.message ?? 'Pago registrado');
      onPagada(res.data);
      onCerrar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === VacacionesErrorCodes.LIQUIDACION_PAGO_YA_REGISTRADO) {
        toast.error('Esta vacación ya tiene el pago registrado');
      } else if (e.code === VacacionesErrorCodes.VACACION_ESTADO_INVALIDO) {
        toast.error('La vacación está anulada: no admite pago');
      } else if (e.code === VacacionesErrorCodes.VACACION_PAGO_POR_NOMINA) {
        toast.error('Las nóminas ya cubrieron el total: no queda saldo por girar');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={vacacion !== null} onOpenChange={(v) => { if (!v && !guardando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
          </DialogTitle>
          <DialogDescription>
            {vacacion
              ? `${vacacion.empleado.nombre_completo} · ${fmtCOP(aPagar)}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {totalDeducciones > 0 && vacacion && (
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p className="flex justify-between text-muted-foreground">
                <span>Total devengado</span>
                <span>{fmtCOP(vacacion.valor_total)}</span>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>Aportes del trabajador</span>
                <span className="text-destructive">−{fmtCOP(totalDeducciones)}</span>
              </p>
              <p className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                <span>Neto a girar</span>
                <span>{fmtCOP(aPagar)}</span>
              </p>
            </div>
          )}

          {porNomina && vacacion && (
            <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-800/30 dark:bg-sky-950/20">
              <p className="flex items-start gap-2 text-sky-700 dark:text-sky-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Esta vacación se paga en nómina. El giro cubre solo el saldo que
                las nóminas cerradas no alcanzaron a pagar.
              </p>
              {tramos.map((t) => (
                <p key={t.nomina_empleado_id} className="flex justify-between text-sky-700 dark:text-sky-300">
                  <span>
                    {t.etiqueta ?? `NOM-${t.nomina_id}`}
                    {' · '}
                    {formatFecha(t.fecha_desde)} a {formatFecha(t.fecha_hasta)}
                  </span>
                  <span className="font-medium">{fmtCOP(t.total)}</span>
                </p>
              ))}
              <p className="flex justify-between border-t border-sky-200 pt-2 font-semibold text-sky-800 dark:border-sky-800/30 dark:text-sky-200">
                <span>Saldo por girar</span>
                <span>{fmtCOP(aPagar)}</span>
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagoVacacion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Referencia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Número de transferencia o cheque"
              value={referencia} onChange={(e) => setReferencia(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observación <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando} className="gap-2">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
