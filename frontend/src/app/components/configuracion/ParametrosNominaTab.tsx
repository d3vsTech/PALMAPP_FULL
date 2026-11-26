import { useEffect, useState } from 'react';
import { cached } from '../../../api/cache';
import { ConfigSection, ConfigActions } from './ConfigSection';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Info, Save } from 'lucide-react';
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

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

function DiaSelect({
  id, label, value, onChange,
}: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIAS.map((dia) => (
            <SelectItem key={dia} value={String(dia)}>Día {dia}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Un período de corte: día de inicio, día de fin y el rango en texto. */
function Periodo({
  titulo, idPrefijo, inicio, fin, onInicio, onFin,
}: {
  titulo: string;
  idPrefijo: string;
  inicio: string;
  fin: string;
  onInicio: (v: string) => void;
  onFin: (v: string) => void;
}) {
  return (
    <div className="rounded-lg bg-muted/60 p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">{titulo}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <DiaSelect id={`${idPrefijo}-inicio`} label="Día de inicio" value={inicio} onChange={onInicio} />
        <DiaSelect id={`${idPrefijo}-fin`} label="Día de fin" value={fin} onChange={onFin} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Período: del {inicio} al {fin} de cada mes
      </p>
    </div>
  );
}

export function ParametrosNominaTab() {
  const [parametros, setParametros] = useState<FormState>(FORM_VACIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cached('config:parametros-nomina', () => configuracionApi.configuracionNomina.obtener())
      .then((res) => setParametros(apiToForm(res.data)))
      .catch((e: any) => {
        toast.error(e?.message ?? 'No se pudieron cargar los parámetros de nómina');
      })
      .finally(() => setLoading(false));
  }, []);

  const cambiar = (campo: keyof typeof parametros) => (valor: string) =>
    setParametros((prev) => ({ ...prev, [campo]: valor }));

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
    <div className="space-y-6">
      <ConfigSection title="Periodicidad" description="Cada cuánto se procesa la nómina.">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="periodicidad">
            Periodicidad de la nómina <span className="text-destructive">*</span>
          </Label>
          <Select
            value={parametros.periodicidad}
            onValueChange={(value: TipoPagoNomina) =>
              setParametros((prev) => ({ ...prev, periodicidad: value }))
            }
          >
            <SelectTrigger id="periodicidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QUINCENAL">Quincenal</SelectItem>
              <SelectItem value="MENSUAL">Mensual</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {parametros.periodicidad === 'QUINCENAL'
              ? 'La nómina se procesará dos veces al mes'
              : 'La nómina se procesará una vez al mes'}
          </p>
        </div>
      </ConfigSection>

      <ConfigSection
        title="Fechas de corte"
        description="Días que abren y cierran cada período de pago."
      >
        <div className="space-y-4">
          {parametros.periodicidad === 'QUINCENAL' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Periodo
                titulo="Primera quincena"
                idPrefijo="q1"
                inicio={parametros.fechaInicioQuincena1}
                fin={parametros.fechaFinQuincena1}
                onInicio={cambiar('fechaInicioQuincena1')}
                onFin={cambiar('fechaFinQuincena1')}
              />
              <Periodo
                titulo="Segunda quincena"
                idPrefijo="q2"
                inicio={parametros.fechaInicioQuincena2}
                fin={parametros.fechaFinQuincena2}
                onInicio={cambiar('fechaInicioQuincena2')}
                onFin={cambiar('fechaFinQuincena2')}
              />
            </div>
          ) : (
            <div className="max-w-xl">
              <Periodo
                titulo="Período mensual"
                idPrefijo="mes"
                inicio={parametros.fechaInicioMes}
                fin={parametros.fechaFinMes}
                onInicio={cambiar('fechaInicioMes')}
                onFin={cambiar('fechaFinMes')}
              />
            </div>
          )}

          <div className="flex gap-2.5 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <p>
              Estos parámetros definen los períodos de corte para procesar la nómina.
              Revisa que las fechas coincidan con las políticas de pago de tu empresa.
            </p>
          </div>
        </div>
      </ConfigSection>

      <ConfigActions>
        <Button onClick={handleSave}>
          <Save strokeWidth={2} />
          Guardar
        </Button>
      </ConfigActions>
    </div>
    </TabLoadingGate>
  );
}
