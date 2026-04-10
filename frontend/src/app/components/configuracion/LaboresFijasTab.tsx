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
import { Save, Settings } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface LaborFija {
  id: string;
  nombre: string;
  unidad: 'PALMA' | 'JORNAL';
  valorPorUnidad: number;
}

const laboresFijasData: LaborFija[] = [
  { id: 'lf1', nombre: 'Poda', unidad: 'PALMA', valorPorUnidad: 950 },
  { id: 'lf2', nombre: 'Plateo', unidad: 'PALMA', valorPorUnidad: 800 },
  { id: 'lf3', nombre: 'Sanidad', unidad: 'JORNAL', valorPorUnidad: 50000 },
  { id: 'lf4', nombre: 'Fertilización', unidad: 'PALMA', valorPorUnidad: 650 },
];

export function LaboresFijasTab() {
  const [labores, setLabores] = useState<LaborFija[]>(laboresFijasData);
  const [editados, setEditados] = useState(false);

  const handleValorChange = (id: string, valor: number) => {
    setLabores((prev) =>
      prev.map((l) => (l.id === id ? { ...l, valorPorUnidad: valor } : l))
    );
    setEditados(true);
  };

  const handleGuardar = () => {
    console.log('Guardar labores fijas:', labores);
    setEditados(false);
  };

  return (
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Labores Fijas
            </CardTitle>
            <CardDescription>
              Precios fijos por tipo de labor de campo
            </CardDescription>
          </div>
          <Button onClick={handleGuardar} disabled={!editados}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tipo de Labor</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Valor por Unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labores.map((labor) => (
                <TableRow key={labor.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{labor.nombre}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        labor.unidad === 'PALMA'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-accent/10 text-accent border-accent/30'
                      }
                    >
                      {labor.unidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="w-40 text-right"
                        value={labor.valorPorUnidad || ''}
                        onChange={(e) =>
                          handleValorChange(labor.id, parseFloat(e.target.value) || 0)
                        }
                      />
                      <span className="text-muted-foreground text-sm">
                        /{labor.unidad === 'PALMA' ? 'palma' : 'jornal'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
