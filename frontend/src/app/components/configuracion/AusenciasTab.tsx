import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit, Check, X as XIcon } from 'lucide-react';
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
import { Checkbox } from '../ui/checkbox';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { TabLoadingGate } from './TabLoadingGate';
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

/**
 * Fallback para motivos viejos que aún no traen los flags individuales del
 * backend (`afecta_seguridad_social` / `afecta_parafiscales` / `afecta_prestaciones`).
 * Reglas estándar colombianas:
 *  - Incapacidades EPS/ARL → la SS y las prestaciones las paga la EPS/ARL,
 *    no la empresa.
 *  - Licencias remuneradas (maternidad, paternidad, luto, calamidad,
 *    permiso remunerado) → SÍ acumulan SS y prestaciones.
 *  - Permiso no remunerado / ausencia injustificada / suspensión → NO acumulan.
 *  - OTRO → conservador.
 */
function flagsDesdeTipoBase(tipoBase: TipoBaseAusencia): { ss: boolean; prest: boolean } {
  switch (tipoBase) {
    case 'LICENCIA_MATERNIDAD':
    case 'LICENCIA_PATERNIDAD':
    case 'LICENCIA_LUTO':
    case 'PERMISO_REMUNERADO':
    case 'CALAMIDAD_DOMESTICA':
      return { ss: true, prest: true };
    case 'INCAPACIDAD_EPS':
    case 'INCAPACIDAD_ARL':
    case 'PERMISO_NO_REMUNERADO':
    case 'AUSENCIA_INJUSTIFICADA':
    case 'SUSPENSION_DISCIPLINARIA':
    case 'OTRO':
    default:
      return { ss: false, prest: false };
  }
}

/** Lee los flags persistidos en el motivo. Si vienen undefined (registros viejos)
 *  cae al heurístico por `tipo_base`. */
function flagsDeMotivo(motivo: MotivoAusencia): { ss: boolean; paraf: boolean; prest: boolean } {
  const fallback = flagsDesdeTipoBase(motivo.tipo_base);
  return {
    ss:    motivo.afecta_seguridad_social ?? fallback.ss,
    paraf: motivo.afecta_parafiscales     ?? fallback.ss,
    prest: motivo.afecta_prestaciones     ?? fallback.prest,
  };
}

/** "Remunerado" / "No Remunerado" según `es_remunerada` del motivo. */
function conceptoDesdeMotivo(esRemunerada: boolean): string {
  return esRemunerada ? 'Remunerado' : 'No Remunerado';
}

