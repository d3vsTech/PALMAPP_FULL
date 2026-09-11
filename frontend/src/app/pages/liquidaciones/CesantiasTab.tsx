import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Plus, FileText, Calculator, Eye, Search, Filter,
  Users, AlertTriangle, PiggyBank, CheckCircle, Clock,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';

interface PeriodoCesantias {
  id: string;
  anio: number;
  descripcion: string;
  estado: 'BORRADOR' | 'CERRADA';
  colaboradores: number;
  totalCesantias: number;
  totalConsignado: number;
  fechaLimite: string;
  fondos: string[];
}

const periodosCesantiasMock: PeriodoCesantias[] = [
  {
    id: 'ces-2026',
    anio: 2026,
    descripcion: 'Cesantías año 2026',
    estado: 'BORRADOR',
    colaboradores: 0,
    totalCesantias: 0,
    totalConsignado: 0,
    fechaLimite: '2027-02-14',
    fondos: ['Porvenir', 'Protección', 'Colfondos'],
  },
  {
    id: 'ces-2025',
    anio: 2025,
    descripcion: 'Cesantías año 2025',
    estado: 'CERRADA',
    colaboradores: 6,
    totalCesantias: 10820000,
    totalConsignado: 10820000,
    fechaLimite: '2026-02-14',
    fondos: ['Porvenir', 'Protección'],
  },
  {
    id: 'ces-2024',
    anio: 2024,
    descripcion: 'Cesantías año 2024',
    estado: 'CERRADA',
    colaboradores: 5,
    totalCesantias: 9340000,
    totalConsignado: 9340000,
    fechaLimite: '2025-02-14',
    fondos: ['Porvenir'],
  },
];

const hoy = new Date();
const proximoFeb14 = new Date(hoy.getFullYear(), 1, 14);
if (proximoFeb14 < hoy) proximoFeb14.setFullYear(hoy.getFullYear() + 1);
const diasRestantes = Math.ceil((proximoFeb14.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

export default function CesantiasTab() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  const periodosFiltrados = periodosCesantiasMock.filter((p) => {
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const cumpleBusqueda =
      filtroBusqueda === '' ||
      p.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      p.anio.toString().includes(filtroBusqueda);
    return cumpleEstado && cumpleBusqueda;
  });

  const totalCesantias = periodosCesantiasMock.reduce((s, p) => s + p.totalCesantias, 0);
  const totalConsignado = periodosCesantiasMock.reduce((s, p) => s + p.totalConsignado, 0);
  const pendientes = periodosCesantiasMock.filter((p) => p.estado === 'BORRADOR').length;
  const montoPendiente = periodosCesantiasMock.filter((p) => p.estado === 'BORRADOR').reduce((s, p) => s + p.totalCesantias, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Cesantías</h2>
          <p className="text-muted-foreground mt-1">Gestión de períodos anuales de cesantías</p>
        </div>
        <Button onClick={() => navigate('/liquidaciones/cesantias/nueva')} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Período de Cesantías
        </Button>
      </div>

      {/* Alerta vencimiento */}
      {diasRestantes <= 30 && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
          <span>
            Faltan <strong>{diasRestantes} días</strong> para el vencimiento de cesantías (14 de febrero). Riesgo de sanción moratoria.
          </span>
        </div>
      )}

      {/* KPIs */}
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Resumen de cesantías</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Cesantías</p>
                <p className="text-2xl font-bold text-primary">${(totalCesantias / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-muted-foreground mt-0.5">Todos los períodos</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Consignadas</p>
                <p className="text-2xl font-bold text-success">${(totalConsignado / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-muted-foreground mt-0.5">Períodos cerrados</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Períodos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{pendientes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Por liquidar</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border ${montoPendiente > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border'}`}>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Monto Pendiente</p>
                <p className={`text-2xl font-bold ${pendientes > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {pendientes > 0 ? 'Pendiente' : 'Al día'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Sin consignar</p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${pendientes > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <Users className={`h-5 w-5 ${pendientes > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-base">Filtros</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por año o descripción..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="CERRADA">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filtroEstado !== 'todos' || filtroBusqueda !== '') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline">{periodosFiltrados.length} resultado{periodosFiltrados.length !== 1 ? 's' : ''}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setFiltroEstado('todos'); setFiltroBusqueda(''); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      <div className="space-y-3">
        <div>
          <h2 className="mb-1">Períodos de Cesantías</h2>
          <p className="text-muted-foreground">Historial de liquidaciones anuales de cesantías</p>
        </div>

        {periodosFiltrados.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaboradores</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Cesantías</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consignado</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha Límite</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodosFiltrados.map((periodo, index) => (
                      <tr
                        key={periodo.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{periodo.descripcion}</p>
                              <p className="text-xs text-muted-foreground">Fondos: {periodo.fondos.join(', ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={periodo.estado as any} />
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold">
                            {periodo.estado === 'BORRADOR' ? <span className="text-muted-foreground">—</span> : periodo.colaboradores}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {periodo.estado === 'BORRADOR'
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm font-bold text-primary">${periodo.totalCesantias.toLocaleString('es-CO')}</span>}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-semibold ${periodo.totalConsignado > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            {periodo.estado === 'BORRADOR' || periodo.totalConsignado === 0 ? '—' : `$${periodo.totalConsignado.toLocaleString('es-CO')}`}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm text-muted-foreground">
                            {new Date(periodo.fechaLimite).toLocaleDateString('es-CO')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {periodo.estado === 'BORRADOR' ? (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/liquidaciones/cesantias/${periodo.id}`)}
                                className="gap-1 bg-primary hover:bg-primary/90"
                              >
                                <Calculator className="h-4 w-4" />
                                Liquidar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/liquidaciones/cesantias/${periodo.id}`)}
                                className="gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : periodosCesantiasMock.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PiggyBank className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de cesantías</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer período para comenzar</p>
              <Button onClick={() => navigate('/liquidaciones/cesantias/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Período de Cesantías
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">Intenta ajustar los filtros</p>
              <Button variant="outline" onClick={() => { setFiltroEstado('todos'); setFiltroBusqueda(''); }}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
