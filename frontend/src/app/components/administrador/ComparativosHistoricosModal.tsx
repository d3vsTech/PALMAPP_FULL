import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ComparativosHistoricosModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
}

// Datos mock de comparativos semanales
const comparativoSemanalData = [
  { semana: 'Sem 1', actual: 98400, anterior: 92300, variacion: 6.6 },
  { semana: 'Sem 2', actual: 102300, anterior: 95800, variacion: 6.8 },
  { semana: 'Sem 3', actual: 95800, anterior: 98400, variacion: -2.6 },
  { semana: 'Sem 4', actual: 108200, anterior: 102300, variacion: 5.8 },
];

// Datos mock de comparativos mensuales
const comparativoMensualData = [
  { mes: 'Ene', actual: 387000, anterior: 362000, variacion: 6.9 },
  { mes: 'Feb', actual: 392500, anterior: 375000, variacion: 4.7 },
  { mes: 'Mar', actual: 404700, anterior: 387000, variacion: 4.6 },
];

// Evolución de rendimiento por trabajador
const evolucionRendimientoData = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    semana1: 285,
    semana2: 290,
    semana3: 295,
    semana4: 310,
    tendencia: 'up',
    mejora: 8.8,
  },
  {
    id: 2,
    nombre: 'María García',
    semana1: 310,
    semana2: 305,
    semana3: 315,
    semana4: 320,
    tendencia: 'up',
    mejora: 3.2,
  },
  {
    id: 3,
    nombre: 'Carlos Rodríguez',
    semana1: 220,
    semana2: 225,
    semana3: 215,
    semana4: 220,
    tendencia: 'stable',
    mejora: 0,
  },
  {
    id: 4,
    nombre: 'Ana López',
    semana1: 195,
    semana2: 185,
    semana3: 180,
    semana4: 175,
    tendencia: 'down',
    mejora: -10.3,
  },
];

// Variación de costos operativos
const variacionCostosData = [
  { categoria: 'Nómina', mesActual: 10890000, mesAnterior: 10200000, variacion: 6.8 },
  { categoria: 'Insumos', mesActual: 3500000, mesAnterior: 3200000, variacion: 9.4 },
  { categoria: 'Mantenimiento', mesActual: 1800000, mesAnterior: 2100000, variacion: -14.3 },
  { categoria: 'Transporte', mesActual: 2200000, mesAnterior: 2000000, variacion: 10.0 },
  { categoria: 'Servicios', mesActual: 1500000, mesAnterior: 1450000, variacion: 3.4 },
];

// Histórico para gráfica
const historicoProduccionData = [
  { periodo: 'Ene', '2025': 362000, '2026': 387000 },
  { periodo: 'Feb', '2025': 375000, '2026': 392500 },
  { periodo: 'Mar', '2025': 387000, '2026': 404700 },
];

