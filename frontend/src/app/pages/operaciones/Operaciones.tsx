import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useEstadoPersistido } from '../../hooks/useEstadoPersistido';
import { useAlCambiar } from '../../hooks/useAlCambiar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import TableSkeleton from '../../components/common/TableSkeleton';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Plus, Eye, Loader2, Trash2, Pencil, Check,
  AlertCircle, Upload, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AprobarRangoDialog } from './importar/AprobarRangoDialog';
import { RevertirEstadoDialog } from '../../components/common/RevertirEstadoDialog';
import { reversionApi } from '../../../api/reversionEstados';
import StatusBadge from '../../components/common/StatusBadge';
import {
  SelectorAnio, SelectorMes, mesDeHoy,
} from '../../components/common/SelectorMes';
import { toast } from 'sonner';
import {
  operacionesApi,
  type Planilla, type Indicadores, type Periodo as PeriodoIndicadores, type EstadoPlanilla,
  type CoberturaPlanilla, type PaginatedMeta,
  type ParamsIndicadores, type Quincena,
} from '../../../api/operaciones';
import { num } from '../../lib/formato';
import { formatFecha } from '../../utils/fecha';

const PER_PAGE = 50;

/** Lo que el usuario escogió en los controles de al lado del selector. */
interface OpcionesPeriodo {
  /** Mes elegido para mensual y quincenal, en formato `YYYY-MM`. */
  mes: string;
  quincena: Quincena;
  /** Año elegido para anual. */
  anio: number;
  desde: string;
  hasta: string;
}

/**
 * Arma los parámetros del endpoint según lo que haya elegido el usuario.
 *
 * El backend resuelve los cinco períodos y acepta las anclas; cada una solo
 * aplica a su período y las demás se ignoran, así que se mandan por separado
 * en vez de acompañar a todas (API_OPERACIONES.md 2.2.1).
 */
/** Con lo que abre la pantalla cuando no hay nada guardado en la sesión. */
function periodoPorDefecto() {
  const hoy = new Date();
  return {
    periodo: 'mensual' as PeriodoIndicadores,
    mes: mesDeHoy(),
    anio: hoy.getFullYear(),
    quincena: (hoy.getDate() <= 15 ? 1 : 2) as Quincena,
  };
}

function paramsDelPeriodo(periodo: PeriodoIndicadores, o: OpcionesPeriodo): ParamsIndicadores {
  if (periodo === 'mensual') return { periodo, mes: o.mes };
  if (periodo === 'quincenal') return { periodo, mes: o.mes, quincena: o.quincena };
  if (periodo === 'anual') return { periodo, anio: o.anio };
  if (periodo === 'personalizado') {
    return { periodo, fecha_desde: o.desde, fecha_hasta: o.hasta };
  }
  return { periodo };
}

