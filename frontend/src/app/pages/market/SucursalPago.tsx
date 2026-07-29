/**
 * SucursalPago
 *
 * Pantalla "sucursal" que simula el portal del proveedor de pagos (PSE,
 * Nequi, tarjeta). Cada método tiene su propia UI para replicar lo que
 * el usuario vería en producción cuando el checkout lo redirige al
 * gateway.
 *
 * URL: /market/pagos/sucursal/:codigo?metodo=pse|nequi|tarjeta
 *
 * En la integración real esta pantalla desaparece: el usuario sale del
 * dominio de PalmApp hacia `pagos.pse.com.co`, `nequi.com.co`, etc., y
 * regresa al `PagoResultado.tsx` vía callback. Aquí solo la mantenemos
 * para que el flujo se pueda probar y demostrar de punta a punta sin
 * cuentas reales de proveedor.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Lock, Loader2, CheckCircle2, XCircle,
  Smartphone, Building2, CreditCard, QrCode, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { marketApi, toNumber, type Pedido } from '../../../api/market';
import { pagosApi } from '../../../api/pagos';

type SlugMetodo = 'pse' | 'nequi' | 'tarjeta';

const BANCOS_PSE = [
  { id: '1007', nombre: 'Bancolombia' },
  { id: '1013', nombre: 'BBVA Colombia' },
  { id: '1051', nombre: 'Davivienda' },
  { id: '1001', nombre: 'Banco de Bogotá' },
  { id: '1002', nombre: 'Banco Popular' },
  { id: '1023', nombre: 'Banco de Occidente' },
  { id: '1006', nombre: 'Itaú' },
  { id: '1052', nombre: 'AV Villas' },
  { id: '1058', nombre: 'Banco Agrario' },
  { id: '1062', nombre: 'Banco Falabella' },
  { id: '1801', nombre: 'Nequi' },
  { id: '1507', nombre: 'Daviplata' },
];

export default function SucursalPago() {
  const navigate = useNavigate();
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const metodo = (searchParams.get('metodo') || 'tarjeta') as SlugMetodo;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    marketApi.pedido(codigo)
      .then((r) => setPedido(r.data))
      .catch(() => {
        toast.error('No se pudo cargar el pedido');
        navigate('/market/pedidos');
      })
      .finally(() => setCargando(false));
  }, [codigo, navigate]);

  const referencia = useMemo(() => {
    return codigo ? `MOCK-${codigo}` : 'MOCK-REF';
  }, [codigo]);

  const ejecutar = async (resultado: 'aprobado' | 'rechazado' | 'fallido') => {
    if (!codigo) return;
    setProcesando(true);
    const { transaction_id } = pagosApi.simularResultadoWidget(resultado);
    await new Promise((r) => setTimeout(r, 1400));
    await pagosApi.confirmarPago(codigo, transaction_id, resultado);
    navigate(`/market/pagos/resultado/${codigo}`);
  };

  if (cargando || !pedido) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando portal de pago...</p>
      </div>
    );
  }

  const total = toNumber(pedido.total);

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header con branding y aviso de simulador. */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/market/pedidos/${codigo}`)}
          className="gap-2"
          disabled={procesando}
        >
          <ArrowLeft className="h-4 w-4" />
          Cancelar y volver
        </Button>
        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
          SIMULADOR
        </Badge>
      </div>

      {metodo === 'pse' && (
        <SucursalPSE
          pedido={pedido}
          total={total}
          referencia={referencia}
          procesando={procesando}
          onEjecutar={ejecutar}
        />
      )}
      {metodo === 'nequi' && (
        <SucursalNequi
          pedido={pedido}
          total={total}
          referencia={referencia}
          procesando={procesando}
          onEjecutar={ejecutar}
        />
      )}
      {metodo === 'tarjeta' && (
        <SucursalTarjeta
          pedido={pedido}
          total={total}
          referencia={referencia}
          procesando={procesando}
          onEjecutar={ejecutar}
        />
      )}
    </div>
  );
}

interface VariantProps {
  pedido: Pedido;
  total: number;
  referencia: string;
  procesando: boolean;
  onEjecutar: (r: 'aprobado' | 'rechazado' | 'fallido') => void;
}

/* ─── PSE ───────────────────────────────────────────────────────────────── */

function SucursalPSE({ total, referencia, procesando, onEjecutar }: VariantProps) {
  const [banco, setBanco] = useState('');
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');

  return (
    <Card className="border-2 border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-blue-500/20">
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pagos Seguros en Línea</h2>
            <p className="text-xs text-muted-foreground">PSE · ACH Colombia</p>
          </div>
        </div>

        <ResumenCobro total={total} referencia={referencia} />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de persona</Label>
            <Select value={tipoPersona} onValueChange={(v: any) => setTipoPersona(v)}>
              <SelectTrigger disabled={procesando}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">Persona Natural</SelectItem>
                <SelectItem value="juridica">Persona Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Banco</Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger disabled={procesando}>
                <SelectValue placeholder="Selecciona tu banco" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS_PSE.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Documento</Label>
              <Input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Número de identificación"
                disabled={procesando}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                disabled={procesando}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Serás redirigido al portal seguro de tu banco.
        </div>

        <BotonesSimulacion procesando={procesando} onEjecutar={onEjecutar} textoAprobar="Ir al banco y pagar" />
      </CardContent>
    </Card>
  );
}

/* ─── NEQUI ─────────────────────────────────────────────────────────────── */

function SucursalNequi({ total, referencia, procesando, onEjecutar }: VariantProps) {
  const [telefono, setTelefono] = useState('');
  const [pushEnviado, setPushEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const enviarPush = () => {
    if (telefono.length < 7) {
      toast.error('Ingresa un número de celular válido');
      return;
    }
    setPushEnviado(true);
    toast.success('Notificación enviada a tu app Nequi');
  };

  const copiarReferencia = () => {
    navigator.clipboard.writeText(referencia).catch(() => { /* ignorar */ });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Card className="border-2 border-pink-500/30 bg-pink-500/5">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-pink-500/20">
          <div className="h-11 w-11 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Nequi</h2>
            <p className="text-xs text-muted-foreground">Paga con tu app en segundos</p>
          </div>
        </div>

        <ResumenCobro total={total} referencia={referencia} />

        {!pushEnviado ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Número de celular Nequi</Label>
              <Input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="3001234567"
                disabled={procesando}
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Te enviaremos una notificación push para que confirmes desde la app.
              </p>
            </div>
            <Button
              onClick={enviarPush}
              className="w-full gap-2 bg-pink-600 hover:bg-pink-600/90 text-white"
              disabled={procesando}
            >
              <Smartphone className="h-4 w-4" />
              Enviar notificación a Nequi
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-2 text-muted-foreground">o escanea con la app</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="h-32 w-32 rounded-lg border-2 border-dashed border-pink-500/40 bg-pink-500/5 flex items-center justify-center">
                <QrCode className="h-16 w-16 text-pink-600/60" />
              </div>
              <p className="text-[10px] text-muted-foreground">Código QR de pago Nequi</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-pink-500/10 border border-pink-500/30 p-4 text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center animate-pulse">
                <Smartphone className="h-6 w-6 text-pink-600" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Esperando confirmación en tu Nequi
              </p>
              <p className="text-xs text-muted-foreground">
                Revisa la notificación en el celular {telefono} y aprueba el cobro.
              </p>
              <button
                type="button"
                onClick={copiarReferencia}
                className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-pink-600 hover:underline"
              >
                {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {referencia}
              </button>
            </div>
          </div>
        )}

        <BotonesSimulacion procesando={procesando} onEjecutar={onEjecutar} textoAprobar="Simular confirmación en Nequi" />
      </CardContent>
    </Card>
  );
}

/* ─── TARJETA ───────────────────────────────────────────────────────────── */

function SucursalTarjeta({ total, referencia, procesando, onEjecutar }: VariantProps) {
  const [numeroTarjeta, setNumeroTarjeta] = useState('4242 4242 4242 4242');
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [fechaVenc, setFechaVenc] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [cuotas, setCuotas] = useState('1');

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
          <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pago con Tarjeta</h2>
            <p className="text-xs text-muted-foreground">Visa · Mastercard · Amex · Diners</p>
          </div>
        </div>

        <ResumenCobro total={total} referencia={referencia} />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Número de tarjeta</Label>
            <Input
              value={numeroTarjeta}
              onChange={(e) => setNumeroTarjeta(e.target.value)}
              placeholder="1234 5678 9012 3456"
              disabled={procesando}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre en la tarjeta</Label>
            <Input
              value={nombreTarjeta}
              onChange={(e) => setNombreTarjeta(e.target.value.toUpperCase())}
              placeholder="JOSE PEREZ"
              disabled={procesando}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Vencimiento</Label>
              <Input
                value={fechaVenc}
                onChange={(e) => setFechaVenc(e.target.value)}
                placeholder="MM/AA"
                disabled={procesando}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CVV</Label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                disabled={procesando}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cuotas</Label>
              <Select value={cuotas} onValueChange={setCuotas}>
                <SelectTrigger disabled={procesando}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 6, 12, 24, 36].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'cuota' : 'cuotas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Conexión cifrada 3DS. Los datos nunca se guardan.
        </div>

        <BotonesSimulacion procesando={procesando} onEjecutar={onEjecutar} textoAprobar="Pagar ahora" />
      </CardContent>
    </Card>
  );
}

/* ─── COMPONENTES COMUNES ───────────────────────────────────────────────── */

function ResumenCobro({ total, referencia }: { total: number; referencia: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Monto a pagar</span>
        <span className="text-2xl font-bold text-foreground">
          ${total.toLocaleString('es-CO')}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Referencia</span>
        <span className="text-xs font-mono text-foreground">{referencia}</span>
      </div>
    </div>
  );
}

function BotonesSimulacion({
  procesando,
  onEjecutar,
  textoAprobar,
}: {
  procesando: boolean;
  onEjecutar: (r: 'aprobado' | 'rechazado' | 'fallido') => void;
  textoAprobar: string;
}) {
  if (procesando) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Procesando transacción...</p>
        <p className="text-xs text-muted-foreground">
          No cierres esta pantalla ni recargues la página.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Button
        onClick={() => onEjecutar('aprobado')}
        className="w-full gap-2 bg-success hover:bg-success/90"
      >
        <CheckCircle2 className="h-4 w-4" />
        {textoAprobar}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onEjecutar('rechazado')}
          variant="outline"
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
        >
          <XCircle className="h-4 w-4" />
          Simular rechazo
        </Button>
        <Button
          onClick={() => onEjecutar('fallido')}
          variant="outline"
          className="gap-2 border-orange-500/40 text-orange-600 hover:bg-orange-500/5"
        >
          Error gateway
        </Button>
      </div>
    </div>
  );
}
