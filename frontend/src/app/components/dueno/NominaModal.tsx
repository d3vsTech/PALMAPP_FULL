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
import { Search, Calendar, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface NominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
}

// Datos mock de nómina
const nominaDiariaData = [
  { fecha: '01/03', total: 1850000 },
  { fecha: '02/03', total: 1920000 },
  { fecha: '03/03', total: 1785000 },
  { fecha: '04/03', total: 2010000 },
  { fecha: '05/03', total: 1950000 },
  { fecha: '06/03', total: 2100000 },
  { fecha: '07/03', total: 1890000 },
];

const colaboradoresNominaData = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    cedula: '1234567890',
    salarioDiario: 85000,
    bonificaciones: 25000,
    descuentos: 5000,
    horasExtras: 2,
    totalQuincenal: 1425000,
    totalMensual: 2850000,
  },
  {
    id: 2,
    nombre: 'María García',
    cedula: '9876543210',
    salarioDiario: 90000,
    bonificaciones: 30000,
    descuentos: 0,
    horasExtras: 3,
    totalQuincenal: 1575000,
    totalMensual: 3150000,
  },
  {
    id: 3,
    nombre: 'Carlos Rodríguez',
    cedula: '4567891230',
    salarioDiario: 80000,
    bonificaciones: 20000,
    descuentos: 10000,
    horasExtras: 1,
    totalQuincenal: 1290000,
    totalMensual: 2580000,
  },
  {
    id: 4,
    nombre: 'Ana López',
    cedula: '7891234560',
    salarioDiario: 78000,
    bonificaciones: 15000,
    descuentos: 8000,
    horasExtras: 0,
    totalQuincenal: 1155000,
    totalMensual: 2310000,
  },
];

const historialPagosData = [
  { quincena: 'Q1 Mar', total: 5445000, estado: 'Pagado' },
  { quincena: 'Q2 Mar', total: 5445000, estado: 'Pendiente' },
  { quincena: 'Q1 Feb', total: 5280000, estado: 'Pagado' },
  { quincena: 'Q2 Feb', total: 5280000, estado: 'Pagado' },
];

export function NominaModal({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
}: NominaModalProps) {
  const [busqueda, setBusqueda] = useState('');

  const colaboradoresFiltrados = colaboradoresNominaData.filter((col) =>
    col.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    col.cedula.includes(busqueda)
  );

  const totalNominaDiaria = nominaDiariaData.reduce((acc, d) => acc + d.total, 0) / nominaDiariaData.length;
  const totalNominaQuincenal = colaboradoresNominaData.reduce((acc, c) => acc + c.totalQuincenal, 0);
  const totalNominaMensual = colaboradoresNominaData.reduce((acc, c) => acc + c.totalMensual, 0);
  const totalBonificaciones = colaboradoresNominaData.reduce((acc, c) => acc + c.bonificaciones, 0);
  const totalDescuentos = colaboradoresNominaData.reduce((acc, c) => acc + c.descuentos, 0);
  const totalHorasExtras = colaboradoresNominaData.reduce((acc, c) => acc + c.horasExtras, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-success" />
            Gestión de Nómina
          </DialogTitle>
          <DialogDescription>
            Control completo de nómina diaria, quincenal, mensual, bonificaciones, descuentos y horas extras
          </DialogDescription>
        </DialogHeader>

        {/* Filtros y búsqueda */}
        <div className="space-y-4 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Periodo:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(fechaInicio).toLocaleDateString('es-CO')} - {new Date(fechaFin).toLocaleDateString('es-CO')}
            </span>
          </div>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Nómina Diaria</p>
            <p className="text-lg font-bold text-success">${Math.round(totalNominaDiaria / 1000)}K</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Nómina Quincenal</p>
            <p className="text-lg font-bold text-primary">${Math.round(totalNominaQuincenal / 1000)}K</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
            <p className="text-xs text-muted-foreground mb-1">Nómina Mensual</p>
            <p className="text-lg font-bold text-info">${Math.round(totalNominaMensual / 1000)}K</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
            <p className="text-xs text-muted-foreground mb-1">Bonificaciones</p>
            <p className="text-lg font-bold text-accent flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              ${Math.round(totalBonificaciones / 1000)}K
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
            <p className="text-xs text-muted-foreground mb-1">Descuentos</p>
            <p className="text-lg font-bold text-warning flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              ${Math.round(totalDescuentos / 1000)}K
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Horas Extras</p>
            <p className="text-lg font-bold text-primary flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalHorasExtras}h
            </p>
          </div>
        </div>

        {/* Tabs para diferentes vistas */}
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="colaboradores">Por Colaborador</TabsTrigger>
            <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-4 space-y-4">
            <div className="border rounded-lg p-4 bg-card">
              <h4 className="font-semibold mb-4">Evolución Nómina Diaria</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={nominaDiariaData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--success))" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-card">
                <h4 className="font-semibold mb-4">Distribución de Nómina</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <span className="text-sm font-medium">Salarios Base</span>
                    <span className="text-lg font-bold text-success">$4,890K</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                    <span className="text-sm font-medium">Bonificaciones</span>
                    <span className="text-lg font-bold text-accent">$90K</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <span className="text-sm font-medium">Horas Extras</span>
                    <span className="text-lg font-bold text-primary">$180K</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                    <span className="text-sm font-medium">Descuentos</span>
                    <span className="text-lg font-bold text-warning">-$23K</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <h4 className="font-semibold mb-4">Resumen por Periodo</h4>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-success/20 to-success/10 border border-success/30">
                    <p className="text-sm text-muted-foreground mb-1">Promedio Diario</p>
                    <p className="text-3xl font-bold text-success">${Math.round(totalNominaDiaria).toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30">
                    <p className="text-sm text-muted-foreground mb-1">Total Quincenal</p>
                    <p className="text-3xl font-bold text-primary">${totalNominaQuincenal.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-info/20 to-info/10 border border-info/30">
                    <p className="text-sm text-muted-foreground mb-1">Total Mensual</p>
                    <p className="text-3xl font-bold text-info">${totalNominaMensual.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="colaboradores" className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Salario Diario</TableHead>
                    <TableHead className="text-right">Bonificaciones</TableHead>
                    <TableHead className="text-right">Descuentos</TableHead>
                    <TableHead className="text-right">Horas Extras</TableHead>
                    <TableHead className="text-right">Total Quincenal</TableHead>
                    <TableHead className="text-right">Total Mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradoresFiltrados.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{colaborador.nombre}</p>
                          <p className="text-xs text-muted-foreground">{colaborador.cedula}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">${colaborador.salarioDiario.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-accent font-semibold">+${colaborador.bonificaciones.toLocaleString('es-CO')}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-warning font-semibold">-${colaborador.descuentos.toLocaleString('es-CO')}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{colaborador.horasExtras}h</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-bold text-primary">${colaborador.totalQuincenal.toLocaleString('es-CO')}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-bold text-success">${colaborador.totalMensual.toLocaleString('es-CO')}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Total Pagado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialPagosData.map((pago, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{pago.quincena}</TableCell>
                      <TableCell className="text-right text-xl font-bold text-success">
                        ${pago.total.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell>
                        {pago.estado === 'Pagado' ? (
                          <Badge className="bg-success hover:bg-success/90">Pagado</Badge>
                        ) : (
                          <Badge className="bg-warning hover:bg-warning/90">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Ver Detalle</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="bg-success hover:bg-success/90">
            Exportar Reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