/** Pinta el porcentaje como `100%` (sin decimales si es entero) o `66.67%`. */
function fmtPorcentaje(valor: number | string | null | undefined): string {
  if (valor == null || valor === '') return '0%';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '0%';
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(2)}%`;
}

/**
 * Estado del formulario del modal "Nuevo / Editar Tipo de Novedad".
 *
 * Todos los campos persisten al backend desde la actualización del doc §16:
 *  - nombre, concepto → es_remunerada, porcentaje → porcentaje_pago_default,
 *    color → color hex.
 *  - condicion, normaLegal, formulaCalculo → strings libres informativos.
 *  - seguridadSocial / parafiscales / prestaciones → afecta_seguridad_social /
 *    afecta_parafiscales / afecta_prestaciones (snapshotteados en ausencias).
 *  - `afecta_nomina` se deriva: true si cualquiera de los 3 flags está activo.
 */
const FORM_VACIO = {
  nombre: '',
  condicion: '',
  normaLegal: '',
  concepto: 'remunerada' as 'remunerada' | 'no_remunerada',
  porcentaje: '100',
  formulaCalculo: '',
  color: 'bg-blue-500',
  seguridadSocial: true,
  parafiscales: true,
  prestaciones: true,
};

/** Catálogo inicial sembrado en background si el tenant no tiene motivos.
 *  Uno por cada `tipo_base` del enum, con valores legales colombianos (CST). */
const MOTIVOS_DEFAULT: Array<{
  nombre: string;
  tipo_base: TipoBaseAusencia;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago_default: number;
  requiere_soporte: boolean;
  color: string;
  condicion: string;
  norma_legal: string;
  afecta_seguridad_social: boolean;
  afecta_parafiscales: boolean;
  afecta_prestaciones: boolean;
}> = [
  { nombre: 'Incapacidad EPS',           tipo_base: 'INCAPACIDAD_EPS',          es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 66.67, requiere_soporte: true,  color: '#3b82f6', condicion: 'Día 1-2: 100% / Día 3-90: 66.67%', norma_legal: 'Art. 227 CST + Dec. 780/2016', afecta_seguridad_social: true,  afecta_parafiscales: false, afecta_prestaciones: false },
  { nombre: 'Incapacidad ARL',           tipo_base: 'INCAPACIDAD_ARL',          es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: true,  color: '#ef4444', condicion: 'Día 1+: 100% (ARL paga desde día 1)', norma_legal: 'Ley 776/2002', afecta_seguridad_social: true,  afecta_parafiscales: false, afecta_prestaciones: false },
  { nombre: 'Licencia de Maternidad',    tipo_base: 'LICENCIA_MATERNIDAD',      es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: true,  color: '#ec4899', condicion: '18 semanas',                 norma_legal: 'Ley 1822/2017',  afecta_seguridad_social: true,  afecta_parafiscales: true,  afecta_prestaciones: true  },
  { nombre: 'Licencia de Paternidad',    tipo_base: 'LICENCIA_PATERNIDAD',      es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: true,  color: '#a855f7', condicion: '2 semanas',                  norma_legal: 'Ley 2114/2021',  afecta_seguridad_social: true,  afecta_parafiscales: true,  afecta_prestaciones: true  },
  { nombre: 'Licencia de Luto',          tipo_base: 'LICENCIA_LUTO',            es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: true,  color: '#6b7280', condicion: '5 días hábiles',             norma_legal: 'Ley 1280/2009',  afecta_seguridad_social: true,  afecta_parafiscales: true,  afecta_prestaciones: true  },
  { nombre: 'Permiso Remunerado',        tipo_base: 'PERMISO_REMUNERADO',       es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: false, color: '#22c55e', condicion: 'Según empresa',              norma_legal: 'CST Art. 57',    afecta_seguridad_social: true,  afecta_parafiscales: true,  afecta_prestaciones: true  },
  { nombre: 'Permiso No Remunerado',     tipo_base: 'PERMISO_NO_REMUNERADO',    es_remunerada: false, afecta_nomina: true,  porcentaje_pago_default: 0,     requiere_soporte: false, color: '#f97316', condicion: 'Sin pago',                   norma_legal: 'CST Art. 60',    afecta_seguridad_social: false, afecta_parafiscales: false, afecta_prestaciones: false },
  { nombre: 'Ausencia Injustificada',    tipo_base: 'AUSENCIA_INJUSTIFICADA',   es_remunerada: false, afecta_nomina: true,  porcentaje_pago_default: 0,     requiere_soporte: false, color: '#eab308', condicion: 'Descuento directo',          norma_legal: 'CST Art. 60',    afecta_seguridad_social: false, afecta_parafiscales: false, afecta_prestaciones: false },
  { nombre: 'Calamidad Doméstica',       tipo_base: 'CALAMIDAD_DOMESTICA',      es_remunerada: true,  afecta_nomina: true,  porcentaje_pago_default: 100,   requiere_soporte: false, color: '#06b6d4', condicion: 'Hasta 5 días',               norma_legal: 'Ley 1280/2009',  afecta_seguridad_social: true,  afecta_parafiscales: true,  afecta_prestaciones: true  },
  { nombre: 'Suspensión Disciplinaria',  tipo_base: 'SUSPENSION_DISCIPLINARIA', es_remunerada: false, afecta_nomina: true,  porcentaje_pago_default: 0,     requiere_soporte: true,  color: '#1f2937', condicion: 'Según reglamento interno',   norma_legal: 'CST Art. 112',   afecta_seguridad_social: false, afecta_parafiscales: false, afecta_prestaciones: false },
  { nombre: 'Otro',                      tipo_base: 'OTRO',                     es_remunerada: false, afecta_nomina: false, porcentaje_pago_default: 0,     requiere_soporte: false, color: '#94a3b8', condicion: '',                           norma_legal: '',               afecta_seguridad_social: false, afecta_parafiscales: false, afecta_prestaciones: false },
];

export function AusenciasTab() {
  const [motivos, setMotivos] = useState<MotivoAusencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [motivoEdit, setMotivoEdit] = useState<MotivoAusencia | null>(null);
  const [formData, setFormData] = useState(FORM_VACIO);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await configuracionApi.motivosAusencia.listar({ per_page: 100 });
        if (cancelado) return;
        if ((res.data ?? []).length > 0) {
          setMotivos(res.data);
          setLoading(false);
          return;
        }
        // Lista vacía → sembramos los 11 motivos legales en background.
        const creados: MotivoAusencia[] = [];
        for (const m of MOTIVOS_DEFAULT) {
          try {
            const r = await configuracionApi.motivosAusencia.crear(m);
            creados.push(r.data);
          } catch { /* si falla uno seguimos con los demás */ }
        }
        if (!cancelado) {
          setMotivos(creados);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelado) {
          toast.error(e?.message ?? 'No se pudieron cargar los motivos de ausencia');
          setLoading(false);
        }
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const handleOpenModal = (motivo?: MotivoAusencia) => {
    if (motivo) {
      setMotivoEdit(motivo);
      // Los 3 flags ahora son columnas reales del backend. Si vienen undefined
      // (registros viejos pre-migración) caemos al heurístico por tipo_base.
      const flags = flagsDeMotivo(motivo);
      setFormData({
        nombre: motivo.nombre,
        condicion: motivo.condicion ?? '',
        normaLegal: motivo.norma_legal ?? '',
        concepto: motivo.es_remunerada ? 'remunerada' : 'no_remunerada',
        porcentaje: motivo.porcentaje_pago_default != null
          ? String(Number(motivo.porcentaje_pago_default))
          : '0',
        formulaCalculo: motivo.formula_calculo ?? '',
        color: claseDesdeHex(motivo.color),
        seguridadSocial: flags.ss,
        parafiscales: flags.paraf,
        prestaciones: flags.prest,
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
    const porcentaje = Number(formData.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      toast.error('El % de aplicación debe estar entre 0 y 100');
      return;
    }

    const esRemunerada = formData.concepto === 'remunerada';
    // Los 3 flags ahora son columnas independientes. `afecta_nomina` queda
    // como derivado: la novedad impacta la nómina si cualquier flag está activo.
    const afectaNomina = formData.seguridadSocial || formData.parafiscales || formData.prestaciones;
    const tipoBase: TipoBaseAusencia = motivoEdit?.tipo_base ?? 'OTRO';
    const payload: MotivoAusenciaPayload = {
      nombre: formData.nombre.trim(),
      tipo_base: tipoBase,
      es_remunerada: esRemunerada,
      afecta_nomina: afectaNomina,
      porcentaje_pago_default: porcentaje,
      requiere_soporte: motivoEdit?.requiere_soporte ?? false,
      color: hexDesdeClase(formData.color),
      condicion: formData.condicion.trim() || null,
      norma_legal: formData.normaLegal.trim() || null,
      formula_calculo: formData.formulaCalculo.trim() || null,
      afecta_seguridad_social: formData.seguridadSocial,
      afecta_parafiscales: formData.parafiscales,
      afecta_prestaciones: formData.prestaciones,
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {motivoEdit ? 'Editar Tipo de Novedad' : 'Nuevo Tipo de Novedad'}
            </DialogTitle>
            <DialogDescription>
              Configura permisos, incapacidades y novedades
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Novedad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Permiso Personal"
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>

            {/* Condición + Norma Legal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condicion">Condición</Label>
                <Input
                  id="condicion"
                  placeholder="Ej: 1-3 días"
                  value={formData.condicion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, condicion: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Especifica la duración o condiciones</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="normaLegal">Norma Legal</Label>
                <Input
                  id="normaLegal"
                  placeholder="Ej: Art. 57 CST"
                  value={formData.normaLegal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, normaLegal: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Referencia legal aplicable</p>
              </div>
            </div>

            {/* Concepto + % Aplicación */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concepto">
                  Concepto <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.concepto}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, concepto: value as 'remunerada' | 'no_remunerada' }))
                  }
                >
                  <SelectTrigger id="concepto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remunerada">Remunerado</SelectItem>
                    <SelectItem value="no_remunerada">No Remunerado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje">% Aplicación</Label>
                <Input
                  id="porcentaje"
                  type="number" step="0.001"
                  min={0}
                  max={100}
                  placeholder="100"
                  value={formData.porcentaje}
                  onChange={(e) => setFormData((prev) => ({ ...prev, porcentaje: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Porcentaje de pago que aplica</p>
              </div>
            </div>

            {/* Fórmula de Cálculo */}
            <div className="space-y-2">
              <Label htmlFor="formula">Fórmula de Cálculo</Label>
              <Input
                id="formula"
                placeholder="Ej: Salario x días / 30"
                value={formData.formulaCalculo}
                onChange={(e) => setFormData((prev) => ({ ...prev, formulaCalculo: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Cómo se calcula el valor de esta novedad</p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color de Identificación</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
              >
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

            {/* Afectación en Nómina */}
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-base">Afectación en Nómina</Label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.seguridadSocial}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, seguridadSocial: checked === true }))
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">Seguridad Social</p>
                  <p className="text-xs text-muted-foreground">Aplica cálculo de Salud y Pensión</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.parafiscales}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, parafiscales: checked === true }))
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">Parafiscales</p>
                  <p className="text-xs text-muted-foreground">Aplica cálculo de Caja, ICBF y SENA</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={formData.prestaciones}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, prestaciones: checked === true }))
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">Valor Prestaciones</p>
                  <p className="text-xs text-muted-foreground">Cuenta para cesantías, prima e intereses</p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-success hover:bg-success/90">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabLoadingGate loading={loading} message="Cargando novedades…">
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
          {/* Tabla con las 6 columnas del diseño. El punto de color viene de
              `motivo.color` (hex → clase Tailwind). Los checks de S.S./Paraf.
              y Prest. leen los flags persistidos en el motivo (con fallback al
              heurístico por `tipo_base` para registros viejos pre-migración). */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Novedad</th>
                  <th className="text-left p-4 font-semibold text-sm">Concepto</th>
                  <th className="text-left p-4 font-semibold text-sm">% Aplicación</th>
                  <th className="text-left p-4 font-semibold text-sm">S.S. / Paraf.</th>
                  <th className="text-left p-4 font-semibold text-sm">Prest.</th>
                  <th className="text-right p-4 font-semibold text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {motivos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                      No hay tipos de novedades registradas
                    </td>
                  </tr>
                ) : (
                  [...motivos].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((motivo) => {
                    const { ss, prest } = flagsDeMotivo(motivo);
                    return (
                      <tr key={motivo.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full shrink-0 ${claseDesdeHex(motivo.color)}`} />
                            <span className="font-medium">{motivo.nombre}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {conceptoDesdeMotivo(motivo.es_remunerada)}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {fmtPorcentaje(motivo.porcentaje_pago_default)}
                        </td>
                        <td className="p-4">
                          {ss
                            ? <Check className="h-4 w-4 text-success" />
                            : <XIcon className="h-4 w-4 text-destructive" />}
                        </td>
                        <td className="p-4">
                          {prest
                            ? <Check className="h-4 w-4 text-success" />
                            : <XIcon className="h-4 w-4 text-destructive" />}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </TabLoadingGate>
    </>
  );
}
