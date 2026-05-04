import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
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
  ShoppingCart,
  Search,
  Package,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  User,
  Truck,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
  PackageCheck,
  Calendar,
  ArrowUpDown,
  FileText,
  MessageSquare,
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

type PrioridadPedido = 'Normal' | 'Alta' | 'Urgente';

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
  prioridad: PrioridadPedido;
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
}

const pedidosDataInicial: Pedido[] = [
  {
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
    direccion: 'Vereda El Carmen, km 15',
    contacto: 'Carlos Pérez',
    telefono: '300 1234567',
    email: 'carlos@fincalaesperanza.com',
    metodoPago: 'Transferencia Bancaria',
    estadoPago: 'Pendiente',
  },
  {
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
    direccion: 'Finca El Porvenir, vía principal',
    contacto: 'María González',
    telefono: '310 9876543',
    email: 'maria@palmadelnorte.com',
    metodoPago: 'Crédito 30 días',
    estadoPago: 'Pagado',
  },
  {
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
    direccion: 'Zona Rural Sur, sector 3',
    contacto: 'Juan Martínez',
    telefono: '320 5551234',
    email: 'juan@agrosur.com',
    metodoPago: 'Efectivo contra entrega',
    estadoPago: 'Pagado',
    numeroGuia: 'TRK123456789',
    transportadora: 'Servientrega',
  },
  {
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
    direccion: 'Vereda San Pedro, km 22',
    contacto: 'Pedro Ramírez',
    telefono: '315 4447777',
    email: 'pedro@hacienda-sanpedro.com',
    metodoPago: 'Transferencia Bancaria',
    estadoPago: 'Pagado',
    numeroGuia: 'TRK987654321',
    transportadora: 'Coordinadora',
  },
];

