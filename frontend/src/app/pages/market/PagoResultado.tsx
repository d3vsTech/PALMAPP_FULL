/**
 * PagoResultado
 *
 * Pantalla de callback tras el intento de pago. En la integración real es la
 * URL a la que el widget/gateway redirige después de procesar el cobro. En
 * este stub, consulta el `pagosApi.estadoPago()` (mock) y muestra el estado.
 *
 * URL: /market/pagos/resultado/:codigo
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  ArrowRight, Package, Home,
} from 'lucide-react';
import { pagosApi, ESTADO_PAGO_LABEL, type EstadoPago } from '../../../api/pagos';

export default function PagoResultado() {
  const navigate = useNavigate();
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();

  const [estado, setEstado] = useState<EstadoPago | null>(null);
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [providerRef, setProviderRef] = useState<string | undefined>();
  const [fecha, setFecha] = useState<string | undefined>();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!codigo) return;
    setCargando(true);
    pagosApi.estadoPago(codigo)
      .then((res) => {
        setEstado(res.estado_pago);
        setTransactionId(res.transaction_id);
        setProviderRef(res.provider_reference);
        setFecha(res.fecha_pago);
      })
      .finally(() => setCargando(false));
  }, [codigo]);

  // Permite ?forzar=aprobado|rechazado|fallido para pruebas manuales sin
  // pasar por el widget. Solo aplica en el stub mock.
  const forzar = searchParams.get('forzar');

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando pago...</p>
      </div>
    );
  }

  const estadoFinal: EstadoPago = (forzar as EstadoPago) || estado || 'no_iniciado';
  const cfg = ESTADO_PAGO_LABEL[estadoFinal];

  const IconoEstado =
    estadoFinal === 'aprobado' ? CheckCircle2 :
    estadoFinal === 'rechazado' ? XCircle :
    estadoFinal === 'fallido' ? AlertTriangle :
    Loader2;

  const colorFondo =
    estadoFinal === 'aprobado' ? 'bg-success/10 border-success/30' :
    estadoFinal === 'rechazado' ? 'bg-destructive/10 border-destructive/30' :
    estadoFinal === 'fallido' ? 'bg-orange-500/10 border-orange-500/30' :
    'bg-muted border-border';

  const colorTexto =
    estadoFinal === 'aprobado' ? 'text-success' :
    estadoFinal === 'rechazado' ? 'text-destructive' :
    estadoFinal === 'fallido' ? 'text-orange-600' :
    'text-muted-foreground';

  const titulo =
    estadoFinal === 'aprobado' ? '¡Pago exitoso!' :
    estadoFinal === 'rechazado' ? 'Pago rechazado' :
    estadoFinal === 'fallido' ? 'Error en el pago' :
    'Pago pendiente';

  const descripcion =
    estadoFinal === 'aprobado'
      ? 'Wompi confirmó el cobro. Tu pedido está confirmado y el proveedor recibirá una notificación en breve.'
      : estadoFinal === 'rechazado'
        ? 'El banco rechazó la transacción. Verifica tu tarjeta o intenta con otro método.'
        : estadoFinal === 'fallido'
          ? 'Wompi tuvo un problema al procesar el cobro. Puedes reintentar sin cargo.'
          : 'Aún no se ha registrado un intento de pago para este pedido.';

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className={`border-2 ${colorFondo}`}>
        <CardContent className="p-8 text-center space-y-4">
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${colorFondo} ${colorTexto}`}>
            <IconoEstado className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <h1 className={`text-2xl font-bold ${colorTexto}`}>{titulo}</h1>
            <p className="text-sm text-muted-foreground">{descripcion}</p>
          </div>

          <Badge variant="outline" className={cfg.color}>
            {cfg.label}
          </Badge>

          {/* Detalles técnicos solo si hay información. */}
          {(transactionId || providerRef || fecha) && (
            <div className="mt-6 rounded-lg bg-background/60 border border-border p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Detalles de la transacción
              </p>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-mono text-foreground">{codigo}</span>
                </div>
                {providerRef && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Referencia</span>
                    <span className="font-mono text-foreground truncate">{providerRef}</span>
                  </div>
                )}
                {transactionId && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">ID Transacción</span>
                    <span className="font-mono text-foreground truncate">{transactionId}</span>
                  </div>
                )}
                {fecha && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="text-foreground">
                      {new Date(fecha).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
            {codigo && (
              <Button
                onClick={() => navigate(`/market/pedidos/${codigo}`)}
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Ver detalle del pedido
              </Button>
            )}
            <Button
              onClick={() => navigate('/market/pedidos')}
              variant="outline"
              className="gap-2"
            >
              Mis pedidos
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate('/market')}
              variant="ghost"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Seguir comprando
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
