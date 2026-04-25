import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Truck, Plus, Search, Scale, Package,
  TrendingUp, MapPin, Calendar, Calculator, Edit, Eye, Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  viajesApi, strField,
  type Viaje, type EstadoViajeApi, type IndicadoresViajes,
} from '../../../api/viajes';

// ─── tipos locales ────────────────────────────────────────────────────────────

type EstadoLocal = 'Creado' | 'En Camino' | 'En Planta' | 'Finalizado';

const ESTADO_MAP: Record<EstadoViajeApi, EstadoLocal> = {
  CREADO: 'Creado', EN_CAMINO: 'En Camino', EN_PLANTA: 'En Planta', FINALIZADO: 'Finalizado',
};

function mapViaje(v: Viaje) {
  const r = v as any;
  return {
    id:             String(r.id ?? ''),
    remisionId:     String(r.remision ?? r.id ?? ''),
    fecha:          String(r.fecha_viaje ?? ''),
    placaVehiculo:  String(r.placa_vehiculo ?? ''),
    conductor:      String(r.nombre_conductor ?? ''),
    transportador:  strField(r.empresa ?? r.empresa_transportadora),
    extractora:     strField(r.extractora),
    horaSalida:     String(r.hora_salida ?? '').slice(0, 5),
    estado:         ESTADO_MAP[r.estado as EstadoViajeApi] ?? ('Creado' as EstadoLocal),
    gajosEstimados: Number(r.cantidad_gajos_total ?? 0),
    peso:           r.peso_viaje ? parseFloat(String(r.peso_viaje)) : undefined as number | undefined,
  };
}
type ViajeLocal = ReturnType<typeof mapViaje>;

// ─── badge de estado ──────────────────────────────────────────────────────────

