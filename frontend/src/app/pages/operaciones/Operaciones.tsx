import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Plus, Eye, FileText, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';

const planillasData = [
  { id: 'p1', fecha: '2026-03-09', estado: 'BORRADOR' as const, totalColaboradores: 8, totalJornales: 693328 },
  { id: 'p2', fecha: '2026-03-08', estado: 'APROBADO' as const, totalColaboradores: 10, totalJornales: 866660 },
  { id: 'p3', fecha: '2026-03-07', estado: 'APROBADO' as const, totalColaboradores: 9, totalJornales: 779994 },
  { id: 'p4', fecha: '2026-03-06', estado: 'APROBADO' as const, totalColaboradores: 8, totalJornales: 693328 },
];

export default function Operaciones() {
  const navigate = useNavigate();

  // Filtro de período para KPIs
  const [periodoKPI, setPeriodoKPI] = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>('mensual');
  const [fechaInicioKPI, setFechaInicioKPI] = useState('');
  const [fechaFinKPI, setFechaFinKPI] = useState('');

  // Función para obtener rango de fechas según el período
  const obtenerRangoFechas = () => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date = hoy;

    switch (periodoKPI) {
      case 'semanal':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 7);
        break;
      case 'quincenal':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 15);
        break;
      case 'mensual':
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'personalizado':
        if (fechaInicioKPI && fechaFinKPI) {
          inicio = new Date(fechaInicioKPI);
          fin = new Date(fechaFinKPI);
        } else {
          inicio = new Date(hoy);
          inicio.setMonth(hoy.getMonth() - 1);
        }
        break;
      default:
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
    }

    return { inicio, fin };
  };

  // Filtrar planillas según período para KPIs
  const { inicio, fin } = obtenerRangoFechas();
  const planillasFiltradas = planillasData.filter((planilla) => {
    const fechaPlanilla = new Date(planilla.fecha);
    return fechaPlanilla >= inicio && fechaPlanilla <= fin;
  });

  const totalBorradores = planillasFiltradas.filter(p => p.estado === 'BORRADOR').length;
  const totalAprobadas = planillasFiltradas.filter(p => p.estado === 'APROBADO').length;

  return (
    <div className="space-y-8">
      {/* Header con botones - mismo estilo que Mi Plantación */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Operaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las labores diarias, planillas de cosecha y jornales
          </p>
        </div>
        <Button 
          onClick={() => navigate('/operaciones/planilla/nueva')} 
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" />
          Nueva Planilla del Día
        </Button>
      </div>

      {/* KPIs - mismo estilo que Mi Plantación */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Indicadores Principales</h2>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Período:</Label>
            <Select value={periodoKPI} onValueChange={(value: any) => setPeriodoKPI(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodoKPI === 'personalizado' && (
              <>
                <Input
                  type="date"
                  value={fechaInicioKPI}
                  onChange={(e) => setFechaInicioKPI(e.target.value)}
                  className="w-40"
                  placeholder="Fecha inicio"
                />
                <Input
                  type="date"
                  value={fechaFinKPI}
                  onChange={(e) => setFechaFinKPI(e.target.value)}
                  className="w-40"
                  placeholder="Fecha fin"
                />
              </>
            )}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Planillas en Borrador</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{totalBorradores}</p>
                    <span className="text-sm text-muted-foreground">pendientes</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/30">
                    <Clock className="h-4 w-4" />
                    <span>Pendientes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Planillas Aprobadas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{totalAprobadas}</p>
                    <span className="text-sm text-muted-foreground">completadas</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                    <CheckCircle className="h-4 w-4" />
                    <span>Cerradas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-border hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Planillas</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{planillasFiltradas.length}</p>
                    <span className="text-sm text-muted-foreground">registros</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                    <FileText className="h-4 w-4" />
                    <span>Período seleccionado</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de planillas - Diseño mejorado */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Planillas Recientes</h2>
          <p className="text-muted-foreground">Registro de operaciones diarias por fecha</p>
        </div>

        {planillasData.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay planillas registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza creando tu primera planilla del día
              </p>
              <Button onClick={() => navigate('/operaciones/planilla/nueva')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Planilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Colaboradores</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Total Jornales</th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planillasData.map((planilla, index) => (
                      <tr
                        key={planilla.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                      >
                        <td className="p-4">
                          <span className="text-sm font-medium text-foreground">
                            {new Date(planilla.fecha).toLocaleDateString('es-CO', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={planilla.estado} />
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {planilla.totalColaboradores}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-success">
                            ${planilla.totalJornales.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                              title="Visualizar"
                            >
                              <Link to={`/operaciones/planilla/${planilla.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}