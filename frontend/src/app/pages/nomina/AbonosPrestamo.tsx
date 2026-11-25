/**
 * Pagos del Préstamo — historial de las cuotas aplicadas a un préstamo y
 * registro de un pago de cuota por fuera de la nómina (transferencia, efectivo,
 * cheque, etc.) que aplican la próxima cuota PENDIENTE.
 *
 * Conectada a:
 *  - GET  /prestamos/{id}/abonos   → resumen financiero + historial unificado
 *                                    (nómina + directos), ordenado por
 *                                    numero_cuota ASC (doc §8.1).
 *  - POST /prestamos/{id}/abonos   → registra abono DIRECTO; backend
 *                                    auto-aplica la siguiente cuota
 *                                    pendiente (doc §8.2).
 *
 * Los abonos vía nómina (tipo=NOMINA) aparecen automáticamente en el
 * historial cuando el liquidador aplica una cuota en la liquidación
 * (§7.2 de API_PRESTAMOS).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Plus, Download, Loader2, Check, Landmark, CircleCheck, Wallet, CalendarClock,
} from 'lucide-react';
import {
  prestamosApi,
  PrestamoErrorCodes,
  type MedioPagoAbono,
  type HistorialAbonos,
  type Prestamo,
  type AbonoPrestamo,
} from '../../../api/prestamos';
import { descargarComprobanteAbono } from './prestamoPdf';
import type { ApiError } from '../../../api/client';
import { formatThousands, parseCOP } from '../../components/lib/format';
import { formatFecha } from '../../utils/fecha';
import { FilaMonto, thead, th, td } from '../../components/nomina/piezas';

const ESTADO_BADGE = {
  VIGENTE:   { label: 'Vigente',   variant: 'info' },
  PAGADO:    { label: 'Pagado',    variant: 'success' },
  CANCELADO: { label: 'Cancelado', variant: 'secondary' },
} as const;

// Sin LIQUIDACION_FINAL a propósito: ese medio solo lo escribe el módulo de
// liquidaciones al pagar una liquidación final, y el backend lo rechaza aquí.
const MEDIOS_PAGO: Array<{ value: MedioPagoAbono; label: string }> = [
  { value: 'TRANSFERENCIA',    label: 'Transferencia' },
  { value: 'EFECTIVO',         label: 'Efectivo' },
  { value: 'CHEQUE',           label: 'Cheque' },
  { value: 'OTRO',             label: 'Otro' },
];

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

const fmtFecha = (s: string): string => formatFecha(s, { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * El recibo del abono no se entrega todavía: la finca no lo pide. El botón
 * queda escondido detrás de esta bandera en vez de borrarse, porque el PDF ya
 * está hecho y encenderlo es volver a poner `true`.
 */
const RECIBO_DE_ABONO_VISIBLE = false;

