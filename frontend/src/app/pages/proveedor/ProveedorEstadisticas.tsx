import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const estadisticasVentas = [
  {
    titulo: 'Ventas Totales',
    valor: '$12.450.000',
    cambio: '+12.5%',
    tendencia: 'up',
    icono: DollarSign,
    descripcion: 'vs. mes anterior',
  },
  {
    titulo: 'Pedidos Completados',
    valor: '47',
    cambio: '+8.2%',
    tendencia: 'up',
    icono: ShoppingCart,
    descripcion: 'vs. mes anterior',
  },
  {
    titulo: 'Productos Vendidos',
    valor: '156',
    cambio: '-3.1%',
    tendencia: 'down',
    icono: Package,
    descripcion: 'vs. mes anterior',
  },
  {
    titulo: 'Clientes Activos',
    valor: '23',
    cambio: '+15.0%',
    tendencia: 'up',
    icono: Users,
    descripcion: 'vs. mes anterior',
  },
];

const productosMasVendidos = [
  {
    nombre: 'Fertilizante NPK 15-15-15',
    categoria: 'Fertilizantes',
    unidadesVendidas: 450,
    ingresos: '$4.140.000',
    tendencia: 'up',
  },
  {
    nombre: 'Glifosato 48% SL',
    categoria: 'Herbicidas',
    unidadesVendidas: 320,
    ingresos: '$2.688.000',
    tendencia: 'up',
  },
  {
    nombre: 'Machete Palero 24"',
    categoria: 'Herramientas',
    unidadesVendidas: 180,
    ingresos: '$630.000',
    tendencia: 'down',
  },
  {
    nombre: 'Urea 46%',
    categoria: 'Fertilizantes',
    unidadesVendidas: 280,
    ingresos: '$2.520.000',
    tendencia: 'up',
  },
  {
    nombre: 'Abono Orgánico',
    categoria: 'Fertilizantes',
    unidadesVendidas: 150,
    ingresos: '$825.000',
    tendencia: 'up',
  },
];

const clientesTop = [
  {
    nombre: 'Hacienda San Pedro',
    pedidos: 12,
    total: '$5.890.000',
    ultimoPedido: '2026-04-12',
  },
  {
    nombre: 'Finca La Esperanza',
    pedidos: 8,
    total: '$3.240.000',
    ultimoPedido: '2026-04-15',
  },
  {
    nombre: 'Palma del Norte',
    pedidos: 10,
    total: '$2.950.000',
    ultimoPedido: '2026-04-14',
  },
  {
    nombre: 'AgroSur',
    pedidos: 6,
    total: '$1.850.000',
    ultimoPedido: '2026-04-10',
  },
];

const ventasPorMes = [
  { mes: 'Oct', ventas: 7850000, pedidos: 38 },
  { mes: 'Nov', ventas: 8200000, pedidos: 41 },
  { mes: 'Dic', ventas: 9800000, pedidos: 45 },
  { mes: 'Ene', ventas: 8500000, pedidos: 39 },
  { mes: 'Feb', ventas: 9500000, pedidos: 43 },
  { mes: 'Mar', ventas: 11200000, pedidos: 48 },
  { mes: 'Abr', ventas: 12450000, pedidos: 47 },
];

export default function ProveedorEstadisticas() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Estadísticas y Reportes</h1>
        <p className="text-muted-foreground mt-1">Análisis de rendimiento y ventas</p>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Período:</span>
        <Badge variant="outline" className="gap-1">
          Últimos 30 días
        </Badge>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {estadisticasVentas.map((stat) => {
          const Icon = stat.icono;
          const TrendIcon = stat.tendencia === 'up' ? TrendingUp : TrendingDown;
          return (
            <Card key={stat.titulo}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.titulo}</p>
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      stat.tendencia === 'up'
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold mb-1">{stat.valor}</p>
                <div className="flex items-center gap-1">
                  <TrendIcon
                    className={`h-4 w-4 ${
                      stat.tendencia === 'up' ? 'text-success' : 'text-destructive'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      stat.tendencia === 'up' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {stat.cambio}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{stat.descripcion}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de ventas por mes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Evolución de Ventas</CardTitle>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">+51.9% vs. 6 meses atrás</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={ventasPorMes}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop key="stop1" offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop key="stop2" offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="mes"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-medium">{payload[0].payload.mes}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              <span className="text-xs text-muted-foreground">Ventas:</span>
                              <span className="text-sm font-bold">
                                ${(payload[0].value as number).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-cyan-500" />
                              <span className="text-xs text-muted-foreground">Pedidos:</span>
                              <span className="text-sm font-bold">
                                {payload[0].payload.pedidos}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorVentasGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Estadísticas adicionales */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  ${(ventasPorMes[ventasPorMes.length - 1].ventas / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  ${((ventasPorMes.reduce((acc, item) => acc + item.ventas, 0)) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total 7 meses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  ${((ventasPorMes.reduce((acc, item) => acc + item.ventas, 0) / ventasPorMes.length) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productosMasVendidos.map((producto, index) => (
                <div
                  key={producto.nombre}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-amber-500/10 text-amber-600'
                        : index === 1
                        ? 'bg-slate-400/10 text-slate-600'
                        : index === 2
                        ? 'bg-orange-500/10 text-orange-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{producto.nombre}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{producto.unidadesVendidas} unidades</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {producto.categoria}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{producto.ingresos}</p>
                    {producto.tendencia === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-success ml-auto" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes Top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Mejores Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clientesTop.map((cliente) => (
              <div
                key={cliente.nombre}
                className="p-4 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline">{cliente.pedidos} pedidos</Badge>
                </div>
                <p className="font-semibold mb-1">{cliente.nombre}</p>
                <p className="text-2xl font-bold text-primary mb-2">{cliente.total}</p>
                <p className="text-xs text-muted-foreground">
                  Último pedido: {new Date(cliente.ultimoPedido).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de rendimiento */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasa de conversión</p>
                <p className="text-2xl font-bold">78.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket promedio</p>
                <p className="text-2xl font-bold">$264.900</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Productos activos</p>
                <p className="text-2xl font-bold">42</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}