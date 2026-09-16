/**
 * Liquidación de vacaciones, un colaborador a la vez
 * (API_LIQUIDACIONES §10.2 a §10.5).
 *
 * Tres llamadas encadenadas:
 *   1. /colaboradores/{id}  → causación, saldo, base y tope de compensación.
 *   2. /calendario          → dónde termina el disfrute y cuántos días
 *                             calendario se pagan. El backend sabe qué es
 *                             festivo y si el sábado cuenta como hábil.
 *   3. /preview             → el comprobante completo y su `calculo_hash`.
 *
 * Dos reglas que NO se calculan aquí a propósito:
 *  - Se pagan los días CALENDARIO del disfrute, no los hábiles (CST 192).
 *  - La compensación en dinero se topa en la mitad de cada período causado
 *    (CST 189), que llega como `dias_dinero_max`, y exige acuerdo escrito.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, Plane, Info, AlertCircle, AlertTriangle, Check, Loader2, CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  NO_ELEGIBLE_LABEL,
  DIA_NO_HABIL_LABEL,
  type CalendarioVacaciones,
  type ComprobanteVacaciones,
  type DetalleColaboradorVacaciones,
} from '../../../api/vacaciones';
import { BLOQUEANTE_LABEL } from '../../../api/liquidaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { fmtCOP, fmtDias, getIniciales } from './vacaciones/comunes';

/** Solo la cobertura incompleta se puede forzar, y con motivo. */
const FORZABLE = VacacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA;

