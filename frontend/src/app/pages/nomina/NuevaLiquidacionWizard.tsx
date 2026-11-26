import { useState } from 'react';
import { useNavigate } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/common/PageHeader';
import WizardStepper from '../../components/nomina/WizardStepper';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/card';
import { Eyebrow } from '../../components/nomina/piezas';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react';
import { colaboradores } from '../../lib/mockData';

const TIPOS_LIQUIDACION = [
  {
    id: 'cesantias',
    nombre: 'Cesantías',
    descripcion: 'Prestación social por tiempo de servicio',
    formula: '(Salario + subsidio de transporte) × días trabajados / 360',
  },
  {
    id: 'intereses',
    nombre: 'Intereses sobre cesantías',
    descripcion: 'Interés anual del 12 % sobre cesantías',
    formula: 'Cesantías × 12 % × (días / 360)',
  },
  {
    id: 'prima',
    nombre: 'Prima de servicios',
    descripcion: 'Prestación semestral equivalente a medio salario',
    formula: '(Salario + subsidio de transporte) × días trabajados / 360',
  },
  {
    id: 'vacaciones',
    nombre: 'Vacaciones',
    descripcion: 'Descanso remunerado anual',
    formula: 'Salario × días disponibles / 30',
  },
  {
    id: 'final',
    nombre: 'Liquidación final',
    descripcion: 'Liquidación completa al terminar contrato',
    formula: 'Incluye todas las prestaciones + indemnización si aplica',
  },
];

const pasos = [
  { numero: 1, titulo: 'Tipo' },
  { numero: 2, titulo: 'Colaborador' },
  { numero: 3, titulo: 'Datos y cálculo' },
  { numero: 4, titulo: 'Confirmación' },
];

