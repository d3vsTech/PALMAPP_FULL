import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';

// Helpers defensivos para fechas (evitan "Invalid Date")
const formatFecha = (v?: any, opts: Intl.DateTimeFormatOptions = {}) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const ymd = s.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(ymd + 'T12:00:00') : new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', opts);
};
const formatHora = (v?: any, opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) => {
  if (v === null || v === undefined || v === '') return '—';
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-CO', opts);
};
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  MapPin,
  CreditCard,
  Store,
  Calendar,
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
    unidad: string;
  }[];
  subtotal: number;
  envio: number;
  total: number;
  estado: EstadoPedido;
  proveedor: string;
  direccion: string;
  metodoPago: string;
  indicacionesEntrega?: string;
  timeline: {
    estado: EstadoPedido;
    fecha: string;
    descripcion: string;
  }[];
}

// Mock data - en producción vendría de una API basado en el ID
const pedidoData: Pedido = {
  id: 'PED-001',
  fecha: '2026-04-10',
  productos: [
    {
      nombre: 'Fertilizante NPK 15-15-15',
      cantidad: 10,
      precio: 95000,
      unidad: 'bulto 50kg',
    },
    {
      nombre: 'Glifosato 48% SL',
      cantidad: 5,
      precio: 42000,
      unidad: 'litro',
    },
  ],
  subtotal: 1160000,
  envio: 25000,
  total: 1185000,
  estado: 'camino',
  proveedor: 'AgroInsumos del Valle',
  direccion: 'Finca Principal',
  metodoPago: 'Transferencia Bancaria',
  indicacionesEntrega: 'Dejar en bodega principal, llamar al llegar',
  timeline: [
    {
      estado: 'pendiente',
      fecha: '2026-04-10T08:30:00',
      descripcion: 'Pedido recibido',
    },
    {
      estado: 'confirmado',
      fecha: '2026-04-10T10:15:00',
      descripcion: 'Pedido confirmado por el proveedor',
    },
    {
      estado: 'preparacion',
      fecha: '2026-04-10T14:20:00',
      descripcion: 'Preparando tu pedido',
    },
    {
      estado: 'camino',
      fecha: '2026-04-11T09:00:00',
      descripcion: 'En camino a tu dirección',
    },
  ],
};

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

export default function PedidoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const config = estadoConfig[pedidoData.estado];
  const Icon = config.icon;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/market/pedidos')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis pedidos
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{pedidoData.id}</h1>
            <p className="text-muted-foreground mt-2">
              Realizado el{' '}
              {formatFecha(pedidoData.fecha, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border h-fit`}>
            <Icon className="h-4 w-4 mr-1" />
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline del pedido */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Seguimiento del Pedido
              </h2>

              <div className="relative">
                {pedidoData.timeline.map((evento, index) => {
                  const eventoConfig = estadoConfig[evento.estado];
                  const EventoIcon = eventoConfig.icon;
                  const esUltimo = index === pedidoData.timeline.length - 1;

                  return (
                    <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                      {/* Línea vertical */}
                      {!esUltimo && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                      )}

                      {/* Ícono */}
                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${eventoConfig.borderColor} ${eventoConfig.bgColor}`}
                      >
                        <EventoIcon className={`h-6 w-6 ${eventoConfig.color}`} />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {eventoConfig.label}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(evento.fecha, { month: 'short', day: 'numeric' })}{' '}
                            {formatHora(evento.fecha)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Productos */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Productos</h2>

              <div className="space-y-4">
                {pedidoData.productos.map((producto, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="h-8 w-8 text-primary/30" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{producto.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {producto.cantidad} × ${producto.precio.toLocaleString()} /{' '}
                          {producto.unidad}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      ${(producto.precio * producto.cantidad).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Información de entrega */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Información de Entrega
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Dirección de entrega</p>
                    <p className="text-sm text-muted-foreground">{pedidoData.direccion}</p>
                    {pedidoData.indicacionesEntrega && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Indicaciones: {pedidoData.indicacionesEntrega}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Proveedor</p>
                    <p className="text-sm text-muted-foreground">{pedidoData.proveedor}</p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Método de pago</p>
                    <p className="text-sm text-muted-foreground">{pedidoData.metodoPago}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Resumen del Pedido</h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${pedidoData.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">
                      {pedidoData.envio === 0 ? (
                        <span className="text-success">GRATIS</span>
                      ) : (
                        `$${pedidoData.envio.toLocaleString()}`
                      )}
                    </span>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-success">
                      ${pedidoData.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha estimada de entrega</p>
                  <p className="text-xs text-muted-foreground">
                    {pedidoData.estado === 'entregado'
                      ? 'Pedido entregado'
                      : pedidoData.estado === 'cancelado'
                      ? 'Pedido cancelado'
                      : '13-15 de abril, 2026'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {pedidoData.estado !== 'entregado' && pedidoData.estado !== 'cancelado' && (
              <Button variant="outline" className="w-full">
                Contactar al proveedor
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}