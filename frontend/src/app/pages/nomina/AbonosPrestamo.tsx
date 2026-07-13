/**
 * Abonos del Préstamo — pantalla que muestra el historial de abonos aplicados
 * a un préstamo y permite registrar abonos directos (transferencia, efectivo,
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
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import {
  ArrowLeft, Plus, DollarSign, Calendar, CheckCircle2, Clock, Loader2,
} from 'lucide-react';
import {
  prestamosApi,
  PrestamoErrorCodes,
  type MedioPagoAbono,
  type HistorialAbonos,
  type AbonoPrestamo,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatThousands, parseCOP } from '../../components/lib/format';

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

function fmtFecha(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AbonosPrestamo() {
  const { prestamoId } = useParams();
  const navigate = useNavigate();

  const [historial, setHistorial] = useState<HistorialAbonos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
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

  // Cargar historial + resumen desde el backend.
  const cargar = () => {
    if (!prestamoId) return;
    setCargando(true);
    prestamosApi
      .historialAbonos(parseInt(prestamoId))
      .then((res) => setHistorial(res.data))
      .catch((err: ApiError) => {
        toast.error(err.message ?? 'No se pudo cargar el historial de abonos');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamoId]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando abonos del préstamo...
      </div>
    );
  }
  if (!historial) {
    return (
      <div className="p-8 text-muted-foreground">Préstamo no encontrado.</div>
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

  const estadoBadgeClass =
    p.estado === 'VIGENTE'
      ? 'bg-primary/10 text-primary border-primary/20'
      : p.estado === 'PAGADO'
        ? 'bg-success/10 text-success border-success/20'
        : 'bg-success/10 text-success border-success/20';

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
      });
      setHistorial(res.data);
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        valor: '',
        medioPago: 'TRANSFERENCIA',
        referencia: '',
        nota: '',
      });
      setModalAbierto(false);
      toast.success(res.message ?? 'Abono registrado');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.PRESTAMO_NO_VIGENTE) {
        toast.error('El préstamo no está vigente. No se pueden registrar más abonos.');
      } else if (e.code === PrestamoErrorCodes.PRESTAMO_SIN_CUOTAS_PENDIENTES) {
        toast.error('Todas las cuotas del préstamo ya fueron aplicadas.');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el abono');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Volver + header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina/prestamos">
            <ArrowLeft className="h-4 w-4" />
            Volver a Préstamos
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Abonos del Préstamo</h1>
            <p className="text-muted-foreground mt-1">
              {p.concepto}
            </p>
          </div>
          {puedeRegistrarAbono && (
            <Button
              onClick={() => setModalAbierto(true)}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Abono
            </Button>
          )}
        </div>
      </div>

      {/* Resumen del préstamo */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-6 items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {p.concepto}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className={estadoBadgeClass}>
                  {p.estado === 'VIGENTE' ? 'Vigente' : p.estado === 'PAGADO' ? 'Pagado' : 'Cancelado'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Monto Total</p>
                <p className="font-bold text-lg">${montoTotal.toLocaleString('es-CO')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total Abonado</p>
                <p className="font-bold text-lg text-primary">
                  ${totalAbonado.toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Saldo Pendiente</p>
                <p className={`font-bold text-lg ${saldoPendiente === 0 ? 'text-success' : 'text-foreground'}`}>
                  ${saldoPendiente.toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Cuota</p>
                <p className="font-bold text-lg">${cuota.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Avance del préstamo ({p.cuotas_pagadas}/{p.num_cuotas} cuotas)</span>
              <span>{pct}% abonado</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Abonos realizados</p>
              <p className="text-xl font-bold">{abonos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total abonado</p>
              <p className="text-xl font-bold text-primary">
                ${totalAbonado.toLocaleString('es-CO')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className={`text-xl font-bold ${saldoPendiente === 0 ? 'text-success' : 'text-amber-600'}`}>
                ${saldoPendiente.toLocaleString('es-CO')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de abonos */}
      <Card className="border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Historial de Abonos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Valor Abono</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Medio de Pago</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Referencia</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Nota</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Saldo Tras Abono</th>
                </tr>
              </thead>
              <tbody>
                {abonos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Sin abonos registrados aún.
                    </td>
                  </tr>
                ) : (
                  // Mostrar de más reciente a más antiguo (backend devuelve ASC).
                  [...abonos].reverse().map((a: AbonoPrestamo, idx) => (
                    <tr
                      key={a.id}
                      className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmtFecha(a.fecha)}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-primary">
                        ${toNumber(a.valor).toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {a.medio_pago_label}
                        {a.tipo === 'NOMINA' && (
                          <span
                            className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium align-middle"
                            title={`Registrado por ${a.registrado_por}`}
                          >
                            Nómina
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{a.referencia || '—'}</td>
                      <td className="p-4 text-muted-foreground">{a.nota || '—'}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${toNumber(a.saldo_tras_abono) === 0 ? 'text-success' : 'text-foreground'}`}>
                          ${toNumber(a.saldo_tras_abono).toLocaleString('es-CO')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal nuevo abono */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Registrar Nuevo Abono
            </DialogTitle>
            <DialogDescription>
              {p.concepto} · Se aplicará la próxima cuota pendiente (${cuota.toLocaleString('es-CO')})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info saldo actual */}
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo pendiente actual</span>
              <span className="font-bold text-foreground">
                ${saldoPendiente.toLocaleString('es-CO')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha del abono</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor del abono</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={cuota.toLocaleString('es-CO')}
                    value={formatThousands(form.valor)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valor: parseCOP(e.target.value) }))
                    }
                    className="pl-7"
                    disabled
                    title="El valor lo determina automáticamente el backend según la cuota"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  El backend aplica el monto de la cuota pendiente.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Medio de pago</Label>
              <Select
                value={form.medioPago}
                onValueChange={(v) => setForm((f) => ({ ...f, medioPago: v as MedioPagoAbono }))}
              >
                <SelectTrigger>
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
              <Label>
                Referencia / Comprobante <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Ej: TRF-20260713, Cheque 001234..."
                value={form.referencia}
                onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Nota <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Observación sobre este abono..."
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                maxLength={500}
              />
            </div>

            {/* Vista previa */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo antes</span>
                <span>${saldoPendiente.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>— Abono</span>
                <span>-${cuota.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-1 mt-1">
                <span>Saldo después</span>
                <span className={saldoPendiente - cuota <= 0 ? 'text-success' : 'text-foreground'}>
                  ${Math.max(0, saldoPendiente - cuota).toLocaleString('es-CO')}
                </span>
              </div>
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
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Registrar Abono
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
