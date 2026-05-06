import { useEffect, useState } from 'react';
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
  UserPlus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { nominaApi, Periodicidad } from '../../../api/nomina';
import { colaboradoresApi } from '../../../api/colaboradores';
import type { ApiError } from '../../../api/client';

interface EmpleadoActivo {
  id: number;
  nombres: string;
  apellidos: string;
  documento?: string;
  cargo?: string | null;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | null;
  salario_base?: number | null;
  estado?: boolean;
}

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

  // Paso 1
  const ano = new Date().getFullYear().toString();
  const [mes, setMes] = useState('');
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>('QUINCENAL');
  const [quincena, setQuincena] = useState<'1' | '2' | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Paso 2
  const [empleados, setEmpleados] = useState<EmpleadoActivo[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);

  // Paso 3
  const [creando, setCreando] = useState(false);

  // Calcular fechas automáticamente
  useEffect(() => {
    if (!mes) {
      setFechaInicio('');
      setFechaFin('');
      return;
    }
    const a = parseInt(ano);
    const m = parseInt(mes);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (periodicidad === 'MENSUAL') {
      setFechaInicio(fmt(new Date(a, m - 1, 1)));
      setFechaFin(fmt(new Date(a, m, 0)));
    } else if (periodicidad === 'QUINCENAL' && quincena === '1') {
      setFechaInicio(fmt(new Date(a, m - 1, 1)));
      setFechaFin(fmt(new Date(a, m - 1, 15)));
    } else if (periodicidad === 'QUINCENAL' && quincena === '2') {
      setFechaInicio(fmt(new Date(a, m - 1, 16)));
      setFechaFin(fmt(new Date(a, m, 0)));
    } else {
      setFechaInicio('');
      setFechaFin('');
    }
  }, [ano, mes, periodicidad, quincena]);

  // Cargar empleados activos al entrar al paso 2
  useEffect(() => {
    if (pasoActual !== 2 || empleados.length > 0) return;
    setCargandoEmpleados(true);
    colaboradoresApi
      .listar({ estado: true, per_page: 200 })
      .then((res) => setEmpleados(res.data as EmpleadoActivo[]))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar empleados'))
      .finally(() => setCargandoEmpleados(false));
  }, [pasoActual, empleados.length]);

  const agregarEmpleado = (id: number) => {
    setEmpleadosSeleccionados((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const quitarEmpleado = (id: number) => {
    setEmpleadosSeleccionados((prev) => prev.filter((x) => x !== id));
  };
  const agregarTodos = () => setEmpleadosSeleccionados(empleados.map((e) => e.id));
  const quitarTodos = () => setEmpleadosSeleccionados([]);

  const handleSiguiente = () => {
    if (pasoActual < 3) setPasoActual(pasoActual + 1);
  };
  const handleAtras = () => {
    if (pasoActual > 1) setPasoActual(pasoActual - 1);
  };

  const handleFinalizar = async () => {
    setCreando(true);
    try {
      const nuevaNomina = await nominaApi.crear({
        mes: parseInt(mes),
        anio: parseInt(ano),
        periodicidad,
        quincena: periodicidad === 'QUINCENAL' ? (parseInt(quincena) as 1 | 2) : null,
      });
      const nominaId = nuevaNomina.data.id;
      try {
        await nominaApi.agregarEmpleados(nominaId, empleadosSeleccionados);
      } catch (err) {
        const e = err as ApiError;
        toast.warning(`Nómina creada, pero no se pudieron agregar todos los empleados: ${e.message ?? ''}`);
      }
      toast.success('Nómina creada correctamente');
      navigate(`/nomina/${nominaId}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'NOMINA_DUPLICADA') {
        toast.error('Ya existe una nómina para ese período');
      } else {
        toast.error(e.message ?? 'No se pudo crear la nómina');
      }
    } finally {
      setCreando(false);
    }
  };

  const puedeAvanzar = () => {
    if (pasoActual === 1) {
      if (!mes || !fechaInicio || !fechaFin) return false;
      if (periodicidad === 'QUINCENAL' && !quincena) return false;
      return true;
    }
    if (pasoActual === 2) return empleadosSeleccionados.length > 0;
    return true;
  };

  const mesNombre = MESES.find((m) => m.valor.toString() === mes)?.nombre ?? '';
  const quincenaNombre =
    periodicidad === 'MENSUAL'
      ? 'Mensual'
      : quincena === '1'
        ? 'Primera Quincena'
        : 'Segunda Quincena';

  const empleadosActivos = empleados;

  const getIniciales = (nombres: string, apellidos: string) =>
    `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-8">
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
            <div
              key={paso.numero}
              className="flex flex-col items-center gap-2 bg-background px-4"
            >
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
                  <h2 className="text-2xl font-bold text-foreground">
                    Información del Período
                  </h2>
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
                  <Select
                    value={periodicidad}
                    onValueChange={(v) => {
                      setPeriodicidad(v as Periodicidad);
                      if (v === 'MENSUAL') setQuincena('');
                    }}
                  >
                    <SelectTrigger id="periodicidad">
                      <SelectValue placeholder="Selecciona periodicidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodicidad === 'QUINCENAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="quincena">Quincena *</Label>
                    <Select value={quincena} onValueChange={(v) => setQuincena(v as '1' | '2')}>
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
                  <Input id="fechaInicio" type="date" value={fechaInicio} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha Fin *</Label>
                  <Input id="fechaFin" type="date" value={fechaFin} readOnly />
                </div>
              </div>

              {mes && fechaInicio && fechaFin && (
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
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Fin:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
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
                    <h2 className="text-2xl font-bold text-foreground">
                      Seleccionar Empleados
                    </h2>
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
                      empleadosSeleccionados.length === empleadosActivos.length ||
                      empleadosActivos.length === 0
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

              <div>
                <p className="text-sm font-medium mb-3">Empleados Activos</p>
                <Card className="border-border">
                  <CardContent className="p-0">
                    {cargandoEmpleados ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Cargando empleados...
                      </div>
                    ) : empleadosActivos.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No hay empleados activos.
                      </div>
                    ) : (
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
                            {empleadosActivos.map((empleado, index) => {
                              const isSelected = empleadosSeleccionados.includes(empleado.id);
                              return (
                                <tr
                                  key={empleado.id}
                                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                                    index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${isSelected ? 'bg-primary/5' : ''}`}
                                  onClick={() =>
                                    isSelected
                                      ? quitarEmpleado(empleado.id)
                                      : agregarEmpleado(empleado.id)
                                  }
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        isSelected
                                          ? quitarEmpleado(empleado.id)
                                          : agregarEmpleado(empleado.id)
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
                                      {empleado.modalidad_pago || 'N/A'}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="text-sm font-medium">
                                      ${(empleado.salario_base ?? 0).toLocaleString('es-CO')}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <Badge className="text-xs bg-success/10 text-success border-success/20">
                                      Activo
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Fin</p>
                        <p className="font-medium">
                          {new Date(fechaFin + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
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
                        const empleado = empleadosActivos.find((c) => c.id === id);
                        if (!empleado) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {getIniciales(empleado.nombres, empleado.apellidos)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {empleado.nombres} {empleado.apellidos}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {empleado.cargo ?? 'Sin cargo'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                ${(empleado.salario_base ?? 0).toLocaleString('es-CO')}
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
          disabled={pasoActual === 1 || creando}
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
          <Button onClick={handleFinalizar} disabled={creando} className="gap-2">
            {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Crear Nómina
          </Button>
        )}
      </div>
    </div>
  );
}
