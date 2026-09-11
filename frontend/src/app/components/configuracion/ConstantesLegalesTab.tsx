import { useEffect, useState } from 'react';
import { cached } from '../../../api/cache';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { formatThousands, parseCOP } from '../lib/format';
import {
  configuracionApi,
  type ConstantesLegales,
  type ConstantesLegalesPayload,
} from '../../../api/configuracion';
import { FechaDiaMesPicker } from './FechaPickers';
import { TabLoadingGate } from './TabLoadingGate';

const FORM_VACIO = {
  anoVigente: new Date().getFullYear().toString(),
  smmlv: '',
  auxilioTransporte: '',
  tasaInteresesCesantias: '',
  diasVacacionesAnuales: '',
  diasAnoComercial: '',
  diasMesComercial: '',
  fechaLimiteCesantias: '',
  fechaLimiteInteresesCesantias: '',
  fechaLimitePrimaPrimerSemestre: '',
  fechaLimitePrimaSegundoSemestre: '',
  // Política de Liquidaciones (§14 API_PARAMETRICAS) — defaults del backend.
  liqAuxilioModo: 'DEVENGADO_REAL',
  liqInteresesDiasModo: 'DIAS_VINCULACION',
  liqDescontarSuspensiones: true,
  liqPromedioExcluyeIncapacidad: true,
};

type FormState = typeof FORM_VACIO;

const aTexto = (v: number | string | null | undefined) =>
  v === null || v === undefined ? '' : String(v);

function apiToForm(data: ConstantesLegales): FormState {
  return {
    anoVigente:                      aTexto(data.anio_vigente),
    smmlv:                           aTexto(data.salario_minimo_vigente),
    auxilioTransporte:               aTexto(data.auxilio_transporte),
    tasaInteresesCesantias:          aTexto(data.tasa_interes_cesantias),
    diasVacacionesAnuales:           aTexto(data.dias_vacaciones_anuales),
    diasAnoComercial:                aTexto(data.dias_anio_comercial),
    diasMesComercial:                aTexto(data.dias_mes_comercial),
    fechaLimiteCesantias:            aTexto(data.fecha_limite_consignacion_cesantias),
    fechaLimiteInteresesCesantias:   aTexto(data.fecha_limite_pago_intereses_cesantias),
    fechaLimitePrimaPrimerSemestre:  aTexto(data.fecha_limite_prima_primer_semestre),
    fechaLimitePrimaSegundoSemestre: aTexto(data.fecha_limite_prima_segundo_semestre),
    liqAuxilioModo:                  data.liq_auxilio_modo ?? 'DEVENGADO_REAL',
    liqInteresesDiasModo:            data.liq_intereses_dias_modo ?? 'DIAS_VINCULACION',
    liqDescontarSuspensiones:        data.liq_descontar_suspensiones ?? true,
    liqPromedioExcluyeIncapacidad:   data.liq_promedio_excluye_incapacidad ?? true,
  };
}

function formToPayload(f: FormState): ConstantesLegalesPayload {
  return {
    anio_vigente:                          Number(f.anoVigente),
    salario_minimo_vigente:                Number(f.smmlv),
    auxilio_transporte:                    Number(f.auxilioTransporte),
    tasa_interes_cesantias:                Number(f.tasaInteresesCesantias),
    dias_vacaciones_anuales:               Number(f.diasVacacionesAnuales),
    dias_anio_comercial:                   Number(f.diasAnoComercial),
    dias_mes_comercial:                    Number(f.diasMesComercial),
    fecha_limite_consignacion_cesantias:   f.fechaLimiteCesantias,
    fecha_limite_pago_intereses_cesantias: f.fechaLimiteInteresesCesantias,
    fecha_limite_prima_primer_semestre:    f.fechaLimitePrimaPrimerSemestre,
    fecha_limite_prima_segundo_semestre:   f.fechaLimitePrimaSegundoSemestre,
    liq_auxilio_modo:                      f.liqAuxilioModo as 'DEVENGADO_REAL' | 'MENSUAL_COMPLETO',
    liq_intereses_dias_modo:               f.liqInteresesDiasModo as 'DIAS_VINCULACION' | 'DIAS_COMPUTADOS',
    liq_descontar_suspensiones:            f.liqDescontarSuspensiones,
    liq_promedio_excluye_incapacidad:      f.liqPromedioExcluyeIncapacidad,
  };
}

