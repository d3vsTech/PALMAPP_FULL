/**
 * Cerrar el reintegro de una vacación interrumpida (API_LIQUIDACIONES §10.16).
 *
 * Lo pagado de más se recupera descontándolo en la nómina del reintegro, con
 * autorización escrita (CST arts. 149-150), o se condona con motivo. En las
 * dos salidas el reintegro deja de estar PENDIENTE; el descuento en la nómina
 * se agrega a mano como deducción voluntaria.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { vacacionesApi } from '../../../api/vacaciones';
import type { MarcarReintegroPayload, VacacionItem } from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';

type Opcion = MarcarReintegroPayload['estado'];

interface Props {
  vacacionId: number | null;
  /** Lo que queda por recuperar; solo para el texto. */
  neto?: number;
  onClose: () => void;
  onMarcado?: (vacacion: VacacionItem) => void;
}

export function MarcarReintegroDialog({ vacacionId, neto, onClose, onMarcado }: Props) {
  const [opcion, setOpcion] = useState<Opcion>('DESCONTADO_EN_NOMINA');
  const [nominaEmpleadoId, setNominaEmpleadoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const abierto = vacacionId != null;

  useEffect(() => {
    if (!abierto) return;
    setOpcion('DESCONTADO_EN_NOMINA');
    setNominaEmpleadoId('');
    setMotivo('');
  }, [abierto]);

  const condona = opcion === 'CONDONADO';
  const puedeConfirmar = !enviando && (!condona || motivo.trim().length > 0);

  const confirmar = async () => {
    if (!vacacionId || !puedeConfirmar) return;
    setEnviando(true);
    try {
      const fila = Number(nominaEmpleadoId);
      const res = await vacacionesApi.marcarReintegro(vacacionId, {
        estado: opcion,
        nomina_empleado_id: !condona && fila > 0 ? fila : undefined,
        motivo: condona ? motivo.trim() : undefined,
      });
      toast.success(res.message ?? 'Reintegro marcado');
      onMarcado?.(res.data);
      onClose();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo marcar el reintegro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar el reintegro</DialogTitle>
          <DialogDescription>
            {neto != null
              ? `Quedan $${Math.round(neto).toLocaleString('es-CO')} por recuperar.`
              : 'Qué se hizo con lo pagado de más.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            {(['DESCONTADO_EN_NOMINA', 'CONDONADO'] as Opcion[]).map((valor) => (
              <label
                key={valor}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <input
                  type="radio"
                  name="reintegro"
                  className="mt-1"
                  checked={opcion === valor}
                  onChange={() => setOpcion(valor)}
                />
                <span>
                  <span className="font-medium">
                    {valor === 'CONDONADO' ? 'Condonar' : 'Descontado en nómina'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {valor === 'CONDONADO'
                      ? 'El empleador decide no recuperarlo.'
                      : 'Ya se agregó la deducción voluntaria en la nómina del reintegro.'}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {!condona && (
            <div className="space-y-1.5">
              <Label htmlFor="fila-nomina">Fila de nómina (opcional)</Label>
              <Input
                id="fila-nomina"
                type="number"
                inputMode="numeric"
                value={nominaEmpleadoId}
                onChange={(e) => setNominaEmpleadoId(e.target.value)}
                placeholder="Id de la fila donde se descontó"
              />
            </div>
          )}

          {condona && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo-condonar">Motivo</Label>
              <Textarea
                id="motivo-condonar"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Por qué no se recupera"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
