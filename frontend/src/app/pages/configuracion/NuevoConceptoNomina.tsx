import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import {
  nominaApi,
  type NominaConcepto,
  type TipoConcepto as TipoConceptoApi,
  type AplicaA,
  type TipoRemuneracion,
} from '../../../api/nomina';
import { formatThousands, parseCOP } from '../../components/lib/format';

/**
 * Tipos visuales del formulario — coinciden 1:1 con el API §6.
 * "Aporte Legal" representa conceptos con aporte empleado + empresa (SALUD,
 * PENSION, ARL); el motor de nómina usa ambos porcentajes al calcular.
 */
type TipoVisual =
  | 'Aporte Legal'
  | 'Deducción Legal'
  | 'Deducción Voluntaria'
  | 'Bonificación Fija'
  | 'Bonificación Variable';

const TIPO_VISUAL_TO_API: Record<TipoVisual, TipoConceptoApi> = {
  'Aporte Legal':           'APORTE_LEGAL',
  'Deducción Legal':        'DEDUCCION_LEGAL',
  'Deducción Voluntaria':   'DEDUCCION_VOLUNTARIA',
  'Bonificación Fija':      'BONIFICACION_FIJA',
  'Bonificación Variable':  'BONIFICACION_VARIABLE',
};

const TIPO_API_TO_VISUAL: Record<TipoConceptoApi, TipoVisual> = {
  APORTE_LEGAL:          'Aporte Legal',
  DEDUCCION_LEGAL:       'Deducción Legal',
  DEDUCCION_VOLUNTARIA:  'Deducción Voluntaria',
  BONIFICACION_FIJA:     'Bonificación Fija',
  BONIFICACION_VARIABLE: 'Bonificación Variable',
};

function esAporteODeduccionLegal(tipo: TipoVisual): boolean {
  return tipo === 'Aporte Legal' || tipo === 'Deducción Legal';
}

