import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  configuracionApi,
  type EntidadBancaria,
} from '../../../api/configuracion';

/**
 * Tab "Entidades Bancarias" conectado al API real (§12 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/entidades-bancarias        → listado paginado
 *   POST   /api/v1/tenant/entidades-bancarias        → crear
 *   PUT    /api/v1/tenant/entidades-bancarias/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/entidades-bancarias/{id}   → eliminar
 *
 * `codigo` y `contacto` son opcionales (pueden ir null).
 */

const FORM_VACIO = { nombre: '', codigo: '', contacto: '' };

export function EntidadesBancariasTab() {
  const [entidades, setEntidades] = useState<EntidadBancaria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [entidadEdit, setEntidadEdit] = useState<EntidadBancaria | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [entidadAEliminar, setEntidadAEliminar] = useState<EntidadBancaria | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    configuracionApi.entidadesBancarias
      .listar({ per_page: 100 })
      .then((res) => {
        if (!cancelado) setEntidades(res.data);
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las entidades bancarias');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleOpenModal = (entidad?: EntidadBancaria) => {
    if (entidad) {
      setEntidadEdit(entidad);
      setFormData({
        nombre: entidad.nombre,
        codigo: entidad.codigo ?? '',
        contacto: entidad.contacto ?? '',
      });
    } else {
      setEntidadEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('Ingresa el nombre de la entidad bancaria');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim() || null,
        contacto: formData.contacto.trim() || null,
      };
      if (entidadEdit) {
        const res = await configuracionApi.entidadesBancarias.editar(entidadEdit.id, payload);
        setEntidades((prev) => prev.map((e) => (e.id === entidadEdit.id ? res.data : e)));
        toast.success(res.message ?? 'Entidad bancaria actualizada');
      } else {
        const res = await configuracionApi.entidadesBancarias.crear(payload);
        setEntidades((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Entidad bancaria agregada correctamente');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la entidad bancaria');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (entidad: EntidadBancaria) => {
    try {
      const res = await configuracionApi.entidadesBancarias.editar(entidad.id, {
        estado: !entidad.estado,
      });
      setEntidades((prev) => prev.map((e) => (e.id === entidad.id ? res.data : e)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!entidadAEliminar) return;
    try {
      await configuracionApi.entidadesBancarias.eliminar(entidadAEliminar.id);
      setEntidades((prev) => prev.filter((e) => e.id !== entidadAEliminar.id));
      toast.success('Entidad bancaria eliminada correctamente');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar la entidad bancaria');
    } finally {
      setEntidadAEliminar(null);
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entidadEdit ? 'Editar Entidad Bancaria' : 'Nueva Entidad Bancaria'}
            </DialogTitle>
            <DialogDescription>
              Banco o entidad financiera
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Entidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Bancolombia"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código Bancario (Opcional)</Label>
              <Input
                id="codigo"
                placeholder="001"
                value={formData.codigo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, codigo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto">Contacto (Opcional)</Label>
              <Input
                id="contacto"
                placeholder="01-8000-912345"
                value={formData.contacto}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contacto: e.target.value }))
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
        open={!!entidadAEliminar}
        onOpenChange={(open) => !open && setEntidadAEliminar(null)}
        title="Eliminar entidad bancaria"
        description={`¿Estás seguro de eliminar "${entidadAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entidades Bancarias</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Bancos y entidades financieras</p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Entidad
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando entidades bancarias...
            </div>
          ) : entidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              No hay entidades bancarias registradas
            </div>
          ) : (
            <div className="space-y-3">
              {entidades.map((entidad) => (
                <div
                  key={entidad.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{entidad.nombre}</p>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      {entidad.codigo && <span>Código: {entidad.codigo}</span>}
                      {entidad.contacto && <span>Contacto: {entidad.contacto}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={entidad.estado}
                      onCheckedChange={() => handleToggleEstado(entidad)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(entidad)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEntidadAEliminar(entidad)}
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
