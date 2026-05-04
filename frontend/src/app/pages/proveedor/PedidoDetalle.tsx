import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

// Helpers de formateo de fechas defensivos (evitan "Invalid Date")
const formatFecha = (v?: any, opts: Intl.DateTimeFormatOptions = {}) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const ymd = s.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(ymd + 'T12:00:00') : new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', opts);
};
const formatFechaHora = (v?: any, opts: Intl.DateTimeFormatOptions = {}) => {
  if (v === null || v === undefined || v === '') return '—';
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', opts);
};
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  ArrowLeft,
  ShoppingCart,
  User,
  MapPin,
  Phone,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  Truck,
  Mail,
  CreditCard,
  FileText,
  Printer,
  Share2,
  Edit,
  AlertTriangle,
  XCircle,
  PackageCheck,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

type EstadoPedido =
  | 'Pendiente Confirmación'
  | 'Confirmado'
  | 'Preparando'
  | 'Listo para Envío'
  | 'En Tránsito'
  | 'Entregado'
  | 'Cancelado'
  | 'Rechazado'
  | 'En Disputa';

interface EventoTimeline {
  fecha: string;
  titulo: string;
  descripcion: string;
  usuario: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
}

interface Pedido {
  id: string;
  cliente: string;
  productos: {
    nombre: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
  }[];
  total: number;
  estado: EstadoPedido;
  prioridad: 'Normal' | 'Alta' | 'Urgente';
  fechaCreacion: string;
  fechaEstimadaEntrega: string;
  direccion: string;
  contacto: string;
  telefono: string;
  email: string;
  metodoPago: string;
  estadoPago: 'Pendiente' | 'Pagado' | 'Reembolsado';
  fechaPago?: string;
  referenciaPago?: string;
  bancoOrigen?: string;
  numeroAprobacion?: string;
  comisionPasarela?: number;
  comprobantePago?: string;
  numeroGuia?: string;
  transportadora?: string;
  notas?: string;
  timeline: EventoTimeline[];
}