/** Convierte 'yyyy-mm-dd' (input type=date) a 'dd/mm/yyyy' que prefiere el API. */
function isoADmy(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Convierte 'dd/mm/yyyy' o 'yyyy-mm-dd' a 'yyyy-mm-dd' (formato del input type=date). */
function aIso(s: string | null | undefined): string {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

interface FormState {
  codigo: string;
  nombre: string;
  tipo: TipoVisual;
  operacion: 'SUMA' | 'RESTA';
  porcentajeEmpleado: string;
  porcentajeEmpresa: string;
  valorFijo: string;
  aplicaA: AplicaA;
  esObligatorio: boolean;
  afectaSalarioMinimo: boolean;
  afectaNomina: boolean;
  tipoRemuneracion: TipoRemuneracion;
  vigenciaDesde: string;
  vigenciaHasta: string;
}

const FORM_VACIO: FormState = {
  codigo: '',
  nombre: '',
  tipo: 'Aporte Legal',
  operacion: 'RESTA',
  porcentajeEmpleado: '',
  porcentajeEmpresa: '',
  valorFijo: '',
  aplicaA: 'AMBOS',
  esObligatorio: false,
  afectaSalarioMinimo: false,
  afectaNomina: true,
  tipoRemuneracion: 'REMUNERADO',
  vigenciaDesde: new Date().toISOString().split('T')[0],
  vigenciaHasta: '',
};

/** Mismo key que Configuracion.tsx — al volver de aquí queremos abrir Conceptos. */
const SS_KEY_ULTIMO_TAB = 'palmapp_configuracion_ultimo_tab';

function volverAConceptos(navigate: (to: string) => void) {
  try { sessionStorage.setItem(SS_KEY_ULTIMO_TAB, 'conceptos'); } catch {}
  navigate('/configuracion');
}

export default function NuevoConceptoNomina() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conceptoIdParam = searchParams.get('id');
  const isEditing = !!conceptoIdParam;
  const conceptoId = conceptoIdParam ? Number(conceptoIdParam) : null;

  const [formData, setFormData] = useState<FormState>(FORM_VACIO);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Carga el concepto a editar — todos los campos vienen del API real (§6.1).
  useEffect(() => {
    if (!conceptoId) return;
    setCargando(true);
    nominaApi.conceptos
      .ver(conceptoId)
      .then((res) => {
        const c = res.data;
        // % empleado: viene en `porcentaje_empleado`. Si está null cae al
        // legacy `porcentaje` (compat con conceptos viejos).
        const pctEmp = c.porcentaje_empleado ?? c.porcentaje;
        const pctEmpr = c.porcentaje_empresa;
        setFormData({
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: TIPO_API_TO_VISUAL[c.tipo] ?? 'Aporte Legal',
          operacion: c.operacion,
          porcentajeEmpleado: pctEmp != null ? String(pctEmp) : '',
          porcentajeEmpresa: pctEmpr != null ? String(pctEmpr) : '',
          valorFijo: c.valor_referencia != null ? formatThousands(c.valor_referencia) : '',
          aplicaA: c.aplica_a,
          esObligatorio: !!(c.es_obligatorio ?? c.obligatorio),
          afectaSalarioMinimo: !!c.afecta_salario_minimo,
          // El campo afecta_nomina no existe en API_NOMINA — lo mantenemos en
          // UI con default true para compatibilidad visual con el diseño V.12+1.
          afectaNomina: true,
          tipoRemuneracion: c.tipo_remuneracion ?? 'REMUNERADO',
          vigenciaDesde: aIso(c.vigente_desde) || new Date().toISOString().split('T')[0],
          vigenciaHasta: aIso(c.vigente_hasta),
        });
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudo cargar el concepto'))
      .finally(() => setCargando(false));
  }, [conceptoId]);

  const handleSave = async () => {
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    if (!formData.vigenciaDesde) {
      toast.error('La fecha de vigencia es obligatoria');
      return;
    }
    if (esAporteODeduccionLegal(formData.tipo)) {
      if (!formData.porcentajeEmpleado && !formData.porcentajeEmpresa) {
        toast.error('Debes ingresar al menos un porcentaje');
        return;
      }
    } else if (!formData.valorFijo) {
      toast.error('Debes ingresar un valor fijo');
      return;
    }

    const tipoApi = TIPO_VISUAL_TO_API[formData.tipo];
    const usaPorcentaje = esAporteODeduccionLegal(formData.tipo);
    const pctEmp = formData.porcentajeEmpleado ? Number(formData.porcentajeEmpleado) : null;
    const pctEmpr = formData.porcentajeEmpresa ? Number(formData.porcentajeEmpresa) : null;
    const valorRef = !usaPorcentaje ? Number(parseCOP(formData.valorFijo)) : null;

    setGuardando(true);
    try {
      // Campos comunes entre crear y editar — el doc §6.3 lista los editables.
      const comunes: Partial<NominaConcepto> = {
        nombre: formData.nombre.trim(),
        aplica_a: formData.aplicaA,
        es_obligatorio: formData.esObligatorio,
        afecta_salario_minimo: formData.afectaSalarioMinimo,
        tipo_remuneracion: formData.tipoRemuneracion,
        vigente_desde: isoADmy(formData.vigenciaDesde),
        vigente_hasta: formData.vigenciaHasta ? isoADmy(formData.vigenciaHasta) : null,
        ...(usaPorcentaje
          ? { porcentaje_empleado: pctEmp ?? 0, porcentaje_empresa: pctEmpr ?? 0 }
          : { valor_referencia: valorRef! }),
      };

      if (isEditing && conceptoId) {
        await nominaApi.conceptos.editar(conceptoId, comunes);
      } else {
        const payload: Partial<NominaConcepto> = {
          codigo: formData.codigo.trim().toUpperCase(),
          tipo: tipoApi,
          subtipo: 'OTRO' as any,
          operacion: formData.operacion,
          calculo: usaPorcentaje ? 'PORCENTAJE' : 'VALOR_FIJO',
          ...comunes,
        };
        await nominaApi.conceptos.crear(payload);
      }

      toast.success(isEditing ? 'Concepto actualizado correctamente' : 'Concepto creado correctamente');
      volverAConceptos(navigate);
    } catch (e: any) {
      const errCodigo = e?.errors?.codigo?.[0] as string | undefined;
      if (errCodigo && /already been taken|has already|ya/i.test(errCodigo)) {
        toast.error(`El código "${formData.codigo}" ya está registrado en este tenant.`);
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar el concepto');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Cargando concepto…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => volverAConceptos(navigate)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Concepto' : 'Nuevo Concepto de Nómina'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? 'Modifica los datos del concepto'
                : 'Define aportes, deducciones o bonificaciones para aplicar en la nómina'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={guardando}>
          <Save className="h-5 w-5" />
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codigo"
                  placeholder="SALUD"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                  }
                  className="uppercase"
                  disabled={isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Salud"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: TipoVisual) => {
                    const esAporte = value === 'Aporte Legal' || value === 'Deducción Legal' || value === 'Deducción Voluntaria';
                    setFormData((prev) => ({
                      ...prev,
                      tipo: value,
                      operacion: esAporte ? 'RESTA' : 'SUMA',
                    }));
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aporte Legal">Aporte Legal</SelectItem>
                    <SelectItem value="Deducción Legal">Deducción Legal</SelectItem>
                    <SelectItem value="Deducción Voluntaria">Deducción Voluntaria</SelectItem>
                    <SelectItem value="Bonificación Fija">Bonificación Fija</SelectItem>
                    <SelectItem value="Bonificación Variable">Bonificación Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aplicaA">
                  Aplica A <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.aplicaA}
                  onValueChange={(value: AplicaA) =>
                    setFormData((prev) => ({ ...prev, aplicaA: value }))
                  }
                >
                  <SelectTrigger id="aplicaA">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Empleados FIJO</SelectItem>
                    <SelectItem value="VARIABLE">Empleados VARIABLE</SelectItem>
                    <SelectItem value="AMBOS">AMBOS tipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle>
              {esAporteODeduccionLegal(formData.tipo) ? 'Porcentajes' : 'Valor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {esAporteODeduccionLegal(formData.tipo) ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="porcEmpleado">% Empleado</Label>
                  <div className="relative">
                    <Input
                      id="porcEmpleado"
                      type="number"
                      step="0.01"
                      placeholder="4.0"
                      value={formData.porcentajeEmpleado}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, porcentajeEmpleado: e.target.value }))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Porcentaje que descuenta al empleado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="porcEmpresa">% Empresa</Label>
                  <div className="relative">
                    <Input
                      id="porcEmpresa"
                      type="number"
                      step="0.01"
                      placeholder="8.5"
                      value={formData.porcentajeEmpresa}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, porcentajeEmpresa: e.target.value }))
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Porcentaje que asume la empresa
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Porcentaje Total
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {(
                          (Number(formData.porcentajeEmpleado) || 0) +
                          (Number(formData.porcentajeEmpresa) || 0)
                        ).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="valorFijo">
                  Valor Fijo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="valorFijo"
                    inputMode="numeric"
                    placeholder="200.000"
                    value={formData.valorFijo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        valorFijo: formatThousands(parseCOP(e.target.value)),
                      }))
                    }
                    className="pl-8"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Monto fijo que se {formData.operacion === 'SUMA' ? 'suma' : 'resta'} en la nómina
                </p>
                {formData.valorFijo && Number(parseCOP(formData.valorFijo)) > 0 && (
                  <div className="rounded-lg bg-muted/50 p-4 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Valor Formateado
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        ${Number(parseCOP(formData.valorFijo)).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración de Nómina */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Nómina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="afectaSalarioMinimo"
                  checked={formData.afectaSalarioMinimo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, afectaSalarioMinimo: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="afectaSalarioMinimo" className="cursor-pointer">
                    Afecta Salario Mínimo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Indica si este concepto afecta el cálculo del salario mínimo
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="afectaNomina"
                  checked={formData.afectaNomina}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, afectaNomina: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="afectaNomina" className="cursor-pointer">
                    Afecta Nómina
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Indica si este concepto se incluye en el cálculo de la nómina
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="esObligatorio"
                  checked={formData.esObligatorio}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, esObligatorio: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="esObligatorio" className="cursor-pointer">
                    Concepto Obligatorio
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Si está activo, el concepto no se puede eliminar (ej. SALUD, PENSIÓN).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoRemuneracion">
                  Tipo de Remuneración <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipoRemuneracion}
                  onValueChange={(value: TipoRemuneracion) =>
                    setFormData((prev) => ({ ...prev, tipoRemuneracion: value }))
                  }
                >
                  <SelectTrigger id="tipoRemuneracion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REMUNERADO">Remunerado</SelectItem>
                    <SelectItem value="NO_REMUNERADO">No Remunerado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.tipoRemuneracion === 'REMUNERADO'
                    ? 'Este concepto cuenta para el cálculo de prestaciones sociales'
                    : 'Este concepto NO cuenta para el cálculo de prestaciones sociales'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vigencia */}
        <Card>
          <CardHeader>
            <CardTitle>Vigencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vigDesde">
                  Vigencia Desde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vigDesde"
                  type="date"
                  value={formData.vigenciaDesde}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenciaDesde: e.target.value }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Fecha desde la cual aplica el concepto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vigHasta">Vigencia Hasta (opcional)</Label>
                <Input
                  id="vigHasta"
                  type="date"
                  value={formData.vigenciaHasta}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vigenciaHasta: e.target.value }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Déjalo vacío si el concepto está vigente indefinidamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
