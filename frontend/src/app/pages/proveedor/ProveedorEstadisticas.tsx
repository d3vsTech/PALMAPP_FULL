import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign,
  Users, Calendar, ArrowUpRight, Star, Loader2,
  Minus, FileSpreadsheet,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import {
  proveedorApi, descargarBlob,
  type PeriodoEstadisticasProv, type EstadisticasProveedorResponse,
  type KpiEstadisticasProv,
} from '../../../api/proveedor';

// Helper defensivo para fechas (evita "Invalid Date").
const formatFecha = (v?: string | null, opts: Intl.DateTimeFormatOptions = {}) => {
  if (!v) return '—';
  const ymd = v.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(ymd + 'T12:00:00') : new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', opts);
};

/**
 * Días entre dos fechas YYYY-MM-DD, inclusivo en ambos extremos.
 * Calculado en cliente porque el backend devuelve `dias` como float con drift
 * (ej. `30.99999...` para un rango que debe ser 30), y `Math.round` lo subía
 * a 31. Aquí usamos diferencia en milisegundos sobre el mediodía local para
 * evitar problemas de DST y zona horaria.
 */
const diasEntreFechas = (desde: string, hasta: string): number => {
  const d1 = new Date(desde + 'T12:00:00');
  const d2 = new Date(hasta + 'T12:00:00');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const ms = d2.getTime() - d1.getTime();
  // +1 porque el rango es inclusivo (incluye `desde` y `hasta`).
  return Math.round(ms / 86_400_000) + 1;
};

const formatRango = (desde: string, hasta: string) => {
  const dias = diasEntreFechas(desde, hasta);
  return `${formatFecha(desde, { day: 'numeric', month: 'short', year: 'numeric' })} – ${formatFecha(hasta, { day: 'numeric', month: 'short', year: 'numeric' })} · ${dias} días`;
};

const formatCOP = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

const formatCompactCOP = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatCOP(n);
};

