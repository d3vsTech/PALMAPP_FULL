import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router';
import { Plus, Loader2, ShoppingBag, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi,
  toNumber,
  buildImagenUrl,
  type DashboardProveedorResponse,
  type EstadoPedidoProv,
} from '../../../api/proveedor';
import { proveedorAuthStorage } from '../../../api/proveedorAuth';

const ESTADO_LABELS: Record<EstadoPedidoProv, { label: string; cls: string }> = {
  pendiente:   { label: 'Pendiente',    cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  confirmado:  { label: 'Confirmado',   cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  preparando:  { label: 'En Preparación', cls: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  en_transito: { label: 'En Camino',    cls: 'bg-blue-800/10 text-blue-800 border-blue-800/20' },
  entregado:   { label: 'Entregado',    cls: 'bg-success/10 text-success border-success/20' },
  cancelado:   { label: 'Cancelado',    cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function formatCOP(v: number | string): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
  return `$${n.toLocaleString('es-CO')}`;
}

function formatFecha(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CO');
}

export default function ProveedorDashboard() {
  const proveedor = proveedorAuthStorage.getProveedor();
  const user = proveedorAuthStorage.getUser();
  const nombreProveedor = proveedor?.nombre_empresa ?? user?.name ?? 'Proveedor';

  const [data, setData] = useState<DashboardProveedorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proveedorApi.dashboard()
      .then(res => setData(res.data))
      .catch((err: any) => {
        toast.error(err?.message ?? 'No se pudo cargar el dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  const variacion = data?.indicadores?.variacion_ventas_porcentaje;
  const variacionColor = useMemo(() => {
    if (variacion == null) return 'text-muted-foreground';
    if (variacion > 0) return 'text-success';
    if (variacion < 0) return 'text-destructive';
    return 'text-muted-foreground';
  }, [variacion]);
  const variacionLabel = useMemo(() => {
    if (variacion == null) return 'Sin datos del mes anterior';
    const signo = variacion > 0 ? '+' : '';
    return `${signo}${variacion}% vs mes anterior`;
  }, [variacion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando dashboard...</span>
      </div>
    );
  }

  const indicadores = data?.indicadores;
  const pedidos    = data?.pedidos_recientes ?? [];
  const productos  = data?.productos_mas_vendidos ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">¡Bienvenido, {nombreProveedor}!</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de tu actividad en el marketplace
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/proveedor/productos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Link>
        </Button>
      </div>

      {/* KPIs principales */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Indicadores Principales</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Productos Activos</p>
              <p className="text-4xl font-bold">{indicadores?.productos_activos ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                de {indicadores?.productos_total ?? 0} totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Pendientes</p>
              <p className="text-4xl font-bold">{indicadores?.pedidos_pendientes ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {indicadores?.pedidos_en_proceso ?? 0} en proceso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Completados</p>
              <p className="text-4xl font-bold">{indicadores?.pedidos_completados_mes ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Ventas del Mes</p>
              <p className="text-4xl font-bold">
                ${((indicadores?.ventas_mes_actual ?? 0) / 1_000_000).toFixed(1)}M
              </p>
              <p className={`text-xs mt-1 ${variacionColor}`}>{variacionLabel}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pedidos recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold">Pedidos Recientes</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
              <Link to="/proveedor/pedidos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <ShoppingBag className="h-8 w-8 opacity-40" />
                <span className="text-sm">Aún no tienes pedidos</span>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map((pedido) => {
                  const estilo = ESTADO_LABELS[pedido.estado] ?? ESTADO_LABELS.pendiente;
                  return (
                    <Link
                      key={pedido.id}
                      to={`/proveedor/pedidos/${pedido.codigo}`}
                      className="flex items-start justify-between pb-3 border-b last:border-0 last:pb-0 hover:bg-muted/30 rounded-md transition-colors -mx-2 px-2"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{pedido.tenant?.nombre ?? '—'}</p>
                          <Badge variant="outline" className={estilo.cls}>
                            {estilo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {pedido.primer_producto?.nombre ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pedido.primer_producto?.cantidad ?? 0}
                          {pedido.primer_producto?.unidad ? ` ${pedido.primer_producto.unidad}` : ''}
                          {' · '}{formatFecha(pedido.fecha_pedido)}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="font-semibold text-sm">{formatCOP(pedido.total)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Package className="h-8 w-8 opacity-40" />
                <span className="text-sm">Aún no hay ventas registradas</span>
              </div>
            ) : (
              <div className="space-y-3">
                {productos.map((producto) => {
                  const img = buildImagenUrl(producto.imagen_principal);
                  return (
                    <div key={producto.id} className="pb-3 border-b last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {img ? (
                            <img
                              src={img}
                              alt={producto.nombre}
                              className="h-10 w-10 rounded-md object-cover border border-border flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1 truncate" title={producto.nombre}>
                              {producto.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {producto.unidades_vendidas.toLocaleString('es-CO')} unidades vendidas
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">
                            ${(toNumber(producto.ingresos_acumulados) / 1_000_000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">ingresos</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
