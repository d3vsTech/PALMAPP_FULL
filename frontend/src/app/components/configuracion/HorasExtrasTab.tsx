import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type TipoHoraExtra,
  type TipoHoraExtraPayload,
  type FranjaHoraria,
} from '../../../api/configuracion';

/**
 * Tab "Horas Extras" conectado al API real (§11 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET    /api/v1/tenant/tipos-hora-extra        → listado paginado
 *   POST   /api/v1/tenant/tipos-hora-extra        → crear
 *   PUT    /api/v1/tenant/tipos-hora-extra/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/tipos-hora-extra/{id}   → eliminar (409 si tiene registros)
 */

const FRANJAS: { value: FranjaHoraria; label: string }[] = [
  { value: 'DIURNO', label: 'Diurno' },
  { value: 'NOCTURNO', label: 'Nocturno' },
  { value: 'MIXTO', label: 'Mixto' },
];

const FORM_VACIO = {
  codigo: '',
  nombre: '',
  porcentaje: '',
  franja_horaria: 'DIURNO' as FranjaHoraria,
  aplica_festivo: false,
  es_extra: true,
  paga_hora_completa: false,
  descripcion: '',
};

export function HorasExtrasTab() {
  const [tipos, setTipos] = useState<TipoHoraExtra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<TipoHoraExtra | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const [tipoAEliminar, setTipoAEliminar] = useState<TipoHoraExtra | null>(null);

  const cargar = () => {
    setCargando(true);
    configuracionApi.tiposHoraExtra
      .listar({ per_page: 100 })
      .then((res) => setTipos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los tipos de hora extra'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleOpenModal = (tipo?: TipoHoraExtra) => {
    if (tipo) {
      setTipoEdit(tipo);
      setFormData({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        porcentaje: String(tipo.porcentaje_recargo),
        franja_horaria: tipo.franja_horaria,
        aplica_festivo: tipo.aplica_festivo,
        es_extra: tipo.es_extra,
        paga_hora_completa: tipo.paga_hora_completa,
        descripcion: tipo.descripcion ?? '',
      });
    } else {
      setTipoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.porcentaje.trim()) {
      toast.error('Completa el código, nombre y porcentaje');
      return;
    }

    setGuardando(true);
    try {
      const payload: TipoHoraExtraPayload = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        porcentaje_recargo: Number(formData.porcentaje),
        franja_horaria: formData.franja_horaria,
        aplica_festivo: formData.aplica_festivo,
        es_extra: formData.es_extra,
        paga_hora_completa: formData.paga_hora_completa,
        descripcion: formData.descripcion.trim() || null,
      };
      if (tipoEdit) {
        const res = await configuracionApi.tiposHoraExtra.editar(tipoEdit.id, payload);
        setTipos((prev) => prev.map((t) => (t.id === tipoEdit.id ? res.data : t)));
        toast.success(res.message ?? 'Tipo de hora extra actualizado');
      } else {
        const res = await configuracionApi.tiposHoraExtra.crear(payload);
        setTipos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Tipo de hora extra creado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el tipo de hora extra');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (tipo: TipoHoraExtra) => {
    try {
      const res = await configuracionApi.tiposHoraExtra.editar(tipo.id, { estado: !tipo.estado });
      setTipos((prev) => prev.map((t) => (t.id === tipo.id ? res.data : t)));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!tipoAEliminar) return;
    try {
      await configuracionApi.tiposHoraExtra.eliminar(tipoAEliminar.id);
      setTipos((prev) => prev.filter((t) => t.id !== tipoAEliminar.id));
      toast.success('Tipo de hora extra eliminado');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.TIPO_HORA_EXTRA_CON_REGISTROS) {
        toast.error('No se puede eliminar: tiene horas extras registradas');
      } else {
        toast.error(e?.message ?? 'No se pudo eliminar el tipo de hora extra');
      }
    } finally {
      setTipoAEliminar(null);
    }
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codigo"
                  placeholder="Ej: HED"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
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
            </div>

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
              <Label htmlFor="franja">Franja Horaria</Label>
              <Select
                value={formData.franja_horaria}
                onValueChange={(value: FranjaHoraria) =>
                  setFormData((prev) => ({ ...prev, franja_horaria: value }))
                }
              >
                <SelectTrigger id="franja">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRANJAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="aplica_festivo">Aplica en festivo</Label>
                <Switch
                  id="aplica_festivo"
                  checked={formData.aplica_festivo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, aplica_festivo: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="es_extra">Es hora extra</Label>
                <Switch
                  id="es_extra"
                  checked={formData.es_extra}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, es_extra: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="paga_hora_completa">Paga hora completa</Label>
                <Switch
                  id="paga_hora_completa"
                  checked={formData.paga_hora_completa}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, paga_hora_completa: checked }))
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
        open={!!tipoAEliminar}
        onOpenChange={(open) => !open && setTipoAEliminar(null)}
        title="Eliminar tipo de hora extra"
        description={`¿Estás seguro de eliminar "${tipoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

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
          {cargando ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando tipos de hora extra...
            </div>
          ) : tipos.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No hay tipos de hora extra registrados
            </div>
          ) : (
            <div className="space-y-3">
              {tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono font-semibold">
                        {tipo.codigo}
                      </span>
                      <p className="font-semibold">{tipo.nombre}</p>
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-bold">
                        +{tipo.porcentaje_recargo}%
                      </span>
                    </div>
                    {tipo.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">{tipo.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tipo.estado}
                      onCheckedChange={() => handleToggleEstado(tipo)}
                    />
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
                      onClick={() => setTipoAEliminar(tipo)}
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
    </div>
  );
}
