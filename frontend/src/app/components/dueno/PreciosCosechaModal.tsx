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
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Edit2, Save, X } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PreciosCosechaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
}

// Datos mock de precios por lote
const preciosPorLoteData = [
  {
    id: 1,
    lote: 'Lote 1 Norte',
    precioActual: 850,
    precioAnterior: 820,
    tendencia: 'up',
    variacion: 3.66,
    ultimaActualizacion: '2026-03-08',
  },
  {
    id: 2,
    lote: 'Lote 2 Sur',
    precioActual: 850,
    precioAnterior: 850,
    tendencia: 'stable',
    variacion: 0,
    ultimaActualizacion: '2026-03-07',
  },
  {
    id: 3,
    lote: 'Lote 3 Este',
    precioActual: 820,
    precioAnterior: 840,
    tendencia: 'down',
    variacion: -2.38,
    ultimaActualizacion: '2026-03-08',
  },
  {
    id: 4,
    lote: 'Lote 4 Oeste',
    precioActual: 865,
    precioAnterior: 850,
    tendencia: 'up',
    variacion: 1.76,
    ultimaActualizacion: '2026-03-09',
  },
];

// Histórico de precios
const historicoPreciosData = [
  { fecha: '01/03', lote1: 820, lote2: 850, lote3: 840, lote4: 850 },
  { fecha: '02/03', lote1: 825, lote2: 850, lote3: 835, lote4: 855 },
  { fecha: '03/03', lote1: 830, lote2: 850, lote3: 830, lote4: 860 },
  { fecha: '04/03', lote1: 835, lote2: 850, lote3: 825, lote4: 862 },
  { fecha: '05/03', lote1: 840, lote2: 850, lote3: 822, lote4: 863 },
  { fecha: '06/03', lote1: 845, lote2: 850, lote3: 820, lote4: 864 },
  { fecha: '07/03', lote1: 850, lote2: 850, lote3: 820, lote4: 865 },
];

export function PreciosCosechaModal({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
}: PreciosCosechaModalProps) {
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('');

  const handleEditarPrecio = (id: number, precioActual: number) => {
    setEditando(id);
    setNuevoPrecio(precioActual.toString());
  };

  const handleGuardarPrecio = () => {
    // Aquí se haría la llamada al backend para actualizar el precio
    setEditando(null);
    setNuevoPrecio('');
  };

  const handleCancelar = () => {
    setEditando(null);
    setNuevoPrecio('');
  };

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (tendencia === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <div className="h-4 w-4 rounded-full bg-muted-foreground" />;
  };

  const getTendenciaBadge = (variacion: number) => {
    if (variacion > 0) {
      return <Badge className="bg-success hover:bg-success/90">+{variacion.toFixed(2)}%</Badge>;
    }
    if (variacion < 0) {
      return <Badge variant="destructive">{variacion.toFixed(2)}%</Badge>;
    }
    return <Badge variant="secondary">0%</Badge>;
  };

  const precioPromedio = preciosPorLoteData.reduce((acc, p) => acc + p.precioActual, 0) / preciosPorLoteData.length;
  const totalSubida = preciosPorLoteData.filter(p => p.tendencia === 'up').length;
  const totalBajada = preciosPorLoteData.filter(p => p.tendencia === 'down').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-success" />
            Precios de Cosecha
          </DialogTitle>
          <DialogDescription>
            Registro de producción por jornada y actualización de precios por lote
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

        {/* Resumen general */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Precio Promedio</p>
            <p className="text-2xl font-bold text-success">${Math.round(precioPromedio)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Precio Máximo</p>
            <p className="text-2xl font-bold text-primary">$865</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Subidas
            </p>
            <p className="text-2xl font-bold text-accent">{totalSubida}</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Bajadas
            </p>
            <p className="text-2xl font-bold text-destructive">{totalBajada}</p>
          </div>
        </div>

        {/* Gráfica de evolución de precios */}
        <div className="border rounded-lg p-4 bg-card mb-4">
          <h4 className="font-semibold mb-4">Evolución de Precios por Lote</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicoPreciosData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="fecha" />
              <YAxis domain={[800, 900]} />
              <Tooltip
                formatter={(value: number) => `$${value}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="lote1" stroke="hsl(var(--chart-1))" name="Lote 1 Norte" strokeWidth={2} />
              <Line type="monotone" dataKey="lote2" stroke="hsl(var(--chart-2))" name="Lote 2 Sur" strokeWidth={2} />
              <Line type="monotone" dataKey="lote3" stroke="hsl(var(--chart-3))" name="Lote 3 Este" strokeWidth={2} />
              <Line type="monotone" dataKey="lote4" stroke="hsl(var(--chart-4))" name="Lote 4 Oeste" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de precios actuales */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Precio Anterior</TableHead>
                <TableHead className="text-right">Precio Actual</TableHead>
                <TableHead className="text-center">Tendencia</TableHead>
                <TableHead className="text-center">Variación</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preciosPorLoteData.map((precio) => (
                <TableRow key={precio.id}>
                  <TableCell className="font-medium">{precio.lote}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${precio.precioAnterior}
                  </TableCell>
                  <TableCell className="text-right">
                    {editando === precio.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="number"
                          value={nuevoPrecio}
                          onChange={(e) => setNuevoPrecio(e.target.value)}
                          className="w-24 text-right"
                        />
                        <Button size="sm" variant="ghost" onClick={handleGuardarPrecio} className="h-8 w-8 p-0">
                          <Save className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelar} className="h-8 w-8 p-0">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-success">${precio.precioActual}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {getTendenciaIcon(precio.tendencia)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getTendenciaBadge(precio.variacion)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(precio.ultimaActualizacion).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right">
                    {editando !== precio.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditarPrecio(precio.id, precio.precioActual)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Información adicional */}
        <div className="p-4 rounded-lg bg-info/10 border border-info/20 mt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Los precios se actualizan automáticamente según las condiciones del mercado. 
            Puede editar manualmente cualquier precio haciendo clic en el botón "Editar".
          </p>
        </div>

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
