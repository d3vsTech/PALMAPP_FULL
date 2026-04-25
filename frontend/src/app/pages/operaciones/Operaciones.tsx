import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Plus, Eye, FileText, CheckCircle, Clock, Loader2 } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  operacionesApi,
  type Planilla,
  type Indicadores,
  type PeriodoIndicadores,
  type EstadoPlanilla,
} from '../../../api/operaciones';

const PER_PAGE = 15;

export default function Operaciones() {
  const navigate = useNavigate();

  // ── Indicadores ──────────────────────────────────────
  const [periodoKPI, setPeriodoKPI] = useState<PeriodoIndicadores>('mensual');
  const [fechaDesdeKPI, setFechaDesdeKPI] = useState('');
  const [fechaHastaKPI, setFechaHastaKPI] = useState('');
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [cargandoIndicadores, setCargandoIndicadores] = useState(false);

  const cargarIndicadores = useCallback(async () => {
    if (periodoKPI === 'personalizado' && (!fechaDesdeKPI || !fechaHastaKPI)) return;
    setCargandoIndicadores(true);
    try {
      const res = await operacionesApi.indicadores({
        periodo: periodoKPI,
        fecha_desde: periodoKPI === 'personalizado' ? fechaDesdeKPI : undefined,
        fecha_hasta: periodoKPI === 'personalizado' ? fechaHastaKPI : undefined,
      });
      setIndicadores(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar indicadores');
    } finally {
      setCargandoIndicadores(false);
    }
  }, [periodoKPI, fechaDesdeKPI, fechaHastaKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // ── Listado ──────────────────────────────────────────
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPlanilla | ''>('');
  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState('');
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState('');

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await operacionesApi.listar({
        estado: estadoFiltro || undefined,
        fecha_desde: fechaDesdeFiltro || undefined,
        fecha_hasta: fechaHastaFiltro || undefined,
        per_page: PER_PAGE,
        page,
      });
      setPlanillas(res.data);
      setLastPage(res.meta?.last_page ?? 1);
      setTotal(res.meta?.total ?? res.data.length);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar planillas');
    } finally {
      setCargandoLista(false);
    }
  }, [estadoFiltro, fechaDesdeFiltro, fechaHastaFiltro, page]);

  useEffect(() => { cargarLista(); }, [cargarLista]);
  useEffect(() => { setPage(1); }, [estadoFiltro, fechaDesdeFiltro, fechaHastaFiltro]);

  // ── Helpers ──────────────────────────────────────────
  const formatearFecha = (iso: string): string => {
    if (!iso) return '—';
    try {
      // Si ya viene con T (timestamp completo) usarlo directo, si no agregar T00:00:00
      const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('es-CO', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return iso; }
  };

  const formatearMoneda = (n: number | string | null | undefined): string => {
    if (n === null || n === undefined) return '—';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (Number.isNaN(num) || num === 0) return '—';
    return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  };

  const mapEstadoUI = (e: EstadoPlanilla): string =>
    e === 'BORRADOR' ? 'BORRADOR' : 'APROBADO';

  return (
    <div className="space-y-8">

      {/* Header */}
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
                <Input type="date" value={fechaDesdeKPI} onChange={(e) => setFechaDesdeKPI(e.target.value)} className="w-40" placeholder="Fecha inicio" />
                <Input type="date" value={fechaHastaKPI} onChange={(e) => setFechaHastaKPI(e.target.value)} className="w-40" placeholder="Fecha fin" />
              </>
            )}
            {cargandoIndicadores && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
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
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                    <Clock className="h-4 w-4" />
                    <span>Pendientes</span>
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
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                    <CheckCircle className="h-4 w-4" />
                    <span>Cerradas</span>
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
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                    <FileText className="h-4 w-4" />
                    <span>Período seleccionado</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Listado */}
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
              <p className="mb-4 text-sm text-muted-foreground">Comienza creando tu primera planilla del día</p>
              <Button onClick={() => navigate('/operaciones/planilla/nueva')}>
                <Plus className="mr-2 h-4 w-4" /> Crear Primera Planilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">

              {/* Filtros dentro del card */}
              <div className="flex items-end gap-3 flex-wrap p-4 border-b border-border bg-muted/10">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
                  <Select
                    value={estadoFiltro || 'todos'}
                    onValueChange={(v) => setEstadoFiltro(v === 'todos' ? '' : (v as EstadoPlanilla))}
                  >
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="BORRADOR">Borrador</SelectItem>
                      <SelectItem value="APROBADA">Aprobado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Desde</Label>
                  <Input type="date" className="w-40 h-9" value={fechaDesdeFiltro} onChange={(e) => setFechaDesdeFiltro(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Hasta</Label>
                  <Input type="date" className="w-40 h-9" value={fechaHastaFiltro} onChange={(e) => setFechaHastaFiltro(e.target.value)} />
                </div>
              </div>

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
                    {planillas.map((p, index) => (
                      <tr
                        key={p.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">
                            {formatearFecha(p.fecha)}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={mapEstadoUI(p.estado)} />
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {p.colaboradores_count ?? 0}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-success">
                            {formatearMoneda(p.total_general)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Visualizar"
                            >
                              <Link to={`/operaciones/planilla/${p.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {lastPage} · {total} planillas
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= lastPage}
                      onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}