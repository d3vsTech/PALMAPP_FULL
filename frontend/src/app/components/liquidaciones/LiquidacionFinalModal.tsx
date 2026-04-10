import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { FileText, Calculator, Printer } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface LiquidacionFinal {
  colaboradorId: string;
  fechaRetiro: string;
  motivoRetiro: string;
  diasTrabajados: number;
  salario: number;
  subsidioTransporte: number;
}

interface LiquidacionFinalModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Array<{ id: string; nombres: string; apellidos: string; salarioBase: number; fechaIngreso: string }>;
  onSave: (liquidacion: any) => void;
}

const motivosRetiro = [
  'Renuncia Voluntaria',
  'Despido sin Justa Causa',
  'Despido con Justa Causa',
  'Mutuo Acuerdo',
  'Terminación Contrato a Término Fijo',
  'Pensión',
  'Fallecimiento',
];

const SUBSIDIO_TRANSPORTE = 140606; // Valor 2026
const SALARIO_MINIMO = 1423500; // SMLV 2026

export function LiquidacionFinalModal({
  isOpen,
  onClose,
  colaboradores,
  onSave,
}: LiquidacionFinalModalProps) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [formData, setFormData] = useState<LiquidacionFinal>({
    colaboradorId: '',
    fechaRetiro: new Date().toISOString().split('T')[0],
    motivoRetiro: 'Renuncia Voluntaria',
    diasTrabajados: 0,
    salario: 0,
    subsidioTransporte: 0,
  });

  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setFormData({
        colaboradorId: '',
        fechaRetiro: new Date().toISOString().split('T')[0],
        motivoRetiro: 'Renuncia Voluntaria',
        diasTrabajados: 0,
        salario: 0,
        subsidioTransporte: 0,
      });
      setResultado(null);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof LiquidacionFinal, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleColaboradorChange = (colaboradorId: string) => {
    const colaborador = colaboradores.find((c) => c.id === colaboradorId);
    if (colaborador) {
      // Calcular días trabajados desde fecha de ingreso
      const fechaIngreso = new Date(colaborador.fechaIngreso);
      const fechaRetiro = new Date(formData.fechaRetiro);
      const diffTime = Math.abs(fechaRetiro.getTime() - fechaIngreso.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setFormData((prev) => ({
        ...prev,
        colaboradorId,
        diasTrabajados: diffDays,
        salario: colaborador.salarioBase,
        subsidioTransporte: colaborador.salarioBase <= (2 * SALARIO_MINIMO) ? SUBSIDIO_TRANSPORTE : 0,
      }));
    }
  };

  const calcularLiquidacion = () => {
    const { salario, subsidioTransporte, diasTrabajados, motivoRetiro } = formData;

    // 1. Cesantías: (Salario + Sub. Transporte) × Días / 360
    const cesantias = ((salario + subsidioTransporte) * diasTrabajados) / 360;

    // 2. Intereses sobre Cesantías: Cesantías × 12% × (Días / 360)
    const interesesCesantias = (cesantias * 0.12 * diasTrabajados) / 360;

    // 3. Prima de Servicios: (Salario + Sub. Transporte) × Días / 360
    const prima = ((salario + subsidioTransporte) * diasTrabajados) / 360;

    // 4. Vacaciones: (Salario × Días) / 720 (15 días hábiles por año)
    const vacaciones = (salario * diasTrabajados) / 720;

    // 5. Indemnización (solo por despido sin justa causa)
    let indemnizacion = 0;
    if (motivoRetiro === 'Despido sin Justa Causa') {
      // Menos de 1 año: 30 días de salario
      // Más de 1 año: 30 días + 20 días por cada año adicional
      const anos = Math.floor(diasTrabajados / 360);
      if (anos < 1) {
        indemnizacion = salario;
      } else {
        indemnizacion = salario + (salario * 20 * (anos - 1) / 30);
      }
    }

    // Totales
    const totalLiquidacion = cesantias + interesesCesantias + prima + vacaciones + indemnizacion;

    setResultado({
      conceptos: [
        {
          concepto: 'Cesantías',
          formula: `(Salario + Sub. Transporte) × Días / 360`,
          calculo: `($${salario.toLocaleString()} + $${subsidioTransporte.toLocaleString()}) × ${diasTrabajados} / 360`,
          valor: cesantias,
        },
        {
          concepto: 'Intereses sobre Cesantías',
          formula: 'Cesantías × 12% × (Días / 360)',
          calculo: `$${cesantias.toLocaleString()} × 12% × (${diasTrabajados} / 360)`,
          valor: interesesCesantias,
        },
        {
          concepto: 'Prima de Servicios',
          formula: '(Salario + Sub. Transporte) × Días / 360',
          calculo: `($${salario.toLocaleString()} + $${subsidioTransporte.toLocaleString()}) × ${diasTrabajados} / 360`,
          valor: prima,
        },
        {
          concepto: 'Vacaciones',
          formula: '(Salario × Días) / 720',
          calculo: `$${salario.toLocaleString()} × ${diasTrabajados} / 720`,
          valor: vacaciones,
        },
        ...(indemnizacion > 0
          ? [
              {
                concepto: 'Indemnización por Despido',
                formula: '30 días + 20 días por año adicional',
                calculo: `Salario base × factor de años`,
                valor: indemnizacion,
              },
            ]
          : []),
      ],
      total: totalLiquidacion,
    });

    setStep('result');
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleGuardar = () => {
    onSave({
      ...formData,
      resultado,
    });
    onClose();
  };

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === formData.colaboradorId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Liquidación Final de Contrato
          </DialogTitle>
          <DialogDescription>
            Cálculo completo al finalizar relación laboral
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 py-4">
            {/* Colaborador */}
            <div className="space-y-2">
              <Label htmlFor="colaborador" className="text-sm font-medium">
                Colaborador <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.colaboradorId}
                onValueChange={handleColaboradorChange}
              >
                <SelectTrigger id="colaborador">
                  <SelectValue placeholder="Selecciona un colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nombres} {colaborador.apellidos} - Salario: $
                      {colaborador.salarioBase.toLocaleString('es-CO')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {colaboradorSeleccionado && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Ingreso:</span>
                  <span className="font-medium">
                    {new Date(colaboradorSeleccionado.fechaIngreso).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salario Base:</span>
                  <span className="font-medium">
                    ${colaboradorSeleccionado.salarioBase.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Fecha Retiro */}
              <div className="space-y-2">
                <Label htmlFor="fechaRetiro" className="text-sm font-medium">
                  Fecha de Retiro <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaRetiro"
                  type="date"
                  value={formData.fechaRetiro}
                  onChange={(e) => {
                    handleInputChange('fechaRetiro', e.target.value);
                    if (formData.colaboradorId) {
                      handleColaboradorChange(formData.colaboradorId);
                    }
                  }}
                />
              </div>

              {/* Motivo Retiro */}
              <div className="space-y-2">
                <Label htmlFor="motivoRetiro" className="text-sm font-medium">
                  Motivo de Retiro <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.motivoRetiro}
                  onValueChange={(value) => handleInputChange('motivoRetiro', value)}
                >
                  <SelectTrigger id="motivoRetiro">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosRetiro.map((motivo) => (
                      <SelectItem key={motivo} value={motivo}>
                        {motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.diasTrabajados > 0 && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Días trabajados:</span>{' '}
                  <span className="font-bold text-primary">{formData.diasTrabajados} días</span>
                  {' '}({(formData.diasTrabajados / 360).toFixed(2)} años)
                </p>
              </div>
            )}

            {formData.motivoRetiro === 'Despido sin Justa Causa' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Se calculará indemnización por despido sin justa causa
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={calcularLiquidacion}
                disabled={!formData.colaboradorId || formData.diasTrabajados === 0}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Liquidación
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && resultado && (
          <div className="space-y-6 py-4">
            {/* Información del Colaborador */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Colaborador</p>
                  <p className="font-semibold">
                    {colaboradorSeleccionado?.nombres} {colaboradorSeleccionado?.apellidos}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Retiro</p>
                  <p className="font-semibold">
                    {new Date(formData.fechaRetiro).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Motivo</p>
                  <Badge variant="outline">{formData.motivoRetiro}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Días Trabajados</p>
                  <p className="font-semibold">{formData.diasTrabajados} días</p>
                </div>
              </div>
            </div>

            {/* Tabla de Conceptos */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Detalle de Liquidación</h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Concepto</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead>Cálculo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.conceptos.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.concepto}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.formula}
                        </TableCell>
                        <TableCell className="text-xs">{item.calculo}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          ${Math.round(item.valor).toLocaleString('es-CO')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total a Pagar</p>
                  <p className="text-4xl font-bold text-primary">
                    ${Math.round(resultado.total).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')}>
                Volver
              </Button>
              <Button variant="outline" onClick={handleImprimir} className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleGuardar} className="flex-1 bg-success hover:bg-success/90">
                Guardar Liquidación
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
