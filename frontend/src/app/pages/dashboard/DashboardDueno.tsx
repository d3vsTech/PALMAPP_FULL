import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/AppCard';
import { Button } from '../../components/ui/AppButton';
import { Input } from '../../components/ui/AppInput';
import KPICard from '../../components/common/KPICard';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ArrowRight,
  Sprout,
  BarChart3,
  Calendar,
  TrendingDown,
  Award,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
} from 'lucide-react';
import { kpisDashboard, productividadColaboradores } from '../../lib/mockData';
import { ProductividadColaboradoresModal } from '../../components/dueno/ProductividadColaboradoresModal';
import { ProduccionPorLoteModal } from '../../components/dueno/ProduccionPorLoteModal';
import { NominaModal } from '../../components/dueno/NominaModal';
import { PreciosCosechaModal } from '../../components/dueno/PreciosCosechaModal';

// Datos mock para gráficas del Dueño
const preciosCosechaData = [
  { lote: 'Lote 1 Norte', precio: 850, tendencia: 'up' },
  { lote: 'Lote 2 Sur', precio: 850, tendencia: 'stable' },
  { lote: 'Lote 3 Este', precio: 820, tendencia: 'down' },
  { lote: 'Lote 4 Oeste', precio: 865, tendencia: 'up' },
];

