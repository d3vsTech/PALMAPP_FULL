import { useState } from 'react';
import { useNavigate } from 'react-router';

// Helper defensivo para fechas (evita "Invalid Date")
const formatFecha = (v?: any, opts: Intl.DateTimeFormatOptions = {}) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const ymd = s.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(ymd + 'T12:00:00') : new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', opts);
};
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Filter,
  Eye,
} from 'lucide-react';

type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'preparacion'
  | 'camino'
  | 'entregado'
  | 'cancelado';

interface Pedido {
  id: string;
  fecha: string;
  productos: {
    nombre: string;
    cantidad: number;
    precio: number;
  }[];
  subtotal: number;
  envio: number;
  total: number;
  estado: EstadoPedido;
  proveedor: string;
  direccion: string;
  metodoPago: string;
}

// Mock data
const pedidosData: Pedido[] = [
  {
    id: 'PED-001',
    fecha: '2026-04-10',
    productos: [
      { nombre: 'Fertilizante NPK 15-15-15', cantidad: 10, precio: 95000 },
      { nombre: 'Glifosato 48% SL', cantidad: 5, precio: 42000 },
    ],
    subtotal: 1160000,
    envio: 25000,
    total: 1185000,
    estado: 'camino',
    proveedor: 'AgroInsumos del Valle',
    direccion: 'Finca Principal',
    metodoPago: 'Transferencia Bancaria',
  },
  {
    id: 'PED-002',
    fecha: '2026-04-08',
    productos: [
      { nombre: 'Herbicida Selectivo', cantidad: 8, precio: 38000 },
    ],
    subtotal: 304000,
    envio: 0,
    total: 304000,
    estado: 'entregado',
    proveedor: 'QuímicosAgro',
    direccion: 'Lote 2 - Sur',
    metodoPago: 'Contra Entrega',
  },
  {
    id: 'PED-003',
    fecha: '2026-04-07',
    productos: [
      { nombre: 'Machete 18 pulgadas', cantidad: 15, precio: 28000 },
      { nombre: 'Guantes de seguridad', cantidad: 50, precio: 8500 },
    ],
    subtotal: 845000,
    envio: 15000,
    total: 860000,
    estado: 'entregado',
    proveedor: 'Herramientas del Campo',
    direccion: 'Bodega',
    metodoPago: 'Crédito a 30 días',
  },
  {
    id: 'PED-004',
    fecha: '2026-04-05',
    productos: [
      { nombre: 'Fertilizante NPK 15-15-15', cantidad: 50, precio: 89000 },
    ],
    subtotal: 4450000,
    envio: 0,
    total: 4450000,
    estado: 'confirmado',
    proveedor: 'AgroInsumos del Valle',
    direccion: 'Finca Principal',
    metodoPago: 'Transferencia Bancaria',
  },
  {
    id: 'PED-005',
    fecha: '2026-04-03',
    productos: [
      { nombre: 'Insecticida Orgánico', cantidad: 10, precio: 52000 },
    ],
    subtotal: 520000,
    envio: 20000,
    total: 540000,
    estado: 'preparacion',
    proveedor: 'BioAgro',
    direccion: 'Lote 1 - Norte',
    metodoPago: 'Contra Entrega',
  },
  {
    id: 'PED-006',
    fecha: '2026-03-28',
    productos: [
      { nombre: 'Bomba fumigadora 20L', cantidad: 3, precio: 185000 },
    ],
    subtotal: 555000,
    envio: 0,
    total: 555000,
    estado: 'cancelado',
    proveedor: 'Herramientas del Campo',
    direccion: 'Bodega',
    metodoPago: 'Transferencia Bancaria',
  },
];

const estadoConfig: Record<
  EstadoPedido,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  confirmado: {
    label: 'Confirmado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircle,
  },
  preparacion: {
    label: 'En Preparación',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Package,
  },
  camino: {
    label: 'En Camino',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: Truck,
  },
  entregado: {
    label: 'Entregado',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
    icon: PackageCheck,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    icon: XCircle,
  },
};

export default function Pedidos() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'todos'>('todos');

  const pedidosFiltrados =
    filtroEstado === 'todos'
      ? pedidosData
      : pedidosData.filter((p) => p.estado === filtroEstado);

  // KPIs
  const pedidosActivos = pedidosData.filter(
    (p) =>
      p.estado === 'pendiente' ||
      p.estado === 'confirmado' ||
      p.estado === 'preparacion' ||
      p.estado === 'camino'
  ).length;
  const pedidosEntregados = pedidosData.filter((p) => p.estado === 'entregado').length;
  const totalGastado = pedidosData
    .filter((p) => p.estado !== 'cancelado')
    .reduce((sum, p) => sum + p.total, 0);

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
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Pedidos Activos
                </p>
                <p className="text-3xl font-bold text-foreground">{pedidosActivos}</p>
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
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Pedidos Entregados
                </p>
                <p className="text-3xl font-bold text-foreground">{pedidosEntregados}</p>
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
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Total Gastado
                </p>
                <p className="text-3xl font-bold text-success">
                  ${totalGastado.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Últimos pedidos</p>
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
              onValueChange={(val) => setFiltroEstado(val as EstadoPedido | 'todos')}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los pedidos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="preparacion">En Preparación</SelectItem>
                <SelectItem value="camino">En Camino</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {pedidosFiltrados.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay pedidos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                No se encontraron pedidos con el filtro seleccionado
              </p>
              <Button onClick={() => setFiltroEstado('todos')}>Ver todos los pedidos</Button>
            </CardContent>
          </Card>
        ) : (
          pedidosFiltrados.map((pedido) => {
            const config = estadoConfig[pedido.estado];
            const Icon = config.icon;

            return (
              <Card key={pedido.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Info principal */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-foreground">{pedido.id}</h3>
                            <Badge
                              className={`${config.bgColor} ${config.color} ${config.borderColor} border`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Fecha: {formatFecha(pedido.fecha, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {pedido.productos.length}{' '}
                            {pedido.productos.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Proveedor:</span>
                          <span className="font-medium">{pedido.proveedor}</span>
                        </div>
                      </div>

                      {/* Productos */}
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        {pedido.productos.map((prod, index) => (
                          <p key={index} className="text-sm">
                            <span className="font-medium">{prod.cantidad}x</span> {prod.nombre}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Total y acciones */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 lg:gap-3 lg:min-w-[180px]">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold text-success">
                          ${pedido.total.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/market/pedido/${pedido.id}`)}
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
      </div>
    </div>
  );
}