import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function ConstantesLegalesTab() {
  const [constantes, setConstantes] = useState({
    // Año vigente
    anoVigente: '2026',

    // Valores base
    smmlv: '1750905',
    auxilioTransporte: '249095',

    // Tasas de interés
    tasaInteresesCesantias: '12',

    // Días legales
    diasVacacionesAnuales: '15',
    diasAnoComercial: '360',
    diasMesComercial: '30',

    // Períodos de pago
    fechaLimiteCesantias: '14 de febrero',
    fechaLimiteInteresesCesantias: '31 de enero',
    fechaLimitePrimaPrimerSemestre: '30 de junio',
    fechaLimitePrimaSegundoSemestre: '20 de diciembre'
  });

  const handleChange = (field: string, value: string) => {
    setConstantes(prev => ({ ...prev, [field]: value }));
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/\./g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSave = () => {
    console.log('Guardando constantes legales:', constantes);
    toast.success('Constantes legales guardadas correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Año Vigente */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Año de Vigencia</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Período fiscal activo</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="anoVigente">Año Vigente *</Label>
            <Input
              id="anoVigente"
              type="number"
              value={constantes.anoVigente}
              onChange={(e) => handleChange('anoVigente', e.target.value)}
              className="text-2xl font-bold text-center"
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
