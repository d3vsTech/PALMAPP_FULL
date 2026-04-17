import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
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
  Activity,
} from 'lucide-react';
import { kpisDashboard, productividadColaboradores } from '../../lib/mockData';
import { ProductividadColaboradoresModal } from '../../components/dueno/ProductividadColaboradoresModal';
import { ProduccionPorLoteModal } from '../../components/dueno/ProduccionPorLoteModal';
import { PreciosCosechaModal } from '../../components/dueno/PreciosCosechaModal';
import { NominaAdministradorModal } from '../../components/administrador/NominaAdministradorModal';
import { ComparativosHistoricosModal } from '../../components/administrador/ComparativosHistoricosModal';

// Datos mock para gráficas del Administrador
const produccionMensualData = [
  { mes: 'Ene', kg: 387000, ingreso: 328950000 },
  { mes: 'Feb', kg: 392500, ingreso: 333625000 },
  { mes: 'Mar', kg: 404700, ingreso: 343995000 },
  { mes: 'Abr', kg: 398200, ingreso: 338470000 },
  { mes: 'May', kg: 415600, ingreso: 353260000 },
  { mes: 'Jun', kg: 408900, ingreso: 347565000 },
];

const colaboradoresTopData = productividadColaboradores.slice(0, 8).map(c => ({
  nombre: c.colaborador,
  kg: c.kg,
  gajos: c.gajos,
  promedio: c.rendimiento,
}));

const preciosCosechaData = [
  { lote: 'Lote 1 Norte', precio: 850, tendencia: 'up' },
  { lote: 'Lote 2 Sur', precio: 850, tendencia: 'stable' },
  { lote: 'Lote 3 Este', precio: 820, tendencia: 'down' },
  { lote: 'Lote 4 Oeste', precio: 865, tendencia: 'up' },
];

const promediosLoteData = [
  { lote: 'Lote 1', promedio: 18.5, area: 12.5, palmas: 2340 },
  { lote: 'Lote 2', promedio: 17.8, area: 10.2, palmas: 1890 },
  { lote: 'Lote 3', promedio: 19.2, area: 15.8, palmas: 2980 },
  { lote: 'Lote 4', promedio: 16.9, area: 8.7, palmas: 1650 },
];

const comparativosHistoricosData = [
  { mes: 'Ene', '2025': 387000, '2026': 404700 },
  { mes: 'Feb', '2025': 392500, '2026': 415600 },
  { mes: 'Mar', '2025': 404700, '2026': 428300 },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

// Dashboard para Administrador
export default function DashboardAdministrador() {
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
  const [modalComparativos, setModalComparativos] = useState(false);

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
      <NominaAdministradorModal
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
      <ComparativosHistoricosModal
        isOpen={modalComparativos}
        onClose={() => setModalComparativos(false)}
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
            <span className="text-sm font-semibold text-primary">Dashboard Administrador</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text">
            Gestión Integral de la Finca
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Finca Puerto Arturo • Control total de operaciones
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
              <Label className="text-sm font-medium mb-2 block">Periodos Predefinidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodoPreset === 'hoy' ? 'default' : 'outline'}
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
                <Label htmlFor="fecha-inicio" className="text-sm font-medium">
                  Fecha de Inicio
                </Label>
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
                <Label htmlFor="fecha-fin" className="text-sm font-medium">
                  Fecha de Fin
                </Label>
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
          value={`${kpisDashboard.kgTotal.toLocaleString('es-CO')} kg`}
          icon={Package}
          trend="up"
          trendValue="+12.5%"
        />
        <KPICard
          title="Ingresos Estimados"
          value={`$${(kpisDashboard.kgTotal * 850).toLocaleString('es-CO')}`}
          icon={DollarSign}
          trend="up"
          trendValue="+15.2%"
        />
        <KPICard
          title="Promedio kg/gajo"
          value={kpisDashboard.promedioKgGajo.toFixed(2)}
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
            <BarChart data={colaboradoresTopData} layout="vertical">
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
              <BarChart data={promediosLoteData}>
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
              {promediosLoteData.map((lote, idx) => (
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
              <AreaChart data={produccionMensualData}>
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
                Total diaria, semanal, quincenal, mensual, bonificaciones, descuentos, horas extras e historial
              </CardDescription>
            </div>
            <Button onClick={() => setModalNomina(true)} className="gap-2 bg-success hover:bg-success/90">
              <Eye className="h-4 w-4" />
              Ver Detalles
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Diaria</p>
              <p className="text-xl font-bold text-success">$1.9M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Semanal</p>
              <p className="text-xl font-bold text-info">$13.4M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Quincenal</p>
              <p className="text-xl font-bold text-primary">$5.4M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">Nómina Mensual</p>
              <p className="text-xl font-bold text-info">$10.9M</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Bonificaciones
              </p>
              <p className="text-xl font-bold text-accent">$90K</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Descuentos
              </p>
              <p className="text-xl font-bold text-warning">$23K</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Horas Extras
              </p>
              <p className="text-xl font-bold text-primary">6h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 5: COMPARATIVOS HISTÓRICOS (Ampliado para Administrador) */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Activity className="h-6 w-6 text-primary" />
                Comparativos Históricos
              </CardTitle>
              <CardDescription className="mt-2">
                Análisis comparativo de semanas, meses, evolución de rendimiento y variación de costos operativos
              </CardDescription>
            </div>
            <Button onClick={() => setModalComparativos(true)} className="gap-2 bg-primary hover:bg-primary/90">
              <Eye className="h-4 w-4" />
              Ver Análisis Completo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Crecimiento Semanal</p>
              <p className="text-2xl font-bold text-success">+4.2%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Crecimiento Mensual</p>
              <p className="text-2xl font-bold text-primary">+5.4%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Rendimiento en Mejora
              </p>
              <p className="text-2xl font-bold text-info">2</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground mb-1">Variación Costos</p>
              <p className="text-2xl font-bold text-warning">+5.0%</p>
            </div>
          </div>
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
        </CardContent>
      </Card>

      {/* Sección 6: Estadísticas Generales */}
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
                data={promediosLoteData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.lote}
                outerRadius={100}
                fill="#8884d8"
                dataKey="palmas"
              >
                {promediosLoteData.map((entry, index) => (
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

      {/* Accesos Rápidos a Módulos */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Acceso Rápido a Módulos</CardTitle>
          <CardDescription>Gestiona todas las operaciones de la finca</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/plantacion">
                <Sprout className="mb-2 h-5 w-5 text-success" />
                <span className="font-semibold">Mi Plantación</span>
                <span className="text-xs text-muted-foreground">Lotes y palmas</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/colaboradores">
                <Users className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Colaboradores</span>
                <span className="text-xs text-muted-foreground">Gestión de personal</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/nomina">
                <DollarSign className="mb-2 h-5 w-5 text-success" />
                <span className="font-semibold">Nómina</span>
                <span className="text-xs text-muted-foreground">Pagos y liquidaciones</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/operaciones">
                <BarChart3 className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Operaciones</span>
                <span className="text-xs text-muted-foreground">Planillas diarias</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4">
              <Link to="/configuracion">
                <Calendar className="mb-2 h-5 w-5 text-primary" />
                <span className="font-semibold">Configuración</span>
                <span className="text-xs text-muted-foreground">Ajustes del sistema</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}