export default function ProveedorPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosDataInicial);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('Todos');
  const [prioridadFiltro, setPrioridadFiltro] = useState<string>('Todas');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [vistaActiva, setVistaActiva] = useState<'todos' | 'por-confirmar' | 'activos' | 'completados'>('todos');

  // Modal de acciones rápidas
  const [modalAccion, setModalAccion] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [accionTipo, setAccionTipo] = useState<'confirmar' | 'enviar' | 'rechazar' | null>(null);
  const [numeroGuia, setNumeroGuia] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const cumpleBusqueda =
      pedido.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.cliente.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleEstado = estadoFiltro === 'Todos' || pedido.estado === estadoFiltro;
    const cumplePrioridad = prioridadFiltro === 'Todas' || pedido.prioridad === prioridadFiltro;

    let cumpleVista = true;
    if (vistaActiva === 'por-confirmar') {
      cumpleVista = pedido.estado === 'Pendiente Confirmación';
    } else if (vistaActiva === 'activos') {
      cumpleVista = !['Entregado', 'Cancelado', 'Rechazado'].includes(pedido.estado);
    } else if (vistaActiva === 'completados') {
      cumpleVista = ['Entregado', 'Cancelado', 'Rechazado'].includes(pedido.estado);
    }

    return cumpleBusqueda && cumpleEstado && cumplePrioridad && cumpleVista;
  });

  const abrirModalAccion = (pedido: Pedido, tipo: 'confirmar' | 'enviar' | 'rechazar') => {
    setPedidoSeleccionado(pedido);
    setAccionTipo(tipo);
    setModalAccion(true);
    setNumeroGuia('');
    setTransportadora('');
    setMotivoRechazo('');
  };

  const ejecutarAccion = () => {
    if (!pedidoSeleccionado || !accionTipo) return;

    if (accionTipo === 'confirmar') {
      setPedidos(
        pedidos.map((p) =>
          p.id === pedidoSeleccionado.id ? { ...p, estado: 'Confirmado' as EstadoPedido } : p
        )
      );
      toast.success('Pedido confirmado exitosamente');
    } else if (accionTipo === 'enviar') {
      if (!numeroGuia || !transportadora) {
        toast.error('Por favor completa todos los campos');
        return;
      }
      setPedidos(
        pedidos.map((p) =>
          p.id === pedidoSeleccionado.id
            ? { ...p, estado: 'En Tránsito' as EstadoPedido, numeroGuia, transportadora }
            : p
        )
      );
      toast.success('Pedido marcado como enviado');
    } else if (accionTipo === 'rechazar') {
      if (!motivoRechazo) {
        toast.error('Por favor indica el motivo del rechazo');
        return;
      }
      setPedidos(
        pedidos.map((p) =>
          p.id === pedidoSeleccionado.id
            ? { ...p, estado: 'Rechazado' as EstadoPedido, notas: motivoRechazo }
            : p
        )
      );
      toast.success('Pedido rechazado');
    }

    setModalAccion(false);
  };

  const cambiarEstadoDirecto = (id: string, nuevoEstado: EstadoPedido) => {
    setPedidos(pedidos.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p)));
    toast.success(`Estado actualizado a "${nuevoEstado}"`);
  };

  const generarDocumentoPDF = (pedido: Pedido) => {
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
    doc.text(`Fecha: ${new Date(pedido.fechaCreacion).toLocaleDateString('es-CO')}`, pageWidth - 60, 27);
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

    pedido.productos.forEach((producto, index) => {
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

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Gracias por su compra - AgroInsumos del Valle', pageWidth / 2, footerY, { align: 'center' });

    // Descargar el PDF
    doc.save(`Factura-${pedido.id}.pdf`);
    toast.success(`Factura ${pedido.id} generada exitosamente`);
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
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: PrioridadPedido) => {
    const configs: Record<PrioridadPedido, { className: string }> = {
      Normal: { className: 'bg-muted text-muted-foreground' },
      Alta: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
      Urgente: { className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
    };

    return <Badge className={configs[prioridad].className}>{prioridad}</Badge>;
  };

  const estadisticas = {
    porConfirmar: pedidos.filter((p) => p.estado === 'Pendiente Confirmación').length,
    activos: pedidos.filter((p) => !['Entregado', 'Cancelado', 'Rechazado'].includes(p.estado)).length,
    enTransito: pedidos.filter((p) => p.estado === 'En Tránsito').length,
    completados: pedidos.filter((p) => p.estado === 'Entregado').length,
    totalVentas: pedidos
      .filter((p) => p.estado === 'Entregado')
      .reduce((sum, p) => sum + p.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Pedidos</h1>
        <p className="text-muted-foreground mt-1">Administra y procesa los pedidos de tus clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Por Confirmar</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.porConfirmar}</p>
            <p className="text-xs text-muted-foreground mt-1">Requieren acción</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Activos</p>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.activos}</p>
            <p className="text-xs text-muted-foreground mt-1">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">En Tránsito</p>
              <Truck className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.enTransito}</p>
            <p className="text-xs text-muted-foreground mt-1">En camino</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Completados</p>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{estadisticas.completados}</p>
            <p className="text-xs text-muted-foreground mt-1">Entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ventas del Mes</p>
              <ArrowUpDown className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">${(estadisticas.totalVentas / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground mt-1">Total facturado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de vistas */}
      <Tabs value={vistaActiva} onValueChange={(v: any) => setVistaActiva(v)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="por-confirmar">
            Por Confirmar
            {estadisticas.porConfirmar > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{estadisticas.porConfirmar}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="completados">Completados</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID o cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los estados</SelectItem>
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
            <div>
              <Select value={prioridadFiltro} onValueChange={setPrioridadFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      <div className="space-y-3">
        {pedidosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No se encontraron pedidos</p>
            </CardContent>
          </Card>
        ) : (
          pedidosFiltrados.map((pedido) => (
            <Card key={pedido.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header del pedido */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{pedido.id}</h3>
                        {getEstadoBadge(pedido.estado)}
                        {getPrioridadBadge(pedido.prioridad)}
                        {pedido.estadoPago === 'Pagado' && (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pagado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(pedido.fechaCreacion).toLocaleDateString('es-CO')}
                        </span>
                        <span>•</span>
                        <span>{pedido.cliente}</span>
                        {pedido.numeroGuia && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {pedido.numeroGuia}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${pedido.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{pedido.metodoPago}</p>
                  </div>
                </div>

                {/* Productos resumidos */}
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-muted-foreground mb-1">Productos:</p>
                  {pedido.productos.map((producto, index) => (
                    <p key={index} className="text-sm">
                      {producto.cantidad} {producto.unidad} - {producto.nombre}
                    </p>
                  ))}
                </div>

                {/* Acciones según estado */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {pedido.estado === 'Pendiente Confirmación' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => abrirModalAccion(pedido, 'confirmar')}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirmar Pedido
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirModalAccion(pedido, 'rechazar')}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </>
                    )}
                    {pedido.estado === 'Confirmado' && (
                      <Button
                        size="sm"
                        onClick={() => cambiarEstadoDirecto(pedido.id, 'Preparando')}
                        className="gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Iniciar Preparación
                      </Button>
                    )}
                    {pedido.estado === 'Preparando' && (
                      <Button
                        size="sm"
                        onClick={() => cambiarEstadoDirecto(pedido.id, 'Listo para Envío')}
                        className="gap-2"
                      >
                        <PackageCheck className="h-4 w-4" />
                        Marcar Listo
                      </Button>
                    )}
                    {pedido.estado === 'Listo para Envío' && (
                      <Button
                        size="sm"
                        onClick={() => abrirModalAccion(pedido, 'enviar')}
                        className="gap-2"
                      >
                        <Truck className="h-4 w-4" />
                        Despachar
                      </Button>
                    )}
                    {pedido.estado === 'En Tránsito' && (
                      <Button
                        size="sm"
                        onClick={() => cambiarEstadoDirecto(pedido.id, 'Entregado')}
                        className="gap-2 bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Confirmar Entrega
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/proveedor/pedidos/${pedido.id}`)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalles
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      onClick={() => {
                        const telefono = pedido.telefono.replace(/\s/g, '');
                        const mensaje = encodeURIComponent(
                          `Hola ${pedido.contacto}, te escribo sobre tu pedido ${pedido.id}.`
                        );
                        window.open(`https://wa.me/57${telefono}?text=${mensaje}`, '_blank');
                      }}
                      title="Enviar WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      onClick={() => generarDocumentoPDF(pedido)}
                      title="Generar factura PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resumen */}
      {pedidosFiltrados.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
        </div>
      )}

      {/* Modal de acciones */}
      <Dialog open={modalAccion} onOpenChange={setModalAccion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionTipo === 'confirmar' && 'Confirmar Pedido'}
              {accionTipo === 'enviar' && 'Despachar Pedido'}
              {accionTipo === 'rechazar' && 'Rechazar Pedido'}
            </DialogTitle>
            <DialogDescription>
              {pedidoSeleccionado?.id} - {pedidoSeleccionado?.cliente}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {accionTipo === 'confirmar' && (
              <p className="text-sm text-muted-foreground">
                ¿Confirmas que puedes procesar este pedido? El cliente será notificado de la confirmación.
              </p>
            )}

            {accionTipo === 'enviar' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="transportadora">Transportadora *</Label>
                  <Select value={transportadora} onValueChange={setTransportadora}>
                    <SelectTrigger id="transportadora">
                      <SelectValue placeholder="Seleccionar transportadora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Servientrega">Servientrega</SelectItem>
                      <SelectItem value="Coordinadora">Coordinadora</SelectItem>
                      <SelectItem value="Interrapidísimo">Interrapidísimo</SelectItem>
                      <SelectItem value="Envía">Envía</SelectItem>
                      <SelectItem value="Deprisa">Deprisa</SelectItem>
                      <SelectItem value="Transporte Propio">Transporte Propio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guia">Número de Guía *</Label>
                  <Input
                    id="guia"
                    placeholder="Ej: TRK123456789"
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(e.target.value)}
                  />
                </div>
              </>
            )}

            {accionTipo === 'rechazar' && (
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo del Rechazo *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Explica por qué no puedes procesar este pedido..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAccion(false)}>
              Cancelar
            </Button>
            <Button onClick={ejecutarAccion}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}