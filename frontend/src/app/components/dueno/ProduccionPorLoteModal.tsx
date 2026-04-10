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
import { Search, Calendar, Sprout, TrendingUp } from 'lucide-react';
import { Progress } from '../ui/progress';

interface ProduccionPorLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
}

// Datos mock de lotes
const lotesData = [
  {
    id: 1,
    nombre: 'Lote 1 Norte',
    area: 12.5,
    palmas: 2340,
    promedioKg: 18.5,
    promedioGajos: 1420,
    produccionDiaria: 15800,
    estado: 'Producción activa',
    trabajosRealizados: ['Cosecha', 'Poda', 'Fertilización'],
    metaQuincenal: 220000,
    avanceMeta: 85,
  },
  {
    id: 2,
    nombre: 'Lote 2 Sur',
    area: 10.2,
    palmas: 1890,
    promedioKg: 17.8,
    promedioGajos: 1320,
    produccionDiaria: 13200,
    estado: 'Producción activa',
    trabajosRealizados: ['Cosecha', 'Fumigación'],
    metaQuincenal: 185000,
    avanceMeta: 92,
  },
  {
    id: 3,
    nombre: 'Lote 3 Este',
    area: 15.8,
    palmas: 2980,
    promedioKg: 19.2,
    promedioGajos: 1550,
    produccionDiaria: 18600,
    estado: 'Producción activa',
    trabajosRealizados: ['Cosecha', 'Mantenimiento'],
    metaQuincenal: 260000,
    avanceMeta: 78,
  },
  {
    id: 4,
    nombre: 'Lote 4 Oeste',
    area: 8.7,
    palmas: 1650,
    promedioKg: 16.9,
    promedioGajos: 1180,
    produccionDiaria: 11400,
    estado: 'Mantenimiento',
    trabajosRealizados: ['Poda', 'Fertilización'],
    metaQuincenal: 160000,
    avanceMeta: 65,
  },
];

export function ProduccionPorLoteModal({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
}: ProduccionPorLoteModalProps) {
  const [busqueda, setBusqueda] = useState('');

  const lotesFiltrados = lotesData.filter((lote) =>
    lote.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEstadoBadge = (estado: string) => {
    if (estado === 'Producción activa') {
      return <Badge className="bg-success hover:bg-success/90">{estado}</Badge>;
    }
    if (estado === 'Mantenimiento') {
      return <Badge className="bg-warning hover:bg-warning/90">{estado}</Badge>;
    }
    return <Badge variant="secondary">{estado}</Badge>;
  };

  const getMetaColor = (avance: number) => {
    if (avance >= 90) return 'bg-success';
    if (avance >= 75) return 'bg-primary';
    if (avance >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sprout className="h-6 w-6 text-success" />
            Producción por Lote
          </DialogTitle>
          <DialogDescription>
            Análisis detallado de promedios, producción diaria, estado y seguimiento de metas por lote
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lote..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Producción total/día</p>
            <p className="text-2xl font-bold text-success">59,000 kg</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Promedio kg/gajo</p>
            <p className="text-2xl font-bold text-primary">18.1</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
            <p className="text-xs text-muted-foreground mb-1">Total palmas</p>
            <p className="text-2xl font-bold text-info">8,860</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
            <p className="text-xs text-muted-foreground mb-1">Área total</p>
            <p className="text-2xl font-bold text-accent">47.2 ha</p>
          </div>
        </div>

        {/* Tabs para diferentes vistas */}
        <Tabs defaultValue="promedios" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="promedios">Promedios</TabsTrigger>
            <TabsTrigger value="produccion">Producción Diaria</TabsTrigger>
            <TabsTrigger value="metas">Seguimiento Metas</TabsTrigger>
          </TabsList>

          <TabsContent value="promedios" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Área (ha)</TableHead>
                    <TableHead className="text-right">Palmas</TableHead>
                    <TableHead className="text-right">Promedio kg</TableHead>
                    <TableHead className="text-right">Promedio Gajos</TableHead>
                    <TableHead className="text-right">kg/Gajo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotesFiltrados.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.nombre}</TableCell>
                      <TableCell className="text-right">{lote.area}</TableCell>
                      <TableCell className="text-right">{lote.palmas.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right font-semibold">{lote.promedioKg} kg</TableCell>
                      <TableCell className="text-right font-semibold">{lote.promedioGajos.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-success">{(lote.promedioKg / lote.promedioGajos * 1000).toFixed(1)} kg/gajo</span>
                      </TableCell>
                      <TableCell>{getEstadoBadge(lote.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="produccion" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Producción Diaria</TableHead>
                    <TableHead>Trabajos Realizados</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotesFiltrados.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.nombre}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-2xl font-bold text-success">{lote.produccionDiaria.toLocaleString('es-CO')} kg</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {lote.trabajosRealizados.map((trabajo, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {trabajo}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getEstadoBadge(lote.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="metas" className="mt-4">
            <div className="space-y-4">
              {lotesFiltrados.map((lote) => (
                <div key={lote.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{lote.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        Meta quincenal: {lote.metaQuincenal.toLocaleString('es-CO')} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-success">{lote.avanceMeta}%</p>
                      <p className="text-xs text-muted-foreground">Avance</p>
                    </div>
                  </div>
                  <Progress value={lote.avanceMeta} className={`h-3 ${getMetaColor(lote.avanceMeta)}`} />
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <p className="text-sm text-muted-foreground">
                      {Math.round(lote.metaQuincenal * lote.avanceMeta / 100).toLocaleString('es-CO')} kg producidos de {lote.metaQuincenal.toLocaleString('es-CO')} kg
                    </p>
                  </div>
                </div>
              ))}
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