const pedidosData: Record<string, Pedido> = {
  'PED-001': {
    id: 'PED-001',
    cliente: 'Finca La Esperanza',
    productos: [
      { nombre: 'Fertilizante NPK 15-15-15', cantidad: 20, unidad: 'bultos', precioUnitario: 92000 },
    ],
    total: 1840000,
    estado: 'Pendiente Confirmación',
    prioridad: 'Alta',
    fechaCreacion: '2026-04-15T08:30:00',
    fechaEstimadaEntrega: '2026-04-20',
    direccion: 'Vereda El Carmen, km 15, Municipio de San José',
    contacto: 'Carlos Pérez',
    telefono: '300 1234567',
    email: 'carlos@fincalaesperanza.com',
    metodoPago: 'Transferencia Bancaria',
    estadoPago: 'Pendiente',
    bancoOrigen: 'Bancolombia',
    timeline: [
      {
        fecha: '2026-04-15T08:30:00',
        titulo: 'Pedido creado',
        descripcion: 'El cliente realizó el pedido desde el marketplace',
        usuario: 'Sistema',
        tipo: 'info',
      },
    ],
  },
  'PED-002': {
    id: 'PED-002',
    cliente: 'Palma del Norte',
    productos: [
      { nombre: 'Glifosato 48% SL', cantidad: 15, unidad: 'litros', precioUnitario: 42000 },
    ],
    total: 630000,
    estado: 'Preparando',
    prioridad: 'Normal',
    fechaCreacion: '2026-04-14T10:15:00',
    fechaEstimadaEntrega: '2026-04-18',
    direccion: 'Finca El Porvenir, vía principal, km 8',
    contacto: 'María González',
    telefono: '310 9876543',
    email: 'maria@palmadelnorte.com',
    metodoPago: 'Tarjeta de Crédito - Visa',
    estadoPago: 'Pagado',
    fechaPago: '2026-04-14T10:18:32',
    referenciaPago: 'TRX-9874563210',
    numeroAprobacion: '456789',
    comisionPasarela: 18900,
    bancoOrigen: 'Davivienda',
    comprobantePago: 'COMP-2026-04-14-001.pdf',
    timeline: [
      {
        fecha: '2026-04-14T10:15:00',
        titulo: 'Pedido creado',
        descripcion: 'El cliente realizó el pedido',
        usuario: 'Sistema',
        tipo: 'info',
      },
      {
        fecha: '2026-04-14T10:18:32',
        titulo: 'Pago confirmado',
        descripcion: 'Pago procesado exitosamente con tarjeta Visa terminada en 4532',
        usuario: 'Pasarela de Pagos',
        tipo: 'success',
      },
      {
        fecha: '2026-04-14T11:20:00',
        titulo: 'Pedido confirmado',
        descripcion: 'El proveedor confirmó el pedido',
        usuario: 'AgroInsumos del Valle',
        tipo: 'success',
      },
      {
        fecha: '2026-04-15T09:00:00',
        titulo: 'Preparando pedido',
        descripcion: 'El pedido está siendo preparado para envío',
        usuario: 'AgroInsumos del Valle',
        tipo: 'info',
      },
    ],
  },
  'PED-003': {
    id: 'PED-003',
    cliente: 'AgroSur',
    productos: [
      { nombre: 'Machete Palero 24"', cantidad: 10, unidad: 'unidades', precioUnitario: 35000 },
    ],
    total: 350000,
    estado: 'Entregado',
    prioridad: 'Normal',
    fechaCreacion: '2026-04-10T14:20:00',
    fechaEstimadaEntrega: '2026-04-13',
    direccion: 'Zona Rural Sur, sector 3, Municipio de Palmira',
    contacto: 'Juan Martínez',
    telefono: '320 5551234',
    email: 'juan@agrosur.com',
    metodoPago: 'Efectivo contra entrega',
    estadoPago: 'Pagado',
    fechaPago: '2026-04-13T15:30:00',
    numeroGuia: 'TRK123456789',
    transportadora: 'Servientrega',
    timeline: [
      {
        fecha: '2026-04-10T14:20:00',
        titulo: 'Pedido creado',
        descripcion: 'El cliente realizó el pedido',
        usuario: 'Sistema',
        tipo: 'info',
      },
      {
        fecha: '2026-04-10T15:00:00',
        titulo: 'Pedido confirmado',
        descripcion: 'El proveedor confirmó el pedido',
        usuario: 'AgroInsumos del Valle',
        tipo: 'success',
      },
      {
        fecha: '2026-04-11T09:00:00',
        titulo: 'Preparando pedido',
        descripcion: 'El pedido está siendo preparado',
        usuario: 'AgroInsumos del Valle',
        tipo: 'info',
      },
      {
        fecha: '2026-04-11T16:00:00',
        titulo: 'Pedido despachado',
        descripcion: 'El pedido fue enviado con Servientrega - Guía: TRK123456789',
        usuario: 'AgroInsumos del Valle',
        tipo: 'success',
      },
      {
        fecha: '2026-04-13T15:30:00',
        titulo: 'Pedido entregado',
        descripcion: 'El pedido fue entregado exitosamente. Pago recibido en efectivo.',
        usuario: 'Servientrega',
        tipo: 'success',
      },
    ],
  },
  'PED-004': {
    id: 'PED-004',
    cliente: 'Hacienda San Pedro',
    productos: [
      { nombre: 'Fertilizante NPK 15-15-15', cantidad: 50, unidad: 'bultos', precioUnitario: 89000 },
      { nombre: 'Glifosato 48% SL', cantidad: 20, unidad: 'litros', precioUnitario: 42000 },
    ],
    total: 5290000,
    estado: 'En Tránsito',
    prioridad: 'Urgente',
    fechaCreacion: '2026-04-12T09:00:00',
    fechaEstimadaEntrega: '2026-04-16',
    direccion: 'Vereda San Pedro, km 22, Municipio de Buga',
    contacto: 'Pedro Ramírez',
    telefono: '315 4447777',
    email: 'pedro@hacienda-sanpedro.com',
    metodoPago: 'Transferencia Bancaria',
    estadoPago: 'Pagado',
    fechaPago: '2026-04-12T10:30:00',
    referenciaPago: 'TRX-4567891234',
    numeroAprobacion: '789456',
    bancoOrigen: 'Banco de Bogotá',
    comprobantePago: 'COMP-2026-04-12-002.pdf',
    numeroGuia: 'TRK987654321',
    transportadora: 'Coordinadora',
    timeline: [
      {
        fecha: '2026-04-12T09:00:00',
        titulo: 'Pedido creado',
        descripcion: 'El cliente realizó el pedido',
        usuario: 'Sistema',
        tipo: 'info',
      },
      {
        fecha: '2026-04-12T10:30:00',
        titulo: 'Pago confirmado',
        descripcion: 'Transferencia bancaria recibida exitosamente',
        usuario: 'Sistema Bancario',
        tipo: 'success',
      },
      {
        fecha: '2026-04-12T11:00:00',
        titulo: 'Pedido confirmado',
        descripcion: 'El proveedor confirmó el pedido con prioridad urgente',
        usuario: 'AgroInsumos del Valle',
        tipo: 'success',
      },
      {
        fecha: '2026-04-13T08:00:00',
        titulo: 'Preparando pedido',
        descripcion: 'Alistamiento de productos iniciado',
        usuario: 'AgroInsumos del Valle',
        tipo: 'info',
      },
      {
        fecha: '2026-04-14T14:00:00',
        titulo: 'Pedido despachado',
        descripcion: 'El pedido fue enviado con Coordinadora - Guía: TRK987654321',
        usuario: 'AgroInsumos del Valle',
        tipo: 'success',
      },
    ],
  },
};

