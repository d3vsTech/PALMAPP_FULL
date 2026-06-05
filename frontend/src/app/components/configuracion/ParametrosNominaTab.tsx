import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
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
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type ConfiguracionNomina,
  type ConfiguracionNominaPayload,
  type TipoPagoNomina,
} from '../../../api/configuracion';
import { TabLoadingGate } from './TabLoadingGate';

/**
 * Tab "Parámetros de Nómina" — visual V.12, datos V.2 (API real).
 * Endpoints: GET/PUT /api/v1/tenant/configuracion/nomina (payload parcial).
 * Solo se envía periodicidad y días Q1/Q2 (mensual reusa Q1 inicio / Q2 fin).
 */

const FORM_VACIO = {
  periodicidad: 'QUINCENAL' as TipoPagoNomina,
  fechaInicioQuincena1: '1',
  fechaFinQuincena1: '15',
  fechaInicioQuincena2: '16',
  fechaFinQuincena2: '30',
  fechaInicioMes: '1',
  fechaFinMes: '30',
};

type FormState = typeof FORM_VACIO;

function apiToForm(data: ConfiguracionNomina): FormState {
  return {
    periodicidad: data.tipo_pago_nomina,
    fechaInicioQuincena1: String(data.dia_inicio_q1),
    fechaFinQuincena1: String(data.dia_fin_q1),
    fechaInicioQuincena2: String(data.dia_inicio_q2),
    fechaFinQuincena2: String(data.dia_fin_q2),
    fechaInicioMes: String(data.dia_inicio_q1),
    fechaFinMes: String(data.dia_fin_q2),
  };
}

function formToPayload(f: FormState): ConfiguracionNominaPayload {
  if (f.periodicidad === 'MENSUAL') {
    return {
      tipo_pago_nomina: f.periodicidad,
      dia_inicio_q1: Number(f.fechaInicioMes),
      dia_fin_q1: Number(f.fechaFinMes),
      dia_inicio_q2: Number(f.fechaInicioMes),
      dia_fin_q2: Number(f.fechaFinMes),
    };
  }
  return {
    tipo_pago_nomina: f.periodicidad,
    dia_inicio_q1: Number(f.fechaInicioQuincena1),
    dia_fin_q1: Number(f.fechaFinQuincena1),
    dia_inicio_q2: Number(f.fechaInicioQuincena2),
    dia_fin_q2: Number(f.fechaFinQuincena2),
  };
}

export function ParametrosNominaTab() {
  const [parametros, setParametros] = useState<FormState>(FORM_VACIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configuracionApi.configuracionNomina.obtener()
      .then((res) => setParametros(apiToForm(res.data)))
      .catch((e: any) => {
        toast.error(e?.message ?? 'No se pudieron cargar los parámetros de nómina');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const res = await configuracionApi.configuracionNomina.actualizar(formToPayload(parametros));
      setParametros(apiToForm(res.data));
      toast.success(res.message ?? 'Parámetros de nómina guardados correctamente');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.CORTE_QUINCENA_INVALIDO) {
        const msg = e?.errors
          ? (Object.values(e.errors).flat()[0] as string | undefined)
          : undefined;
        toast.error(msg ?? 'Las fechas de corte de quincena no son coherentes');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar los cambios');
      }
    }
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando parámetros de nómina…">
    <Card className="border-border">
      <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
        <CardTitle>Parámetros de Nómina</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Configura la periodicidad y fechas de corte de la nómina
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Periodicidad */}
          <div className="max-w-md">
            <Label htmlFor="periodicidad">
              Periodicidad de la Nómina <span className="text-destructive">*</span>
            </Label>
            <Select
              value={parametros.periodicidad}
              onValueChange={(value: TipoPagoNomina) =>
                setParametros((prev) => ({ ...prev, periodicidad: value }))
              }
            >
              <SelectTrigger id="periodicidad" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                <SelectItem value="MENSUAL">Mensual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {parametros.periodicidad === 'QUINCENAL'
                ? 'La nómina se procesará dos veces al mes'
                : 'La nómina se procesará una vez al mes'}
            </p>
          </div>

          {/* Fechas de Corte */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
              Fechas de Corte
            </h3>

            {parametros.periodicidad === 'QUINCENAL' ? (
              <div className="space-y-6 max-w-2xl">
                {/* Primera Quincena */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h4 className="font-medium mb-3">Primera Quincena</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicioQ1">Día de Inicio</Label>
                      <Select
                        value={parametros.fechaInicioQuincena1}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaInicioQuincena1: value }))
                        }
                      >
                        <SelectTrigger id="fechaInicioQ1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaFinQ1">Día de Fin</Label>
                      <Select
                        value={parametros.fechaFinQuincena1}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaFinQuincena1: value }))
                        }
                      >
                        <SelectTrigger id="fechaFinQ1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Periodo: Del {parametros.fechaInicioQuincena1} al {parametros.fechaFinQuincena1} de cada mes
                  </p>
                </div>

                {/* Segunda Quincena */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h4 className="font-medium mb-3">Segunda Quincena</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicioQ2">Día de Inicio</Label>
                      <Select
                        value={parametros.fechaInicioQuincena2}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaInicioQuincena2: value }))
                        }
                      >
                        <SelectTrigger id="fechaInicioQ2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaFinQ2">Día de Fin</Label>
                      <Select
                        value={parametros.fechaFinQuincena2}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaFinQuincena2: value }))
                        }
                      >
                        <SelectTrigger id="fechaFinQ2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Periodo: Del {parametros.fechaInicioQuincena2} al {parametros.fechaFinQuincena2} de cada mes
                  </p>
                </div>
              </div>
            ) : (
              /* Nómina Mensual */
              <div className="max-w-2xl">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h4 className="font-medium mb-3">Periodo Mensual</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicioMes">Día de Inicio</Label>
                      <Select
                        value={parametros.fechaInicioMes}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaInicioMes: value }))
                        }
                      >
                        <SelectTrigger id="fechaInicioMes">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaFinMes">Día de Fin</Label>
                      <Select
                        value={parametros.fechaFinMes}
                        onValueChange={(value) =>
                          setParametros((prev) => ({ ...prev, fechaFinMes: value }))
                        }
                      >
                        <SelectTrigger id="fechaFinMes">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Día {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Periodo: Del {parametros.fechaInicioMes} al {parametros.fechaFinMes} de cada mes
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Nota informativa */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Nota:</strong> Estos parámetros definen los periodos de corte para el procesamiento de la nómina.
              Asegúrate de que las fechas correspondan con las políticas de pago de tu empresa.
            </p>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} size="lg" className="gap-2">
              <Save className="h-5 w-5" />
              Guardar Parámetros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </TabLoadingGate>
  );
}
