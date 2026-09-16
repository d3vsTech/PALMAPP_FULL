/**
 * Anulación de una vacación (API_LIQUIDACIONES §10.9 y §10.10).
 *
 * Dos operaciones distintas en un solo diálogo porque comparten todo menos
 * el endpoint y el texto:
 *  - `pago`: devuelve la vacación a APROBADA. El saldo no se mueve.
 *  - `liquidacion`: la deja CANCELADA y los días vuelven al saldo. Exige
 *    motivo, y el backend la rechaza si todavía tiene el pago registrado.
 *
 * Lo usan el histórico y el comprobante, para no tener dos copias del mismo
 * manejo de errores.
 */
import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  VacacionesErrorCodes,
  type VacacionItem,
} from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';

export type ModoAnulacion = 'pago' | 'liquidacion';

interface Props {
  /** `null` cierra el diálogo. */
  vacacion: VacacionItem | null;
  modo: ModoAnulacion;
  onCerrar: () => void;
  /** Recibe la vacación actualizada para refrescar la vista que llamó. */
  onAnulada: (v: VacacionItem) => void;
}

export default function AnularVacacionDialog({ vacacion, modo, onCerrar, onAnulada }: Props) {
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (vacacion) setMotivo('');
  }, [vacacion, modo]);

  const ejecutar = async () => {
    if (!vacacion) return;
    if (modo === 'liquidacion' && motivo.trim().length < 5) {
      toast.error('Escribe el motivo de la anulación');
      return;
    }
    setProcesando(true);
    try {
      const res = modo === 'pago'
        ? await vacacionesApi.anularPago(vacacion.id)
        : await vacacionesApi.anular(vacacion.id, motivo.trim());
      toast.success(res.message ?? (modo === 'pago' ? 'Pago anulado' : 'Vacaciones anuladas'));
      onAnulada(res.data);
      onCerrar();
    } catch (err) {
      const e = err as ApiError;
      switch (e.code) {
        case VacacionesErrorCodes.LIQUIDACION_PAGO_NO_REGISTRADO:
          toast.error('Esta vacación no tiene pago registrado');
          break;
        case VacacionesErrorCodes.VACACION_PAGADA:
          toast.error('Primero anula el pago y después la liquidación');
          break;
        case VacacionesErrorCodes.VACACION_EN_NOMINA_CERRADA:
          toast.error('El rango ya quedó dentro de una nómina cerrada. Reabre la nómina primero.');
          break;
        case VacacionesErrorCodes.VACACION_ESTADO_INVALIDO:
          toast.error('Esta liquidación ya está anulada');
          break;
        default:
          toast.error(e.message ?? 'No se pudo completar la anulación');
      }
    } finally {
      setProcesando(false);
    }
  };

  const esPago = modo === 'pago';

  return (
    <AlertDialog open={vacacion !== null} onOpenChange={(v) => { if (!v && !procesando) onCerrar(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {esPago ? 'Anular el pago' : 'Anular la liquidación'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {esPago
              ? 'La liquidación vuelve a quedar pendiente de pago. Los días siguen descontados del saldo del colaborador.'
              : 'Los días vuelven al saldo del colaborador y el comprobante queda marcado como anulado. No se borra.'}
            {vacacion && ` · ${vacacion.empleado.nombre_completo}`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!esPago && (
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea
              rows={3}
              placeholder="Por qué se anula esta liquidación."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
          <Button
            onClick={ejecutar}
            disabled={procesando}
            className={esPago ? 'gap-2' : 'gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90'}
          >
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            {esPago ? 'Anular pago' : 'Anular'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
