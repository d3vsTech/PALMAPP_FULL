import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Save, TrendingUp } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface PromedioLote {
  loteId: string;
  loteNombre: string;
  año: number;
  kgPromedioPorGajo: number;
}

const lotes = [
  { id: 'l1', nombre: 'Lote 1 - Norte' },
  { id: 'l2', nombre: 'Lote 2 - Sur' },
  { id: 'l3', nombre: 'Lote 3 - Este' },
  { id: 'l4', nombre: 'Lote 4 - Oeste' },
];

const añosDisponibles = [2024, 2025, 2026];

const promediosIniciales: PromedioLote[] = [
  { loteId: 'l1', loteNombre: 'Lote 1 - Norte', año: 2026, kgPromedioPorGajo: 14.5 },
  { loteId: 'l2', loteNombre: 'Lote 2 - Sur', año: 2026, kgPromedioPorGajo: 15.2 },
  { loteId: 'l3', loteNombre: 'Lote 3 - Este', año: 2026, kgPromedioPorGajo: 13.8 },
  { loteId: 'l4', loteNombre: 'Lote 4 - Oeste', año: 2026, kgPromedioPorGajo: 14.1 },
];

export function PromediosTab() {
  const [añoSeleccionado, setAñoSeleccionado] = useState(2026);
  const [promedios, setPromedios] = useState<PromedioLote[]>(promediosIniciales);
  const [editados, setEditados] = useState(false);

  const promediosAño = promedios.filter((p) => p.año === añoSeleccionado);

  const handlePromedioChange = (loteId: string, valor: number) => {
    setPromedios((prev) =>
      prev.map((p) =>
        p.loteId === loteId && p.año === añoSeleccionado
          ? { ...p, kgPromedioPorGajo: valor }
          : p
      )
    );
    setEditados(true);
  };

  const handleGuardar = () => {
    console.log('Guardar promedios:', promedios);
    setEditados(false);
  };

  const promedioGeneral =
    promediosAño.length > 0
      ? promediosAño.reduce((sum, p) => sum + p.kgPromedioPorGajo, 0) / promediosAño.length
      : 0;

  return (
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Promedios Anuales
            </CardTitle>
            <CardDescription>
              Kg promedio por gajo para cada lote
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Año:</Label>
              <Select
                value={añoSeleccionado.toString()}
                onValueChange={(value) => setAñoSeleccionado(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {añosDisponibles.map((año) => (
                    <SelectItem key={año} value={año.toString()}>
                      {año}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGuardar} disabled={!editados}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Promedio General */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Promedio General {añoSeleccionado}</p>
              <p className="text-4xl font-bold text-primary">
                {promedioGeneral.toFixed(2)} <span className="text-lg">kg/gajo</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Promedios */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lote</TableHead>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Kg Promedio por Gajo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => {
                const promedioLote = promediosAño.find((p) => p.loteId === lote.id);
                return (
                  <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{lote.nombre}</TableCell>
                    <TableCell>{añoSeleccionado}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-32 text-right"
                          value={promedioLote?.kgPromedioPorGajo || ''}
                          onChange={(e) =>
                            handlePromedioChange(lote.id, parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-muted-foreground text-sm">kg/gajo</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Ejemplo de Uso */}
        <div className="rounded-lg bg-accent/5 border border-accent/30 p-4">
          <h4 className="text-sm font-semibold mb-2">Ejemplo de Uso</h4>
          <p className="text-sm text-muted-foreground">
            Si el <span className="font-semibold text-foreground">Lote 1 - Norte</span> cosechó{' '}
            <span className="font-semibold text-foreground">100 gajos</span>, se estima una
            producción de{' '}
            <span className="font-semibold text-success">
              {((promediosAño.find((p) => p.loteId === 'l1')?.kgPromedioPorGajo || 0) * 100).toFixed(
                1
              )}{' '}
              kg
            </span>{' '}
            de fruto.
          </p>
        </div>

        {editados && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Hay cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
