/**
 * Detalle de un Préstamo — `GET /prestamos/{id}` (doc API_PRESTAMOS §3).
 *
 * Muestra:
 *  - Cabecera con datos del colaborador y del préstamo.
 *  - KPIs: valor total, saldo pendiente, cuota, avance.
 *  - Calendario de cuotas (PENDIENTE / APLICADA) con fecha de aplicación.
 *  - Edición inline de `concepto` y `observaciones` (siempre permitido).
 *  - Cancelar (solo si VIGENTE — doc §6, PAGADO/CANCELADO devuelven 422).
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft, DollarSign, User, TrendingDown, Check, Loader2, Save, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi,
  PrestamoErrorCodes,
  type Prestamo,
  type EstadoPrestamo,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function periodoCuota(anio: number, mes: number, quincena: number | null): string {
  const mesLabel = MESES[mes - 1] ?? String(mes);
  const q = quincena ? ` · Q${quincena}` : '';
  return `${mesLabel} ${anio}${q}`;
}

/** Formatea ISO datetime a dd/mm/yyyy sin desfase. */
function fmtFecha(s: string | null | undefined): string {
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const estadoConfig: Record<EstadoPrestamo, { label: string; className: string }> = {
  VIGENTE:   { label: 'Vigente',   className: 'bg-primary/10 text-primary border-primary/20' },
  PAGADO:    { label: 'Pagado',    className: 'bg-success/10 text-success border-success/20' },
  CANCELADO: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
};

export default function PrestamoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const prestamoId = id ? parseInt(id) : null;

  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [cargando, setCargando] = useState(true);

  // Formulario editable
  const [editConcepto, setEditConcepto] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const cargar = () => {
    if (!prestamoId) return;
    setCargando(true);
    prestamosApi
      .ver(prestamoId)
      .then((res) => {
        setPrestamo(res.data);
        setEditConcepto(res.data.concepto ?? '');
        setEditObservaciones(res.data.observaciones ?? '');
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar préstamo'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamoId]);

  const guardarEdicion = async () => {
    if (!prestamoId) return;
    setGuardando(true);
    try {
      await prestamosApi.editar(prestamoId, {
        concepto: editConcepto.trim(),
        observaciones: editObservaciones.trim() || null,
      });
      toast.success('Préstamo actualizado');
      navigate('/nomina/prestamos');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.PRESTAMO_NO_EDITABLE) {
        toast.error('Este préstamo ya tiene cuotas aplicadas — solo puedes editar concepto y observaciones');
      } else {
        toast.error(e.message ?? 'No se pudo actualizar');
      }
    } finally {
      setGuardando(false);
    }
  };

  const cancelarPrestamo = async () => {
    if (!prestamoId) return;
    setCancelando(true);
    try {
      await prestamosApi.eliminar(prestamoId);
      toast.success('Préstamo cancelado');
      navigate('/nomina/prestamos');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cancelar');
    } finally {
      setCancelando(false);
      setConfirmarCancelar(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando préstamo...
      </div>
    );
  }

  if (!prestamo) {
    return (
      <div className="text-center py-20 text-muted-foreground">Préstamo no encontrado.</div>
    );
  }

  const cfg = estadoConfig[prestamo.estado] ?? estadoConfig.CANCELADO;
  const total = toNumber(prestamo.valor_total);
  const saldo = toNumber(prestamo.saldo_pendiente);
  const cuota = toNumber(prestamo.cuota_valor);
  const cuotas = prestamo.cuotas ?? [];
  const pagadasCount = cuotas.filter((c) => c.estado === 'APLICADA').length;
  const pctAvance = prestamo.num_cuotas > 0
    ? Math.round((prestamo.cuotas_pagadas / prestamo.num_cuotas) * 100)
    : 0;
  const puedeCancelar = prestamo.estado === 'VIGENTE';

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/nomina">Pagos</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/nomina/prestamos">Préstamos</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>#{prestamo.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina/prestamos">
            <ArrowLeft className="h-4 w-4" />
            Volver a Préstamos
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary">{prestamo.concepto}</h1>
              <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
              <Badge variant="outline" className="text-xs">{prestamo.frecuencia}</Badge>
            </div>
            <p className="text-muted-foreground">
              {prestamo.empleado.nombre_completo} · CC {prestamo.empleado.documento} · {prestamo.empleado.cargo}
            </p>
          </div>
          {puedeCancelar && (
            <Button
              variant="outline"
              onClick={() => setConfirmarCancelar(true)}
              className="gap-2 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              <Trash2 className="h-4 w-4" />
              Cancelar préstamo
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Valor total</p>
                <p className="text-2xl font-bold">${total.toLocaleString('es-CO')}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Saldo pendiente</p>
                <p className={`text-2xl font-bold ${saldo === 0 ? 'text-success' : 'text-primary'}`}>
                  ${saldo.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Cuota</p>
                <p className="text-2xl font-bold">${cuota.toLocaleString('es-CO')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prestamo.frecuencia === 'QUINCENAL' ? 'Por quincena' : 'Por mes'}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Avance</p>
              <p className="text-2xl font-bold">
                {prestamo.avance ?? `${prestamo.cuotas_pagadas}/${prestamo.num_cuotas}`}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${pctAvance}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pctAvance}% pagado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario editable — concepto y observaciones siempre editables */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Editar información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prestamo.cuotas_pagadas > 0 && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-sm">
              Este préstamo ya tiene <strong>{prestamo.cuotas_pagadas} cuota(s) aplicada(s)</strong>.
              Solo puedes editar concepto y observaciones. Cambiar el valor total o el número de cuotas
              requiere cancelar el préstamo y crear uno nuevo.
            </div>
          )}
          <div className="space-y-2">
            <Label>Concepto</Label>
            <Input
              value={editConcepto}
              onChange={(e) => setEditConcepto(e.target.value)}
              placeholder="Ej: Préstamo personal"
            />
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={guardarEdicion}
              disabled={guardando || !editConcepto.trim()}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendario de cuotas */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Calendario de cuotas</CardTitle>
          <p className="text-sm text-muted-foreground">
            {cuotas.length} cuotas · {pagadasCount} aplicada{pagadasCount !== 1 ? 's' : ''} ·{' '}
            {cuotas.length - pagadasCount} pendiente{cuotas.length - pagadasCount !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Período</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Monto</th>
                  <th className="text-center p-4 text-xs font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Aplicada</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                      No hay cuotas registradas.
                    </td>
                  </tr>
                ) : (
                  cuotas.map((c, idx) => {
                    const aplicada = c.estado === 'APLICADA';
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border last:border-0 ${
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4 text-sm font-semibold">#{c.numero_cuota}</td>
                        <td className="p-4 text-sm">{periodoCuota(c.anio, c.mes, c.quincena)}</td>
                        <td className="p-4 text-right text-sm font-medium">
                          ${toNumber(c.monto).toLocaleString('es-CO')}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              aplicada
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-amber-500/10 text-amber-700 border-amber-300'
                            }`}
                          >
                            {aplicada ? (
                              <>
                                <Check className="h-3 w-3 mr-1 inline" />
                                Aplicada
                              </>
                            ) : (
                              'Pendiente'
                            )}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {fmtFecha(c.aplicada_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              El préstamo quedará en estado CANCELADO. Las cuotas PENDIENTES dejarán de aparecer
              en el preview de liquidación de los siguientes períodos. Las cuotas ya APLICADAS
              en nóminas cerradas se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelando}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelarPrestamo}
              disabled={cancelando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {cancelando ? 'Cancelando...' : 'Cancelar préstamo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
