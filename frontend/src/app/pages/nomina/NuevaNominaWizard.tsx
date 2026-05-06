// TABLA VERSION - Nueva Nómina Wizard con tabla en paso 2
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
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
  Calendar,
  X,
  UserPlus,
} from 'lucide-react';
import { colaboradores } from '../../lib/mockData';

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

const pasos = [
  { numero: 1, titulo: 'Información del Período', icono: Calendar },
  { numero: 2, titulo: 'Seleccionar Empleados', icono: Users },
  { numero: 3, titulo: 'Confirmación', icono: Check },
];

export default function NuevaNominaWizard() {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(1);

  // Verificación de versión
  console.log('NuevaNominaWizard - TABLA VERSION - Timestamp:', Date.now());

  // Datos del período
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState('');
  const [periodicidad, setPeriodicidad] = useState('quincenal');
  const [quincena, setQuincena] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Empleados seleccionados
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);

  // Calcular fechas automáticamente
  useEffect(() => {
    if (ano && mes) {
      const anoNum = parseInt(ano);
      const mesNum = parseInt(mes);

      if (periodicidad === 'mensual') {
        // Primer día del mes
        const inicio = new Date(anoNum, mesNum - 1, 1);
        // Último día del mes
        const fin = new Date(anoNum, mesNum, 0);

        setFechaInicio(inicio.toISOString().split('T')[0]);
        setFechaFin(fin.toISOString().split('T')[0]);
      } else if (periodicidad === 'quincenal' && quincena) {
        if (quincena === '1') {
          // Primera quincena: día 1 al 15
          const inicio = new Date(anoNum, mesNum - 1, 1);
          const fin = new Date(anoNum, mesNum - 1, 15);

          setFechaInicio(inicio.toISOString().split('T')[0]);
          setFechaFin(fin.toISOString().split('T')[0]);
        } else if (quincena === '2') {
          // Segunda quincena: día 16 al último día del mes
          const inicio = new Date(anoNum, mesNum - 1, 16);
          const fin = new Date(anoNum, mesNum, 0);

          setFechaInicio(inicio.toISOString().split('T')[0]);
          setFechaFin(fin.toISOString().split('T')[0]);
        }
      }
    }
  }, [ano, mes, periodicidad, quincena]);

  // Funciones para manejar empleados
  const agregarEmpleado = (empleadoId: string) => {
    if (!empleadosSeleccionados.includes(empleadoId)) {
      setEmpleadosSeleccionados([...empleadosSeleccionados, empleadoId]);
    }
  };

  const quitarEmpleado = (empleadoId: string) => {
    setEmpleadosSeleccionados(empleadosSeleccionados.filter((id) => id !== empleadoId));
  };

  const agregarTodos = () => {
    const todosLosIds = colaboradores
      .filter((c) => c.estado === 'Activo')
      .map((c) => c.id);
    setEmpleadosSeleccionados(todosLosIds);
  };

  const quitarTodos = () => {
    setEmpleadosSeleccionados([]);
  };

  const handleSiguiente = () => {
    if (pasoActual < 3) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAtras = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleFinalizar = () => {
    // Aquí iría la lógica para crear la nómina
    console.log('Crear nómina:', {
      ano,
      mes,
      periodicidad,
      quincena,
      fechaInicio,
      fechaFin,
      empleados: empleadosSeleccionados,
    });

    // Navegar al detalle de la nómina creada
    navigate('/nomina');
  };

  const puedeAvanzar = () => {
    if (pasoActual === 1) {
      if (periodicidad === 'mensual') {
        return ano && mes && fechaInicio && fechaFin;
      } else {
        return ano && mes && quincena && fechaInicio && fechaFin;
      }
    }
    if (pasoActual === 2) {
      return empleadosSeleccionados.length > 0;
    }
    return true;
  };

  const mesNombre = MESES.find((m) => m.valor.toString() === mes)?.nombre || '';
  const quincenaNombre = periodicidad === 'mensual'
    ? 'Mensual'
    : quincena === '1'
      ? 'Primera Quincena'
      : 'Segunda Quincena';

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
        <h1 className="text-4xl font-bold text-foreground">Nueva Nómina</h1>
        <p className="text-muted-foreground mt-2">
          Crea un nuevo período de nómina paso a paso
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        {/* Línea de progreso */}
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
                    className={`h-6 w-6 ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
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
                  className={`text-xs ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {paso.titulo}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido del paso actual */}
      <Card className="border-border">
        <CardContent className="p-8">
          {/* Paso 1: Información del período */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Información del Período</h2>
                  <p className="text-sm text-muted-foreground">
                    Define el período de la nómina
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes *</Label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger id="mes">
                      <SelectValue placeholder="Selecciona un mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.valor} value={m.valor.toString()}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodicidad">Periodicidad *</Label>
                  <Select value={periodicidad} onValueChange={(value) => {
                    setPeriodicidad(value);
                    if (value === 'mensual') {
                      setQuincena('');
                    }
                  }}>
                    <SelectTrigger id="periodicidad">
                      <SelectValue placeholder="Selecciona periodicidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodicidad === 'quincenal' && (
                  <div className="space-y-2">
                    <Label htmlFor="quincena">Quincena *</Label>
                    <Select value={quincena} onValueChange={setQuincena}>
                      <SelectTrigger id="quincena">
                        <SelectValue placeholder="Selecciona quincena" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primera Quincena (1-15)</SelectItem>
                        <SelectItem value="2">Segunda Quincena (16-fin de mes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha Fin *</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>

              {ano && mes && fechaInicio && fechaFin && (
                <Card className="border-primary bg-primary/5 mt-6">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Período seleccionado:</p>
                        <p className="text-lg font-bold text-primary">
                          {mesNombre} {ano} - {quincenaNombre}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/20">
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Inicio:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Fin:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paso 2: Seleccionar empleados */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Seleccionar Empleados</h2>
                    <p className="text-sm text-muted-foreground">
                      Agrega empleados a este período de nómina
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={agregarTodos}
                    disabled={
                      empleadosSeleccionados.length ===
                      colaboradores.filter((c) => c.estado === 'Activo').length
                    }
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={quitarTodos}
                    disabled={empleadosSeleccionados.length === 0}
                  >
                    Quitar Todos
                  </Button>
                </div>
              </div>

              {/* Tabla de empleados disponibles */}
              <div>
                <p className="text-sm font-medium mb-3">Empleados Activos</p>
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground w-12">
                              <span className="sr-only">Seleccionar</span>
                            </th>
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                              Empleado
                            </th>
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                              Cargo
                            </th>
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                              Modalidad
                            </th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                              Salario Base
                            </th>
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {colaboradores
                            .filter((c) => c.estado === 'Activo')
                            .map((empleado, index) => {
                              const isSelected = empleadosSeleccionados.includes(empleado.id);
                              const getIniciales = (nombres: string, apellidos: string) => {
                                return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
                              };

                              return (
                                <tr
                                  key={empleado.id}
                                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                                    index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${isSelected ? 'bg-primary/5' : ''}`}
                                  onClick={() =>
                                    isSelected ? quitarEmpleado(empleado.id) : agregarEmpleado(empleado.id)
                                  }
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        isSelected ? quitarEmpleado(empleado.id) : agregarEmpleado(empleado.id)
                                      }
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                          isSelected
                                            ? 'bg-primary/10 text-primary border-primary/20'
                                            : 'bg-muted text-muted-foreground border-border'
                                        }`}
                                      >
                                        <span className="text-sm font-bold">
                                          {getIniciales(empleado.nombres, empleado.apellidos)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-sm">
                                          {empleado.nombres} {empleado.apellidos}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm font-medium">
                                      {empleado.cargo || 'Sin cargo'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <Badge variant="outline" className="text-xs">
                                      {empleado.modalidadPago || 'N/A'}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="text-sm font-medium">
                                      ${empleado.salarioBase?.toLocaleString('es-CO') || 0}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <Badge
                                      className={`text-xs ${
                                        empleado.estado === 'Activo'
                                          ? 'bg-success/10 text-success border-success/20'
                                          : 'bg-muted text-muted-foreground border-muted'
                                      }`}
                                    >
                                      {empleado.estado}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Paso 3: Confirmación */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Confirmación</h2>
                  <p className="text-sm text-muted-foreground">
                    Revisa la información antes de crear la nómina
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="border-border">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Información del Período
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Año</p>
                        <p className="font-medium">{ano}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mes</p>
                        <p className="font-medium">{mesNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Periodicidad</p>
                        <p className="font-medium">{quincenaNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Inicio</p>
                        <p className="font-medium">
                          {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Fin</p>
                        <p className="font-medium">
                          {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Empleados Incluidos ({empleadosSeleccionados.length})
                    </h3>
                    <div className="space-y-2">
                      {empleadosSeleccionados.map((id) => {
                        const empleado = colaboradores.find((c) => c.id === id);
                        return (
                          <div key={id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {empleado?.nombres.charAt(0)}
                                {empleado?.apellidos.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {empleado?.nombres} {empleado?.apellidos}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {empleado?.cargo}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                ${empleado?.salarioBase?.toLocaleString('es-CO') || 0}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      Al crear esta nómina, se generará un registro en estado BORRADOR para cada
                      empleado seleccionado. Podrás calcular los valores y cerrar la nómina desde
                      el detalle del período.
                    </p>
                  </CardContent>
                </Card>
              </div>
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

        {pasoActual < 3 ? (
          <Button onClick={handleSiguiente} disabled={!puedeAvanzar()} className="gap-2">
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinalizar} className="gap-2">
            <Check className="h-4 w-4" />
            Crear Nómina
          </Button>
        )}
      </div>
    </div>
  );
}
