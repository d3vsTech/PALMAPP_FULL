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

const MESES_NOMBRE: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function periodoLabel(n: NominaT): string {
  const mes = MESES_NOMBRE[n.mes] ?? String(n.mes);
  const base = n.tipo_pago_snapshot === 'QUINCENAL' && n.quincena
    ? `${mes} ${n.anio} - ${n.quincena === 1 ? 'Primera' : 'Segunda'} quincena`
    : `${mes} ${n.anio}`;
  // §2.6 — Si la nómina tiene `etiqueta`, se anexa entre paréntesis para
  // distinguirla de otras del mismo período (p.ej. "Campo" vs "Admin").
  return n.etiqueta ? `${base} · ${n.etiqueta}` : base;
}

/** §2.6 — Rango real de días (puede ser custom, no solo derivado del mes). */
function rangoFechasLabel(n: NominaT): string {
  const fmt = (raw: string) => {
    if (!raw) return '';
    // El backend puede devolver `YYYY-MM-DD` (fecha simple, sin zona) o un
    // ISO datetime completo tipo `2026-05-01T05:00:00.000000Z`. Detectamos
    // por la presencia de la `T`: si viene datetime, se parsea directo;
    // si viene fecha simple, se le pone `T00:00:00` para evitar que la
    // conversión de zona corra un día atrás.
    const d = raw.includes('T') ? new Date(raw) : new Date(raw + 'T00:00:00');
    if (isNaN(d.getTime())) {
      // Fallback: mostrar solo la parte de la fecha (`YYYY-MM-DD`) si algo
      // muy raro llegó, para no ensuciar la tabla con el ISO completo.
      return raw.slice(0, 10);
    }
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  return `${fmt(n.fecha_inicio)} - ${fmt(n.fecha_fin)}`;
}

function toNumber(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(v) || 0;
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

  // Nota: se eliminó el cálculo en cliente de "estimados" para las nóminas
  // en BORRADOR sin liquidados. Antes hacía `nominaApi.ver()` + un
  // `nominaApi.preview()` por cada empleado (hasta 8-10 requests por
  // nómina cada vez que entrabas a esta pantalla), solo para pintar
  // "Ingresos estimados / Descuentos estimados" en la tabla. Ahora la
  // tabla muestra directamente lo que el backend trae en el listado:
  // $0 mientras nadie esté liquidado, y el total real cuando ya se
  // liquidó al menos un empleado.

  // Editar nómina: navega a `/nomina/:id/editar` que carga el wizard completo
  // en modo edición (paso 1 pre-poblado, paso 2 con colaboradores ya agregados,
  // paso 3 validar cosecha, paso 4 confirmar).

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
        setCargando(false);
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

  const confirmarEliminar = async () => {
    if (!nominaAEliminar) return;
    setEliminando(true);
    try {
      await nominaApi.eliminar(nominaAEliminar.id);
      toast.success('Nómina eliminada');
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

            {/* Pendiente por Pagar — 3 escenarios:
                  1. Hay monto pendiente (>0)      → rojo con monto y trending-down.
                  2. Hay borrador sin liquidar     → amarillo con "Sin liquidar" y check pendiente.
                  3. No hay borradores ni deuda    → verde "Al día". */}
            {(() => {
              const hayDeuda = kpis.totalPendiente > 0;
              const hayBorradorSinLiquidar = !hayDeuda && kpis.borradoresLen > 0;
              return (
                <div className={`flex items-center justify-between p-4 rounded-xl border ${
                  hayDeuda
                    ? 'bg-destructive/5 border-destructive/20'
                    : hayBorradorSinLiquidar
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/40'
                      : 'bg-muted/30 border-border'
                }`}>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Pendiente por Pagar</p>
                    <p className={`text-2xl font-bold ${
                      hayDeuda ? 'text-destructive'
                        : hayBorradorSinLiquidar ? 'text-amber-700'
                        : 'text-muted-foreground'
                    }`}>
                      {hayDeuda
                        ? fmtMillones(kpis.totalPendiente)
                        : hayBorradorSinLiquidar
                          ? 'Sin liquidar'
                          : 'Al día'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hayDeuda
                        ? 'Internos + terceros sin pagar'
                        : hayBorradorSinLiquidar
                          ? `${kpis.borradoresLen} nómina${kpis.borradoresLen === 1 ? '' : 's'} en curso`
                          : 'Todo pagado y sin pendientes'}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    hayDeuda ? 'bg-destructive/10'
                      : hayBorradorSinLiquidar ? 'bg-amber-500/10'
                      : 'bg-muted'
                  }`}>
                    {hayDeuda
                      ? <TrendingDown className="h-5 w-5 text-destructive" />
                      : hayBorradorSinLiquidar
                        ? <DollarSign className="h-5 w-5 text-amber-600" />
                        : <Check className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              );
            })()}
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
                      // La tabla muestra los valores REALES del backend.
                      // Nóminas BORRADOR sin liquidar salen en $0 hasta
                      // que el usuario empiece a liquidar empleados.
                      const usarEstimado = false;
                      const total = totalReal;
                      const ded = dedReal;
                      const dev = totalReal + dedReal;
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
                                  {rangoFechasLabel(n)}
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
