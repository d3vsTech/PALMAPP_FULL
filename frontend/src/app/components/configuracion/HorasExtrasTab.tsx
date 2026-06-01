import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type TipoHoraExtra,
  type TipoHoraExtraPayload,
  type FranjaHoraria,
  type ConfiguracionNomina,
} from '../../../api/configuracion';

/**
 * Tab "Horas Extras" — visual V.12, datos V.2 (API real).
 *   - Jornada semanal: GET/PUT /v1/tenant/configuracion/nomina (divisor_jornada_mensual).
 *     Visual en horas: horas = divisor / 5. Guardar: 48→240, otro→210.
 *   - Tipos: CRUD /v1/tenant/tipos-hora-extra.
 *
 * Campos no visibles en V.12 (codigo, franja_horaria, es_extra) se conservan al editar
 * o se autogeneran al crear.
 */

const FORM_VACIO = {
  nombre: '',
  porcentaje: '',
  descripcion: '',
  franjaHoraria: false,
  aplicaFestivo: false,
  pagaHoraCompleta: false,
};

/** Genera un código corto a partir del nombre (primeras letras de cada palabra). */
function generarCodigo(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return 'HE';
  return palabras.map((p) => p[0]).join('').toUpperCase().slice(0, 6);
}

export function HorasExtrasTab() {
  const [tipos, setTipos] = useState<TipoHoraExtra[]>([]);
  const [horasSemanales, setHorasSemanales] = useState('48');
  const [nominaActual, setNominaActual] = useState<ConfiguracionNomina | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<TipoHoraExtra | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    configuracionApi.tiposHoraExtra
      .listar({ per_page: 100 })
      .then((res) => setTipos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los tipos de hora extra'));

    configuracionApi.configuracionNomina.obtener()
      .then((res) => {
        setNominaActual(res.data);
        setHorasSemanales(String(Number(res.data.divisor_jornada_mensual) / 5));
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudo cargar la jornada semanal'));
  }, []);

  const handleOpenModal = (tipo?: TipoHoraExtra) => {
    if (tipo) {
      setTipoEdit(tipo);
      setFormData({
        nombre: tipo.nombre,
        porcentaje: String(tipo.porcentaje_recargo),
        descripcion: tipo.descripcion ?? '',
        franjaHoraria: tipo.franja_horaria !== 'DIURNO',
        aplicaFestivo: tipo.aplica_festivo,
        pagaHoraCompleta: tipo.paga_hora_completa,
      });
    } else {
      setTipoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.porcentaje.trim()) {
      toast.error('Completa el nombre y porcentaje');
      return;
    }

    const franja: FranjaHoraria = tipoEdit
      ? tipoEdit.franja_horaria
      : formData.franjaHoraria ? 'NOCTURNO' : 'DIURNO';

    const payload: TipoHoraExtraPayload = {
      codigo: tipoEdit ? tipoEdit.codigo : generarCodigo(formData.nombre),
      nombre: formData.nombre.trim(),
      porcentaje_recargo: Number(formData.porcentaje),
      franja_horaria: franja,
      aplica_festivo: formData.aplicaFestivo,
      es_extra: true,
      paga_hora_completa: formData.pagaHoraCompleta,
      descripcion: formData.descripcion.trim() || null,
    };

    try {
      if (tipoEdit) {
        const res = await configuracionApi.tiposHoraExtra.editar(tipoEdit.id, payload);
        setTipos((prev) => prev.map((t) => (t.id === tipoEdit.id ? res.data : t)));
        toast.success(res.message ?? 'Tipo de hora extra actualizado');
      } else {
        const res = await configuracionApi.tiposHoraExtra.crear(payload);
        setTipos((prev) => [...prev, res.data]);
        toast.success(res.message ?? 'Tipo de hora extra agregado');
      }
      setOpenModal(false);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el tipo de hora extra');
      }
    }
  };

  const eliminarTipo = (tipo: TipoHoraExtra) => {
    confirmDelete({
      title: 'Eliminar tipo de hora extra',
      description: `¿Estás seguro de eliminar "${tipo.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await configuracionApi.tiposHoraExtra.eliminar(tipo.id);
          setTipos((prev) => prev.filter((t) => t.id !== tipo.id));
          toast.success('Tipo de hora extra eliminado');
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.TIPO_HORA_EXTRA_CON_REGISTROS) {
            toast.error('No se puede eliminar: tiene horas extras registradas');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar el tipo de hora extra');
          }
        }
      },
    });
  };

  const handleGuardarJornada = async () => {
    const horas = Number(horasSemanales);
    if (!horas || horas <= 0) {
      toast.error('Ingresa un número válido de horas semanales');
      return;
    }
    try {
      const res = await configuracionApi.configuracionNomina.actualizar({
        divisor_jornada_mensual: horas === 48 ? 240 : 210,
      });
      setNominaActual(res.data);
      setHorasSemanales(String(Number(res.data.divisor_jornada_mensual) / 5));
      toast.success(res.message ?? 'Jornada semanal actualizada');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo guardar la jornada semanal');
    }
  };

  return (
    <div className="space-y-6">
      {ConfirmDeleteDialog}

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

            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="franjaHoraria"
                  checked={formData.franjaHoraria}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, franjaHoraria: checked as boolean }))
                  }
                />
                <Label
                  htmlFor="franjaHoraria"
                  className="text-sm font-normal cursor-pointer"
                >
                  Franja horaria
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aplicaFestivo"
                  checked={formData.aplicaFestivo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, aplicaFestivo: checked as boolean }))
                  }
                />
                <Label
                  htmlFor="aplicaFestivo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Aplica para festivo
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pagaHoraCompleta"
                  checked={formData.pagaHoraCompleta}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, pagaHoraCompleta: checked as boolean }))
                  }
                />
                <Label
                  htmlFor="pagaHoraCompleta"
                  className="text-sm font-normal cursor-pointer"
                >
                  Paga la hora completa
                </Label>
              </div>
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
                onBlur={handleGuardarJornada}
                className="text-2xl font-bold text-center"
                disabled={!nominaActual}
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
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{tipo.nombre}</p>
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-bold">
                      +{tipo.porcentaje_recargo}%
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
                    onClick={() => eliminarTipo(tipo)}
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
