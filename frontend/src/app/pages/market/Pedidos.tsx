import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, PackageCheck,
  Filter, Eye, Loader2, ChefHat,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  marketApi, toNumber,
  type Pedido, type EstadoPedido, type PedidoStats,
} from '../../../api/market';
import { formatFecha } from '../../utils/fecha';

const estadoConfig: Record<EstadoPedido, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pendiente:   { label: 'Pendiente',     color: 'text-amber-600',  bgColor: 'bg-amber-50',     borderColor: 'border-amber-200',  icon: Clock },
  confirmado:  { label: 'Confirmado',    color: 'text-blue-600',   bgColor: 'bg-blue-50',      borderColor: 'border-blue-200',   icon: CheckCircle },
  preparando:  { label: 'En Preparación', color: 'text-purple-600', bgColor: 'bg-purple-50',    borderColor: 'border-purple-200', icon: ChefHat },
  en_transito: { label: 'En Camino',     color: 'text-indigo-600', bgColor: 'bg-indigo-50',    borderColor: 'border-indigo-200', icon: Truck },
  entregado:   { label: 'Entregado',     color: 'text-success',    bgColor: 'bg-success/10',   borderColor: 'border-success/20', icon: PackageCheck },
  cancelado:   { label: 'Cancelado',     color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/20', icon: XCircle },
};

export default function Pedidos() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<PedidoStats | null>(null);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'todos'>('todos');
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    marketApi.pedidos({
      estado: filtroEstado === 'todos' ? undefined : filtroEstado,
      page,
    })
      .then((res) => {
        setPedidos(res.data);
        setStats(res.stats);
        setMeta(res.meta);
      })
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar pedidos'))
      .finally(() => setCargando(false));
  }, [filtroEstado, page]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/market')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Button>
        <h1 className="text-4xl font-bold text-foreground">Mis Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y realiza seguimiento a tus pedidos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Pedidos Activos</p>
                <p className="text-3xl font-bold text-foreground">{stats?.pedidos_activos ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">En proceso</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Pedidos Entregados</p>
                <p className="text-3xl font-bold text-foreground">{stats?.pedidos_entregados ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Completados</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <PackageCheck className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Gastado</p>
                <p className="text-3xl font-bold text-success">
                  ${(stats?.total_gastado ?? 0).toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Filtrar por estado:</span>
            </div>
            <Select
              value={filtroEstado}
              onValueChange={(val) => { setFiltroEstado(val as any); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los pedidos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="preparando">En Preparación</SelectItem>
                <SelectItem value="en_transito">En Camino</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-4">
        {cargando ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay pedidos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {filtroEstado === 'todos'
                  ? 'Todavía no has hecho ningún pedido'
                  : 'No hay pedidos en este estado'}
              </p>
              {filtroEstado !== 'todos' && (
                <Button onClick={() => setFiltroEstado('todos')}>Ver todos los pedidos</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          pedidos.map((pedido) => {
            const config = estadoConfig[pedido.estado] ?? estadoConfig.pendiente;
            const Icon = config.icon;
            return (
              <Card key={pedido.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-foreground">{pedido.codigo}</h3>
                            <Badge
                              className={`${config.bgColor} ${config.color} ${config.borderColor} border`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Fecha: {formatFecha(pedido.fecha_pedido)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {pedido.items.length}{' '}
                            {pedido.items.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Proveedor:</span>
                          <span className="font-medium">{pedido.proveedor.nombre_empresa}</span>
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        {pedido.items.map((prod, index) => (
                          <p key={index} className="text-sm">
                            <span className="font-medium">{prod.cantidad}x</span> {prod.nombre_producto}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 lg:gap-3 lg:min-w-[180px]">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold text-success">
                          ${toNumber(pedido.total).toLocaleString('es-CO')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/market/pedidos/${pedido.codigo}`)}
                        className="gap-2 whitespace-nowrap"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Página {meta.current_page} de {meta.last_page} · {meta.total} pedidos
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page === meta.last_page}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
