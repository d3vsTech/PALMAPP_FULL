import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus, Truck, Package, MapPin, Scale, Eye, TrendingUp,
  CheckCircle, FileText, Search, Calculator, Edit, Trash2, Loader2,
} from 'lucide-react';
import {
  viajesApi,
  parseFechaAPI,
  type Viaje,
  type EstadoViajeApi,
  type IndicadoresViajes,
} from '../../../api/viajes';
import { toast } from 'sonner';

// ─── Mapeos de display ──────────────────────────────────────────────
const LABEL_ESTADO: Record<EstadoViajeApi, string> = {
  CREADO: 'Creado',
  EN_CAMINO: 'En Camino',
  EN_PLANTA: 'En Planta',
  FINALIZADO: 'Finalizado',
};

type EstadoUI = '' | 'CREADO' | 'EN_CAMINO' | 'EN_PLANTA' | 'FINALIZADO';

function mapPeriodoToAPI(periodo: string): 'SEMANAL' | 'MENSUAL' | 'ANUAL' | 'CUSTOM' {
  if (periodo === 'semanal') return 'SEMANAL';
  if (periodo === 'mensual') return 'MENSUAL';
  if (periodo === 'personalizado') return 'CUSTOM';
  return 'MENSUAL';
}

// ─── Badge helpers ──────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoViajeApi }) {
  switch (estado) {
    case 'CREADO':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
          <FileText className="h-3 w-3 mr-1" /> Creado
        </Badge>
      );
    case 'EN_CAMINO':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <Truck className="h-3 w-3 mr-1" /> En Camino
        </Badge>
      );
    case 'EN_PLANTA':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
          <MapPin className="h-3 w-3 mr-1" /> En Planta
        </Badge>
      );
    case 'FINALIZADO':
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <CheckCircle className="h-3 w-3 mr-1" /> Finalizado
        </Badge>
      );
  }
}

