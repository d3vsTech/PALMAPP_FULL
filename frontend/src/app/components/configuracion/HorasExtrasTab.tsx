import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type TipoHoraExtra = {
  id: string;
  nombre: string;
  porcentaje: number;
  descripcion: string;
};

export function HorasExtrasTab() {
  const [tiposHorasExtras, setTiposHorasExtras] = useState<TipoHoraExtra[]>([
    { id: '1', nombre: 'Hora Extra Diurna', porcentaje: 25, descripcion: 'Lunes a sábado 6:00 AM - 9:00 PM' },
    { id: '2', nombre: 'Hora Extra Nocturna', porcentaje: 75, descripcion: 'Lunes a sábado 9:00 PM - 6:00 AM' },
    { id: '3', nombre: 'Hora Extra Dominical/Festiva Diurna', porcentaje: 100, descripcion: 'Domingos y festivos 6:00 AM - 9:00 PM' },
    { id: '4', nombre: 'Hora Extra Dominical/Festiva Nocturna', porcentaje: 150, descripcion: 'Domingos y festivos 9:00 PM - 6:00 AM' }
  ]);

  const [horasSemanales, setHorasSemanales] = useState('48');
  const [openModal, setOpenModal] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<TipoHoraExtra | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    porcentaje: '',
    descripcion: ''
  });

  const handleOpenModal = (tipo?: TipoHoraExtra) => {
    if (tipo) {
      setTipoEdit(tipo);
      setFormData({
        nombre: tipo.nombre,
        porcentaje: tipo.porcentaje.toString(),
        descripcion: tipo.descripcion
      });
    } else {
      setTipoEdit(null);
      setFormData({ nombre: '', porcentaje: '', descripcion: '' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre.trim() || !formData.porcentaje.trim()) {
      toast.error('Completa el nombre y porcentaje');
      return;
    }

    if (tipoEdit) {
      setTiposHorasExtras((prev) =>
        prev.map((t) =>
          t.id === tipoEdit.id ? { ...t, ...formData, porcentaje: parseFloat(formData.porcentaje) } : t
        )
      );
      toast.success('Tipo de hora extra actualizado');
    } else {
      setTiposHorasExtras((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          nombre: formData.nombre.trim(),
          porcentaje: parseFloat(formData.porcentaje),
          descripcion: formData.descripcion.trim()
        },
      ]);
      toast.success('Tipo de hora extra agregado');
    }

    setOpenModal(false);
  };

  const eliminarTipo = (id: string) => {
    setTiposHorasExtras(tiposHorasExtras.filter(t => t.id !== id));
    toast.success('Tipo de hora extra eliminado');
  };

  return (
    <div className="space-y-6">
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tipoEdit ? 'Editar Tipo de Hora Extra' : 'Nuevo Tipo de Hora Extra'}
            </DialogTitle>
            <DialogDescription>
              Define el recargo sobre el valor hora ordinaria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Hora Extra Nocturna"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="porcentaje">
                Porcentaje de Recargo <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="porcentaje"
                  type="number"
                  placeholder="25"
                  value={formData.porcentaje}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, porcentaje: e.target.value }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (Opcional)</Label>
              <Input
                id="descripcion"
                placeholder="Ej: Lunes a sábado 9:00 PM - 6:00 AM"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Horas Semanales */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Jornada Laboral Semanal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Número de horas ordinarias por semana</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="horasSemanales">Horas Semanales *</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                id="horasSemanales"
                type="number"
                value={horasSemanales}
                onChange={(e) => setHorasSemanales(e.target.value)}
                className="text-2xl font-bold text-center"
              />
              <span className="text-lg font-medium text-muted-foreground">horas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Según legislación colombiana: 48 horas semanales
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Horas Extras */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Horas Extras</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Recargos sobre el valor hora ordinaria</p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {tiposHorasExtras.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{tipo.nombre}</p>
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-bold">
                      +{tipo.porcentaje}%
                    </span>
                  </div>
                  {tipo.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{tipo.descripcion}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(tipo)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarTipo(tipo.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
