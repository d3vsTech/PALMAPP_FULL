import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertCircle,
  CheckCircle,
  Filter,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  unidad: string;
  categoria: string;
  stock: number;
  estado: 'Activo' | 'Sin Stock' | 'Pausado';
  imagen: string;
  ventas: number;
}

const productosDataInicial: Producto[] = [
  {
    id: 'p1',
    nombre: 'Fertilizante NPK 15-15-15',
    descripcion: 'Fertilizante completo para palma de aceite',
    precio: 95000,
    unidad: 'bulto 50kg',
    categoria: 'Fertilizantes',
    stock: 250,
    estado: 'Activo',
    imagen: '/placeholder.jpg',
    ventas: 156,
  },
  {
    id: 'p2',
    nombre: 'Glifosato 48% SL',
    descripcion: 'Herbicida sistémico no selectivo',
    precio: 42000,
    unidad: 'litro',
    categoria: 'Agroquímicos',
    stock: 180,
    estado: 'Activo',
    imagen: '/placeholder.jpg',
    ventas: 98,
  },
  {
    id: 'p3',
    nombre: 'Machete Palero 24"',
    descripcion: 'Machete profesional para cosecha',
    precio: 35000,
    unidad: 'unidad',
    categoria: 'Herramientas',
    stock: 0,
    estado: 'Sin Stock',
    imagen: '/placeholder.jpg',
    ventas: 87,
  },
  {
    id: 'p4',
    nombre: 'Bomba Fumigadora 20L',
    descripcion: 'Bomba de espalda para aplicación de agroquímicos',
    precio: 185000,
    unidad: 'unidad',
    categoria: 'Herramientas',
    stock: 45,
    estado: 'Activo',
    imagen: '/placeholder.jpg',
    ventas: 34,
  },
];

const categorias = ['Todas', 'Fertilizantes', 'Agroquímicos', 'Herramientas', 'Semillas'];

export default function ProveedorProductos() {
  const [productos, setProductos] = useState<Producto[]>(productosDataInicial);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [productoToDelete, setProductoToDelete] = useState<{ id: string; nombre: string } | null>(null);

  const productosFiltrados = productos.filter((producto) => {
    const cumpleBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          producto.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria = categoriaFiltro === 'Todas' || producto.categoria === categoriaFiltro;
    const cumpleEstado = estadoFiltro === 'Todos' || producto.estado === estadoFiltro;

    return cumpleBusqueda && cumpleCategoria && cumpleEstado;
  });

  const handleEliminar = (id: string, nombre: string) => {
    setProductoToDelete({ id, nombre });
  };

  const confirmarEliminar = () => {
    if (!productoToDelete) return;
    setProductos(productos.filter(p => p.id !== productoToDelete.id));
    toast.success('Producto eliminado exitosamente');
    setProductoToDelete(null);
  };

  const getEstadoBadge = (estado: string, stock: number) => {
    if (estado === 'Sin Stock' || stock === 0) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sin Stock
        </Badge>
      );
    }
    if (estado === 'Pausado') {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
          Pausado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Productos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/proveedor/productos/carga-masiva">
              <Upload className="h-4 w-4" />
              Carga Masiva
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/proveedor/productos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Sin Stock">Sin Stock</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos */}
      <div className="grid gap-4">
        {productosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </CardContent>
          </Card>
        ) : (
          productosFiltrados.map((producto) => (
            <Card key={producto.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{producto.nombre}</h3>
                          {getEstadoBadge(producto.estado, producto.stock)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{producto.descripcion}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {producto.categoria}
                          </span>
                          <span className={producto.stock === 0 ? 'text-destructive' : ''}>
                            Stock: {producto.stock}
                          </span>
                          <span>
                            Ventas: {producto.ventas}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold">
                          ${producto.precio.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/proveedor/productos/${producto.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/proveedor/productos/editar/${producto.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleEliminar(producto.id, producto.nombre)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resumen */}
      {productosFiltrados.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Mostrando {productosFiltrados.length} de {productos.length} productos
        </div>
      )}

      {/* AlertDialog: confirmar eliminar producto */}
      <AlertDialog open={!!productoToDelete} onOpenChange={open => !open && setProductoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente <strong>{productoToDelete?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}