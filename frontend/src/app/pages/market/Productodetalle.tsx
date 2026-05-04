import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { formatFecha } from '../../utils/fecha';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft,
  Star,
  Store,
  MapPin,
  Package,
  TrendingUp,
  Award,
  ShoppingCart,
  Clock,
  Shield,
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  unidad: string;
  stock: number;
  rating: number;
  categoria: string;
}

interface Review {
  id: string;
  usuario: string;
  rating: number;
  fecha: string;
  comentario: string;
  producto: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  rating: number;
  totalReviews: number;
  totalVentas: number;
  productosActivos: number;
  certificaciones: string[];
  tiempoEntrega: string;
  descripcionDetallada: string;
  añoFundacion: number;
  productos: Producto[];
  reviews: Review[];
}

// Mock data - en producción vendría de una API
const proveedorData: Proveedor = {
  id: 'prov1',
  nombre: 'AgroInsumos del Valle',
  descripcion: 'Especialistas en fertilizantes y agroquímicos de alta calidad',
  categoria: 'Fertilizantes y Agroquímicos',
  ubicacion: 'Valle del Cauca, Colombia',
  rating: 4.7,
  totalReviews: 342,
  totalVentas: 1250,
  productosActivos: 45,
  certificaciones: ['ICA', 'ISO 9001', 'BPA'],
  tiempoEntrega: '3-5 días hábiles',
  descripcionDetallada:
    'Somos una empresa con más de 15 años de experiencia en el sector agrícola, especializada en la distribución de insumos de la más alta calidad. Nuestro compromiso es apoyar a los agricultores con productos certificados y precios competitivos. Contamos con un equipo técnico capacitado para brindar asesoría personalizada.',
  añoFundacion: 2009,
  productos: [
    {
      id: 'p1',
      nombre: 'Fertilizante NPK 15-15-15',
      precio: 95000,
      unidad: 'bulto 50kg',
      stock: 250,
      rating: 4.5,
      categoria: 'Fertilizantes',
    },
    {
      id: 'p7',
      nombre: 'Fertilizante Urea 46%',
      precio: 88000,
      unidad: 'bulto 50kg',
      stock: 180,
      rating: 4.6,
      categoria: 'Fertilizantes',
    },
    {
      id: 'p8',
      nombre: 'DAP 18-46-0',
      precio: 105000,
      unidad: 'bulto 50kg',
      stock: 120,
      rating: 4.8,
      categoria: 'Fertilizantes',
    },
    {
      id: 'p9',
      nombre: 'KCl Cloruro de Potasio',
      precio: 92000,
      unidad: 'bulto 50kg',
      stock: 200,
      rating: 4.4,
      categoria: 'Fertilizantes',
    },
  ],
  reviews: [
    {
      id: 'r1',
      usuario: 'Carlos Martínez',
      rating: 5,
      fecha: '2026-04-05',
      comentario:
        'Excelente calidad de productos y muy buen servicio al cliente. La entrega fue rápida y todo llegó en perfectas condiciones.',
      producto: 'Fertilizante NPK 15-15-15',
    },
    {
      id: 'r2',
      usuario: 'Ana López',
      rating: 4,
      fecha: '2026-03-28',
      comentario:
        'Buenos precios y productos de calidad. El tiempo de entrega fue el esperado.',
      producto: 'Fertilizante Urea 46%',
    },
    {
      id: 'r3',
      usuario: 'Jorge Ramírez',
      rating: 5,
      fecha: '2026-03-15',
      comentario:
        'Muy satisfecho con la compra. El proveedor es confiable y los productos cumplen con lo prometido.',
      producto: 'DAP 18-46-0',
    },
    {
      id: 'r4',
      usuario: 'María Torres',
      rating: 4,
      fecha: '2026-03-10',
      comentario: 'Buena experiencia de compra. Recomendado.',
      producto: 'KCl Cloruro de Potasio',
    },
  ],
};

export default function ProveedorDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabActual, setTabActual] = useState('productos');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/market/proveedores')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a proveedores
        </Button>
      </div>

      {/* Información del proveedor */}
      <Card className="border-border">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Logo y certificaciones */}
            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="h-32 w-32 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Store className="h-16 w-16 text-primary" />
              </div>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {proveedorData.certificaciones.map((cert) => (
                  <Badge
                    key={cert}
                    className="bg-success/10 text-success border-success/20"
                  >
                    <Award className="h-3 w-3 mr-1" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Información principal */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {proveedorData.nombre}
                </h1>
                <p className="text-lg text-muted-foreground">{proveedorData.descripcion}</p>
              </div>

              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(proveedorData.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted'
                    }`}
                  />
                ))}
                <span className="text-lg font-semibold ml-2">{proveedorData.rating}</span>
                <span className="text-muted-foreground ml-1">
                  ({proveedorData.totalReviews} reseñas)
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="text-sm font-medium">{proveedorData.ubicacion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Package className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Productos</p>
                    <p className="text-sm font-medium">{proveedorData.productosActivos}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                    <p className="text-sm font-medium">{proveedorData.totalVentas}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="text-sm font-medium">{proveedorData.tiempoEntrega}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tabActual} onValueChange={setTabActual}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="productos">
            Productos ({proveedorData.productos.length})
          </TabsTrigger>
          <TabsTrigger value="acerca">Acerca de</TabsTrigger>
          <TabsTrigger value="reviews">
            Reseñas ({proveedorData.reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Productos */}
        <TabsContent value="productos" className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proveedorData.productos.map((producto) => (
              <Card
                key={producto.id}
                className="border-border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/market/producto/${producto.id}`)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                    <Package className="h-16 w-16 text-primary/30" />
                  </div>

                  <div>
                    <Badge variant="outline" className="mb-2">
                      {producto.categoria}
                    </Badge>
                    <h3 className="font-semibold text-foreground mb-1">{producto.nombre}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(producto.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({producto.rating})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-success">
                        ${producto.precio.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
                    </div>
                    <Badge className="bg-muted text-foreground">
                      Stock: {producto.stock}
                    </Badge>
                  </div>

                  <Button className="w-full gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Ver producto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Acerca de */}
        <TabsContent value="acerca" className="mt-6">
          <Card className="border-border">
            <CardContent className="p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Sobre {proveedorData.nombre}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {proveedorData.descripcionDetallada}
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Información General</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Año de fundación:</span>
                      <span className="text-sm font-medium">{proveedorData.añoFundacion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categoría:</span>
                      <span className="text-sm font-medium">{proveedorData.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Productos activos:</span>
                      <span className="text-sm font-medium">
                        {proveedorData.productosActivos}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Certificaciones</h3>
                  <div className="flex flex-wrap gap-2">
                    {proveedorData.certificaciones.map((cert) => (
                      <Badge
                        key={cert}
                        className="bg-success/10 text-success border-success/20"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Tiempo de entrega estimado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {proveedorData.tiempoEntrega} a partir de la confirmación del pedido
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Reviews */}
        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-4">
            {proveedorData.reviews.map((review) => (
              <Card key={review.id} className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{review.usuario}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFecha(review.fecha, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-2">{review.comentario}</p>
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {review.producto}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}