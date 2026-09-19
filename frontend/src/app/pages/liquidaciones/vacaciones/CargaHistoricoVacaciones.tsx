/**
 * Carga del histórico de vacaciones (API_LIQUIDACIONES §10.6 y §10.6.1).
 *
 * Pantalla de puesta en marcha. El sistema causa vacaciones desde la fecha de
 * ingreso del contrato, así que un colaborador que entró en 2021 y ya disfrutó
 * cuatro vacaciones aparece hoy con 60 días vencidos: el módulo no sabe de
 * ellas. Aquí se registran una vez.
 *
 * No usa endpoints nuevos: lista de §10.1, detalle de §10.3, alta de §10.6 y
 * anulación de §10.10 para corregir. Se puede ocultar cuando la carga termine.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  ArrowLeft, Search, Loader2, History, Info, AlertTriangle, Users, Ban, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  type DetalleColaboradorVacaciones,
  type TurnoPendienteVacaciones,
  type VacacionItem,
} from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { formatFecha } from '../../../utils/fecha';
import { SEMAFORO, fmtDias, getIniciales } from './comunes';

/** Errores del módulo con los extras que documenta §10.6.1. */
type ErrorHistorico = ApiError & {
  detalle?: {
    dias_habiles?: number;
    dias_calendario?: number;
    nominas?: Array<Record<string, unknown>>;
    vacaciones?: Array<Record<string, unknown>>;
  };
  nominas?: Array<Record<string, unknown>>;
  vacaciones?: Array<Record<string, unknown>>;
};

const HOY = () => new Date().toISOString().slice(0, 10);

