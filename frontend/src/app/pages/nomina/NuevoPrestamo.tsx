/**
 * Crear Nuevo Préstamo — conectado a `prestamosApi.crear` (doc API_NOMINA.md §15).
 *
 * Campos que exige el backend:
 *  - `empleado_id`   : colaborador interno (NO operarios de terceros)
 *  - `concepto`      : descripción libre
 *  - `valor_total`   : monto total del préstamo
 *  - `num_cuotas`    : cantidad de cuotas
 *  - `inicio_anio`, `inicio_mes`, `inicio_quincena?` : cuándo arranca el descuento
 *  - `observaciones` : opcional
 *
 * El backend calcula automáticamente `cuota_valor = floor(valor_total / num_cuotas)`
 * y genera el calendario. La última cuota absorbe el residuo del redondeo.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ArrowLeft, Save, DollarSign, Search, X, Loader2 } from 'lucide-react';
import { colaboradoresApi } from '../../../api/colaboradores';
import type { ColaboradorSelectItem } from '../../../api/colaboradores';
import { prestamosApi, PrestamoErrorCodes } from '../../../api/prestamos';
import { configuracionApi } from '../../../api/configuracion';
import type { ApiError } from '../../../api/client';
import { formatThousands, parseCOP } from '../../components/lib/format';

const MESES = [
  { value: 1, nombre: 'Enero' }, { value: 2, nombre: 'Febrero' }, { value: 3, nombre: 'Marzo' },
  { value: 4, nombre: 'Abril' }, { value: 5, nombre: 'Mayo' }, { value: 6, nombre: 'Junio' },
  { value: 7, nombre: 'Julio' }, { value: 8, nombre: 'Agosto' }, { value: 9, nombre: 'Septiembre' },
  { value: 10, nombre: 'Octubre' }, { value: 11, nombre: 'Noviembre' }, { value: 12, nombre: 'Diciembre' },
];

export default function NuevoPrestamo() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Estado del formulario ──────────────────────────────────────────────
  const [colaboradores, setColaboradores] = useState<ColaboradorSelectItem[]>([]);
  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<ColaboradorSelectItem | null>(null);

  const [concepto, setConcepto] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [numCuotas, setNumCuotas] = useState('');
  const now = new Date();
  const [inicioAnio, setInicioAnio] = useState<number>(now.getFullYear());
  const [inicioMes, setInicioMes] = useState<number>(now.getMonth() + 1);
  const [inicioQuincena, setInicioQuincena] = useState<1 | 2 | null>(1);
  const [observaciones, setObservaciones] = useState('');

  const [periodicidadTenant, setPeriodicidadTenant] = useState<'QUINCENAL' | 'MENSUAL'>('QUINCENAL');
  /** Días de corte de quincenas configurados en el tenant. Se usan para
   *  construir las etiquetas dinámicas del select (API_PRESTAMOS §8). */
  const [q1Range, setQ1Range] = useState<{ inicio: number; fin: number }>({ inicio: 1, fin: 15 });
  const [q2Range, setQ2Range] = useState<{ inicio: number; fin: number }>({ inicio: 16, fin: 31 });
  const [guardando, setGuardando] = useState(false);

  // ── Cargar colaboradores + periodicidad del tenant ─────────────────────
  useEffect(() => {
    colaboradoresApi
      .selectListado()
      .then((res) => setColaboradores(res.data ?? []))
      .catch(() => toast.error('No se pudieron cargar los colaboradores'));
    configuracionApi.configuracionNomina
      .obtener()
      .then((res) => {
        const cfg = res.data as any;
        const tipo = cfg?.tipo_pago_nomina;
        if (tipo === 'MENSUAL') {
          setPeriodicidadTenant('MENSUAL');
          setInicioQuincena(null);
        }
        // Días de corte reales del tenant (default 1/15/16/31 si backend no los devuelve)
        setQ1Range({
          inicio: Number(cfg?.dia_inicio_q1 ?? 1),
          fin: Number(cfg?.dia_fin_q1 ?? 15),
        });
        setQ2Range({
          inicio: Number(cfg?.dia_inicio_q2 ?? 16),
          fin: Number(cfg?.dia_fin_q2 ?? 31),
        });
      })
      .catch(() => void 0);
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sin texto muestra los primeros 8; con texto filtra por nombre o documento.
  const colaboradoresFiltrados = colaboradores
    .filter((c) => {
      const q = busquedaColaborador.toLowerCase().trim();
      if (!q) return true;
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        (c.documento ?? '').toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

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

  // ── Cálculo previo de la cuota ─────────────────────────────────────────
  const cuotaEstimada = (() => {
    const total = Number(valorTotal) || 0;
    const cuotas = Number(numCuotas) || 0;
    if (total <= 0 || cuotas <= 0) return 0;
    return Math.floor(total / cuotas);
  })();

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/nomina/prestamos')}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 shadow-lg">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Nuevo Préstamo</h1>
            <p className="text-muted-foreground mt-1">
              El backend genera automáticamente las cuotas — cada cuota aparecerá en la liquidación del colaborador en la quincena correspondiente.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-2xl">Información del Préstamo</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Buscar Colaborador */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Colaborador <span className="text-destructive">*</span>
              </Label>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={busquedaColaborador}
                  onChange={(e) => {
                    setBusquedaColaborador(e.target.value);
                    setMostrarSugerencias(true);
                    // Al borrar texto solo desmarcamos la selección, sin
                    // cerrar el dropdown — el usuario puede querer elegir otro.
                    if (!e.target.value) {
                      setEmpleadoId(null);
                      setEmpleadoSeleccionado(null);
                    }
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  onClick={() => setMostrarSugerencias(true)}
                  className="pl-12 pr-12 h-12 text-base"
                />
                {empleadoSeleccionado && (
                  <button
                    type="button"
                    onClick={limpiarSeleccion}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {mostrarSugerencias && colaboradoresFiltrados.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {colaboradoresFiltrados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionar(c)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                          <span className="text-sm font-bold">
                            {c.nombre_completo.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{c.nombre_completo}</p>
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
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="text-base font-bold">
                      {empleadoSeleccionado.nombre_completo.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{empleadoSeleccionado.nombre_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      CC {empleadoSeleccionado.documento} · {empleadoSeleccionado.modalidad_pago}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Valor + Cuotas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Valor total <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="1.500.000"
                    value={formatThousands(valorTotal)}
                    onChange={(e) => setValorTotal(parseCOP(e.target.value))}
                    className="pl-8 h-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Número de cuotas <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={numCuotas}
                  onChange={(e) => setNumCuotas(e.target.value)}
                  min="1"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Cuota estimada</Label>
                <div className="h-12 flex items-center px-4 rounded-md border border-border bg-muted/40 text-base font-semibold text-primary">
                  ${cuotaEstimada.toLocaleString('es-CO')}
                </div>
                <p className="text-xs text-muted-foreground">
                  El backend puede ajustar la última cuota para absorber el residuo del redondeo.
                </p>
              </div>
            </div>

            {/* Frecuencia (solo lectura, según config del tenant) */}
            <div className="rounded-lg bg-muted/30 border border-border/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Frecuencia de descuento
                </p>
              </div>
              <div className="text-sm font-bold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {periodicidadTenant}
              </div>
            </div>

            {/* Inicio del descuento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Año de inicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={inicioAnio}
                  onChange={(e) => setInicioAnio(Number(e.target.value))}
                  min={2020}
                  max={2100}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Mes de inicio <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(inicioMes)}
                  onValueChange={(v) => setInicioMes(Number(v))}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Quincena {periodicidadTenant === 'QUINCENAL' && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={inicioQuincena ? String(inicioQuincena) : ''}
                  onValueChange={(v) => setInicioQuincena(Number(v) as 1 | 2)}
                  disabled={periodicidadTenant === 'MENSUAL'}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder={periodicidadTenant === 'MENSUAL' ? 'No aplica (mensual)' : 'Selecciona'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1ª quincena ({q1Range.inicio}–{q1Range.fin})</SelectItem>
                    <SelectItem value="2">2ª quincena ({q2Range.inicio}–{q2Range.fin})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Préstamo personal, Adelanto de nómina, etc."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Observaciones (opcional)</Label>
              <Textarea
                placeholder="Aprobado por gerencia, motivo del préstamo, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="resize-none text-base"
              />
            </div>

          </div>

          <div className="flex justify-between items-center gap-4 pt-8 mt-8 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/nomina/prestamos')}
              className="h-12 px-6 text-base"
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="h-12 px-8 text-base gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              disabled={guardando}
            >
              {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Guardar Préstamo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
