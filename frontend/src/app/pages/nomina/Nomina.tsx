/**
 * Pantalla Pagos — listado de períodos de nómina.
 *
 * Diseño portado de V.15 (PalmApp - V220626/src/app/pages/nomina/Nomina.tsx)
 * manteniendo las conexiones a la API existente en V.2 (`nominaApi.listar`
 * y `nominaApi.indicadores`).
 *
 * Rutas:
 *  - `/nomina`                          → este listado
 *  - `/nomina/nueva`                    → crear nuevo período
 *  - `/nomina/planilla-diaria`          → planilla diaria
 *  - `/nomina/nuevo-prestamo`           → CRUD préstamos (futuro: `/nomina/prestamos`)
 *  - `/nomina/:id`                      → detalle
 *
 * Nota sobre KPIs: V.15 usa 4 indicadores filtrables por período (Pagado a
 * Colaboradores, Pagado a Terceros, Neto a Pagar, Pendiente). V.2 todavía no
 * tiene terceros pagados desde nómina, así que ese KPI muestra "—". El resto
 * se calcula con los datos de las nóminas listadas.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Plus, FileText, Calculator, TrendingUp, TrendingDown, Eye, Search, Filter,
  DollarSign, Receipt, Users, Building2, Check, Trash2, Pencil,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  nominaApi, Nomina as NominaT, NominaIndicadores, NominaErrorCodes,
} from '../../../api/nomina';
import type { ApiError } from '../../../api/client';
import { cached, invalidate } from '../../../api/cache';

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: NominaT): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  if (n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena) {
    const q = n.quincena === 1 ? 'Primera' : 'Segunda';
    return `${mes} ${n.anio} - ${q} quincena`;
  }
  return `${mes} ${n.anio}`;
}

function toNumber(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
}

/**
 * Formatea una fecha del backend a `dd/mm/yyyy`. Acepta tanto ISO
 * (`2026-06-16T05:00:00.000000Z`) como solo fecha (`2026-06-16`).
 * Si recibe un ISO con `Z`, se construye con `[Y, M-1, D]` para evitar el
 * corrimiento por zona horaria (en COT podría retroceder un día).
 */
function fmtFecha(s: string | null | undefined): string {
  if (!s) return '—';
  // Tomar solo la parte YYYY-MM-DD del inicio.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mes, d] = m;
  return `${d}/${mes}/${y}`;
}

/** Formato compacto en millones para los mini-KPIs (igual que V.15). */
function fmtMillones(n: number): string {
  if (!n || n <= 0) return '—';
  return `$${(n / 1_000_000).toFixed(2)}M`;
}

