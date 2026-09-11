/**
 * Wizard "Liquidar Cesantías" — 3 pasos sobre un período BORRADOR, y vista
 * de solo lectura + Reabrir cuando está CERRADA.
 * Conectado a API_LIQUIDACIONES §2.5, §3 y §4 (PR-L3). Diseño V.24.
 *
 * Flujo real: el paso 2 persiste filas con POST /colaboradores (éxito
 * parcial con omitidos); el paso 3 pinta GET /preview y confirma con el
 * calculo_hash. Si los insumos cambian entre el preview y el clic, el
 * backend responde LIQUIDACION_DESACTUALIZADA y se recarga el paso 3.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Check, Users, Calendar, X,
  PiggyBank, CheckCircle, TrendingUp, Loader2, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  liquidacionesApi,
  LiquidacionesErrorCodes,
  MOTIVO_EXCLUSION_LABEL,
  type LiquidacionPeriodoDetalle,
  type EmpleadoDisponibleLiquidacion,
  type EmpleadoExcluidoLiquidacion,
  type PreviewLiquidacionPeriodo,
} from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

/** Cesantías se presentan con centavos cuando los hay. */
const fmtCOP = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;

const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ── Step indicator (diseño V.24, sin cambios) ────────────────────────────────
const pasos = [
  { numero: 1, titulo: 'Información del Período', icono: Calendar },
  { numero: 2, titulo: 'Seleccionar Colaboradores', icono: Users },
  { numero: 3, titulo: 'Confirmación', icono: Check },
];

