import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Edit, Package, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Mock data (en producción vendría de una API)
const productosData = [
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

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const producto = productosData.find(p => p.id === id);

  const handleEliminar = () => {
    if (producto && window.confirm(`¿Estás seguro de que deseas eliminar "${producto.nombre}"?`)) {
      toast.success('Producto eliminado exitosamente');
      navigate('/proveedor/productos');
    }
  };

  if (!producto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Producto no encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">El producto solicitado no existe</p>
            <Button onClick={() => navigate('/proveedor/productos')} className="mt-4">
              Volver a productos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{producto.nombre}</h1>
            <p className="text-muted-foreground mt-1">Detalles del producto</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/proveedor/productos/editar/${producto.id}`)} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleEliminar}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nombre del producto</p>
                  <p className="font-medium">{producto.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <div>{getEstadoBadge(producto.estado, producto.stock)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                <p className="font-medium">{producto.descripcion}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Categoría</p>
                  <Badge variant="outline">{producto.categoria}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unidad de medida</p>
                  <p className="font-medium">{producto.unidad}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precio e inventario */}
          <Card>
            <CardHeader>
              <CardTitle>Precio e Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Precio unitario</p>
                  <p className="text-2xl font-bold">${producto.precio.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Stock disponible</p>
                  <p className={`text-2xl font-bold ${producto.stock === 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {producto.stock}
                  </p>
                  <p className="text-xs text-muted-foreground">{producto.unidad}s disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precios por volumen */}
          {producto.precioVolumen && producto.precioVolumen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Precios por Volumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {producto.precioVolumen.map((pv, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">A partir de {pv.cantidad} unidades</p>
                        <p className="text-xs text-muted-foreground">Descuento aplicado</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${pv.precio.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">por {producto.unidad}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Imagen del producto */}
          <Card>
            <CardHeader>
              <CardTitle>Imagen del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ventas totales</p>
                <p className="text-2xl font-bold">{producto.ventas}</p>
                <p className="text-xs text-muted-foreground">unidades vendidas</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ingresos generados</p>
                <p className="text-2xl font-bold">
                  ${((producto.ventas * producto.precio) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">en ventas totales</p>
              </div>
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Nota:</span> Este producto está publicado en el
                marketplace y es visible para todos los clientes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}