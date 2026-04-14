import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ShoppingCart,
  Search,
  Filter,
  Star,
  Package,
  TrendingUp,
  Grid3x3,
  List,
  Plus,
  ShoppingBag,
  Sprout,
  Droplet,
  Wrench,
  Cog,
  Apple,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Tipos
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  unidad: string;
  categoria: string;
  proveedor: string;
  stock: number;
  rating: number;
  imagen: string;
  precioVolumen?: { cantidad: number; precio: number }[];
}

// Mock data
const productosData: Producto[] = [
  {
    id: 'p1',
    nombre: 'Fertilizante NPK 15-15-15',
    descripcion: 'Fertilizante completo para palma de aceite',
    precio: 95000,
    unidad: 'bulto 50kg',
    categoria: 'Fertilizantes',
    proveedor: 'AgroInsumos del Valle',
    stock: 250,
    rating: 4.5,
    imagen: '/placeholder-fertilizante.jpg',
    precioVolumen: [
      { cantidad: 10, precio: 92000 },
      { cantidad: 50, precio: 89000 },
    ],
  },
  {
    id: 'p2',
    nombre: 'Glifosato 48% SL',
    descripcion: 'Herbicida sistémico no selectivo',
    precio: 42000,
    unidad: 'litro',
    categoria: 'Agroquímicos',
    proveedor: 'QuímicosAgro',
    stock: 180,
    rating: 4.2,
    imagen: '/placeholder-agroquimico.jpg',
  },
  {
    id: 'p3',
    nombre: 'Machete Palero 24"',
    descripcion: 'Machete profesional para cosecha',
    precio: 35000,
    unidad: 'unidad',
    categoria: 'Herramientas',
    proveedor: 'Herramientas El Campesino',
    stock: 50,
    rating: 4.8,
    imagen: '/placeholder-herramienta.jpg',
  },
  {
    id: 'p4',
    nombre: 'Urea 46%',
    descripcion: 'Fertilizante nitrogenado',
    precio: 88000,
    unidad: 'bulto 50kg',
    categoria: 'Fertilizantes',
    proveedor: 'AgroInsumos del Valle',
    stock: 320,
    rating: 4.6,
    imagen: '/placeholder-fertilizante.jpg',
  },
  {
    id: 'p5',
    nombre: 'Guantes Nitrilo Caja x100',
    descripcion: 'Guantes de protección para aplicación de químicos',
    precio: 45000,
    unidad: 'caja',
    categoria: 'Equipos',
    proveedor: 'SafetyPro',
    stock: 75,
    rating: 4.4,
    imagen: '/placeholder-seguridad.jpg',
  },
  {
    id: 'p6',
    nombre: 'Bomba Fumigadora 20L',
    descripcion: 'Bomba de espalda para aplicación de agroquímicos',
    precio: 185000,
    unidad: 'unidad',
    categoria: 'Maquinaria',
    proveedor: 'TecnoAgro',
    stock: 15,
    rating: 4.7,
    imagen: '/placeholder-maquinaria.jpg',
  },
];

const categorias = [
  { nombre: 'Todas', icono: Package },
  { nombre: 'Fertilizantes', icono: Sprout },
  { nombre: 'Agroquímicos', icono: Droplet },
  { nombre: 'Herramientas', icono: Wrench },
  { nombre: 'Maquinaria', icono: Cog },
  { nombre: 'Insumos', icono: Apple },
  { nombre: 'Equipos', icono: ShieldCheck },
];