export default function PedidoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(pedidosData[id || ''] || null);
  const [tabActiva, setTabActiva] = useState('detalles');

  // Modales
  const [modalCambiarEstado, setModalCambiarEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoPedido | ''>('');
  const [notaEstado, setNotaEstado] = useState('');

  if (!pedido) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedido no encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">El pedido solicitado no existe</p>
            <Button onClick={() => navigate('/proveedor/pedidos')} className="mt-4">
              Volver a pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cambiarEstado = () => {
    if (!nuevoEstado) {
      toast.error('Selecciona un estado');
      return;
    }

    const evento: EventoTimeline = {
      fecha: new Date().toISOString(),
      titulo: `Estado cambiado a ${nuevoEstado}`,
      descripcion: notaEstado || 'Sin observaciones',
      usuario: 'AgroInsumos del Valle',
      tipo: 'success',
    };

    setPedido({
      ...pedido,
      estado: nuevoEstado as EstadoPedido,
      timeline: [...pedido.timeline, evento],
    });

    setModalCambiarEstado(false);
    setNuevoEstado('');
    setNotaEstado('');
    toast.success('Estado actualizado');
  };

  const generarFacturaPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Logo y datos del proveedor
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroInsumos del Valle', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('NIT: 900.123.456-7', 20, 27);
    doc.text('Calle 12 #34-56, Valle del Cauca', 20, 32);
    doc.text('Tel: (602) 555-1234', 20, 37);
    doc.text('info@agroinsumos.com', 20, 42);

    // Título del documento
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA DE VENTA', pageWidth / 2, 55, { align: 'center' });

    // Información del pedido
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pedido: ${pedido.id}`, pageWidth - 60, 20);
    doc.text(`Fecha: ${formatFecha(pedido.fechaCreacion)}`, pageWidth - 60, 27);
    doc.text(`Estado: ${pedido.estado}`, pageWidth - 60, 34);

    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(20, 65, pageWidth - 20, 65);

    // Datos del cliente
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${pedido.cliente}`, 20, 82);
    doc.text(`Contacto: ${pedido.contacto}`, 20, 88);
    doc.text(`Teléfono: ${pedido.telefono}`, 20, 94);
    doc.text(`Email: ${pedido.email}`, 20, 100);
    doc.text(`Dirección: ${pedido.direccion}`, 20, 106);

    // Tabla de productos
    const startY = 120;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS', 20, startY);

    // Encabezados de tabla
    doc.setFontSize(9);
    const headers = ['Producto', 'Cantidad', 'P. Unitario', 'Total'];
    const colWidths = [90, 30, 30, 30];
    let xPos = 20;

    doc.setFillColor(240, 240, 240);
    doc.rect(20, startY + 5, pageWidth - 40, 8, 'F');

    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, startY + 10);
      xPos += colWidths[i];
    });

    // Productos
    doc.setFont('helvetica', 'normal');
    let yPos = startY + 18;

    pedido.productos.forEach((producto) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      xPos = 20;
      doc.text(producto.nombre, xPos + 2, yPos);
      xPos += colWidths[0];
      doc.text(`${producto.cantidad} ${producto.unidad}`, xPos + 2, yPos);
      xPos += colWidths[1];
      doc.text(`$${producto.precioUnitario.toLocaleString()}`, xPos + 2, yPos);
      xPos += colWidths[2];
      doc.text(`$${(producto.cantidad * producto.precioUnitario).toLocaleString()}`, xPos + 2, yPos);

      yPos += 8;
    });

    // Línea divisoria antes del total
    yPos += 5;
    doc.setLineWidth(0.3);
    doc.line(pageWidth - 80, yPos, pageWidth - 20, yPos);

    // Total
    yPos += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', pageWidth - 80, yPos);
    doc.text(`$${pedido.total.toLocaleString()}`, pageWidth - 40, yPos, { align: 'right' });

    // Método de pago
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Método de pago: ${pedido.metodoPago}`, 20, yPos);
    doc.text(`Estado de pago: ${pedido.estadoPago}`, 20, yPos + 6);

    if (pedido.estadoPago === 'Pagado' && pedido.fechaPago) {
      doc.text(`Fecha de pago: ${formatFecha(pedido.fechaPago)}`, 20, yPos + 12);
      if (pedido.referenciaPago) {
        doc.text(`Referencia: ${pedido.referenciaPago}`, 20, yPos + 18);
      }
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Gracias por su compra - AgroInsumos del Valle', pageWidth / 2, footerY, { align: 'center' });

    // Descargar el PDF
    doc.save(`Factura-${pedido.id}.pdf`);
    toast.success('Factura generada y descargada exitosamente');
  };

  const getEstadoBadge = (estado: EstadoPedido) => {
    const configs: Record<EstadoPedido, { className: string; icon: any }> = {
      'Pendiente Confirmación': {
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: Clock,
      },
      Confirmado: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CheckCircle },
      Preparando: { className: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Package },
      'Listo para Envío': {
        className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        icon: PackageCheck,
      },
      'En Tránsito': { className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: Truck },
      Entregado: { className: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
      Cancelado: { className: 'bg-muted text-muted-foreground border-muted', icon: XCircle },
      Rechazado: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
      'En Disputa': {
        className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: AlertTriangle,
      },
    };
    const config = configs[estado];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.className} text-base px-3 py-1`}>
        <Icon className="h-4 w-4 mr-2" />
        {estado}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pedido.id}</h1>
            <p className="text-muted-foreground mt-1">Detalle del pedido</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getEstadoBadge(pedido.estado)}
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList>
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="detalles">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información del cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre</p>
                        <p className="font-medium">{pedido.cliente}</p>
                        <p className="text-sm">{pedido.contacto}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{pedido.telefono}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{pedido.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dirección de entrega</p>
                        <p className="font-medium">{pedido.direccion}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pedido.productos.map((producto, index) => (
                      <div key={index} className="flex items-start justify-between p-4 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{producto.nombre}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Cantidad: {producto.cantidad} {producto.unidad}
                            </span>
                            <span>•</span>
                            <span>Precio unitario: ${producto.precioUnitario.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            ${(producto.cantidad * producto.precioUnitario).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Información de Pago */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Información de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Método de pago</p>
                        <p className="font-medium">{pedido.metodoPago}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        pedido.estadoPago === 'Pagado'
                          ? 'bg-success/10 text-success border-success/20'
                          : pedido.estadoPago === 'Reembolsado'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }
                    >
                      {pedido.estadoPago}
                    </Badge>
                  </div>

                  {pedido.estadoPago === 'Pagado' && pedido.fechaPago && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Fecha de pago</p>
                        <p className="font-medium">
                          {formatFechaHora(pedido.fechaPago, {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {pedido.referenciaPago && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Referencia de pago</p>
                          <p className="font-medium font-mono text-sm">{pedido.referenciaPago}</p>
                        </div>
                      )}

                      {pedido.numeroAprobacion && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Número de aprobación</p>
                          <p className="font-medium">{pedido.numeroAprobacion}</p>
                        </div>
                      )}

                      {pedido.bancoOrigen && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Banco/Entidad</p>
                          <p className="font-medium">{pedido.bancoOrigen}</p>
                        </div>
                      )}

                      {pedido.comisionPasarela && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Comisión pasarela</p>
                          <p className="font-medium text-destructive">
                            -${pedido.comisionPasarela.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {pedido.comisionPasarela && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Monto neto a recibir</p>
                          <p className="font-medium text-success">
                            ${(pedido.total - pedido.comisionPasarela).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {pedido.estadoPago === 'Pendiente' && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-600">Pago pendiente</p>
                          <p className="text-xs text-amber-600/80 mt-1">
                            El cliente aún no ha completado el pago. El pedido se procesará una vez se confirme
                            el pago.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {pedido.comprobantePago && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        // Simular descarga del comprobante
                        toast.success('Descargando comprobante de pago...');
                        setTimeout(() => {
                          toast.success('Comprobante descargado exitosamente');
                        }, 500);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Descargar comprobante de pago
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Información de envío */}
              {pedido.numeroGuia && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Información de Envío
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Transportadora</p>
                        <p className="font-medium">{pedido.transportadora}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Número de Guía</p>
                        <p className="font-medium">{pedido.numeroGuia}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full gap-2">
                      <Truck className="h-4 w-4" />
                      Rastrear Envío
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Resumen */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${pedido.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span className="font-medium">Incluido</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (0%)</span>
                      <span className="font-medium">$0</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold">${pedido.total.toLocaleString()}</span>
                    </div>
                    <Badge
                      className={
                        pedido.estadoPago === 'Pagado'
                          ? 'bg-success/10 text-success border-success/20 w-full justify-center'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20 w-full justify-center'
                      }
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      {pedido.estadoPago}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Fechas */}
              <Card>
                <CardHeader>
                  <CardTitle>Fechas Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de creación</p>
                      <p className="font-medium">
                        {formatFechaHora(pedido.fechaCreacion, {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Entrega estimada</p>
                      <p className="font-medium">
                        {formatFecha(pedido.fechaEstimadaEntrega, {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Acciones */}
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => setModalCambiarEstado(true)}
                  >
                    <Edit className="h-4 w-4" />
                    Cambiar Estado
                  </Button>
                  <Button className="w-full gap-2" variant="outline" onClick={generarFacturaPDF}>
                    <FileText className="h-4 w-4" />
                    Generar Factura
                  </Button>
                  <Button className="w-full gap-2" variant="outline" onClick={generarFacturaPDF}>
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Info adicional */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Método de pago:</span>{' '}
                    {pedido.metodoPago}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">Prioridad:</span> {pedido.prioridad}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historial del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pedido.timeline.map((evento, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          evento.tipo === 'success'
                            ? 'bg-success/10 text-success'
                            : evento.tipo === 'warning'
                            ? 'bg-amber-500/10 text-amber-600'
                            : evento.tipo === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      {index < pedido.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium">{evento.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFechaHora(evento.fecha, {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                      <p className="text-xs text-muted-foreground mt-1">Por: {evento.usuario}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modal cambiar estado */}
      <Dialog open={modalCambiarEstado} onOpenChange={setModalCambiarEstado}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Pedido</DialogTitle>
            <DialogDescription>{pedido.id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Estado</Label>
              <Select value={nuevoEstado} onValueChange={(v: any) => setNuevoEstado(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente Confirmación">Pendiente Confirmación</SelectItem>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Preparando">Preparando</SelectItem>
                  <SelectItem value="Listo para Envío">Listo para Envío</SelectItem>
                  <SelectItem value="En Tránsito">En Tránsito</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nota (Opcional)</Label>
              <Textarea
                placeholder="Agregar observaciones sobre el cambio de estado..."
                value={notaEstado}
                onChange={(e) => setNotaEstado(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCambiarEstado(false)}>
              Cancelar
            </Button>
            <Button onClick={cambiarEstado}>Actualizar Estado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}