import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus, Truck, Package, MapPin, Scale, Eye, TrendingUp, CheckCircle, Clock,
  FileText, Search, Calculator, Edit, Trash2,
} from 'lucide-react';
import {
  viajesApi, strField,
  type Viaje, type EstadoViajeApi, type IndicadoresViajes,
} from '../../../api/viajes';

// ─── tipos UI ─────────────────────────────────────────────────────────────────
export type EstadoViaje = 'Creado' | 'En Validación' | 'Finalizado';

/** Backend usa CREADO/EN_CAMINO/EN_PLANTA/FINALIZADO; el UI los compacta a 3 estados:
 *  EN_CAMINO + EN_PLANTA = "En Validación" */
const ESTADO_API_TO_UI: Record<EstadoViajeApi, EstadoViaje> = {
  CREADO:     'Creado',
  EN_CAMINO:  'En Validación',
  EN_PLANTA:  'En Validación',
  FINALIZADO: 'Finalizado',
};

interface ViajeUI {
  id: string;
  remisionId: string;
  fecha: string;
  placaVehiculo: string;
  conductor: string;
  transportador: string;
  extractora: string;
  horaSalida: string;
  estado: EstadoViaje;
  estadoApi: EstadoViajeApi;
  gajosEstimados: number;
  peso?: number;
}

function mapViaje(v: Viaje): ViajeUI {
  const r = v as any;
  const estadoApi = (r.estado as EstadoViajeApi) ?? 'CREADO';
  return {
    id:             String(r.id ?? ''),
    remisionId:     String(r.remision ?? r.id ?? ''),
    fecha:          String(r.fecha_viaje ?? ''),
    placaVehiculo:  String(r.placa_vehiculo ?? ''),
    conductor:      String(r.nombre_conductor ?? ''),
    transportador:  strField(r.empresa ?? r.empresa_transportadora),
    extractora:     strField(r.extractora),
    horaSalida:     String(r.hora_salida ?? '').slice(0, 5),
    estado:         ESTADO_API_TO_UI[estadoApi] ?? 'Creado',
    estadoApi,
    gajosEstimados: Number(r.cantidad_gajos_total ?? 0),
    peso:           r.peso_viaje ? parseFloat(String(r.peso_viaje)) : undefined,
  };
}

