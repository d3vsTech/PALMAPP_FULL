import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, MapPin, CreditCard, CheckCircle, Truck, User, Phone, Home, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { marketApi, toNumber, type Carrito as CarritoT } from '../../../api/market';
import { getDepartamentos, getMunicipios } from '../../../api/plantacion';
import { pagosApi, abrirCheckoutEpayco, type MetodoPago, type BillingInfo } from '../../../api/pagos';
import { useAuth } from '../../contexts/AuthContext';

/** Persistimos el billing en localStorage para que el usuario no tenga que
 *  reescribir sus datos en cada compra. `name`/`email` vienen del perfil,
 *  pero `doc_type`, `doc_number` y `phone` los guarda el usuario al pagar. */
const BILLING_STORAGE_KEY = 'palmapp:market:billing';

/** §10.2 API_MARKET — métodos permitidos por el backend. */
const METODOS_PAGO: Array<{ id: MetodoPago; nombre: string; descripcion: string }> = [
  {
    id: 'epayco',
    nombre: 'Pago en línea',
    descripcion: 'Tarjeta, PSE, Nequi, Daviplata · procesa ePayco',
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia bancaria',
    descripcion: 'Transferencia directa a la cuenta del proveedor',
  },
  {
    id: 'contra_entrega',
    nombre: 'Pago contra entrega',
    descripcion: 'Paga al recibir tu pedido',
  },
];