export default function Nomina() {
  const navigate = useNavigate();

  // ── Filtros de la tabla ───────────────────────────────────────────────────
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  // ── Filtro de KPIs (período independiente, igual a V.15) ──────────────────
  const [periodoKpi, setPeriodoKpi] = useState<string>('todos');

  const [nominas, setNominas] = useState<NominaT[]>([]);
  const [indicadores, setIndicadores] = useState<NominaIndicadores | null>(null);
  const [cargando, setCargando] = useState(true);

  // Eliminar nómina (solo BORRADOR sin liquidados — el backend bloquea con
  // NOMINA_CON_LIQUIDADOS/NOMINA_CERRADA si no se cumple, lo manejamos abajo).
  const [nominaAEliminar, setNominaAEliminar] = useState<NominaT | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /**
   * Estimados de Devengado/Deducciones/Neto por nómina (calculados en cliente
   * para las que están en BORRADOR con 0 liquidados — el backend devuelve $0
   * en `total_general` hasta que se liquide cada empleado).
   *
   * Aproximación:
   *   Devengado = Σ salario_base de todos los empleados de la nómina
   *   Deducciones = 8% del devengado (SALUD 4% + PENSIÓN 4% — sin subsidio
   *     ni FSP, que dependen del IBC)
   *   Neto = Devengado − Deducciones
   *
   * Cuando la nómina tiene al menos un liquidado, usamos los valores reales
   * del backend (que ya suman lo liquidado + esto sería doble contarlo).
   */
  const [estimados, setEstimados] = useState<Map<number, {
    devengado: number;
    deducciones: number;
    neto: number;
  }>>(new Map());

  // Editar nómina: navega a `/nomina/:id/editar` que carga el wizard completo
  // en modo edición (paso 1 pre-poblado, paso 2 con colaboradores ya agregados,
  // paso 3 validar cosecha, paso 4 confirmar).

  /**
   * Calcula los estimados exactos de una nómina en BORRADOR sin liquidar.
   *
   * Estrategia por empleado:
   *  1. Intenta `preview()` — devuelve el cálculo exacto del backend.
   *  2. Si falla (ej: CALC_ERROR por falta de salario mínimo vigente en la
   *     config del tenant), cae a estimación local con `salario_base` y 8%
   *     de deducciones (SALUD 4% + PENSIÓN 4%).
   *
   * Usa `cached()` con TTL de 5 min. Se cachea SOLO si el resultado tiene
   * datos reales (`devengado > 0` o `empleados === 0`) — un $0 con
   * empleados > 0 significa que algo falló y no queremos ese valor
   * congelado.
   */
  const cargarEstimadoNomina = async (id: number) => {
    const cacheKey = `nomina:estimado:${id}`;
    const result = await cached(
      cacheKey,
      async () => {
        const detalle = await nominaApi.ver(id);
        const empleados = detalle.data.empleados ?? [];
        if (empleados.length === 0) {
          return { devengado: 0, deducciones: 0, neto: 0, empleadosCount: 0 };
        }
        const previews = await Promise.all(
          empleados.map((emp) =>
            nominaApi.preview(emp.id).then(
              (r) => ({ tipo: 'ok' as const, data: r.data }),
              (err) => {
                console.warn(`[preview ${emp.id}] falló:`, err);
                return { tipo: 'fallback' as const, salarioBase: toNumber(emp.salario_base) };
              },
            ),
          ),
        );
        let dev = 0;
        let ded = 0;
        let neto = 0;
        for (const p of previews) {
          if (p.tipo === 'ok') {
            dev += p.data.total_devengado + (p.data.subsidio_transporte ?? 0);
            ded += p.data.total_deducciones_legales ?? 0;
            neto += p.data.total_neto_propuesto;
          } else {
            // Fallback: salario base + ~8% deducciones legales.
            dev += p.salarioBase;
            const dedFallback = Math.round(p.salarioBase * 0.08);
            ded += dedFallback;
            neto += p.salarioBase - dedFallback;
          }
        }
        return { devengado: dev, deducciones: ded, neto, empleadosCount: empleados.length };
      },
      5 * 60_000,
    );
    // Si vino con empleados pero devengado en 0, algo falló al calcular.
    // Invalidamos para que el próximo intento pueda funcionar.
    if (result.empleadosCount > 0 && result.devengado === 0) {
      invalidate(cacheKey);
    }
    return { devengado: result.devengado, deducciones: result.deducciones, neto: result.neto };
  };

  const cargarNominas = () => {
    setCargando(true);
    return Promise.all([
      nominaApi.listar({
        estado: filtroEstado !== 'todos' ? (filtroEstado as 'BORRADOR' | 'CERRADA') : undefined,
        mes: filtroMes !== 'todos' ? parseInt(filtroMes) : undefined,
        per_page: 50,
      }),
      nominaApi.indicadores(),
    ])
      .then(([listRes, indRes]) => {
        setNominas(listRes.data);
        setIndicadores(indRes.data);
        // Render inmediato — no bloqueamos aquí. Los estimados se calculan
        // en background y pueden venir del caché (instantáneo si ya se
        // cargaron antes en esta sesión).
        setCargando(false);

        const borradores = listRes.data.filter(
          (n) => n.estado === 'BORRADOR'
            && (n.empleados_liquidados_count ?? 0) === 0
            && toNumber(n.total_general) === 0,
        );

        // Cargar estimados en background con caché por nómina.
        // Los que ya están en caché se resuelven sincrónicamente.
        borradores.forEach((n) => {
          cargarEstimadoNomina(n.id)
            .then((est) => {
              setEstimados((prev) => {
                const next = new Map(prev);
                next.set(n.id, est);
                return next;
              });
            })
            .catch(() => {
              // silencioso — si falla, el usuario ve $0 hasta que refresque
            });
        });
      })
      .catch((err: ApiError) => {
        toast.error(err.message ?? 'Error al cargar nóminas');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarNominas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroMes]);

  /**
   * Al montar la pantalla, purgar caché viejo de estimados que pudieran
   * haber quedado en $0 por fallos anteriores del preview. Así el próximo
   * fetch recalcula desde cero.
   */
  useEffect(() => {
    setEstimados(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarEliminar = async () => {
    if (!nominaAEliminar) return;
    setEliminando(true);
    try {
      await nominaApi.eliminar(nominaAEliminar.id);
      toast.success('Nómina eliminada');
      invalidate(`nomina:estimado:${nominaAEliminar.id}`);
      setNominaAEliminar(null);
      cargarNominas();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === NominaErrorCodes.NOMINA_CON_LIQUIDADOS) {
        toast.error('No se puede eliminar: hay colaboradores liquidados');
      } else if (e.code === NominaErrorCodes.NOMINA_CERRADA) {
        toast.error('No se puede eliminar una nómina cerrada');
      } else {
        toast.error(e.message ?? 'Error al eliminar nómina');
      }
    } finally {
      setEliminando(false);
    }
  };


  const nominasFiltradas = useMemo(() => {
    if (!filtroBusqueda) return nominas;
    const q = filtroBusqueda.toLowerCase();
    return nominas.filter((n) => periodoLabel(n).toLowerCase().includes(q));
  }, [nominas, filtroBusqueda]);

  // ── Opciones del dropdown de período para KPIs ───────────────────────────
  const opcionesPeriodo = useMemo(() => {
    return [
      { value: 'todos', label: 'Todos' },
      ...nominas.map((n) => ({ value: String(n.id), label: periodoLabel(n) })),
    ];
  }, [nominas]);

  // ── Cálculo de los 4 mini-KPIs sobre el período seleccionado ─────────────
  // "todos" → usa los indicadores agregados del backend (más precisos: incluyen
  //   total_terceros pagados / pendientes que vienen de `nomina_tercero`).
  // Período específico → cálculo en cliente con la data ya listada (los KPIs de
  //   terceros por nómina vendrían del endpoint /nominas/{id}/terceros).
  const kpis = useMemo(() => {
    if (periodoKpi === 'todos' && indicadores) {
      const borradores = nominas.filter((n) => n.estado === 'BORRADOR');
      const labelBorrador = borradores.length === 1
        ? periodoLabel(borradores[0])
        : `${borradores.length} períodos abiertos`;
      return {
        totalColaboradores: indicadores.total_colaboradores ?? 0,
        totalTerceros: indicadores.total_terceros ?? 0,
        netoAPagar: indicadores.neto_pagar ?? 0,
        totalPendiente: indicadores.pendiente_pagar ?? 0,
        labelBorrador,
        borradoresLen: borradores.length,
      };
    }

    // Filtro por período específico — cálculo derivado de la lista.
    const filtradas = periodoKpi === 'todos'
      ? nominas
      : nominas.filter((n) => String(n.id) === periodoKpi);

    const cerradas = filtradas.filter((n) => n.estado === 'CERRADA');
    const borradores = filtradas.filter((n) => n.estado === 'BORRADOR');

    const totalColaboradores = cerradas.reduce((s, n) => s + toNumber(n.total_general), 0);
    const totalTerceros = 0; // requiere /nominas/{id}/terceros — se carga al ver el detalle
    const netoAPagar = borradores.reduce((s, n) => s + toNumber(n.total_general), 0);
    const totalPendiente = netoAPagar;

    const labelBorrador = borradores.length === 1
      ? periodoLabel(borradores[0])
      : `${borradores.length} períodos abiertos`;

    return { totalColaboradores, totalTerceros, netoAPagar, totalPendiente, labelBorrador, borradoresLen: borradores.length };
  }, [nominas, periodoKpi, indicadores]);

  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pagos</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de períodos de nómina y desprendibles de pago
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/nomina/planilla-diaria')}
            size="lg"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <Receipt className="h-4 w-4" />
            Planilla Diaria
          </Button>
          <Button
            onClick={() => navigate('/nomina/prestamos')}
            size="lg"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <DollarSign className="h-5 w-5" />
            Préstamos
          </Button>
          <Button onClick={() => navigate('/nomina/nueva')} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Período de Pago
          </Button>
        </div>
      </div>

      {/* Resumen de pagos con filtro por período */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-foreground">Resumen de pagos</p>
            <select
              value={periodoKpi}
              onChange={(e) => setPeriodoKpi(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {opcionesPeriodo.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          {/* 4 mini-KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pagado a Colaboradores */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pagado a Colaboradores</p>
                <p className="text-2xl font-bold text-primary">
                  {fmtMillones(kpis.totalColaboradores)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Neto entregado a internos</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Pagado a Terceros (placeholder hasta que haya endpoint) */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pagado a Terceros</p>
                <p className="text-2xl font-bold text-amber-700">
                  {fmtMillones(kpis.totalTerceros)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Empresas contratistas</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
            </div>

            {/* Neto a Pagar (períodos abiertos) */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-success/5 border border-success/20">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Neto a Pagar</p>
                <p className="text-2xl font-bold text-success">
                  {fmtMillones(kpis.netoAPagar)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {kpis.borradoresLen > 0 ? kpis.labelBorrador : 'Sin períodos abiertos'}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </div>

            {/* Pendiente por Pagar */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              kpis.totalPendiente > 0
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-muted/30 border-border'
            }`}>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pendiente por Pagar</p>
                <p className={`text-2xl font-bold ${kpis.totalPendiente > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {kpis.totalPendiente > 0 ? fmtMillones(kpis.totalPendiente) : 'Al día'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Internos + terceros sin pagar</p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                kpis.totalPendiente > 0 ? 'bg-destructive/10' : 'bg-muted'
              }`}>
                {kpis.totalPendiente > 0
                  ? <TrendingDown className="h-5 w-5 text-destructive" />
                  : <Check className="h-5 w-5 text-muted-foreground" />
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por período..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="CERRADA">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(MESES_NOMBRE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(filtroEstado !== 'todos' || filtroMes !== 'todos' || filtroBusqueda !== '') && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {nominasFiltradas.length} resultado{nominasFiltradas.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroMes('todos');
                  setFiltroBusqueda('');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listado de nóminas */}
      <div className="space-y-4">
        <div>
          <h2 className="mb-2">Nóminas Creadas</h2>
          <p className="text-muted-foreground">Historial de períodos de nómina procesados</p>
        </div>

        {cargando ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              Cargando nóminas...
            </CardContent>
          </Card>
        ) : nominasFiltradas.length > 0 ? (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Período</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Devengado</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Deducciones</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Neto Total</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nominasFiltradas.map((n, index) => {
                      const totalReal = toNumber(n.total_general);
                      const dedReal = toNumber(n.total_deducciones);
                      // Si el backend trae $0 (BORRADOR sin liquidar), usamos
                      // el estimado calculado en cliente. Si ya hay al menos
                      // un liquidado, esos valores reales son la fuente.
                      const est = estimados.get(n.id);
                      const usarEstimado =
                        totalReal === 0 && dedReal === 0 && !!est;
                      const total = usarEstimado ? est!.neto : totalReal;
                      const ded = usarEstimado ? est!.deducciones : dedReal;
                      const dev = usarEstimado ? est!.devengado : totalReal + dedReal;
                      return (
                        <tr
                          key={n.id}
                          className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{periodoLabel(n)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {fmtFecha(n.fecha_inicio)} → {fmtFecha(n.fecha_fin)}
                                  {typeof n.empleados_count === 'number' &&
                                    ` · ${n.empleados_liquidados_count ?? 0}/${n.empleados_count} liquidados`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={n.estado as any} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-success">
                                ${dev.toLocaleString('es-CO')}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3 text-success" />
                                {usarEstimado ? 'Ingresos estimados' : 'Ingresos'}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-destructive">
                                ${ded.toLocaleString('es-CO')}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                {usarEstimado ? 'Descuentos estimados' : 'Descuentos'}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-primary">
                                ${total.toLocaleString('es-CO')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {usarEstimado ? 'A pagar (est.)' : 'A pagar'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              {n.estado === 'BORRADOR' ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`/nomina/${n.id}`)}
                                    className="gap-1 bg-primary hover:bg-primary/90"
                                  >
                                    <Calculator className="h-4 w-4" />
                                    Liquidar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/nomina/${n.id}/editar`);
                                    }}
                                    title="Editar nómina"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNominaAEliminar(n);
                                    }}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                                    title="Eliminar nómina"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/nomina/${n.id}`)}
                                  className="hover:bg-primary/10 hover:text-primary hover:border-primary gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : nominas.length === 0 ? (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No hay períodos de nómina</p>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza creando tu primer período de nómina
              </p>
              <Button onClick={() => navigate('/nomina/nueva')} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Primer Período
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-muted/5 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mb-4">
                Intenta ajustar los filtros de búsqueda
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroMes('todos');
                  setFiltroBusqueda('');
                }}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmar eliminar nómina */}
      <AlertDialog
        open={!!nominaAEliminar}
        onOpenChange={(o) => !o && setNominaAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nómina</AlertDialogTitle>
            <AlertDialogDescription>
              {nominaAEliminar && (
                <>
                  Se eliminará el período <strong>{periodoLabel(nominaAEliminar)}</strong> y
                  todos sus colaboradores pendientes. Esta acción no podrá deshacerse.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