/** Parsea una fecha 'YYYY-MM-DD' devolviendo null si no es parseable. */
function parseFecha(s?: string): Date | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return null;
  const d = new Date(m + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function getEstadoBadge(estado: EstadoViaje) {
  switch (estado) {
    case 'Creado':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
          <FileText className="h-3 w-3 mr-1" />
          Creado
        </Badge>
      );
    case 'En Validación':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
          <Clock className="h-3 w-3 mr-1" />
          En Validación
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
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function Viajes() {
  const navigate = useNavigate();

  // Filtros de la tabla
  const [filtros, setFiltros] = useState({
    remision: '', fecha: '', estado: '',
    vehiculo: '', conductor: '', extractora: '',
  });

  // Periodo KPI
  const [periodoKPI,    setPeriodoKPI]    = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>('mensual');
  const [fechaInicioKPI, setFechaInicioKPI] = useState('');
  const [fechaFinKPI,    setFechaFinKPI]    = useState('');

  // Datos
  const [viajes, setViajes] = useState<ViajeUI[]>([]);
  const [indicadoresApi, setIndicadoresApi] = useState<IndicadoresViajes | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Diálogos de confirmación
  const [viajeAEliminar, setViajeAEliminar] = useState<{ id: string; remision: string } | null>(null);
  const [viajeAValidar, setViajeAValidar]   = useState<{ id: string; remision: string } | null>(null);
  const [loadingKPI,  setLoadingKPI]  = useState(true);

  const handleFiltroChange = (key: keyof typeof filtros, value: string) =>
    setFiltros(prev => ({ ...prev, [key]: value }));

  // ── carga listado ──────────────────────────────────────────────────────────
  const cargarViajes = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await viajesApi.listar({ per_page: 100 });
      setViajes((res.data ?? []).map(mapViaje));
    } catch (e) { console.warn('listar viajes error', e); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { cargarViajes(); }, [cargarViajes]);

  // ── carga indicadores ──────────────────────────────────────────────────────
  const cargarIndicadores = useCallback(async () => {
    setLoadingKPI(true);
    try {
      const params: Record<string, string> = {
        periodo: periodoKPI === 'semanal' ? 'SEMANAL'
               : periodoKPI === 'quincenal' ? 'QUINCENAL'
               : periodoKPI === 'mensual' ? 'MENSUAL' : 'CUSTOM',
      };
      if (periodoKPI === 'personalizado') {
        if (fechaInicioKPI) params.desde = fechaInicioKPI;
        if (fechaFinKPI) params.hasta = fechaFinKPI;
      }
      const res = await viajesApi.indicadores(params as any);
      setIndicadoresApi(res.data);
    } catch (e) { console.warn('indicadores error', e); }
    finally { setLoadingKPI(false); }
  }, [periodoKPI, fechaInicioKPI, fechaFinKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

  // ── eliminar viaje ─────────────────────────────────────────────────────────
  const abrirDialogoEliminar = (viaje: ViajeUI, event: React.MouseEvent) => {
    event.stopPropagation();
    setViajeAEliminar({ id: viaje.id, remision: viaje.remisionId });
  };

  const confirmarEliminar = async () => {
    if (!viajeAEliminar) return;
    try {
      await viajesApi.eliminar(Number(viajeAEliminar.id));
      setViajes(prev => prev.filter(v => v.id !== viajeAEliminar.id));
      toast.success('Viaje eliminado correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar el viaje');
    } finally {
      setViajeAEliminar(null);
    }
  };

  // ── Pasar a "En Validación" — el conteo es OPCIONAL.
  //     Llamamos directo al endpoint /despachar. Si el backend lo expone,
  //     funciona; si responde 404 mostramos el mensaje real para que el equipo
  //     de backend lo habilite.
  const abrirDialogoValidar = (viaje: ViajeUI, event: React.MouseEvent) => {
    event.stopPropagation();
    setViajeAValidar({ id: viaje.id, remision: viaje.remisionId });
  };

  const confirmarValidar = async () => {
    if (!viajeAValidar) return;
    const id = viajeAValidar.id;
    setViajeAValidar(null);
    try {
      await viajesApi.despachar(Number(id));
      toast.success('Viaje actualizado a "En Validación" exitosamente');
      cargarViajes();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cambiar el estado del viaje');
    }
  };

  // ── filtros ────────────────────────────────────────────────────────────────
  const lower = (s: string) => s.toLowerCase();
  const viajesFiltrados = viajes.filter((viaje) => {
    return (
      lower(viaje.remisionId).includes(lower(filtros.remision)) &&
      viaje.fecha.includes(filtros.fecha) &&
      (filtros.estado === '' || viaje.estado === filtros.estado) &&
      lower(viaje.placaVehiculo).includes(lower(filtros.vehiculo)) &&
      lower(viaje.conductor).includes(lower(filtros.conductor)) &&
      lower(viaje.extractora).includes(lower(filtros.extractora))
    );
  });

  // ── KPIs por período (cliente) — fallback si la API no responde ────────────
  const obtenerRangoFechas = () => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date = hoy;
    switch (periodoKPI) {
      case 'semanal':       inicio = new Date(hoy); inicio.setDate(hoy.getDate() - 7); break;
      case 'quincenal':     inicio = new Date(hoy); inicio.setDate(hoy.getDate() - 15); break;
      case 'mensual':       inicio = new Date(hoy); inicio.setMonth(hoy.getMonth() - 1); break;
      case 'personalizado':
        if (fechaInicioKPI && fechaFinKPI) { inicio = new Date(fechaInicioKPI); fin = new Date(fechaFinKPI); }
        else { inicio = new Date(hoy); inicio.setMonth(hoy.getMonth() - 1); }
        break;
      default: inicio = new Date(hoy); inicio.setMonth(hoy.getMonth() - 1);
    }
    return { inicio, fin };
  };
  const { inicio, fin } = obtenerRangoFechas();
  const viajesPorPeriodo = viajes.filter(v => {
    if (!v.fecha) return false;
    const f = new Date(v.fecha);
    return f >= inicio && f <= fin;
  });

  const totalViajes        = indicadoresApi?.total_viajes ?? viajesPorPeriodo.length;
  // El backend reporta en_camino y nada de "en_planta" como un solo bloque, pero
  // como el UI los junta → sumamos en_camino + finalizados-aún-no-cerrados.
  // Si el backend no expone el dato exacto, calculamos en cliente.
  const viajesEnValidacion = viajesPorPeriodo.filter(v => v.estado === 'En Validación').length;
  const viajesFinalizados  = indicadoresApi?.finalizados ?? viajesPorPeriodo.filter(v => v.estado === 'Finalizado').length;
  const pesoTotal          = indicadoresApi ? parseFloat(indicadoresApi.kilogramos_totales || '0') : viajesPorPeriodo.reduce((s, v) => s + (v.peso ?? 0), 0);
  const gajosTotal         = indicadoresApi?.gajos_totales ?? viajesPorPeriodo.reduce((s, v) => s + v.gajosEstimados, 0);

  return (
    <div className="space-y-8">
      {/* ─── Diálogo Eliminar viaje ─────────────────────────────────────── */}
      <AlertDialog open={!!viajeAEliminar} onOpenChange={open => !open && setViajeAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>Esto eliminará permanentemente el viaje <strong>{viajeAEliminar?.remision}</strong>. Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Diálogo Pasar a En Validación ──────────────────────────────── */}
      <AlertDialog open={!!viajeAValidar} onOpenChange={open => !open && setViajeAValidar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pasar viaje a En Validación?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                ¿Deseas pasar el viaje <strong>{viajeAValidar?.remision}</strong> al estado{' '}
                <strong>"En Validación"</strong>? El conteo de cosecha es opcional.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarValidar} className="bg-primary hover:bg-primary/90">
              Pasar a En Validación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
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

      {/* Indicadores Principales */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex flex-wrap items-center gap-3">
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
                <Input type="date" value={fechaInicioKPI} onChange={e => setFechaInicioKPI(e.target.value)} className="w-40" placeholder="Fecha inicio" />
                <Input type="date" value={fechaFinKPI} onChange={e => setFechaFinKPI(e.target.value)} className="w-40" placeholder="Fecha fin" />
              </>
            )}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Viajes */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Viajes</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{loadingKPI ? '…' : totalViajes}</p>
                  <span className="text-sm text-muted-foreground">despachos</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                  <TrendingUp className="h-4 w-4" />
                  <span>Período seleccionado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* En Validación */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">En Validación</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{loadingKPI ? '…' : viajesEnValidacion}</p>
                  <span className="text-sm text-muted-foreground">pendientes</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-500 dark:bg-blue-950/30 dark:border-blue-900/30">
                  <Clock className="h-4 w-4" />
                  <span>En proceso</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finalizados */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Finalizados</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{loadingKPI ? '…' : viajesFinalizados}</p>
                  <span className="text-sm text-muted-foreground">completados</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                  <Scale className="h-4 w-4" />
                  <span>Cerrados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kilogramos Totales */}
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Kilogramos Totales</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{loadingKPI ? '…' : pesoTotal.toLocaleString('es-CO')}</p>
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                  <Package className="h-4 w-4" />
                  <span>{gajosTotal.toLocaleString('es-CO')} gajos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de viajes */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Viajes Registrados</h2>
          <p className="text-muted-foreground">Despachos de fruto hacia extractoras</p>
        </div>

        <div className="space-y-4">
          <Card className="glass-subtle border-border">
            <CardContent className="pt-6">
              {loadingList ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Clock className="h-5 w-5 animate-spin" /> Cargando viajes...
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
                          onChange={e => handleFiltroChange('remision', e.target.value)} className="pl-8 h-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                      <Input type="date" value={filtros.fecha}
                        onChange={e => handleFiltroChange('fecha', e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Estado</label>
                      <select value={filtros.estado} onChange={e => handleFiltroChange('estado', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-9 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Todos</option>
                        <option value="Creado">Creado</option>
                        <option value="En Validación">En Validación</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Vehículo</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="ABC-123" value={filtros.vehiculo}
                          onChange={e => handleFiltroChange('vehiculo', e.target.value)} className="pl-8 h-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Conductor</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Nombre" value={filtros.conductor}
                          onChange={e => handleFiltroChange('conductor', e.target.value)} className="pl-8 h-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Extractora</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Extractora" value={filtros.extractora}
                          onChange={e => handleFiltroChange('extractora', e.target.value)} className="pl-8 h-9" />
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
                          viajesFiltrados.map((viaje, index) => (
                            <tr key={viaje.id}
                              className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground">{viaje.remisionId}</span>
                              </td>
                              <td className="p-4">
                                {(() => {
                                  const d = parseFecha(viaje.fecha);
                                  return (
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">
                                        {d ? d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '—'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {d ? d.getFullYear() : ''}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="p-4">{getEstadoBadge(viaje.estado)}</td>
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
                                  {viaje.gajosEstimados.toLocaleString('es-CO')}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {viaje.peso ? (
                                  <span className="text-sm font-semibold text-success">{viaje.peso.toLocaleString('es-CO')}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2 justify-end">
                                  {viaje.estado === 'Creado' ? (
                                    <>
                                      <Button size="sm" variant="outline"
                                        onClick={(e) => abrirDialogoValidar(viaje, e)}
                                        className="hover:bg-blue-500/10 hover:text-blue-700 hover:border-blue-500/30"
                                        title="Pasar a En Validación">
                                        <Clock className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        onClick={() => navigate(`/viajes/${viaje.id}/conteo`, {
                                          state: {
                                            viaje: {
                                              id: viaje.id, fecha: viaje.fecha,
                                              placaVehiculo: viaje.placaVehiculo, conductor: viaje.conductor,
                                              transportador: viaje.transportador, extractora: viaje.extractora,
                                              horaSalida: viaje.horaSalida,
                                            }
                                          }
                                        })}
                                        className="hover:bg-success/10 hover:text-success hover:border-success"
                                        title="Conteo de Cosecha (Opcional)">
                                        <Calculator className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="outline" asChild
                                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                        title="Editar">
                                        <Link to={`/viajes/${viaje.id}`}>
                                          <Edit className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        onClick={(e) => abrirDialogoEliminar(viaje, e)}
                                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                                        title="Eliminar">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button size="sm" variant="outline" asChild
                                      className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                                      title="Visualizar">
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