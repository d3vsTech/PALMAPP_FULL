import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save, Loader2 } from 'lucide-react';
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

/**
 * Tab "Parámetros de Nómina" conectado al API real (§8 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET  /api/v1/tenant/configuracion/nomina  → hidratar form
 *   PUT  /api/v1/tenant/configuracion/nomina  → guardar cambios (payload parcial)
 *
 * Solo se controlan: tipo_pago_nomina, días Q1/Q2, salario_minimo_vigente,
 * auxilio_transporte y divisor_jornada_mensual. moneda/zona_horaria/pais son
 * READONLY y no se mandan en el PUT.
 *
 * Jornada Laboral Semanal se muestra en horas: horas = divisor / 5.
 * Al guardar: 48h → 240, cualquier otro → 210.
 */

const FORM_VACIO = {
  periodicidad: 'QUINCENAL' as TipoPagoNomina,
  fechaInicioQuincena1: '1',
  fechaFinQuincena1: '15',
  fechaInicioQuincena2: '16',
  fechaFinQuincena2: '30',
  salarioMinimo: '',
  auxilioTransporte: '',
  horasSemanales: '48',
};

type FormState = typeof FORM_VACIO;

/** Convierte un valor que puede venir string|number a texto plano para inputs. */
function aTexto(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Mapea la respuesta del API al estado del form. */
function apiToForm(data: ConfiguracionNomina): FormState {
  return {
    periodicidad: data.tipo_pago_nomina,
    fechaInicioQuincena1: String(data.dia_inicio_q1),
    fechaFinQuincena1: String(data.dia_fin_q1),
    fechaInicioQuincena2: String(data.dia_inicio_q2),
    fechaFinQuincena2: String(data.dia_fin_q2),
    salarioMinimo: aTexto(data.salario_minimo_vigente),
    auxilioTransporte: aTexto(data.auxilio_transporte),
    horasSemanales: String(Number(data.divisor_jornada_mensual) / 5),
  };
}

/** Mapea el estado del form al payload del PUT (solo campos controlados). */
function formToPayload(f: FormState): ConfiguracionNominaPayload {
  return {
    tipo_pago_nomina: f.periodicidad,
    salario_minimo_vigente: Number(f.salarioMinimo),
    auxilio_transporte: Number(f.auxilioTransporte),
    divisor_jornada_mensual: Number(f.horasSemanales) === 48 ? 240 : 210,
    dia_inicio_q1: Number(f.fechaInicioQuincena1),
    dia_fin_q1: Number(f.fechaFinQuincena1),
    dia_inicio_q2: Number(f.fechaInicioQuincena2),
    dia_fin_q2: Number(f.fechaFinQuincena2),
  };
}

export function ParametrosNominaTab() {
  const [parametros, setParametros] = useState<FormState>(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    configuracionApi.configuracionNomina.obtener()
      .then((res) => {
        if (!cancelado) setParametros(apiToForm(res.data));
      })
      .catch((e: any) => {
        if (!cancelado) {
          toast.error(e?.message ?? 'No se pudieron cargar los parámetros de nómina');
        }
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const handleSave = async () => {
    setGuardando(true);
    try {
      const res = await configuracionApi.configuracionNomina.actualizar(
        formToPayload(parametros)
      );
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
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando parámetros de nómina...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Jornada Laboral Semanal */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Jornada Laboral Semanal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Número de horas ordinarias por semana</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="horasSemanales">Horas Semanales *</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                id="horasSemanales"
                type="number"
                value={parametros.horasSemanales}
                onChange={(e) =>
                  setParametros((prev) => ({ ...prev, horasSemanales: e.target.value }))
                }
                className="text-2xl font-bold text-center"
              />
              <span className="text-lg font-medium text-muted-foreground">horas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Según legislación colombiana: 48 horas semanales
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Valores Base */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Valores Base</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Salario mínimo y auxilio de transporte vigentes</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="salarioMinimo">Salario Mínimo Vigente *</Label>
              <Input
                id="salarioMinimo"
                type="number"
                value={parametros.salarioMinimo}
                onChange={(e) =>
                  setParametros((prev) => ({ ...prev, salarioMinimo: e.target.value }))
                }
                placeholder="1300000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auxilioTransporte">Auxilio de Transporte *</Label>
              <Input
                id="auxilioTransporte"
                type="number"
                value={parametros.auxilioTransporte}
                onChange={(e) =>
                  setParametros((prev) => ({ ...prev, auxilioTransporte: e.target.value }))
                }
                placeholder="162000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parámetros de Nómina */}
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
                          value={parametros.fechaInicioQuincena1}
                          onValueChange={(value) =>
                            setParametros((prev) => ({ ...prev, fechaInicioQuincena1: value }))
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
                          value={parametros.fechaFinQuincena2}
                          onValueChange={(value) =>
                            setParametros((prev) => ({ ...prev, fechaFinQuincena2: value }))
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
                      Periodo: Del {parametros.fechaInicioQuincena1} al {parametros.fechaFinQuincena2} de cada mes
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
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={guardando}>
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {guardando ? 'Guardando...' : 'Guardar Parámetros'}
        </Button>
      </div>
    </div>
  );
}
