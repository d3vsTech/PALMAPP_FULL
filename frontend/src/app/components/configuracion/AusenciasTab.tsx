import { useEffect, useState } from 'react';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Check, Minus } from 'lucide-react';
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

/** Sí o no de una columna, con el mismo peso visual en ambos casos. */
function Marca({ activo }: { activo: boolean }) {
  return activo ? (
    <Check className="mx-auto h-4 w-4 text-success" strokeWidth={2} aria-label="Sí" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground" strokeWidth={2} aria-label="No" />
  );
}
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

const COLORES_DISPONIBLES: { hex: string; label: string }[] = [
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#eab308', label: 'Amarillo' },
  { hex: '#a855f7', label: 'Morado' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#6b7280', label: 'Gris' },
];

/** El punto de color: es dato del motivo, no un token, asi que va en linea. */
function PuntoColor({ hex, className }: { hex: string | null | undefined; className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ backgroundColor: hex || '#3b82f6' }}
      aria-hidden
    />
  );
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

/**
 * PR-N1 — Default de "afecta subsidio de transporte" para registros viejos.
 * `true` = los días descuentan del auxilio, que es lo que la nómina hacía con
 * toda ausencia. Solo conservan el auxilio el permiso remunerado, la calamidad
 * doméstica y el luto: son días que la empresa sigue pagando como trabajados.
 * Las incapacidades y las licencias las paga la EPS o la ARL, así que
 * descuentan.
 */
function auxilioDesdeTipoBase(tipoBase: TipoBaseAusencia): boolean {
  switch (tipoBase) {
    case 'PERMISO_REMUNERADO':
    case 'CALAMIDAD_DOMESTICA':
    case 'LICENCIA_LUTO':
      return false;
    default:
      return true;
  }
}

/** Lee los flags persistidos en el motivo. Si vienen undefined (registros viejos)
 *  cae al heurístico por `tipo_base`. */
function flagsDeMotivo(motivo: MotivoAusencia): {
  ss: boolean; paraf: boolean; prest: boolean; auxilio: boolean;
} {
  const fallback = flagsDesdeTipoBase(motivo.tipo_base);
  return {
    ss:    motivo.afecta_seguridad_social ?? fallback.ss,
    paraf: motivo.afecta_parafiscales     ?? fallback.ss,
    prest: motivo.afecta_prestaciones     ?? fallback.prest,
    auxilio: motivo.afecta_auxilio_transporte ?? auxilioDesdeTipoBase(motivo.tipo_base),
  };
}

