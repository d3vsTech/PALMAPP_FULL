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
import PageHeader from '../../components/common/PageHeader';
import { Eyebrow, SegmentedTabs } from '../../components/nomina/piezas';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/card';
import Avatar from '../../components/common/Avatar';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Save, Search, X, Loader2, AlertTriangle } from 'lucide-react';
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

  /**
   * Sin tope: la lista se recorre con el scroll del desplegable.
   *
   * Antes cortaba en los 8 primeros, así que al abrirla sin escribir nada el
   * usuario llegaba hasta la E y creía que no estaban los demás. Buscar sigue
   * siendo lo rápido, pero desplegar y bajar tiene que mostrarlos a todos.
   */
  const colaboradoresFiltrados = sortByFirstName(
    colaboradores.filter((c) => {
      const q = busquedaColaborador.toLowerCase().trim();
      if (!q) return true;
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        (c.documento ?? '').toLowerCase().includes(q)
      );
    })
  );

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
      const creado = await prestamosApi.crear({
        empleado_id: empleadoId,
        concepto: concepto.trim(),
        valor_total: total,
        num_cuotas: cuotas,
        inicio_anio: inicioAnio,
        inicio_mes: inicioMes,
        inicio_quincena: periodicidadTenant === 'QUINCENAL' ? inicioQuincena : null,
        observaciones: observaciones.trim() || null,
      });
      toast.success('Préstamo creado. Descarga el comprobante para firmarlo', {
        description: 'Las cuotas se aplicarán en cada liquidación.',
      });
      // Al detalle, no al listado: lo primero que se hace con un préstamo
      // recién creado es bajar el comprobante para que el colaborador lo
      // firme, y ese botón está ahí.
      navigate(`/nomina/prestamos/${creado.data.id}`);
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

  const req = <span className="text-destructive">*</span>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backTo="/nomina/prestamos"
        eyebrow="Préstamos"
        title="Nuevo préstamo"
        description="Registra el préstamo y programa los descuentos por quincena."
      />

      <Card>
        <CardHeader>
          <h3>Colaborador</h3>
          <CardDescription>A quién se le entrega el préstamo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prestamo-colaborador">Colaborador {req}</Label>
            <div className="relative" ref={searchRef}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input
                id="prestamo-colaborador"
                placeholder="Buscar por nombre o cédula"
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
                  aria-label="Quitar colaborador"
                  onClick={limpiarSeleccion}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
              {mostrarSugerencias && colaboradoresFiltrados.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-sm">
                  {colaboradoresFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionar(c)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-muted"
                    >
                      <Avatar nombre={c.nombre_completo} size="sm" />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-medium text-foreground">{c.nombre_completo}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.documento} · {c.modalidad_pago}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {empleadoSeleccionado && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
              <Avatar nombre={empleadoSeleccionado.nombre_completo} size="md" />
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{empleadoSeleccionado.nombre_completo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {empleadoSeleccionado.documento} · {empleadoSeleccionado.modalidad_pago}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3>Préstamo</h3>
          <CardDescription>Concepto y valor entregado</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prestamo-concepto">Concepto {req}</Label>
              <Input
                id="prestamo-concepto"
                placeholder="Ej: Préstamo personal, anticipo de nómina"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prestamo-valor">Valor total del préstamo {req}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="prestamo-valor"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
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

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3>Plan de descuento</h3>
          <CardDescription>Cuándo empieza y en cuántas cuotas se descuenta de la nómina</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Frecuencia de descuento (viene del tenant, readonly) */}
          <div className="space-y-2">
            <Label>Frecuencia de descuento {req}</Label>
            {/* La frecuencia la fija la finca en configuración, asi que
                aqui solo se muestra: el cambio no hace nada. */}
            <div className="pointer-events-none opacity-70">
              <SegmentedTabs
                value={periodicidadTenant}
                onChange={() => {}}
                options={[
                  { value: 'QUINCENAL', label: 'Quincenal' },
                  { value: 'MENSUAL', label: 'Mensual' },
                ]}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {periodicidadTenant === 'QUINCENAL' ? 'Cada 15 días.' : 'Una vez al mes.'}
              {' '}Se configura en Configuración → Pagos y Liquidaciones.
            </p>
          </div>

          {/* Inicio del descuento */}
          <div className="space-y-2">
            <Label>{periodicidadTenant === 'QUINCENAL' ? 'Quincena' : 'Mes'} de inicio {req}</Label>
            {periodicidadTenant === 'QUINCENAL' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select value={String(inicioAnio)} onValueChange={(v) => setInicioAnio(parseInt(v))}>
                  <SelectTrigger aria-label="Año"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(inicioMes)} onValueChange={(v) => setInicioMes(parseInt(v))}>
                  <SelectTrigger aria-label="Mes"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={inicioQuincena ? String(inicioQuincena) : ''}
                  onValueChange={(v) => setInicioQuincena(parseInt(v) as 1 | 2)}
                >
                  <SelectTrigger aria-label="Quincena"><SelectValue placeholder="Quincena" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1ª quincena ({q1Range.inicio}–{q1Range.fin})</SelectItem>
                    <SelectItem value="2">2ª quincena ({q2Range.inicio}–{q2Range.fin})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select value={String(inicioAnio)} onValueChange={(v) => setInicioAnio(parseInt(v))}>
                  <SelectTrigger aria-label="Año"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(inicioMes)} onValueChange={(v) => setInicioMes(parseInt(v))}>
                  <SelectTrigger aria-label="Mes"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="prestamo-periodos">
                Número de {periodicidadTenant === 'QUINCENAL' ? 'quincenas' : 'meses'} {req}
              </Label>
              <Input
                id="prestamo-periodos"
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
              {numCuotasNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  {periodicidadTenant === 'QUINCENAL'
                    ? `Equivale a ${Math.ceil(numCuotasNum / 2)} ${Math.ceil(numCuotasNum / 2) === 1 ? 'mes' : 'meses'}`
                    : `Equivale a ${numCuotasNum * 2} quincenas`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prestamo-cuota">
                Cuota por {periodicidadTenant === 'QUINCENAL' ? 'quincena' : 'mes'}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="prestamo-cuota"
                  type="text"
                  inputMode="numeric"
                  placeholder={cuotaCalculada > 0 ? cuotaCalculada.toLocaleString('es-CO') : '0'}
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
              {cuotaCalculada > 0 && !cuotaManual && (
                <p className="text-xs text-muted-foreground">
                  Calculado: <span className="font-semibold text-foreground">${cuotaCalculada.toLocaleString('es-CO')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Resumen calculado */}
          {numCuotasNum > 0 && periodoFin && (
            <div className="space-y-3 rounded-lg bg-muted/60 p-4">
              <Eyebrow>Resumen del descuento</Eyebrow>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Desde</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {periodicidadTenant === 'QUINCENAL' && inicioQuincena
                      ? labelQuincena(inicioAnio, inicioMes, inicioQuincena)
                      : `${MESES[inicioMes - 1]} ${inicioAnio}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Hasta</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {periodicidadTenant === 'QUINCENAL' && 'quincena' in periodoFin
                      ? labelQuincena(periodoFin.anio, periodoFin.mes, periodoFin.quincena as 1 | 2)
                      : `${MESES[periodoFin.mes - 1]} ${periodoFin.anio}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cuota</dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">
                    ${cuotaFinal > 0 ? cuotaFinal.toLocaleString('es-CO') : '—'} / {periodicidadTenant === 'QUINCENAL' ? 'quincena' : 'mes'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Total descontado</dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">${totalCalculado.toLocaleString('es-CO')}</dd>
                </div>
              </dl>
              {totalCalculado !== totalIngresado && totalIngresado > 0 && (
                <div className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
                  <p className="text-xs text-foreground">
                    El total descontado (${totalCalculado.toLocaleString('es-CO')}) difiere del valor del préstamo (${totalIngresado.toLocaleString('es-CO')}). Ajusta la cuota si es necesario.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="prestamo-observaciones">
              Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="prestamo-observaciones"
              placeholder="Ej: aprobado por gerencia, motivo del préstamo"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

        </CardContent>
      </Card>

      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => navigate('/nomina/prestamos')}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={guardando}>
          {guardando
            ? <Loader2 className="animate-spin" strokeWidth={2} />
            : <Save strokeWidth={2} />}
          Guardar préstamo
        </Button>
      </div>
    </div>
  );
}
