import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { KPICard } from '../../components/dashboard/KPICard';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Truck, Cloud, Sparkles, TrendingDown, AlertTriangle, PackageOpen } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi, type DashboardData, type PeriodoDashboard } from '../../../api/dashboard';
import { nominaApi, type Nomina } from '../../../api/nomina';
import { viajesApi, type Viaje } from '../../../api/viajes';

type FilterPreset = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

export default function Dashboard() {
  const { user } = useAuth();

  const [filterPreset, setFilterPreset] = useState<FilterPreset>('semanal');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Datos para el bloque "Análisis Inteligente"
  const [nominaBorrador, setNominaBorrador] = useState<Nomina | null>(null);
  const [viajesEnPlanta, setViajesEnPlanta] = useState<Viaje[]>([]);

  const cargar = useCallback(async (
    preset: FilterPreset,
    inicio: string,
    fin: string,
  ) => {
    setLoading(true);
    try {
      const params =
        preset === 'personalizado'
          ? { periodo: 'personalizado' as PeriodoDashboard, fecha_inicio: inicio, fecha_fin: fin }
          : { periodo: preset as PeriodoDashboard };
      const res = await dashboardApi.get(params);
      setData(res.data);
    } catch (e) {
      console.error('Error cargando dashboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar('semanal', '', ''); }, [cargar]);

  // Cargar señales para el bloque "Análisis Inteligente" (una sola vez)
  useEffect(() => {
    nominaApi.listar({ estado: 'BORRADOR', per_page: 1 })
      .then((res) => {
        const primera = res.data?.[0] ?? null;
        setNominaBorrador(primera);
      })
      .catch(() => void 0);
    viajesApi.listar({ estado: 'EN_VALIDACION', per_page: 20 })
      .then((res: any) => {
        setViajesEnPlanta(res.data ?? []);
      })
      .catch(() => void 0);
  }, []);

  const handlePresetChange = (preset: FilterPreset) => {
    setFilterPreset(preset);
    if (preset !== 'personalizado') cargar(preset, '', '');
  };

  const handleAplicar = () => {
    if (!fechaInicio || !fechaFin) return;
    setFilterPreset('personalizado');
    cargar('personalizado', fechaInicio, fechaFin);
  };

  return (
    <div className="space-y-6">
      {/* Header con bienvenida */}
      <div className="space-y-1">
        <h1>¡Bienvenido, {user?.nombre}!</h1>
        <p className="text-lead">Resumen de producción de tu plantación</p>
      </div>

      {/* ── ANÁLISIS INTELIGENTE ─────────────────────────────────────────── */}
      {(() => {
        // Detectar el lote más rezagado vs el promedio general
        const lotes = data?.lotes ?? [];
        const promedioGral = lotes.length > 0
          ? lotes.reduce((s, l) => s + Number(l.kg_promedio ?? 0), 0) / lotes.length
          : 0;
        const loteBajo = lotes.length > 0
          ? [...lotes].sort((a, b) => Number(a.kg_promedio) - Number(b.kg_promedio))[0]
          : null;
        const diffLote = loteBajo && promedioGral > 0
          ? promedioGral - Number(loteBajo.kg_promedio)
          : 0;
        const alertaProduccion = loteBajo && diffLote / promedioGral > 0.1;

        // Nómina
        const nominaAbierta = nominaBorrador;
        const nominaLabel = nominaAbierta
          ? (() => {
              const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
              const mes = meses[(nominaAbierta.mes ?? 1) - 1];
              const q = nominaAbierta.tipo_pago_snapshot === 'QUINCENAL'
                ? ` – ${nominaAbierta.quincena === 1 ? 'Primera' : 'Segunda'} quincena`
                : '';
              return `${mes} ${nominaAbierta.anio}${q}`;
            })()
          : null;
        const totalNomina = nominaAbierta
          ? Number(nominaAbierta.total_general ?? 0) + Number(nominaAbierta.total_deducciones ?? 0)
          : 0;

        // Viajes en planta (EN_VALIDACION) sin liquidar
        const pesoTotalViajes = viajesEnPlanta.reduce(
          (s, v) => s + Number(v.peso_viaje ?? 0),
          0,
        );

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Análisis Inteligente</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded px-2 py-0.5">
                IA
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Producción */}
              <Card className={`border-2 ${alertaProduccion ? 'border-red-300 bg-red-50/60 dark:bg-red-950/10' : 'border-border'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600">Producción</p>
                    {alertaProduccion && <TrendingDown className="h-4 w-4 text-red-600" />}
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {data ? `${Number(data.indicadores.promedio_kg_gajo).toFixed(1)} kg/gajo` : '—'}
                  </p>
                  {alertaProduccion && loteBajo ? (
                    <>
                      <p className="text-xs text-foreground">
                        {loteBajo.nombre} bajó {diffLote.toFixed(1)} kg/gajo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Posible problema fitosanitario o de polinización.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Todos los lotes están dentro del rango esperado.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Nómina */}
              <Card className={`border-2 ${nominaAbierta ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/10' : 'border-border'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Nómina</p>
                    {nominaAbierta && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {nominaAbierta ? `$${totalNomina.toLocaleString('es-CO')}` : 'Sin nómina abierta'}
                  </p>
                  {nominaAbierta ? (
                    <>
                      <p className="text-xs text-foreground">
                        "{nominaLabel}" sin cerrar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Los colaboradores no reciben pago hasta que se cierre.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No hay nóminas en borrador pendientes.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Viajes */}
              <Card className={`border-2 ${viajesEnPlanta.length > 0 ? 'border-orange-300 bg-orange-50/60 dark:bg-orange-950/10' : 'border-border'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Viajes</p>
                    {viajesEnPlanta.length > 0 && <PackageOpen className="h-4 w-4 text-orange-600" />}
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {viajesEnPlanta.length > 0
                      ? `${pesoTotalViajes.toLocaleString('es-CO')} kg`
                      : 'Sin pendientes'}
                  </p>
                  {viajesEnPlanta.length > 0 ? (
                    <>
                      <p className="text-xs text-foreground">
                        {viajesEnPlanta.length} viaje{viajesEnPlanta.length !== 1 ? 's' : ''} en planta sin liquidar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sin cierre, la producción no queda confirmada en el sistema.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Todos los viajes han sido validados.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })()}

      {/* Filtro de Fechas */}
      <Card className="border-border">
        <CardContent className="pt-6">
          {/* Versión Desktop */}
          <div className="hidden lg:flex items-center gap-6">
            <h3 className="whitespace-nowrap">Filtro de Fechas</h3>

            <div className="flex gap-2">
              <Button
                variant={filterPreset === 'semanal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('semanal')}
                className={filterPreset === 'semanal' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Semanal
              </Button>
              <Button
                variant={filterPreset === 'quincenal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('quincenal')}
                className={filterPreset === 'quincenal' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Quincenal
              </Button>
              <Button
                variant={filterPreset === 'mensual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange('mensual')}
                className={filterPreset === 'mensual' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                Mensual
              </Button>
            </div>

            <div className="flex-1" />

            <div className="space-y-1.5">
              <Label htmlFor="fechaInicio" className="text-sm font-medium">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                className="h-9 w-[140px]"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fechaFin" className="text-sm font-medium">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                className="h-9 w-[140px]"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <Button
              size="sm"
              onClick={handleAplicar}
              disabled={loading || !fechaInicio || !fechaFin}
              className="bg-primary hover:bg-primary/90 h-9 px-6 self-end"
            >
              {loading ? 'Cargando…' : 'Aplicar'}
            </Button>
          </div>

          {/* Versión Mobile/Tablet */}
          <div className="lg:hidden space-y-4">
            <div className="space-y-3">
              <h3>Filtro de Fechas</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                <Button
                  variant={filterPreset === 'semanal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('semanal')}
                  className={`whitespace-nowrap ${filterPreset === 'semanal' ? 'bg-primary hover:bg-primary/90' : ''}`}
                >
                  Semanal
                </Button>
                <Button
                  variant={filterPreset === 'quincenal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('quincenal')}
                  className={`whitespace-nowrap ${filterPreset === 'quincenal' ? 'bg-primary hover:bg-primary/90' : ''}`}
                >
                  Quincenal
                </Button>
                <Button
                  variant={filterPreset === 'mensual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('mensual')}
                  className={`whitespace-nowrap ${filterPreset === 'mensual' ? 'bg-primary hover:bg-primary/90' : ''}`}
                >
                  Mensual
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="fechaInicio-mobile" className="text-sm font-medium">Fecha Inicio</Label>
                <Input
                  id="fechaInicio-mobile"
                  type="date"
                  className="h-9 w-[135px]"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fechaFin-mobile" className="text-sm font-medium">Fecha Fin</Label>
                <Input
                  id="fechaFin-mobile"
                  type="date"
                  className="h-9 w-[135px]"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>

              <Button
                size="sm"
                onClick={handleAplicar}
                disabled={loading || !fechaInicio || !fechaFin}
                className="bg-primary hover:bg-primary/90 h-9 px-8"
              >
                {loading ? 'Cargando…' : 'Aplicar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="space-y-4">
        <h2>Indicadores Principales</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <KPICard
            title="Producción Total"
            value={data ? Number(data.indicadores.produccion_total_kg).toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '—'}
            subtitle="kg"
          />
          <KPICard
            title="Promedio Kg/Gajo"
            value={data ? Number(data.indicadores.promedio_kg_gajo).toFixed(3) : '—'}
            subtitle="kg (plantación)"
          />
        </div>
      </div>

      {/* Promedio kg por lote */}
      <div className="space-y-4">
        <h2>Promedio kg por Lote</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(data?.lotes ?? []).map((lote) => (
            <Card key={lote.id} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>{lote.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground">{lote.codigo}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-4xl font-bold">
                    {Number(lote.kg_promedio).toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-sm text-muted-foreground">kg promedio</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Viajes */}
      <div className="space-y-4">
        <h2>Viajes</h2>
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle>Registro de Viajes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Cuando aún no hay viajes registrados, mostramos un dataset
              // placeholder de 6 entradas vacías para que los ejes X/Y se
              // pinten igual y el usuario vea cómo se verá el gráfico.
              const viajesReales = data?.viajes ?? [];
              const sinDatos = viajesReales.length === 0;
              const chartData = sinDatos
                ? Array.from({ length: 6 }, () => ({ remision: '', peso_viaje: 0, fecha_viaje: '' }))
                : viajesReales;

              return (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={300} key="viajes-chart">
                    <BarChart data={chartData}>
                      <CartesianGrid key="viajes-grid" strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        key="viajes-xaxis"
                        dataKey="remision"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        key="viajes-yaxis"
                        domain={sinDatos ? [0, 1000] : [0, 'auto']}
                        allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{
                          value: 'kg',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fill: 'hsl(var(--muted-foreground))' },
                        }}
                      />
                      {!sinDatos && (
                        <Tooltip
                          key="viajes-tooltip"
                          formatter={(value: number) => [`${Number(value).toLocaleString('es-CO')} kg`, 'Kilogramos']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                          labelFormatter={(label) => {
                            const v = data?.viajes.find(x => x.remision === label);
                            if (!v) return label;
                            try {
                              return `${label} — ${format(new Date(v.fecha_viaje + 'T00:00:00'), 'd MMM yyyy', { locale: es })}`;
                            } catch { return label; }
                          }}
                        />
                      )}
                      <Bar
                        key="viajes-bar"
                        dataKey="peso_viaje"
                        fill="#1E5631"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  {sinDatos && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground">
                        No hay viajes registrados todavía
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Lluvias */}
      <div className="space-y-4">
        <h2>Lluvias</h2>
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle>Registro de Precipitaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Semana Actual</p>
                <p className="text-4xl font-bold">
                  {data ? Number(data.lluvias.semana_actual_mm).toLocaleString('es-CO') : '—'}
                </p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Semana Anterior</p>
                <p className="text-4xl font-bold">
                  {data ? Number(data.lluvias.semana_anterior_mm).toLocaleString('es-CO') : '—'}
                </p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Mes Actual</p>
                <p className="text-4xl font-bold">
                  {data ? Number(data.lluvias.mes_actual_mm).toLocaleString('es-CO') : '—'}
                </p>
                <p className="text-xs text-muted-foreground">mm acumulados</p>
              </div>
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Promedio Mensual</p>
                <p className="text-4xl font-bold">
                  {data ? Number(data.lluvias.promedio_mensual_historico_mm).toLocaleString('es-CO') : '—'}
                </p>
                <p className="text-xs text-muted-foreground">mm histórico</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}