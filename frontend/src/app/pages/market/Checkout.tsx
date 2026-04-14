import { useState } from 'react';
import { useNavigate } from 'react-router';
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
  ArrowLeft,
  MapPin,
  CreditCard,
  CheckCircle,
  Package,
  Truck,
  FileText,
} from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1);
  const [direccion, setDireccion] = useState({
    tipo: 'finca',
    lote: '',
    indicaciones: '',
  });
  const [metodoPago, setMetodoPago] = useState('');

  // Mock data del carrito
  const items = [
    {
      nombre: 'Fertilizante NPK 15-15-15',
      cantidad: 10,
      precio: 95000,
      unidad: 'bulto 50kg',
    },
    {
      nombre: 'Glifosato 48% SL',
      cantidad: 5,
      precio: 42000,
      unidad: 'litro',
    },
  ];

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envio = 25000;
  const total = subtotal + envio;

  const confirmarPedido = () => {
    // Lógica para procesar el pedido
    navigate('/market/pedidos');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/market/carrito')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al carrito
        </Button>
        <h1 className="text-4xl font-bold text-foreground">Finalizar Compra</h1>
        <p className="text-muted-foreground mt-2">
          Completa la información para procesar tu pedido
        </p>
      </div>

      {/* Indicador de pasos */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[
              { numero: 1, nombre: 'Dirección', icon: MapPin },
              { numero: 2, nombre: 'Método de Pago', icon: CreditCard },
              { numero: 3, nombre: 'Confirmación', icon: CheckCircle },
            ].map((etapa, index) => {
              const Icon = etapa.icon;
              const estaCompleta = paso > etapa.numero;
              const estaActiva = paso === etapa.numero;

              return (
                <div
                  key={etapa.numero}
                  className="flex items-center"
                  style={{ flex: index < 2 ? 1 : 'none' }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        estaCompleta
                          ? 'bg-primary border-primary text-white'
                          : estaActiva
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {estaCompleta ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div
                      className={`text-sm font-semibold whitespace-nowrap ${
                        estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {etapa.nombre}
                    </div>
                  </div>

                  {index < 2 && (
                    <div className="flex-1 h-0.5 mx-3 bg-border relative min-w-[20px]">
                      <div
                        className={`absolute inset-0 bg-primary transition-all ${
                          estaCompleta ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* Paso 1: Dirección */}
          {paso === 1 && (
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Dirección de Entrega</h2>
                    <p className="text-sm text-muted-foreground">
                      Indica dónde deseas recibir tu pedido
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de entrega</Label>
                    <Select
                      value={direccion.tipo}
                      onValueChange={(val) => setDireccion({ ...direccion, tipo: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finca">Finca Principal</SelectItem>
                        <SelectItem value="lote">Lote Específico</SelectItem>
                        <SelectItem value="bodega">Bodega</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {direccion.tipo === 'lote' && (
                    <div className="space-y-2">
                      <Label>Seleccionar lote</Label>
                      <Select
                        value={direccion.lote}
                        onValueChange={(val) => setDireccion({ ...direccion, lote: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un lote" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lote-1">Lote 1 - Norte</SelectItem>
                          <SelectItem value="lote-2">Lote 2 - Sur</SelectItem>
                          <SelectItem value="lote-3">Lote 3 - Este</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Indicaciones adicionales</Label>
                    <Textarea
                      placeholder="Ej: Dejar en bodega principal, llamar al llegar, etc."
                      value={direccion.indicaciones}
                      onChange={(e) =>
                        setDireccion({ ...direccion, indicaciones: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                </div>

                <Button onClick={() => setPaso(2)} className="w-full" size="lg">
                  Continuar a método de pago
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Método de pago */}
          {paso === 2 && (
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Método de Pago</h2>
                    <p className="text-sm text-muted-foreground">
                      Selecciona cómo deseas pagar
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: 'pse',
                      nombre: 'Pago con PSE',
                      descripcion: 'Pago seguro desde tu cuenta bancaria',
                    },
                    {
                      id: 'tarjeta',
                      nombre: 'Tarjeta de Crédito',
                      descripcion: 'Visa, Mastercard, American Express',
                    },
                    {
                      id: 'efecty',
                      nombre: 'Pago por Efecty',
                      descripcion: 'Realiza el pago en cualquier punto Efecty',
                    },
                    {
                      id: 'contraentrega',
                      nombre: 'Pago Contra Entrega',
                      descripcion: 'Paga en efectivo o con tarjeta al recibir',
                    },
                  ].map((metodo) => (
                    <Card
                      key={metodo.id}
                      className={`cursor-pointer border-2 transition-all ${
                        metodoPago === metodo.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setMetodoPago(metodo.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              metodoPago === metodo.id
                                ? 'border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {metodoPago === metodo.id && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{metodo.nombre}</p>
                            <p className="text-sm text-muted-foreground">{metodo.descripcion}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPaso(1)} className="flex-1">
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setPaso(3)}
                    className="flex-1"
                    size="lg"
                    disabled={!metodoPago}
                  >
                    Continuar a confirmación
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paso 3: Confirmación */}
          {paso === 3 && (
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Confirmar Pedido</h2>
                    <p className="text-sm text-muted-foreground">
                      Revisa los detalles antes de confirmar
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Dirección de entrega
                    </h3>
                    <p className="text-sm">
                      {direccion.tipo === 'finca'
                        ? 'Finca Principal'
                        : direccion.tipo === 'lote'
                        ? `Lote: ${direccion.lote}`
                        : 'Bodega'}
                    </p>
                    {direccion.indicaciones && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {direccion.indicaciones}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Método de pago
                    </h3>
                    <p className="text-sm capitalize">
                      {metodoPago === 'pse'
                        ? 'Pago con PSE'
                        : metodoPago === 'tarjeta'
                        ? 'Tarjeta de Crédito'
                        : metodoPago === 'efecty'
                        ? 'Pago por Efecty'
                        : metodoPago === 'contraentrega'
                        ? 'Pago Contra Entrega'
                        : metodoPago}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPaso(2)} className="flex-1">
                    Anterior
                  </Button>
                  <Button onClick={confirmarPedido} className="flex-1 bg-success" size="lg">
                    Confirmar Pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Resumen del Pedido</h2>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm pb-3 border-b border-border last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-muted-foreground">
                          {item.cantidad} × ${item.precio.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold">
                        ${(item.precio * item.cantidad).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
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
              </CardContent>
            </Card>

            <Card className="border-border bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tiempo de entrega estimado</p>
                  <p className="text-xs text-muted-foreground">3-5 días hábiles</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}