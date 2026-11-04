import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Cloud, Truck } from 'lucide-react';
import { Link } from 'react-router';
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import {
  SelectorAnio, SelectorMes, mesDeHoy,
} from '../../components/common/SelectorMes';
import {
  barCategoryGap, barLabelProps, barProps, CHART_COLORS,
  gridProps, tooltipProps, xAxisProps, yAxisProps,
} from '../../components/common/chartTheme';
import { num } from '../../lib/formato';
import {
  dashboardApi,
  type DashboardData, type ParamsDashboard, type PeriodoDashboard, type QuincenaDashboard,
} from '../../../api/dashboard';
import { SeccionInsightsIA } from '../../components/insights/SeccionInsightsIA';

/** Buenos días hasta las 12, buenas tardes hasta las 19, buenas noches después. */
function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Dashboard() {
  const { user } = useAuth();

  const [preset, setPreset] = useState<PeriodoDashboard>('semanal');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mes, setMes] = useState(mesDeHoy());
  const [quincena, setQuincena] = useState<QuincenaDashboard>(
    new Date().getDate() <= 15 ? 1 : 2,
  );
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (params: ParamsDashboard) => {
    setLoading(true);
    try {
      const res = await dashboardApi.get(params);
      setData(res.data);
    } catch (e) {
      console.error('Error cargando el panel', e);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cada ancla aplica a un solo período, así que se manda la suya y nada más
   * (API_DASHBOARD.md). El rango a la medida espera a tener las dos fechas:
   * con una sola, el backend responde 422.
   */
  useEffect(() => {
    const params: ParamsDashboard =
      preset === 'quincenal' ? { periodo: 'quincenal', mes, quincena }
      : preset === 'mensual' ? { periodo: 'mensual', mes }
      : preset === 'anual'   ? { periodo: 'anual', anio }
      : preset === 'personalizado'
        ? { periodo: 'personalizado', fecha_inicio: fechaInicio, fecha_fin: fechaFin }
        : { periodo: 'semanal' };

    if (preset === 'personalizado' && (!fechaInicio || !fechaFin)) return;

    const t = window.setTimeout(() => cargar(params), 300);
    return () => window.clearTimeout(t);
  }, [preset, mes, quincena, anio, fechaInicio, fechaFin, cargar]);

  const primerNombre = (user?.nombre ?? '').split(' ')[0] || 'Hola';
  const hoyTexto = format(new Date(), "d 'de' MMMM", { locale: es });

  // El total de viajes y los kilos salen del mismo arreglo que grafica abajo.
  const viajes = (data?.viajes ?? []).map((v) => ({
    ...v,
    peso_viaje: Number(v.peso_viaje) || 0,
  }));
  const sinViajes = viajes.length === 0;
  // Sin viajes se grafican seis barras vacías para que los ejes se pinten igual.
  const datosGrafica = sinViajes
    ? Array.from({ length: 6 }, () => ({ remision: '', peso_viaje: 0, fecha_viaje: '' }))
    : viajes;

  const lotes = data?.lotes ?? [];
  const mayorPromedio = lotes.reduce((max, l) => Math.max(max, Number(l.kg_promedio) || 0), 0);

  const lluvias = [
    { label: 'Semana actual', valor: data?.lluvias.semana_actual_mm, nota: 'mm acumulados' },
    { label: 'Semana anterior', valor: data?.lluvias.semana_anterior_mm, nota: 'mm acumulados' },
    { label: 'Mes actual', valor: data?.lluvias.mes_actual_mm, nota: 'mm acumulados' },
    { label: 'Promedio mensual', valor: data?.lluvias.promedio_mensual_historico_mm, nota: 'mm histórico' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${user?.fincaActual?.nombre ?? 'Finca'} · ${hoyTexto}`}
        title={`${saludo()}, ${primerNombre}`}
        description="Así va la plantación en el período seleccionado."
        actions={
          <>
            <Label className="text-sm font-medium">Período:</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as PeriodoDashboard)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {(preset === 'mensual' || preset === 'quincenal') && (
              <SelectorMes valor={mes} onChange={setMes} />
            )}
            {preset === 'anual' && (
              <SelectorAnio valor={anio} onChange={setAnio} />
            )}
            {preset === 'quincenal' && (
              <Select value={String(quincena)}
                onValueChange={(v) => setQuincena(Number(v) as QuincenaDashboard)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Del 1 al 15</SelectItem>
                  <SelectItem value="2">Del 16 al fin de mes</SelectItem>
                </SelectContent>
              </Select>
            )}
            {preset === 'personalizado' && (
              <>
                <Input
                  type="date"
                  aria-label="Fecha de inicio"
                  className="w-40"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
                <Input
                  type="date"
                  aria-label="Fecha de fin"
                  className="w-40"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </>
            )}
          </>
        }
      />

      <SeccionInsightsIA />

      <StatStrip
        loading={loading}
        items={[
          {
            label: 'Producción total',
            value: num(Number(data?.indicadores.produccion_total_kg ?? 0), 2),
            unit: 'kg',
            note: 'en el período elegido',
          },
          {
            label: 'Promedio por gajo',
            value: num(Number(data?.indicadores.promedio_kg_gajo ?? 0), 2),
            unit: 'kg',
            note: 'peso promedio de cada racimo',
          },
          {
            label: 'Viajes',
            value: num(viajes.length),
            note: 'despachados en el período',
          },
          {
            label: 'Lluvia del mes',
            value: num(Number(data?.lluvias.mes_actual_mm ?? 0)),
            unit: 'mm',
            note: `promedio histórico ${num(Number(data?.lluvias.promedio_mensual_historico_mm ?? 0))} mm`,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
      <Card className="gap-4 lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Truck className="h-4 w-4" strokeWidth={2} />
              </span>
              Registro de viajes
            </CardTitle>
            <CardDescription>
              {sinViajes ? 'Sin viajes en el período' : `${viajes.length} viajes a extractora`}
            </CardDescription>
          </div>
          <Link
            to="/viajes"
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            Ver viajes <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafica} barCategoryGap={barCategoryGap} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="remision" {...xAxisProps} />
                <YAxis
                  {...yAxisProps}
                  width={56}
                  domain={sinViajes ? [0, 1000] : [0, 'auto']}
                  allowDecimals={false}
                />
                {!sinViajes && (
                  <Tooltip
                    {...tooltipProps}
                    formatter={(valor: number) => [`${num(Number(valor))} kg`, 'Kilogramos']}
                    labelFormatter={(remision) => {
                      const v = viajes.find((x) => x.remision === remision);
                      if (!v) return remision;
                      try {
                        return `${remision} — ${format(new Date(`${v.fecha_viaje}T00:00:00`), 'd MMM yyyy', { locale: es })}`;
                      } catch {
                        return remision;
                      }
                    }}
                  />
                )}
                <Bar {...barProps} dataKey="peso_viaje" fill={CHART_COLORS[0]}>
                  {!sinViajes && viajes.length <= 12 && (
                    <LabelList dataKey="peso_viaje" {...barLabelProps} formatter={(v: number) => num(Number(v))} />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {sinViajes && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                  {loading ? 'Cargando viajes…' : 'No hay viajes registrados todavía'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Promedio por lote</CardTitle>
            <CardDescription>kg promedio en el período</CardDescription>
          </div>
          <Link
            to="/plantacion"
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            Lotes <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? 'Cargando lotes…' : 'No hay lotes con producción en el período'}
            </p>
          ) : (
            <ul className="space-y-4">
              {lotes.map((lote) => {
                // La barra compara contra el lote que más rinde, que es la
                // única referencia que trae el endpoint.
                const ancho = mayorPromedio > 0
                  ? Math.max(4, Math.round((Number(lote.kg_promedio) / mayorPromedio) * 100))
                  : 0;
                return (
                  <li key={lote.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">{lote.nombre}</span>
                        <span className="block text-[13px] text-muted-foreground">{lote.codigo}</span>
                      </span>
                      <span className="shrink-0 text-xl font-bold text-foreground">
                        {num(Number(lote.kg_promedio), 1)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${ancho}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info">
              <Cloud className="h-4 w-4" strokeWidth={2} />
            </span>
            Lluvias
          </CardTitle>
          <CardDescription>Milímetros registrados en la finca</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lluvias.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/60 px-4 py-3">
                <dt className="text-[13px] font-medium text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {item.valor == null ? '—' : num(Number(item.valor))}
                </dd>
                <dd className="text-xs text-muted-foreground">{item.nota}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
