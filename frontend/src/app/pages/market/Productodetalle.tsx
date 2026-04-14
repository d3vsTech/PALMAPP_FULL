import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  Package,
  Truck,
  Shield,
  CheckCircle,
  Plus,
  Minus,
  Store,
} from 'lucide-react';

// Mock data - en producción vendría de una API
const productoData = {
  id: 'p1',
  nombre: 'Fertilizante NPK 15-15-15',
  descripcion: 'Fertilizante completo para palma de aceite',
  descripcionDetallada:
    'Fertilizante granulado de liberación controlada especialmente formulado para palma de aceite. Contiene nutrientes balanceados que promueven el crecimiento vegetativo y la producción de frutos. Ideal para aplicación en suelos tropicales.',
  precio: 95000,
  unidad: 'bulto 50kg',
  categoria: 'Fertilizantes',
  proveedor: {
    id: 'prov1',
    nombre: 'AgroInsumos del Valle',
    rating: 4.7,
    ventas: 1250,
  },
  stock: 250,
  rating: 4.5,
  totalReviews: 128,
  imagen: '/placeholder-fertilizante.jpg',
  especificaciones: {
    'Composición': 'Nitrógeno 15%, Fósforo 15%, Potasio 15%',
    'Presentación': 'Bulto de 50 kg',
    'Forma física': 'Granulado',
    'Registro ICA': 'ICA-2024-12345',
    'Vida útil': '24 meses',
    'Almacenamiento': 'Lugar fresco y seco',
  },
  preciosVolumen: [
    { cantidad: 1, precio: 95000, descuento: 0 },
    { cantidad: 10, precio: 92000, descuento: 3 },
    { cantidad: 50, precio: 89000, descuento: 6 },
    { cantidad: 100, precio: 85000, descuento: 11 },
  ],
  envio: {
    disponible: true,
    tiempoEstimado: '3-5 días hábiles',
    costo: 15000,
    gratisPor: 500000,
  },
};

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cantidad, setCantidad] = useState(1);
  const [imagenActual, setImagenActual] = useState(0);

  // Calcular precio según cantidad
  const calcularPrecio = () => {
    const nivel = [...productoData.preciosVolumen]
      .reverse()
      .find((p) => cantidad >= p.cantidad);
    return nivel || productoData.preciosVolumen[0];
  };

  const precioNivel = calcularPrecio();
  const subtotal = precioNivel.precio * cantidad;
  const costoEnvio = subtotal >= productoData.envio.gratisPor ? 0 : productoData.envio.costo;
  const total = subtotal + costoEnvio;

  const agregarAlCarrito = () => {
    // Lógica para agregar al carrito
    navigate('/market/carrito');
  };

  const comprarAhora = () => {
    // Lógica para comprar directo
    navigate('/market/checkout');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/market')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">{productoData.nombre}</h1>
              {productoData.stock < 50 && (
                <Badge className="bg-amber-500">Stock limitado</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{productoData.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna izquierda: Imágenes y detalles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galería de imágenes */}
          <Card className="border-border overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Package className="h-32 w-32 text-primary/30" />
            </div>
          </Card>

          {/* Información del producto */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Descripción</h2>
                <p className="text-muted-foreground">{productoData.descripcionDetallada}</p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Especificaciones Técnicas
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(productoData.especificaciones).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">{key}:</span>
                      <span className="text-sm font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Precios por Volumen
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {productoData.preciosVolumen.map((nivel) => (
                    <Card
                      key={nivel.cantidad}
                      className={`border-2 ${
                        cantidad >= nivel.cantidad
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {nivel.cantidad}+ unidades
                            </p>
                            <p className="text-xl font-bold text-success">
                              ${nivel.precio.toLocaleString()}
                            </p>
                          </div>
                          {nivel.descuento > 0 && (
                            <Badge className="bg-success">{nivel.descuento}% OFF</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del proveedor */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {productoData.proveedor.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(productoData.proveedor.rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({productoData.proveedor.rating})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {productoData.proveedor.ventas.toLocaleString()} ventas completadas
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/market/proveedor/${productoData.proveedor.id}`)}
                >
                  Ver perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Beneficios */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Envío disponible</p>
                  <p className="text-xs text-muted-foreground">{productoData.envio.tiempoEstimado}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Compra segura</p>
                  <p className="text-xs text-muted-foreground">Garantía de calidad</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Stock disponible</p>
                  <p className="text-xs text-muted-foreground">{productoData.stock} unidades</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Columna derecha: Compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(productoData.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground">
                      ({productoData.totalReviews} reseñas)
                    </span>
                  </div>
                  <Badge variant="outline" className="mb-4">
                    {productoData.categoria}
                  </Badge>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Precio unitario</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-success">
                      ${precioNivel.precio.toLocaleString()}
                    </p>
                    {precioNivel.descuento > 0 && (
                      <Badge className="bg-success">{precioNivel.descuento}% OFF</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">por {productoData.unidad}</p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm font-medium mb-2">Cantidad</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      disabled={cantidad <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCantidad(cantidad + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">
                      {costoEnvio === 0 ? (
                        <span className="text-success">GRATIS</span>
                      ) : (
                        `$${costoEnvio.toLocaleString()}`
                      )}
                    </span>
                  </div>
                  {subtotal < productoData.envio.gratisPor && (
                    <p className="text-xs text-muted-foreground">
                      Envío gratis en compras mayores a $
                      {productoData.envio.gratisPor.toLocaleString()}
                    </p>
                  )}
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-success">
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button onClick={comprarAhora} className="w-full gap-2" size="lg">
                    Comprar ahora
                  </Button>
                  <Button
                    onClick={agregarAlCarrito}
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </Button>
                </div>
              </CardContent>
            </Card>

            {precioNivel.descuento > 0 && (
              <Card className="border-success bg-success/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-success">
                    ¡Ahorras ${((productoData.precio - precioNivel.precio) * cantidad).toLocaleString()} comprando {cantidad} unidades!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}