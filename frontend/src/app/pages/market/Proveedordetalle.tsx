import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Star, MapPin, Package, ShoppingBag, Truck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import { ProductoCard, Calificacion } from '../../components/market/piezas';
import { num } from '../../lib/formato';
import { cn } from '../../components/lib/utils';
import { fechaLocal } from '../../lib/fechas';

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

function Estrellas({ valor }: { valor: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${valor} de 5`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn('h-3.5 w-3.5', i < valor ? 'fill-warning text-warning' : 'text-muted-foreground/40')}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

export default function ProveedorDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabActual, setTabActual] = useState('productos');
  const p = proveedorData;

  return (
    <div className="space-y-6" data-proveedor={id}>
      <PageHeader
        backTo="/market/proveedores"
        eyebrow={<Link to="/market/proveedores" className="hover:text-foreground">Proveedores</Link>}
        title={p.nombre}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{p.descripcion}</span>
            <Calificacion valor={p.rating} detalle={`· ${num(p.totalReviews)} reseñas`} />
          </span>
        }
      />

      <StatStrip
        items={[
          { label: 'Ubicación', value: <span className="text-lg">{p.ubicacion}</span>, icon: MapPin, tone: 'blue' },
          { label: 'Productos activos', value: num(p.productosActivos), icon: Package, tone: 'lime' },
          { label: 'Ventas', value: num(p.totalVentas), note: 'completadas', icon: ShoppingBag, tone: 'green' },
          { label: 'Entrega', value: <span className="text-lg">{p.tiempoEntrega}</span>, note: 'desde la confirmación', icon: Truck, tone: 'blue' },
        ]}
      />

      <Tabs value={tabActual} onValueChange={setTabActual} className="gap-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="productos">Productos ({p.productos.length})</TabsTrigger>
          <TabsTrigger value="acerca">Acerca de</TabsTrigger>
          <TabsTrigger value="reviews">Reseñas ({p.reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {p.productos.map(producto => (
              <ProductoCard
                key={producto.id}
                onAbrir={() => navigate(`/market/productos/${producto.id}`)}
                nombre={producto.nombre}
                categoria={producto.categoria}
                precio={producto.precio}
                unidad={producto.unidad}
                rating={producto.rating}
                subtitulo={`${num(producto.stock)} disponibles`}
                accion={
                  <Button variant="outline" size="sm" onClick={() => navigate(`/market/productos/${producto.id}`)}>
                    Ver
                  </Button>
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="acerca">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="gap-4 lg:col-span-2">
              <CardHeader>
                <CardTitle>Sobre {p.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.descripcionDetallada}</p>
              </CardContent>
            </Card>
            <Card className="gap-0">
              <CardHeader className="border-b border-border">
                <CardTitle>Información general</CardTitle>
              </CardHeader>
              <dl className="divide-y divide-border text-sm">
                <div className="flex justify-between gap-4 px-6 py-3">
                  <dt className="text-muted-foreground">Año de fundación</dt>
                  <dd className="font-medium">{p.añoFundacion}</dd>
                </div>
                <div className="flex justify-between gap-4 px-6 py-3">
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd className="text-right font-medium">{p.categoria}</dd>
                </div>
                <div className="flex justify-between gap-4 px-6 py-3">
                  <dt className="text-muted-foreground">Productos activos</dt>
                  <dd className="font-medium">{num(p.productosActivos)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-6 py-3">
                  <dt className="text-muted-foreground">Tiempo de entrega</dt>
                  <dd className="text-right font-medium">{p.tiempoEntrega}</dd>
                </div>
                <div className="space-y-2 px-6 py-3">
                  <dt className="text-muted-foreground">Certificaciones</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {p.certificaciones.map(cert => (
                      <Badge key={cert} variant="secondary">{cert}</Badge>
                    ))}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <Card className="gap-0 overflow-hidden">
            <ul className="divide-y divide-border">
              {p.reviews.map(review => (
                <li key={review.id} className="space-y-2 px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{review.usuario}</p>
                      <p className="text-xs text-muted-foreground">
                        {fechaLocal(review.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {review.producto}
                      </p>
                    </div>
                    <Estrellas valor={review.rating} />
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comentario}</p>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
