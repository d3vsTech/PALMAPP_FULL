import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
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

  const totalBorradores = planillasData.filter(p => p.estado === 'BORRADOR').length;
  const totalAprobadas = planillasData.filter(p => p.estado === 'APROBADO').length;

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
        <h2 className="text-2xl font-bold text-foreground mb-4">Indicadores Principales</h2>
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
                    <span>Por aprobar</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
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
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
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
                    <p className="text-3xl font-bold text-foreground">{planillasData.length}</p>
                    <span className="text-sm text-muted-foreground">registros</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                    <FileText className="h-4 w-4" />
                    <span>Este mes</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
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

        <Card className="glass-subtle border-border">
          <CardContent className="pt-6">{planillasData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
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
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Colaboradores</TableHead>
                    <TableHead className="text-right">Total Jornales</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planillasData.map((planilla) => (
                    <TableRow key={planilla.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {new Date(planilla.fecha).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={planilla.estado} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {planilla.totalColaboradores}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        ${planilla.totalJornales.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/operaciones/planilla/${planilla.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}