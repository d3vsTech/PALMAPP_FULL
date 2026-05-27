import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  configuracionApi,
  type ConstantesLegales,
  type ConstantesLegalesPayload,
} from '../../../api/configuracion';

/**
 * Tab "Constantes Legales" conectado al API real (§14 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET  /api/v1/tenant/configuracion/constantes-legales  → hidratar form
 *   PUT  /api/v1/tenant/configuracion/constantes-legales  → guardar cambios
 *
 * Los decimales pueden venir como string del backend; se parsean para mostrar
 * y se mandan como Number al guardar. Las fechas son strings tipo "14 de febrero".
 */

const FORM_VACIO = {
  anoVigente: '',
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
};

type FormState = typeof FORM_VACIO;

const aTexto = (v: number | string | null | undefined) =>
  v === null || v === undefined ? '' : String(v);

/** Mapea la respuesta del API al estado del form. */
function apiToForm(data: ConstantesLegales): FormState {
  return {
    anoVigente:                     aTexto(data.anio_vigente),
    smmlv:                          aTexto(data.salario_minimo_vigente),
    auxilioTransporte:              aTexto(data.auxilio_transporte),
    tasaInteresesCesantias:         aTexto(data.tasa_interes_cesantias),
    diasVacacionesAnuales:          aTexto(data.dias_vacaciones_anuales),
    diasAnoComercial:               aTexto(data.dias_anio_comercial),
    diasMesComercial:               aTexto(data.dias_mes_comercial),
    fechaLimiteCesantias:           aTexto(data.fecha_limite_consignacion_cesantias),
    fechaLimiteInteresesCesantias:  aTexto(data.fecha_limite_pago_intereses_cesantias),
    fechaLimitePrimaPrimerSemestre: aTexto(data.fecha_limite_prima_primer_semestre),
    fechaLimitePrimaSegundoSemestre: aTexto(data.fecha_limite_prima_segundo_semestre),
  };
}

/** Mapea el estado del form al payload del PUT (números como Number). */
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
  };
}

export function ConstantesLegalesTab() {
  const [constantes, setConstantes] = useState<FormState>(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    configuracionApi.constantesLegales
      .obtener()
      .then((res) => {
        if (!cancelado) setConstantes(apiToForm(res.data));
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las constantes legales');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setConstantes((prev) => ({ ...prev, [field]: value }));
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/\./g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSave = async () => {
    setGuardando(true);
    try {
      const res = await configuracionApi.constantesLegales.actualizar(formToPayload(constantes));
      setConstantes(apiToForm(res.data));
      toast.success(res.message ?? 'Constantes legales guardadas correctamente');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar las constantes legales');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando constantes legales...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Año Vigente */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Año de Vigencia</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Período fiscal activo</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2 max-w-[200px]">
            <Label htmlFor="anoVigente">Año Vigente *</Label>
            <Input
              id="anoVigente"
              type="number"
              min={2020}
              max={2100}
              value={constantes.anoVigente}
              onChange={(e) => handleChange('anoVigente', e.target.value)}
            />
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
                <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                <Input
                  id="smmlv"
                  value={formatNumber(constantes.smmlv)}
                  onChange={(e) => handleChange('smmlv', e.target.value.replace(/\./g, ''))}
                  placeholder="1.750.905"
                  className="pl-7 text-lg font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auxilioTransporte">Auxilio de Transporte Mensual *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                <Input
                  id="auxilioTransporte"
                  value={formatNumber(constantes.auxilioTransporte)}
                  onChange={(e) => handleChange('auxilioTransporte', e.target.value.replace(/\./g, ''))}
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
                  type="number"
                  value={constantes.tasaInteresesCesantias}
                  onChange={(e) => handleChange('tasaInteresesCesantias', e.target.value)}
                  placeholder="12"
                  className="text-lg font-semibold"
                />
                <span className="absolute right-3 top-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimiteCesantias">Fecha Límite Consignación</Label>
              <Input
                id="fechaLimiteCesantias"
                value={constantes.fechaLimiteCesantias}
                onChange={(e) => handleChange('fechaLimiteCesantias', e.target.value)}
                readOnly
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimiteInteresesCesantias">Fecha Límite Pago Intereses</Label>
              <Input
                id="fechaLimiteInteresesCesantias"
                value={constantes.fechaLimiteInteresesCesantias}
                onChange={(e) => handleChange('fechaLimiteInteresesCesantias', e.target.value)}
                readOnly
                className="bg-muted/50"
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
              <Input
                id="fechaLimitePrimaPrimerSemestre"
                value={constantes.fechaLimitePrimaPrimerSemestre}
                onChange={(e) => handleChange('fechaLimitePrimaPrimerSemestre', e.target.value)}
                readOnly
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimitePrimaSegundoSemestre">Fecha Límite Segundo Semestre</Label>
              <Input
                id="fechaLimitePrimaSegundoSemestre"
                value={constantes.fechaLimitePrimaSegundoSemestre}
                onChange={(e) => handleChange('fechaLimitePrimaSegundoSemestre', e.target.value)}
                readOnly
                className="bg-muted/50"
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
          <div className="space-y-2 max-w-[200px]">
            <Label htmlFor="diasVacacionesAnuales">Días de Vacaciones Anuales *</Label>
            <Input
              id="diasVacacionesAnuales"
              type="number"
              min={1}
              max={365}
              value={constantes.diasVacacionesAnuales}
              onChange={(e) => handleChange('diasVacacionesAnuales', e.target.value)}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground">
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
                type="number"
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
                type="number"
                value={constantes.diasMesComercial}
                onChange={(e) => handleChange('diasMesComercial', e.target.value)}
                placeholder="30"
                className="text-lg font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={guardando}>
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {guardando ? 'Guardando...' : 'Guardar Constantes'}
        </Button>
      </div>
    </div>
  );
}
