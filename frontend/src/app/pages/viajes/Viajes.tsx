import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus,
  Truck,
  Package,
  MapPin,
  Scale,
  Calendar,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  Search,
  Calculator,
  Edit,
  Trash2,
} from 'lucide-react';

import {
  viajesApi,
  type Viaje as ViajeApi,
  type IndicadoresViajes,
} from '../../../api/viajes';

export type EstadoViaje = 'Creado' | 'En Camino' | 'En Planta' | 'Finalizado';

// ── Mapeo API → tipo local ───────────────────────────────────────────────
const ESTADO_MAP: Record<string, EstadoViaje> = {
  CREADO: 'Creado', EN_CAMINO: 'En Camino', EN_PLANTA: 'En Planta', FINALIZADO: 'Finalizado',
};
function mapViaje(v: ViajeApi): Viaje {
  const detalles = v.detalles ?? [];
  return {
    id:          String(v.id),
    remisionId:  v.remision,
    fecha:       v.fecha_viaje,
    placaVehiculo: v.placa_vehiculo,
    conductor:   v.nombre_conductor,
    transportador: v.empresa?.razon_social ?? '',
    lotes:       [...new Set(detalles.map(d => String(d.cosecha?.lote?.id ?? '')).filter(Boolean))],
    lotesNombres:[...new Set(detalles.map(d => d.cosecha?.lote?.nombre ?? '').filter(Boolean))],
    gajosEstimados: v.cantidad_gajos_total ?? 0,
    peso:        v.peso_viaje ? parseFloat(String(v.peso_viaje)) : undefined,
    extractora:  v.extractora?.razon_social ?? '',
    horaSalida:  v.hora_salida?.slice(0, 5) ?? '',
    estado:      ESTADO_MAP[v.estado] ?? 'Creado',
    observaciones: v.observaciones ?? undefined,
    fechaCreacion: '',
    fechaEnCamino:   v.despachado_at    ?? undefined,
    fechaEnPlanta:   v.llegada_planta_at ?? undefined,
    fechaFinalizado: v.finalizado_at    ?? undefined,
  };
}

interface Viaje {
  id: string;
  remisionId: string;
  fecha: string;
  placaVehiculo: string;
  conductor: string;
  transportador: string;
  lotes: string[];
  lotesNombres: string[];
  gajosEstimados: number;
  peso?: number;
  extractora: string;
  horaSalida: string;
  estado: EstadoViaje;
  observaciones?: string;
  fechaCreacion: string;
  fechaEnCamino?: string;
  fechaEnPlanta?: string;
  fechaFinalizado?: string;
}