const PERIODOS: Array<{ value: PeriodoEstadisticasProv; label: string }> = [
  { value: 'ultimos_7_dias',  label: 'Últimos 7 días' },
  { value: 'ultimos_30_dias', label: 'Últimos 30 días' },
  { value: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { value: 'ultimos_6_meses', label: 'Últimos 6 meses' },
  { value: 'este_anio',       label: 'Este año' },
  { value: 'personalizado',   label: 'Personalizado' },
];

const KPI_CARDS = [
  { key: 'ventas_totales',      titulo: 'Ventas Totales',      icono: DollarSign,   formato: 'moneda' as const },
  { key: 'pedidos_completados', titulo: 'Pedidos Completados', icono: ShoppingCart, formato: 'numero' as const },
  { key: 'productos_vendidos',  titulo: 'Productos Vendidos',  icono: Package,      formato: 'numero' as const },
  { key: 'clientes_activos',    titulo: 'Clientes Activos',    icono: Users,        formato: 'numero' as const },
] as const;

export default function ProveedorEstadisticas() {
  const [periodo, setPeriodo] = useState<PeriodoEstadisticasProv>('ultimos_30_dias');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  const [data, setData] = useState<EstadisticasProveedorResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Estado de descarga por tipo de reporte (deshabilita botón). */
  const [descargando, setDescargando] = useState<{ ventas: boolean; productos: boolean; clientes: boolean }>(
    { ventas: false, productos: false, clientes: false },
  );

  /** Solo se envía rango personalizado cuando ambos campos están bien definidos. */
  const paramsActuales = useMemo(() => {
    if (periodo !== 'personalizado') return { periodo };
    if (!fechaDesde || !fechaHasta) return null;
    return { periodo, fecha_desde: fechaDesde, fecha_hasta: fechaHasta };
  }, [periodo, fechaDesde, fechaHasta]);

  const cargar = () => {
    if (!paramsActuales) return; // rango personalizado incompleto
    setCargando(true);
    setError(null);
    proveedorApi.estadisticas(paramsActuales)
      .then((res) => setData(res.data))
      .catch((e: any) => {
        const msg = e?.errors
          ? Object.values(e.errors).flat().join(' ')
          : e?.message ?? 'Error al cargar estadísticas';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsActuales]);

  const descargar = async (
    tipo: 'ventas' | 'productos' | 'clientes',
  ) => {
    if (!paramsActuales) {
      toast.error('Completa el rango personalizado primero');
      return;
    }
    setDescargando(prev => ({ ...prev, [tipo]: true }));
    try {
      const blob = tipo === 'ventas'
        ? await proveedorApi.reporteVentas(paramsActuales)
        : tipo === 'productos'
          ? await proveedorApi.reporteProductos(paramsActuales)
          : await proveedorApi.reporteClientes(paramsActuales);
      const nombreFecha = new Date().toISOString().slice(0, 10);
      const nombreCapital = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      descargarBlob(blob, `Reporte-${nombreCapital}-${nombreFecha}.xlsx`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo descargar el reporte');
    } finally {
      setDescargando(prev => ({ ...prev, [tipo]: false }));
    }
  };

  // ── Helpers de presentación ───────────────────────────────────────────────
  const renderVariacion = (k: KpiEstadisticasProv) => {
    const v = k.variacion_porcentaje;
    if (v === null) {
      return (
        <span className="text-muted-foreground flex items-center gap-1 text-sm">
          <Minus className="h-3 w-3" /> Sin datos previos
        </span>
      );
    }
    const positivo = v > 0;
    const negativo = v < 0;
    const cero = v === 0;
    const Icon = positivo ? TrendingUp : negativo ? TrendingDown : Minus;
    const color = positivo ? 'text-success' : negativo ? 'text-destructive' : 'text-muted-foreground';
    const signo = positivo ? '+' : '';
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${color}`}>
        <Icon className="h-4 w-4" />
        {signo}{v.toFixed(1)}%
        {cero && ' '}
      </span>
    );
  };

  if (cargando && !data) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando estadísticas...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-destructive">{error}</div>
        <div className="flex justify-center">
          <Button onClick={cargar}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { periodo: periodoInfo, kpis, evolucion_ventas, productos_mas_vendidos,
          mejores_clientes, metricas_adicionales } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Estadísticas y Reportes</h1>
        <p className="text-muted-foreground mt-1">Análisis de rendimiento y ventas</p>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 mr-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Período:</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preset</Label>
              <Select
                value={periodo}
                onValueChange={(v) => setPeriodo(v as PeriodoEstadisticasProv)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodo === 'personalizado' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor="fecha-desde">
                    Desde
                  </Label>
                  <Input
                    id="fecha-desde"
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor="fecha-hasta">
                    Hasta
                  </Label>
                  <Input
                    id="fecha-hasta"
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}

            <Badge variant="outline" className="ml-auto">
              {formatRango(periodoInfo.fecha_desde, periodoInfo.fecha_hasta)}
            </Badge>
          </div>

          {/* Acciones de descarga */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground mr-2 self-center">Exportar:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar('ventas')}
              disabled={descargando.ventas || !paramsActuales}
              className="gap-2"
            >
              {descargando.ventas ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Ventas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar('productos')}
              disabled={descargando.productos || !paramsActuales}
              className="gap-2"
            >
              {descargando.productos ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Productos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar('clientes')}
              disabled={descargando.clientes || !paramsActuales}
              className="gap-2"
            >
              {descargando.clientes ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Clientes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(({ key, titulo, icono: Icon, formato }) => {
          const k = kpis[key];
          const valor = formato === 'moneda'
            ? formatCOP(k.actual)
            : k.actual.toLocaleString('es-CO');
          const v = k.variacion_porcentaje;
          const bg = v === null || v === 0
            ? 'bg-muted text-muted-foreground'
            : v > 0
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive';
          return (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{titulo}</p>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold mb-1">{valor}</p>
                <div className="flex items-center gap-1">
                  {renderVariacion(k)}
                  <span className="text-xs text-muted-foreground ml-1">vs. periodo anterior</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evolución de ventas (siempre 6 meses, no depende de filtro de periodo) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Evolución de Ventas</CardTitle>
              {evolucion_ventas.variacion_porcentaje_vs_6_meses !== null && (
                <div className="flex items-center gap-2">
                  {evolucion_ventas.variacion_porcentaje_vs_6_meses >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${
                    evolucion_ventas.variacion_porcentaje_vs_6_meses >= 0
                      ? 'text-success'
                      : 'text-destructive'
                  }`}>
                    {evolucion_ventas.variacion_porcentaje_vs_6_meses > 0 ? '+' : ''}
                    {evolucion_ventas.variacion_porcentaje_vs_6_meses.toFixed(1)}% vs. 6 meses atrás
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={evolucion_ventas.puntos}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactCOP(value as number)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload as { label: string; mes: string; total: number };
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <div className="grid gap-2">
                            <span className="text-sm font-medium">{p.label} ({p.mes})</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              <span className="text-xs text-muted-foreground">Ventas:</span>
                              <span className="text-sm font-bold">{formatCOP(p.total)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorVentasGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Resúmenes debajo del gráfico (calculados sobre los 6 puntos) */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {formatCompactCOP(evolucion_ventas.puntos.at(-1)?.total ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {formatCompactCOP(evolucion_ventas.puntos.reduce((acc, p) => acc + p.total, 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total 6 meses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {formatCompactCOP(
                    evolucion_ventas.puntos.length > 0
                      ? evolucion_ventas.puntos.reduce((acc, p) => acc + p.total, 0) / evolucion_ventas.puntos.length
                      : 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {productos_mas_vendidos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sin ventas en este periodo.
              </p>
            ) : (
              <div className="space-y-4">
                {productos_mas_vendidos.map((p) => {
                  const TendIcon = p.tendencia === 'up'
                    ? TrendingUp
                    : p.tendencia === 'down'
                      ? TrendingDown
                      : Minus;
                  const tendColor = p.tendencia === 'up'
                    ? 'text-success'
                    : p.tendencia === 'down'
                      ? 'text-destructive'
                      : 'text-muted-foreground';
                  const rankBg =
                    p.rank === 1 ? 'bg-amber-500/10 text-amber-600'
                      : p.rank === 2 ? 'bg-slate-400/10 text-slate-600'
                        : p.rank === 3 ? 'bg-orange-500/10 text-orange-600'
                          : 'bg-muted text-muted-foreground';
                  return (
                    <div
                      key={p.producto_id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${rankBg}`}>
                        {p.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{p.unidades_vendidas} unidades</span>
                          {p.categoria && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{p.categoria}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCOP(p.ingresos)}</p>
                        <TendIcon className={`h-3 w-3 ${tendColor} ml-auto`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mejores clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Mejores Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mejores_clientes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin clientes con compras en este periodo.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mejores_clientes.map((c) => (
                <div
                  key={c.tenant_id}
                  className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline">{c.total_pedidos} pedidos</Badge>
                  </div>
                  <p className="font-semibold mb-1 truncate" title={c.nombre}>{c.nombre}</p>
                  <p className="text-2xl font-bold text-primary mb-2">{formatCOP(c.total_gastado)}</p>
                  <p className="text-xs text-muted-foreground">
                    Último pedido: {formatFecha(c.ultimo_pedido)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas adicionales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasa de conversión</p>
                <p className="text-2xl font-bold">
                  {metricas_adicionales.tasa_conversion_porcentaje === null
                    ? '—'
                    : `${metricas_adicionales.tasa_conversion_porcentaje.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket promedio</p>
                <p className="text-2xl font-bold">{formatCOP(metricas_adicionales.ticket_promedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Productos activos</p>
                <p className="text-2xl font-bold">{metricas_adicionales.productos_activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