const comparativosHistoricosData = [
  { mes: 'Ene', '2025': 387000, '2026': 404700 },
  { mes: 'Feb', '2025': 392500, '2026': 415600 },
  { mes: 'Mar', '2025': 404700, '2026': 428300 },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

// Función para calcular datos dinámicos basados en el rango de fechas
const calcularDatosPorFechas = (fechaInicio: string, fechaFin: string) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diasDiferencia = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 3600 * 24)));
  
  // Factor de escala basado en días (para simular datos realistas)
  const factorEscala = Math.min(diasDiferencia / 15, 2); // Máximo 2x para periodos muy largos
  
  // Calcular KPIs principales
  const kgBase = 17320;
  const gajosBase = 131850;
  const kgTotalCalculado = Math.round(kgBase * factorEscala);
  const gajosTotalCalculado = Math.round(gajosBase * factorEscala);
  const promedioKgGajoCalculado = Number((kgTotalCalculado / gajosTotalCalculado).toFixed(3));
  const productividadPromedioCalculada = Number((kgTotalCalculado / (productividadColaboradores.length * diasDiferencia)).toFixed(1));
  
  // Calcular tendencias basadas en el periodo
  const tendenciaProduccion = diasDiferencia <= 1 ? '+8.2%' : diasDiferencia <= 7 ? '+12.5%' : diasDiferencia <= 15 ? '+12.5%' : '+15.8%';
  const tendenciaIngresos = diasDiferencia <= 1 ? '+8.2%' : diasDiferencia <= 7 ? '+13.1%' : diasDiferencia <= 15 ? '+15.2%' : '+18.4%';
  const tendenciaProductividad = diasDiferencia <= 1 ? '-1.5%' : diasDiferencia <= 7 ? '-2.1%' : diasDiferencia <= 15 ? '-2.1%' : '-3.2%';
  
  // Generar datos de producción diaria/mensual según el rango
  let produccionData: any[] = [];
  if (diasDiferencia <= 1) {
    // Para "Hoy" mostrar horas del día
    produccionData = [
      { mes: '8am', kg: Math.round(kgBase * 0.05), ingreso: Math.round(kgBase * 0.05 * 850) },
      { mes: '10am', kg: Math.round(kgBase * 0.15), ingreso: Math.round(kgBase * 0.15 * 850) },
      { mes: '12pm', kg: Math.round(kgBase * 0.30), ingreso: Math.round(kgBase * 0.30 * 850) },
      { mes: '2pm', kg: Math.round(kgBase * 0.50), ingreso: Math.round(kgBase * 0.50 * 850) },
      { mes: '4pm', kg: Math.round(kgBase * 0.75), ingreso: Math.round(kgBase * 0.75 * 850) },
      { mes: '6pm', kg: Math.round(kgBase * 1.0), ingreso: Math.round(kgBase * 1.0 * 850) },
    ];
  } else if (diasDiferencia <= 7) {
    // Para "Semana" mostrar días
    const dias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    produccionData = dias.slice(0, diasDiferencia).map((dia, idx) => ({
      mes: dia,
      kg: Math.round(kgBase * (0.9 + Math.random() * 0.2)),
      ingreso: Math.round(kgBase * (0.9 + Math.random() * 0.2) * 850),
    }));
  } else if (diasDiferencia <= 31) {
    // Para "Mes" o "Quincena" mostrar semanas
    const numSemanas = Math.ceil(diasDiferencia / 7);
    produccionData = Array.from({ length: numSemanas }, (_, idx) => ({
      mes: `Sem ${idx + 1}`,
      kg: Math.round((kgBase * 7) * (0.95 + Math.random() * 0.1)),
      ingreso: Math.round((kgBase * 7) * (0.95 + Math.random() * 0.1) * 850),
    }));
  } else {
    // Para periodos largos mostrar meses
    produccionData = [
      { mes: 'Ene', kg: 387000, ingreso: 328950000 },
      { mes: 'Feb', kg: 392500, ingreso: 333625000 },
      { mes: 'Mar', kg: 404700, ingreso: 343995000 },
      { mes: 'Abr', kg: 398200, ingreso: 338470000 },
      { mes: 'May', kg: 415600, ingreso: 353260000 },
      { mes: 'Jun', kg: 408900, ingreso: 347565000 },
    ];
  }
  
  // Calcular datos de colaboradores top (varían ligeramente con el periodo)
  const colaboradoresTop = productividadColaboradores.slice(0, 8).map((c, idx) => ({
    nombre: c.colaborador,
    kg: Math.round(c.kg * factorEscala * (0.9 + Math.random() * 0.2)),
    gajos: Math.round(c.gajos * factorEscala * (0.9 + Math.random() * 0.2)),
    promedio: Number((c.promedio * (0.95 + Math.random() * 0.1)).toFixed(2)),
  }));
  
  // Calcular datos de lotes (varían con el periodo)
  const promediosLote = [
    { lote: 'Lote 1', promedio: Number((18.5 * (0.95 + Math.random() * 0.1)).toFixed(1)), area: 12.5, palmas: 2340 },
    { lote: 'Lote 2', promedio: Number((17.8 * (0.95 + Math.random() * 0.1)).toFixed(1)), area: 10.2, palmas: 1890 },
    { lote: 'Lote 3', promedio: Number((19.2 * (0.95 + Math.random() * 0.1)).toFixed(1)), area: 15.8, palmas: 2980 },
    { lote: 'Lote 4', promedio: Number((16.9 * (0.95 + Math.random() * 0.1)).toFixed(1)), area: 8.7, palmas: 1650 },
  ];
  
  // Calcular datos de nómina (proporcionales a los días)
  const nominaDiaria = Math.round(1900000 * (factorEscala / diasDiferencia));
  const nominaQuincenal = Math.round(nominaDiaria * Math.min(15, diasDiferencia));
  const nominaMensual = Math.round(nominaDiaria * Math.min(30, diasDiferencia));
  const bonificaciones = Math.round(90000 * factorEscala);
  const descuentos = Math.round(23000 * factorEscala);
  const horasExtras = Math.round(6 * factorEscala);
  
  return {
    kgTotal: kgTotalCalculado,
    gajosTotal: gajosTotalCalculado,
    promedioKgGajo: promedioKgGajoCalculado,
    productividadPromedio: productividadPromedioCalculada,
    tendenciaProduccion,
    tendenciaIngresos,
    tendenciaProductividad,
    produccionData,
    colaboradoresTop,
    promediosLote,
    nominaDiaria,
    nominaQuincenal,
    nominaMensual,
    bonificaciones,
    descuentos,
    horasExtras,
    diasPeriodo: diasDiferencia,
  };
};

