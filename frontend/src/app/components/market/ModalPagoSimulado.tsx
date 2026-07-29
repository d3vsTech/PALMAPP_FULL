/**
 * ModalPagoSimulado
 *
 * Simulador del widget de pasarela de pago mientras el equipo backend arma
 * la integración real con Wompi/ePayco. Diseñado para ser reemplazado sin
 * tocar `Checkout.tsx`: expone la misma API (`open`, `onSuccess`, `onError`,
 * `onClose`) que espondrá el widget real.
 *
 * NO valida datos de tarjeta — todo es visual. Al presionar "Aprobar" o
 * "Rechazar" llama a `pagosApi.simularResultadoWidget()` y devuelve al
 * componente padre el transaction_id junto con el resultado escogido.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { CreditCard, Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { pagosApi } from '../../../api/pagos';

interface Props {
  open: boolean;
  monto: number;
  referencia: string;
  onSuccess: (transactionId: string) => void;
  onReject: (transactionId: string) => void;
  onError: () => void;
  onClose: () => void;
}

export function ModalPagoSimulado({
  open,
  monto,
  referencia,
  onSuccess,
  onReject,
  onError,
  onClose,
}: Props) {
  const [procesando, setProcesando] = useState(false);
  const [numeroTarjeta, setNumeroTarjeta] = useState('4242 4242 4242 4242');
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [fechaVenc, setFechaVenc] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  const ejecutar = async (resultado: 'aprobado' | 'rechazado' | 'fallido') => {
    setProcesando(true);
    const { transaction_id } = pagosApi.simularResultadoWidget(resultado);
    // Simular latencia del gateway real (procesamiento + verificación).
    await new Promise((r) => setTimeout(r, 1500));
    if (resultado === 'aprobado') onSuccess(transaction_id);
    else if (resultado === 'rechazado') onReject(transaction_id);
    else onError();
    setProcesando(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !procesando) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pago Seguro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso claro de que es un simulador. Se elimina cuando entre el
              widget real de Wompi/ePayco. */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]">
                SIMULADOR
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este es un modal de prueba mientras se integra la pasarela real.
                Ningún dato se envía a ningún proveedor.
              </p>
            </div>
          </div>

          {/* Resumen del cobro. */}
          <div className="rounded-lg bg-muted/40 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Monto a pagar</span>
              <span className="text-lg font-bold text-foreground">
                ${monto.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Referencia</span>
              <span className="text-xs font-mono text-foreground">{referencia}</span>
            </div>
          </div>

          {/* Formulario de tarjeta — visual únicamente. */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tarjeta" className="text-xs">Número de tarjeta</Label>
              <Input
                id="tarjeta"
                value={numeroTarjeta}
                onChange={(e) => setNumeroTarjeta(e.target.value)}
                placeholder="1234 5678 9012 3456"
                disabled={procesando}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-xs">Nombre en la tarjeta</Label>
              <Input
                id="nombre"
                value={nombreTarjeta}
                onChange={(e) => setNombreTarjeta(e.target.value)}
                placeholder="JOSE PEREZ"
                disabled={procesando}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="venc" className="text-xs">Vencimiento</Label>
                <Input
                  id="venc"
                  value={fechaVenc}
                  onChange={(e) => setFechaVenc(e.target.value)}
                  placeholder="MM/AA"
                  disabled={procesando}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cvv" className="text-xs">CVV</Label>
                <Input
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  disabled={procesando}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Conexión cifrada. Los datos nunca se guardan.
          </div>

          {/* Botones de resultado — en el widget real solo habría un "Pagar"
              que ejecuta la lógica del gateway y devuelve resultado por callback. */}
          {procesando ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Procesando pago...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => ejecutar('aprobado')}
                className="w-full gap-2 bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Simular pago aprobado
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => ejecutar('rechazado')}
                  variant="outline"
                  className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  <XCircle className="h-4 w-4" />
                  Rechazado
                </Button>
                <Button
                  onClick={() => ejecutar('fallido')}
                  variant="outline"
                  className="gap-2 border-orange-500/40 text-orange-600 hover:bg-orange-500/5"
                >
                  Error gateway
                </Button>
              </div>
              <Button onClick={onClose} variant="ghost" className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
