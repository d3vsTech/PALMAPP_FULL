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
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  nominaApi,
  Periodicidad,
  EmpleadoDisponible,
  OperarioDisponible,
  ValidacionCosechaBundle,
  NominaErrorCodes,
} from '../../../api/nomina';
import { lotesApi } from '../../../api/plantacion';
import type { ApiError } from '../../../api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

/**
 * Wizard de creación de nómina — 4 pasos.
 *
 * Flujo de persistencia (alineado al doc API_NOMINA.md):
 *  - Paso 1 → 2: POST /nominas crea la nómina en BORRADOR. A partir de este
 *    momento todos los pasos operan sobre `nominaId`.
 *  - Paso 2 → 3: POST /nominas/{id}/empleados agrega empleados y operarios.
 *  - Paso 3: GET /nominas/{id}/validar-cosecha al entrar. Botones para ajustar
 *    promedios por lote y confirmar la validación (POST .../confirmar).
 *  - Paso 4: solo navega a /nomina/{id} (la nómina ya existe en BORRADOR).
 *
 * Si el usuario abandona el wizard a la mitad, queda una nómina BORRADOR vacía
 * o parcial — visible en el listado y puede continuarse desde NominaDetalle.
 */
function nombreApellidoDe(emp: EmpleadoDisponible): { nombres: string; apellidos: string } {
  const completo = (emp.nombre_completo ?? '').trim();
  if (!completo) return { nombres: 'Empleado', apellidos: String(emp.id) };
  const partes = completo.split(/\s+/);
  const mid = Math.ceil(partes.length / 2);
  return {
    nombres: partes.slice(0, mid).join(' '),
    apellidos: partes.slice(mid).join(' '),
  };
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
  { numero: 2, titulo: 'Seleccionar Colaboradores', icono: Users },
  { numero: 3, titulo: 'Validar Cosecha', icono: FileText },
  { numero: 4, titulo: 'Confirmación', icono: Check },
];

