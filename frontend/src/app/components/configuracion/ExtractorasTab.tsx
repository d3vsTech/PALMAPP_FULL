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

type Extractora = {
  id: string;
  nombre: string;
  nit: string;
  contacto: string;
};

export function ExtractorasTab() {
  const [extractoras, setExtractoras] = useState<Extractora[]>([
    { id: '1', nombre: 'Extractora del Cauca S.A.', nit: '800.123.456-1', contacto: '+57 300 111 2222' },
    { id: '2', nombre: 'Palmas del Valle', nit: '800.234.567-2', contacto: '+57 300 222 3333' },
    { id: '3', nombre: 'Industrial Palmera', nit: '800.345.678-3', contacto: '+57 300 333 4444' }
  ]);

  const [openModal, setOpenModal] = useState(false);
  const [extractoraEdit, setExtractoraEdit] = useState<Extractora | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    contacto: ''
  });

  const handleOpenModal = (extractora?: Extractora) => {
    if (extractora) {
      setExtractoraEdit(extractora);
      setFormData({
        nombre: extractora.nombre,
        nit: extractora.nit,
        contacto: extractora.contacto
      });
    } else {
      setExtractoraEdit(null);
      setFormData({ nombre: '', nit: '', contacto: '' });
    }
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      toast.error('Ingresa el nombre de la extractora');
      return;
    }

    if (extractoraEdit) {
      setExtractoras((prev) =>
        prev.map((e) =>
          e.id === extractoraEdit.id ? { ...e, ...formData } : e
        )
      );
      toast.success('Extractora actualizada');
    } else {
      setExtractoras((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...formData
        },
      ]);
      toast.success('Extractora agregada correctamente');
    }

    setOpenModal(false);
  };

  const eliminarExtractora = (id: string) => {
    setExtractoras(extractoras.filter(e => e.id !== id));
    toast.success('Extractora eliminada correctamente');
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {extractoraEdit ? 'Editar Extractora' : 'Nueva Extractora'}
            </DialogTitle>
            <DialogDescription>
              Planta extractora de aceite de palma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Extractora <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Extractora del Cauca S.A."
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nit">NIT (Opcional)</Label>
              <Input
                id="nit"
                placeholder="800.123.456-1"
                value={formData.nit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nit: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto">Contacto (Opcional)</Label>
              <Input
                id="contacto"
                placeholder="+57 300 111 2222"
                value={formData.contacto}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contacto: e.target.value }))
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

      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extractoras</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Plantas extractoras de aceite de palma</p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Extractora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {extractoras.map((extractora) => (
              <div
                key={extractora.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex-1">
                  <p className="font-semibold">{extractora.nombre}</p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    {extractora.nit && <span>NIT: {extractora.nit}</span>}
                    {extractora.contacto && <span>Contacto: {extractora.contacto}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(extractora)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarExtractora(extractora.id)}
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