export default function Market() {
  const navigate = useNavigate();

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [ordenPrecio, setOrdenPrecio] = useState<'asc' | 'desc' | 'none'>('none');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [carrito, setCarrito] = useState<{ [key: string]: number }>({});
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);

  // Configuración del carrusel
  const categoriasVisibles = 5; // Mostrar 5 categorías a la vez
  const categoriasMostradas = categorias.slice(indiceCarrusel, indiceCarrusel + categoriasVisibles);
  const puedeIrAtras = indiceCarrusel > 0;
  const puedeIrAdelante = indiceCarrusel + categoriasVisibles < categorias.length;

  // Filtrar productos
  const productosFiltrados = productosData.filter((producto) => {
    const cumpleBusqueda =
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria =
      categoriaSeleccionada === 'Todas' || producto.categoria === categoriaSeleccionada;

    return cumpleBusqueda && cumpleCategoria;
  });

  // Ordenar productos
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    if (ordenPrecio === 'asc') return a.precio - b.precio;
    if (ordenPrecio === 'desc') return b.precio - a.precio;
    if (ordenPrecio === 'none') return 0;
    return 0;
  });

  // Agregar al carrito
  const agregarAlCarrito = (productoId: string) => {
    setCarrito((prev) => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + 1,
    }));
  };

  // Calcular total de items en carrito
  const totalItemsCarrito = Object.values(carrito).reduce((sum, cantidad) => sum + cantidad, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Market</h1>
          <p className="text-muted-foreground mt-2">
            Compra insumos y equipos para tu plantación
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/market/carrito')}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 relative"
          >
            <ShoppingCart className="h-5 w-5" />
            Carrito
            {totalItemsCarrito > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-white text-xs font-bold border-2 border-background">
                {totalItemsCarrito}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Resumen</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Productos Disponibles
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{productosData.length}</p>
                  <span className="text-sm text-muted-foreground">items</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                  <Package className="h-4 w-4" />
                  <span>Catálogo activo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">En Carrito</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{totalItemsCarrito}</p>
                  <span className="text-sm text-muted-foreground">productos</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Pendiente pago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Pedidos Activos
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">3</p>
                  <span className="text-sm text-muted-foreground">en proceso</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                  <TrendingUp className="h-4 w-4" />
                  <span>En camino</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Categorías */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Categorías</h2>
        <div className="relative">
          {/* Flecha izquierda */}
          {puedeIrAtras && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background"
              onClick={() => setIndiceCarrusel(Math.max(0, indiceCarrusel - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Contenedor del carrusel */}
          <div className="px-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {categoriasMostradas.map((cat) => {
                const Icon = cat.icono;
                const isSelected = categoriaSeleccionada === cat.nombre;
                return (
                  <Card
                    key={cat.nombre}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                    onClick={() => setCategoriaSeleccionada(cat.nombre)}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary/20' : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-7 w-7 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                      </div>
                      <p
                        className={`text-sm font-medium text-center leading-tight ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {cat.nombre}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Flecha derecha */}
          {puedeIrAdelante && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background"
              onClick={() => setIndiceCarrusel(indiceCarrusel + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Búsqueda */}
              <div className="space-y-2 lg:col-span-2">
                <Label>Buscar producto</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Orden precio */}
              <div className="space-y-2">
                <Label>Ordenar por precio</Label>
                <Select value={ordenPrecio} onValueChange={(val: any) => setOrdenPrecio(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin ordenar</SelectItem>
                    <SelectItem value="asc">Menor a mayor</SelectItem>
                    <SelectItem value="desc">Mayor a menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Controles de vista */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{productosOrdenados.length}</span> productos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={vistaGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVistaGrid(true)}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={!vistaGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVistaGrid(false)}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catálogo de productos */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Catálogo</h2>

        {productosOrdenados.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay productos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                No se encontraron productos con los filtros seleccionados
              </p>
            </CardContent>
          </Card>
        ) : vistaGrid ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosOrdenados.map((producto) => (
              <Card
                key={producto.id}
                className="glass-subtle border-border hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/market/producto/${producto.id}`)}
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Package className="h-16 w-16 text-primary/30" />
                  </div>
                  {producto.stock < 50 && (
                    <Badge className="absolute top-2 right-2 bg-amber-500">Stock bajo</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {producto.nombre}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {producto.descripcion}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
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

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{producto.proveedor}</p>
                        <p className="text-lg font-bold text-success">
                          ${producto.precio.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          agregarAlCarrito(producto.id);
                        }}
                        className="w-full gap-2"
                        size="sm"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {productosOrdenados.map((producto) => (
              <Card
                key={producto.id}
                className="glass-subtle border-border hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/market/producto/${producto.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-12 w-12 text-primary/30" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
                            {producto.nombre}
                          </h3>
                          <p className="text-sm text-muted-foreground">{producto.descripcion}</p>
                        </div>
                        {producto.stock < 50 && (
                          <Badge className="bg-amber-500">Stock bajo</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
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

                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline">{producto.categoria}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">{producto.proveedor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-success">
                            ${producto.precio.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">por {producto.unidad}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/market/producto/${producto.id}`);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Ver detalles
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarAlCarrito(producto.id);
                          }}
                          size="sm"
                          className="gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Agregar al carrito
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}