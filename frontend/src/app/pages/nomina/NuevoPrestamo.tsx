/**
 * Crear Nuevo Préstamo — conectado a `prestamosApi.crear` (doc API_NOMINA.md §15).
 *
 * Diseño portado de V.18 conservando las conexiones:
 *  - Periodicidad viene del tenant (readonly, no editable por UI).
 *  - Cuota se calcula en cliente para preview; backend recalcula al guardar.
 *  - Observaciones opcionales, se guardan en el backend.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { sortByFirstName } from '../../utils/personas';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Save, DollarSign, Search, X, Loader2, CalendarDays, Info,
} from 'lucide-react';
import { colaboradoresApi } from '../../../api/colaboradores';
import type { ColaboradorSelectItem } from '../../../api/colaboradores';
import { prestamosApi, PrestamoErrorCodes } from '../../../api/prestamos';
import { configuracionApi } from '../../../api/configuracion';
import type { ApiError } from '../../../api/client';
import { formatThousands, parseCOP } from '../../components/lib/format';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL, ANIO_ACTUAL + 1];

function labelQuincena(anio: number, mes: number, quincena: 1 | 2) {
  return `${MESES[mes - 1]} ${anio} · ${quincena === 1 ? '1ª quincena' : '2ª quincena'}`;
}

/**
 * Calcula la quincena final dado un inicio (quincena) y un número de cuotas
 * (todas las cuotas son consecutivas: q1 → q2 → q1 mes+1 → …).
 */
function calcularQuincenaFin(anio: number, mes: number, q: 1 | 2, numQuincenas: number) {
  let y = anio, m = mes, cur: 1 | 2 = q;
  for (let i = 1; i < numQuincenas; i++) {
    if (cur === 1) { cur = 2; }
    else { cur = 1; m++; if (m > 12) { m = 1; y++; } }
  }
  return { anio: y, mes: m, quincena: cur };
}

/**
 * Calcula el mes final para descuentos mensuales.
 */
function calcularMesFin(anio: number, mes: number, numMeses: number) {
  let y = anio, m = mes;
  for (let i = 1; i < numMeses; i++) {
    m++; if (m > 12) { m = 1; y++; }
  }
  return { anio: y, mes: m };
}

