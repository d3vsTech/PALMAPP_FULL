import { useEffect, useState } from 'react';
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type MotivoAusencia,
  type MotivoAusenciaPayload,
  type TipoBaseAusencia,
} from '../../../api/configuracion';

/**
 * Tab "Novedades / Motivos de Ausencia" — visual V.12, datos V.2 (API real).
 * Endpoints CRUD /v1/tenant/motivos-ausencia.
 *
 * El select de color V.12 usa clases bg-X-500; las mapeamos a hex para el API
 * (color: #RRGGBB) y de vuelta a clase para mostrar el preview.
 */

const COLORES_DISPONIBLES: { value: string; hex: string; label: string }[] = [
  { value: 'bg-blue-500',   hex: '#3b82f6', label: 'Azul' },
  { value: 'bg-green-500',  hex: '#22c55e', label: 'Verde' },
  { value: 'bg-red-500',    hex: '#ef4444', label: 'Rojo' },
  { value: 'bg-yellow-500', hex: '#eab308', label: 'Amarillo' },
  { value: 'bg-purple-500', hex: '#a855f7', label: 'Morado' },
  { value: 'bg-pink-500',   hex: '#ec4899', label: 'Rosa' },
  { value: 'bg-orange-500', hex: '#f97316', label: 'Naranja' },
  { value: 'bg-gray-500',   hex: '#6b7280', label: 'Gris' },
];

function claseDesdeHex(hex: string): string {
  const c = COLORES_DISPONIBLES.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  return c?.value ?? 'bg-blue-500';
}

function hexDesdeClase(clase: string): string {
  const c = COLORES_DISPONIBLES.find((c) => c.value === clase);
  return c?.hex ?? '#3b82f6';
}

const FORM_VACIO = {
  nombre: '',
  // §17: campos independientes
  afectaNomina: 'no',           // ↔ afecta_nomina boolean
  remuneracion: 'no_remunerada', // ↔ es_remunerada boolean
  color: 'bg-blue-500',
};

export function AusenciasTab() {
  const [motivos, setMotivos] = useState<MotivoAusencia[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [motivoEdit, setMotivoEdit] = useState<MotivoAusencia | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    configuracionApi.motivosAusencia
      .listar({ per_page: 100 })
      .then((res) => setMotivos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los motivos de ausencia'));
  }, []);

  const handleOpenModal = (motivo?: MotivoAusencia) => {
    if (motivo) {
      setMotivoEdit(motivo);
      setFormData({
        nombre: motivo.nombre,
        afectaNomina: motivo.afecta_nomina ? 'si' : 'no',
        remuneracion: motivo.es_remunerada ? 'remunerada' : 'no_remunerada',
        color: claseDesdeHex(motivo.color),
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

    // §17: afecta_nomina y es_remunerada son flags INDEPENDIENTES.
    const afectaNomina = formData.afectaNomina === 'si';
    const esRemunerada = formData.remuneracion === 'remunerada';
    const tipoBase: TipoBaseAusencia = motivoEdit?.tipo_base ?? 'OTRO';
    const payload: MotivoAusenciaPayload = {
      nombre: formData.nombre.trim(),
      tipo_base: tipoBase,
      es_remunerada: esRemunerada,
      afecta_nomina: afectaNomina,
      porcentaje_pago_default: motivoEdit
        ? Number(motivoEdit.porcentaje_pago_default)
        : (esRemunerada ? 100 : 0),
      requiere_soporte: motivoEdit?.requiere_soporte ?? false,
      color: hexDesdeClase(formData.color),
    };

    try {
      if (motivoEdit) {
        const res = await configuracionApi.motivosAusencia.editar(motivoEdit.id, payload);
        setMotivos((prev) => prev.map((m) => (m.id === motivoEdit.id ? res.data : m)));
        toast.success(res.message ?? 'Tipo de novedad actualizado');
      } else {
        const res = await configuracionApi.motivosAusencia.crear(payload);
        setMotivos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Tipo de novedad agregado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el tipo de novedad');
      }
    }
  };

  const eliminarTipo = (motivo: MotivoAusencia) => {
    confirmDelete({
      title: 'Eliminar tipo de novedad',
      description: `¿Estás seguro de eliminar "${motivo.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await configuracionApi.motivosAusencia.eliminar(motivo.id);
          setMotivos((prev) => prev.filter((m) => m.id !== motivo.id));
          toast.success('Tipo de novedad eliminado');
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.MOTIVO_CON_AUSENCIAS) {
            toast.error('No se puede eliminar: tiene ausencias asociadas');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar el tipo de novedad');
          }
        }
      },
    });
  };

  return (
    <>
      {ConfirmDeleteDialog}

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
              <Label htmlFor="afectaNomina">¿Afecta Nómina?</Label>
              <Select
                value={formData.afectaNomina}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, afectaNomina: value }))}
              >
                <SelectTrigger id="afectaNomina">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No afecta la nómina</SelectItem>
                  <SelectItem value="si">Sí afecta la nómina</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, solo es tracking informativo y no toca el cálculo de nómina.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remuneracion">Remuneración</Label>
              <Select
                value={formData.remuneracion}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, remuneracion: value }))}
              >
                <SelectTrigger id="remuneracion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remunerada">Remunerado</SelectItem>
                  <SelectItem value="no_remunerada">No remunerado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si es remunerado, suma a las incapacidades pagadas del empleado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORES_DISPONIBLES.map((color) => (
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
            {motivos.map((motivo) => (
              <div
                key={motivo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-4 w-4 rounded-full ${claseDesdeHex(motivo.color)}`} />
                  <div className="flex-1">
                    <p className="font-semibold">{motivo.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {motivo.afecta_nomina ? 'Afecta nómina' : 'No afecta nómina'}
                      {' · '}
                      {motivo.es_remunerada ? 'Remunerado' : 'No remunerado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
                    onClick={() => eliminarTipo(motivo)}
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
