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
import { Switch } from '../ui/switch';
import { Grid } from 'lucide-react';

interface Sublote {
  id: string;
  nombre: string;
  cantidadPalmas: number;
  estado: 'Activo' | 'Inactivo';
}

interface CrearEditarSubloteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sublote?: Sublote;
  onSave: (sublote: Partial<Sublote>) => void;
}

export function CrearEditarSubloteModal({
  isOpen,
  onClose,
  sublote,
  onSave,
}: CrearEditarSubloteModalProps) {
  const [nombre, setNombre] = useState('');
  const [cantidadPalmas, setCantidadPalmas] = useState('');
  const [estado, setEstado] = useState(true);

  useEffect(() => {
    if (sublote) {
      setNombre(sublote.nombre);
      setCantidadPalmas(sublote.cantidadPalmas.toString());
      setEstado(sublote.estado === 'Activo');
    } else {
      setNombre('');
      setCantidadPalmas('');
      setEstado(true);
    }
  }, [sublote, isOpen]);

  const handleSave = () => {
    if (!nombre.trim()) {
      alert('El nombre del sublote es obligatorio');
      return;
    }
    if (!cantidadPalmas || parseInt(cantidadPalmas) <= 0) {
      alert('Ingresa una cantidad de palmas válida');
      return;
    }

    onSave({
      id: sublote?.id,
      nombre: nombre.trim(),
      cantidadPalmas: parseInt(cantidadPalmas),
      estado: estado ? 'Activo' : 'Inactivo',
    });

    handleClose();
  };

  const handleClose = () => {
    setNombre('');
    setCantidadPalmas('');
    setEstado(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5 text-primary" />
            {sublote ? 'Editar Sublote' : 'Crear Nuevo Sublote'}
          </DialogTitle>
          <DialogDescription>
            {sublote
              ? 'Modifica la información del sublote'
              : 'Define la estructura de un nuevo sublote dentro de este lote'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium">
              Nombre del Sublote <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Sector A, Norte, Zona 1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="palmas" className="text-sm font-medium">
              Cantidad de Palmas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="palmas"
              type="number"
              placeholder="250"
              min="1"
              value={cantidadPalmas}
              onChange={(e) => setCantidadPalmas(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Número total de palmas que contendrá este sublote
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="estado" className="text-sm font-medium">
                Estado del Sublote
              </Label>
              <p className="text-xs text-muted-foreground">
                {estado ? 'El sublote está activo' : 'El sublote está inactivo'}
              </p>
            </div>
            <Switch
              id="estado"
              checked={estado}
              onCheckedChange={setEstado}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {sublote ? 'Guardar Cambios' : 'Crear Sublote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
