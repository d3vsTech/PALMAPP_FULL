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
import { Textarea } from '../ui/textarea';
import { MapPin } from 'lucide-react';

interface Predio {
  id: string;
  nombre: string;
  ubicacion?: string;
  hectareas: number;
  lotes: number;
  notas?: string;
}

interface CrearEditarPredioModalProps {
  isOpen: boolean;
  onClose: () => void;
  predio?: Predio;
  onSave: (predio: Partial<Predio>) => void;
}

export function CrearEditarPredioModal({
  isOpen,
  onClose,
  predio,
  onSave,
}: CrearEditarPredioModalProps) {
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [hectareas, setHectareas] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (predio) {
      setNombre(predio.nombre);
      setUbicacion(predio.ubicacion || '');
      setHectareas(predio.hectareas.toString());
      setNotas(predio.notas || '');
    } else {
      setNombre('');
      setUbicacion('');
      setHectareas('');
      setNotas('');
    }
  }, [predio, isOpen]);

  const handleSave = () => {
    if (!nombre.trim()) {
      alert('El nombre del predio es obligatorio');
      return;
    }

    if (!hectareas.trim() || isNaN(Number(hectareas)) || Number(hectareas) <= 0) {
      alert('Las hectáreas totales deben ser un número válido mayor a 0');
      return;
    }

    onSave({
      id: predio?.id,
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim(),
      hectareas: Number(hectareas),
      lotes: predio?.lotes || 0,
      notas: notas.trim(),
    });

    handleClose();
  };

  const handleClose = () => {
    setNombre('');
    setUbicacion('');
    setHectareas('');
    setNotas('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {predio ? 'Editar Predio' : 'Crear Nuevo Predio'}
          </DialogTitle>
          <DialogDescription>
            {predio
              ? 'Modifica la información del predio existente'
              : 'Ingresa la información básica del nuevo predio'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium">
              Nombre del Predio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Puerto Arturo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion" className="text-sm font-medium">
              Ubicación
            </Label>
            <Input
              id="ubicacion"
              placeholder="Ej: Vereda El Silencio, Municipio Palmira"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hectareas" className="text-sm font-medium">
              Hectáreas Totales <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hectareas"
              type="number"
              placeholder="Ej: 250"
              value={hectareas}
              onChange={(e) => setHectareas(e.target.value)}
              min="0"
              step="0.01"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas" className="text-sm font-medium">
              Notas (opcional)
            </Label>
            <Textarea
              id="notas"
              placeholder="Notas adicionales sobre el predio..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {predio ? 'Guardar Cambios' : 'Crear Predio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}