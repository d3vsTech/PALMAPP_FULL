import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router';
import {
  Plus, Loader2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { proveedorApi, toNumber, type DashboardProv } from '../../../api/proveedor';
import { ESTADO_PEDIDO_LABEL } from '../../../api/market';
import { formatFecha } from '../../utils/fecha';

export default function ProveedorDashboard() {
  const [dashboard, setDashboard] = useState<DashboardProv | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    proveedorApi.dashboard()
      .then((res) => setDashboard(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'Error al cargar dashboard'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando dashboard...
      </div>
    );
  }
  if (!dashboard) {
    return <div className="text-center py-20 text-muted-foreground">Sin datos.</div>;
  }

  const ventasMes = toNumber(dashboard.ventas_mes);
  const pedidosRecientes = dashboard.pedidos_recientes ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">¡Bienvenido!</h1>
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

      {/* Alerta stock bajo */}
      {dashboard.productos_bajo_stock > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm">
                Tienes <strong>{dashboard.productos_bajo_stock}</strong> productos con stock bajo
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/proveedor/productos">Revisar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs principales */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Indicadores Principales</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Productos Activos</p>
              <p className="text-4xl font-bold">{dashboard.productos_activos}</p>
              <p className="text-xs text-muted-foreground mt-1">
                de {dashboard.productos_total} totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Pendientes</p>
              <p className="text-4xl font-bold">{dashboard.pedidos_pendientes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboard.pedidos_en_transito} en camino
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Entregados</p>
              <p className="text-4xl font-bold">{dashboard.pedidos_entregados_mes}</p>
              <p className="text-xs text-muted-foreground mt-1">este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Ventas del Mes</p>
              <p className="text-4xl font-bold">
                {ventasMes >= 1_000_000
                  ? `$${(ventasMes / 1_000_000).toFixed(1)}M`
                  : `$${ventasMes.toLocaleString('es-CO')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total histórico: ${toNumber(dashboard.ventas_total).toLocaleString('es-CO')}
              </p>
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
            {pedidosRecientes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No hay pedidos recientes
              </p>
            ) : (
              <div className="space-y-3">
                {pedidosRecientes.map((pedido) => {
                  const info = ESTADO_PEDIDO_LABEL[pedido.estado as keyof typeof ESTADO_PEDIDO_LABEL];
                  return (
                    <Link
                      key={pedido.id}
                      to={`/proveedor/pedidos/${pedido.codigo}`}
                      className="flex items-start justify-between pb-3 border-b last:border-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 py-2 rounded transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{pedido.codigo}</p>
                          {info && (
                            <Badge variant="outline" className={`text-xs ${info.color}`}>
                              {info.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pedido.items.length} producto{pedido.items.length !== 1 ? 's' : ''} ·{' '}
                          {formatFecha(pedido.fecha_pedido)}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="font-semibold text-sm">
                          ${toNumber(pedido.total).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen comercial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Resumen Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Calificación promedio</p>
                {dashboard.calificacion_promedio != null ? (
                  <p className="text-3xl font-bold">
                    {Number(dashboard.calificacion_promedio).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin reseñas todavía</p>
                )}
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Ventas históricas totales</p>
                <p className="text-3xl font-bold text-success">
                  ${toNumber(dashboard.ventas_total).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Stock crítico</p>
                <p className="text-3xl font-bold text-amber-600">
                  {dashboard.productos_bajo_stock}
                </p>
                <p className="text-xs text-muted-foreground">productos con bajo stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
