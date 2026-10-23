/**
 * Detalle de un Préstamo — `GET /prestamos/{id}` (doc API_PRESTAMOS §3).
 *
 * Muestra:
 *  - Cabecera con datos del colaborador y del préstamo.
 *  - KPIs: valor total, saldo pendiente, cuota, avance.
 *  - Calendario de cuotas (PENDIENTE / APLICADA) con fecha de aplicación.
 *  - Edición inline de `concepto` y `observaciones` (siempre permitido).
 *  - Cancelar (solo si VIGENTE — doc §6, PAGADO/CANCELADO devuelven 422).
 *  - Soporte del préstamo: pagaré o autorización de descuento (§11).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { formatThousands, parseCOP } from '../../components/lib/format';
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
  ArrowLeft, DollarSign, FileSignature, User, TrendingDown, Check, Loader2, Save, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi,
  PrestamoErrorCodes,
  type Prestamo,
  type EstadoPrestamo,
  type EditarPrestamoPayload,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { SoportePrestamoCard } from '../../components/nomina/SoportePrestamoCard';
import { descargarComprobantePrestamo } from './prestamoPdf';

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIO_ACTUAL = new Date().getFullYear();

/**
 * Mientras nadie haya pagado una cuota, el monto y el calendario se pueden
 * rehacer enteros. Con una cuota aplicada el backend responde
 * `PRESTAMO_NO_EDITABLE` a cualquier campo financiero.
 */
function puedeEditarMontosDe(p: Prestamo): boolean {
  return p.cuotas_pagadas === 0 && p.estado === 'VIGENTE';
}

function periodoCuota(anio: number, mes: number, quincena: number | null): string {
  const mesLabel = MESES[mes - 1] ?? String(mes);
  const q = quincena ? ` · Q${quincena}` : '';
  return `${mesLabel} ${anio}${q}`;
}

