import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';

// Mock data
const estadisticas = {
  totalProductos: 24,
  productosActivos: 22,
  productosAgotados: 2,
  pedidosPendientes: 8,
  pedidosEnProceso: 5,
  pedidosCompletados: 47,
  ventasMes: 4850000,
  ventasMesAnterior: 4200000,
};

const pedidosRecientes = [
  {
    id: 'ped1',
    cliente: 'Finca La Esperanza',
    producto: 'Fertilizante NPK 15-15-15',
    cantidad: 20,
    unidad: 'bultos',
    total: 1840000,
    estado: 'Pendiente',
    fecha: '2026-04-15',
  },
  {
    id: 'ped2',
    cliente: 'Palma del Norte',
    producto: 'Glifosato 48% SL',
    cantidad: 15,
    unidad: 'litros',
    total: 630000,
    estado: 'En Proceso',
    fecha: '2026-04-14',
  },
  {
    id: 'ped3',
    cliente: 'AgroSur',
    producto: 'Machete Palero 24"',
    cantidad: 10,
    unidad: 'unidades',
    total: 350000,
    estado: 'Completado',
    fecha: '2026-04-13',
  },
];

const productosPopulares = [
  { nombre: 'Fertilizante NPK 15-15-15', ventas: 156, ingresos: 14820000 },
  { nombre: 'Glifosato 48% SL', ventas: 98, ingresos: 4116000 },
  { nombre: 'Machete Palero 24"', ventas: 87, ingresos: 3045000 },
];

export default function ProveedorDashboard() {
  const cambioVentas = ((estadisticas.ventasMes - estadisticas.ventasMesAnterior) / estadisticas.ventasMesAnterior) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">¡Bienvenido, AgroInsumos del Valle!</h1>
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
              <p className="text-4xl font-bold">{estadisticas.productosActivos}</p>
              <p className="text-xs text-muted-foreground mt-1">
                de {estadisticas.totalProductos} totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Pendientes</p>
              <p className="text-4xl font-bold">{estadisticas.pedidosPendientes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {estadisticas.pedidosEnProceso} en proceso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pedidos Completados</p>
              <p className="text-4xl font-bold">{estadisticas.pedidosCompletados}</p>
              <p className="text-xs text-muted-foreground mt-1">este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Ventas del Mes</p>
              <p className="text-4xl font-bold">
                ${(estadisticas.ventasMes / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-success mt-1">
                +{cambioVentas.toFixed(1)}% vs mes anterior
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
            <div className="space-y-3">
              {pedidosRecientes.map((pedido) => (
                <div key={pedido.id} className="flex items-start justify-between pb-3 border-b last:border-0 last:pb-0">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{pedido.cliente}</p>
                      <Badge
                        variant="outline"
                        className={
                          pedido.estado === 'Pendiente'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : pedido.estado === 'En Proceso'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : 'bg-success/10 text-success border-success/20'
                        }
                      >
                        {pedido.estado}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pedido.producto}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pedido.cantidad} {pedido.unidad} • {pedido.fecha}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-sm">
                      ${pedido.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Productos populares */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productosPopulares.map((producto, index) => (
                <div key={index} className="pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {producto.ventas} unidades vendidas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        ${(producto.ingresos / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">ingresos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}