function StepBar({ actual }: { actual: number }) {
  return (
    <div className="flex items-center gap-0">
      {pasos.map((paso, idx) => {
        const completado = actual > paso.numero;
        const activo = actual === paso.numero;
        const Icono = paso.icono;
        return (
          <div key={paso.numero} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                completado ? 'bg-primary border-primary' : activo ? 'border-primary bg-primary/10' : 'border-border bg-background'
              }`}>
                {completado
                  ? <Check className="h-5 w-5 text-white" />
                  : <Icono className={`h-5 w-5 ${activo ? 'text-primary' : 'text-muted-foreground'}`} />}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${activo || completado ? 'text-primary' : 'text-muted-foreground'}`}>
                  Paso {paso.numero}
                </p>
                <p className={`text-xs ${activo ? 'text-foreground' : 'text-muted-foreground'} hidden sm:block`}>
                  {paso.titulo}
                </p>
              </div>
            </div>
            {idx < pasos.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${actual > paso.numero ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CesantiasDetalle() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const periodoId = idParam ? parseInt(idParam) : null;

  const [periodo, setPeriodo] = useState<LiquidacionPeriodoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState(1);

  // Paso 2
  const [elegibles, setElegibles] = useState<EmpleadoDisponibleLiquidacion[]>([]);
  const [excluidos, setExcluidos] = useState<EmpleadoExcluidoLiquidacion[]>([]);
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
  /** Elegibles marcados, aún sin persistir (se agregan al pasar al paso 3). */
  const [marcados, setMarcados] = useState<number[]>([]);
  const [quitandoFila, setQuitandoFila] = useState<number | null>(null);

  // Paso 3
  const [preview, setPreview] = useState<PreviewLiquidacionPeriodo | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [avanzando, setAvanzando] = useState(false);

  // Cobertura < 100 % → diálogo de forzar con motivo
  const [coberturaDialog, setCoberturaDialog] = useState<
    Array<{ nombre_completo: string; cobertura_pct: number }> | null
  >(null);
  const [motivoForzado, setMotivoForzado] = useState('');

  // Reabrir (período CERRADA)
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [motivoReabrir, setMotivoReabrir] = useState('');
  const [reabriendo, setReabriendo] = useState(false);

  const reqIdRef = useRef(0);

  const cargarPeriodo = async () => {
    if (!periodoId) return null;
    const reqId = ++reqIdRef.current;
    try {
      const res = await liquidacionesApi.ver(periodoId);
      if (reqId !== reqIdRef.current) return null;
      setPeriodo(res.data);
      return res.data;
    } catch (err) {
      if (reqId !== reqIdRef.current) return null;
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo cargar el período');
      return null;
    }
  };

  useEffect(() => {
    setCargando(true);
    cargarPeriodo().finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId]);

  const cargarDisponibles = async () => {
    if (!periodoId) return;
    setCargandoDisponibles(true);
    try {
      const res = await liquidacionesApi.colaboradoresDisponibles(periodoId);
      setElegibles(res.data.empleados);
      setExcluidos(res.meta.excluidos ?? []);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron cargar los colaboradores');
    } finally {
      setCargandoDisponibles(false);
    }
  };

  const cargarPreview = async () => {
    if (!periodoId) return false;
    setCargandoPreview(true);
    try {
      const res = await liquidacionesApi.preview(periodoId);
      setPreview(res.data);
      return true;
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_SIN_COLABORADORES) {
        toast.error('Agrega al menos un colaborador antes de continuar');
      } else {
        toast.error(e.message ?? 'No se pudo calcular el preview');
      }
      return false;
    } finally {
      setCargandoPreview(false);
    }
  };

  const toggleMarcado = (empleadoId: number) =>
    setMarcados(prev => prev.includes(empleadoId) ? prev.filter(x => x !== empleadoId) : [...prev, empleadoId]);

  const toggleTodos = () =>
    setMarcados(marcados.length === elegibles.length ? [] : elegibles.map(e => e.id));

  const quitarFila = async (filaId: number) => {
    if (!periodoId) return;
    setQuitandoFila(filaId);
    try {
      await liquidacionesApi.quitarColaborador(periodoId, filaId);
      await cargarPeriodo();
      await cargarDisponibles();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo quitar el colaborador');
    } finally {
      setQuitandoFila(null);
    }
  };

  /** Paso 2 → 3: persiste los marcados (éxito parcial) y calcula el preview. */
  const avanzarAConfirmacion = async () => {
    if (!periodoId || !periodo) return;
    const filasActuales = periodo.filas.length;
    if (marcados.length === 0 && filasActuales === 0) {
      toast.error('Selecciona al menos un colaborador');
      return;
    }
    setAvanzando(true);
    try {
      if (marcados.length > 0) {
        const res = await liquidacionesApi.agregarColaboradores(periodoId, { empleado_ids: marcados });
        if ((res.omitidos ?? []).length > 0) {
          const detalle = res.omitidos
            .map((o) => `${o.nombre_completo} (${MOTIVO_EXCLUSION_LABEL[o.code] ?? o.code})`)
            .join(', ');
          toast.warning(`No se agregaron: ${detalle}`, { duration: 8000 });
        }
        setMarcados([]);
        await cargarPeriodo();
      }
      const ok = await cargarPreview();
      if (ok) setPaso(3);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron agregar los colaboradores');
    } finally {
      setAvanzando(false);
    }
  };

  const avanzar = async () => {
    if (paso === 1) {
      setPaso(2);
      if (elegibles.length === 0 && !cargandoDisponibles) cargarDisponibles();
      return;
    }
    if (paso === 2) await avanzarAConfirmacion();
  };
  const retroceder = () => setPaso(p => p - 1);

  const confirmar = async (forzar = false) => {
    if (!periodoId || !preview) return;
    if (forzar && motivoForzado.trim().length < 5) {
      toast.error('Escribe el motivo para forzar la confirmación');
      return;
    }
    setConfirmando(true);
    try {
      const res = await liquidacionesApi.confirmar(periodoId, {
        calculo_hash: preview.calculo_hash,
        forzar: forzar || undefined,
        motivo_forzado: forzar ? motivoForzado.trim() : undefined,
      });
      setCoberturaDialog(null);
      toast.success(res.message ?? 'Liquidación de cesantías confirmada');
      navigate('/liquidaciones');
    } catch (err) {
      const e = err as ApiError & {
        colaboradores?: Array<{ nombre_completo: string; cobertura_pct: number }>;
        detalle?: Array<{ nombre_completo: string; codes: string[] }>;
      };
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_DESACTUALIZADA) {
        toast.warning('Los datos cambiaron desde el cálculo. Se recargó el preview: revisa y confirma de nuevo.', { duration: 8000 });
        await cargarPreview();
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA) {
        setCoberturaDialog(e.colaboradores ?? []);
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_ADVERTENCIAS_BLOQUEANTES) {
        const nombres = (e.detalle ?? []).map((d) => d.nombre_completo).join(', ');
        toast.error(`No se puede confirmar: ${nombres || 'hay filas'} sin días o sin devengado. Quítalos del período o corrige sus datos.`, { duration: 10000 });
      } else {
        toast.error(e.message ?? 'No se pudo confirmar la liquidación');
      }
    } finally {
      setConfirmando(false);
    }
  };

  const reabrir = async () => {
    if (!periodoId) return;
    if (motivoReabrir.trim().length < 5) {
      toast.error('Escribe el motivo de la reapertura (mínimo 5 caracteres)');
      return;
    }
    setReabriendo(true);
    try {
      const res = await liquidacionesApi.reabrir(periodoId, motivoReabrir.trim());
      toast.success(res.message ?? 'Período reabierto');
      setReabrirOpen(false);
      setMotivoReabrir('');
      setPaso(1);
      setPreview(null);
      await cargarPeriodo();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === LiquidacionesErrorCodes.LIQUIDACION_CON_PAGOS) {
        toast.error('No se puede reabrir: hay filas ya consignadas o pagadas');
      } else if (e.code === LiquidacionesErrorCodes.LIQUIDACION_PERIODO_REFERENCIADO) {
        toast.error('Un período de intereses cerrado usa estas cesantías como base');
      } else {
        toast.error(e.message ?? 'No se pudo reabrir el período');
      }
    } finally {
      setReabriendo(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando período...
      </div>
    );
  }
  if (!periodo) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
        </Button>
        <p className="text-muted-foreground">Período no encontrado.</p>
      </div>
    );
  }

  const esCerrada = periodo.estado === 'CERRADA';
  const filasAgregadas = periodo.filas ?? [];

  // ── Vista CERRADA: resumen + reabrir ──────────────────────────────────────
  if (esCerrada) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
            <p className="text-muted-foreground mt-1">
              Cerrada el {periodo.cerrado_at ? formatFecha(periodo.cerrado_at) : '—'}
              {periodo.cerrado_por ? ` por ${periodo.cerrado_por.name}` : ''} · Fecha límite: {formatFecha(periodo.fecha_limite_operativa)}
            </p>
          </div>
          <Button variant="outline" onClick={() => setReabrirOpen(true)} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reabrir
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Total liquidado</p>
            <p className="text-2xl font-bold text-primary">{fmtCOP(periodo.totales.liquidado)}</p>
          </div>
          <div className="p-4 rounded-xl border border-success/20 bg-success/5">
            <p className="text-xs text-muted-foreground mb-1">Consignado</p>
            <p className="text-2xl font-bold text-success">{fmtCOP(periodo.totales.consignado)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">Pendiente por consignar</p>
            <p className="text-2xl font-bold">{fmtCOP(periodo.totales.pendiente)}</p>
          </div>
        </div>

        {periodo.advertencias_globales.length > 0 && (
          <div className="space-y-2">
            {periodo.advertencias_globales.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                <span>{a.mensaje ?? a.code}</span>
              </div>
            ))}
          </div>
        )}

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaborador</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fondo</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Base Prestacional</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cesantías</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consignación</th>
                  </tr>
                </thead>
                <tbody>
                  {filasAgregadas.map((f, i) => (
                    <tr key={f.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                            {getIniciales(f.empleado.nombre_completo)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{f.empleado.nombre_completo}</p>
                            <p className="text-xs text-muted-foreground">{f.empleado.documento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{f.empleado.fondo_cesantias ?? '—'}</td>
                      <td className="p-4 text-right text-sm font-medium">{f.dias_computados}</td>
                      <td className="p-4 text-right text-sm font-medium">{fmtCOP(f.base_prestacional)}</td>
                      <td className="p-4 text-right text-sm font-bold text-primary">{fmtCOP(f.valor_final)}</td>
                      <td className="p-4 text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.estado_pago === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' : 'bg-success/10 text-success'}`}>
                          {f.estado_pago === 'PENDIENTE' ? 'Pendiente' : 'Consignado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Reabrir */}
        <AlertDialog open={reabrirOpen} onOpenChange={(open) => !open && !reabriendo && setReabrirOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reabrir "{periodo.descripcion}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Las filas vuelven a pendiente y podrás recalcular. Solo es posible si nada se ha consignado y ningún período de intereses cerrado depende de este. El motivo queda en auditoría.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="motivoReabrir">Motivo <span className="text-destructive">*</span></Label>
              <textarea
                id="motivoReabrir"
                rows={3}
                value={motivoReabrir}
                onChange={(e) => setMotivoReabrir(e.target.value)}
                placeholder="Ej: faltó una nómina por cerrar"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reabriendo}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={reabrir} disabled={reabriendo}>
                {reabriendo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reabrir período
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Wizard BORRADOR ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
        <p className="text-muted-foreground mt-1">
          Liquidación de cesantías · Fecha límite: {formatFecha(periodo.fecha_limite_operativa)}
          <span title={`Fecha legal: ${formatFecha(periodo.fecha_limite_legal)}`}> (legal {formatFecha(periodo.fecha_limite_legal)})</span>
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <StepBar actual={paso} />
        </CardContent>
      </Card>

      {/* ── PASO 1: Info del período ── */}
      {paso === 1 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Información del Período</h2>
                <p className="text-sm text-muted-foreground">Revisa los datos antes de continuar</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Input value={periodo.anio} disabled className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input value={periodo.descripcion} disabled className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input type="date" value={periodo.fecha_inicio} disabled className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input type="date" value={periodo.fecha_fin} disabled className="bg-muted/30" />
              </div>
            </div>
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 text-sm text-orange-800">
              Fecha límite de consignación: legal el <strong>{formatFecha(periodo.fecha_limite_legal, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, operativa el <strong>{formatFecha(periodo.fecha_limite_operativa, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Las cesantías no consignadas a tiempo generan sanción moratoria.
            </div>
            {periodo.advertencias_globales.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                <span>{a.mensaje ?? a.code}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── PASO 2: Seleccionar colaboradores ── */}
      {paso === 2 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Seleccionar Personal</h2>
                  <p className="text-sm text-muted-foreground">Agrega los colaboradores a este período de cesantías</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTodos} disabled={elegibles.length === 0} className="gap-2">
                <Users className="h-4 w-4" />
                {elegibles.length > 0 && marcados.length === elegibles.length ? 'Quitar Todos' : 'Agregar Todos'}
              </Button>
            </div>

            {(filasAgregadas.length > 0 || marcados.length > 0) && (
              <div className="text-sm text-primary font-medium">
                {filasAgregadas.length > 0 && `${filasAgregadas.length} ya en el período`}
                {filasAgregadas.length > 0 && marcados.length > 0 && ' · '}
                {marcados.length > 0 && `${marcados.length} por agregar`}
              </div>
            )}

            {/* Ya agregados al período (persistidos) */}
            {filasAgregadas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filasAgregadas.map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium pl-3 pr-1.5 py-1">
                    {f.empleado.nombre_completo}
                    <button
                      type="button"
                      onClick={() => quitarFila(f.id)}
                      disabled={quitandoFila === f.id}
                      className="rounded-full hover:bg-primary/20 p-0.5"
                      title="Quitar del período"
                    >
                      {quitandoFila === f.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <X className="h-3 w-3" />}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {cargandoDisponibles ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando colaboradores disponibles...
              </div>
            ) : elegibles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                No hay más colaboradores elegibles para este período.
              </p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="w-12 p-4">
                        <Checkbox checked={elegibles.length > 0 && marcados.length === elegibles.length} onCheckedChange={toggleTodos} />
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cargo</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fondo</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salario / Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elegibles.map((col, i) => {
                      const sel = marcados.includes(col.id);
                      // §3.1 — para PRODUCCION el salario_base es placeholder:
                      // se pinta el promedio mensual devengado.
                      const monto = col.salario_base_es_contractual
                        ? col.salario_base
                        : col.promedio_mensual_devengado;
                      return (
                        <tr key={col.id} onClick={() => toggleMarcado(col.id)}
                          className={`border-b border-border last:border-0 cursor-pointer transition-colors ${sel ? 'bg-primary/5' : i % 2 === 0 ? 'bg-background hover:bg-muted/20' : 'bg-muted/5 hover:bg-muted/20'}`}>
                          <td className="p-4">
                            <Checkbox checked={sel} onCheckedChange={() => toggleMarcado(col.id)} onClick={e => e.stopPropagation()} />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border ${sel ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                {getIniciales(col.nombre_completo)}
                              </div>
                              <div>
                                <span className="font-medium text-sm">{col.nombre_completo}</span>
                                <p className="text-xs text-muted-foreground">{col.documento}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{col.cargo ?? '—'}</td>
                          <td className="p-4 text-sm text-muted-foreground">{col.fondo_cesantias ?? '—'}</td>
                          <td className="p-4 text-right">
                            <span className="font-semibold text-sm">{fmtCOP(monto)}</span>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {col.salario_base_es_contractual ? 'Salario contractual' : 'Promedio mensual'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Excluidos con motivo (§3.1) */}
            {excluidos.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {excluidos.length} colaborador{excluidos.length !== 1 ? 'es' : ''} no elegible{excluidos.length !== 1 ? 's' : ''}
                </p>
                {excluidos.map((ex) => (
                  <p key={`${ex.id}-${ex.motivo}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{ex.nombre_completo}</span>
                    {' — '}{MOTIVO_EXCLUSION_LABEL[ex.motivo] ?? ex.motivo}
                    {ex.motivo === 'RETIRADO_EN_EL_ANIO' && ex.fecha_retiro ? ` (${formatFecha(ex.fecha_retiro)})` : ''}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── PASO 3: Confirmación (preview del backend) ── */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Confirmación</h2>
              <p className="text-sm text-muted-foreground">
                Desprendibles de liquidación de cesantías — {preview?.totales.colaboradores ?? 0} colaborador{(preview?.totales.colaboradores ?? 0) !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>

          {cargandoPreview && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Calculando liquidación...
            </div>
          )}

          {!cargandoPreview && preview?.filas.map((fila) => {
            const col = fila.empleado;
            const bloqueada = fila.bloqueantes.length > 0;
            return (
              <Card key={fila.fila_id} className={`border-border overflow-hidden ${bloqueada ? 'border-destructive/50' : ''}`}>
                {/* Desprendible header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {getIniciales(col.nombre_completo)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{col.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground">{col.cargo ?? '—'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">Fondo</p>
                    <p className="text-sm font-medium">{col.fondo_cesantias ?? '—'}</p>
                  </div>
                </div>

                {/* Info bar */}
                <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Cédula</p>
                    <p className="text-sm font-medium">{col.documento}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Días Computados</p>
                    <p className="text-sm font-medium">
                      {fila.dias.dias_computados}
                      {fila.dias.dias_descontados > 0 && (
                        <span className="text-xs text-muted-foreground ml-1" title="Días descontados por suspensiones o ausencias injustificadas">
                          ({fila.dias.dias_vinculacion} − {fila.dias.dias_descontados})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Período</p>
                    <p className="text-sm font-medium">
                      {formatFecha(fila.dias.fecha_computo_desde)} — {formatFecha(fila.dias.fecha_computo_hasta)}
                    </p>
                  </div>
                </div>

                <CardContent className="p-0">
                  {/* Base de Cálculo */}
                  <div className="bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Base de Cálculo</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-auto">
                        {fila.base.metodo_base === 'ULTIMO_SALARIO' ? 'Último salario' : fila.base.metodo_base === 'PROMEDIO' ? 'Promedio devengado' : 'Ajuste manual'}
                      </span>
                    </div>
                    <div className="px-5 pb-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Salario Básico</span>
                        <span className="text-sm font-medium">{fmtCOP(fila.base.salario_basico)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Auxilio de Transporte</span>
                        <span className="text-sm font-medium">{fila.base.auxilio_transporte > 0 ? fmtCOP(fila.base.auxilio_transporte) : <span className="text-muted-foreground">$0</span>}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Promedio Variables</span>
                        <span className="text-sm font-medium">{fila.base.promedio_variables > 0 ? fmtCOP(fila.base.promedio_variables) : <span className="text-muted-foreground">$0</span>}</span>
                      </div>
                    </div>
                    <div className="mx-5 my-3 border-t border-primary/20" />
                    <div className="flex justify-between items-center px-5 pb-4">
                      <span className="text-xs uppercase tracking-wide font-bold text-primary">Base Prestacional</span>
                      <span className="text-sm font-bold text-primary">{fmtCOP(fila.base.base_prestacional)}</span>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="px-5 pt-4 pb-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días</span>
                      <span className="text-sm font-medium">{fila.resultado.dias}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fórmula</span>
                      <span className="text-xs text-muted-foreground">{fila.resultado.formula_aplicada}</span>
                    </div>
                  </div>
                  <div className="mx-5 border-t-2 border-primary/20" />
                  <div className="flex justify-between items-center px-5 py-4">
                    <span className="text-sm uppercase tracking-wide font-bold">Total Cesantías</span>
                    <span className="text-xl font-bold text-primary">{fmtCOP(fila.resultado.valor_final)}</span>
                  </div>

                  {/* Bloqueantes y advertencias de la fila */}
                  {(bloqueada || fila.advertencias.length > 0) && (
                    <div className="px-5 pb-4 space-y-1.5">
                      {fila.bloqueantes.map((b) => (
                        <p key={b} className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {b === 'SIN_DIAS_COMPUTADOS' ? 'Sin días computados: no se puede liquidar' : b === 'SIN_DEVENGADO' ? 'Sin devengado en nóminas cerradas: no se puede liquidar' : b}
                        </p>
                      ))}
                      {fila.advertencias.map((a, i) => (
                        <p key={i} className="text-xs text-orange-700 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {a.mensaje ?? a.code}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Total resumen */}
          {!cargandoPreview && preview && (
            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Colaboradores liquidados</p>
                <p className="font-bold text-lg">{preview.totales.colaboradores}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total cesantías a consignar</p>
                <p className="font-bold text-2xl text-primary">{fmtCOP(preview.totales.valor)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={paso === 1 ? () => navigate('/liquidaciones') : retroceder} disabled={avanzando || confirmando} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < 3 ? (
          <Button onClick={avanzar} disabled={avanzando} className="gap-2">
            {avanzando && <Loader2 className="h-4 w-4 animate-spin" />}
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => confirmar(false)}
            disabled={confirmando || cargandoPreview || !preview || (preview.bloqueantes.length > 0)}
            className="gap-2 bg-success hover:bg-success/90"
            title={preview && preview.bloqueantes.length > 0 ? 'Hay colaboradores sin días o sin devengado: quítalos o corrige sus datos' : undefined}
          >
            {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar Liquidación
          </Button>
        )}
      </div>

      {/* Cobertura incompleta → forzar con motivo */}
      <AlertDialog open={coberturaDialog != null} onOpenChange={(open) => !open && !confirmando && setCoberturaDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cobertura de nóminas incompleta</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Estos colaboradores tienen meses del período sin nómina cerrada en el sistema, así que su promedio puede quedar corto:</p>
                {(coberturaDialog ?? []).map((c, i) => (
                  <p key={i}><strong>{c.nombre_completo}</strong> — cobertura {Number(c.cobertura_pct).toFixed(0)}%</p>
                ))}
                <p>Puedes confirmar de todas formas dejando el motivo por escrito (queda en auditoría).</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivoForzado">Motivo <span className="text-destructive">*</span></Label>
            <textarea
              id="motivoForzado"
              rows={3}
              value={motivoForzado}
              onChange={(e) => setMotivoForzado(e.target.value)}
              placeholder="Ej: enero a marzo se liquidó en el sistema anterior"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmar(true)} disabled={confirmando}>
              {confirmando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
