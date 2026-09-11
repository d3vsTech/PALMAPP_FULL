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
  Users, Gift, CheckCircle, Clock,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';

interface PeriodoPrima {
  id: string;
  anio: number;
  semestre: '1' | '2';
  descripcion: string;
  estado: 'BORRADOR' | 'CERRADA';
  colaboradores: number;
  diasPromedio: number;
  totalPrima: number;
  totalPagado: number;
  fechaLimite: string;
}

const periodosPrimaMock: PeriodoPrima[] = [
  {
    id: 'prima-2026-2',
    anio: 2026,
    semestre: '2',
    descripcion: 'Prima 2° Semestre 2026',
    estado: 'BORRADOR',
    colaboradores: 0,
    diasPromedio: 0,
    totalPrima: 0,
    totalPagado: 0,
    fechaLimite: '2026-12-20',
  },
  {
    id: 'prima-2026-1',
    anio: 2026,
    semestre: '1',
    descripcion: 'Prima 1° Semestre 2026',
    estado: 'CERRADA',
    colaboradores: 7,
    diasPromedio: 181,
    totalPrima: 7980000,
    totalPagado: 7980000,
    fechaLimite: '2026-06-30',
  },
  {
    id: 'prima-2025-2',
    anio: 2025,
    semestre: '2',
    descripcion: 'Prima 2° Semestre 2025',
    estado: 'CERRADA',
    colaboradores: 6,
    diasPromedio: 180,
    totalPrima: 7140000,
    totalPagado: 7140000,
    fechaLimite: '2025-12-20',
  },
  {
    id: 'prima-2025-1',
    anio: 2025,
    semestre: '1',
    descripcion: 'Prima 1° Semestre 2025',
    estado: 'CERRADA',
    colaboradores: 6,
    diasPromedio: 181,
    totalPrima: 6850000,
    totalPagado: 6850000,
    fechaLimite: '2025-06-30',
  },
];

export default function PrimaTab() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroSemestre, setFiltroSemestre] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  const periodosFiltrados = periodosPrimaMock.filter((p) => {
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const cumpleSemestre = filtroSemestre === 'todos' || p.semestre === filtroSemestre;
    const cumpleBusqueda =
      filtroBusqueda === '' ||
      p.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      p.anio.toString().includes(filtroBusqueda);
    return cumpleEstado && cumpleSemestre && cumpleBusqueda;
  });

  const totalPrima = periodosPrimaMock.reduce((s, p) => s + p.totalPrima, 0);
  const totalPagado = periodosPrimaMock.reduce((s, p) => s + p.totalPagado, 0);
  const pendientes = periodosPrimaMock.filter((p) => p.estado === 'BORRADOR').length;
  const montoPendiente = periodosPrimaMock.filter((p) => p.estado === 'BORRADOR').reduce((s, p) => s + p.totalPrima, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Prima de Servicios</h2>
          <p className="text-muted-foreground mt-1">Liquidación semestral de prima de servicios (Ley 1° de 1963)</p>
        </div>
        <Button onClick={() => navigate('/liquidaciones/prima/nueva')} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Período de Prima
        </Button>
      </div>

      {/* KPIs */}
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Resumen de prima de servicios</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Prima</p>
                <p className="text-2xl font-bold text-primary">${(totalPrima / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-muted-foreground mt-0.5">Todos los períodos</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pagadas</p>
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              <label className="text-sm font-medium">Semestre</label>
              <Select value={filtroSemestre} onValueChange={setFiltroSemestre}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="1">1° Semestre (jun)</SelectItem>
                  <SelectItem value="2">2° Semestre (dic)</SelectItem>
                </SelectContent>
              </Select>
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
          {(filtroEstado !== 'todos' || filtroSemestre !== 'todos' || filtroBusqueda !== '') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline">{periodosFiltrados.length} resultado{periodosFiltrados.length !== 1 ? 's' : ''}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setFiltroEstado('todos'); setFiltroSemestre('todos'); setFiltroBusqueda(''); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      <div className="space-y-3">
        <div>
          <h2 className="mb-1">Períodos de Prima</h2>
          <p className="text-muted-foreground">Historial de liquidaciones semestrales de prima de servicios</p>
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
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semestre</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaboradores</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días Prom.</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Prima</th>
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
                              <p className="text-xs text-muted-foreground">Año {periodo.anio}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={periodo.estado as any} />
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {periodo.semestre === '1' ? '1° Sem.' : '2° Sem.'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold">
                            {periodo.estado === 'BORRADOR' ? <span className="text-muted-foreground">—</span> : periodo.colaboradores}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {periodo.estado === 'BORRADOR'
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm text-muted-foreground">{periodo.diasPromedio} días</span>}
                        </td>
                        <td className="p-4 text-right">
                          {periodo.estado === 'BORRADOR'
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm font-bold text-primary">${periodo.totalPrima.toLocaleString('es-CO')}</span>}
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
                                onClick={() => navigate(`/liquidaciones/prima/${periodo.id}`)}
                                className="gap-1 bg-primary hover:bg-primary/90"
                              >
                                <Calculator className="h-4 w-4" />
                                Liquidar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/liquidaciones/prima/${periodo.id}`)}
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
        ) : periodosPrimaMock.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de prima</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer período para comenzar</p>
              <Button onClick={() => navigate('/liquidaciones/prima/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Período de Prima
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">Intenta ajustar los filtros</p>
              <Button variant="outline" onClick={() => { setFiltroEstado('todos'); setFiltroSemestre('todos'); setFiltroBusqueda(''); }}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
