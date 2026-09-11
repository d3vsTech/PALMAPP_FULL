import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Calendar, FileText, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function NuevaIntereses() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    anio: new Date().getFullYear().toString(),
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    notas: '',
  });

  const handleChange = (campo: string, valor: string) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const validar = () => {
    if (!formData.anio || isNaN(Number(formData.anio))) {
      toast.error('Ingresa un año válido');
      return false;
    }
    if (!formData.fechaInicio || !formData.fechaFin) {
      toast.error('Define las fechas del período');
      return false;
    }
    if (new Date(formData.fechaInicio) > new Date(formData.fechaFin)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return false;
    }
    return true;
  };

  const guardar = () => {
    if (!validar()) return;
    toast.success('Período de intereses creado. Ahora puedes liquidar.');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/liquidaciones')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Liquidaciones
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Nuevo Período de Intereses</h1>
          <p className="text-muted-foreground mt-1">
            Define el período anual (tasa 12% — Ley 52 de 1975). Los colaboradores se agregan al liquidar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Período
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="anio">
                Año <span className="text-destructive">*</span>
              </Label>
              <Input
                id="anio"
                type="number"
                placeholder="2026"
                value={formData.anio}
                onChange={(e) => handleChange('anio', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder="Intereses de Cesantías 2026"
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">
                Fecha Inicio <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => handleChange('fechaInicio', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">
                Fecha Fin <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleChange('fechaFin', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              rows={3}
              placeholder="Observaciones adicionales del período..."
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Percent className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">¿Cómo continuar?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Una vez creado el período, aparecerá en la lista como <strong>BORRADOR</strong>. Haz clic en{' '}
                <strong>Liquidar</strong> para agregar colaboradores y calcular los intereses al 12% anual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" size="lg" onClick={() => navigate('/liquidaciones')}>
          Cancelar
        </Button>
        <Button size="lg" onClick={guardar} className="gap-2">
          <FileText className="h-5 w-5" />
          Crear Período
        </Button>
      </div>
    </div>
  );
}