export default function NuevoPrestamo() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Colaborador ────────────────────────────────────────────────────────
  const [colaboradores, setColaboradores] = useState<ColaboradorSelectItem[]>([]);
  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<ColaboradorSelectItem | null>(null);

  // ── Campos ─────────────────────────────────────────────────────────────
  const [concepto, setConcepto] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [numCuotas, setNumCuotas] = useState('');
  const [cuotaManual, setCuotaManual] = useState('');
  const [inicioAnio, setInicioAnio] = useState<number>(ANIO_ACTUAL);
  const [inicioMes, setInicioMes] = useState<number>(new Date().getMonth() + 1);
  const [inicioQuincena, setInicioQuincena] = useState<1 | 2 | null>(1);
  const [observaciones, setObservaciones] = useState('');

  const [periodicidadTenant, setPeriodicidadTenant] = useState<'QUINCENAL' | 'MENSUAL'>('QUINCENAL');
  const [q1Range, setQ1Range] = useState<{ inicio: number; fin: number }>({ inicio: 1, fin: 15 });
  const [q2Range, setQ2Range] = useState<{ inicio: number; fin: number }>({ inicio: 16, fin: 31 });
  const [guardando, setGuardando] = useState(false);

  // ── Cargar catálogos ───────────────────────────────────────────────────
  useEffect(() => {
    colaboradoresApi
      .selectListado()
      .then((res) => setColaboradores(res.data ?? []))
      .catch(() => toast.error('No se pudieron cargar los colaboradores'));
    configuracionApi.configuracionNomina
      .obtener()
      .then((res) => {
        const cfg = res.data as any;
        if (cfg?.tipo_pago_nomina === 'MENSUAL') {
          setPeriodicidadTenant('MENSUAL');
          setInicioQuincena(null);
        }
        setQ1Range({ inicio: Number(cfg?.dia_inicio_q1 ?? 1), fin: Number(cfg?.dia_fin_q1 ?? 15) });
        setQ2Range({ inicio: Number(cfg?.dia_inicio_q2 ?? 16), fin: Number(cfg?.dia_fin_q2 ?? 31) });
      })
      .catch(() => void 0);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const colaboradoresFiltrados = sortByFirstName(
    colaboradores.filter((c) => {
      const q = busquedaColaborador.toLowerCase().trim();
      if (!q) return true;
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        (c.documento ?? '').toLowerCase().includes(q)
      );
    })
  ).slice(0, 8);

  const seleccionar = (c: ColaboradorSelectItem) => {
    setEmpleadoId(c.id);
    setEmpleadoSeleccionado(c);
    setBusquedaColaborador(c.nombre_completo);
    setMostrarSugerencias(false);
  };

  const limpiarSeleccion = () => {
    setEmpleadoId(null);
    setEmpleadoSeleccionado(null);
    setBusquedaColaborador('');
    setMostrarSugerencias(false);
  };

  // ── Cálculo previo ─────────────────────────────────────────────────────
  const cuotaCalculada = useMemo(() => {
    const total = Number(valorTotal) || 0;
    const cuotas = Number(numCuotas) || 0;
    if (total <= 0 || cuotas <= 0) return 0;
    return Math.floor(total / cuotas);
  }, [valorTotal, numCuotas]);

  const cuotaFinal = cuotaManual ? parseFloat(cuotaManual) || 0 : cuotaCalculada;
  const numCuotasNum = parseInt(numCuotas) || 0;
  const totalCalculado = cuotaFinal * numCuotasNum;
  const totalIngresado = parseFloat(valorTotal) || 0;

  const periodoFin = useMemo(() => {
    if (numCuotasNum <= 0) return null;
    if (periodicidadTenant === 'QUINCENAL' && inicioQuincena) {
      return calcularQuincenaFin(inicioAnio, inicioMes, inicioQuincena, numCuotasNum);
    }
    return calcularMesFin(inicioAnio, inicioMes, numCuotasNum);
  }, [numCuotasNum, inicioAnio, inicioMes, inicioQuincena, periodicidadTenant]);

  const handleSave = async () => {
    if (!empleadoId) return toast.error('Selecciona un colaborador');
    if (!concepto.trim()) return toast.error('El concepto es obligatorio');
    const total = Number(valorTotal);
    const cuotas = Number(numCuotas);
    if (!total || total <= 0) return toast.error('Ingresa un valor total mayor a 0');
    if (!cuotas || cuotas <= 0) return toast.error('Ingresa un número de cuotas mayor a 0');
    if (periodicidadTenant === 'QUINCENAL' && !inicioQuincena) {
      return toast.error('Selecciona la quincena de inicio');
    }

    setGuardando(true);
    try {
      await prestamosApi.crear({
        empleado_id: empleadoId,
        concepto: concepto.trim(),
        valor_total: total,
        num_cuotas: cuotas,
        inicio_anio: inicioAnio,
        inicio_mes: inicioMes,
        inicio_quincena: periodicidadTenant === 'QUINCENAL' ? inicioQuincena : null,
        observaciones: observaciones.trim() || null,
      });
      toast.success('Préstamo creado — las cuotas se aplicarán en cada liquidación');
      navigate('/nomina/prestamos');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.PRESTAMO_SOLO_COLABORADORES) {
        toast.error('Los préstamos solo se pueden crear para colaboradores internos, no operarios de terceros.');
      } else {
        toast.error(e.message ?? 'No se pudo crear el préstamo');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/nomina/prestamos')}
          className="h-10 w-10 rounded-xl hover:bg-muted border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Nuevo Préstamo</h1>
            <p className="text-sm text-muted-foreground">
              Registra el préstamo y programa los descuentos por quincena
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="border-b bg-muted/20 py-4">
          <CardTitle className="text-base">Información del Préstamo</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Colaborador */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Colaborador <span className="text-destructive">*</span>
            </Label>
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o cédula..."
                value={busquedaColaborador}
                onChange={(e) => {
                  setBusquedaColaborador(e.target.value);
                  setMostrarSugerencias(true);
                  if (!e.target.value) {
                    setEmpleadoId(null);
                    setEmpleadoSeleccionado(null);
                  }
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onClick={() => setMostrarSugerencias(true)}
                className="pl-9 pr-9"
              />
              {empleadoSeleccionado && (
                <button
                  type="button"
                  onClick={limpiarSeleccion}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {mostrarSugerencias && colaboradoresFiltrados.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {colaboradoresFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionar(c)}
                      className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 border-b border-border/50 last:border-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.nombre_completo.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          CC {c.documento} · {c.modalidad_pago}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {empleadoSeleccionado && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {empleadoSeleccionado.nombre_completo.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{empleadoSeleccionado.nombre_completo}</p>
                  <p className="text-xs text-muted-foreground">
                    CC {empleadoSeleccionado.documento} · {empleadoSeleccionado.modalidad_pago}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Concepto y valor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">Concepto <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej: Préstamo personal, Anticipo de nómina..."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">
                Valor total del préstamo <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="1.500.000"
                  value={formatThousands(valorTotal)}
                  onChange={(e) => {
                    const nuevoTotal = parseCOP(e.target.value);
                    setValorTotal(nuevoTotal);
                    // Si ya hay número de cuotas, recalcular la cuota
                    // directamente en el input.
                    const totalN = parseFloat(nuevoTotal) || 0;
                    const cuotas = parseInt(numCuotas) || 0;
                    if (totalN > 0 && cuotas > 0) {
                      setCuotaManual(String(Math.floor(totalN / cuotas)));
                    } else {
                      setCuotaManual('');
                    }
                  }}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Frecuencia de descuento (viene del tenant, readonly) */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Frecuencia de descuento <span className="text-destructive">*</span>
            </Label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(['QUINCENAL', 'MENSUAL'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  disabled
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                    periodicidadTenant === tipo
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground'
                  } cursor-not-allowed`}
                >
                  {tipo === 'QUINCENAL' ? 'Quincenal (cada 15 días)' : 'Mensual (1 vez al mes)'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              La frecuencia se configura en Configuración → Pagos y Liquidaciones.
            </p>
          </div>

          {/* Inicio del descuento */}
          <div className="space-y-2">
            <Label className="font-semibold flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" />
              {periodicidadTenant === 'QUINCENAL' ? 'Desde qué quincena' : 'Desde qué mes'} se descuenta
              <span className="text-destructive">*</span>
            </Label>
            {periodicidadTenant === 'QUINCENAL' ? (
              <div className="grid grid-cols-3 gap-3">
                <Select value={String(inicioAnio)} onValueChange={(v) => setInicioAnio(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(inicioMes)} onValueChange={(v) => setInicioMes(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={inicioQuincena ? String(inicioQuincena) : ''}
                  onValueChange={(v) => setInicioQuincena(parseInt(v) as 1 | 2)}
                >
                  <SelectTrigger><SelectValue placeholder="Quincena" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1ª quincena ({q1Range.inicio}–{q1Range.fin})</SelectItem>
                    <SelectItem value="2">2ª quincena ({q2Range.inicio}–{q2Range.fin})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Select value={String(inicioAnio)} onValueChange={(v) => setInicioAnio(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(inicioMes)} onValueChange={(v) => setInicioMes(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Número de cuotas y cuota */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold">
                Número de {periodicidadTenant === 'QUINCENAL' ? 'quincenas' : 'meses'}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                type="number" step="0.001"
                placeholder="Ej: 4"
                min="1"
                max="48"
                value={numCuotas}
                onChange={(e) => {
                  const raw = e.target.value;
                  setNumCuotas(raw);
                  // Auto-rellenar la cuota con el valor calculado. Antes se
                  // dejaba vacío y solo se mostraba en texto — ahora el
                  // input muestra el número directamente.
                  const cuotas = parseInt(raw) || 0;
                  const totalN = parseFloat(valorTotal) || 0;
                  if (cuotas > 0 && totalN > 0) {
                    setCuotaManual(String(Math.floor(totalN / cuotas)));
                  } else {
                    setCuotaManual('');
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">
                Cuota por {periodicidadTenant === 'QUINCENAL' ? 'quincena' : 'mes'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousands(cuotaManual)}
                  onChange={(e) => {
                    const nuevoValor = parseCOP(e.target.value);
                    setCuotaManual(nuevoValor);
                    // Al escribir cuota, calcular automáticamente el número de
                    // períodos si hay valor total del préstamo.
                    const cuotaN = parseFloat(nuevoValor) || 0;
                    const totalN = parseFloat(valorTotal) || 0;
                    if (cuotaN > 0 && totalN > 0) {
                      setNumCuotas(String(Math.ceil(totalN / cuotaN)));
                    }
                  }}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Resumen calculado */}
          {numCuotasNum > 0 && periodoFin && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <Info className="h-4 w-4" /> Resumen del descuento
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Desde</p>
                  <p className="text-sm font-semibold">
                    {periodicidadTenant === 'QUINCENAL' && inicioQuincena
                      ? labelQuincena(inicioAnio, inicioMes, inicioQuincena)
                      : `${MESES[inicioMes - 1]} ${inicioAnio}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hasta</p>
                  <p className="text-sm font-semibold text-primary">
                    {periodicidadTenant === 'QUINCENAL' && 'quincena' in periodoFin
                      ? labelQuincena(periodoFin.anio, periodoFin.mes, periodoFin.quincena as 1 | 2)
                      : `${MESES[periodoFin.mes - 1]} ${periodoFin.anio}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cuota</p>
                  <p className="text-sm font-semibold">
                    ${cuotaFinal > 0 ? cuotaFinal.toLocaleString('es-CO') : '—'} / {periodicidadTenant === 'QUINCENAL' ? 'quincena' : 'mes'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total descontado</p>
                  <p className="text-sm font-semibold text-primary">${totalCalculado.toLocaleString('es-CO')}</p>
                </div>
              </div>
              {totalCalculado !== totalIngresado && totalIngresado > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg">
                  El total descontado (${totalCalculado.toLocaleString('es-CO')}) difiere del valor del préstamo (${totalIngresado.toLocaleString('es-CO')}).
                </p>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label className="font-semibold">Observaciones (opcional)</Label>
            <Textarea
              placeholder="Aprobado por gerencia, motivo del préstamo, etc."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/nomina/prestamos')}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={guardando}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Préstamo
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