/** "Remunerado" / "No remunerado" según `es_remunerada` del motivo. */
function conceptoDesdeMotivo(esRemunerada: boolean): string {
  return esRemunerada ? 'Remunerado' : 'No remunerado';
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
  color: '#3b82f6',
  seguridadSocial: true,
  parafiscales: true,
  prestaciones: true,
  /** PR-N1 — ver `auxilioDesdeTipoBase`. */
  auxilioTransporte: true,
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
            // PR-N1 — el flag del auxilio sale del tipo_base para no repetir
            // el valor once veces en el catálogo semilla.
            const r = await configuracionApi.motivosAusencia.crear({
              ...m,
              afecta_auxilio_transporte: auxilioDesdeTipoBase(m.tipo_base),
            });
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
        color: motivo.color || '#3b82f6',
        seguridadSocial: flags.ss,
        parafiscales: flags.paraf,
        prestaciones: flags.prest,
        auxilioTransporte: flags.auxilio,
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
      color: formData.color,
      condicion: formData.condicion.trim() || null,
      norma_legal: formData.normaLegal.trim() || null,
      formula_calculo: formData.formulaCalculo.trim() || null,
      afecta_seguridad_social: formData.seguridadSocial,
      afecta_parafiscales: formData.parafiscales,
      afecta_prestaciones: formData.prestaciones,
      afecta_auxilio_transporte: formData.auxilioTransporte,
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
              {motivoEdit ? 'Editar tipo de novedad' : 'Nuevo tipo de novedad'}
            </DialogTitle>
            <DialogDescription>
              Configura permisos, incapacidades y novedades.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nombre */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nombre">
                  Nombre de la novedad <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: permiso personal"
                  value={formData.nombre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                />
              </div>

              {/* Condición */}
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

              {/* Norma legal */}
              <div className="space-y-2">
                <Label htmlFor="normaLegal">Norma legal</Label>
                <Input
                  id="normaLegal"
                  placeholder="Ej: Art. 57 CST"
                  value={formData.normaLegal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, normaLegal: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Referencia legal aplicable</p>
              </div>

              {/* Concepto */}
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
                    <SelectItem value="no_remunerada">No remunerado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* % Aplicación */}
              <div className="space-y-2">
                <Label htmlFor="porcentaje">Porcentaje de aplicación</Label>
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

              {/* Fórmula de Cálculo */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="formula">Fórmula de cálculo</Label>
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
                <Label htmlFor="color">Color de identificación</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
                >
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORES_DISPONIBLES.map((color) => (
                      <SelectItem key={color.hex} value={color.hex}>
                        <div className="flex items-center gap-2">
                          <PuntoColor hex={color.hex} className="h-3 w-3" />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Afectación en Nómina */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-foreground">Afectación en nómina</p>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="seguridadSocial"
                  checked={formData.seguridadSocial}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, seguridadSocial: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="seguridadSocial" className="cursor-pointer">
                    Seguridad social
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aplica cálculo de salud y pensión
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="parafiscales"
                  checked={formData.parafiscales}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, parafiscales: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="parafiscales" className="cursor-pointer">
                    Parafiscales
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aplica cálculo de Caja, ICBF y SENA
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="valorPrestaciones"
                  checked={formData.prestaciones}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, prestaciones: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="valorPrestaciones" className="cursor-pointer">
                    Valor prestaciones
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cuenta para cesantías, prima e intereses
                  </p>
                </div>
              </div>

              {/* PR-N1 — la nómina lo consume desde PR-N6: con el flag activo
                  los días de la novedad salen del cálculo del auxilio. */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="auxilioTransporte"
                  checked={formData.auxilioTransporte}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, auxilioTransporte: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="auxilioTransporte" className="cursor-pointer">
                    Afecta subsidio de transporte
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Activo: los días de la novedad descuentan del auxilio.
                    Inactivo: el colaborador lo conserva completo.
                  </p>
                </div>
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

      <TabLoadingGate loading={loading} message="Cargando novedades…">
      <ConfigSection
        title="Tipos de novedades"
        description="Permisos, incapacidades y licencias, con su efecto en la nómina."
        flush
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus strokeWidth={2} />
            Nuevo tipo
          </Button>
        }
      >
        {/* El punto de color viene de `motivo.color` (hex → clase Tailwind).
            Los checks de S.S./Paraf. y Prest. leen los flags persistidos en el
            motivo, con respaldo heurístico por `tipo_base` para registros
            viejos pre-migración. */}
        {motivos.length === 0 ? (
          <ConfigEmpty
            title="Sin tipos de novedades"
            description="Agrega el primer permiso, incapacidad o licencia."
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus strokeWidth={2} />
                Agregar tipo
              </Button>
            }
          />
        ) : (
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Novedad</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Aplicación</TableHead>
                <TableHead className="text-center">S. social y paraf.</TableHead>
                <TableHead className="text-center">Prestaciones</TableHead>
                <TableHead className="text-center">Aux. transporte</TableHead>
                <TableHead className="w-24 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...motivos]
                .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
                .map((motivo) => {
                  const { ss, prest, auxilio } = flagsDeMotivo(motivo);
                  const detalle = [motivo.condicion, motivo.norma_legal]
                    .filter((valor): valor is string => Boolean(valor?.trim()))
                    .join(' · ');
                  return (
                    <TableRow key={motivo.id}>
                      <TableCell className="whitespace-normal pl-5">
                        <div className="flex items-start gap-2">
                          <PuntoColor hex={motivo.color} className="mt-1.5 h-2.5 w-2.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{motivo.nombre}</p>
                            {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={motivo.es_remunerada ? 'success' : 'secondary'}>
                          {conceptoDesdeMotivo(motivo.es_remunerada)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtPorcentaje(motivo.porcentaje_pago_default)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Marca activo={ss} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Marca activo={prest} />
                      </TableCell>
                      <TableCell className="text-center">
                        {/* Aquí la marca significa "descuenta": es lo que la
                            nómina va a restar del auxilio. */}
                        <Marca activo={auxilio} />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <ConfigRowActions
                          label={motivo.nombre}
                          onEdit={() => handleOpenModal(motivo)}
                          onDelete={() => eliminarTipo(motivo)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
      </TabLoadingGate>
    </>
  );
}
