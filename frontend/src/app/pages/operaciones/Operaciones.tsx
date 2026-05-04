import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

const PER_PAGE = 50;

export default function Operaciones() {
  const navigate = useNavigate();

  // ── Indicadores con filtro de período ───────────────────────────────────────
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

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await operacionesApi.listar({ per_page: PER_PAGE, page: 1 });
      setPlanillas(res.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cargar planillas');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => { cargarLista(); }, [cargarLista]);

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

  const mapEstadoUI = (e: EstadoPlanilla): string =>
    e === 'BORRADOR' ? 'BORRADOR' : 'APROBADO';

  return (
    <div className="space-y-8">
      {/* Header con botones */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
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

      {/* Indicadores Principales */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm font-medium">Período:</Label>
            <Select value={periodoKPI} onValueChange={(value: any) => setPeriodoKPI(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodoKPI === 'personalizado' && (
              <>
                <Input
                  type="date"
                  value={fechaInicioKPI}
                  onChange={(e) => setFechaInicioKPI(e.target.value)}
                  className="w-40"
                  placeholder="Fecha inicio"
                />
                <Input
                  type="date"
                  value={fechaFinKPI}
                  onChange={(e) => setFechaFinKPI(e.target.value)}
                  className="w-40"
                  placeholder="Fecha fin"
                />
              </>
            )}
            {cargandoIndicadores && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Planillas en Borrador */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>

          {/* Planillas Aprobadas */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>

          {/* Total Planillas */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}