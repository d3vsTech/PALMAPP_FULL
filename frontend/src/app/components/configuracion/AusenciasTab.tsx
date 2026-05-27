import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
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
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type MotivoAusencia,
  type MotivoAusenciaPayload,
  type TipoBaseAusencia,
} from '../../../api/configuracion';

/**
 * Tab "Novedades / Motivos de Ausencia" conectado al API real (§17 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/motivos-ausencia        → listado paginado
 *   POST   /api/v1/tenant/motivos-ausencia        → crear
 *   PUT    /api/v1/tenant/motivos-ausencia/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/motivos-ausencia/{id}   → eliminar (409 si tiene ausencias)
 */

const TIPOS_BASE: { value: TipoBaseAusencia; label: string }[] = [
  { value: 'INCAPACIDAD_EPS', label: 'Incapacidad EPS' },
  { value: 'INCAPACIDAD_ARL', label: 'Incapacidad ARL' },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia de Maternidad' },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia de Paternidad' },
  { value: 'LICENCIA_LUTO', label: 'Licencia de Luto' },
  { value: 'PERMISO_REMUNERADO', label: 'Permiso Remunerado' },
  { value: 'PERMISO_NO_REMUNERADO', label: 'Permiso No Remunerado' },
  { value: 'AUSENCIA_INJUSTIFICADA', label: 'Ausencia Injustificada' },
  { value: 'CALAMIDAD_DOMESTICA', label: 'Calamidad Doméstica' },
  { value: 'SUSPENSION_DISCIPLINARIA', label: 'Suspensión Disciplinaria' },
  { value: 'OTRO', label: 'Otro' },
];

const FORM_VACIO = {
  nombre: '',
  tipo_base: 'OTRO' as TipoBaseAusencia,
  es_remunerada: false,
  afecta_nomina: false,
  porcentaje_pago_default: '100',
  requiere_soporte: false,
  color: '#3b82f6',
};

export function AusenciasTab() {
  const [motivos, setMotivos] = useState<MotivoAusencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [motivoEdit, setMotivoEdit] = useState<MotivoAusencia | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [motivoAEliminar, setMotivoAEliminar] = useState<MotivoAusencia | null>(null);

  const cargar = () => {
    setCargando(true);
    configuracionApi.motivosAusencia
      .listar({ per_page: 100 })
      .then((res) => setMotivos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los motivos de ausencia'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (motivo?: MotivoAusencia) => {
    if (motivo) {
      setMotivoEdit(motivo);
      setFormData({
        nombre: motivo.nombre,
        tipo_base: motivo.tipo_base,
        es_remunerada: motivo.es_remunerada,
        afecta_nomina: motivo.afecta_nomina,
        porcentaje_pago_default: String(motivo.porcentaje_pago_default),
        requiere_soporte: motivo.requiere_soporte,
        color: motivo.color,
      });
    } else {
      setMotivoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('Ingresa el nombre del tipo de novedad');
      return;
    }

    setGuardando(true);
    try {
      const payload: MotivoAusenciaPayload = {
        nombre: formData.nombre.trim(),
        tipo_base: formData.tipo_base,
        es_remunerada: formData.es_remunerada,
        afecta_nomina: formData.afecta_nomina,
        porcentaje_pago_default: Number(formData.porcentaje_pago_default),
        requiere_soporte: formData.requiere_soporte,
        color: formData.color,
      };
      if (motivoEdit) {
        const res = await configuracionApi.motivosAusencia.editar(motivoEdit.id, payload);
        setMotivos((prev) => prev.map((m) => (m.id === motivoEdit.id ? res.data : m)));
        toast.success(res.message ?? 'Tipo de novedad actualizado');
      } else {
        const res = await configuracionApi.motivosAusencia.crear(payload);
        setMotivos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Tipo de novedad creado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el tipo de novedad');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (motivo: MotivoAusencia) => {
    try {
      const res = await configuracionApi.motivosAusencia.editar(motivo.id, { estado: !motivo.estado });
      setMotivos((prev) => prev.map((m) => (m.id === motivo.id ? res.data : m)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!motivoAEliminar) return;
    try {
      await configuracionApi.motivosAusencia.eliminar(motivoAEliminar.id);
      setMotivos((prev) => prev.filter((m) => m.id !== motivoAEliminar.id));
      toast.success('Tipo de novedad eliminado');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.MOTIVO_CON_AUSENCIAS) {
        toast.error('No se puede eliminar: tiene ausencias asociadas');
      } else {
        toast.error(e?.message ?? 'No se pudo eliminar el tipo de novedad');
      }
    } finally {
      setMotivoAEliminar(null);
    }
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {motivoEdit ? 'Editar Tipo de Novedad' : 'Nuevo Tipo de Novedad'}
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
              <Label htmlFor="tipoBase">
                Tipo Base <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipo_base}
                onValueChange={(value: TipoBaseAusencia) =>
                  setFormData((prev) => ({ ...prev, tipo_base: value }))
                }
              >
                <SelectTrigger id="tipoBase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_BASE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porcentaje">Porcentaje de Pago</Label>
              <div className="relative">
                <Input
                  id="porcentaje"
                  type="number"
                  placeholder="100"
                  value={formData.porcentaje_pago_default}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, porcentaje_pago_default: e.target.value }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-16 p-1"
                />
                <span className="text-sm text-muted-foreground font-mono">{formData.color}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="es_remunerada">Es remunerada</Label>
                <Switch
                  id="es_remunerada"
                  checked={formData.es_remunerada}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, es_remunerada: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="afecta_nomina">Afecta la nómina</Label>
                <Switch
                  id="afecta_nomina"
                  checked={formData.afecta_nomina}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, afecta_nomina: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requiere_soporte">Requiere soporte</Label>
                <Switch
                  id="requiere_soporte"
                  checked={formData.requiere_soporte}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, requiere_soporte: checked }))
                  }
                />
              </div>
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
        open={!!motivoAEliminar}
        onOpenChange={(open) => !open && setMotivoAEliminar(null)}
        title="Eliminar tipo de novedad"
        description={`¿Estás seguro de eliminar "${motivoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando tipos de novedades...
            </div>
          ) : motivos.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No hay tipos de novedades registrados
            </div>
          ) : (
            <div className="space-y-3">
              {motivos.map((motivo) => (
                <div
                  key={motivo.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: motivo.color }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{motivo.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {motivo.afecta_nomina ? 'Afecta el pago de nómina' : 'No afecta el pago de nómina'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={motivo.estado}
                      onCheckedChange={() => handleToggleEstado(motivo)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(motivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMotivoAEliminar(motivo)}
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