/** Formatea ISO datetime a dd/mm/yyyy sin desfase. */
const fmtFecha = (s: string | null | undefined): string => formatFecha(s, { day: '2-digit', month: '2-digit', year: 'numeric' });

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
  /**
   * Lo financiero solo viaja mientras `cuotas_pagadas` sea 0: con una cuota
   * aplicada el backend responde `PRESTAMO_NO_EDITABLE`. Se guardan como texto
   * porque vienen de inputs.
   */
  const [editValorTotal, setEditValorTotal] = useState('');
  const [editNumCuotas, setEditNumCuotas] = useState('');
  const [editAnio, setEditAnio] = useState('');
  const [editMes, setEditMes] = useState('');
  const [editQuincena, setEditQuincena] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  // Guard contra respuestas fuera de orden si cambia el id rápido:
  // solo la carga más reciente puede setear estado.
  const reqIdRef = useRef(0);

  const cargar = () => {
    if (!prestamoId) return;
    const reqId = ++reqIdRef.current;
    setCargando(true);
    prestamosApi
      .ver(prestamoId)
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setPrestamo(res.data);
        setEditConcepto(res.data.concepto ?? '');
        setEditObservaciones(res.data.observaciones ?? '');
        setEditValorTotal(String(Math.round(toNumber(res.data.valor_total))));
        setEditNumCuotas(String(res.data.num_cuotas));
        setEditAnio(String(res.data.inicio_anio));
        setEditMes(String(res.data.inicio_mes));
        setEditQuincena(res.data.inicio_quincena ? String(res.data.inicio_quincena) : '');
      })
      .catch((err: ApiError) => {
        if (reqId !== reqIdRef.current) return;
        toast.error(err.message ?? 'Error al cargar préstamo');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestamoId]);

  const guardarEdicion = async () => {
    if (!prestamoId || !prestamo) return;

    const payload: EditarPrestamoPayload = {
      concepto: editConcepto.trim(),
      observaciones: editObservaciones.trim() || null,
    };

    if (puedeEditarMontosDe(prestamo)) {
      const total = parseFloat(editValorTotal) || 0;
      const cuotas = parseInt(editNumCuotas) || 0;
      if (total <= 0) return toast.error('El valor del préstamo debe ser mayor a cero');
      if (cuotas < 1 || cuotas > 120) return toast.error('El número de cuotas va de 1 a 120');
      if (prestamo.frecuencia === 'QUINCENAL' && !editQuincena) {
        return toast.error('Selecciona la quincena de inicio');
      }
      payload.valor_total = total;
      payload.num_cuotas = cuotas;
      payload.inicio_anio = parseInt(editAnio);
      payload.inicio_mes = parseInt(editMes);
      // El backend deriva la frecuencia al crear: en un MENSUAL la quincena
      // siempre va nula.
      payload.inicio_quincena = prestamo.frecuencia === 'QUINCENAL' ? parseInt(editQuincena) : null;
    }

    setGuardando(true);
    try {
      await prestamosApi.editar(prestamoId, payload);
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
  const puedeEditarMontos = puedeEditarMontosDe(prestamo);
  /** Lo que quedaría al guardar: el backend reparte igual y la última absorbe el residuo. */
  const cuotaRecalculada = (() => {
    const total = parseFloat(editValorTotal) || 0;
    const n = parseInt(editNumCuotas) || 0;
    return n > 0 ? Math.floor(total / n) : 0;
  })();
  // El año del préstamo puede ser anterior al actual: sin él, el select se
  // abriría sin la opción que ya tiene guardada.
  const aniosDisponibles = Array.from(
    new Set([prestamo.inicio_anio, ANIO_ACTUAL, ANIO_ACTUAL + 1]),
  ).sort((a, b) => a - b);

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{prestamo.concepto}</h1>
              <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
              <Badge variant="outline" className="text-xs">{prestamo.frecuencia}</Badge>
            </div>
            <p className="text-muted-foreground">
              {prestamo.empleado.nombre_completo} · CC {prestamo.empleado.documento} · {prestamo.empleado.cargo}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* El pagaré con la autorización de descuento (CST arts. 149-150)
                para imprimir, firmar y subir después como soporte. */}
            <Button
              variant="outline"
              onClick={() => void descargarComprobantePrestamo(prestamo)}
              className="gap-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/5"
            >
              <FileSignature className="h-4 w-4" />
              Comprobante para firma
            </Button>
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
                  className="h-full bg-success rounded-full transition duration-500"
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
            <Label htmlFor="prestamode-concepto">Concepto</Label>
            <Input id="prestamode-concepto"
              value={editConcepto}
              onChange={(e) => setEditConcepto(e.target.value)}
              placeholder="Ej: Préstamo personal"
            />
          </div>
          {/* Mientras no se aplique ninguna cuota el calendario se rehace
              entero, que es lo que el backend permite. Con una sola cuota
              pagada esto desaparece y responde `PRESTAMO_NO_EDITABLE`. */}
          {puedeEditarMontos && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                Todavía no se ha aplicado ninguna cuota, así que el monto y el calendario
                se pueden corregir. Al guardar se vuelven a generar todas las cuotas.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Valor del préstamo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      inputMode="numeric"
                      value={formatThousands(editValorTotal)}
                      onChange={(e) => setEditValorTotal(parseCOP(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {prestamo.frecuencia === 'QUINCENAL' ? 'Número de quincenas' : 'Número de meses'}
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={editNumCuotas}
                    onChange={(e) => setEditNumCuotas(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="prestamode-ano-de-inicio">Año de inicio</Label>
                  <Select value={editAnio} onValueChange={setEditAnio}>
                    <SelectTrigger id="prestamode-ano-de-inicio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {aniosDisponibles.map((a) => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prestamode-mes-de-inicio">Mes de inicio</Label>
                  <Select value={editMes} onValueChange={setEditMes}>
                    <SelectTrigger id="prestamode-mes-de-inicio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {prestamo.frecuencia === 'QUINCENAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="prestamode-quincena">Quincena</Label>
                    <Select value={editQuincena} onValueChange={setEditQuincena}>
                      <SelectTrigger id="prestamode-quincena"><SelectValue placeholder="Elegir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1ª quincena (1-15)</SelectItem>
                        <SelectItem value="2">2ª quincena (16-fin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {cuotaRecalculada > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Cuota {prestamo.frecuencia === 'QUINCENAL' ? 'por quincena' : 'por mes'}
                  </span>
                  <span className="font-bold text-primary">
                    ${cuotaRecalculada.toLocaleString('es-CO')}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                La última cuota absorbe el residuo del redondeo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="prestamode-observaciones">Observaciones</Label>
            <Textarea id="prestamode-observaciones"
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

      {/* El pagaré o la autorización de descuento (CST arts. 149-150). La
          tarjeta se oculta sola mientras el backend no exponga el soporte. */}
      <SoportePrestamoCard
        prestamoId={prestamo.id}
        documento={prestamo.documento}
        onCambio={cargar}
      />

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