// ─── Componente principal ──────────────────────────────────────────
export default function Viajes() {
  const navigate = useNavigate();

  // KPIs: período
  const [periodoKPI, setPeriodoKPI] = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>('mensual');
  const [fechaInicioKPI, setFechaInicioKPI] = useState('');
  const [fechaFinKPI, setFechaFinKPI] = useState('');

  // Filtros de listado
  const [filtros, setFiltros] = useState({
    remision: '',
    fecha: '',
    estado: '' as EstadoUI,
    vehiculo: '',
    conductor: '',
    extractora: '',
  });
  const setFiltro = (campo: keyof typeof filtros, valor: string) =>
    setFiltros((prev) => ({ ...prev, [campo]: valor as any }));

  // Data state
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresViajes | null>(null);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [loadingIndic, setLoadingIndic] = useState(true);

  // ── Cargar indicadores según período ──────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingIndic(true);
      try {
        let params: any = {};
        if (periodoKPI === 'personalizado') {
          if (!fechaInicioKPI || !fechaFinKPI) {
            setLoadingIndic(false);
            return;
          }
          params = { periodo: 'CUSTOM', desde: fechaInicioKPI, hasta: fechaFinKPI };
        } else if (periodoKPI === 'quincenal') {
          const hoy = new Date();
          const ini = new Date(hoy);
          ini.setDate(hoy.getDate() - 15);
          params = {
            periodo: 'CUSTOM',
            desde: ini.toISOString().split('T')[0],
            hasta: hoy.toISOString().split('T')[0],
          };
        } else {
          params = { periodo: mapPeriodoToAPI(periodoKPI) };
        }
        const res = await viajesApi.indicadores(params);
        setIndicadores(res.data);
      } catch {
        setIndicadores(null);
      } finally {
        setLoadingIndic(false);
      }
    })();
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI]);

  // ── Cargar viajes ──────────────────────────────────────────────
  const cargarViajes = async () => {
    setLoadingViajes(true);
    try {
      const params: any = { per_page: 100 };
      if (filtros.remision)  params.remision  = filtros.remision;
      if (filtros.fecha)     params.fecha     = filtros.fecha;
      if (filtros.estado)    params.estado    = filtros.estado;
      if (filtros.vehiculo)  params.vehiculo  = filtros.vehiculo;
      if (filtros.conductor) params.conductor = filtros.conductor;
      const res = await viajesApi.listar(params);
      setViajes(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar viajes');
    } finally {
      setLoadingViajes(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(cargarViajes, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.remision, filtros.fecha, filtros.estado, filtros.vehiculo, filtros.conductor]);

  // Filtro de extractora en cliente (el API no lo tiene por nombre)
  const viajesFiltrados = useMemo(
    () =>
      viajes.filter((v) =>
        (v.extractora?.razon_social ?? '')
          .toLowerCase()
          .includes(filtros.extractora.toLowerCase()),
      ),
    [viajes, filtros.extractora],
  );

  // ── Eliminar viaje ──────────────────────────────────────────────
  const eliminarViaje = async (viajeId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('¿Estás seguro de que deseas eliminar este viaje? Esta acción no se puede deshacer.')) return;
    try {
      await viajesApi.eliminar(viajeId);
      toast.success('Viaje eliminado exitosamente');
      cargarViajes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar viaje');
    }
  };

  // ── KPIs derivados ─────────────────────────────────────────────
  const totalViajes    = indicadores?.total_viajes    ?? viajes.length;
  const viajesEnCamino = indicadores?.en_camino       ?? viajes.filter((v) => v.estado === 'EN_CAMINO').length;
  const viajesFinaliz  = indicadores?.finalizados     ?? viajes.filter((v) => v.estado === 'FINALIZADO').length;
  const pesoTotal      = indicadores?.kilogramos_totales
    ? parseFloat(indicadores.kilogramos_totales)
    : viajes.reduce((s, v) => s + (parseFloat(String(v.peso_viaje ?? 0)) || 0), 0);
  const gajosTotal     = indicadores?.gajos_totales   ?? viajes.reduce((s, v) => s + (v.cantidad_gajos_total ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Viajes</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de despachos de fruto hacia la extractora
          </p>
        </div>
        <Button
          onClick={() => navigate('/viajes/nuevo')}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" /> Nuevo Viaje
        </Button>
      </div>

      {/* KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Período:</Label>
            <Select value={periodoKPI} onValueChange={(v: any) => setPeriodoKPI(v)}>
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
                <Input type="date" value={fechaInicioKPI} onChange={(e) => setFechaInicioKPI(e.target.value)} className="w-40" />
                <Input type="date" value={fechaFinKPI} onChange={(e) => setFechaFinKPI(e.target.value)} className="w-40" />
              </>
            )}
            {loadingIndic && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Viajes</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{totalViajes}</p>
                <span className="text-sm text-muted-foreground">despachos</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                <TrendingUp className="h-4 w-4" /><span>Período seleccionado</span>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">En Camino</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{viajesEnCamino}</p>
                <span className="text-sm text-muted-foreground">activos</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                <Truck className="h-4 w-4" /><span>En tránsito</span>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Finalizados</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{viajesFinaliz}</p>
                <span className="text-sm text-muted-foreground">completados</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                <Scale className="h-4 w-4" /><span>Cerrados</span>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Kilogramos Totales</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{pesoTotal.toLocaleString()}</p>
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                <Package className="h-4 w-4" /><span>{gajosTotal.toLocaleString()} gajos</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Viajes Registrados</h2>
          <p className="text-muted-foreground">Despachos de fruto hacia extractoras</p>
        </div>

        <Card className="glass-subtle border-border">
          <CardContent className="pt-6">
            {loadingViajes ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Cargando viajes...</p>
              </div>
            ) : viajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No hay viajes registrados</h3>
                <p className="mb-4 text-sm text-muted-foreground">Comienza creando tu primer viaje de despacho</p>
                <Button onClick={() => navigate('/viajes/nuevo')}>
                  <Plus className="mr-2 h-4 w-4" /> Crear Primer Viaje
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filtros */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Remisión</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="REM-2026-001" value={filtros.remision}
                        onChange={(e) => setFiltro('remision', e.target.value)} className="pl-8 h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                    <Input type="date" value={filtros.fecha}
                      onChange={(e) => setFiltro('fecha', e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Estado</label>
                    <select value={filtros.estado}
                      onChange={(e) => setFiltro('estado', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Todos</option>
                      <option value="CREADO">Creado</option>
                      <option value="EN_CAMINO">En Camino</option>
                      <option value="EN_PLANTA">En Planta</option>
                      <option value="FINALIZADO">Finalizado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Vehículo</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="ABC-123" value={filtros.vehiculo}
                        onChange={(e) => setFiltro('vehiculo', e.target.value)} className="pl-8 h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Conductor</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Nombre" value={filtros.conductor}
                        onChange={(e) => setFiltro('conductor', e.target.value)} className="pl-8 h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Extractora</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Extractora" value={filtros.extractora}
                        onChange={(e) => setFiltro('extractora', e.target.value)} className="pl-8 h-9" />
                    </div>
                  </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Remisión</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Vehículo / Conductor</th>
                        <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Extractora</th>
                        <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Gajos</th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Peso (kg)</th>
                        <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viajesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Search className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">No se encontraron viajes con los filtros aplicados</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        viajesFiltrados.map((v, index) => {
                          const fecha = parseFechaAPI(v.fecha_viaje);
                          const peso = v.peso_viaje ? parseFloat(String(v.peso_viaje)) : null;
                          return (
                            <tr key={v.id}
                              className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                              }`}>
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground">{v.remision}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    {fecha ? fecha.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '—'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {fecha ? fecha.toLocaleDateString('es-CO', { year: 'numeric' }) : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4"><EstadoBadge estado={v.estado} /></td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{v.placa_vehiculo}</span>
                                  <span className="text-xs text-muted-foreground">{v.nombre_conductor}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">
                                    {v.extractora?.razon_social ?? '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {(v.cantidad_gajos_total ?? 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {peso
                                  ? <span className="text-sm font-semibold text-success">{peso.toLocaleString()}</span>
                                  : <span className="text-xs text-muted-foreground">-</span>}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2 justify-end">
                                  {v.estado === 'CREADO' ? (
                                    <>
                                      <Button size="sm" variant="outline"
                                        onClick={() => navigate(`/viajes/${v.id}/conteo`)}
                                        className="hover:bg-success/10 hover:text-success hover:border-success"
                                        title="Conteo de Cosecha">
                                        <Calculator className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="outline" asChild
                                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                        title="Editar">
                                        <Link to={`/viajes/${v.id}`}><Edit className="h-4 w-4" /></Link>
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        onClick={(e) => eliminarViaje(v.id, e)}
                                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                                        title="Eliminar">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button size="sm" variant="outline" asChild
                                      className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                      title="Visualizar">
                                      <Link to={`/viajes/${v.id}`}><Eye className="h-4 w-4" /></Link>
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {viajesFiltrados.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
                    <p>
                      Mostrando <span className="font-medium text-foreground">{viajesFiltrados.length}</span> de{' '}
                      <span className="font-medium text-foreground">{viajes.length}</span> viajes
                    </p>
                    <p>
                      Total: <span className="font-semibold text-success">
                        {viajesFiltrados
                          .reduce((s, v) => s + (parseFloat(String(v.peso_viaje ?? 0)) || 0), 0)
                          .toLocaleString()} kg
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}