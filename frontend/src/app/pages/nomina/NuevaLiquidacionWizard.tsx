import { useState } from 'react';
import { useNavigate } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Users,
  Calculator,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { colaboradores } from '../../lib/mockData';

const TIPOS_LIQUIDACION = [
  {
    id: 'cesantias',
    nombre: 'Cesantías',
    descripcion: 'Prestación social por tiempo de servicio',
    icono: Calculator,
    formula: '(Salario + Subsidio Transporte) × Días trabajados / 360',
  },
  {
    id: 'intereses',
    nombre: 'Intereses sobre Cesantías',
    descripcion: 'Interés anual del 12% sobre cesantías',
    icono: Calculator,
    formula: 'Cesantías × 12% × (Días / 360)',
  },
  {
    id: 'prima',
    nombre: 'Prima de Servicios',
    descripcion: 'Prestación semestral equivalente a medio salario',
    icono: DollarSign,
    formula: '(Salario + Subsidio Transporte) × Días trabajados / 360',
  },
  {
    id: 'vacaciones',
    nombre: 'Vacaciones',
    descripcion: 'Descanso remunerado anual',
    icono: Calendar,
    formula: 'Salario × Días disponibles / 30',
  },
  {
    id: 'final',
    nombre: 'Liquidación Final',
    descripcion: 'Liquidación completa al terminar contrato',
    icono: FileText,
    formula: 'Incluye todas las prestaciones + indemnización si aplica',
  },
];

const pasos = [
  { numero: 1, titulo: 'Tipo de Liquidación', icono: FileText },
  { numero: 2, titulo: 'Seleccionar Empleado', icono: Users },
  { numero: 3, titulo: 'Datos y Cálculo', icono: Calculator },
  { numero: 4, titulo: 'Confirmación', icono: Check },
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/nomina')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-primary">Nueva Liquidación</h1>
        <p className="text-muted-foreground mt-2">
          Crea una nueva liquidación de prestaciones sociales
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10" />
        <div
          className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500 -z-10"
          style={{ width: `${((pasoActual - 1) / (pasos.length - 1)) * 100}%` }}
        />

        {pasos.map((paso) => {
          const Icon = paso.icono;
          const isCompleted = pasoActual > paso.numero;
          const isCurrent = pasoActual === paso.numero;

          return (
            <div key={paso.numero} className="flex flex-col items-center gap-2 bg-background px-4">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary'
                    : isCurrent
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background border-border'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <Icon
                    className={`h-6 w-6 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                )}
              </div>
              <div className="text-center">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Paso {paso.numero}
                </p>
                <p
                  className={`text-xs ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {paso.titulo}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido */}
      <Card className="border-border">
        <CardContent className="p-8">
          {/* Paso 1: Tipo de liquidación */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Tipo de Liquidación</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecciona el tipo de liquidación a calcular
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {TIPOS_LIQUIDACION.map((tipo) => {
                  const Icon = tipo.icono;
                  const isSelected = tipoSeleccionado === tipo.id;

                  return (
                    <Card
                      key={tipo.id}
                      className={`cursor-pointer transition-all border-2 ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setTipoSeleccionado(tipo.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-primary/20' : 'bg-muted'
                            }`}
                          >
                            <Icon
                              className={`h-6 w-6 ${
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          {isSelected && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground mb-1">{tipo.nombre}</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          {tipo.descripcion}
                        </p>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs font-mono text-muted-foreground">
                            {tipo.formula}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar empleado */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Seleccionar Empleado</h2>
                  <p className="text-sm text-muted-foreground">
                    Elige el empleado para esta liquidación
                  </p>
                </div>
              </div>

              {tipoInfo && (
                <Card className="border-primary bg-primary/5 mb-6">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Badge className="bg-primary text-white">{tipoInfo.nombre}</Badge>
                    <p className="text-sm text-muted-foreground">{tipoInfo.descripcion}</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortByFirstName(
                  colaboradores.filter((c) => c.estado === 'Activo')
                ).map((empleado) => {
                    const isSelected = empleadoSeleccionado === empleado.id;

                    return (
                      <Card
                        key={empleado.id}
                        className={`cursor-pointer transition-all border-2 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setEmpleadoSeleccionado(empleado.id)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {empleado.nombres} {empleado.apellidos}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {empleado.cargo || 'Sin cargo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${empleado.salarioBase?.toLocaleString('es-CO') || 0}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Paso 3: Datos y cálculo */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Datos y Cálculo</h2>
                  <p className="text-sm text-muted-foreground">
                    Ingresa los datos necesarios para el cálculo
                  </p>
                </div>
              </div>

              <Card className="border-border mb-6">
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo de liquidación</p>
                      <p className="font-medium">{tipoInfo?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empleado</p>
                      <p className="font-medium">
                        {empleadoInfo?.nombres} {empleadoInfo?.apellidos}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="diasTrabajados">
                    Días Trabajados *
                    {tipoSeleccionado === 'prima' && ' (en el semestre)'}
                    {tipoSeleccionado === 'vacaciones' && ' (disponibles)'}
                  </Label>
                  <Input
                    id="diasTrabajados"
                    type="number" step="0.001"
                    placeholder="180"
                    value={diasTrabajados}
                    onChange={(e) => setDiasTrabajados(e.target.value)}
                  />
                </div>

                {tipoSeleccionado === 'final' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicio">Fecha de Ingreso *</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechaFin">Fecha de Retiro *</Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motivo">Motivo de Retiro *</Label>
                      <Select value={motivoRetiro} onValueChange={setMotivoRetiro}>
                        <SelectTrigger id="motivo">
                          <SelectValue placeholder="Selecciona motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="renuncia">Renuncia Voluntaria</SelectItem>
                          <SelectItem value="despido_justa">
                            Despido con Justa Causa
                          </SelectItem>
                          <SelectItem value="despido_sin_justa">
                            Despido sin Justa Causa
                          </SelectItem>
                          <SelectItem value="mutuo">Mutuo Acuerdo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {tipoInfo && (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Fórmula aplicada:</p>
                    <p className="text-sm font-mono font-medium text-primary">
                      {tipoInfo.formula}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {pasoActual === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Confirmación</h2>
                  <p className="text-sm text-muted-foreground">
                    Revisa el cálculo antes de guardar
                  </p>
                </div>
              </div>

              <Card className="border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Información de la Liquidación
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium">{tipoInfo?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empleado</p>
                      <p className="font-medium">
                        {empleadoInfo?.nombres} {empleadoInfo?.apellidos}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salario Base</p>
                      <p className="font-medium">
                        ${empleadoInfo?.salarioBase?.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Días Trabajados</p>
                      <p className="font-medium">{diasTrabajados}</p>
                    </div>
                    {tipoSeleccionado === 'final' && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha de Retiro</p>
                          <p className="font-medium">
                            {new Date(fechaFin).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Motivo</p>
                          <p className="font-medium capitalize">{motivoRetiro.replace('_', ' ')}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-success bg-success/5">
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Valor Calculado</p>
                  <p className="text-4xl font-bold text-success mb-4">
                    ${valorCalculado.toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Este valor se ha calculado automáticamente según la fórmula legal
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Al guardar esta liquidación, se registrará el pago pendiente. Podrás
                    marcarla como pagada y generar el comprobante posteriormente.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleAtras}
          disabled={pasoActual === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>

        {pasoActual < 4 ? (
          <Button onClick={handleSiguiente} disabled={!puedeAvanzar()} className="gap-2">
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinalizar} className="gap-2">
            <Check className="h-4 w-4" />
            Guardar Liquidación
          </Button>
        )}
      </div>
    </div>
  );
}
