import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import KPICard from '../../components/common/KPICard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
} from 'lucide-react';
import { kpisDashboard, productividadColaboradores } from '../../lib/mockData';

// Datos para gráficas
const produccionSemanalData = [
  { dia: 'Lun', kg: 8500 },
  { dia: 'Mar', kg: 9200 },
  { dia: 'Mié', kg: 8800 },
  { dia: 'Jue', kg: 9500 },
  { dia: 'Vie', kg: 9100 },
  { dia: 'Sáb', kg: 8700 },
];

// Dashboard estándar para Jefe de Campo y otros roles
export default function DashboardOtrosRoles() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-3xl border border-primary/30 p-10 shadow-2xl shadow-primary/10">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-3xl" />
        
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/30 px-4 py-2 shadow-lg shadow-primary/20">
            <div className="relative h-2.5 w-2.5">
              <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary blur-sm animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-primary">Dashboard Principal</span>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text">
            Bienvenido a AGRO CAMPO
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Finca Puerto Arturo • Sistema de Gestión Agrícola
          </p>
        </div>
      </div>

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

      {/* Producción Semanal */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Producción de esta Semana
          </CardTitle>
          <CardDescription>Kilogramos recolectados por día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={produccionSemanalData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="kg" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Acceso a Módulos */}
      <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Módulos del Sistema</CardTitle>
          <CardDescription>Accede a las diferentes funcionalidades</CardDescription>
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

      {/* Información de Contacto o Ayuda */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            ¿Necesitas ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Si tienes alguna pregunta o necesitas asistencia, contacta al administrador del sistema.
          </p>
          <Button className="bg-primary hover:bg-primary/90">
            Contactar Soporte
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
