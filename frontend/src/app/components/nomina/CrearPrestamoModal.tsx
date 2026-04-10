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
import { DollarSign, Calendar } from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface Prestamo {
  id?: string;
  colaboradorId: string;
  fecha: string;
  valor: number;
  observaciones: string;
}

interface CrearPrestamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestamo?: Prestamo;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string }>;
  onSave: (prestamo: Prestamo) => void;
}

export function CrearPrestamoModal({
  isOpen,
  onClose,
  prestamo,
  colaboradores,
  onSave,
}: CrearPrestamoModalProps) {
  const [formData, setFormData] = useState<Prestamo>({
    colaboradorId: '',
    fecha: new Date().toISOString().split('T')[0],
    valor: 0,
    observaciones: '',
  });

  useEffect(() => {
    if (prestamo) {
      setFormData(prestamo);
    } else {
      setFormData({
        colaboradorId: '',
        fecha: new Date().toISOString().split('T')[0],
        valor: 0,
        observaciones: '',
      });
    }
  }, [prestamo, isOpen]);

  const handleInputChange = (field: keyof Prestamo, value: string | number) => {
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
    if (!formData.valor || formData.valor <= 0) {
      alert('El valor debe ser mayor a 0');
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
            <DollarSign className="h-5 w-5 text-primary" />
            {prestamo ? 'Editar Préstamo' : 'Registrar Préstamo'}
          </DialogTitle>
          <DialogDescription>
            {prestamo
              ? 'Modifica la información del préstamo'
              : 'Registra un préstamo al colaborador'}
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

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor" className="text-sm font-medium">
              Valor del Préstamo <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="valor"
                type="number"
                placeholder="50000"
                value={formData.valor || ''}
                onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
            {formData.valor > 0 && (
              <p className="text-xs text-muted-foreground">
                ${formData.valor.toLocaleString('es-CO')}
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-sm font-medium">
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              placeholder="Motivo del préstamo, forma de pago, etc."
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              rows={3}
            />
          </div>

          {/* Resumen */}
          {colaboradorSeleccionado && formData.valor > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">
                Préstamo de{' '}
                <span className="font-bold text-foreground">
                  ${formData.valor.toLocaleString('es-CO')}
                </span>{' '}
                para{' '}
                <span className="font-semibold text-foreground">
                  {colaboradorSeleccionado.nombres} {colaboradorSeleccionado.apellidos}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {prestamo ? 'Guardar Cambios' : 'Registrar Préstamo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