export default function Operaciones() {
  const navigate = useNavigate();
  const { hasPermiso } = useAuth();
  /** Diálogo de aprobación en bloque (§13.1). Lo usan los cargues que se
   *  dejaron en borrador para revisarlos antes de aprobar. */
  const [aprobarRangoAbierto, setAprobarRangoAbierto] = useState(false);
  /**
   * La planilla que se está devolviendo a borrador (§7.3). Es la única salida
   * de una planilla aprobada, y solo mientras ninguna nómina que cubra la
   * fecha haya liquidado.
   */
  const [planillaADesaprobar, setPlanillaADesaprobar] = useState<Planilla | null>(null);
  const location = useLocation();

  // ── KPIs con filtro de período ─────────────────────────────────────────────
  const porDefecto = periodoPorDefecto();
  // El período persiste mientras dure la sesión: abrir una planilla y volver
  // ya no devuelve la pantalla al mes corriente.
  const [periodoKPI, setPeriodoKPI] = useEstadoPersistido<PeriodoIndicadores>('operaciones.periodo', porDefecto.periodo);
  const [fechaInicioKPI, setFechaInicioKPI] = useEstadoPersistido('operaciones.desde', '');
  const [fechaFinKPI, setFechaFinKPI] = useEstadoPersistido('operaciones.hasta', '');
  const [mesKPI, setMesKPI] = useEstadoPersistido('operaciones.mes', porDefecto.mes);
  const [quincenaKPI, setQuincenaKPI] = useEstadoPersistido<Quincena>('operaciones.quincena', porDefecto.quincena);
  const [anioKPI, setAnioKPI] = useEstadoPersistido('operaciones.anio', porDefecto.anio);

  /**
   * El período queda guardado por sesión, así que hace falta una salida
   * explícita para volver al mes en curso sin deshacer campo por campo.
   */
  const reiniciarPeriodo = () => {
    const d = periodoPorDefecto();
    setPeriodoKPI(d.periodo);
    setMesKPI(d.mes);
    setAnioKPI(d.anio);
    setQuincenaKPI(d.quincena);
    setFechaInicioKPI('');
    setFechaFinKPI('');
    setPaginaLista(1);
  };
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [cargandoIndicadores, setCargandoIndicadores] = useState(false);

  const cargarIndicadores = useCallback(async () => {
    if (periodoKPI === 'personalizado' && (!fechaInicioKPI || !fechaFinKPI)) return;
    // El input de mes se puede dejar en blanco; sin mes no hay rango que pedir.
    if ((periodoKPI === 'mensual' || periodoKPI === 'quincenal') && !mesKPI) return;
    setCargandoIndicadores(true);
    try {
      const res = await operacionesApi.indicadores(
        paramsDelPeriodo(periodoKPI, {
          mes: mesKPI,
          quincena: quincenaKPI,
          anio: anioKPI,
          desde: fechaInicioKPI,
          hasta: fechaFinKPI,
        }),
      );
      setIndicadores(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar indicadores');
    } finally {
      setCargandoIndicadores(false);
    }
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI, mesKPI, quincenaKPI, anioKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // El backend resuelve que fechas cubre cada periodo y las devuelve en
  // `indicadores.periodo`. La lista se cuelga de ese mismo rango para no
  // mostrar un recorte distinto al que cuentan las tarjetas de arriba.
  const desdeLista = indicadores?.periodo.fecha_desde;
  const hastaLista = indicadores?.periodo.fecha_hasta;

  // ── Listado de planillas ───────────────────────────────────────────────────
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [metaLista, setMetaLista] = useState<PaginatedMeta | null>(null);
  const [paginaLista, setPaginaLista] = useEstadoPersistido('operaciones.pagina', 1);
  const [cargandoLista, setCargandoLista] = useState(true);

  // ── Eliminación de planilla ────────────────────────────────────────────────
  const [planillaAEliminar, setPlanillaAEliminar] = useState<Planilla | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // ── Aprobación desde el listado ────────────────────────────────────────────
  // Reproducimos el flujo del wizard: cobertura estricta (§7.1) + modal con
  // faltantes bloqueante + modal de planilla vacía. `aprobandoId` marca la
  // fila en curso para desactivar sus botones mientras se procesa.
  const [aprobandoId, setAprobandoId] = useState<number | null>(null);
  const [coberturaFaltantes, setCoberturaFaltantes] = useState<CoberturaPlanilla | null>(null);
  const [alertaPlanillaVacia, setAlertaPlanillaVacia] = useState(false);
  // Planilla objetivo cuando una alerta bloquea temporalmente el flujo.
  // Al confirmar "Aprobar de todas formas" desde el modal, se retoma la
  // aprobación de esta planilla saltándose las validaciones.
  const [planillaPendiente, setPlanillaPendiente] = useState<Planilla | null>(null);

  /**
   * Llamada real al backend para aprobar. Sin validaciones previas —
   * se usa tanto en el camino directo (sin alertas) como al confirmar
   * "Aprobar de todas formas" en cualquiera de los dos modales.
   */
  const ejecutarAprobar = async (p: Planilla) => {
    setAprobandoId(p.id);
    try {
      const res = await operacionesApi.aprobar(p.id);
      const casc = res.aprobaciones_cascada;
      if (casc && (casc.horas_extra > 0 || casc.ausencias > 0)) {
        toast.success(
          `Planilla aprobada. Aprobadas en cascada: ${casc.horas_extra} horas extra, ${casc.ausencias} ausencias.`,
          { duration: 6000 },
        );
      } else {
        toast.success('Planilla aprobada');
      }
      cargarLista();
      cargarIndicadores();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al aprobar la planilla');
    } finally {
      setAprobandoId(null);
      setPlanillaPendiente(null);
    }
  };

  const aprobarPlanilla = async (p: Planilla) => {
    setAprobandoId(p.id);

    // Aviso informativo (NO bloqueante): planilla vacía. Suma jornales +
    // cosechas + ausencias del listado — si es 0, mostramos el modal con
    // opción de aprobar de todas formas.
    const totalHijos =
      (p.jornales_count ?? 0) + (p.cosechas_count ?? 0) + (p.ausencias_count ?? 0);
    if (totalHijos === 0) {
      setPlanillaPendiente(p);
      setAlertaPlanillaVacia(true);
      setAprobandoId(null);
      return;
    }

    // Aviso informativo: cobertura de personal (§7.1). Si hay faltantes,
    // el modal permite decidir. Si el endpoint falla, seguimos adelante
    // sin bloquear (es solo informativo).
    try {
      const cov = await operacionesApi.cobertura(p.id);
      if (cov.data?.tiene_faltantes) {
        setPlanillaPendiente(p);
        setCoberturaFaltantes(cov.data);
        setAprobandoId(null);
        return;
      }
    } catch (err) {
      console.warn('[cobertura] fallo consultar faltantes:', err);
    }

    // Cobertura OK → aprobar directo.
    await ejecutarAprobar(p);
  };

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await operacionesApi.listar({
        per_page: PER_PAGE,
        page: paginaLista,
        fecha_desde: desdeLista,
        fecha_hasta: hastaLista,
      });
      setPlanillas(res.data);
      setMetaLista(res.meta);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar planillas');
    } finally {
      setCargandoLista(false);
    }
  }, [paginaLista, desdeLista, hastaLista]);

  // Al mover el período, seguir parado en la página 5 del rango anterior
  // deja la lista vacía sin explicación. Se vuelve al principio. El rango
  // llega con los indicadores, así que la primera vez que se conoce no es un
  // cambio: es el estado que venía de la sesión y hay que respetarlo.
  useAlCambiar(
    desdeLista && hastaLista ? `${desdeLista}|${hastaLista}` : '',
    () => setPaginaLista(1),
  );

  // Refresca cuando el usuario navega a `/operaciones`. `location.key`
  // cambia en cada navegación (aunque sea al mismo path), así que al volver
  // de editar/aprobar/liquidar una planilla, el listado siempre trae la
  // data fresca — evita ver "0 colaboradores" cuando el backend ya persistió
  // los cambios.
  useEffect(() => { cargarLista(); }, [cargarLista, location.key]);

  const eliminarPlanilla = async () => {
    if (!planillaAEliminar) return;
    setEliminando(true);
    const id = planillaAEliminar.id;
    try {
      // §2.5 del doc — DELETE ahora es RECURSIVO: el backend borra en
      // cascada jornales + cosechas + ausencias + horas extras en una
      // transacción atómica. Solo bloquea si la planilla está APROBADA o
      // si alguna cosecha está asignada a un viaje.
      await operacionesApi.eliminar(id);
    } catch (e: any) {
      const code = e?.code ?? e?.error_code;
      if (code === 'OPERACION_APROBADA') {
        toast.error('No se puede eliminar una planilla aprobada');
      } else if (code === 'COSECHA_EN_VIAJE') {
        toast.error('Hay cosechas asignadas a un viaje. Desasocia las cosechas del viaje primero.');
      } else {
        toast.error(e?.message ?? 'Error al eliminar la planilla');
      }
      setEliminando(false);
      return;
    }
    toast.success('Planilla eliminada');
    setPlanillaAEliminar(null);
    setEliminando(false);
    cargarLista();
    cargarIndicadores();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatearFecha = (iso: string): string =>
    formatFecha(iso, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });


  const mapEstadoUI = (e: EstadoPlanilla): 'BORRADOR' | 'APROBADO' =>
    e === 'BORRADOR' ? 'BORRADOR' : 'APROBADO';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operaciones"
        description="Planillas del día: jornales, cosecha y labores de la finca."
        actions={
          <>
            {hasPermiso('operaciones.aprobar') && (
              <Button variant="outline" onClick={() => setAprobarRangoAbierto(true)}>
                <Check className="h-4 w-4" strokeWidth={2} />
                Aprobar por rango
              </Button>
            )}
            {/* El histórico de antes del sistema entra por archivo, no tarjeta
                por tarjeta en el wizard (§13 API_OPERACIONES). */}
            {hasPermiso('operaciones.importar') && (
              <Button variant="outline" onClick={() => navigate('/operaciones/importar')}>
                <Upload className="h-4 w-4" strokeWidth={2} />
                Importar histórico
              </Button>
            )}
            <Button onClick={() => navigate('/operaciones/planilla/nueva')}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nueva planilla del día
            </Button>
          </>
        }
      />
      {/* El período manda sobre los indicadores y sobre la lista de abajo:
          las dos leen el mismo rango de fechas. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2>Indicadores del período</h2>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Label className="text-sm font-medium">Período:</Label>
          <Select value={periodoKPI} onValueChange={(v) => setPeriodoKPI(v as PeriodoIndicadores)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {(periodoKPI === 'mensual' || periodoKPI === 'quincenal') && (
            <SelectorMes valor={mesKPI} onChange={setMesKPI} />
          )}
          {periodoKPI === 'anual' && (
            <SelectorAnio valor={anioKPI} onChange={setAnioKPI} />
          )}
          {periodoKPI === 'quincenal' && (
            <Select value={String(quincenaKPI)}
              onValueChange={(v) => setQuincenaKPI(Number(v) as Quincena)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Del 1 al 15</SelectItem>
                <SelectItem value="2">Del 16 al fin de mes</SelectItem>
              </SelectContent>
            </Select>
          )}
          {periodoKPI === 'personalizado' && (
            <>
              <Input type="date" aria-label="Fecha de inicio" className="w-40"
                value={fechaInicioKPI} onChange={(e) => setFechaInicioKPI(e.target.value)} />
              <Input type="date" aria-label="Fecha de fin" className="w-40"
                value={fechaFinKPI} onChange={(e) => setFechaFinKPI(e.target.value)} />
            </>
          )}
          <Button variant="ghost" size="sm" onClick={reiniciarPeriodo}
            title="Vuelve al mes en curso">
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Reiniciar
          </Button>
        </div>
      </div>

      <StatStrip
        loading={cargandoIndicadores && !indicadores}
        items={[
          {
            label: 'Planillas en borrador',
            value: num(indicadores?.planillas_borrador ?? 0),
            note: 'sin aprobar',
          },
          {
            label: 'Planillas aprobadas',
            value: num(indicadores?.planillas_aprobadas ?? 0),
            note: 'cuentan como día operado',
          },
          {
            label: 'Total de planillas',
            value: num(indicadores?.total_planillas ?? 0),
            note: 'en el rango elegido',
          },
        ]}
      />

      <div className="space-y-4">
        <div className="space-y-1">
          <h2>Planillas del período</h2>
          <p className="text-[15px] text-muted-foreground">
            {metaLista && desdeLista && hastaLista
              ? `${num(metaLista.total)} ${metaLista.total === 1 ? 'planilla' : 'planillas'} entre ${formatearFecha(desdeLista)} y ${formatearFecha(hastaLista)}`
              : 'Registro de operaciones diarias por fecha.'}
          </p>
        </div>

        {cargandoLista ? (
          <Card className="gap-0">
            <TableSkeleton rows={6} columns={4} />
          </Card>
        ) : planillas.length === 0 ? (
          <Card className="gap-0">
            <EmptyState
              title="No hay planillas en este período"
              description="Cambia el período arriba o crea la planilla del día para empezar a registrar jornales y cosecha."
              action={{
                label: 'Crear planilla del día',
                onClick: () => navigate('/operaciones/planilla/nueva'),
              }}
            />
          </Card>
        ) : (
          <Card className="gap-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-[13px] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Colaboradores</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {planillas.map((planilla) => (
                    <tr key={planilla.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {formatearFecha(planilla.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={mapEstadoUI(planilla.estado)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Desde el 2026-09-28 `colaboradores_count` ya
                            incluye a los colaboradores con ausencia y
                            deduplica: quien trabajó medio día y además tiene
                            novedad cuenta una sola vez. Sumarle
                            `ausencias_count` aquí lo contaba dos veces. */}
                        <span
                          className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
                          title={`${planilla.ausencias_count ?? 0} con novedad registrada`}
                        >
                          {num(planilla.colaboradores_count ?? 0)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ver planilla"
                            title="Ver planilla"
                            className="text-muted-foreground"
                            onClick={() => navigate(`/operaciones/planilla/${planilla.id}`)}
                          >
                            <Eye className="h-4 w-4" strokeWidth={2} />
                          </Button>
                          {planilla.estado === 'BORRADOR' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar planilla"
                              title="Editar planilla"
                              className="text-muted-foreground"
                              onClick={() => navigate(`/operaciones/planilla/editar/${planilla.id}`)}
                              disabled={aprobandoId === planilla.id}
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2} />
                            </Button>
                          )}
                          {planilla.estado === 'BORRADOR' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Aprobar planilla"
                              title="Aprobar planilla"
                              className="text-muted-foreground hover:text-success"
                              onClick={() => aprobarPlanilla(planilla)}
                              disabled={aprobandoId === planilla.id}
                            >
                              {aprobandoId === planilla.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" strokeWidth={2} />
                              )}
                            </Button>
                          )}
                          {/* §7.3 — Permiso aparte: `operaciones.aprobar` no
                              lo incluye. Sin él no se pinta el botón. */}
                          {planilla.estado === 'APROBADA' && hasPermiso('operaciones.desaprobar') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Devolver a borrador"
                              title="Devolver a borrador"
                              className="text-muted-foreground hover:text-warning"
                              onClick={() => setPlanillaADesaprobar(planilla)}
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={2} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar planilla"
                            title={planilla.estado === 'APROBADA'
                              ? 'Una planilla aprobada no se elimina'
                              : 'Eliminar planilla'}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setPlanillaAEliminar(planilla)}
                            disabled={planilla.estado === 'APROBADA' || aprobandoId === planilla.id}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {metaLista && metaLista.last_page > 1 && (
              <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
                <p className="text-sm text-muted-foreground">
                  Página {metaLista.current_page} de {metaLista.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cargandoLista || metaLista.current_page <= 1}
                    onClick={() => setPaginaLista((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    Anteriores
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cargandoLista || metaLista.current_page >= metaLista.last_page}
                    onClick={() => setPaginaLista((p) => p + 1)}
                  >
                    Siguientes
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <AlertDialog
        open={!!planillaAEliminar}
        onOpenChange={(o) => !o && setPlanillaAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar planilla del día</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarPlanilla}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bloqueo: planilla vacía. No permite aprobar hasta agregar al menos
          un jornal, cosecha, ausencia u hora extra. */}
      <AlertDialog open={alertaPlanillaVacia} onOpenChange={setAlertaPlanillaVacia}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              La planilla está vacía
            </AlertDialogTitle>
            <AlertDialogDescription>
              No has registrado ninguna labor de palma, labor de finca,
              ausencia ni hora extra en esta planilla. Puedes editarla
              antes o aprobarla de todas formas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAlertaPlanillaVacia(false);
                setPlanillaPendiente(null);
              }}
            >
              Volver a editar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setAlertaPlanillaVacia(false);
                if (planillaPendiente) {
                  await ejecutarAprobar(planillaPendiente);
                }
              }}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Aprobar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bloqueo estricto: cobertura de personal (§7.1). No deja aprobar
          hasta que todos los colaboradores activos con contrato vigente y
          los operarios activos tengan actividad o novedad registrada. */}
      <AlertDialog
        open={!!coberturaFaltantes}
        onOpenChange={(o) => !o && setCoberturaFaltantes(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Faltan colaboradores por registrar
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {(coberturaFaltantes?.colaboradores_faltantes.length ?? 0)}
                  {' '}colaborador(es) y{' '}
                  {(coberturaFaltantes?.operarios_faltantes.length ?? 0)}
                  {' '}operario(s) no registraron labor de palma, labor de
                  finca ni novedad para este día. Puedes registrar su
                  actividad antes o aprobar de todas formas.
                </p>
                {(coberturaFaltantes?.colaboradores_faltantes.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Colaboradores ({coberturaFaltantes!.colaboradores_faltantes.length})
                    </p>
                    <ul className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {coberturaFaltantes!.colaboradores_faltantes.map((c) => (
                        <li key={`col-${c.id}`}>
                          {c.nombre_completo}
                          <span className="text-xs text-muted-foreground ml-1">
                            · CC {c.documento}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(coberturaFaltantes?.operarios_faltantes.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Operarios ({coberturaFaltantes!.operarios_faltantes.length})
                    </p>
                    <ul className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {coberturaFaltantes!.operarios_faltantes.map((o) => (
                        <li key={`op-${o.id}`}>
                          {o.nombre_completo}
                          <span className="text-xs text-muted-foreground ml-1">
                            · CC {o.cedula}
                            {o.tercero_nombre ? ` · ${o.tercero_nombre}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCoberturaFaltantes(null);
                setPlanillaPendiente(null);
              }}
            >
              Volver a editar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setCoberturaFaltantes(null);
                if (planillaPendiente) {
                  await ejecutarAprobar(planillaPendiente);
                }
              }}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Aprobar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AprobarRangoDialog
        abierto={aprobarRangoAbierto}
        onCerrar={() => setAprobarRangoAbierto(false)}
        onAprobado={() => { void cargarLista(); void cargarIndicadores(); }}
      />

      <RevertirEstadoDialog
        abierto={planillaADesaprobar !== null}
        onCerrar={() => setPlanillaADesaprobar(null)}
        titulo="Devolver la planilla a borrador"
        descripcion="Vuelve a ser editable en el wizard. Mientras siga en borrador, ese día no cuenta como día operado para la nómina."
        etiquetaAccion="Devolver a borrador"
        efectos={[
          'Las horas extra y ausencias aprobadas de la planilla vuelven a pendiente.',
          'El día deja de verse en dashboard, insights, ajuste de gajos y viajes.',
          'Al terminar las correcciones hay que volver a aprobarla.',
        ]}
        verificar={async () => (await reversionApi.planilla.verificar(planillaADesaprobar!.id)).data}
        confirmar={async (motivo) => {
          const res = await reversionApi.planilla.desaprobar(planillaADesaprobar!.id, motivo);
          toast.success(res.message ?? 'Planilla devuelta a borrador');
        }}
        onHecho={() => { void cargarLista(); void cargarIndicadores(); }}
      />
    </div>
  );
}