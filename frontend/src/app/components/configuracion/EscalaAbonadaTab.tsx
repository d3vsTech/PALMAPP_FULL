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
import { Plus, Save, Package, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface RangoAbonada {
  id: string;
  gramosMin: number;
  gramosMax: number;
  precioPorPalma: number;
}

const insumosDisponibles = [
  { id: 'i1', nombre: 'KCl' },
  { id: 'i2', nombre: 'Borax' },
  { id: 'i3', nombre: 'Urea' },
  { id: 'i4', nombre: 'NPK' },
];

const rangosIniciales: RangoAbonada[] = [
  { id: 'r1', gramosMin: 0, gramosMax: 500, precioPorPalma: 80 },
  { id: 'r2', gramosMin: 501, gramosMax: 1000, precioPorPalma: 120 },
  { id: 'r3', gramosMin: 1001, gramosMax: 1500, precioPorPalma: 160 },
];

export function EscalaAbonadaTab() {
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('i1');
  const [rangos, setRangos] = useState<RangoAbonada[]>(rangosIniciales);
  const [editados, setEditados] = useState(false);

  const handleAgregarRango = () => {
    const ultimoRango = rangos[rangos.length - 1];
    const nuevoMin = ultimoRango ? ultimoRango.gramosMax + 1 : 0;
    setRangos((prev) => [
      ...prev,
      {
        id: `r${Date.now()}`,
        gramosMin: nuevoMin,
        gramosMax: nuevoMin + 500,
        precioPorPalma: 0,
      },
    ]);
    setEditados(true);
  };

  const handleEliminarRango = (id: string) => {
    setRangos((prev) => prev.filter((r) => r.id !== id));
    setEditados(true);
  };

  const handleRangoChange = (id: string, field: keyof RangoAbonada, valor: number) => {
    setRangos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: valor } : r))
    );
    setEditados(true);
  };

  const handleGuardar = () => {
    console.log('Guardar escala abonada:', { insumo: insumoSeleccionado, rangos });
    setEditados(false);
  };

  const insumoNombre =
    insumosDisponibles.find((i) => i.id === insumoSeleccionado)?.nombre || '';

  return (
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Escala de Abonada
            </CardTitle>
            <CardDescription>
              Rangos de gramos y precios por palma según insumo
            </CardDescription>
          </div>
          <Button onClick={handleGuardar} disabled={!editados}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de Insumo */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
          <Label className="font-semibold">Insumo:</Label>
          <Select
            value={insumoSeleccionado}
            onValueChange={setInsumoSeleccionado}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {insumosDisponibles.map((insumo) => (
                <SelectItem key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de Rangos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Rangos para {insumoNombre}</h3>
            <Button onClick={handleAgregarRango} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Rango
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Gramos Mínimo</TableHead>
                  <TableHead>Gramos Máximo</TableHead>
                  <TableHead className="text-right">Precio por Palma</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay rangos definidos. Agrega el primer rango.
                    </TableCell>
                  </TableRow>
                ) : (
                  rangos.map((rango, index) => (
                    <TableRow key={rango.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Input
                          type="number"
                          className="w-32"
                          value={rango.gramosMin || ''}
                          onChange={(e) =>
                            handleRangoChange(
                              rango.id,
                              'gramosMin',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-32"
                          value={rango.gramosMax || ''}
                          onChange={(e) =>
                            handleRangoChange(
                              rango.id,
                              'gramosMax',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            className="w-32 text-right"
                            value={rango.precioPorPalma || ''}
                            onChange={(e) =>
                              handleRangoChange(
                                rango.id,
                                'precioPorPalma',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <span className="text-muted-foreground text-sm">/palma</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarRango(rango.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Ejemplo */}
        {rangos.length > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/30 p-4">
            <h4 className="text-sm font-semibold mb-2">Ejemplo de Aplicación</h4>
            <p className="text-sm text-muted-foreground">
              Si una palma recibe{' '}
              <span className="font-semibold text-foreground">750 gramos</span> de{' '}
              {insumoNombre}, se le paga{' '}
              <span className="font-semibold text-success">
                $
                {rangos.find((r) => r.gramosMin <= 750 && r.gramosMax >= 750)
                  ?.precioPorPalma || 0}
              </span>{' '}
              por palma.
            </p>
          </div>
        )}

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
