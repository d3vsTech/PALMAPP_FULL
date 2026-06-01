import { useEffect, useState } from 'react';
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
import { Save, Calendar } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type PromedioLote,
} from '../../../api/configuracion';
import { lotesApi } from '../../../api/plantacion';

interface LoteOpcion {
  id: number;
  nombre: string;
}

interface PromedioRow extends PromedioLote {
  updated_at?: string;
}

const ANIO_ACTUAL = new Date().getFullYear();
const aniosDisponibles = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - 2 + i);

export function PromediosTab() {
  const [anioSeleccionado, setAnioSeleccionado] = useState(ANIO_ACTUAL);
  const [promedios, setPromedios] = useState<PromedioRow[]>([]);
  const [lotes, setLotes] = useState<LoteOpcion[]>([]);
  const [editados, setEditados] = useState<Record<number, number>>({});

  const cargar = (anio: number) => {
    Promise.all([
      configuracionApi.promediosLote.listar({ anio, per_page: 100 }),
      lotesApi.listar({ per_page: 100 }),
    ])
      .then(([resPromedios, resLotes]) => {
        setPromedios(resPromedios.data as PromedioRow[]);
        setLotes(resLotes.data.map((l: any) => ({ id: l.id, nombre: l.nombre })));
        setEditados({});
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar los promedios'));
  };

  useEffect(() => {
    cargar(anioSeleccionado);
  }, [anioSeleccionado]);

  const handlePromedioChange = (loteId: number, valor: number) => {
    setEditados((prev) => ({ ...prev, [loteId]: valor }));
  };

  const valorActual = (loteId: number): number => {
    if (editados[loteId] !== undefined) return editados[loteId];
    const p = promedios.find((pr) => pr.lote_id === loteId);
    return p ? Number(p.promedio) : 0;
  };

  const hayCambios = Object.keys(editados).length > 0;

  const handleGuardar = async () => {
    const tareas = Object.entries(editados).map(async ([loteIdStr, valor]) => {
      const loteId = Number(loteIdStr);
      const existente = promedios.find((p) => p.lote_id === loteId);
      try {
        if (existente) {
          await configuracionApi.promediosLote.editar(existente.id, {
            lote_id: loteId,
            promedio: valor,
            anio: anioSeleccionado,
          });
        } else {
          await configuracionApi.promediosLote.crear({
            lote_id: loteId,
            promedio: valor,
            anio: anioSeleccionado,
          });
        }
      } catch (e: any) {
        if (e?.code === ConfiguracionErrorCodes.PROMEDIO_DUPLICADO) {
          throw new Error('Ya existe un promedio para ese lote en ese año');
        }
        throw e;
      }
    });

    try {
      await Promise.all(tareas);
      toast.success('Promedios guardados');
      cargar(anioSeleccionado);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron guardar los cambios');
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const obtenerUltimaActualizacion = () => {
    // Devolvemos un ISO completo (no solo YYYY-MM-DD) para que `formatearFecha`
    // lo parsee en hora local. Antes hacíamos `.split('T')[0]` y al re-parsear
    // como "YYYY-MM-DD" JS lo trataba como UTC midnight → en COT (UTC-5)
    // se mostraba el día anterior.
    const fechas = promedios
      .map((p) => p.updated_at)
      .filter((f): f is string => !!f)
      .map((f) => new Date(f).getTime());
    if (fechas.length === 0) return null;
    return new Date(Math.max(...fechas)).toISOString();
  };

  const valoresParaPromedio = lotes
    .map((l) => valorActual(l.id))
    .filter((v) => v > 0);
  const promedioGeneral =
    valoresParaPromedio.length > 0
      ? valoresParaPromedio.reduce((s, v) => s + v, 0) / valoresParaPromedio.length
      : 0;

  return (
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
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
                value={anioSeleccionado.toString()}
                onValueChange={(value) => setAnioSeleccionado(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGuardar} disabled={!hayCambios}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Promedio General y Última Actualización */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Promedio General {anioSeleccionado}</p>
                <p className="text-4xl font-bold text-primary">
                  {promedioGeneral.toFixed(2)} <span className="text-lg">kg/gajo</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Última Actualización</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {obtenerUltimaActualizacion() ? formatearFecha(obtenerUltimaActualizacion()!) : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Promedios */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lote</TableHead>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Kg Promedio por Gajo</TableHead>
                <TableHead>Fecha Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => {
                const promedioLote = promedios.find((p) => p.lote_id === lote.id);
                const valor = valorActual(lote.id);
                return (
                  <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{lote.nombre}</TableCell>
                    <TableCell>{anioSeleccionado}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-32 text-right"
                          value={valor || ''}
                          onChange={(e) =>
                            handlePromedioChange(lote.id, parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="text-muted-foreground text-sm">kg/gajo</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {promedioLote?.updated_at ? formatearFecha(promedioLote.updated_at) : 'N/A'}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {hayCambios && (
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