export function ComparativosHistoricosModal({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
}: ComparativosHistoricosModalProps) {
  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (tendencia === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <div className="h-1 w-4 bg-muted-foreground rounded" />;
  };

  const getVariacionBadge = (variacion: number) => {
    if (variacion > 0) {
      return <Badge className="bg-success hover:bg-success/90">+{variacion.toFixed(1)}%</Badge>;
    }
    if (variacion < 0) {
      return <Badge variant="destructive">{variacion.toFixed(1)}%</Badge>;
    }
    return <Badge variant="secondary">0%</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Comparativos Históricos
          </DialogTitle>
          <DialogDescription>
            Análisis comparativo de semanas, meses, evolución de rendimiento y variación de costos operativos
          </DialogDescription>
        </DialogHeader>

        {/* Filtros y período */}
        <div className="space-y-4 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Periodo:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(fechaInicio).toLocaleDateString('es-CO')} - {new Date(fechaFin).toLocaleDateString('es-CO')}
            </span>
          </div>
        </div>

        {/* Tabs para diferentes vistas */}
        <Tabs defaultValue="semanal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="semanal">Comparativo Semanal</TabsTrigger>
            <TabsTrigger value="mensual">Comparativo Mensual</TabsTrigger>
            <TabsTrigger value="rendimiento">Evolución Rendimiento</TabsTrigger>
            <TabsTrigger value="costos">Costos Operativos</TabsTrigger>
          </TabsList>

          {/* Comparativo Semanal */}
          <TabsContent value="semanal" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Promedio Actual</p>
                <p className="text-2xl font-bold text-success">101,175 kg</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Promedio Anterior</p>
                <p className="text-2xl font-bold text-primary">97,200 kg</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
                <p className="text-xs text-muted-foreground mb-1">Mejor Semana</p>
                <p className="text-2xl font-bold text-info">Sem 4</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <p className="text-xs text-muted-foreground mb-1">Variación Promedio</p>
                <p className="text-2xl font-bold text-accent">+4.2%</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h4 className="font-semibold mb-4">Comparativa Semanal</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparativoSemanalData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString('es-CO')} kg`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="actual" fill="hsl(var(--chart-1))" name="Semana Actual" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="anterior" fill="hsl(var(--chart-2))" name="Semana Anterior" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Semana</TableHead>
                    <TableHead className="text-right">Producción Actual</TableHead>
                    <TableHead className="text-right">Producción Anterior</TableHead>
                    <TableHead className="text-center">Variación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoSemanalData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.semana}</TableCell>
                      <TableCell className="text-right text-xl font-bold text-success">
                        {item.actual.toLocaleString('es-CO')} kg
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.anterior.toLocaleString('es-CO')} kg
                      </TableCell>
                      <TableCell className="text-center">{getVariacionBadge(item.variacion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Comparativo Mensual */}
          <TabsContent value="mensual" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Producción Actual</p>
                <p className="text-2xl font-bold text-success">1,184,200 kg</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Producción Anterior</p>
                <p className="text-2xl font-bold text-primary">1,124,000 kg</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <p className="text-xs text-muted-foreground mb-1">Crecimiento</p>
                <p className="text-2xl font-bold text-accent">+5.4%</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h4 className="font-semibold mb-4">Evolución Mensual Comparativa</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicoProduccionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString('es-CO')} kg`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="2025" stroke="hsl(var(--chart-2))" strokeWidth={2} name="2025" />
                  <Line type="monotone" dataKey="2026" stroke="hsl(var(--chart-1))" strokeWidth={3} name="2026" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">2026 (Actual)</TableHead>
                    <TableHead className="text-right">2025 (Anterior)</TableHead>
                    <TableHead className="text-center">Variación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoMensualData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.mes}</TableCell>
                      <TableCell className="text-right text-xl font-bold text-success">
                        {item.actual.toLocaleString('es-CO')} kg
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.anterior.toLocaleString('es-CO')} kg
                      </TableCell>
                      <TableCell className="text-center">{getVariacionBadge(item.variacion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Evolución de Rendimiento por Trabajador */}
          <TabsContent value="rendimiento" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> En Mejora
                </p>
                <p className="text-2xl font-bold text-success">2</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> En Declive
                </p>
                <p className="text-2xl font-bold text-warning">1</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Estables</p>
                <p className="text-2xl font-bold text-primary">1</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
                <p className="text-xs text-muted-foreground mb-1">Mejor Rendimiento</p>
                <p className="text-2xl font-bold text-info">María G.</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Semana 1</TableHead>
                    <TableHead className="text-right">Semana 2</TableHead>
                    <TableHead className="text-right">Semana 3</TableHead>
                    <TableHead className="text-right">Semana 4</TableHead>
                    <TableHead className="text-center">Tendencia</TableHead>
                    <TableHead className="text-center">Mejora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolucionRendimientoData.map((trabajador) => (
                    <TableRow key={trabajador.id}>
                      <TableCell className="font-medium">{trabajador.nombre}</TableCell>
                      <TableCell className="text-right">{trabajador.semana1} kg</TableCell>
                      <TableCell className="text-right">{trabajador.semana2} kg</TableCell>
                      <TableCell className="text-right">{trabajador.semana3} kg</TableCell>
                      <TableCell className="text-right font-bold text-success">{trabajador.semana4} kg</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">{getTendenciaIcon(trabajador.tendencia)}</div>
                      </TableCell>
                      <TableCell className="text-center">{getVariacionBadge(trabajador.mejora)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Variación de Costos Operativos */}
          <TabsContent value="costos" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Costos Mes Actual</p>
                <p className="text-2xl font-bold text-success">$19.9M</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Costos Mes Anterior</p>
                <p className="text-2xl font-bold text-primary">$18.9M</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                <p className="text-xs text-muted-foreground mb-1">Variación Total</p>
                <p className="text-2xl font-bold text-warning">+5.0%</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h4 className="font-semibold mb-4">Distribución de Costos por Categoría</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={variacionCostosData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis dataKey="categoria" type="category" width={120} />
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mesActual" fill="hsl(var(--chart-1))" name="Mes Actual" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="mesAnterior" fill="hsl(var(--chart-3))" name="Mes Anterior" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Mes Actual</TableHead>
                    <TableHead className="text-right">Mes Anterior</TableHead>
                    <TableHead className="text-center">Variación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacionCostosData.map((costo, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {costo.categoria}
                      </TableCell>
                      <TableCell className="text-right text-xl font-bold text-success">
                        ${(costo.mesActual / 1000000).toFixed(1)}M
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${(costo.mesAnterior / 1000000).toFixed(1)}M
                      </TableCell>
                      <TableCell className="text-center">{getVariacionBadge(costo.variacion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 rounded-lg bg-info/10 border border-info/20">
              <p className="text-sm text-muted-foreground">
                <strong>Análisis:</strong> El incremento en costos se debe principalmente al aumento en insumos (+9.4%) y 
                transporte (+10%). Sin embargo, se logró una reducción significativa en mantenimiento (-14.3%).
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="bg-success hover:bg-success/90">
            Exportar Reporte Completo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