export function ConstantesLegalesTab() {
  const [constantes, setConstantes] = useState<FormState>(FORM_VACIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    cached('config:constantes-legales', () => configuracionApi.constantesLegales.obtener())
      .then((res) => {
        if (!cancelado) setConstantes(apiToForm(res.data));
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las constantes legales');
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setConstantes((prev) => ({ ...prev, [field]: value } as FormState));
  };

  const handleSave = async () => {
    try {
      const res = await configuracionApi.constantesLegales.actualizar(
        formToPayload(constantes)
      );
      setConstantes(apiToForm(res.data));
      toast.success('Constantes legales guardadas correctamente');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar las constantes legales');
      }
    }
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando constantes legales…">
    <div className="space-y-6">
      {/* Año Vigente */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Año de Vigencia</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Período fiscal activo (tomado del sistema)</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="anoVigente">Año Vigente *</Label>
            <Input
              id="anoVigente"
              type="number" step="0.001"
              min={2020}
              max={2100}
              value={constantes.anoVigente}
              onChange={(e) => handleChange('anoVigente', e.target.value)}
              className="text-2xl font-bold text-center"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Año fiscal activo del tenant (rango permitido 2020 – 2100)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Valores Salariales Base */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Valores Salariales Base</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Salarios mínimos y auxilios legales</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smmlv">Salario Mínimo Mensual Legal Vigente (SMMLV) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="smmlv"
                  value={formatThousands(constantes.smmlv)}
                  onChange={(e) => handleChange('smmlv', parseCOP(e.target.value))}
                  placeholder="1.750.905"
                  className="pl-7 text-lg font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auxilioTransporte">Auxilio de Transporte Mensual *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="auxilioTransporte"
                  value={formatThousands(constantes.auxilioTransporte)}
                  onChange={(e) => handleChange('auxilioTransporte', parseCOP(e.target.value))}
                  placeholder="249.095"
                  className="pl-7 text-lg font-semibold"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cesantías */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Cesantías</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Configuración de cesantías e intereses</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tasaInteresesCesantias">Tasa de Interés Anual (%) *</Label>
              <div className="relative">
                <Input
                  id="tasaInteresesCesantias"
                  type="number" step="0.001"
                  value={constantes.tasaInteresesCesantias}
                  onChange={(e) => handleChange('tasaInteresesCesantias', e.target.value)}
                  placeholder="12"
                  className="text-lg font-semibold pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimiteCesantias">Fecha Límite Consignación</Label>
              <FechaDiaMesPicker
                id="fechaLimiteCesantias"
                value={constantes.fechaLimiteCesantias}
                onChange={(v) => handleChange('fechaLimiteCesantias', v)}
                placeholder="Ej: 14 de febrero"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimiteInteresesCesantias">Fecha Límite Pago Intereses</Label>
              <FechaDiaMesPicker
                id="fechaLimiteInteresesCesantias"
                value={constantes.fechaLimiteInteresesCesantias}
                onChange={(v) => handleChange('fechaLimiteInteresesCesantias', v)}
                placeholder="Ej: 31 de enero"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primas */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Primas de Servicios</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Fechas límite de pago por semestre</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fechaLimitePrimaPrimerSemestre">Fecha Límite Primer Semestre</Label>
              <FechaDiaMesPicker
                id="fechaLimitePrimaPrimerSemestre"
                value={constantes.fechaLimitePrimaPrimerSemestre}
                onChange={(v) => handleChange('fechaLimitePrimaPrimerSemestre', v)}
                placeholder="Ej: 30 de junio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimitePrimaSegundoSemestre">Fecha Límite Segundo Semestre</Label>
              <FechaDiaMesPicker
                id="fechaLimitePrimaSegundoSemestre"
                value={constantes.fechaLimitePrimaSegundoSemestre}
                onChange={(v) => handleChange('fechaLimitePrimaSegundoSemestre', v)}
                placeholder="Ej: 20 de diciembre"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vacaciones */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Vacaciones</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Días de vacaciones remuneradas anuales</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="diasVacacionesAnuales">Días de Vacaciones Anuales *</Label>
            <Input
              id="diasVacacionesAnuales"
              type="number" step="0.001"
              value={constantes.diasVacacionesAnuales}
              onChange={(e) => handleChange('diasVacacionesAnuales', e.target.value)}
              placeholder="15"
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Según legislación colombiana: 15 días hábiles por año trabajado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Días Laborales para Cálculos */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Días Laborales para Cálculos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Valores estándar según legislación colombiana</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="diasAnoComercial">Días del Año Comercial *</Label>
              <Input
                id="diasAnoComercial"
                type="number" step="0.001"
                value={constantes.diasAnoComercial}
                onChange={(e) => handleChange('diasAnoComercial', e.target.value)}
                placeholder="360"
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diasMesComercial">Días del Mes Comercial *</Label>
              <Input
                id="diasMesComercial"
                type="number" step="0.001"
                value={constantes.diasMesComercial}
                onChange={(e) => handleChange('diasMesComercial', e.target.value)}
                placeholder="30"
                className="text-lg font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Política de Liquidaciones (cesantías, intereses, prima) */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Política de Liquidaciones</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cómo se calculan cesantías e intereses. Cada período congela estos valores al confirmarse: cambiarlos no altera liquidaciones ya cerradas.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="liqAuxilioModo">Auxilio de transporte en la base</Label>
              <Select
                value={constantes.liqAuxilioModo}
                onValueChange={(v) => handleChange('liqAuxilioModo', v)}
              >
                <SelectTrigger id="liqAuxilioModo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVENGADO_REAL">Devengado real (lo pagado en nómina)</SelectItem>
                  <SelectItem value="MENSUAL_COMPLETO">Mensual completo (si tiene derecho)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Devengado real suma lo pagado en las nóminas cerradas del período. Mensual completo usa el valor vigente y es de mayor costo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="liqInteresesDiasModo">Días de la fórmula de intereses</Label>
              <Select
                value={constantes.liqInteresesDiasModo}
                onValueChange={(v) => handleChange('liqInteresesDiasModo', v)}
              >
                <SelectTrigger id="liqInteresesDiasModo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIAS_VINCULACION">Días de vinculación (recomendado)</SelectItem>
                  <SelectItem value="DIAS_COMPUTADOS">Días computados de la cesantía</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Con días de vinculación las suspensiones no se descuentan dos veces. Días computados paga menos y no tiene respaldo en el CST art. 53.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Suspensiones descuentan días de cesantías</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permisos no remunerados y suspensiones disciplinarias restan días. Es una facultad del CST art. 53 y se aplica igual todos los años.
                </p>
              </div>
              <Switch
                checked={constantes.liqDescontarSuspensiones}
                onCheckedChange={(v) => handleChange('liqDescontarSuspensiones', v)}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Incapacidades fuera del divisor del promedio</p>
                <p className="text-xs text-muted-foreground mt-1">
                  El promedio salarial se calcula como si el incapacitado hubiera trabajado. Apagado, el promedio incluye esos días y puede diluirse.
                </p>
              </div>
              <Switch
                checked={constantes.liqPromedioExcluyeIncapacidad}
                onCheckedChange={(v) => handleChange('liqPromedioExcluyeIncapacidad', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-5 w-5" />
          Guardar Constantes
        </Button>
      </div>
    </div>
    </TabLoadingGate>
  );
}