// Dashboard para Dueño
export default function DashboardDueño() {
  // Estado para el rango de fechas - Por defecto última quincena
  const hoy = new Date();
  const hace15Dias = new Date(hoy);
  hace15Dias.setDate(hoy.getDate() - 15);
  
  const [fechaInicio, setFechaInicio] = useState(hace15Dias.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(hoy.toISOString().split('T')[0]);
  const [periodoPreset, setPeriodoPreset] = useState<string>('quincena');
  
  // Estados para modales
  const [modalProductividad, setModalProductividad] = useState(false);
  const [modalLotes, setModalLotes] = useState(false);
  const [modalNomina, setModalNomina] = useState(false);
  const [modalPrecios, setModalPrecios] = useState(false);

  // Función para aplicar presets de periodo
  const aplicarPreset = (preset: string) => {
    setPeriodoPreset(preset);
    const hoy = new Date();
    let nuevaFechaInicio = new Date(hoy);
    
    switch (preset) {
      case 'hoy':
        setFechaInicio(hoy.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
      case 'semana':
        nuevaFechaInicio.setDate(hoy.getDate() - 7);
        setFechaInicio(nuevaFechaInicio.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
      case 'quincena':
        nuevaFechaInicio.setDate(hoy.getDate() - 15);
        setFechaInicio(nuevaFechaInicio.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
      case 'mes':
        nuevaFechaInicio.setMonth(hoy.getMonth() - 1);
        setFechaInicio(nuevaFechaInicio.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
      case 'trimestre':
        nuevaFechaInicio.setMonth(hoy.getMonth() - 3);
        setFechaInicio(nuevaFechaInicio.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
      case 'año':
        nuevaFechaInicio.setFullYear(hoy.getFullYear() - 1);
        setFechaInicio(nuevaFechaInicio.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);
        break;
    }
  };

  // Calcular datos dinámicos basados en el rango de fechas
  const datosCalculados = useMemo(() => calcularDatosPorFechas(fechaInicio, fechaFin), [fechaInicio, fechaFin]);

  return (
    <div className="space-y-8">
      {/* Modales */}
      <ProductividadColaboradoresModal
        isOpen={modalProductividad}
        onClose={() => setModalProductividad(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      <ProduccionPorLoteModal
        isOpen={modalLotes}
        onClose={() => setModalLotes(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      <NominaModal
        isOpen={modalNomina}
        onClose={() => setModalNomina(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      <PreciosCosechaModal
        isOpen={modalPrecios}
        onClose={() => setModalPrecios(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />

      {/* Header ultra-moderno */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-3xl border border-primary/30 p-10 shadow-2xl shadow-primary/10">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-3xl" />
        
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/30 px-4 py-2 shadow-lg shadow-primary/20">
            <div className="relative h-2.5 w-2.5">
              <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary blur-sm animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-primary">Dashboard Ejecutivo</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text">
            Análisis General de la Finca
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Finca Puerto Arturo • Todas las métricas clave
          </p>
        </div>
      </div>

      {/* Filtro de Periodo Mejorado con Presets */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Periodo de Análisis
          </CardTitle>
          <CardDescription>Selecciona el rango de fechas para filtrar todas las métricas del dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Presets rápidos */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Periodos Predefinidos</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodoPreset === 'hoy' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('hoy')}
                >
                  Hoy
                </Button>
                <Button
                  variant={periodoPreset === 'semana' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('semana')}
                >
                  Última Semana
                </Button>
                <Button
                  variant={periodoPreset === 'quincena' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('quincena')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Última Quincena
                </Button>
                <Button
                  variant={periodoPreset === 'mes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('mes')}
                >
                  Último Mes
                </Button>
                <Button
                  variant={periodoPreset === 'trimestre' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('trimestre')}
                >
                  Último Trimestre
                </Button>
                <Button
                  variant={periodoPreset === 'año' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPreset('año')}
                >
                  Último Año
                </Button>
              </div>
            </div>

            {/* Selector de fechas manual */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
              <div className="space-y-2">
                <label htmlFor="fecha-inicio" className="block text-sm font-medium text-foreground">
                  Fecha de Inicio
                </label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setPeriodoPreset('custom');
                  }}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="fecha-fin" className="block text-sm font-medium text-foreground">
                  Fecha de Fin
                </label>
                <Input
                  id="fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    setPeriodoPreset('custom');
                  }}
                  className="w-full"
                />
              </div>

              <Button className="w-full md:w-auto bg-success hover:bg-success/90">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtro
              </Button>
            </div>

            {/* Indicador de rango seleccionado */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <p className="text-sm">
                <span className="font-semibold text-primary">Periodo seleccionado:</span>{' '}
                <span className="text-muted-foreground">
                  {new Date(fechaInicio).toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {' '}-{' '}
                  {new Date(fechaFin).toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Producción Total"
          value={`${datosCalculados.kgTotal.toLocaleString('es-CO')} kg`}
          icon={Package}
          trend="up"
          trendValue={datosCalculados.tendenciaProduccion}
        />
        <KPICard
          title="Ingresos Estimados"
          value={`$${(datosCalculados.kgTotal * 850).toLocaleString('es-CO')}`}
          icon={DollarSign}
          trend="up"
          trendValue={datosCalculados.tendenciaIngresos}
        />
        <KPICard
          title="Promedio kg/gajo"
          value={datosCalculados.promedioKgGajo.toFixed(2)}
          icon={BarChart3}
          trend="stable"
          trendValue="0%"
        />
        <KPICard
          title="Colaboradores Activos"
          value={productividadColaboradores.length.toString()}
          icon={Users}
          trend="up"
          trendValue="+3"
        />
      </div>

      {/* SECCIÓN 1: PRODUCTIVIDAD DE COLABORADORES */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6 text-primary" />
                Productividad de Colaboradores
              </CardTitle>
              <CardDescription className="mt-2">
                Registro diario, asignación por lote, rendimiento individual y alertas de baja productividad
              </CardDescription>
            </div>
            <Button onClick={() => setModalProductividad(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Ver Detalles
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Promedio Producción</p>
              <p className="text-2xl font-bold text-success">257 kg/día</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Rendimiento General</p>
              <p className="text-2xl font-bold text-primary">17.9 kg/gajo</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">Total Colaboradores</p>
              <p className="text-2xl font-bold text-info">{productividadColaboradores.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Alertas Baja
              </p>
              <p className="text-2xl font-bold text-warning">1</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosCalculados.colaboradoresTop} layout="vertical">
              <CartesianGrid key="grid-colab" strokeDasharray="3 3" opacity={0.3} />
              <XAxis key="xaxis-colab" type="number" />
              <YAxis key="yaxis-colab" dataKey="nombre" type="category" width={120} />
              <Tooltip 
                key="tooltip-colab"
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar key="bar-colab" dataKey="gajos" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SECCIÓN 2: PRODUCCIÓN POR LOTES */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sprout className="h-6 w-6 text-success" />
                Producción por Lotes
              </CardTitle>
              <CardDescription className="mt-2">
                Promedio kg/gajos, producción diaria, estado actual, trabajos realizados y seguimiento de metas
              </CardDescription>
            </div>
            <Button onClick={() => setModalLotes(true)} className="gap-2 bg-success hover:bg-success/90">
              <Eye className="h-4 w-4" />
              Ver Detalles
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Producción Total/Día</p>
              <p className="text-2xl font-bold text-success">59,000 kg</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Promedio kg/gajo</p>
              <p className="text-2xl font-bold text-primary">18.1</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">Lotes Activos</p>
              <p className="text-2xl font-bold text-info">4</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-1">Área Total</p>
              <p className="text-2xl font-bold text-accent">47.2 ha</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosCalculados.promediosLote}>
                <CartesianGrid key="grid-lote" strokeDasharray="3 3" opacity={0.3} />
                <XAxis key="xaxis-lote" dataKey="lote" />
                <YAxis key="yaxis-lote" />
                <Tooltip 
                  key="tooltip-lote"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar key="bar-lote" dataKey="promedio" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {datosCalculados.promediosLote.map((lote, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{lote.lote}</p>
                    <span className="text-2xl font-bold text-success">{lote.promedio} kg/gajo</span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Área: {lote.area} ha</span>
                    <span>Palmas: {lote.palmas.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 3: PRODUCTIVIDAD Y PRECIOS DE COSECHA */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Productividad de Cosecha
                </CardTitle>
                <CardDescription>Producción por periodo seleccionado</CardDescription>
              </div>
              <Button onClick={() => setModalPrecios(true)} size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Detalles
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={datosCalculados.produccionData}>
                <defs>
                  <linearGradient id="dashboard-gradient-kg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid-kg" strokeDasharray="3 3" opacity={0.3} />
                <XAxis key="xaxis-kg" dataKey="mes" />
                <YAxis key="yaxis-kg" />
                <Tooltip 
                  key="tooltip-kg"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area key="area-kg" type="monotone" dataKey="kg" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#dashboard-gradient-kg)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  Precios por Lote
                </CardTitle>
                <CardDescription>Valor actual por kilogramo</CardDescription>
              </div>
              <Button onClick={() => setModalPrecios(true)} size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Detalles
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {preciosCosechaData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/30">
                  <div>
                    <p className="font-medium">{item.lote}</p>
                    <p className="text-2xl font-bold text-success">${item.precio}</p>
                  </div>
                  {item.tendencia === 'up' && <TrendingUp className="h-5 w-5 text-success" />}
                  {item.tendencia === 'down' && <TrendingDown className="h-5 w-5 text-destructive" />}
                  {item.tendencia === 'stable' && <BarChart3 className="h-5 w-5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 4: NÓMINA */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <DollarSign className="h-6 w-6 text-success" />
                Gestión de Nómina
              </CardTitle>
              <CardDescription className="mt-2">
                Total diaria, quincenal, mensual, bonificaciones, descuentos, horas extras e historial de pagos
              </CardDescription>
            </div>
            <Button onClick={() => setModalNomina(true)} className="gap-2 bg-success hover:bg-success/90">
              <Eye className="h-4 w-4" />
              Ver Detalles
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Diaria</p>
              <p className="text-xl font-bold text-success">${(datosCalculados.nominaDiaria / 1000000).toFixed(1)}M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Quincenal</p>
              <p className="text-xl font-bold text-primary">${(datosCalculados.nominaQuincenal / 1000000).toFixed(1)}M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Mensual</p>
              <p className="text-xl font-bold text-info">${(datosCalculados.nominaMensual / 1000000).toFixed(1)}M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Bonificaciones
              </p>
              <p className="text-xl font-bold text-accent">${(datosCalculados.bonificaciones / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Descuentos
              </p>
              <p className="text-xl font-bold text-warning">${(datosCalculados.descuentos / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Horas Extras
              </p>
              <p className="text-xl font-bold text-primary">{datosCalculados.horasExtras}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 5: Estadísticas y Comparativos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Estadísticas Generales
            </CardTitle>
            <CardDescription>Distribución de producción por lote</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  key="pie-lotes"
                  data={datosCalculados.promediosLote}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.lote}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="palmas"
                >
                  {datosCalculados.promediosLote.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  key="tooltip-pie"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/metricas/estadisticas-generales">
                  Ver estadísticas completas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Comparativos Históricos
            </CardTitle>
            <CardDescription>Año actual vs año anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparativosHistoricosData}>
                <CartesianGrid key="grid-hist" strokeDasharray="3 3" opacity={0.3} />
                <XAxis key="xaxis-hist" dataKey="mes" />
                <YAxis key="yaxis-hist" />
                <Tooltip 
                  key="tooltip-hist"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend key="legend-hist" />
                <Line key="line-2025" type="monotone" dataKey="2025" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line key="line-2026" type="monotone" dataKey="2026" stroke="hsl(var(--chart-1))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/metricas/comparativos-historicos">
                  Ver análisis completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos a Métricas Detalladas */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Acceso a Métricas Detalladas</CardTitle>
          <CardDescription>Explora análisis profundos y reportes avanzados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/metricas/productividad-colaboradores">
                <Users className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Productividad</span>
                <span className="text-xs text-muted-foreground">Colaboradores</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/metricas/precios-cosecha">
                <DollarSign className="mb-2 h-5 w-5 text-success" />
                <span className="font-semibold">Precios</span>
                <span className="text-xs text-muted-foreground">Cosecha</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/metricas/promedios-lote">
                <Sprout className="mb-2 h-5 w-5 text-success" />
                <span className="font-semibold">Promedios</span>
                <span className="text-xs text-muted-foreground">Por Lote</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/metricas/estadisticas-generales">
                <BarChart3 className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Estadísticas</span>
                <span className="text-xs text-muted-foreground">Generales</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/metricas/comparativos-historicos">
                <Calendar className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Comparativos</span>
                <span className="text-xs text-muted-foreground">Históricos</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}