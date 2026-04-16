import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Plus, Truck, Package, MapPin, Scale, Calendar, Eye,
  TrendingUp, CheckCircle, Clock, FileText, Search,
  Calculator, Leaf,
} from 'lucide-react';

export type EstadoViaje = 'Creado' | 'En Camino' | 'En Planta' | 'Finalizado';

interface Viaje {
  id: string; remisionId: string; fecha: string; placaVehiculo: string;
  conductor: string; transportador: string; lotes: string[]; lotesNombres: string[];
  gajosEstimados: number; peso?: number; extractora: string; horaSalida: string;
  estado: EstadoViaje; observaciones?: string; fechaCreacion: string;
  fechaEnCamino?: string; fechaEnPlanta?: string; fechaFinalizado?: string;
}

const viajesData: Viaje[] = [
  { id: 'v1', remisionId: 'REM-2026-001', fecha: '2026-03-09', placaVehiculo: 'ABC-123', conductor: 'Carlos Rodríguez', transportador: 'Transportes del Valle', lotes: ['l1','l2'], lotesNombres: ['Lote 1 - Norte','Lote 2 - Sur'], gajosEstimados: 850, peso: 12500, extractora: 'Extractora San Miguel', horaSalida: '06:00', estado: 'En Camino', fechaCreacion: '2026-03-09T05:30:00', fechaEnCamino: '2026-03-09T06:00:00' },
  { id: 'v2', remisionId: 'REM-2026-002', fecha: '2026-03-09', placaVehiculo: 'XYZ-789', conductor: 'Juan Pérez', transportador: 'Transportes Rápidos', lotes: ['l3'], lotesNombres: ['Lote 3 - Este'], gajosEstimados: 600, extractora: 'Extractora Santa Rosa', horaSalida: '07:30', estado: 'Creado', fechaCreacion: '2026-03-09T07:00:00' },
  { id: 'v3', remisionId: 'REM-2026-003', fecha: '2026-03-08', placaVehiculo: 'DEF-456', conductor: 'Miguel Ángel', transportador: 'Transportes del Valle', lotes: ['l1','l4'], lotesNombres: ['Lote 1 - Norte','Lote 4 - Oeste'], gajosEstimados: 920, peso: 13800, extractora: 'Extractora San Miguel', horaSalida: '05:30', estado: 'Finalizado', fechaCreacion: '2026-03-08T05:00:00', fechaEnCamino: '2026-03-08T05:30:00', fechaEnPlanta: '2026-03-08T08:15:00', fechaFinalizado: '2026-03-08T10:30:00' },
  { id: 'v4', remisionId: 'REM-2026-004', fecha: '2026-03-08', placaVehiculo: 'GHI-321', conductor: 'Pedro López', transportador: 'Transportes Rápidos', lotes: ['l2','l3'], lotesNombres: ['Lote 2 - Sur','Lote 3 - Este'], gajosEstimados: 750, peso: 11200, extractora: 'Extractora Santa Rosa', horaSalida: '06:30', estado: 'En Planta', observaciones: 'Espera en fila para descargue', fechaCreacion: '2026-03-08T06:00:00', fechaEnCamino: '2026-03-08T06:30:00', fechaEnPlanta: '2026-03-08T09:45:00' },
  { id: 'v5', remisionId: 'REM-2026-005', fecha: '2026-03-07', placaVehiculo: 'JKL-654', conductor: 'Roberto Sánchez', transportador: 'Transportes del Valle', lotes: ['l1'], lotesNombres: ['Lote 1 - Norte'], gajosEstimados: 520, peso: 7800, extractora: 'Extractora San Miguel', horaSalida: '05:45', estado: 'Finalizado', fechaCreacion: '2026-03-07T05:15:00', fechaEnCamino: '2026-03-07T05:45:00', fechaEnPlanta: '2026-03-07T08:30:00', fechaFinalizado: '2026-03-07T11:00:00' },
  { id: 'v6', remisionId: 'REM-2026-006', fecha: '2026-03-06', placaVehiculo: 'MNO-987', conductor: 'Luis García', transportador: 'Transportes Rápidos', lotes: ['l2','l4'], lotesNombres: ['Lote 2 - Sur','Lote 4 - Oeste'], gajosEstimados: 680, peso: 10100, extractora: 'Extractora Santa Rosa', horaSalida: '06:30', estado: 'Finalizado', fechaCreacion: '2026-03-06T06:00:00', fechaEnCamino: '2026-03-06T06:30:00', fechaEnPlanta: '2026-03-06T09:15:00', fechaFinalizado: '2026-03-06T11:00:00' },
];

