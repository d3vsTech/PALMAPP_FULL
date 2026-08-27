/**
 * Diálogo post-aprobación de planilla (API_OPERACIONES §7.2).
 *
 * Se abre cuando `POST /operaciones/{id}/aprobar` devuelve una advertencia
 * `PLANILLA_CON_PERSONAL_SIN_REGISTRAR`. La planilla YA quedó aprobada; este
 * diálogo es para cerrar el círculo — permite al operador registrar en masa
 * la novedad de todos los faltantes con un solo motivo, usando
 * `POST /operaciones/{id}/ausencias/faltantes` (API_AUSENCIAS §2.8, funciona
 * post-cierre a propósito).
 *
 * Es informativo: si el operador cierra sin registrar, la nómina tratará
 * a los faltantes como inasistencia injustificada y perderán el descanso
 * dominical de esa semana (CST art. 173 num. 1).
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { ausenciasApi } from '../../../api/operaciones';

export interface ColaboradorFaltante {
  id: number;
  nombre_completo: string;
  documento?: string;
  modalidad_pago?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacionId: number;
  faltantes: ColaboradorFaltante[];
  /**
   * Catálogo de motivos: nombre → id. Se toma del bundle wizard-init que ya
   * está cargado en el wizard de operaciones.
   */
  motivosMap: Map<string, number>;
  /**
   * Se llama cuando el usuario terminó (registró novedad o cerró). El wizard
   * lo usa para refrescar el bundle si cambió algo.
   */
  onCerrado: (registro: { creadas: number; omitidas: number } | null) => void;
}

export function DialogoFaltantesPostAprobar({
  open, onOpenChange, operacionId, faltantes, motivosMap, onCerrado,
}: Props) {
  const [motivoNombre, setMotivoNombre] = useState<string>('');
  const [motivoTexto, setMotivoTexto] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  const motivosOpciones = useMemo(
    () => Array.from(motivosMap.keys()).sort((a, b) => a.localeCompare(b, 'es')),
    [motivosMap],
  );

  const registrar = async () => {
    if (!motivoNombre) {
      toast.error('Selecciona un motivo');
      return;
    }
    const motivoId = motivosMap.get(motivoNombre);
    if (!motivoId) {
      toast.error('Motivo no encontrado');
      return;
    }
    setGuardando(true);
    try {
      const res = await ausenciasApi.crearFaltantes(operacionId, {
        motivo_ausencia_id: motivoId,
        empleado_ids: faltantes.map((f) => f.id),
        motivo: motivoTexto || undefined,
      });
      const creadas = res.data.creadas.length;
      const omitidas = res.data.omitidas.length;
      toast.success(res.message ?? `${creadas} novedad(es) registrada(s)`);
      onCerrado({ creadas, omitidas });
      onOpenChange(false);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'No se pudieron registrar las novedades');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSinRegistrar = () => {
    onCerrado(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Colaboradores sin registrar en la planilla
          </DialogTitle>
          <DialogDescription>
            La planilla ya quedó aprobada. Estos {faltantes.length} colaborador
            {faltantes.length !== 1 ? 'es' : ''} con contrato vigente no aparecen
            en ninguna labor ni en una ausencia. Si no registras una novedad,
            la nómina los tratará como <strong>inasistencia injustificada</strong>:
            perderán el día de salario y el descanso dominical de esa semana
            (CST art. 173 num. 1).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de faltantes */}
          <div className="rounded-lg border border-border max-h-[200px] overflow-y-auto">
            {faltantes.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 text-sm"
              >
                <span className="font-medium">{f.nombre_completo}</span>
                <span className="text-xs text-muted-foreground">
                  {f.documento ?? ''}
                  {f.modalidad_pago && ` · ${f.modalidad_pago}`}
                </span>
              </div>
            ))}
          </div>

          {/* Formulario de novedad */}
          <div className="grid gap-3">
            <div>
              <Label htmlFor="motivo-faltantes">Motivo de la ausencia</Label>
              <Select value={motivoNombre} onValueChange={setMotivoNombre}>
                <SelectTrigger id="motivo-faltantes">
                  <SelectValue placeholder="Selecciona un motivo del catálogo..." />
                </SelectTrigger>
                <SelectContent>
                  {motivosOpciones.map((nombre) => (
                    <SelectItem key={nombre} value={nombre}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                El mismo motivo se aplica a todos. Los que ya tuvieran novedad ese día se omiten.
              </p>
            </div>
            <div>
              <Label htmlFor="obs-faltantes">Observación (opcional)</Label>
              <Textarea
                id="obs-faltantes"
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder="Ej: No se presentaron; sin aviso."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={cerrarSinRegistrar} disabled={guardando}>
            Cerrar sin registrar
          </Button>
          <Button onClick={registrar} disabled={guardando || !motivoNombre}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar novedad para todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
