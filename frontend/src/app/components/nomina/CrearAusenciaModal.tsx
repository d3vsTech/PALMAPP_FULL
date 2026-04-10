import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserX, Calendar } from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface Ausencia {
  id?: string;
  colaboradorId: string;
  fecha: string;
  motivo: string;
}

interface CrearAusenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ausencia?: Ausencia;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string }>;
  onSave: (ausencia: Ausencia) => void;
}

export function CrearAusenciaModal({
  isOpen,
  onClose,
  ausencia,
  colaboradores,
  onSave,
}: CrearAusenciaModalProps) {
  const [formData, setFormData] = useState<Ausencia>({
    colaboradorId: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: '',
  });

  useEffect(() => {
    if (ausencia) {
      setFormData(ausencia);
    } else {
      setFormData({
        colaboradorId: '',
        fecha: new Date().toISOString().split('T')[0],
        motivo: '',
      });
    }
  }, [ausencia, isOpen]);

  const handleInputChange = (field: keyof Ausencia, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.colaboradorId) {
      alert('Debes seleccionar un colaborador');
      return;
    }
    if (!formData.fecha) {
      alert('La fecha es obligatoria');
      return;
    }

    onSave(formData);
    onClose();
  };

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === formData.colaboradorId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            {ausencia ? 'Editar Ausencia' : 'Registrar Ausencia'}
          </DialogTitle>
          <DialogDescription>
            {ausencia
              ? 'Modifica la información de la ausencia'
              : 'Registra una ausencia laboral'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Colaborador */}
          <div className="space-y-2">
            <Label htmlFor="colaborador" className="text-sm font-medium">
              Colaborador <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.colaboradorId}
              onValueChange={(value) => handleInputChange('colaboradorId', value)}
            >
              <SelectTrigger id="colaborador">
                <SelectValue placeholder="Selecciona un colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nombres} {colaborador.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-sm font-medium">
              Fecha <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => handleInputChange('fecha', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo
            </Label>
            <Textarea
              id="motivo"
              placeholder="Inasistencia sin justificación, abandono del puesto, etc."
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
              rows={3}
            />
          </div>

          {/* Resumen */}
          {colaboradorSeleccionado && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Ausencia registrada para{' '}
                <span className="font-semibold text-foreground">
                  {colaboradorSeleccionado.nombres} {colaboradorSeleccionado.apellidos}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta ausencia afectará el cálculo de nómina del período.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-destructive hover:bg-destructive/90">
            {ausencia ? 'Guardar Cambios' : 'Registrar Ausencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
