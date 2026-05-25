import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type TipoAusencia = {
  id: string;
  nombre: string;
  afectaPago: boolean;
  color: string;
};

export function AusenciasTab() {
  const [tiposAusencias, setTiposAusencias] = useState<TipoAusencia[]>([
    { id: '1', nombre: 'Incapacidad Médica', afectaPago: false, color: 'bg-blue-500' },
    { id: '2', nombre: 'Licencia de Maternidad', afectaPago: false, color: 'bg-pink-500' },
    { id: '3', nombre: 'Licencia de Paternidad', afectaPago: false, color: 'bg-purple-500' },
    { id: '4', nombre: 'Calamidad Doméstica', afectaPago: false, color: 'bg-orange-500' },
    { id: '5', nombre: 'Permiso No Remunerado', afectaPago: true, color: 'bg-red-500' },
    { id: '6', nombre: 'Vacaciones', afectaPago: false, color: 'bg-green-500' },
    { id: '7', nombre: 'Ausencia Injustificada', afectaPago: true, color: 'bg-gray-500' }
  ]);

  const [openModal, setOpenModal] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<TipoAusencia | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    afectaPago: 'no',
    color: 'bg-blue-500'
  });

  const coloresDisponibles = [
    { value: 'bg-blue-500', label: 'Azul' },
    { value: 'bg-green-500', label: 'Verde' },
    { value: 'bg-red-500', label: 'Rojo' },
    { value: 'bg-yellow-500', label: 'Amarillo' },
    { value: 'bg-purple-500', label: 'Morado' },
    { value: 'bg-pink-500', label: 'Rosa' },
    { value: 'bg-orange-500', label: 'Naranja' },
    { value: 'bg-gray-500', label: 'Gris' }
  ];

  const handleOpenModal = (tipo?: TipoAusencia) => {
    if (tipo) {
      setTipoEdit(tipo);
      setFormData({
        nombre: tipo.nombre,
        afectaPago: tipo.afectaPago ? 'si' : 'no',
        color: tipo.color
      });
    } else {
      setTipoEdit(null);
      setFormData({ nombre: '', afectaPago: 'no', color: 'bg-blue-500' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      toast.error('Ingresa el nombre del tipo de novedad');
      return;
    }

    if (tipoEdit) {
      setTiposAusencias((prev) =>
        prev.map((t) =>
          t.id === tipoEdit.id
            ? { ...t, nombre: formData.nombre, afectaPago: formData.afectaPago === 'si', color: formData.color }
            : t
        )
      );
      toast.success('Tipo de novedad actualizado');
    } else {
      setTiposAusencias((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          nombre: formData.nombre.trim(),
          afectaPago: formData.afectaPago === 'si',
          color: formData.color
        },
      ]);
      toast.success('Tipo de novedad agregado');
    }

    setOpenModal(false);
  };

  const eliminarTipo = (id: string) => {
    setTiposAusencias(tiposAusencias.filter(t => t.id !== id));
    toast.success('Tipo de novedad eliminado');
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tipoEdit ? 'Editar Tipo de Novedad' : 'Nuevo Tipo de Novedad'}
            </DialogTitle>
            <DialogDescription>
              Configura permisos, incapacidades y novedades
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre del Tipo de Novedad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Permiso Personal"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="afectaPago">¿Afecta el Pago?</Label>
              <Select value={formData.afectaPago} onValueChange={(value) => setFormData((prev) => ({ ...prev, afectaPago: value }))}>
                <SelectTrigger id="afectaPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No afecta el pago</SelectItem>
                  <SelectItem value="si">Sí afecta el pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {coloresDisponibles.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Novedades</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Configuración de permisos, incapacidades y novedades</p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {tiposAusencias.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-4 w-4 rounded-full ${tipo.color}`} />
                  <div className="flex-1">
                    <p className="font-semibold">{tipo.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {tipo.afectaPago ? 'Afecta el pago de nómina' : 'No afecta el pago de nómina'}
                    </p>
                  </div>
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
    </>
  );
}