export default function NuevaLiquidacionWizard() {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(1);

  // Paso 1: Tipo
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');

  // Paso 2: Empleado
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');

  // Paso 3: Datos
  const [diasTrabajados, setDiasTrabajados] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivoRetiro, setMotivoRetiro] = useState('');

  // Cálculo
  const [valorCalculado, setValorCalculado] = useState<number>(0);

  const handleSiguiente = () => {
    if (pasoActual === 3) {
      // Calcular valor antes de pasar al paso 4
      calcularLiquidacion();
    }
    if (pasoActual < 4) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAtras = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const calcularLiquidacion = () => {
    const empleado = colaboradores.find((c) => c.id === empleadoSeleccionado);
    if (!empleado) return;

    const salario = empleado.salarioBase;
    const subsidioTransporte = salario <= 2 * 1423500 ? 140606 : 0;
    const dias = parseInt(diasTrabajados) || 0;

    let valor = 0;

    switch (tipoSeleccionado) {
      case 'cesantias':
        valor = ((salario + subsidioTransporte) * dias) / 360;
        break;
      case 'intereses':
        const cesantias = ((salario + subsidioTransporte) * dias) / 360;
        valor = (cesantias * 0.12 * dias) / 360;
        break;
      case 'prima':
        valor = ((salario + subsidioTransporte) * dias) / 360;
        break;
      case 'vacaciones':
        valor = (salario * dias) / 30;
        break;
      case 'final':
        // Liquidación final incluye todo
        const cesantiasF = ((salario + subsidioTransporte) * dias) / 360;
        const interesesF = (cesantiasF * 0.12 * dias) / 360;
        const primaF = ((salario + subsidioTransporte) * dias) / 360;
        const vacacionesF = (salario * 15) / 30; // Asumiendo 15 días
        valor = cesantiasF + interesesF + primaF + vacacionesF;
        // Aquí también se calcularía indemnización si aplica
        break;
    }

    setValorCalculado(Math.round(valor));
  };

  const handleFinalizar = () => {
    // Aquí iría la lógica para guardar la liquidación
    console.log('Guardar liquidación:', {
      tipo: tipoSeleccionado,
      empleado: empleadoSeleccionado,
      diasTrabajados,
      fechaInicio,
      fechaFin,
      motivoRetiro,
      valorCalculado,
    });

    navigate('/nomina');
  };

  const puedeAvanzar = () => {
    if (pasoActual === 1) return tipoSeleccionado !== '';
    if (pasoActual === 2) return empleadoSeleccionado !== '';
    if (pasoActual === 3) {
      if (tipoSeleccionado === 'final') {
        return diasTrabajados && fechaInicio && fechaFin && motivoRetiro;
      }
      return diasTrabajados !== '';
    }
    return true;
  };

  const tipoInfo = TIPOS_LIQUIDACION.find((t) => t.id === tipoSeleccionado);
  const empleadoInfo = colaboradores.find((c) => c.id === empleadoSeleccionado);
  const req = <span className="text-destructive">*</span>;
  /** Tarjeta elegible del diseño: borde y fondo suave cuando está marcada. */
  const opcion = (sel: boolean) =>
    `relative w-full rounded-lg border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
      sel ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted/40'
    }`;
  const marca = (
    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/nomina"
        eyebrow="Pagos"
        title="Nueva liquidación"
        description="Crea una liquidación de prestaciones sociales."
      />

      <WizardStepper pasos={pasos} actual={pasoActual} />

      {/* Paso 1: Tipo de liquidación */}
      {pasoActual === 1 && (
        <Card>
          <CardHeader>
            <h3>Tipo de liquidación</h3>
            <CardDescription>Selecciona el tipo de liquidación a calcular.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de liquidación">
              {TIPOS_LIQUIDACION.map((tipo) => {
                const isSelected = tipoSeleccionado === tipo.id;
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={opcion(isSelected)}
                    onClick={() => setTipoSeleccionado(tipo.id)}
                  >
                    {isSelected && marca}
                    <p className="pr-7 font-semibold text-foreground">{tipo.nombre}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{tipo.descripcion}</p>
                    <p className="mt-3 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">{tipo.formula}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Seleccionar colaborador */}
      {pasoActual === 2 && (
        <Card>
          <CardHeader>
            <h3>Colaborador</h3>
            <CardDescription>
              {tipoInfo ? <>Liquidación de <span className="font-medium text-foreground">{tipoInfo.nombre.toLowerCase()}</span>. </> : null}
              Elige el colaborador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Colaborador">
              {sortByFirstName(colaboradores.filter((c) => c.estado === 'Activo')).map((empleado) => {
                const isSelected = empleadoSeleccionado === empleado.id;
                return (
                  <button
                    key={empleado.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={opcion(isSelected)}
                    onClick={() => setEmpleadoSeleccionado(empleado.id)}
                  >
                    {isSelected && marca}
                    <p className="pr-7 font-medium text-foreground">{empleado.nombres} {empleado.apellidos}</p>
                    <p className="text-xs text-muted-foreground">{empleado.cargo || 'Sin cargo'}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">${empleado.salarioBase?.toLocaleString('es-CO') || 0}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Datos y cálculo */}
      {pasoActual === 3 && (
        <Card>
          <CardHeader>
            <h3>Datos del cálculo</h3>
            <CardDescription>
              {tipoInfo?.nombre} · {empleadoInfo?.nombres} {empleadoInfo?.apellidos}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="diasTrabajados">
                  Días trabajados
                  {tipoSeleccionado === 'prima' && ' (en el semestre)'}
                  {tipoSeleccionado === 'vacaciones' && ' (disponibles)'} {req}
                </Label>
                <Input
                  id="diasTrabajados"
                  type="number"
                  step="0.001"
                  placeholder="180"
                  value={diasTrabajados}
                  onChange={(e) => setDiasTrabajados(e.target.value)}
                />
              </div>

              {tipoSeleccionado === 'final' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fechaInicio">Fecha de ingreso {req}</Label>
                    <Input id="fechaInicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaFin">Fecha de retiro {req}</Label>
                    <Input id="fechaFin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo de retiro {req}</Label>
                    <Select value={motivoRetiro} onValueChange={setMotivoRetiro}>
                      <SelectTrigger id="motivo">
                        <SelectValue placeholder="Selecciona el motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="renuncia">Renuncia voluntaria</SelectItem>
                        <SelectItem value="despido_justa">Despido con justa causa</SelectItem>
                        <SelectItem value="despido_sin_justa">Despido sin justa causa</SelectItem>
                        <SelectItem value="mutuo">Mutuo acuerdo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {tipoInfo && (
              <div className="rounded-lg bg-muted/60 p-4">
                <Eyebrow>Fórmula aplicada</Eyebrow>
                <p className="mt-1 text-sm font-medium text-foreground">{tipoInfo.formula}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paso 4: Confirmación */}
      {pasoActual === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3>Información de la liquidación</h3>
              <CardDescription>Revisa el cálculo antes de guardar.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo</dt>
                  <dd className="font-medium text-foreground">{tipoInfo?.nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Colaborador</dt>
                  <dd className="font-medium text-foreground">{empleadoInfo?.nombres} {empleadoInfo?.apellidos}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Salario base</dt>
                  <dd className="font-medium tabular-nums text-foreground">${empleadoInfo?.salarioBase?.toLocaleString('es-CO')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Días trabajados</dt>
                  <dd className="font-medium tabular-nums text-foreground">{diasTrabajados}</dd>
                </div>
                {tipoSeleccionado === 'final' && (
                  <>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fecha de retiro</dt>
                      <dd className="font-medium text-foreground">{new Date(`${fechaFin}T00:00:00`).toLocaleDateString('es-CO')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Motivo</dt>
                      <dd className="font-medium text-foreground">{motivoRetiro.replace('_', ' ')}</dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">Valor calculado</p>
                  <p className="text-xs text-muted-foreground">Calculado automáticamente según la fórmula legal.</p>
                </div>
                <p className="text-3xl font-bold tabular-nums text-foreground">${valorCalculado.toLocaleString('es-CO')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 rounded-lg bg-info-soft p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={2} />
            <p className="text-sm text-foreground">
              Al guardar esta liquidación se registrará el pago pendiente. Podrás marcarla como pagada y generar el comprobante después.
            </p>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="barra-acciones flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={handleAtras} disabled={pasoActual === 1}>
          <ArrowLeft strokeWidth={2} />
          Atrás
        </Button>
        {pasoActual < 4 ? (
          <Button onClick={handleSiguiente} disabled={!puedeAvanzar()}>
            Siguiente
            <ArrowRight strokeWidth={2} />
          </Button>
        ) : (
          <Button onClick={handleFinalizar}>
            <Check strokeWidth={2} />
            Guardar liquidación
          </Button>
        )}
      </div>
    </div>
  );
}