function getEstadoBadge(estado: EstadoLocal) {
  const cfg: Record<EstadoLocal, { label: string; cls: string }> = {
    'Creado':     { label: 'Creado',     cls: 'bg-muted text-muted-foreground border-muted' },
    'En Camino':  { label: 'En Camino',  cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    'En Planta':  { label: 'En Planta',  cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    'Finalizado': { label: 'Finalizado', cls: 'bg-success/10 text-success border-success/30' },
  };
  const { label, cls } = cfg[estado] ?? cfg['Creado'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}
// ─── componente ───────────────────────────────────────────────────────────────

export default function Viajes() {
  const navigate = useNavigate();

  const [busqueda,      setBusqueda]      = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('');
  const [filtroFecha,   setFiltroFecha]   = useState('');
  const [periodoKPI,    setPeriodoKPI]    = useState<'MENSUAL' | 'SEMANAL' | 'ANUAL' | 'CUSTOM'>('MENSUAL');
  const [fechaDesdeKPI, setFechaDesdeKPI] = useState('');
  const [fechaHastaKPI, setFechaHastaKPI] = useState('');

  const [viajes,      setViajes]      = useState<ViajeLocal[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresViajes | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingKPI,  setLoadingKPI]  = useState(true);

  // ── carga indicadores ──────────────────────────────────────────────────────
  const cargarIndicadores = useCallback(async () => {
    setLoadingKPI(true);
    try {
      const params: Record<string, string> = { periodo: periodoKPI };
      if (periodoKPI === 'CUSTOM') {
        if (fechaDesdeKPI) params.desde = fechaDesdeKPI;
        if (fechaHastaKPI) params.hasta = fechaHastaKPI;
      }
      const res = await viajesApi.indicadores(params as any);
      setIndicadores(res.data);
    } catch (e) { console.warn('indicadores error', e); }
    finally { setLoadingKPI(false); }
  }, [periodoKPI, fechaDesdeKPI, fechaHastaKPI]);

  useEffect(() => { cargarIndicadores(); }, [cargarIndicadores]);

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

  // ── eliminar ───────────────────────────────────────────────────────────────
  const handleEliminar = async (viajeId: string) => {
    if (!confirm('¿Eliminar este viaje?')) return;
    try {
      await viajesApi.eliminar(Number(viajeId));
      setViajes(prev => prev.filter(v => v.id !== viajeId));
    } catch (e: any) { alert(e?.message ?? 'Error al eliminar viaje'); }
  };

  // ── filtros locales ────────────────────────────────────────────────────────
  const viajesFiltrados = viajes.filter(v => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || v.remisionId.toLowerCase().includes(q)
      || v.conductor.toLowerCase().includes(q)
      || v.placaVehiculo.toLowerCase().includes(q)
      || v.extractora.toLowerCase().includes(q);
    const matchE = !filtroEstado || v.estado === filtroEstado;
    const matchF = !filtroFecha  || v.fecha   === filtroFecha;
    return matchQ && matchE && matchF;
  });

  const kpi = {
    total:       indicadores?.total_viajes  ?? viajes.length,
    enCamino:    indicadores?.en_camino     ?? viajes.filter(v => v.estado === 'En Camino').length,
    finalizados: indicadores?.finalizados   ?? viajes.filter(v => v.estado === 'Finalizado').length,
    kilos:       indicadores ? parseFloat(indicadores.kilogramos_totales || '0') : viajes.reduce((s, v) => s + (v.peso ?? 0), 0),
    gajos:       indicadores?.gajos_totales ?? viajes.reduce((s, v) => s + v.gajosEstimados, 0),
  };

  return (
    <div className="space-y-8 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Viajes</h1>
          <p className="text-muted-foreground mt-1">Gestión de despachos de fruto hacia la extractora</p>
        </div>
        <Button onClick={() => navigate('/viajes/nuevo')} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Viaje
        </Button>
      </div>

      {/* Selector período KPI */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodoKPI} onValueChange={(v: any) => setPeriodoKPI(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SEMANAL">Semanal</SelectItem>
            <SelectItem value="MENSUAL">Mensual</SelectItem>
            <SelectItem value="ANUAL">Anual</SelectItem>
            <SelectItem value="CUSTOM">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {periodoKPI === 'CUSTOM' && (
          <>
            <Input type="date" value={fechaDesdeKPI} onChange={e => setFechaDesdeKPI(e.target.value)} className="w-40" />
            <Input type="date" value={fechaHastaKPI} onChange={e => setFechaHastaKPI(e.target.value)} className="w-40" />
          </>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Viajes',       value: loadingKPI ? '…' : kpi.total,                   sub: 'despachos',   icon: <Truck className="h-4 w-4" />,   cls: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'En Camino',          value: loadingKPI ? '…' : kpi.enCamino,                sub: 'activos',     icon: <Truck className="h-4 w-4" />,   cls: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30' },
          { label: 'Finalizados',        value: loadingKPI ? '…' : kpi.finalizados,             sub: 'completados', icon: <Scale className="h-4 w-4" />,   cls: 'text-success bg-success/10 border-success/20' },
          { label: 'Kilogramos Totales', value: loadingKPI ? '…' : kpi.kilos.toLocaleString(),  sub: 'kg',          icon: <Package className="h-4 w-4" />, cls: 'text-success bg-success/10 border-success/20' },
        ].map(({ label, value, sub, icon, cls }) => (
          <Card key={label} className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <span className="text-sm text-muted-foreground">{sub}</span>
              </div>
              <div className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
                {icon}<TrendingUp className="h-3 w-3 ml-1" /><span className="ml-1">Período seleccionado</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por remisión, conductor, placa, extractora..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="Creado">Creado</option>
              <option value="En Camino">En Camino</option>
              <option value="En Planta">En Planta</option>
              <option value="Finalizado">Finalizado</option>
            </select>
            <Input
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              className="w-40"
            />
            {(busqueda || filtroEstado || filtroFecha) && (
              <Button variant="outline" size="sm"
                onClick={() => { setBusqueda(''); setFiltroEstado(''); setFiltroFecha(''); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          {loadingList ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Cargando viajes...
            </div>
          ) : viajesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Truck className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No se encontraron viajes</p>
              <Button onClick={() => navigate('/viajes/nuevo')} className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> Crear primer viaje
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Remisión</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Fecha</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Estado</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Vehículo / Conductor</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Extractora</th>
                    <th className="text-center p-4 text-sm font-semibold text-muted-foreground">Gajos</th>
                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Peso (kg)</th>
                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {viajesFiltrados.map((viaje, idx) => (
                    <tr
                      key={viaje.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <span className="text-sm font-medium text-foreground">{viaje.remisionId}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {viaje.fecha ? new Date(viaje.fecha + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '—'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {viaje.fecha ? new Date(viaje.fecha + 'T12:00:00').getFullYear() : ''}
                          </span>
                        </div>
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
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {viaje.estado === 'Creado' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/viajes/${viaje.id}/conteo`)}
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
                                onClick={() => handleEliminar(viaje.id)}
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
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border">
                <p>
                  Mostrando{' '}
                  <span className="font-medium text-foreground">{viajesFiltrados.length}</span>
                  {' '}de{' '}
                  <span className="font-medium text-foreground">{viajes.length}</span>
                  {' '}viajes
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}