export default function NuevaVacaciones() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const empleadoId = Number(searchParams.get('col')) || 0;

  const [detalle, setDetalle] = useState<DetalleColaboradorVacaciones | null>(null);
  const [cargando, setCargando] = useState(true);

  const [fechaInicio, setFechaInicio] = useState('');
  const [diasDisfrute, setDiasDisfrute] = useState('');
  const [diasDinero, setDiasDinero] = useState('');
  const [acuerdoEscrito, setAcuerdoEscrito] = useState(false);
  const [observacion, setObservacion] = useState('');

  const [calendario, setCalendario] = useState<CalendarioVacaciones | null>(null);
  const [calculandoCalendario, setCalculandoCalendario] = useState(false);
  const [preview, setPreview] = useState<ComprobanteVacaciones | null>(null);
  const [calculandoPreview, setCalculandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [forzarDialog, setForzarDialog] = useState<string | null>(null);
  const [motivoForzado, setMotivoForzado] = useState('');

  const calRef = useRef(0);
  const prevRef = useRef(0);

  const nDisfrute = Number(diasDisfrute) || 0;
  const nDinero = Number(diasDinero) || 0;

  // ── 1. Colaborador ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empleadoId) { setCargando(false); return; }
    let vivo = true;
    setCargando(true);
    vacacionesApi
      .detalleColaborador(empleadoId)
      .then((res) => { if (vivo) setDetalle(res.data); })
      .catch((err) => {
        if (!vivo) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'No se pudo cargar el colaborador');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [empleadoId]);

  // ── 2. Calendario ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fechaInicio || nDisfrute <= 0) { setCalendario(null); return; }
    const reqId = ++calRef.current;
    setCalculandoCalendario(true);
    const t = setTimeout(() => {
      vacacionesApi
        .calendario(fechaInicio, nDisfrute)
        .then((res) => { if (reqId === calRef.current) setCalendario(res.data); })
        .catch((err) => {
          if (reqId !== calRef.current) return;
          setCalendario(null);
          const e = err as ApiError;
          if (e.code === VacacionesErrorCodes.VACACIONES_INICIO_NO_HABIL) {
            toast.error('Las vacaciones no pueden empezar en domingo o festivo');
          } else if (e.code === VacacionesErrorCodes.CALENDARIO_FESTIVOS_AUSENTE) {
            toast.error('Falta el calendario de festivos de ese año. Revisa Configuración.');
          }
        })
        .finally(() => { if (reqId === calRef.current) setCalculandoCalendario(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [fechaInicio, nDisfrute]);

  // ── 3. Preview ─────────────────────────────────────────────────────────────
  const cargarPreview = useCallback(() => {
    if (!empleadoId || nDisfrute + nDinero <= 0) {
      setPreview(null);
      setErrorPreview(null);
      return Promise.resolve();
    }
    const reqId = ++prevRef.current;
    setCalculandoPreview(true);
    return vacacionesApi
      .preview(empleadoId, {
        fecha_inicio: nDisfrute > 0 ? fechaInicio || undefined : undefined,
        dias_disfrute: nDisfrute,
        dias_dinero: nDinero || undefined,
      })
      .then((res) => {
        if (reqId !== prevRef.current) return;
        setPreview(res.data);
        setErrorPreview(null);
      })
      .catch((err) => {
        if (reqId !== prevRef.current) return;
        setPreview(null);
        const e = err as ApiError;
        setErrorPreview(mensajeError(e));
      })
      .finally(() => { if (reqId === prevRef.current) setCalculandoPreview(false); });
  }, [empleadoId, fechaInicio, nDisfrute, nDinero]);

  useEffect(() => {
    if (nDisfrute > 0 && !fechaInicio) { setPreview(null); return; }
    const t = setTimeout(() => { void cargarPreview(); }, 400);
    return () => clearTimeout(t);
  }, [cargarPreview, fechaInicio, nDisfrute]);

  // ── Confirmar ──────────────────────────────────────────────────────────────
  const confirmar = async (forzar = false) => {
    if (!preview?.calculo_hash) { toast.error('Espera a que termine el cálculo'); return; }
    if (forzar && motivoForzado.trim().length < 5) {
      toast.error('Escribe el motivo para forzar la liquidación');
      return;
    }
    setConfirmando(true);
    try {
      const res = await vacacionesApi.crear({
        empleado_id: empleadoId,
        fecha_inicio: nDisfrute > 0 ? fechaInicio : undefined,
        dias_disfrute: nDisfrute,
        dias_dinero: nDinero || undefined,
        acuerdo_escrito: nDinero > 0 ? acuerdoEscrito : undefined,
        observacion: observacion.trim() || undefined,
        calculo_hash: preview.calculo_hash,
        forzar: forzar || undefined,
        motivo_forzado: forzar ? motivoForzado.trim() : undefined,
      });
      setForzarDialog(null);
      toast.success(res.message ?? 'Vacaciones liquidadas');
      navigate(`/liquidaciones/vacaciones/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === VacacionesErrorCodes.LIQUIDACION_DESACTUALIZADA) {
        toast.warning('Los datos cambiaron desde el cálculo. Se recalculó: revisa y confirma de nuevo.', { duration: 8000 });
        await cargarPreview();
      } else if (e.code === FORZABLE) {
        setForzarDialog(mensajeError(e));
      } else {
        toast.error(mensajeError(e));
      }
    } finally {
      setConfirmando(false);
    }
  };

  // ── Estados de carga y guardas ─────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando colaborador...
      </div>
    );
  }

  if (!empleadoId || !detalle) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
        </Button>
        <p className="text-muted-foreground">
          Elige un colaborador desde la lista de turnos pendientes para liquidar sus vacaciones.
        </p>
      </div>
    );
  }

  const emp = detalle.empleado;
  const maxDisfrute = detalle.causacion.dias_disponibles_exigibles;
  const maxDinero = detalle.dias_dinero_max;
  const totalPedido = nDisfrute + nDinero;
  const excedeSaldo = totalPedido > maxDisfrute;
  const excedeDinero = nDinero > maxDinero;
  const faltaAcuerdo = nDinero > 0 && !acuerdoEscrito;
  const bloqueado = !detalle.elegible || detalle.bloqueantes_base.length > 0;

  // §1.2 — El preview trae sus propios `bloqueantes[]`. Solo la cobertura
  // incompleta se puede forzar con motivo; el resto cierra la confirmación.
  const bloqueantesPreview = preview?.bloqueantes ?? [];
  const bloqueantesDuros = bloqueantesPreview.filter((b) => b.forzable !== true);

  const puedeConfirmar =
    !bloqueado && !!preview && !calculandoPreview && totalPedido > 0 &&
    !excedeSaldo && !excedeDinero && !faltaAcuerdo &&
    bloqueantesDuros.length === 0 &&
    (nDisfrute === 0 || !!fechaInicio);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">Liquidación de Vacaciones</h1>
        <p className="mt-1 text-muted-foreground">Registra los días de disfrute y la compensación en dinero</p>
      </div>

      {/* ── Colaborador ──────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
              {getIniciales(emp.nombre_completo)}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">{emp.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">
                {emp.cargo ?? 'Sin cargo'} · CC {emp.documento}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Días disponibles</p>
              <p className="text-2xl font-bold text-primary">{fmtDias(maxDisfrute)}</p>
              {detalle.causacion.dias_causados_periodo_actual > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{fmtDias(detalle.causacion.dias_causados_periodo_actual)} del año en curso
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-4">
            <div className="pr-4">
              <p className="text-xs text-muted-foreground">Base mensual (art. 192)</p>
              <p className="font-semibold text-foreground">{fmtCOP(detalle.base.base_mensual)}</p>
            </div>
            <div className="px-4">
              <p className="text-xs text-muted-foreground">Valor día</p>
              <p className="font-semibold text-foreground">{fmtCOP(detalle.valor_dia)}</p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-muted-foreground">Máximo en dinero</p>
              <p className="font-semibold text-foreground">{fmtDias(maxDinero)} días</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bloqueos ─────────────────────────────────────────────────────── */}
      {!detalle.elegible && (
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {detalle.motivo_no_elegible
              ? NO_ELEGIBLE_LABEL[detalle.motivo_no_elegible]
              : 'Este colaborador no puede liquidar vacaciones.'}
          </p>
        </div>
      )}

      {detalle.bloqueantes_base.length > 0 && (
        <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {detalle.bloqueantes_base.map((code) => (
            <p key={code} className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {BLOQUEANTE_LABEL[code] ?? code}
            </p>
          ))}
        </div>
      )}

      {/* ── Formulario ───────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Días de Vacaciones</h2>
              <p className="text-sm text-muted-foreground">Ingresa la fecha de inicio y los días a liquidar</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Fecha inicio de vacaciones</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={bloqueado}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="font-semibold text-success">Días de disfrute</span>
                <span className="ml-2 text-xs text-muted-foreground">(hábiles)</span>
              </Label>
              <Input
                type="number" min={0} step={1} placeholder="0"
                value={diasDisfrute}
                onChange={(e) => setDiasDisfrute(e.target.value)}
                disabled={bloqueado}
                className={excedeSaldo ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="font-semibold text-amber-600">Días en dinero</span>
                <span className="ml-2 text-xs text-muted-foreground">(máx. {fmtDias(maxDinero)})</span>
              </Label>
              <Input
                type="number" min={0} step={0.5} max={maxDinero} placeholder="0"
                value={diasDinero}
                onChange={(e) => setDiasDinero(e.target.value)}
                disabled={bloqueado || maxDinero <= 0}
                className={excedeDinero ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
          </div>

          {/* Calendario resuelto por el backend */}
          {nDisfrute > 0 && fechaInicio && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              {calculandoCalendario ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculando el rango
                </p>
              ) : calendario ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatFecha(calendario.fecha_inicio)} al {formatFecha(calendario.fecha_fin)}
                    </span>
                    <span className="text-muted-foreground">
                      {fmtDias(calendario.dias_habiles)} días hábiles
                    </span>
                    <span className="font-semibold text-foreground">
                      {fmtDias(calendario.dias_calendario)} días calendario a pagar
                    </span>
                  </div>
                  {calendario.dias_no_habiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hábiles dentro del rango:{' '}
                      {calendario.dias_no_habiles
                        .map((d) => `${formatFecha(d.fecha)} (${DIA_NO_HABIL_LABEL[d.motivo]})`)
                        .join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se regresa a trabajar el día hábil siguiente al {formatFecha(calendario.fecha_fin)}.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se pudo resolver el rango. Revisa la fecha de inicio.
                </p>
              )}
            </div>
          )}

          {/* Acuerdo escrito: sin él la compensación no es válida */}
          {nDinero > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/20">
              <Checkbox
                checked={acuerdoEscrito}
                onCheckedChange={(v) => setAcuerdoEscrito(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-semibold text-amber-800 dark:text-amber-400">
                  Hay acuerdo escrito con el trabajador
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  El artículo 189 del CST exige que la compensación en dinero se pacte por escrito.
                  Sin el documento firmado la liquidación no se puede confirmar.
                </span>
              </span>
            </label>
          )}

          {/* Errores de captura */}
          {(excedeSaldo || excedeDinero) && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {excedeSaldo
                ? `El total (${fmtDias(totalPedido)} días) supera el saldo disponible (${fmtDias(maxDisfrute)}).`
                : `Los días en dinero (${fmtDias(nDinero)}) superan el máximo permitido (${fmtDias(maxDinero)}).`}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observación <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Textarea
              rows={2} placeholder="Notas internas de esta liquidación."
              value={observacion} onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Art. 189 y 192 CST:</strong> el disfrute se paga por
              días calendario, y la compensación en dinero no puede pasar de la mitad de cada período
              causado. El sistema aplica los dos topes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Resultado del preview ────────────────────────────────────────── */}
      {calculandoPreview && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Calculando la liquidación
        </div>
      )}

      {!calculandoPreview && errorPreview && totalPedido > 0 && (
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorPreview}</p>
        </div>
      )}

      {!calculandoPreview && preview && (
        <>
          {bloqueantesPreview.length > 0 && (
            <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {bloqueantesPreview.map((b, i) => (
                <p key={`${b.code}-${i}`} className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {b.mensaje ?? BLOQUEANTE_LABEL[b.code] ?? b.code}
                    {b.forzable === true && (
                      <span className="ml-1 text-muted-foreground">
                        Se puede liquidar igual dejando el motivo por escrito.
                      </span>
                    )}
                  </span>
                </p>
              ))}
            </div>
          )}

          {preview.advertencias.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/30 dark:bg-amber-950/20">
              {preview.advertencias.map((a, i) => (
                <p key={`${a.code}-${i}`} className="flex gap-2 text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {a.mensaje ?? a.code}
                </p>
              ))}
            </div>
          )}

          <Card className="overflow-hidden border-border">
            <div className="border-b border-border bg-muted/20 px-5 py-3">
              <p className="text-sm font-semibold">Resumen de liquidación</p>
            </div>
            <CardContent className="p-0">
              {preview.resultado.dias_calendario > 0 && (
                <div className="border-b border-success/10 bg-success/5">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-success">Días de disfrute</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDias(preview.resultado.dias_calendario)} días calendario × {fmtCOP(preview.resultado.valor_dia)}
                        {' · '}equivalen a {fmtDias(preview.resultado.dias_disfrute)} hábiles
                      </p>
                    </div>
                    <p className="font-bold text-success">{fmtCOP(preview.resultado.valor_disfrute)}</p>
                  </div>
                </div>
              )}

              {preview.resultado.dias_dinero > 0 && (
                <div className="border-b border-amber-100 bg-amber-50/60 dark:border-amber-900/20 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Días en dinero</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDias(preview.resultado.dias_dinero)} días × {fmtCOP(preview.resultado.valor_dia)}
                      </p>
                    </div>
                    <p className="font-bold text-amber-700 dark:text-amber-400">{fmtCOP(preview.resultado.valor_dinero)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-base font-bold">Total a pagar</p>
                  <p className="text-xs text-muted-foreground">{preview.resultado.formula_aplicada}</p>
                </div>
                <p className="text-2xl font-bold text-primary">{fmtCOP(preview.resultado.valor_total)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Saldo después y períodos que se consumen */}
          {preview.saldo && (
            <Card className="border-border">
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo antes</p>
                    <p className="font-semibold text-foreground">
                      {fmtDias(preview.saldo.dias_disponibles_exigibles_antes)} días
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo después</p>
                    <p className="font-semibold text-foreground">
                      {fmtDias(preview.saldo.dias_disponibles_exigibles_despues)} días
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Próximo vencimiento</p>
                    <p className="font-semibold text-foreground">
                      {formatFecha(preview.saldo.fecha_vencimiento_despues)}
                    </p>
                  </div>
                </div>

                {preview.periodos_afectados.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground">Períodos que se consumen</p>
                    {preview.periodos_afectados.map((p) => (
                      <div key={p.periodo} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <Badge variant="outline">Período {p.periodo}</Badge>
                        <span className="text-muted-foreground">
                          {formatFecha(p.inicio)} al {formatFecha(p.fin)}
                        </span>
                        <span className="text-foreground">
                          {fmtDias(p.dias_disfrute)} disfrute · {fmtDias(p.dias_dinero)} dinero
                        </span>
                        <span className="text-muted-foreground">Queda {fmtDias(p.saldo_restante)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {preview.saldo.usa_periodo_en_curso && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-400">
                    Se están usando días del año en curso. Si el trabajador se retira antes de
                    cumplirlo, esos días no se le pueden cobrar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between">
        <Button variant="outline" asChild className="gap-2">
          <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Cancelar</Link>
        </Button>
        <Button
          onClick={() => confirmar(false)}
          disabled={!puedeConfirmar || confirmando}
          className="gap-2 bg-success hover:bg-success/90"
        >
          {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Confirmar Liquidación
        </Button>
      </div>

      {/* ── Forzar con motivo ────────────────────────────────────────────── */}
      <AlertDialog open={forzarDialog !== null} onOpenChange={(v) => { if (!v) setForzarDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cobertura de nóminas incompleta</AlertDialogTitle>
            <AlertDialogDescription>
              {forzarDialog} Puedes liquidar igual, pero queda registrado quién lo autorizó y por qué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea
              rows={3} placeholder="Explica por qué se liquida con la información disponible."
              value={motivoForzado} onChange={(e) => setMotivoForzado(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmando}>Cancelar</AlertDialogCancel>
            <Button onClick={() => confirmar(true)} disabled={confirmando} className="gap-2">
              {confirmando && <Loader2 className="h-4 w-4 animate-spin" />}
              Liquidar de todos modos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Traduce los códigos del contrato a algo que el usuario pueda accionar. */
function mensajeError(e: ApiError): string {
  switch (e.code) {
    case VacacionesErrorCodes.VACACIONES_SALDO_INSUFICIENTE:
      return 'Los días pedidos superan el saldo disponible del colaborador.';
    case VacacionesErrorCodes.VACACIONES_COMPENSACION_EXCEDE_MITAD:
      return 'La compensación en dinero no puede pasar de la mitad del período causado.';
    case VacacionesErrorCodes.VACACIONES_COMPENSACION_SIN_ACUERDO:
      return 'Falta marcar el acuerdo escrito para compensar días en dinero.';
    case VacacionesErrorCodes.VACACIONES_INICIO_NO_HABIL:
      return 'Las vacaciones no pueden empezar en domingo o festivo.';
    case VacacionesErrorCodes.VACACIONES_DIAS_INVALIDOS:
      return 'Los días indicados no son válidos. Los días en dinero van de medio en medio.';
    case VacacionesErrorCodes.VACACIONES_FUERA_DE_CONTRATO:
      return 'El rango de vacaciones cae fuera del contrato del colaborador.';
    case VacacionesErrorCodes.VACACIONES_CON_AUSENCIA_EN_RANGO:
      return 'El colaborador tiene una ausencia registrada dentro de esas fechas.';
    case VacacionesErrorCodes.VACACIONES_SOLAPADAS:
      return 'Ya hay vacaciones registradas que se cruzan con ese rango.';
    case VacacionesErrorCodes.CALENDARIO_FESTIVOS_AUSENTE:
      return 'Falta el calendario de festivos de ese año. Revisa Configuración.';
    case VacacionesErrorCodes.EMPLEADO_NO_ELEGIBLE:
      return 'Este colaborador no puede liquidar vacaciones.';
    case VacacionesErrorCodes.CONFIG_LEGAL_INCOMPLETA:
      return 'Faltan constantes legales del año. Complétalas en Configuración.';
    case VacacionesErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA:
      return e.message ?? 'No hay nóminas cerradas suficientes para calcular el promedio.';
    default:
      return e.message ?? 'No se pudo calcular la liquidación.';
  }
}
