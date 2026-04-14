import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface ItemCarrito {
  id: string;
  productoId: string;
  nombre: string;
  precio: number;
  unidad: string;
  cantidad: number;
  proveedor: string;
  stock: number;
}

// Mock data
const itemsCarritoData: ItemCarrito[] = [
  {
    id: 'c1',
    productoId: 'p1',
    nombre: 'Fertilizante NPK 15-15-15',
    precio: 95000,
    unidad: 'bulto 50kg',
    cantidad: 10,
    proveedor: 'AgroInsumos del Valle',
    stock: 250,
  },
  {
    id: 'c2',
    productoId: 'p2',
    nombre: 'Glifosato 48% SL',
    precio: 42000,
    unidad: 'litro',
    cantidad: 5,
    proveedor: 'QuímicosAgro',
    stock: 180,
  },
];

export default function Carrito() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemCarrito[]>(itemsCarritoData);

  const actualizarCantidad = (id: string, nuevaCantidad: number) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, cantidad: Math.max(1, Math.min(item.stock, nuevaCantidad)) }
          : item
      )
    );
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envio = 25000;
  const total = subtotal + envio;

  if (items.length === 0) {
    return (
      <div className="space-y-8">
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
          <h1 className="text-4xl font-bold text-foreground">Carrito de Compras</h1>
        </div>

        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Tu carrito está vacío</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Agrega productos para continuar con tu compra
            </p>
            <Button onClick={() => navigate('/market')}>
              <Package className="mr-2 h-4 w-4" />
              Ver catálogo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          Continuar comprando
        </Button>
        <h1 className="text-4xl font-bold text-foreground">Carrito de Compras</h1>
        <p className="text-muted-foreground mt-2">
          {items.length} {items.length === 1 ? 'producto' : 'productos'} en tu carrito
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-border">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-10 w-10 text-primary/30" />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h3
                        className="font-semibold text-foreground cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/market/producto/${item.productoId}`)}
                      >
                        {item.nombre}
                      </h3>
                      <p className="text-sm text-muted-foreground">{item.proveedor}</p>
                      <p className="text-sm text-muted-foreground">
                        Precio unitario: ${item.precio.toLocaleString()} / {item.unidad}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) =>
                            actualizarCantidad(item.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 text-center"
                          min="1"
                          max={item.stock}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">Subtotal:</p>
                      <p className="text-xl font-bold text-success">
                        ${(item.precio * item.cantidad).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumen de compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Resumen de Compra</h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})
                    </span>
                    <span className="font-semibold">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío estimado</span>
                    <span className="font-semibold">${envio.toLocaleString()}</span>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-success">
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/market/checkout')}
                  className="w-full gap-2"
                  size="lg"
                >
                  Proceder al pago
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Truck className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Envío gratis</p>
                  <p className="text-xs text-muted-foreground">
                    En compras superiores a $500.000
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}