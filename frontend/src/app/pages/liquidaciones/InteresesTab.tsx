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
  Users, AlertTriangle, Percent, CheckCircle, Clock,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';

interface PeriodoIntereses {
  id: string;
  anio: number;
  descripcion: string;
  estado: 'BORRADOR' | 'CERRADA';
  colaboradores: number;
  saldoCesantias: number;
  totalIntereses: number;
  totalPagado: number;
  fechaLimite: string;
  tasa: number;
}

const periodosInteresesMock: PeriodoIntereses[] = [
  {
    id: 'int-2026',
    anio: 2026,
    descripcion: 'Intereses de Cesantías 2026',
    estado: 'BORRADOR',
    colaboradores: 0,
    saldoCesantias: 0,
    totalIntereses: 0,
    totalPagado: 0,
    fechaLimite: '2027-01-31',
    tasa: 12,
  },
  {
    id: 'int-2025',
    anio: 2025,
    descripcion: 'Intereses de Cesantías 2025',
    estado: 'CERRADA',
    colaboradores: 6,
    saldoCesantias: 10820000,
    totalIntereses: 1298400,
    totalPagado: 1298400,
    fechaLimite: '2026-01-31',
    tasa: 12,
  },
  {
    id: 'int-2024',
    anio: 2024,
    descripcion: 'Intereses de Cesantías 2024',
    estado: 'CERRADA',
    colaboradores: 5,
    saldoCesantias: 9340000,
    totalIntereses: 1120800,
    totalPagado: 1120800,
    fechaLimite: '2025-01-31',
    tasa: 12,
  },
];

const hoy = new Date();
const proximoEne31 = new Date(hoy.getFullYear(), 0, 31);
if (proximoEne31 < hoy) proximoEne31.setFullYear(hoy.getFullYear() + 1);
const diasRestantes = Math.ceil((proximoEne31.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

export default function InteresesTab() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  const periodosFiltrados = periodosInteresesMock.filter((p) => {
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const cumpleBusqueda =
      filtroBusqueda === '' ||
      p.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      p.anio.toString().includes(filtroBusqueda);
    return cumpleEstado && cumpleBusqueda;
  });

  const totalIntereses = periodosInteresesMock.reduce((s, p) => s + p.totalIntereses, 0);
  const totalPagado = periodosInteresesMock.reduce((s, p) => s + p.totalPagado, 0);
  const pendientes = periodosInteresesMock.filter((p) => p.estado === 'BORRADOR').length;
  const montoPendiente = periodosInteresesMock.filter((p) => p.estado === 'BORRADOR').reduce((s, p) => s + p.totalIntereses, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Intereses de Cesantías</h2>
          <p className="text-muted-foreground mt-1">Liquidación anual de intereses sobre cesantías (12% — Ley 52 de 1975)</p>
        </div>
        <Button onClick={() => navigate('/liquidaciones/intereses/nueva')} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Período de Intereses
        </Button>
      </div>

      {/* Alerta vencimiento */}
      {diasRestantes <= 30 && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
          <span>
            Faltan <strong>{diasRestantes} días</strong> para el vencimiento de intereses sobre cesantías (31 de enero — Ley 52 de 1975).
          </span>
        </div>
      )}

      {/* KPIs */}
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Resumen de intereses</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Intereses</p>
                <p className="text-2xl font-bold text-primary">${(totalIntereses / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tasa: 12% anual</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pagados</p>
                <p className="text-2xl font-bold text-success">${(totalPagado / 1000000).toFixed(2)}M</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Sin pagar</p>
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
          <h2 className="mb-1">Períodos de Intereses</h2>
          <p className="text-muted-foreground">Historial de liquidaciones anuales de intereses sobre cesantías</p>
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
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo Cesantías</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Intereses 12%</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pagado</th>
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
                              <p className="text-xs text-muted-foreground">Tasa: {periodo.tasa}% anual</p>
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
                            : <span className="text-sm font-semibold text-muted-foreground">${periodo.saldoCesantias.toLocaleString('es-CO')}</span>}
                        </td>
                        <td className="p-4 text-right">
                          {periodo.estado === 'BORRADOR'
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm font-bold text-primary">${periodo.totalIntereses.toLocaleString('es-CO')}</span>}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-semibold ${periodo.totalPagado > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            {periodo.estado === 'BORRADOR' || periodo.totalPagado === 0 ? '—' : `$${periodo.totalPagado.toLocaleString('es-CO')}`}
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
                                onClick={() => navigate(`/liquidaciones/intereses/${periodo.id}`)}
                                className="gap-1 bg-primary hover:bg-primary/90"
                              >
                                <Calculator className="h-4 w-4" />
                                Liquidar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/liquidaciones/intereses/${periodo.id}`)}
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
        ) : periodosInteresesMock.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Percent className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de intereses</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer período para comenzar</p>
              <Button onClick={() => navigate('/liquidaciones/intereses/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Período de Intereses
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
