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

interface PrecioCosecha {
  loteId: string;
  loteNombre: string;
  año: number;
  precioPorKg: number;
}

const lotes = [
  { id: 'l1', nombre: 'Lote 1 - Norte' },
  { id: 'l2', nombre: 'Lote 2 - Sur' },
  { id: 'l3', nombre: 'Lote 3 - Este' },
  { id: 'l4', nombre: 'Lote 4 - Oeste' },
];

const añosDisponibles = [2024, 2025, 2026];

const preciosIniciales: PrecioCosecha[] = [
  { loteId: 'l1', loteNombre: 'Lote 1 - Norte', año: 2026, precioPorKg: 850 },
  { loteId: 'l2', loteNombre: 'Lote 2 - Sur', año: 2026, precioPorKg: 820 },
  { loteId: 'l3', loteNombre: 'Lote 3 - Este', año: 2026, precioPorKg: 875 },
  { loteId: 'l4', loteNombre: 'Lote 4 - Oeste', año: 2026, precioPorKg: 840 },
];

export function PreciosCosechaTab() {
  const [añoSeleccionado, setAñoSeleccionado] = useState(2026);
  const [precios, setPrecios] = useState<PrecioCosecha[]>(preciosIniciales);
  const [editados, setEditados] = useState(false);

  const preciosAño = precios.filter((p) => p.año === añoSeleccionado);

  const handlePrecioChange = (loteId: string, valor: number) => {
    setPrecios((prev) =>
      prev.map((p) =>
        p.loteId === loteId && p.año === añoSeleccionado
          ? { ...p, precioPorKg: valor }
          : p
      )
    );
    setEditados(true);
  };

  const handleGuardar = () => {
    console.log('Guardar precios:', precios);
    setEditados(false);
    // Aquí iría la lógica de guardado
  };

  return (
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Precios de Cosecha
            </CardTitle>
            <CardDescription>
              Precio por kg de fruto cosechado por lote y año
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
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lote</TableHead>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Precio por Kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => {
                const precioLote = preciosAño.find((p) => p.loteId === lote.id);
                return (
                  <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{lote.nombre}</TableCell>
                    <TableCell>{añoSeleccionado}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          className="w-32 text-right"
                          value={precioLote?.precioPorKg || ''}
                          onChange={(e) =>
                            handlePrecioChange(lote.id, parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-muted-foreground text-sm">/kg</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {editados && (
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Hay cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
