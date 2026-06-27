/**
 * Listado de Préstamos / Adelantos a colaboradores.
 *
 * Diseño portado de V.15. Sin endpoint backend aún — la tabla se renderiza
 * con un array local vacío hasta que el backend exponga:
 *  - GET  /api/v1/tenant/prestamos
 *  - POST /api/v1/tenant/prestamos
 *  - GET  /api/v1/tenant/prestamos/{id}
 *  - PUT  /api/v1/tenant/prestamos/{id}
 *
 * Una vez exista API, reemplazar el array `prestamos` con un useEffect
 * que consuma `prestamosApi.listar()`.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Plus, Search, DollarSign, User, Calendar,
} from 'lucide-react';

type EstadoPrestamo = 'Vigente' | 'Cancelado';

interface Prestamo {
  id: string;
  colaborador: string;
  cedula: string;
  concepto: string;
  montoTotal: number;
  saldoPendiente: number;
  cuotaMensual: number;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoPrestamo;
  cuotasPagadas: number;
  cuotasTotales: number;
}

const estadoConfig: Record<EstadoPrestamo, { label: string; className: string }> = {
  Vigente:   { label: 'Vigente',   className: 'bg-primary/10 text-primary border-primary/20' },
  Cancelado: { label: 'Cancelado', className: 'bg-success/10 text-success border-success/20' },
};

export default function Prestamos() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // TODO: reemplazar con `prestamosApi.listar()` cuando exista el endpoint.
  const prestamos: Prestamo[] = [];

  const prestamosFiltrados = prestamos.filter((p) => {
    const cumpleBusqueda =
      busqueda === '' ||
      p.colaborador.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cedula.includes(busqueda) ||
      p.concepto.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    return cumpleBusqueda && cumpleEstado;
  });

  const totalVigente = prestamos
    .filter((p) => p.estado === 'Vigente')
    .reduce((s, p) => s + p.saldoPendiente, 0);
  const countVigente = prestamos.filter((p) => p.estado === 'Vigente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link to="/nomina">
            <ArrowLeft className="h-4 w-4" />
            Volver a Pagos
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Préstamos</h1>
            <p className="text-muted-foreground mt-1">
              Adelantos y préstamos registrados a colaboradores
            </p>
          </div>
          <Button
            onClick={() => navigate('/nomina/nuevo-prestamo')}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Préstamos Vigentes
                </p>
                <p className="text-2xl font-bold text-foreground">{countVigente}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Con saldo pendiente</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalVigente.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">En préstamos vigentes</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por colaborador, cédula o concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Vigente">Vigente</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Concepto</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Monto Total</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Saldo Pendiente</th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground">Cuota</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Avance</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Fecha Fin</span>
                  </th>
                  <th className="text-center p-4 text-xs font-semibold text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {prestamosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-sm text-muted-foreground">
                      {prestamos.length === 0
                        ? 'Aún no hay préstamos registrados. Crea uno con el botón "Nuevo Préstamo".'
                        : 'No se encontraron préstamos con los filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  prestamosFiltrados.map((p, idx) => {
                    const cfg = estadoConfig[p.estado];
                    const pct = Math.round((p.cuotasPagadas / p.cuotasTotales) * 100);
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-semibold text-sm">{p.colaborador}</p>
                          <p className="text-xs text-muted-foreground">CC {p.cedula}</p>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{p.concepto}</td>
                        <td className="p-4 text-right text-sm font-medium">
                          ${p.montoTotal.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-bold ${p.saldoPendiente === 0 ? 'text-success' : 'text-foreground'}`}>
                            ${p.saldoPendiente.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="p-4 text-right text-sm">
                          ${p.cuotaMensual.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {p.cuotasPagadas}/{p.cuotasTotales}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(p.fechaFin).toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
