/**
 * Registro del pago de una vacación (API_LIQUIDACIONES §10.9).
 * No hay fondo ni PILA: el dinero va directo al trabajador.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  type MetodoPagoVacacion,
  type VacacionItem,
} from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';
import { fmtCOP } from './comunes';

const METODOS: Array<{ valor: MetodoPagoVacacion; label: string }> = [
  { valor: 'TRANSFERENCIA', label: 'Transferencia' },
  { valor: 'EFECTIVO', label: 'Efectivo' },
  { valor: 'CHEQUE', label: 'Cheque' },
];

interface Props {
  vacacion: VacacionItem | null;
  onCerrar: () => void;
  onPagada: (v: VacacionItem) => void;
}

export default function PagoVacacionDialog({ vacacion, onCerrar, onPagada }: Props) {
  const [fechaPago, setFechaPago] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagoVacacion>('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!vacacion) return;
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMetodo('TRANSFERENCIA');
    setReferencia('');
    setObservacion('');
  }, [vacacion]);

  const guardar = async () => {
    if (!vacacion) return;
    if (!fechaPago) { toast.error('Indica la fecha del pago'); return; }
    setGuardando(true);
    try {
      const res = await vacacionesApi.registrarPago(vacacion.id, {
        fecha_pago: fechaPago,
        metodo_pago: metodo,
        referencia_pago: referencia.trim() || undefined,
        observacion: observacion.trim() || undefined,
      });
      toast.success(res.message ?? 'Pago registrado');
      onPagada(res.data);
      onCerrar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === VacacionesErrorCodes.LIQUIDACION_PAGO_YA_REGISTRADO) {
        toast.error('Esta vacación ya tiene el pago registrado');
      } else if (e.code === VacacionesErrorCodes.VACACION_ESTADO_INVALIDO) {
        toast.error('La vacación está anulada: no admite pago');
      } else {
        toast.error(e.message ?? 'No se pudo registrar el pago');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={vacacion !== null} onOpenChange={(v) => { if (!v && !guardando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Registrar pago
          </DialogTitle>
          <DialogDescription>
            {vacacion
              ? `${vacacion.empleado.nombre_completo} · ${fmtCOP(vacacion.valor_total)}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagoVacacion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Referencia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Número de transferencia o cheque"
              value={referencia} onChange={(e) => setReferencia(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observación <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando} className="gap-2">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
