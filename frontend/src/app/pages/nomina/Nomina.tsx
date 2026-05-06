import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus,
  FileText,
  Calculator,
  TrendingUp,
  TrendingDown,
  Eye,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Receipt,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { nominaApi, Nomina as NominaT, NominaIndicadores } from '../../../api/nomina';
import type { ApiError } from '../../../api/client';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: NominaT): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  if (n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena) {
    const q = n.quincena === 1 ? 'Primera' : 'Segunda';
    return `${mes} ${n.anio} - ${q} quincena`;
  }
  return `${mes} ${n.anio}`;
}

function toNumber(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

export default function Nomina() {
  const navigate = useNavigate();

  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  const [nominas, setNominas] = useState<NominaT[]>([]);
  const [indicadores, setIndicadores] = useState<NominaIndicadores | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([
      nominaApi.listar({
        estado: filtroEstado !== 'todos' ? (filtroEstado as 'BORRADOR' | 'CERRADA') : undefined,
        mes: filtroMes !== 'todos' ? parseInt(filtroMes) : undefined,
        per_page: 50,
      }),
      nominaApi.indicadores(),
    ])
      .then(([listRes, indRes]) => {
        if (!activo) return;
        setNominas(listRes.data);
        setIndicadores(indRes.data);
      })
      .catch((err: ApiError) => {
        if (!activo) return;
        toast.error(err.message ?? 'Error al cargar nóminas');
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [filtroEstado, filtroMes]);

  const nominasFiltradas = useMemo(() => {
    if (!filtroBusqueda) return nominas;
    const q = filtroBusqueda.toLowerCase();
    return nominas.filter((n) => periodoLabel(n).toLowerCase().includes(q));
  }, [nominas, filtroBusqueda]);

  const totalDevengadoCard = indicadores?.total_devengado ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Nómina</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de períodos de nómina y desprendibles de pago
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/nomina/planilla-diaria')}
            size="lg"
            variant="outline"
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            Planilla Diaria
          </Button>
          <Button
            onClick={() => navigate('/nomina/nuevo-prestamo')}
            size="lg"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <DollarSign className="h-5 w-5" />
            Nuevo Préstamo
          </Button>
          <Button onClick={() => navigate('/nomina/nueva')} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nueva Nómina
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Períodos</p>
                <p className="text-3xl font-bold text-foreground">
                  {indicadores?.total_periodos ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Histórico</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Nóminas en Borrador
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {indicadores?.borradores ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pendientes de cerrar</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Nóminas Cerradas</p>
                <p className="text-3xl font-bold text-foreground">
                  {indicadores?.cerradas ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Completadas</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Devengado</p>
                <p className="text-3xl font-bold text-foreground">
                  ${(totalDevengadoCard / 1_000_000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">Acumulado cerradas</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por período..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="CERRADA">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(MESES_NOMBRE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(filtroEstado !== 'todos' || filtroMes !== 'todos' || filtroBusqueda !== '') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {nominasFiltradas.length} resultado{nominasFiltradas.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroMes('todos');
                  setFiltroBusqueda('');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="mb-2">Nóminas Creadas</h2>
          <p className="text-muted-foreground">Historial de períodos de nómina procesados</p>
        </div>

        {cargando ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              Cargando nóminas...
            </CardContent>
          </Card>
        ) : nominasFiltradas.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Período</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Devengado</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Deducciones</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto Total</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nominasFiltradas.map((n, index) => {
                      const total = toNumber(n.total_general);
                      const ded = toNumber(n.total_deducciones);
                      const dev = total + ded;
                      return (
                        <tr
                          key={n.id}
                          className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{periodoLabel(n)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {n.fecha_inicio} → {n.fecha_fin}
                                  {typeof n.empleados_count === 'number' &&
                                    ` · ${n.empleados_liquidados_count ?? 0}/${n.empleados_count} liquidados`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={n.estado as any} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-success">
                                ${dev.toLocaleString('es-CO')}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3 text-success" />
                                Ingresos
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-destructive">
                                ${ded.toLocaleString('es-CO')}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                Descuentos
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-primary">
                                ${total.toLocaleString('es-CO')}
                              </span>
                              <span className="text-xs text-muted-foreground">A pagar</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              {n.estado === 'BORRADOR' ? (
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/nomina/${n.id}`)}
                                  className="gap-1 bg-primary hover:bg-primary/90"
                                >
                                  <Calculator className="h-4 w-4" />
                                  Liquidar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/nomina/${n.id}`)}
                                  className="hover:bg-primary/10 hover:text-primary hover:border-primary gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
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
            </CardContent>
          </Card>
        ) : nominas.length === 0 ? (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de nómina</p>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza creando tu primer período de nómina
              </p>
              <Button onClick={() => navigate('/nomina/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Primera Nómina
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">
                Intenta ajustar los filtros de búsqueda
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroMes('todos');
                  setFiltroBusqueda('');
                }}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
