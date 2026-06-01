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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type TipoHoraExtra,
  type TipoHoraExtraPayload,
  type TipoHoraExtraCodigoItem,
  type FranjaHoraria,
  type CodigoHoraExtra,
  type ConfiguracionNomina,
} from '../../../api/configuracion';

/**
 * Tab "Horas Extras" — sigue el doc API_PARAMETRICAS.md §8 y §11.
 *
 * §8 Jornada Laboral: GET/PUT /v1/tenant/configuracion/nomina con `horas_semanales`
 * (48 o 42) como alias del divisor (240/210). El backend convierte automáticamente.
 *
 * §11 Tipos de Hora Extra:
 *  - `/codigos`: lista estática de los 7 códigos legales (HED, HEN, RN, HRD, HEDF, HENF, RND)
 *    con metadata para pre-llenar nombre/descripción/es_extra/paga_hora_completa.
 *  - CRUD sobre `/tipos-hora-extra`.
 */

interface FormState {
  codigo: CodigoHoraExtra | '';
  nombre: string;
  porcentaje_recargo: string;
  descripcion: string;
  franja_horaria: FranjaHoraria;
  aplica_festivo: boolean;
  es_extra: boolean;
  paga_hora_completa: boolean;
}

const FORM_VACIO: FormState = {
  codigo: '',
  nombre: '',
  porcentaje_recargo: '',
  descripcion: '',
  franja_horaria: 'DIURNO',
  aplica_festivo: false,
  es_extra: true,
  paga_hora_completa: true,
};

/** Heurística para inferir la franja a partir del código (no viene en /codigos). */
function franjaParaCodigo(codigo: CodigoHoraExtra): FranjaHoraria {
  switch (codigo) {
    case 'HEN':
    case 'RN':
    case 'HENF':
    case 'RND':
      return 'NOCTURNO';
    case 'HED':
    case 'HRD':
    case 'HEDF':
    default:
      return 'DIURNO';
  }
}

/** Porcentaje legal por código (semilla por defecto del doc §11). */
const PORCENTAJE_DEFAULT: Record<CodigoHoraExtra, number> = {
  HED: 25,
  HEN: 75,
  RN: 35,
  HRD: 75,
  HEDF: 100,
  HENF: 150,
  RND: 110,
};

/** ¿El código aplica en festivo? */
function aplicaFestivoParaCodigo(codigo: CodigoHoraExtra): boolean {
  return codigo === 'HRD' || codigo === 'HEDF' || codigo === 'HENF' || codigo === 'RND';
}

