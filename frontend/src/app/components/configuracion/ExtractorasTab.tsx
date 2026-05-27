import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Plus, Trash2, Edit, Factory, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { extractorasApi, type Extractora } from '../../../api/viajes';

const FORM_VACIO = {
  razon_social: '',
  nit: '',
  ubicacion: '',
  ciudad: '',
  telefono: '',
  email: '',
  contacto_nombre: '',
  distancia_km: '',
  observaciones: '',
};

export function ExtractorasTab() {
  const [extractoras, setExtractoras] = useState<Extractora[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [extractoraEdit, setExtractoraEdit] = useState<Extractora | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [extractoraAEliminar, setExtractoraAEliminar] = useState<Extractora | null>(null);

  const cargar = () => {
    setCargando(true);
    extractorasApi
      .listar({ per_page: 100 })
      .then((res) => setExtractoras(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las extractoras'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (extractora?: Extractora) => {
    if (extractora) {
      setExtractoraEdit(extractora);
      setFormData({
        razon_social: extractora.razon_social ?? '',
        nit: extractora.nit ?? '',
        ubicacion: extractora.ubicacion ?? '',
        ciudad: extractora.ciudad ?? '',
        telefono: extractora.telefono ?? '',
        email: extractora.email ?? '',
        contacto_nombre: extractora.contacto_nombre ?? '',
        distancia_km: extractora.distancia_km != null ? String(extractora.distancia_km) : '',
        observaciones: extractora.observaciones ?? '',
      });
    } else {
      setExtractoraEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.razon_social.trim()) {
      toast.error('Ingresa la razón social de la extractora');
      return;
    }
    if (!formData.nit.trim()) {
      toast.error('Ingresa el NIT de la extractora');
      return;
    }

    setGuardando(true);
    try {
      const payload: Partial<Extractora> = {
        razon_social: formData.razon_social.trim(),
        nit: formData.nit.trim(),
        ubicacion: formData.ubicacion.trim(),
        ciudad: formData.ciudad.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        contacto_nombre: formData.contacto_nombre.trim() || null,
        distancia_km: formData.distancia_km.trim() ? Number(formData.distancia_km) : null,
        observaciones: formData.observaciones.trim() || null,
      };

      if (extractoraEdit) {
        const res = await extractorasApi.editar(extractoraEdit.id, payload);
        setExtractoras((prev) => prev.map((e) => (e.id === extractoraEdit.id ? res.data : e)));
        toast.success(res.message ?? 'Extractora actualizada');
      } else {
        const res = await extractorasApi.crear(payload);
        setExtractoras((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Extractora agregada correctamente');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors?.nit) {
        toast.error(e.errors.nit[0] ?? 'Ya existe una extractora con este NIT');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('nit')) {
        toast.error('Ya existe una extractora con este NIT');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la extractora');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (extractora: Extractora) => {
    try {
      const res = await extractorasApi.editar(extractora.id, { estado: !extractora.estado });
      setExtractoras((prev) => prev.map((e) => (e.id === extractora.id ? res.data : e)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!extractoraAEliminar) return;
    try {
      await extractorasApi.eliminar(extractoraAEliminar.id);
      setExtractoras((prev) => prev.filter((e) => e.id !== extractoraAEliminar.id));
      toast.success('Extractora eliminada correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar la extractora');
    } finally {
      setExtractoraAEliminar(null);
    }
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
              <Label htmlFor="razon_social">
                Razón Social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="razon_social"
                placeholder="Ej: Extractora del Cauca S.A."
                value={formData.razon_social}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, razon_social: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nit">
                  NIT <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="distancia_km">Distancia (km)</Label>
                <Input
                  id="distancia_km"
                  type="number"
                  placeholder="0"
                  value={formData.distancia_km}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, distancia_km: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                placeholder="Dirección de la planta"
                value={formData.ubicacion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ubicacion: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  placeholder="Ciudad"
                  value={formData.ciudad}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ciudad: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="+57 300 111 2222"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@extractora.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto_nombre">Contacto</Label>
                <Input
                  id="contacto_nombre"
                  placeholder="Nombre del contacto"
                  value={formData.contacto_nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contacto_nombre: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales"
                value={formData.observaciones}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observaciones: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!extractoraAEliminar}
        onOpenChange={(open) => !open && setExtractoraAEliminar(null)}
        title="Eliminar extractora"
        description={`¿Estás seguro de eliminar "${extractoraAEliminar?.razon_social}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando extractoras...
            </div>
          ) : extractoras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay extractoras registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {extractoras.map((extractora) => (
                <div
                  key={extractora.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{extractora.razon_social}</p>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                      {extractora.nit && <span>NIT: {extractora.nit}</span>}
                      {extractora.ciudad && <span>Ciudad: {extractora.ciudad}</span>}
                      {extractora.telefono && <span>Tel: {extractora.telefono}</span>}
                      {extractora.distancia_km != null && extractora.distancia_km !== '' && (
                        <span>Distancia: {extractora.distancia_km} km</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={extractora.estado ?? false}
                      onCheckedChange={() => handleToggleEstado(extractora)}
                    />
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
                      onClick={() => setExtractoraAEliminar(extractora)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
