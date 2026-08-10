/**
 * ModalReintentoEpayco
 *
 * Modal simple para reintentar el pago de un pedido con `metodo_pago='epayco'`.
 * Pide los datos de facturación exigidos por ePayco (§10.4) y dispara el
 * widget `checkout-v2.js`. Al terminar, redirige a `/market/pago/resultado`.
 *
 * Se usa desde `Pedidodetalle.tsx` cuando el estado_pago del pedido es
 * `pendiente`, `rechazado` o `fallido`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  pagosApi, abrirCheckoutEpayco, PagoErrorCodes,
  type BillingInfo,
} from '../../../api/pagos';
import { useAuth } from '../../contexts/AuthContext';

const BILLING_STORAGE_KEY = 'palmapp:market:billing';

interface Props {
  open: boolean;
  codigoPedido: string;
  onClose: () => void;
}

const DOC_TYPES: Array<{ id: BillingInfo['doc_type']; label: string }> = [
  { id: 'CC', label: 'Cédula de ciudadanía' },
  { id: 'CE', label: 'Cédula de extranjería' },
  { id: 'NIT', label: 'NIT' },
  { id: 'TI', label: 'Tarjeta de identidad' },
  { id: 'PPN', label: 'Pasaporte' },
];

export function ModalReintentoEpayco({ open, codigoPedido, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [enviando, setEnviando] = useState(false);

  const validar = (): boolean => {
    if (!billing.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) {
      toast.error('Correo inválido'); return false;
    }
    if (!billing.name.trim()) { toast.error('Nombre requerido'); return false; }
    if (!billing.doc_number.trim()) { toast.error('Documento requerido'); return false; }
    if (!billing.phone.trim()) { toast.error('Teléfono requerido'); return false; }
    return true;
  };

  const iniciar = async () => {
    if (!validar()) return;
    setEnviando(true);
    try {
      const ini = await pagosApi.iniciar(codigoPedido, billing);
      try { localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(billing)); } catch { /* cuota */ }
      const { session_id, test } = ini.data;
      onClose();
      abrirCheckoutEpayco(session_id, test, {
        onResponse: () => {
          navigate(`/market/pedidos/${codigoPedido}`);
        },
        onClosed: () => {
          // Se queda en el detalle del pedido, sin cambios.
        },
        onErrors: (err) => {
          console.error('[ePayco] onErrors:', err);
          toast.error('No se pudo abrir la pasarela de pago');
        },
      });
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === PagoErrorCodes.PAGO_YA_APROBADO) {
        toast.info('El pedido ya está pagado');
      } else if (code === PagoErrorCodes.PEDIDO_CANCELADO) {
        toast.error('El pedido está cancelado; no se puede reintentar el pago');
      } else if (code === PagoErrorCodes.EPAYCO_UNAVAILABLE) {
        toast.error('La pasarela de pago no está disponible. Intenta más tarde.');
      } else if (code === PagoErrorCodes.PAGO_METODO_INVALIDO) {
        toast.error('El pedido no admite pago en línea');
      } else {
        toast.error(err?.message ?? 'No se pudo iniciar el pago');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !enviando) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Datos de facturación
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pedido {codigoPedido} · Se abrirá la pasarela ePayco al confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="re-name">Nombre completo *</Label>
            <Input
              id="re-name"
              value={billing.name}
              onChange={(e) => setBilling({ ...billing, name: e.target.value })}
              placeholder="Juan Pérez"
              disabled={enviando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="re-email">Correo electrónico *</Label>
            <Input
              id="re-email"
              type="email"
              value={billing.email}
              onChange={(e) => setBilling({ ...billing, email: e.target.value })}
              placeholder="tucorreo@ejemplo.com"
              disabled={enviando}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo doc. *</Label>
              <Select
                value={billing.doc_type}
                onValueChange={(v) => setBilling({ ...billing, doc_type: v as BillingInfo['doc_type'] })}
                disabled={enviando}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="re-doc">Número doc. *</Label>
              <Input
                id="re-doc"
                value={billing.doc_number}
                onChange={(e) => setBilling({ ...billing, doc_number: e.target.value.replace(/\D/g, '') })}
                placeholder="1234567890"
                disabled={enviando}
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="re-phone">Teléfono *</Label>
            <Input
              id="re-phone"
              value={billing.phone}
              onChange={(e) => setBilling({ ...billing, phone: e.target.value.replace(/\D/g, '') })}
              placeholder="3001234567"
              disabled={enviando}
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={iniciar} disabled={enviando} className="gap-2">
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            Pagar con ePayco
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