const DOC_TYPES: Array<{ id: BillingInfo['doc_type']; label: string }> = [
  { id: 'CC', label: 'Cédula de ciudadanía' },
  { id: 'CE', label: 'Cédula de extranjería' },
  { id: 'NIT', label: 'NIT' },
  { id: 'TI', label: 'Tarjeta de identidad' },
  { id: 'PPN', label: 'Pasaporte' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paso, setPaso] = useState(1);
  const [carrito, setCarrito] = useState<CarritoT | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [direccion, setDireccion] = useState({
    nombreCompleto: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    codigoPostal: '',
    indicaciones: '',
  });
  const [metodoPago, setMetodoPago] = useState<MetodoPago | ''>('');

  /** Datos de facturación exigidos por ePayco (§10.4). Solo aplican cuando
   *  el método seleccionado es `epayco`. Pre-poblamos con:
   *    - name/email → del perfil del usuario (AuthContext).
   *    - doc_type/doc_number/phone → del último pago guardado en localStorage.
   *  Todo es editable — el widget de ePayco los usa como valores por defecto. */
  const [billing, setBilling] = useState<BillingInfo>(() => {
    let previo: Partial<BillingInfo> = {};
    try {
      const raw = localStorage.getItem(BILLING_STORAGE_KEY);
      if (raw) previo = JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      email: previo.email ?? user?.email ?? '',
      name: previo.name ?? user?.nombre ?? '',
      doc_type: previo.doc_type ?? 'CC',
      doc_number: previo.doc_number ?? '',
      phone: previo.phone ?? '',
    };
  });

  // Departamentos / municipios desde el backend (mismo patrón que el wizard
  // de predios y colaboradores). Departamento guarda el código; el nombre se
  // resuelve cuando se manda el pedido. Municipios cargan por demanda.
  const [departamentos, setDepartamentos] = useState<{ codigo: string; nombre: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ codigo: string; nombre: string }[]>([]);
  const [deptoSel, setDeptoSel] = useState(''); // código del departamento
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  useEffect(() => {
    // Caché por sesión para evitar pedir lo mismo cada vez que se abre el checkout.
    try {
      const cached = sessionStorage.getItem('cache_departamentos');
      if (cached) { setDepartamentos(JSON.parse(cached)); return; }
    } catch { /* ignorar */ }
    getDepartamentos()
      .then((r) => {
        const ds = r.data ?? [];
        setDepartamentos(ds);
        try { sessionStorage.setItem('cache_departamentos', JSON.stringify(ds)); } catch { /* cuota */ }
      })
      .catch(() => { /* silencioso: usuario aún puede tipear si falla */ });
  }, []);

  // Cargar municipios cuando cambia el departamento. Caché por código.
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); return; }
    const cacheKey = `cache_municipios_${deptoSel}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setMunicipios(JSON.parse(cached)); return; }
    } catch { /* ignorar */ }
    setCargandoMunicipios(true);
    getMunicipios(deptoSel)
      .then((r) => {
        const ms = r.data ?? [];
        setMunicipios(ms);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(ms)); } catch { /* cuota */ }
      })
      .catch(() => setMunicipios([]))
      .finally(() => setCargandoMunicipios(false));
  }, [deptoSel]);

  useEffect(() => {
    setCargando(true);
    marketApi.carrito()
      .then((res) => {
        setCarrito(res.data);
        if (res.data.items.length === 0) {
          toast.error('Tu carrito está vacío');
          navigate('/market');
        }
      })
      .catch((e: any) => {
        toast.error(e?.message ?? 'Error al cargar carrito');
        navigate('/market');
      })
      .finally(() => setCargando(false));
  }, [navigate]);

  const composeDireccionEntrega = (): string => {
    const partes = [
      direccion.nombreCompleto,
      direccion.telefono ? `Tel: ${direccion.telefono}` : '',
      direccion.direccion,
      [direccion.ciudad, direccion.departamento].filter(Boolean).join(', '),
      direccion.codigoPostal ? `CP: ${direccion.codigoPostal}` : '',
      direccion.indicaciones,
    ].filter(Boolean);
    return partes.join(' · ');
  };

  /** Valida los campos mínimos de facturación exigidos por ePayco. */
  const validarBilling = (): boolean => {
    if (metodoPago !== 'epayco') return true;
    if (!billing.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) {
      toast.error('Ingresa un correo electrónico válido para el pago');
      return false;
    }
    if (!billing.name.trim()) { toast.error('Ingresa el nombre para la facturación'); return false; }
    if (!billing.doc_number.trim()) { toast.error('Ingresa el número de documento'); return false; }
    if (!billing.phone.trim()) { toast.error('Ingresa el teléfono de contacto'); return false; }
    return true;
  };

  const confirmarPedido = async () => {
    if (!metodoPago) return;
    if (!validarBilling()) return;
    setEnviando(true);
    try {
      const res = await marketApi.checkout({
        notas: direccion.indicaciones.trim() || undefined,
        metodo_pago: metodoPago,
        direccion_entrega: composeDireccionEntrega(),
      });
      const total = res.total_pedidos ?? res.data?.length ?? 1;
      toast.success(
        total > 1
          ? `${total} pedidos creados (uno por proveedor)`
          : 'Pedido creado correctamente',
      );

      // Solo `epayco` dispara la pasarela. `transferencia` y `contra_entrega`
      // cierran el flujo aquí y llevan al detalle/listado.
      const primer = res.data?.[0];
      if (primer && total === 1 && metodoPago === 'epayco') {
        try {
          const ini = await pagosApi.iniciar(primer.codigo, billing);
          // Persistir el billing para la próxima compra (no requerir re-tipear).
          try { localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(billing)); } catch { /* cuota */ }
          const { session_id, test } = ini.data;
          abrirCheckoutEpayco(session_id, test, {
            onResponse: () => {
              // No confiar en el response — solo redirigir a la página de
              // resultado que hará polling al backend (fuente autoritativa).
              navigate(`/market/pago/resultado?x_extra1=${encodeURIComponent(primer.codigo)}`);
            },
            onClosed: () => {
              // Usuario cerró el modal sin completar — pedido queda pendiente.
              // Puede reintentar desde el detalle del pedido.
              navigate(`/market/pedidos/${primer.codigo}`);
            },
            onErrors: (err) => {
              console.error('[ePayco] onErrors:', err);
              toast.error('No se pudo abrir la pasarela de pago. Intenta de nuevo desde el detalle del pedido.');
              navigate(`/market/pedidos/${primer.codigo}`);
            },
          });
          return;
        } catch (payErr: any) {
          const code = payErr?.code ?? payErr?.error_code;
          if (code === 'EPAYCO_UNAVAILABLE') {
            toast.error('La pasarela de pago no está disponible. Intenta más tarde desde el detalle del pedido.');
          } else if (code === 'PAGO_METODO_INVALIDO') {
            toast.error('Este pedido no admite pago en línea.');
          } else if (code === 'PEDIDO_CANCELADO') {
            toast.error('El pedido está cancelado.');
          } else {
            toast.error(payErr?.message ?? 'No se pudo iniciar el pago');
          }
          navigate(`/market/pedidos/${primer.codigo}`);
          return;
        }
      }

      if (res.data && res.data.length === 1) {
        navigate(`/market/pedidos/${res.data[0].codigo}`);
      } else {
        navigate('/market/pedidos');
      }
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === 'STOCK_INSUFICIENTE') {
        const detalles = (err?.errors ?? err?.body?.errors) as
          | { producto: string; disponible: number; solicitado: number }[]
          | undefined;
        if (Array.isArray(detalles) && detalles.length > 0) {
          const lista = detalles
            .map((d) => `${d.producto}: solicitaste ${d.solicitado}, hay ${d.disponible}`)
            .join('. ');
          toast.error(`Stock insuficiente — ${lista}`);
        } else {
          toast.error('Stock insuficiente para uno o más productos');
        }
      } else if (code === 'STOCK_INSUFICIENTE_CONCURRENTE') {
        toast.error('El stock cambió mientras procesábamos tu pedido. Intenta de nuevo.');
      } else if (code === 'CARRITO_VACIO') {
        toast.error('Tu carrito está vacío');
      } else {
        toast.error(err?.message ?? 'No se pudo crear el pedido');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando...
      </div>
    );
  }

  const items = carrito?.items ?? [];
  const resumen = carrito?.resumen ?? { subtotal: 0, costo_envio: 0, total: 0, cantidad_items: 0 };
  const subtotal = toNumber(resumen.subtotal);
  const total = toNumber(resumen.total);

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
                      {estaCompleta ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
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
                      Completa los datos para recibir tu pedido
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombreCompleto">
                        Nombre completo <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nombreCompleto"
                          placeholder="Ej: Juan Pérez"
                          value={direccion.nombreCompleto}
                          onChange={(e) => setDireccion({ ...direccion, nombreCompleto: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">
                        Teléfono <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="telefono"
                          placeholder="Ej: 3001234567"
                          value={direccion.telefono}
                          onChange={(e) => setDireccion({ ...direccion, telefono: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion">
                      Dirección completa <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="direccion"
                        placeholder="Ej: Calle 12 #34-56, Vereda El Carmen"
                        value={direccion.direccion}
                        onChange={(e) => setDireccion({ ...direccion, direccion: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Departamento (1º): trae los municipios cuando cambia */}
                    <div className="space-y-2">
                      <Label htmlFor="departamento">
                        Departamento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={deptoSel}
                        onValueChange={(codigo) => {
                          setDeptoSel(codigo);
                          const nombre = departamentos.find(d => d.codigo === codigo)?.nombre ?? '';
                          // Cambiar de departamento limpia el municipio anterior.
                          setDireccion({ ...direccion, departamento: nombre, ciudad: '' });
                        }}
                      >
                        <SelectTrigger id="departamento">
                          <SelectValue placeholder={
                            departamentos.length === 0
                              ? 'Cargando departamentos...'
                              : 'Selecciona un departamento'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {departamentos.map(d => (
                            <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ciudad/Municipio (2º): depende del departamento */}
                    <div className="space-y-2">
                      <Label htmlFor="ciudad">
                        Ciudad / Municipio <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={direccion.ciudad}
                        onValueChange={(nombre) => setDireccion({ ...direccion, ciudad: nombre })}
                        disabled={!deptoSel || cargandoMunicipios}
                      >
                        <SelectTrigger id="ciudad">
                          <SelectValue placeholder={
                            !deptoSel
                              ? 'Primero elige departamento'
                              : cargandoMunicipios
                                ? 'Cargando municipios...'
                                : 'Selecciona un municipio'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {municipios.map(m => (
                            <SelectItem key={m.codigo} value={m.nombre}>{m.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigoPostal">Código postal (Opcional)</Label>
                    <Input
                      id="codigoPostal"
                      placeholder="Ej: 760001"
                      value={direccion.codigoPostal}
                      onChange={(e) => setDireccion({ ...direccion, codigoPostal: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="indicaciones">Indicaciones adicionales (Opcional)</Label>
                    <Textarea
                      id="indicaciones"
                      placeholder="Ej: Casa de dos pisos color blanco, rejas verdes. Llamar al llegar."
                      value={direccion.indicaciones}
                      onChange={(e) => setDireccion({ ...direccion, indicaciones: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (
                      !direccion.nombreCompleto ||
                      !direccion.telefono ||
                      !direccion.direccion ||
                      !direccion.ciudad ||
                      !direccion.departamento
                    ) {
                      toast.error('Por favor completa todos los campos obligatorios');
                      return;
                    }
                    setPaso(2);
                  }}
                  className="w-full"
                  size="lg"
                >
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
                  {METODOS_PAGO.map((metodo) => (
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
                              metodoPago === metodo.id ? 'border-primary' : 'border-muted-foreground'
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

                {/* Formulario de facturación — solo para ePayco (§10.4). */}
                {metodoPago === 'epayco' && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <div>
                      <h3 className="font-semibold text-foreground">Datos de facturación</h3>
                      <p className="text-xs text-muted-foreground">
                        Requeridos por ePayco para procesar el pago.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="billing-name">
                          Nombre completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="billing-name"
                          value={billing.name}
                          onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                          placeholder="Juan Pérez"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="billing-email">
                          Correo electrónico <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="billing-email"
                          type="email"
                          value={billing.email}
                          onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                          placeholder="tucorreo@ejemplo.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="billing-doc-type">
                          Tipo de documento <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={billing.doc_type}
                          onValueChange={(v) => setBilling({ ...billing, doc_type: v as BillingInfo['doc_type'] })}
                        >
                          <SelectTrigger id="billing-doc-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOC_TYPES.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="billing-doc-number">
                          Número documento <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="billing-doc-number"
                          value={billing.doc_number}
                          onChange={(e) => setBilling({ ...billing, doc_number: e.target.value.replace(/\D/g, '') })}
                          placeholder="1234567890"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="billing-phone">
                          Teléfono <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="billing-phone"
                          value={billing.phone}
                          onChange={(e) => setBilling({ ...billing, phone: e.target.value.replace(/\D/g, '') })}
                          placeholder="3001234567"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Dirección de entrega
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{direccion.nombreCompleto}</p>
                          <p className="text-muted-foreground">{direccion.telefono}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{direccion.direccion}</p>
                          <p className="text-muted-foreground">
                            {direccion.ciudad}, {direccion.departamento}
                            {direccion.codigoPostal && ` - ${direccion.codigoPostal}`}
                          </p>
                        </div>
                      </div>
                      {direccion.indicaciones && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground italic">{direccion.indicaciones}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Método de pago
                    </h3>
                    <p className="text-sm">
                      {METODOS_PAGO.find((m) => m.id === metodoPago)?.nombre ?? metodoPago}
                    </p>
                    {metodoPago === 'epayco' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Se abrirá la pasarela de ePayco al confirmar.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPaso(2)} className="flex-1" disabled={enviando}>
                    Anterior
                  </Button>
                  <Button onClick={confirmarPedido} className="flex-1 bg-success hover:bg-success/90" size="lg" disabled={enviando}>
                    {enviando ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
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
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm pb-3 border-b border-border last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{item.producto.nombre}</p>
                        <p className="text-muted-foreground">
                          {item.cantidad} × ${toNumber(item.precio_unitario).toLocaleString('es-CO')}
                        </p>
                      </div>
                      <p className="font-semibold">
                        ${toNumber(item.subtotal).toLocaleString('es-CO')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">
                      {toNumber(resumen.costo_envio) === 0
                        ? 'Gratis'
                        : `$${toNumber(resumen.costo_envio).toLocaleString('es-CO')}`}
                    </span>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-success">
                      ${total.toLocaleString('es-CO')}
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