/** Días calendario del rango, ambos extremos incluidos. */
function diasCalendario(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const a = new Date(`${inicio}T12:00:00`);
  const b = new Date(`${fin}T12:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

const FORM_VACIO = {
  fechaInicio: '',
  fechaFin: '',
  diasHabiles: '15',
  diasDinero: '',
  fechaPago: '',
  observacion: '',
};

export default function CargaHistoricoVacaciones() {
  const { hasPermiso } = useAuth();
  const puedeCargar = hasPermiso('liquidaciones.editar');

  const [filas, setFilas] = useState<TurnoPendienteVacaciones[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetalleColaboradorVacaciones | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aAnular, setAAnular] = useState<VacacionItem | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  const listaRef = useRef(0);
  const detalleRef = useRef(0);

  const set = (campo: keyof typeof FORM_VACIO, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  // ── Lista ──────────────────────────────────────────────────────────────────
  const cargarLista = () => {
    const reqId = ++listaRef.current;
    setCargandoLista(true);
    vacacionesApi
      .pendientes({ q: busqueda.trim() || undefined, per_page: 100 })
      .then((res) => { if (reqId === listaRef.current) setFilas(res.data); })
      .catch((err) => {
        if (reqId !== listaRef.current) return;
        toast.error((err as ApiError).message ?? 'Error al cargar los colaboradores');
      })
      .finally(() => { if (reqId === listaRef.current) setCargandoLista(false); });
  };

  useEffect(() => {
    const t = setTimeout(cargarLista, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  // ── Detalle ────────────────────────────────────────────────────────────────
  const cargarDetalle = (id: number) => {
    const reqId = ++detalleRef.current;
    setCargandoDetalle(true);
    vacacionesApi
      .detalleColaborador(id)
      .then((res) => { if (reqId === detalleRef.current) setDetalle(res.data); })
      .catch((err) => {
        if (reqId !== detalleRef.current) return;
        setDetalle(null);
        toast.error((err as ApiError).message ?? 'No se pudo cargar el colaborador');
      })
      .finally(() => { if (reqId === detalleRef.current) setCargandoDetalle(false); });
  };

  const elegir = (id: number) => {
    setEmpleadoId(id);
    setForm(FORM_VACIO);
    cargarDetalle(id);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  /** Las mismas reglas del backend, para no gastar un viaje en un 422. */
  const validar = (): string | null => {
    if (!form.fechaInicio || !form.fechaFin) return 'Faltan las fechas del disfrute';
    if (form.fechaFin < form.fechaInicio) return 'La fecha fin va después de la de inicio';
    const habiles = Number(form.diasHabiles);
    if (!Number.isInteger(habiles) || habiles < 1 || habiles > 120) {
      return 'Los días hábiles van de 1 a 120, en números enteros';
    }
    const calendario = diasCalendario(form.fechaInicio, form.fechaFin);
    if (habiles > calendario) {
      return `${habiles} días hábiles no caben en un rango de ${calendario} días`;
    }
    if (form.diasDinero) {
      const dinero = Number(form.diasDinero);
      if (!Number.isFinite(dinero) || dinero < 0 || dinero > 30) return 'Los días en dinero van de 0 a 30';
      if (Math.round(dinero * 2) !== dinero * 2) return 'Los días en dinero van de medio en medio';
    }
    if (form.fechaPago && form.fechaPago > HOY()) return 'La fecha de pago no puede ser futura';
    return null;
  };

  const guardar = async (seguirConElMismo: boolean) => {
    if (!empleadoId) return;
    const error = validar();
    if (error) { toast.error(error); return; }

    setGuardando(true);
    try {
      const res = await vacacionesApi.crearHistorico({
        empleado_id: empleadoId,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        dias_habiles: Number(form.diasHabiles),
        dias_dinero: form.diasDinero ? Number(form.diasDinero) : undefined,
        fecha_pago: form.fechaPago || undefined,
        observacion: form.observacion.trim() || undefined,
      });
      toast.success(res.message ?? 'Vacaciones históricas registradas');
      (res.advertencias ?? []).forEach((a) => {
        toast.warning(a.mensaje ?? a.code, { duration: 8000 });
      });
      // Deja el colaborador y limpia las fechas: la carga va en serie.
      setForm(seguirConElMismo ? { ...FORM_VACIO, observacion: form.observacion } : FORM_VACIO);
      cargarDetalle(empleadoId);
      cargarLista();
      if (!seguirConElMismo) {
        setEmpleadoId(null);
        setDetalle(null);
      }
    } catch (err) {
      mostrarError(err as ErrorHistorico);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    if (!aAnular) return;
    if (motivoAnulacion.trim().length < 5) { toast.error('Escribe el motivo'); return; }
    setAnulando(true);
    try {
      await vacacionesApi.anular(aAnular.id, motivoAnulacion.trim());
      toast.success('Registro anulado');
      setAAnular(null);
      setMotivoAnulacion('');
      if (empleadoId) cargarDetalle(empleadoId);
      cargarLista();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo anular el registro');
    } finally {
      setAnulando(false);
    }
  };

  const historicos = (detalle?.vacaciones ?? []).filter((v) => v.origen === 'HISTORICO');
  const calendarioRango = diasCalendario(form.fechaInicio, form.fechaFin);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-primary">Cargar vacaciones anteriores</h1>
          <Badge variant="outline">Puesta en marcha</Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          Vacaciones que los colaboradores ya disfrutaron antes de usar PalmApp
        </p>
      </div>

      {/* ── Ayuda ───────────────────────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-5 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1.5 text-muted-foreground">
            <p>
              <strong className="text-foreground">Carga esto antes de liquidar vacaciones nuevas.</strong>{' '}
              Si liquidas primero unas de este año, el sistema las imputa al período más
              viejo y los saldos quedan inflados.
            </p>
            <p>Un registro por cada vacación disfrutada. Cuatro salidas son cuatro registros.</p>
            <p>
              Si solo sabes el año, usa una fecha razonable de ese año y anótalo en la
              observación. Lo que importa es que sea anterior a la primera nómina cargada.
            </p>
            <p>
              <strong className="text-foreground">Quien nunca salió a vacaciones no se toca.</strong>{' '}
              Su saldo vencido es real, y el módulo lo muestra a propósito.
            </p>
          </div>
        </CardContent>
      </Card>

      {!puedeCargar && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Puedes consultar, pero no registrar: hace falta el permiso de editar liquidaciones.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">

        {/* ── Panel izquierdo: colaboradores ──────────────────────────────── */}
        <Card className="border-border">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <CardContent className="max-h-[32rem] overflow-y-auto p-0">
            {cargandoLista ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : filas.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin colaboradores</p>
              </div>
            ) : (
              filas.map((f) => {
                const activo = f.empleado.id === empleadoId;
                const s = SEMAFORO[f.estado_vencimiento];
                return (
                  <button
                    key={f.empleado.id}
                    type="button"
                    onClick={() => elegir(f.empleado.id)}
                    className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors last:border-0 ${
                      activo ? 'bg-primary/10' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                      {getIniciales(f.empleado.nombre_completo)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {f.empleado.nombre_completo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        CC {f.empleado.documento} · Ingreso {formatFecha(f.empleado.fecha_ingreso)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-amber-600">
                        {fmtDias(f.dias_disponibles_exigibles)}
                      </p>
                      <Badge variant="outline" className={`${s.badge} mt-0.5 text-[10px]`}>
                        {s.label}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Panel derecho: detalle y formulario ─────────────────────────── */}
        <div className="space-y-6">
          {!empleadoId ? (
            <Card className="border-border">
              <CardContent className="py-20 text-center">
                <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">Elige un colaborador</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los de saldo alto y estado Vencida son los candidatos a cargar.
                </p>
              </CardContent>
            </Card>
          ) : cargandoDetalle ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando colaborador...
            </div>
          ) : !detalle ? (
            <Card className="border-border">
              <CardContent className="py-20 text-center text-muted-foreground">
                No se pudo cargar el colaborador.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Períodos de causación */}
              <Card className="border-border">
                <div className="border-b border-border bg-muted/20 px-5 py-3">
                  <p className="text-sm font-semibold">
                    Períodos de {detalle.empleado.nombre_completo}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cada registro se imputa al período más antiguo con saldo.
                  </p>
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Período</th>
                          <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Rango</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Generados</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Disfrutados</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Compensados</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.causacion.periodos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                              Sin períodos causados
                            </td>
                          </tr>
                        ) : (
                          detalle.causacion.periodos.map((p) => (
                            <tr key={p.periodo} className="border-b border-border last:border-0">
                              <td className="p-3 text-sm">
                                {p.periodo}
                                {!p.completo && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">en curso</span>
                                )}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {formatFecha(p.inicio)} — {formatFecha(p.fin)}
                              </td>
                              <td className="p-3 text-center text-sm">{fmtDias(p.dias_generados)}</td>
                              <td className="p-3 text-center text-sm">{fmtDias(p.dias_disfrutados)}</td>
                              <td className="p-3 text-center text-sm">{fmtDias(p.dias_compensados)}</td>
                              <td className={`p-3 text-center text-sm font-bold ${p.saldo > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {fmtDias(p.saldo)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Ya cargado */}
              <Card className="border-border">
                <div className="border-b border-border bg-muted/20 px-5 py-3">
                  <p className="text-sm font-semibold">
                    Ya cargado
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      ({historicos.length})
                    </span>
                  </p>
                </div>
                <CardContent className="p-0">
                  {historicos.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">
                      Todavía no se ha cargado ninguna vacación anterior de este colaborador.
                    </p>
                  ) : (
                    historicos.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">
                            {formatFecha(v.fecha_inicio)} — {formatFecha(v.fecha_fin)}
                            <span className="ml-2 text-muted-foreground">
                              {fmtDias(v.dias_habiles)} hábiles
                              {v.dias_dinero > 0 && ` · ${fmtDias(v.dias_dinero)} en dinero`}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.numero_comprobante}
                            {v.estado === 'CANCELADA' && ' · anulado'}
                            {v.observacion && ` · ${v.observacion}`}
                          </p>
                        </div>
                        {v.estado !== 'CANCELADA' && puedeCargar && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAAnular(v)}
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Anular
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Formulario */}
              <Card className="border-border">
                <div className="border-b border-border bg-muted/20 px-5 py-3">
                  <p className="text-sm font-semibold">Agregar histórico</p>
                </div>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Fecha inicio</Label>
                      <Input
                        type="date" max={HOY()} disabled={!puedeCargar}
                        value={form.fechaInicio}
                        onChange={(e) => set('fechaInicio', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Primer día del disfrute real.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha fin</Label>
                      <Input
                        type="date" max={HOY()} min={form.fechaInicio || undefined}
                        disabled={!puedeCargar}
                        value={form.fechaFin}
                        onChange={(e) => set('fechaFin', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Último día del disfrute
                        {calendarioRango > 0 && ` · ${calendarioRango} días calendario`}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Días hábiles</Label>
                      <Input
                        type="number" min={1} max={120} step={1} disabled={!puedeCargar}
                        value={form.diasHabiles}
                        onChange={(e) => set('diasHabiles', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Días en dinero <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                      <Input
                        type="number" min={0} max={30} step={0.5} placeholder="0"
                        disabled={!puedeCargar}
                        value={form.diasDinero}
                        onChange={(e) => set('diasDinero', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha de pago <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                      <Input
                        type="date" max={HOY()} disabled={!puedeCargar}
                        value={form.fechaPago}
                        onChange={(e) => set('fechaPago', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Observación <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                    <Textarea
                      rows={2} disabled={!puedeCargar}
                      placeholder="Cargado desde archivo físico, período 2021"
                      value={form.observacion}
                      onChange={(e) => set('observacion', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      variant="outline"
                      disabled={!puedeCargar || guardando}
                      onClick={() => guardar(true)}
                      className="gap-2"
                    >
                      {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar y agregar otro
                    </Button>
                    <Button
                      disabled={!puedeCargar || guardando}
                      onClick={() => guardar(false)}
                      className="gap-2"
                    >
                      {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Anular un registro mal digitado ─────────────────────────────────── */}
      <AlertDialog open={aAnular !== null} onOpenChange={(v) => { if (!v && !anulando) setAAnular(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular el registro</AlertDialogTitle>
            <AlertDialogDescription>
              Los días vuelven al saldo del colaborador. No hay edición: se anula y se
              vuelve a crear.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea
              rows={3} placeholder="Error de digitación en las fechas."
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
            <Button
              onClick={anular}
              disabled={anulando}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {anulando && <Loader2 className="h-4 w-4 animate-spin" />}
              Anular
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Traduce los errores de §10.6.1 a algo accionable. El contrato pone los
 * extras a veces en la raíz y a veces bajo `detalle`, así que se miran los dos.
 */
function mostrarError(e: ErrorHistorico) {
  const nominas = e.detalle?.nominas ?? e.nominas ?? [];
  const vacaciones = e.detalle?.vacaciones ?? e.vacaciones ?? [];

  switch (e.code) {
    case VacacionesErrorCodes.VACACIONES_HISTORICO_EN_NOMINA:
      toast.error(
        'Ese rango ya lo liquidó una nómina del sistema. Mueve las fechas a antes de la ' +
        `primera nómina cargada.${nominas.length ? ` Nóminas en conflicto: ${nominas.length}.` : ''}`,
        { duration: 10000 },
      );
      break;
    case VacacionesErrorCodes.VACACIONES_SOLAPADAS:
      toast.error(
        'Ya hay una vacación registrada en esas fechas.' +
        (vacaciones.length ? ` Registros que se cruzan: ${vacaciones.length}.` : ''),
        { duration: 8000 },
      );
      break;
    case VacacionesErrorCodes.VACACIONES_DIAS_INVALIDOS: {
      const h = e.detalle?.dias_habiles;
      const c = e.detalle?.dias_calendario;
      toast.error(
        e.message ??
        (h != null && c != null
          ? `${h} días hábiles no caben en un rango de ${c} días calendario.`
          : 'Los días indicados no son válidos.'),
        { duration: 8000 },
      );
      break;
    }
    case VacacionesErrorCodes.EMPLEADO_NO_ENCONTRADO:
      toast.error('Ese colaborador no existe en esta finca');
      break;
    default:
      if (e.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(primero ?? e.message ?? 'Revisa los datos del formulario');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el histórico');
      }
  }
}
