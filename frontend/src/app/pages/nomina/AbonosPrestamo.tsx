/**
 * Abonos del Préstamo — pantalla que lista los abonos aplicados a un préstamo
 * puntual y permite registrar nuevos abonos manuales.
 *
 * Estado actual del backend:
 *  - El API de préstamos SOLO expone `prestamosApi.ver(id)` (cabecera + cuotas
 *    aplicadas automáticamente por descuento de nómina).
 *  - No existe endpoint `POST /prestamos/{id}/abonos` para abonos manuales
 *    (transferencia / efectivo / cheque). La UI queda montada esperando ese
 *    endpoint — por ahora los abonos manuales se guardan solo en memoria y
 *    se muestra un aviso al usuario.
 *
 * Los abonos automáticos (cuotas descontadas por nómina) SÍ vienen del backend
 * en el detalle del préstamo. Se muestran en la tabla junto con los manuales.
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
  ArrowLeft, Plus, DollarSign, Calendar, CheckCircle2, Clock, Loader2, Info,
} from 'lucide-react';
import { prestamosApi, type Prestamo } from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatThousands, parseCOP } from '../../components/lib/format';

const MEDIOS_PAGO = ['Descuento nómina', 'Transferencia', 'Efectivo', 'Cheque', 'Otro'];

interface AbonoLocal {
  id: string;
  fecha: string;
  valor: number;
  medioPago: string;
  referencia: string;
  nota: string;
  /** true si es un abono manual creado en esta sesión (mock local). */
  esManualLocal?: boolean;
}

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

  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abonos, setAbonos] = useState<AbonoLocal[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    valor: '',
    medioPago: 'Transferencia',
    referencia: '',
    nota: '',
  });

  // ── Carga del préstamo + hidratación de abonos automáticos ─────────────────
  useEffect(() => {
    if (!prestamoId) return;
    setCargando(true);
    prestamosApi
      .ver(parseInt(prestamoId))
      .then((res) => {
        setPrestamo(res.data);
        // Hidratamos con las cuotas ya aplicadas por el backend (si vienen).
        // Cada cuota aplicada equivale a un abono automático por "Descuento
        // nómina". Como el endpoint aún no expone la lista de aplicaciones,
        // se muestra vacío por ahora — el backend lo enviará después.
        setAbonos([]);
      })
      .catch((err: ApiError) => {
        toast.error(err.message ?? 'No se pudo cargar el préstamo');
      })
      .finally(() => setCargando(false));
  }, [prestamoId]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando préstamo...
      </div>
    );
  }
  if (!prestamo) {
    return (
      <div className="p-8 text-muted-foreground">Préstamo no encontrado.</div>
    );
  }

  const montoTotal = toNumber(prestamo.valor_total);
  const cuota = toNumber(prestamo.cuota_valor);
  const totalAbonadoLocal = abonos.reduce((s, a) => s + a.valor, 0);
  // Saldo pendiente = el del backend menos los abonos manuales locales.
  const saldoBackend = toNumber(prestamo.saldo_pendiente);
  const saldoActual = Math.max(0, saldoBackend - totalAbonadoLocal);
  const nombreColab = prestamo.empleado?.nombre_completo ?? '—';
  const cedulaColab = prestamo.empleado?.documento ?? '—';
  const pct = montoTotal > 0
    ? Math.round(((montoTotal - saldoActual) / montoTotal) * 100)
    : 0;
  const estaVigente = prestamo.estado === 'VIGENTE';
  const estadoBadgeClass = estaVigente
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-success/10 text-success border-success/20';

  const guardarAbono = async () => {
    const valor = parseFloat(form.valor);
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error('El valor debe ser mayor a 0');
      return;
    }
    setGuardando(true);
    try {
      // TODO: cuando el backend implemente `POST /prestamos/{id}/abonos`,
      // reemplazar este bloque por la llamada real.
      // await prestamosApi.registrarAbono(prestamo.id, { ... });
      const nuevo: AbonoLocal = {
        id: `local-${Date.now()}`,
        fecha: form.fecha,
        valor,
        medioPago: form.medioPago,
        referencia: form.referencia.trim(),
        nota: form.nota.trim(),
        esManualLocal: true,
      };
      setAbonos((prev) => [nuevo, ...prev]);
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        valor: '',
        medioPago: 'Transferencia',
        referencia: '',
        nota: '',
      });
      setModalAbierto(false);
      toast.info(
        'Abono registrado localmente. El backend aún no expone el endpoint para persistirlo.',
        { duration: 6000 },
      );
    } finally {
      setGuardando(false);
    }
  };

  // Cálculo de saldo tras cada abono (orden cronológico).
  const abonosConSaldo = (() => {
    let saldoAcumulado = montoTotal;
    const ordenados = [...abonos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const conSaldo = ordenados.map((a) => {
      saldoAcumulado = Math.max(0, saldoAcumulado - a.valor);
      return { ...a, saldoTras: saldoAcumulado };
    });
    return conSaldo.reverse();
  })();

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
              {nombreColab} · CC {cedulaColab}
            </p>
          </div>
          {estaVigente && (
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

      {/* Aviso — endpoint pendiente */}
      <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex gap-3">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <p className="font-semibold">Los abonos manuales aún no persisten en el backend.</p>
          <p className="mt-0.5">
            El endpoint <code className="bg-amber-100 px-1 rounded">POST /prestamos/{'{'}id{'}'}/abonos</code>{' '}
            está pendiente. Por ahora los abonos que registres desde esta pantalla se muestran
            en memoria; al recargar se perderán. La API se conectará cuando el backend la exponga.
          </p>
        </div>
      </div>

      {/* Resumen del préstamo */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-6 items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {prestamo.concepto}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className={estadoBadgeClass}>
                  {estaVigente ? 'Vigente' : (prestamo.estado === 'PAGADO' ? 'Pagado' : 'Cancelado')}
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
                  ${(montoTotal - saldoActual).toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Saldo Pendiente</p>
                <p className={`font-bold text-lg ${saldoActual === 0 ? 'text-success' : 'text-foreground'}`}>
                  ${saldoActual.toLocaleString('es-CO')}
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
              <span>Avance del préstamo</span>
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
                ${(montoTotal - saldoActual).toLocaleString('es-CO')}
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
              <p className={`text-xl font-bold ${saldoActual === 0 ? 'text-success' : 'text-amber-600'}`}>
                ${saldoActual.toLocaleString('es-CO')}
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
                {abonosConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Sin abonos registrados aún.
                    </td>
                  </tr>
                ) : (
                  abonosConSaldo.map((a, idx) => (
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
                        ${a.valor.toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {a.medioPago}
                        {a.esManualLocal && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium align-middle">
                            local
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{a.referencia || '—'}</td>
                      <td className="p-4 text-muted-foreground">{a.nota || '—'}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${a.saldoTras === 0 ? 'text-success' : 'text-foreground'}`}>
                          ${a.saldoTras.toLocaleString('es-CO')}
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
              {nombreColab} · {prestamo.concepto}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info saldo */}
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo pendiente actual</span>
              <span className="font-bold text-foreground">${saldoActual.toLocaleString('es-CO')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha del abono</Label>
                <Input
                  type="date"
                  value={form.fecha}
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
                    placeholder={`Cuota: ${cuota.toLocaleString('es-CO')}`}
                    value={formatThousands(form.valor)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valor: parseCOP(e.target.value) }))
                    }
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Medio de pago</Label>
              <Select
                value={form.medioPago}
                onValueChange={(v) => setForm((f) => ({ ...f, medioPago: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Referencia / Comprobante <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                placeholder="Ej: NOM-MAY-2026, TRF-123..."
                value={form.referencia}
                onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
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
              />
            </div>

            {/* Vista previa */}
            {form.valor && parseFloat(form.valor) > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo antes</span>
                  <span>${saldoActual.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>— Abono</span>
                  <span>-${parseFloat(form.valor).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1 mt-1">
                  <span>Saldo después</span>
                  <span className={saldoActual - parseFloat(form.valor) <= 0 ? 'text-success' : 'text-foreground'}>
                    ${Math.max(0, saldoActual - parseFloat(form.valor)).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              onClick={guardarAbono}
              disabled={!form.valor || parseFloat(form.valor) <= 0 || guardando}
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
