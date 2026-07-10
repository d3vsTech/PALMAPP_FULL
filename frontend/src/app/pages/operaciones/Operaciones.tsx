import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
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
import { Plus, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  operacionesApi,
  type Planilla, type Indicadores, type Periodo as PeriodoIndicadores, type EstadoPlanilla,
} from '../../../api/operaciones';

const PER_PAGE = 50;

export default function Operaciones() {
  const navigate = useNavigate();

  // ── KPIs con filtro de período ─────────────────────────────────────────────
  const [periodoKPI, setPeriodoKPI] = useState<PeriodoIndicadores>('mensual');
  const [fechaInicioKPI, setFechaInicioKPI] = useState('');
  const [fechaFinKPI, setFechaFinKPI] = useState('');
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [cargandoIndicadores, setCargandoIndicadores] = useState(false);

  const cargarIndicadores = useCallback(async () => {
    if (periodoKPI === 'personalizado' && (!fechaInicioKPI || !fechaFinKPI)) return;
    setCargandoIndicadores(true);
    try {
      const res = await operacionesApi.indicadores({
        periodo: periodoKPI,
        fecha_desde: periodoKPI === 'personalizado' ? fechaInicioKPI : undefined,
        fecha_hasta: periodoKPI === 'personalizado' ? fechaFinKPI : undefined,
      });
      setIndicadores(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar indicadores');
    } finally {
      setCargandoIndicadores(false);
    }
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // ── Listado de planillas ───────────────────────────────────────────────────
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // ── Eliminación de planilla ────────────────────────────────────────────────
  const [planillaAEliminar, setPlanillaAEliminar] = useState<Planilla | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await operacionesApi.listar({ per_page: PER_PAGE, page: 1 });
      // DEBUG: log de los conteos que devuelve el backend por planilla.
      // Sirve para verificar si el count viene mal desde el backend.
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Planillas del backend:', res.data?.map(p => ({
        id: p.id,
        fecha: p.fecha,
        estado: p.estado,
        colaboradores_count: p.colaboradores_count,
        jornales_count: p.jornales_count,
        cosechas_count: p.cosechas_count,
        ausencias_count: p.ausencias_count,
        total_jornales_sum: p.total_jornales_sum,
        total_cosechas_sum: p.total_cosechas_sum,
        total_general: p.total_general,
      })));
      setPlanillas(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar planillas');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => { cargarLista(); }, [cargarLista]);

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
  const formatearFecha = (iso: string): string => {
    if (!iso || typeof iso !== 'string') return '—';
    const ymd = iso.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return iso;
    const d = new Date(ymd + 'T12:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CO', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatearMoneda = (n: number | string | null | undefined): string => {
    if (n === null || n === undefined) return '—';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (Number.isNaN(num) || num === 0) return '—';
    return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const mapEstadoUI = (e: EstadoPlanilla): 'BORRADOR' | 'APROBADO' =>
    e === 'BORRADOR' ? 'BORRADOR' : 'APROBADO';

  return (
    <div className="space-y-8">
      {/* Header con botones - mismo estilo que Mi Plantación */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Operaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las labores diarias, planillas de cosecha y jornales
          </p>
        </div>
        <Button
          onClick={() => navigate('/operaciones/planilla/nueva')}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" />
          Nueva Planilla del Día
        </Button>
      </div>

      {/* KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Período:</Label>
            <Select value={periodoKPI} onValueChange={(value: any) => setPeriodoKPI(value)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodoKPI === 'personalizado' && (
              <>
                <Input type="date" value={fechaInicioKPI}
                  onChange={(e) => setFechaInicioKPI(e.target.value)}
                  className="w-40" placeholder="Fecha inicio" />
                <Input type="date" value={fechaFinKPI}
                  onChange={(e) => setFechaFinKPI(e.target.value)}
                  className="w-40" placeholder="Fecha fin" />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Planillas en Borrador</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {cargandoIndicadores ? '—' : (indicadores?.planillas_borrador ?? 0)}
                    </p>
                    <span className="text-sm text-muted-foreground">pendientes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Planillas Aprobadas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {cargandoIndicadores ? '—' : (indicadores?.planillas_aprobadas ?? 0)}
                    </p>
                    <span className="text-sm text-muted-foreground">completadas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Planillas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {cargandoIndicadores ? '—' : (indicadores?.total_planillas ?? 0)}
                    </p>
                    <span className="text-sm text-muted-foreground">registros</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de planillas */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Planillas Recientes</h2>
          <p className="text-muted-foreground">Registro de operaciones diarias por fecha</p>
        </div>

        {cargandoLista ? (
          <Card className="border-border">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : planillas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay planillas registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza creando tu primera planilla del día
              </p>
              <Button onClick={() => navigate('/operaciones/planilla/nueva')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Planilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Colaboradores</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Total Jornales</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planillas.map((planilla, index) => (
                      <tr
                        key={planilla.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">
                            {formatearFecha(planilla.fecha)}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={mapEstadoUI(planilla.estado)} />
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {planilla.colaboradores_count ?? 0}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-success">
                            {formatearMoneda(planilla.total_general)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm" variant="outline"
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Visualizar"
                              onClick={() => navigate(`/operaciones/planilla/${planilla.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              title="Eliminar"
                              onClick={() => setPlanillaAEliminar(planilla)}
                              disabled={planilla.estado === 'APROBADA'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
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
    </div>
  );
}