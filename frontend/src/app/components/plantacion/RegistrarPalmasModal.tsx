import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Sprout, Plus, Trash2 } from 'lucide-react';

interface Palma {
  id?: string;
  descripcion: string;
  estado: 'Activa' | 'Inactiva';
}

interface RegistrarPalmasModalProps {
  isOpen: boolean;
  onClose: () => void;
  subloteId: string;
  subloteNombre: string;
  onSave: (palmas: Palma[]) => void;
}

export function RegistrarPalmasModal({
  isOpen,
  onClose,
  subloteId,
  subloteNombre,
  onSave,
}: RegistrarPalmasModalProps) {
  const [palmas, setPalmas] = useState<Palma[]>([
    { descripcion: '', estado: 'Activa' },
  ]);

  const agregarPalma = () => {
    setPalmas([...palmas, { descripcion: '', estado: 'Activa' }]);
  };

  const eliminarPalma = (index: number) => {
    if (palmas.length > 1) {
      setPalmas(palmas.filter((_, i) => i !== index));
    }
  };

  const actualizarPalma = (index: number, campo: keyof Palma, valor: string) => {
    const nuevasPalmas = [...palmas];
    if (campo === 'estado') {
      nuevasPalmas[index][campo] = valor as 'Activa' | 'Inactiva';
    } else {
      nuevasPalmas[index][campo] = valor;
    }
    setPalmas(nuevasPalmas);
  };

  const handleSave = () => {
    const palmasValidas = palmas.filter((p) => p.descripcion.trim() !== '');
    
    if (palmasValidas.length === 0) {
      alert('Debes agregar al menos una palma con descripción');
      return;
    }

    onSave(palmasValidas);
    handleClose();
  };

  const handleClose = () => {
    setPalmas([{ descripcion: '', estado: 'Activa' }]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-success" />
            Registrar Palmas
          </DialogTitle>
          <DialogDescription>
            Registra nuevas palmas para el sublote: <strong>{subloteNombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Header de la tabla */}
          <div className="grid grid-cols-12 gap-2 px-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Descripción</div>
            <div className="col-span-3">Estado</div>
            <div className="col-span-1"></div>
          </div>

          {/* Lista de palmas */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {palmas.map((palma, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border bg-card"
              >
                {/* Número */}
                <div className="col-span-1 flex items-center justify-center h-10">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                </div>

                {/* Descripción */}
                <div className="col-span-7">
                  <Textarea
                    placeholder="Ej: Palma ubicada en la esquina norte del sublote"
                    value={palma.descripcion}
                    onChange={(e) =>
                      actualizarPalma(index, 'descripcion', e.target.value)
                    }
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Estado */}
                <div className="col-span-3">
                  <Select
                    value={palma.estado}
                    onValueChange={(value) =>
                      actualizarPalma(index, 'estado', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activa">Activa</SelectItem>
                      <SelectItem value="Inactiva">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón eliminar */}
                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarPalma(index)}
                    disabled={palmas.length === 1}
                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Botón agregar palma */}
          <Button
            variant="outline"
            onClick={agregarPalma}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar otra palma
          </Button>

          {/* Resumen */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm">
              <strong className="text-primary">Total de palmas a registrar:</strong>{' '}
              {palmas.filter((p) => p.descripcion.trim() !== '').length}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-success hover:bg-success/90">
            Registrar {palmas.filter((p) => p.descripcion.trim() !== '').length} Palma(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
