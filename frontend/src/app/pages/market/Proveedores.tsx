import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Star,
  Store,
  Search,
  MapPin,
  Package,
  TrendingUp,
  Award,
} from 'lucide-react';

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
}

// Mock data
const proveedoresData: Proveedor[] = [
  {
    id: 'prov1',
    nombre: 'AgroInsumos del Valle',
    descripcion: 'Especialistas en fertilizantes y agroquímicos de alta calidad',
    categoria: 'Fertilizantes y Agroquímicos',
    ubicacion: 'Valle del Cauca',
    rating: 4.7,
    totalReviews: 342,
    totalVentas: 1250,
    productosActivos: 45,
    certificaciones: ['ICA', 'ISO 9001'],
    tiempoEntrega: '3-5 días',
  },
  {
    id: 'prov2',
    nombre: 'QuímicosAgro',
    descripcion: 'Proveedor líder en soluciones químicas para agricultura',
    categoria: 'Agroquímicos',
    ubicacion: 'Antioquia',
    rating: 4.5,
    totalReviews: 218,
    totalVentas: 890,
    productosActivos: 32,
    certificaciones: ['ICA', 'BPA'],
    tiempoEntrega: '2-4 días',
  },
  {
    id: 'prov3',
    nombre: 'Herramientas del Campo',
    descripcion: 'Equipamiento y herramientas para trabajo agrícola',
    categoria: 'Herramientas',
    ubicacion: 'Cundinamarca',
    rating: 4.8,
    totalReviews: 456,
    totalVentas: 2100,
    productosActivos: 78,
    certificaciones: ['ISO 9001'],
    tiempoEntrega: '1-3 días',
  },
  {
    id: 'prov4',
    nombre: 'BioAgro',
    descripcion: 'Productos orgánicos y soluciones biológicas sostenibles',
    categoria: 'Productos Orgánicos',
    ubicacion: 'Quindío',
    rating: 4.9,
    totalReviews: 189,
    totalVentas: 550,
    productosActivos: 28,
    certificaciones: ['Orgánico', 'Fair Trade', 'BPA'],
    tiempoEntrega: '4-6 días',
  },
  {
    id: 'prov5',
    nombre: 'Nutrientes Premium',
    descripcion: 'Fertilizantes especializados y nutrición vegetal',
    categoria: 'Fertilizantes',
    ubicacion: 'Risaralda',
    rating: 4.6,
    totalReviews: 294,
    totalVentas: 780,
    productosActivos: 38,
    certificaciones: ['ICA', 'ISO 9001'],
    tiempoEntrega: '3-5 días',
  },
  {
    id: 'prov6',
    nombre: 'SemillasTop',
    descripcion: 'Semillas certificadas y material vegetal de calidad',
    categoria: 'Semillas',
    ubicacion: 'Caldas',
    rating: 4.4,
    totalReviews: 167,
    totalVentas: 420,
    productosActivos: 22,
    certificaciones: ['ICA'],
    tiempoEntrega: '5-7 días',
  },
];

export default function Proveedores() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState('relevancia');

  // Obtener categorías únicas
  const categorias = ['todos', ...new Set(proveedoresData.map((p) => p.categoria))];

  // Filtrar proveedores
  let proveedoresFiltrados = proveedoresData.filter((proveedor) => {
    const coincideBusqueda =
      proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.ubicacion.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoriaFiltro === 'todos' || proveedor.categoria === categoriaFiltro;

    return coincideBusqueda && coincideCategoria;
  });

  // Ordenar
  if (ordenamiento === 'rating') {
    proveedoresFiltrados.sort((a, b) => b.rating - a.rating);
  } else if (ordenamiento === 'ventas') {
    proveedoresFiltrados.sort((a, b) => b.totalVentas - a.totalVentas);
  } else if (ordenamiento === 'productos') {
    proveedoresFiltrados.sort((a, b) => b.productosActivos - a.productosActivos);
  }

  // KPIs
  const proveedoresTotales = proveedoresData.length;
  const ratingPromedio =
    proveedoresData.reduce((sum, p) => sum + p.rating, 0) / proveedoresData.length;
  const productosTotales = proveedoresData.reduce((sum, p) => sum + p.productosActivos, 0);

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
        <h1 className="text-4xl font-bold text-foreground">Proveedores</h1>
        <p className="text-muted-foreground mt-2">
          Conoce a nuestros proveedores certificados y de confianza
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Proveedores Activos
                </p>
                <p className="text-3xl font-bold text-foreground">{proveedoresTotales}</p>
                <p className="text-xs text-muted-foreground mt-1">Certificados</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Rating Promedio
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">
                    {ratingPromedio.toFixed(1)}
                  </p>
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">De 5.0 estrellas</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Award className="h-7 w-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Productos Disponibles
                </p>
                <p className="text-3xl font-bold text-foreground">{productosTotales}</p>
                <p className="text-xs text-muted-foreground mt-1">En el catálogo</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <Package className="h-7 w-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="lg:w-64">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'todos' ? 'Todas las categorías' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordenamiento} onValueChange={setOrdenamiento}>
              <SelectTrigger className="lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancia">Relevancia</SelectItem>
                <SelectItem value="rating">Mayor rating</SelectItem>
                <SelectItem value="ventas">Más ventas</SelectItem>
                <SelectItem value="productos">Más productos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de proveedores */}
      {proveedoresFiltrados.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No se encontraron proveedores</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Intenta ajustar tus filtros de búsqueda
            </p>
            <Button
              onClick={() => {
                setBusqueda('');
                setCategoriaFiltro('todos');
              }}
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {proveedoresFiltrados.map((proveedor) => (
            <Card
              key={proveedor.id}
              className="border-border hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/market/proveedor/${proveedor.id}`)}
            >
              <CardContent className="p-6 space-y-4">
                {/* Header del proveedor */}
                <div className="flex items-start justify-between">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Store className="h-7 w-7 text-primary" />
                  </div>
                  <Badge variant="outline">{proveedor.categoria}</Badge>
                </div>

                {/* Nombre y rating */}
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">
                    {proveedor.nombre}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(proveedor.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">
                      {proveedor.rating} ({proveedor.totalReviews})
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {proveedor.descripcion}
                  </p>
                </div>

                {/* Info adicional */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {proveedor.ubicacion}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {proveedor.productosActivos} productos
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {proveedor.totalVentas} ventas
                    </span>
                  </div>
                </div>

                {/* Certificaciones */}
                {proveedor.certificaciones.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {proveedor.certificaciones.map((cert) => (
                      <Badge key={cert} className="bg-success/10 text-success border-success/20 text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Botón */}
                <Button variant="outline" className="w-full" size="sm">
                  Ver perfil
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}