export default function Viajes() {
  const navigate = useNavigate();

  // Filtro de período para KPIs
  const [periodoKPI, setPeriodoKPI] = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>('mensual');
  const [fechaInicioKPI, setFechaInicioKPI] = useState('');
  const [fechaFinKPI, setFechaFinKPI] = useState('');

  // ── Estado API ──────────────────────────────────────────────────────────
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresViajes | null>(null);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [loadingIndic, setLoadingIndic] = useState(true);

  // Cargar indicadores cuando cambia el período
  const cargarIndicadores = useCallback(async () => {
    setLoadingIndic(true);
    try {
      const params: Record<string, string> = {};
      if (periodoKPI === 'personalizado') {
        params.periodo = 'CUSTOM';
        if (fechaInicioKPI) params.desde = fechaInicioKPI;
        if (fechaFinKPI)    params.hasta = fechaFinKPI;
      } else {
        params.periodo = periodoKPI.toUpperCase();
      }
      const res = await viajesApi.indicadores(params as any);
      setIndicadores(res.data);
    } catch (e) { console.warn('indicadores error', e); }
    finally { setLoadingIndic(false); }
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // Cargar listado
  const cargarViajes = useCallback(async () => {
    setLoadingViajes(true);
    try {
      const res = await viajesApi.listar({ per_page: 50 });
      setViajes((res.data ?? []).map(mapViaje));
    } catch (e) { console.warn('viajes error', e); }
    finally { setLoadingViajes(false); }
  }, []);

  useEffect(() => { cargarViajes(); }, [cargarViajes]);

  const handleEliminar = async (viajeId: string) => {
    try {
      await viajesApi.eliminar(Number(viajeId));
      setViajes(prev => prev.filter(v => v.id !== viajeId));
    } catch (e: any) { console.error('Error eliminando viaje', e); }
  };

  // Filtros
  const [filtros, setFiltros] = useState({
    remision: '',
    fecha: '',
    estado: '',
    vehiculo: '',
    conductor: '',
    extractora: '',
  });

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const eliminarViaje = (viajeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este viaje? Esta acción no se puede deshacer.')) {
      console.log('Eliminar viaje:', viajeId);
      // Aquí iría la llamada a la API para eliminar el viaje
      toast.success('Viaje eliminado exitosamente');
    }
  };

  const viajesFiltrados = viajes.filter((viaje) => {
    const cumpleFiltros =
      viaje.remisionId.toLowerCase().includes(filtros.remision.toLowerCase()) &&
      viaje.fecha.includes(filtros.fecha) &&
      (filtros.estado === '' || viaje.estado === filtros.estado) &&
      viaje.placaVehiculo.toLowerCase().includes(filtros.vehiculo.toLowerCase()) &&
      viaje.conductor.toLowerCase().includes(filtros.conductor.toLowerCase()) &&
      viaje.extractora.toLowerCase().includes(filtros.extractora.toLowerCase());

    return cumpleFiltros;
  });

  const getEstadoBadge = (estado: EstadoViaje) => {
    switch (estado) {
      case 'Creado':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
            <FileText className="h-3 w-3 mr-1" />
            Creado
          </Badge>
        );
      case 'En Camino':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <Truck className="h-3 w-3 mr-1" />
            En Camino
          </Badge>
        );
      case 'En Planta':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <MapPin className="h-3 w-3 mr-1" />
            En Planta
          </Badge>
        );
      case 'Finalizado':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalizado
          </Badge>
        );
    }
  };

  // Función para obtener rango de fechas según el período
  const obtenerRangoFechas = () => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date = hoy;

    switch (periodoKPI) {
      case 'semanal':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 7);
        break;
      case 'quincenal':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 15);
        break;
      case 'mensual':
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'personalizado':
        if (fechaInicioKPI && fechaFinKPI) {
          inicio = new Date(fechaInicioKPI);
          fin = new Date(fechaFinKPI);
        } else {
          inicio = new Date(hoy);
          inicio.setMonth(hoy.getMonth() - 1);
        }
        break;
      default:
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
    }

    return { inicio, fin };
  };

  // Filtrar viajes según período para KPIs
  const { inicio, fin } = obtenerRangoFechas();
  const viajesFiltradosPorPeriodo = viajes.filter((viaje) => {
    const fechaViaje = new Date(viaje.fecha);
    return fechaViaje >= inicio && fechaViaje <= fin;
  });

  // KPIs basados en el período seleccionado
  const totalViajes = viajesFiltradosPorPeriodo.length;
  const viajesEnCamino = viajesFiltradosPorPeriodo.filter((v) => v.estado === 'En Camino').length;
  const viajesFinalizados = viajesFiltradosPorPeriodo.filter((v) => v.estado === 'Finalizado').length;
  const gajosTotal = viajesFiltradosPorPeriodo.reduce((sum, v) => sum + v.gajosEstimados, 0);
  const pesoTotal = viajesFiltradosPorPeriodo.reduce((sum, v) => sum + (v.peso || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header con botones - mismo estilo que otros módulos */}
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
          <Plus className="h-5 w-5" />
          Nuevo Viaje
        </Button>
      </div>

      {/* KPIs - mismo estilo que otros módulos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Viajes</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{totalViajes}</p>
                  <span className="text-sm text-muted-foreground">despachos</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                  <TrendingUp className="h-4 w-4" />
                  <span>Período seleccionado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">En Camino</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{viajesEnCamino}</p>
                  <span className="text-sm text-muted-foreground">activos</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                  <Truck className="h-4 w-4" />
                  <span>En tránsito</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Finalizados</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{viajesFinalizados}</p>
                  <span className="text-sm text-muted-foreground">completados</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                  <Scale className="h-4 w-4" />
                  <span>Cerrados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Kilogramos Totales</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{pesoTotal.toLocaleString()}</p>
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                  <Package className="h-4 w-4" />
                  <span>{gajosTotal.toLocaleString()} gajos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de viajes - Diseño con tabla y filtros */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Viajes Registrados</h2>
          <p className="text-muted-foreground">Despachos de fruto hacia extractoras</p>
        </div>

        <div className="space-y-4">
          <Card className="glass-subtle border-border">
            <CardContent className="pt-6">
              {viajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Truck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">No hay viajes registrados</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Comienza creando tu primer viaje de despacho
                  </p>
                  <Button onClick={() => navigate('/viajes/nuevo')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primer Viaje
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
                        <Input
                          placeholder="REM-2026-001"
                          value={filtros.remision}
                          onChange={(e) => handleFiltroChange('remision', e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                      <Input
                        type="date"
                        value={filtros.fecha}
                        onChange={(e) => handleFiltroChange('fecha', e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Estado</label>
                      <select
                        value={filtros.estado}
                        onChange={(e) => handleFiltroChange('estado', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-9 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_8px] bg-[position:right_0.75rem_center] bg-no-repeat"
                      >
                        <option value="">Todos</option>
                        <option value="Creado">Creado</option>
                        <option value="En Camino">En Camino</option>
                        <option value="En Planta">En Planta</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Vehículo</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="ABC-123"
                          value={filtros.vehiculo}
                          onChange={(e) => handleFiltroChange('vehiculo', e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Conductor</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nombre"
                          value={filtros.conductor}
                          onChange={(e) => handleFiltroChange('conductor', e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Extractora</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Extractora"
                          value={filtros.extractora}
                          onChange={(e) => handleFiltroChange('extractora', e.target.value)}
                          className="pl-8 h-9"
                        />
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
                                <p className="text-sm text-muted-foreground">
                                  No se encontraron viajes con los filtros aplicados
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          viajesFiltrados.map((viaje, index) => (
                            <tr
                              key={viaje.id}
                              className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                              }`}
                            >
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground">{viaje.remisionId}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    {new Date(viaje.fecha).toLocaleDateString('es-CO', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(viaje.fecha).toLocaleDateString('es-CO', {
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                {getEstadoBadge(viaje.estado)}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{viaje.placaVehiculo}</span>
                                  <span className="text-xs text-muted-foreground">{viaje.conductor}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">{viaje.extractora}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {viaje.gajosEstimados.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {viaje.peso ? (
                                  <span className="text-sm font-semibold text-success">{viaje.peso.toLocaleString()}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2 justify-end">
                                  {viaje.estado === 'Creado' ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigate(`/viajes/${viaje.id}/conteo`, {
                                          state: {
                                            viaje: {
                                              id: viaje.id,
                                              fecha: viaje.fecha,
                                              placaVehiculo: viaje.placaVehiculo,
                                              conductor: viaje.conductor,
                                              transportador: viaje.transportador,
                                              extractora: viaje.extractora,
                                              horaSalida: viaje.horaSalida,
                                            }
                                          }
                                        })}
                                        className="hover:bg-success/10 hover:text-success hover:border-success"
                                        title="Conteo de Cosecha"
                                      >
                                        <Calculator className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        asChild
                                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                        title="Editar"
                                      >
                                        <Link to={`/viajes/${viaje.id}`}>
                                          <Edit className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => eliminarViaje(viaje.id, e)}
                                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      asChild
                                      className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                      title="Visualizar"
                                    >
                                      <Link to={`/viajes/${viaje.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Contador de resultados */}
                  {viajesFiltrados.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
                      <p>
                        Mostrando <span className="font-medium text-foreground">{viajesFiltrados.length}</span> de{' '}
                        <span className="font-medium text-foreground">{viajes.length}</span> viajes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}