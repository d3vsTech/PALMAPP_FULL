import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatThousands, parseCOP } from '../lib/format';
import {
  configuracionApi,
  type ConstantesLegales,
  type ConstantesLegalesPayload,
} from '../../../api/configuracion';
import { FechaDiaMesPicker } from './FechaPickers';

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
  };
}

const formatNumber = (value: string) => {
  const num = (value ?? '').toString().replace(/\./g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export function ConstantesLegalesTab() {
  const [constantes, setConstantes] = useState<FormState>(FORM_VACIO);

  useEffect(() => {
    let cancelado = false;
    configuracionApi.constantesLegales
      .obtener()
      .then((res) => {
        if (!cancelado) setConstantes(apiToForm(res.data));
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las constantes legales');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setConstantes((prev) => ({ ...prev, [field]: value }));
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
              type="number"
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
                  value={formatNumber(constantes.smmlv)}
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
                  value={formatNumber(constantes.auxilioTransporte)}
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
                  type="number"
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
              type="number"
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
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-5 w-5" />
          Guardar Constantes
        </Button>
      </div>
    </div>
  );
}