export function HorasExtrasTab() {
  const [tipos, setTipos] = useState<TipoHoraExtra[]>([]);
  const [codigosDisponibles, setCodigosDisponibles] = useState<TipoHoraExtraCodigoItem[]>([]);

  const [horasSemanales, setHorasSemanales] = useState<string>('48');
  const [nominaActual, setNominaActual] = useState<ConfiguracionNomina | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<TipoHoraExtra | null>(null);
  const [formData, setFormData] = useState<FormState>(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  // Códigos que el usuario puede elegir al crear: los 7 menos los que ya existen
  // en el tenant (porque `codigo` es único per-tenant según §11). Al editar
  // mostramos todos para que el código actual quede visible en el select.
  const codigosUsados = new Set(tipos.map((t) => t.codigo as CodigoHoraExtra));
  const codigosOpciones = tipoEdit
    ? codigosDisponibles
    : codigosDisponibles.filter((c) => !codigosUsados.has(c.codigo));

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    configuracionApi.tiposHoraExtra
      .listar({ per_page: 100 })
      .then((res) => setTipos(res.data))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los tipos de hora extra'));

    configuracionApi.tiposHoraExtra
      .codigos()
      .then((res) => setCodigosDisponibles(res.data))
      .catch(() => { /* opcional: si falla, el select de código queda vacío */ });

    configuracionApi.configuracionNomina.obtener()
      .then((res) => {
        setNominaActual(res.data);
        // Preferimos el alias `horas_semanales` del API; fallback al divisor.
        const horas = res.data.horas_semanales
          ?? (res.data.divisor_jornada_mensual === 210 ? 42 : 48);
        setHorasSemanales(String(horas));
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudo cargar la jornada semanal'));
  }, []);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const handleOpenModal = (tipo?: TipoHoraExtra) => {
    if (tipo) {
      setTipoEdit(tipo);
      setFormData({
        codigo: (tipo.codigo as CodigoHoraExtra) ?? '',
        nombre: tipo.nombre,
        porcentaje_recargo: String(tipo.porcentaje_recargo),
        descripcion: tipo.descripcion ?? '',
        franja_horaria: tipo.franja_horaria,
        aplica_festivo: tipo.aplica_festivo,
        es_extra: tipo.es_extra,
        paga_hora_completa: tipo.paga_hora_completa,
      });
    } else {
      setTipoEdit(null);
      setFormData(FORM_VACIO);
    }
    setOpenModal(true);
  };

  /** Al elegir un código en el select, pre-llena los demás campos según
   *  los valores legales colombianos (§11 del doc). */
  const handleCodigoChange = (codigo: CodigoHoraExtra) => {
    const meta = codigosDisponibles.find((c) => c.codigo === codigo);
    setFormData((prev) => ({
      ...prev,
      codigo,
      nombre: meta?.nombre ?? prev.nombre,
      descripcion: meta?.descripcion ?? prev.descripcion,
      es_extra: meta?.es_extra ?? prev.es_extra,
      paga_hora_completa: meta?.paga_hora_completa ?? prev.paga_hora_completa,
      franja_horaria: franjaParaCodigo(codigo),
      aplica_festivo: aplicaFestivoParaCodigo(codigo),
      porcentaje_recargo:
        prev.porcentaje_recargo === '' ? String(PORCENTAJE_DEFAULT[codigo]) : prev.porcentaje_recargo,
    }));
  };

  const handleSave = async () => {
    if (!formData.codigo) {
      toast.error('Selecciona un código de hora extra');
      return;
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const pct = Number(formData.porcentaje_recargo);
    if (!Number.isFinite(pct) || pct < 0 || pct > 200) {
      toast.error('El porcentaje debe estar entre 0 y 200');
      return;
    }

    const payload: TipoHoraExtraPayload = {
      codigo: formData.codigo,
      nombre: formData.nombre.trim(),
      porcentaje_recargo: pct,
      franja_horaria: formData.franja_horaria,
      aplica_festivo: formData.aplica_festivo,
      es_extra: formData.es_extra,
      paga_hora_completa: formData.paga_hora_completa,
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

  // ── Jornada semanal (§8) ───────────────────────────────────────────────────
  const handleGuardarJornada = async (raw: string) => {
    const horas = Number(raw);
    if (!Number.isFinite(horas) || horas <= 0) {
      toast.error('Ingresa un número válido de horas semanales');
      return;
    }
    // El backend acepta los valores legales 48 o 42. Si el usuario manda otra
    // cosa el backend devuelve un 422; el toast lo muestra tal cual.
    try {
      const res = await configuracionApi.configuracionNomina.actualizar({
        horas_semanales: horas as 48 | 42,
      });
      setNominaActual(res.data);
      toast.success(res.message ?? 'Jornada semanal actualizada');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la jornada semanal');
      }
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
            {/* Código (selector con los 7 legales) */}
            <div className="space-y-2">
              <Label htmlFor="codigo">
                Código <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.codigo}
                onValueChange={(v) => handleCodigoChange(v as CodigoHoraExtra)}
                disabled={!!tipoEdit}
              >
                <SelectTrigger id="codigo">
                  <SelectValue placeholder="Seleccionar código (HED, HEN, RN, etc.)" />
                </SelectTrigger>
                <SelectContent>
                  {codigosOpciones.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Todos los códigos legales ya están registrados.
                    </div>
                  ) : (
                    codigosOpciones.map((c) => (
                      <SelectItem key={c.codigo} value={c.codigo}>
                        <span className="font-mono font-semibold mr-2">{c.codigo}</span>
                        {c.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {tipoEdit && (
                <p className="text-xs text-muted-foreground">
                  El código no se puede cambiar al editar.
                </p>
              )}
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
              <Label htmlFor="porcentaje_recargo">
                Porcentaje de Recargo <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="porcentaje_recargo"
                  type="number"
                  min={0}
                  max={200}
                  step="0.01"
                  placeholder="25"
                  value={formData.porcentaje_recargo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, porcentaje_recargo: e.target.value }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="franja_horaria">Franja Horaria *</Label>
              <Select
                value={formData.franja_horaria}
                onValueChange={(v: FranjaHoraria) =>
                  setFormData((prev) => ({ ...prev, franja_horaria: v }))
                }
              >
                <SelectTrigger id="franja_horaria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIURNO">Diurno (6:00 AM – 9:00 PM)</SelectItem>
                  <SelectItem value="NOCTURNO">Nocturno (9:00 PM – 6:00 AM)</SelectItem>
                  <SelectItem value="MIXTO">Mixto</SelectItem>
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aplica_festivo"
                  checked={formData.aplica_festivo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, aplica_festivo: checked === true }))
                  }
                />
                <Label htmlFor="aplica_festivo" className="text-sm font-normal cursor-pointer">
                  Aplica en domingo / festivo
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es_extra"
                  checked={formData.es_extra}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, es_extra: checked === true }))
                  }
                />
                <Label htmlFor="es_extra" className="text-sm font-normal cursor-pointer">
                  Es hora extra (desmarcado = solo recargo, ej. RN, RND)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paga_hora_completa"
                  checked={formData.paga_hora_completa}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, paga_hora_completa: checked === true }))
                  }
                />
                <Label htmlFor="paga_hora_completa" className="text-sm font-normal cursor-pointer">
                  Paga la hora completa (no solo el recargo)
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

      {/* Jornada Laboral Semanal */}
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
                min={1}
                max={60}
                value={horasSemanales}
                onChange={(e) => setHorasSemanales(e.target.value)}
                onBlur={() => handleGuardarJornada(horasSemanales)}
                className="text-2xl font-bold text-center"
                disabled={!nominaActual}
              />
              <span className="text-lg font-medium text-muted-foreground">horas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Horas Extras */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Horas Extras</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Recargos sobre el valor hora ordinaria (7 tipos legales colombianos)
              </p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {tipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay tipos registrados.
              </p>
            ) : (
              tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-semibold">
                        {tipo.codigo}
                      </span>
                      <p className="font-semibold">{tipo.nombre}</p>
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-bold">
                        +{tipo.porcentaje_recargo}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tipo.franja_horaria}
                        {tipo.aplica_festivo && ' · festivo'}
                        {!tipo.es_extra && ' · solo recargo'}
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
