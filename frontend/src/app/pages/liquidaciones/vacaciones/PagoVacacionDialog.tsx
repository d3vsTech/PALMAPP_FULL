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
import { Loader2, Info } from 'lucide-react';
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
          <DialogTitle>{porNomina ? 'Pagar el saldo' : 'Registrar pago'}</DialogTitle>
          <DialogDescription>
            {vacacion
              ? `${vacacion.empleado.nombre_completo} · ${fmtCOP(aPagar)}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {totalDeducciones > 0 && vacacion && (
            <div className="space-y-1.5 rounded-lg bg-muted/60 px-4 py-3 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total devengado</span>
                <span className="tabular-nums text-foreground">{fmtCOP(vacacion.valor_total)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Aportes del trabajador</span>
                <span className="tabular-nums text-foreground">− {fmtCOP(totalDeducciones)}</span>
              </p>
              <p className="flex justify-between gap-4 border-t border-border pt-2 font-semibold text-foreground">
                <span>Neto a girar</span>
                <span className="tabular-nums">{fmtCOP(aPagar)}</span>
              </p>
            </div>
          )}

          {porNomina && vacacion && (
            <div className="flex gap-2 rounded-lg bg-info-soft p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
              <div className="min-w-0 flex-1 space-y-2 text-sm text-foreground">
                <p>
                  Esta vacación se paga en nómina. El giro cubre solo el saldo que
                  las nóminas cerradas no alcanzaron a pagar.
                </p>
                {tramos.map((t) => (
                  <p key={t.nomina_empleado_id} className="flex justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">
                      {t.etiqueta ?? `NOM-${t.nomina_id}`}
                      {' · '}
                      {formatFecha(t.fecha_desde)} a {formatFecha(t.fecha_hasta)}
                    </span>
                    <span className="font-medium tabular-nums">{fmtCOP(t.total)}</span>
                  </p>
                ))}
                <p className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                  <span>Saldo por girar</span>
                  <span className="tabular-nums">{fmtCOP(aPagar)}</span>
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pagovacaci-fecha-de-pago">Fecha de pago</Label>
              <Input id="pagovacaci-fecha-de-pago" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pagovacaci-metodo">Método</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagoVacacion)}>
                <SelectTrigger id="pagovacaci-metodo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pagovacaci-referencia">Referencia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              id="pagovacaci-referencia"
              placeholder="Número de transferencia o cheque"
              value={referencia} onChange={(e) => setReferencia(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pagovacaci-observacion">Observación <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Textarea id="pagovacaci-observacion" rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className="animate-spin" />}
            {porNomina ? 'Pagar el saldo' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