const estadoBadge: Record<EstadoViaje, { label: string; className: string; icon: any }> = {
  'Creado':     { label: 'Creado',    className: 'bg-muted/50 text-muted-foreground border-border',                icon: FileText   },
  'En Camino':  { label: 'En Camino', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: Truck      },
  'En Planta':  { label: 'En Planta', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',     icon: MapPin     },
  'Finalizado': { label: 'Finalizado',className: 'bg-success/10 text-success border-success/30',                 icon: CheckCircle },
};

export default function Viajes() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<'semanal'|'quincenal'|'mensual'|'personalizado'>('mensual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [filtros, setFiltros]         = useState({ remision:'', fecha:'', estado:'', vehiculo:'', conductor:'', extractora:'' });

  const setFiltro = (k: string, v: string) => setFiltros(prev => ({ ...prev, [k]: v }));

  const rango = () => {
    const hoy = new Date(); let ini = new Date(hoy);
    const fin = periodo === 'personalizado' && fechaInicio && fechaFin ? new Date(fechaFin) : hoy;
    if (periodo === 'semanal') ini.setDate(hoy.getDate() - 7);
    else if (periodo === 'quincenal') ini.setDate(hoy.getDate() - 15);
    else if (periodo === 'personalizado' && fechaInicio) ini = new Date(fechaInicio);
    else ini.setMonth(hoy.getMonth() - 1);
    return { ini, fin };
  };

  const { ini, fin } = rango();
  const enPeriodo = viajesData.filter(v => { const f = new Date(v.fecha); return f >= ini && f <= fin; });
  const filtrados  = viajesData.filter(v =>
    v.remisionId.toLowerCase().includes(filtros.remision.toLowerCase()) &&
    v.fecha.includes(filtros.fecha) &&
    (!filtros.estado || v.estado === filtros.estado) &&
    v.placaVehiculo.toLowerCase().includes(filtros.vehiculo.toLowerCase()) &&
    v.conductor.toLowerCase().includes(filtros.conductor.toLowerCase()) &&
    v.extractora.toLowerCase().includes(filtros.extractora.toLowerCase())
  );

  const kpis = [
    { label: 'Total Viajes',   value: enPeriodo.length, sub: 'despachos', icon: Truck,       color: 'text-primary',        bg: 'bg-primary/10',  badge: 'bg-primary/10 text-primary border-primary/20',       badgeLabel: 'Período actual' },
    { label: 'En Camino',      value: enPeriodo.filter(v => v.estado === 'En Camino').length, sub: 'activos', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', badgeLabel: 'En tránsito' },
    { label: 'Finalizados',    value: enPeriodo.filter(v => v.estado === 'Finalizado').length, sub: 'completados', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', badge: 'bg-success/10 text-success border-success/30', badgeLabel: 'Cerrados' },
    { label: 'Kg Totales',     value: `${enPeriodo.reduce((s,v) => s + (v.peso||0), 0).toLocaleString()} kg`, sub: `${enPeriodo.reduce((s,v) => s + v.gajosEstimados, 0).toLocaleString()} gajos`, icon: Package, color: 'text-success', bg: 'bg-success/10', badge: 'bg-success/10 text-success border-success/30', badgeLabel: 'Fruto despachado' },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Viajes</h1>
          <p className="text-muted-foreground mt-1">Gestión de despachos de fruto hacia la extractora</p>
        </div>
        <Button onClick={() => navigate('/viajes/nuevo')}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nuevo Viaje
        </Button>
      </div>

      {/* ── Filtro período ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Período de KPIs:
        </div>
        <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="quincenal">Quincenal</SelectItem>
            <SelectItem value="mensual">Mensual</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {periodo === 'personalizado' && (
          <>
            <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-40 h-9" />
            <Input type="date" value={fechaFin}    onChange={e => setFechaFin(e.target.value)}    className="w-40 h-9" />
          </>
        )}
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold leading-none mb-2">{kpi.value}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${kpi.badge}`}>
                      {kpi.badgeLabel}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Viajes Registrados</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Despachos de fruto hacia extractoras</p>
        </div>

        <Card className="border-border overflow-hidden">
          {/* Filtros */}
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { key: 'remision',  placeholder: 'REM-2026-001', label: 'Remisión' },
                { key: 'vehiculo',  placeholder: 'ABC-123',      label: 'Vehículo' },
                { key: 'conductor', placeholder: 'Nombre',       label: 'Conductor' },
                { key: 'extractora',placeholder: 'Extractora',   label: 'Extractora' },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder={f.placeholder} value={(filtros as any)[f.key]}
                      onChange={e => setFiltro(f.key, e.target.value)}
                      className="pl-8 h-8 text-sm" />
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                <Input type="date" value={filtros.fecha}
                  onChange={e => setFiltro('fecha', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Todos</option>
                  <option>Creado</option>
                  <option>En Camino</option>
                  <option>En Planta</option>
                  <option>Finalizado</option>
                </select>
              </div>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No se encontraron viajes con esos filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['Remisión','Fecha','Estado','Vehículo / Conductor','Extractora','Gajos','Peso (kg)',''].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === '' || h === 'Gajos' ? 'text-center' : h === 'Peso (kg)' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtrados.map(viaje => {
                    const cfg = estadoBadge[viaje.estado];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={viaje.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-foreground font-mono">{viaje.remisionId}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {new Date(viaje.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short' })}
                              </p>
                              <p className="text-xs text-muted-foreground">{viaje.horaSalida}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-foreground">{viaje.placaVehiculo}</p>
                          <p className="text-xs text-muted-foreground">{viaje.conductor}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground">{viaje.extractora}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Leaf className="h-3.5 w-3.5 text-success" />
                            <span className="text-sm font-medium">{viaje.gajosEstimados.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {viaje.peso
                            ? <span className="text-sm font-bold text-success">{viaje.peso.toLocaleString()}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end">
                            {viaje.estado === 'Creado' ? (
                              <Button size="sm" variant="outline"
                                onClick={() => navigate(`/viajes/${viaje.id}/conteo`, { state: { viaje: { id: viaje.id, fecha: viaje.fecha, placaVehiculo: viaje.placaVehiculo, conductor: viaje.conductor, transportador: viaje.transportador, extractora: viaje.extractora, horaSalida: viaje.horaSalida } } })}
                                className="h-8 gap-1.5 hover:bg-success/10 hover:text-success hover:border-success/40">
                                <Calculator className="h-3.5 w-3.5" /> Conteo
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" asChild
                                className="h-8 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40">
                                <Link to={`/viajes/${viaje.id}`}>
                                  <Eye className="h-3.5 w-3.5" /> Ver
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtrados.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{filtrados.length} de {viajesData.length} viajes</p>
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-semibold text-success">
                  {filtrados.reduce((s,v) => s + (v.peso||0), 0).toLocaleString()} kg
                </span>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}