export default function AbonosPrestamo() {
  const { prestamoId } = useParams();
  const navigate = useNavigate();

  const [historial, setHistorial] = useState<HistorialAbonos | null>(null);
  /**
   * El préstamo completo. El historial trae el resumen financiero pero no al
   * colaborador, y el recibo de un abono lo necesita para la cabecera y para
   * el bloque de firmas.
   */
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  /**
   * §8.3 — Pagar de una vez todas las cuotas que quedan, no solo la próxima.
   * El valor no se envía: es la suma de los montos pendientes, y como la
   * última cuota absorbe el residuo del redondeo el saldo cierra en cero.
   */
  const [saldarTodo, setSaldarTodo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState<{
    fecha: string;
    valor: string;
    medioPago: MedioPagoAbono;
    referencia: string;
    nota: string;
  }>({
    fecha: new Date().toISOString().split('T')[0],
    valor: '',
    medioPago: 'TRANSFERENCIA',
    referencia: '',
    nota: '',
  });

  // Guard contra respuestas fuera de orden si cambia el prestamoId rápido:
  // solo la carga más reciente puede setear estado.
  const reqIdRef = useRef(0);

  // Cargar historial + resumen desde el backend.
  const cargar = () => {
    if (!prestamoId) return;
    const reqId = ++reqIdRef.current;
    setCargando(true);
    // El detalle va en paralelo y no es crítico: si falla, el historial se
    // pinta igual y lo único que se pierde es el botón del recibo.
    prestamosApi
      .ver(parseInt(prestamoId))
      .then((res) => { if (reqId === reqIdRef.current) setPrestamo(res.data); })
      .catch(() => { if (reqId === reqIdRef.current) setPrestamo(null); });

    prestamosApi
      .historialAbonos(parseInt(prestamoId))
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setHistorial(res.data);
      })
      .catch((err: ApiError) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(err.message ?? 'No se pudo cargar el historial de pagos');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamoId]);

  if (cargando) {
    return (
      <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando abonos del préstamo...
      </Card>
    );
  }
  if (!historial) {
    return (
      <div className="space-y-6">
        <PageHeader
          backTo="/nomina/prestamos"
          title="Préstamo no encontrado"
          description="El préstamo que buscas no existe o fue eliminado."
        />
      </div>
    );
  }

  const p = historial.prestamo;
  const abonos = historial.abonos;
  const montoTotal = toNumber(p.valor_total);
  const totalAbonado = toNumber(p.total_abonado);
  const saldoPendiente = toNumber(p.saldo_pendiente);
  const cuota = toNumber(p.cuota_valor);
  const pct = Math.round(p.avance_pct);
  const estaVigente = p.estado === 'VIGENTE';
  const cuotasPendientes = p.num_cuotas - p.cuotas_pagadas;
  const puedeRegistrarAbono = estaVigente && cuotasPendientes > 0;

  const estadoBadge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.CANCELADO;

  const guardarAbono = async () => {
    if (!prestamoId) return;
    // El backend auto-aplica la próxima cuota; el valor viene de la cuota,
    // no del input del usuario. Se muestra en la UI para dar contexto.
    setGuardando(true);
    try {
      const res = await prestamosApi.registrarAbono(parseInt(prestamoId), {
        fecha: form.fecha,
        medio_pago: form.medioPago,
        referencia: form.referencia.trim() || null,
        nota: form.nota.trim() || null,
        saldar: saldarTodo || undefined,
      });
      setHistorial(res.data);
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        valor: '',
        medioPago: 'TRANSFERENCIA',
        referencia: '',
        nota: '',
      });
      setSaldarTodo(false);
      setModalAbierto(false);
      toast.success(res.message ?? 'Pago registrado');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.PRESTAMO_NO_VIGENTE) {
        toast.error('El préstamo no está vigente. No se pueden registrar más pagos.');
      } else if (e.code === PrestamoErrorCodes.PRESTAMO_SIN_CUOTAS_PENDIENTES) {
        toast.error('Todas las cuotas del préstamo ya fueron aplicadas.');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/nomina/prestamos"
        eyebrow={p.concepto}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Abonos del préstamo
            <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>
          </span>
        }
        description={prestamo?.empleado
          ? `${prestamo.empleado.nombre_completo} · C.C. ${prestamo.empleado.documento}`
          : undefined}
        actions={puedeRegistrarAbono ? (
          <Button onClick={() => setModalAbierto(true)}>
            <Plus strokeWidth={2} />
            Nuevo abono
          </Button>
        ) : undefined}
      />

      <StatStrip
        items={[
          { label: 'Monto total', value: `$${montoTotal.toLocaleString('es-CO')}`, icon: Landmark, tone: 'blue' },
          {
            label: 'Total abonado',
            value: `$${totalAbonado.toLocaleString('es-CO')}`,
            note: `${abonos.length} abono${abonos.length === 1 ? '' : 's'} realizado${abonos.length === 1 ? '' : 's'}`,
            icon: CircleCheck,
            tone: 'green',
          },
          { label: 'Saldo pendiente', value: `$${saldoPendiente.toLocaleString('es-CO')}`, icon: Wallet, tone: 'amber' },
          { label: 'Cuota', value: `$${cuota.toLocaleString('es-CO')}`, icon: CalendarClock, tone: 'neutral' },
        ]}
      />

      {/* Barra de progreso */}
      <Card className="gap-2 px-6 py-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Avance del préstamo · {p.cuotas_pagadas}/{p.num_cuotas} cuotas</span>
          <span className="tabular-nums">{pct} % abonado</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {/* Historial de abonos */}
      <Card className="gap-0 overflow-hidden">
        <CardHeader className="border-b pb-5">
          <CardTitle>Historial de abonos</CardTitle>
          <CardDescription>Del más reciente al más antiguo</CardDescription>
        </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={thead}>
                <tr>
                  <th className="px-6 py-2.5 text-left font-semibold">Fecha</th>
                  <th className={`${th} text-right`}>Valor</th>
                  <th className={`${th} hidden text-left sm:table-cell`}>Medio de pago</th>
                  <th className={`${th} hidden text-left md:table-cell`}>Referencia</th>
                  <th className={`${th} hidden text-left lg:table-cell`}>Nota</th>
                  <th className={`${RECIBO_DE_ABONO_VISIBLE ? th : 'px-6 py-2.5 font-semibold'} text-right`}>Saldo tras abono</th>
                  {RECIBO_DE_ABONO_VISIBLE && <th className={th}></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abonos.length === 0 ? (
                  <tr>
                    <td colSpan={RECIBO_DE_ABONO_VISIBLE ? 7 : 6} className="px-6 py-10 text-center text-muted-foreground">
                      Sin abonos registrados aún.
                    </td>
                  </tr>
                ) : (
                  // Mostrar de más reciente a más antiguo (backend devuelve ASC).
                  [...abonos].reverse().map((a: AbonoPrestamo) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-6 py-3">
                        {fmtFecha(a.fecha)}
                        <span className="block text-xs text-muted-foreground sm:hidden">{a.medio_pago_label}</span>
                      </td>
                      <td className={`${td} text-right tabular-nums text-foreground`}>
                        ${toNumber(a.valor).toLocaleString('es-CO')}
                      </td>
                      <td className={`${td} hidden text-muted-foreground sm:table-cell`}>
                        {a.medio_pago_label}
                        {a.tipo === 'NOMINA' && (
                          <Badge variant="secondary" className="ml-1.5" title={`Registrado por ${a.registrado_por}`}>
                            Nómina
                          </Badge>
                        )}
                        {a.tipo === 'LIQUIDACION_FINAL' && (
                          <Badge variant="warning" className="ml-1.5" title="Saldado al pagar la liquidación final de contrato">
                            Liquidación final
                          </Badge>
                        )}
                      </td>
                      <td className={`${td} hidden text-xs text-muted-foreground md:table-cell`}>{a.referencia || '—'}</td>
                      <td className={`${td} hidden text-muted-foreground lg:table-cell`}>{a.nota || '—'}</td>
                      <td className={`${RECIBO_DE_ABONO_VISIBLE ? td : 'px-6 py-3'} text-right font-semibold tabular-nums text-foreground`}>
                        ${toNumber(a.saldo_tras_abono).toLocaleString('es-CO')}
                      </td>
                      {RECIBO_DE_ABONO_VISIBLE && <td className={`${td} text-right`}>
                        {/* El recibo de este pago, para entregárselo al
                            colaborador. Sin el préstamo cargado no se puede
                            armar la cabecera, así que el botón no sale. */}
                        {prestamo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void descargarComprobanteAbono(prestamo, a)}
                            title="Descargar el comprobante de este abono"
                          >
                            <Download strokeWidth={2} />
                            Recibo
                          </Button>
                        )}
                      </td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </Card>

      {/* Modal nuevo abono */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
            <DialogDescription>
              {prestamo?.empleado ? `${prestamo.empleado.nombre_completo} · ` : ''}{p.concepto}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info saldo actual */}
            <div className="rounded-lg bg-muted/60 px-4 py-3">
              <FilaMonto
                label="Saldo pendiente actual"
                value={`$${saldoPendiente.toLocaleString('es-CO')}`}
                strong
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="abono-fecha">Fecha del abono</Label>
                <Input id="abono-fecha"
                  type="date"
                  value={form.fecha}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="abono-valor">{saldarTodo ? 'Valor a pagar' : 'Valor del abono'}</Label>
                <Input
                  id="abono-valor"
                  type="text"
                  inputMode="numeric"
                  placeholder={saldarTodo
                    ? `Saldo: $${saldoPendiente.toLocaleString('es-CO')}`
                    : `Cuota: $${cuota.toLocaleString('es-CO')}`}
                  value={formatThousands(form.valor)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valor: parseCOP(e.target.value) }))
                  }
                  disabled
                  title="Es el valor de la próxima cuota pendiente del calendario"
                />
                <p className="text-xs text-muted-foreground">
                  {saldarTodo
                    ? `Se aplican las ${cuotasPendientes} cuotas pendientes.`
                    : 'Se aplica la próxima cuota completa. No se puede partir.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abono-medio">Medio de pago</Label>
              <Select
                value={form.medioPago}
                onValueChange={(v) => setForm((f) => ({ ...f, medioPago: v as MedioPagoAbono }))}
              >
                <SelectTrigger id="abono-medio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abono-ref">
                Referencia o comprobante <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="abono-ref"
                placeholder="Ej: TRF-20260713, cheque 001234"
                value={form.referencia}
                onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abono-nota">
                Nota <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="abono-nota"
                placeholder="Observación sobre este abono"
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                maxLength={500}
              />
            </div>

            {/* §8.3 — El colaborador consiguió el dinero y paga lo que
                queda: se aplican todas las cuotas pendientes de una vez. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                checked={saldarTodo}
                onCheckedChange={(v) => setSaldarTodo(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                <span className="font-medium">Saldar el préstamo completo</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Paga las {cuotasPendientes} cuota{cuotasPendientes === 1 ? '' : 's'} que
                  quedan y deja el préstamo en cero.
                </span>
              </span>
            </label>

            {/* Vista previa */}
            <div className="space-y-1 rounded-lg bg-muted/60 px-4 py-3">
              <FilaMonto label="Saldo antes" value={`$${saldoPendiente.toLocaleString('es-CO')}`} />
              <FilaMonto
                label="Abono"
                value={`−$${(saldarTodo ? saldoPendiente : cuota).toLocaleString('es-CO')}`}
              />
              <FilaMonto
                label="Saldo después"
                value={`$${saldarTodo ? 0 : Math.max(0, saldoPendiente - cuota).toLocaleString('es-CO')}`}
                strong
                className="border-t border-border pt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarAbono}
              disabled={guardando}
            >
              {guardando
                ? <Loader2 className="animate-spin" strokeWidth={2} />
                : <Check strokeWidth={2} />}
              {saldarTodo ? 'Saldar préstamo' : 'Registrar abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
