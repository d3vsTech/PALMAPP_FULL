/**
 * PagoResultado
 *
 * Pantalla de retorno tras el flujo de pago (widget ePayco cerrado o
 * redirect fallback desde `response_url` del backend §10.5). Nunca confía
 * en los query params — solo usa `x_extra1` (código del pedido) para
 * llamar al backend, que es la fuente autoritativa del estado.
 *
 * Como el webhook puede tardar unos segundos en llegar tras `onResponse`,
 * hacemos polling mientras `estado_pago` sea `procesando` (hasta ~30s).
 *
 * URL: /market/pago/resultado?x_extra1=PED-001[&ref_payco=...]
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight, Package, Home,
} from 'lucide-react';
import {
  pagosApi, ESTADO_PAGO_LABEL,
  type EstadoPago, type EstadoPagoResponse,
} from '../../../api/pagos';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 30_000;

export default function PagoResultado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // §10.5 punto 5: ePayco redirige con `x_extra1` = código del pedido.
  // Los demás params (`ref_payco`, `x_response`, `x_amount`) son inseguros
  // y NO deben usarse para decidir estado — solo el backend es autoritativo.
  const codigo = searchParams.get('x_extra1');

  // Sin `x_extra1` no se puede identificar el pedido: la doc dice caer al
  // historial de pedidos. Redirigimos inmediatamente (sin mostrar UI de error).
  useEffect(() => {
    if (!codigo) {
      navigate('/market/pedidos', { replace: true });
    }
  }, [codigo, navigate]);

  const [resultado, setResultado] = useState<EstadoPagoResponse['data'] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [polling, setPolling] = useState(false);
  const inicioPollingRef = useRef<number>(0);

  const consultar = useCallback(async () => {
    if (!codigo) return null;
    try {
      const r = await pagosApi.estado(codigo);
      setResultado(r.data);
      return r.data;
    } catch (err) {
      console.warn('[PagoResultado] Error consultando estado:', err);
      return null;
    }
  }, [codigo]);

  // Carga inicial + polling mientras el estado sea `procesando`.
  useEffect(() => {
    if (!codigo) {
      setCargando(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      const data = await consultar();
      if (cancelled) return;
      const debeSeguir =
        !!data
        && data.estado_pago === 'procesando'
        && Date.now() - inicioPollingRef.current < POLL_MAX_MS;
      setPolling(debeSeguir);
      if (debeSeguir) {
        timer = setTimeout(loop, POLL_INTERVAL_MS);
      } else {
        setCargando(false);
      }
    };

    inicioPollingRef.current = Date.now();
    setCargando(true);
    setPolling(true);
    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [codigo, consultar]);

  // Mientras el useEffect redirige a /market/pedidos, no renderizamos nada
  // para evitar un flash de UI.
  if (!codigo) return null;

  if (cargando && !resultado) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando pago con ePayco...</p>
      </div>
    );
  }

  const estado: EstadoPago = resultado?.estado_pago ?? 'pendiente';
  const cfg = ESTADO_PAGO_LABEL[estado];
  const ultimoPago = resultado?.ultimo_pago ?? null;

  const IconoEstado =
    estado === 'pagado' ? CheckCircle2 :
    estado === 'rechazado' ? XCircle :
    estado === 'fallido' ? AlertTriangle :
    Loader2;

  const colorFondo =
    estado === 'pagado' ? 'bg-success/10 border-success/30' :
    estado === 'rechazado' ? 'bg-destructive/10 border-destructive/30' :
    estado === 'fallido' ? 'bg-orange-500/10 border-orange-500/30' :
    'bg-muted border-border';

  const colorTexto =
    estado === 'pagado' ? 'text-success' :
    estado === 'rechazado' ? 'text-destructive' :
    estado === 'fallido' ? 'text-orange-600' :
    'text-muted-foreground';

  const titulo =
    estado === 'pagado' ? '¡Pago exitoso!' :
    estado === 'rechazado' ? 'Pago rechazado' :
    estado === 'fallido' ? 'Error en el pago' :
    estado === 'procesando' ? 'Procesando pago...' :
    'Pago pendiente';

  const descripcion =
    estado === 'pagado'
      ? 'ePayco confirmó el cobro. Tu pedido está confirmado y el proveedor recibirá la notificación.'
      : estado === 'rechazado'
        ? (ultimoPago?.response_reason || 'El banco rechazó la transacción. Verifica tu tarjeta o intenta con otro método.')
        : estado === 'fallido'
          ? (ultimoPago?.response_reason || 'La pasarela tuvo un problema al procesar el cobro. Puedes reintentar sin cargo.')
          : estado === 'procesando'
            ? 'Estamos esperando la confirmación del banco. Este proceso puede tardar unos segundos.'
            : 'Aún no se ha registrado un intento de pago para este pedido.';

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className={`border-2 ${colorFondo}`}>
        <CardContent className="p-8 text-center space-y-4">
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${colorFondo} ${colorTexto}`}>
            <IconoEstado className={`h-9 w-9 ${polling ? 'animate-spin' : ''}`} />
          </div>

          <div className="space-y-1">
            <h1 className={`text-2xl font-bold ${colorTexto}`}>{titulo}</h1>
            <p className="text-sm text-muted-foreground">{descripcion}</p>
          </div>

          <Badge variant="outline" className={cfg.color}>
            {cfg.label}
          </Badge>

          {/* Detalle técnico del intento (§10.4 backend response). */}
          {ultimoPago && (
            <div className="mt-6 rounded-lg bg-background/60 border border-border p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Detalles de la transacción
              </p>
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-mono text-foreground">{codigo}</span>
                </div>
                {ultimoPago.franchise && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Franquicia</span>
                    <span className="text-foreground">{ultimoPago.franchise}</span>
                  </div>
                )}
                {ultimoPago.approval_code && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Cód. aprobación</span>
                    <span className="font-mono text-foreground">{ultimoPago.approval_code}</span>
                  </div>
                )}
                {ultimoPago.fecha_procesado && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="text-foreground">
                      {new Date(ultimoPago.fecha_procesado).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => navigate(`/market/pedidos/${codigo}`)}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Ver detalle del pedido
            </Button>
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