export default function NuevaNominaWizard() {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(1);

  // ── Paso 1 ────────────────────────────────────────────────────────────────
  const ano = new Date().getFullYear().toString();
  const [mes, setMes] = useState('');
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>('QUINCENAL');
  const [quincena, setQuincena] = useState<'1' | '2' | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // ── Estado global del wizard ──────────────────────────────────────────────
  /** ID de la nómina creada al pasar del paso 1 al 2. null antes de eso. */
  const [nominaId, setNominaId] = useState<number | null>(null);
  /** Procesando paso (crear nómina, agregar empleados, confirmar cosecha…). */
  const [procesando, setProcesando] = useState(false);

  // ── Paso 2 — colaboradores y operarios disponibles ────────────────────────
  const [empleados, setEmpleados] = useState<EmpleadoDisponible[]>([]);
  const [operarios, setOperarios] = useState<OperarioDisponible[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [operariosSeleccionados, setOperariosSeleccionados] = useState<number[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  /** Filtro de la tabla de operarios por empresa (?tercero_id=N). */
  const [filtroTerceroId, setFiltroTerceroId] = useState<string>('todos');

  // ── Paso 3 — Validar Cosecha ──────────────────────────────────────────────
  const [bundleCosecha, setBundleCosecha] = useState<ValidacionCosechaBundle | null>(null);
  const [cargandoBundle, setCargandoBundle] = useState(false);
  const [empleadoExpandido, setEmpleadoExpandido] = useState<number | null>(null);
  const [mostrarAjustePromedios, setMostrarAjustePromedios] = useState(false);
  const [lotes, setLotes] = useState<Array<{ id: number; nombre: string; predio?: { nombre: string } }>>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<string>('');
  const [promedioInput, setPromedioInput] = useState<string>('');
  const [ajustandoPromedio, setAjustandoPromedio] = useState(false);

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

  // Cargar empleados+operarios disponibles al entrar al paso 2.
  // Requiere nominaId — si no existe, no carga.
  useEffect(() => {
    if (pasoActual !== 2 || !nominaId) return;
    if (empleados.length > 0 || operarios.length > 0) return;
    setCargandoEmpleados(true);
    nominaApi
      .empleadosDisponibles(nominaId)
      .then((res) => {
        setEmpleados(res.data.empleados ?? []);
        setOperarios(res.data.operarios ?? []);
      })
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar colaboradores'))
      .finally(() => setCargandoEmpleados(false));
  }, [pasoActual, nominaId, empleados.length, operarios.length]);

  // Cargar bundle de validación de cosecha al entrar al paso 3.
  useEffect(() => {
    if (pasoActual !== 3 || !nominaId) return;
    setCargandoBundle(true);
    nominaApi
      .validarCosecha(nominaId)
      .then((res) => setBundleCosecha(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar validación de cosecha'))
      .finally(() => setCargandoBundle(false));
  }, [pasoActual, nominaId]);

  // Cargar lotes al abrir el modal "Ajustar Promedios".
  useEffect(() => {
    if (!mostrarAjustePromedios || lotes.length > 0) return;
    lotesApi
      .select({ estado: true })
      .then((res) => setLotes(res.data))
      .catch((err: ApiError) => toast.error(err.message ?? 'Error al cargar lotes'));
  }, [mostrarAjustePromedios, lotes.length]);

  /** Persiste un nuevo promedio baseline para el lote y recarga el bundle. */
  const ajustarPromedio = async () => {
    if (!nominaId || !loteSeleccionado || !promedioInput) {
      toast.error('Selecciona un lote y un promedio válido');
      return;
    }
    const valor = parseFloat(promedioInput);
    if (isNaN(valor) || valor <= 0) {
      toast.error('El promedio debe ser un número mayor a 0');
      return;
    }
    setAjustandoPromedio(true);
    try {
      await nominaApi.ajustarPromedioLote(nominaId, parseInt(loteSeleccionado), valor);
      toast.success('Promedio actualizado. Recalculando comparación...');
      // Recargar bundle para reflejar el ajuste
      const res = await nominaApi.validarCosecha(nominaId);
      setBundleCosecha(res.data);
      setMostrarAjustePromedios(false);
      setLoteSeleccionado('');
      setPromedioInput('');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo ajustar el promedio');
    } finally {
      setAjustandoPromedio(false);
    }
  };

  const agregarEmpleado = (id: number) =>
    setEmpleadosSeleccionados((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const quitarEmpleado = (id: number) =>
    setEmpleadosSeleccionados((prev) => prev.filter((x) => x !== id));
  const agregarTodos = () => setEmpleadosSeleccionados(empleados.map((e) => e.id));
  const quitarTodos = () => setEmpleadosSeleccionados([]);

  const toggleOperario = (id: number) =>
    setOperariosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAtras = () => {
    if (pasoActual > 1) setPasoActual(pasoActual - 1);
  };

  /** Paso 1 → 2: crea la nómina si todavía no existe. */
  const crearNominaSiHaceFalta = async (): Promise<boolean> => {
    if (nominaId) return true;
    setProcesando(true);
    try {
      const res = await nominaApi.crear({
        mes: parseInt(mes),
        anio: parseInt(ano),
        periodicidad,
        quincena: periodicidad === 'QUINCENAL' ? (parseInt(quincena) as 1 | 2) : null,
      });
      setNominaId(res.data.id);
      toast.success('Nómina creada en borrador');
      return true;
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_DUPLICADA) {
        toast.error('Ya existe una nómina para ese período');
      } else {
        toast.error(e.message ?? 'No se pudo crear la nómina');
      }
      return false;
    } finally {
      setProcesando(false);
    }
  };

  /** Paso 2 → 3: agrega empleados y operarios a la nómina. */
  const agregarColaboradores = async (): Promise<boolean> => {
    if (!nominaId) return false;
    if (empleadosSeleccionados.length === 0 && operariosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un colaborador');
      return false;
    }
    setProcesando(true);
    try {
      await nominaApi.agregarEmpleados(nominaId, {
        empleado_ids: empleadosSeleccionados,
        operario_ids: operariosSeleccionados,
      });
      return true;
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudieron agregar los colaboradores');
      return false;
    } finally {
      setProcesando(false);
    }
  };

  /** Paso 3 → 4: confirma snapshot del bundle de validación cosecha. */
  const confirmarValidacionCosecha = async (): Promise<boolean> => {
    if (!nominaId || !bundleCosecha) return true; // si no hay bundle, no es obligatorio
    if (bundleCosecha.total_kg_colaboradores === 0) return true; // sin cosechas, paso opcional
    setProcesando(true);
    try {
      await nominaApi.confirmarValidacionCosecha(nominaId);
      return true;
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message ?? 'No se pudo confirmar la validación');
      return false;
    } finally {
      setProcesando(false);
    }
  };

  const handleSiguiente = async () => {
    if (pasoActual === 1) {
      const ok = await crearNominaSiHaceFalta();
      if (ok) setPasoActual(2);
      return;
    }
    if (pasoActual === 2) {
      const ok = await agregarColaboradores();
      if (ok) setPasoActual(3);
      return;
    }
    if (pasoActual === 3) {
      const ok = await confirmarValidacionCosecha();
      if (ok) setPasoActual(4);
      return;
    }
  };

  /** Paso 4: la nómina ya existe — solo navegar al detalle. */
  const handleFinalizar = () => {
    if (!nominaId) {
      toast.error('La nómina no se ha creado correctamente');
      return;
    }
    toast.success('Nómina lista. Continúa con las liquidaciones.');
    navigate(`/nomina/${nominaId}`);
  };

  const puedeAvanzar = () => {
    if (pasoActual === 1) {
      if (!mes || !fechaInicio || !fechaFin) return false;
      if (periodicidad === 'QUINCENAL' && !quincena) return false;
      return true;
    }
    if (pasoActual === 2) {
      return empleadosSeleccionados.length > 0 || operariosSeleccionados.length > 0;
    }
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

  const getIniciales = (nombres: string, apellidos: string) => {
    const n = (nombres ?? '').trim();
    const a = (apellidos ?? '').trim();
    const ini = `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
    return ini || '?';
  };

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
        <h1 className="text-3xl font-bold text-primary">Nuevo Período de Pago</h1>
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
                      Seleccionar Colaboradores
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agrega colaboradores a este período de nómina
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
                                    {(() => {
                                      const { nombres, apellidos } = nombreApellidoDe(empleado);
                                      return (
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                              isSelected
                                                ? 'bg-primary/10 text-primary border-primary/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                            }`}
                                          >
                                            <span className="text-sm font-bold">
                                              {getIniciales(nombres, apellidos)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-sm">
                                              {nombres} {apellidos}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
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

              {/* Operarios de terceros — segunda tabla */}
              {(() => {
                // Terceros únicos en la lista, para el filtro.
                const tercerosUnicos = Array.from(
                  new Map(operarios.map((o) => [o.tercero.id, o.tercero])).values(),
                );
                const operariosFiltrados = filtroTerceroId === 'todos'
                  ? operarios
                  : operarios.filter((o) => String(o.tercero.id) === filtroTerceroId);

                return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    Operarios de Terceros{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({operariosSeleccionados.length} seleccionado{operariosSeleccionados.length !== 1 ? 's' : ''})
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    {tercerosUnicos.length > 1 && (
                      <Select value={filtroTerceroId} onValueChange={setFiltroTerceroId}>
                        <SelectTrigger className="w-56 h-9">
                          <SelectValue placeholder="Filtrar por empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas las empresas</SelectItem>
                          {tercerosUnicos.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.razon_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {operariosFiltrados.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOperariosSeleccionados((prev) =>
                              Array.from(new Set([...prev, ...operariosFiltrados.map((o) => o.id)])),
                            )
                          }
                          disabled={operariosFiltrados.every((o) => operariosSeleccionados.includes(o.id))}
                        >
                          Agregar {filtroTerceroId === 'todos' ? 'Todos' : 'Visibles'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOperariosSeleccionados([])}
                          disabled={operariosSeleccionados.length === 0}
                        >
                          Quitar Todos
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Card className="border-border">
                  <CardContent className="p-0">
                    {operariosFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        {operarios.length === 0
                          ? 'No hay operarios de empresas contratistas disponibles.'
                          : 'No hay operarios para la empresa seleccionada.'}
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
                                Operario
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Empresa
                              </th>
                              <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                                Cargo
                              </th>
                              <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                                Tarifa/día estimada
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {operariosFiltrados.map((op, index) => {
                              const isSelected = operariosSeleccionados.includes(op.id);
                              const partes = op.nombre_completo.split(' ');
                              const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                              return (
                                <tr
                                  key={op.id}
                                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                                    index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                  } ${isSelected ? 'bg-amber-500/5' : ''}`}
                                  onClick={() => toggleOperario(op.id)}
                                >
                                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleOperario(op.id)}
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                          isSelected
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                            : 'bg-muted text-muted-foreground border-border'
                                        }`}
                                      >
                                        <span className="text-sm font-bold">{iniciales}</span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-sm">{op.nombre_completo}</span>
                                        <p className="text-xs text-muted-foreground">CC {op.cedula}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                                      {op.tercero.razon_social}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm font-medium">{op.cargo}</span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="text-sm font-medium">
                                      {op.tarifa_dia_estimada
                                        ? `$${op.tarifa_dia_estimada.toLocaleString('es-CO')}`
                                        : '—'}
                                    </span>
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
                );
              })()}
            </div>
          )}

          {/* ── PASO 3: Validar Cosecha ──
              Conectado a GET /nominas/{id}/validar-cosecha (doc §4).
              Si no hay cosechas en el período (total_kg_colaboradores=0), el
              paso se puede saltar; el cierre no lo exige. */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Validar Cosecha</h2>
                    <p className="text-sm text-muted-foreground">
                      Compara lo registrado por cada colaborador con el reporte de la extractora
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setMostrarAjustePromedios(true)}
                  className="gap-2 border-primary/50 text-primary hover:bg-primary/5"
                >
                  <Settings2 className="h-4 w-4" />
                  Ajustar Promedios
                </Button>
              </div>

              {cargandoBundle ? (
                <Card className="border-border">
                  <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Calculando comparación de cosecha...
                  </CardContent>
                </Card>
              ) : (() => {
                const totalColabs = bundleCosecha?.total_kg_colaboradores ?? 0;
                const totalExtr = bundleCosecha?.total_kg_extractora ?? 0;
                const diff = bundleCosecha?.diferencia_kg ?? 0;
                const detalle = bundleCosecha?.detalle_por_colaborador ?? [];
                const estadoDif: 'ok' | 'critico' | 'atencion' | 'vacio' =
                  totalColabs === 0 && totalExtr === 0 ? 'vacio'
                    : diff === 0 ? 'ok'
                      : Math.abs(diff) > 500 ? 'critico'
                        : 'atencion';
                const colorBadge = estadoDif === 'ok'
                  ? 'bg-success/10 text-success'
                  : estadoDif === 'critico'
                    ? 'bg-destructive/10 text-destructive'
                    : estadoDif === 'atencion'
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-muted text-muted-foreground';
                const labelEstado = estadoDif === 'vacio'
                  ? 'Sin cosechas en el período'
                  : estadoDif === 'ok'
                    ? 'Sin diferencias'
                    : estadoDif === 'critico'
                      ? 'Revisar remisiones'
                      : 'Verificar registros';

                return (
                  <>
                    {/* Card resumen totales con datos reales */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold text-foreground">Resumen de Cosecha</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colorBadge}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {labelEstado}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="px-6 py-5 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colaboradores</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-bold text-foreground leading-none">
                              {totalColabs > 0 ? totalColabs.toLocaleString('es-CO') : '—'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <p className="text-xs text-muted-foreground">{detalle.length} colaborador{detalle.length !== 1 ? 'es' : ''} con cosecha</p>
                          </div>
                        </div>
                        <div className="px-6 py-5 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extractora</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-bold text-foreground leading-none">
                              {totalExtr > 0 ? totalExtr.toLocaleString('es-CO') : '—'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <p className="text-xs text-muted-foreground">Viajes FINALIZADOS del período</p>
                          </div>
                        </div>
                        <div className={`px-6 py-5 space-y-2 ${estadoDif === 'ok' ? 'bg-success/5' : estadoDif === 'critico' ? 'bg-destructive/5' : estadoDif === 'atencion' ? 'bg-amber-500/5' : 'bg-muted/10'}`}>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diferencia</p>
                          <div className="flex items-end gap-1.5">
                            <p className={`text-3xl font-bold leading-none ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio' ? '—' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-CO')}`}
                            </p>
                            <p className="text-sm text-muted-foreground mb-0.5">kg</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${estadoDif === 'ok' ? 'bg-success' : estadoDif === 'critico' ? 'bg-destructive' : estadoDif === 'atencion' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                            <p className={`text-xs font-medium ${estadoDif === 'ok' ? 'text-success' : estadoDif === 'critico' ? 'text-destructive' : estadoDif === 'atencion' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {estadoDif === 'vacio' ? 'No hay datos para comparar' : estadoDif === 'ok' ? 'Cuadre perfecto' : estadoDif === 'critico' ? 'Diferencia significativa' : 'Diferencia menor'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalle por colaborador */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Detalle por Colaborador</h3>
                      {detalle.length === 0 ? (
                        <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
                          <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              No hay cosechas registradas en este período. Puedes continuar sin validar.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        detalle.map((d) => {
                          const expandido = empleadoExpandido === d.colaborador_id;
                          const partes = d.nombre_completo.split(' ');
                          const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                          const esTercero = d.tipo === 'OPERARIO';
                          return (
                            <Card key={`${d.tipo}-${d.colaborador_id}`} className="border-border overflow-hidden">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setEmpleadoExpandido(expandido ? null : d.colaborador_id)}
                              >
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${esTercero ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                                      <span className="text-sm font-bold">{iniciales}</span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">{d.nombre_completo}</p>
                                        {esTercero && (
                                          <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-300">
                                            Tercero
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{d.cargo}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Registrado</p>
                                      <p className="text-sm font-bold">{d.kg.toLocaleString('es-CO')} kg</p>
                                    </div>
                                    {expandido ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                  </div>
                                </div>
                              </button>
                              {expandido && (
                                <div className="border-t border-border p-4 space-y-3 bg-muted/10">
                                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-muted text-muted-foreground border border-border">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                      El detalle por sublote/actividad se podrá ver en la liquidación del colaborador.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Card>
                          );
                        })
                      )}
                    </div>

                    {bundleCosecha?.validado_at && (
                      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                        <Check className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Validación confirmada por <strong>{bundleCosecha.validado_por}</strong> el{' '}
                          {new Date(bundleCosecha.validado_at).toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
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
                        const { nombres, apellidos } = nombreApellidoDe(empleado);
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {getIniciales(nombres, apellidos)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {nombres} {apellidos}
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
          disabled={pasoActual === 1 || procesando || (pasoActual === 2 && !!nominaId)}
          className="gap-2"
          title={pasoActual === 2 && nominaId ? 'La nómina ya está creada, no puedes cambiar el período' : undefined}
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>

        {pasoActual < 4 ? (
          <Button
            onClick={handleSiguiente}
            disabled={!puedeAvanzar() || procesando}
            className="gap-2"
          >
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinalizar} className="gap-2">
            <Check className="h-4 w-4" />
            Ir a la nómina
          </Button>
        )}
      </div>

      {/* Modal — Ajustar Promedios baseline por lote (doc §4.2) */}
      <Dialog open={mostrarAjustePromedios} onOpenChange={setMostrarAjustePromedios}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Ajustar Promedio de Lote
            </DialogTitle>
            <DialogDescription>
              Modifica el promedio baseline (kg/gajo) de un lote para esta nómina. El nuevo valor se usa
              al recalcular la comparación con la extractora.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lote">Lote *</Label>
              <Select value={loteSeleccionado} onValueChange={setLoteSeleccionado}>
                <SelectTrigger id="lote">
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Cargando lotes...
                    </SelectItem>
                  ) : (
                    lotes.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.nombre}
                        {l.predio?.nombre && ` (${l.predio.nombre})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promedio">Promedio (kg/gajo) *</Label>
              <Input
                id="promedio"
                type="number"
                step="0.1"
                min="0"
                placeholder="Ej: 18.5"
                value={promedioInput}
                onChange={(e) => setPromedioInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor recomendado entre 14 y 22 kg/gajo según el lote.
              </p>
            </div>

            <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                El ajuste sobrescribe el promedio baseline del lote para todo el año.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMostrarAjustePromedios(false)}
              disabled={ajustandoPromedio}
            >
              Cancelar
            </Button>
            <Button
              onClick={ajustarPromedio}
              disabled={ajustandoPromedio || !loteSeleccionado || !promedioInput}
              className="gap-2"
            >
              {ajustandoPromedio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar promedio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
