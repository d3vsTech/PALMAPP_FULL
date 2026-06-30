/**
 * PromediosTab — promedios kg/gajo por lote y año.
 *
 * Diseño visual portado del V.15: KPIs arriba + tabla principal con
 * acordeón expandible por lote mostrando histórico de años anteriores y
 * variación porcentual. La capa de datos usa `configuracionApi.promediosLote`
 * real (no mocks).
 *
 * El backend permite varios baselines por (lote, año) y además los
 * auto-generados por viajes homogéneos (`viaje_id != null`, inmutables).
 * Para el histórico expandible mostramos el promedio más reciente por año
 * de cada lote (cualquier origen).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { cached, invalidate } from '../../../api/cache';
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
import { Save, Calendar, ChevronDown, History } from 'lucide-react';
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
import { TabLoadingGate } from './TabLoadingGate';

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
  /** Promedios del año seleccionado (vienen de la API filtrados por anio). */
  const [promedios, setPromedios] = useState<PromedioRow[]>([]);
  /** Snapshot global usado para el acordeón de histórico (todos los años). */
  const [historicoTodo, setHistoricoTodo] = useState<PromedioRow[]>([]);
  const [lotes, setLotes] = useState<LoteOpcion[]>([]);
  const [editados, setEditados] = useState<Record<number, number>>({});
  const [expandido, setExpandido] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = (anio: number) => {
    setLoading(true);
    Promise.all([
      cached(`config:promedios:${anio}`, () =>
        configuracionApi.promediosLote.listar({ anio, per_page: 100 }),
      ),
      cached('config:promedios:all', () =>
        configuracionApi.promediosLote.listar({ per_page: 500 }),
      ),
      cached('config:lotes:select', () => lotesApi.listar({ per_page: 100 })),
    ])
      .then(([resPromedios, resHistorico, resLotes]) => {
        setPromedios(resPromedios.data as PromedioRow[]);
        setHistoricoTodo(resHistorico.data as PromedioRow[]);
        setLotes(resLotes.data.map((l: any) => ({ id: l.id, nombre: l.nombre })));
        setEditados({});
      })
      .catch((e: any) => {
        console.error('[PromediosTab] Error al cargar:', e);
        toast.error(e?.message ?? 'No se pudieron cargar los promedios');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar(anioSeleccionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioSeleccionado]);

  const handlePromedioChange = (loteId: number, valor: number) => {
    setEditados((prev) => ({ ...prev, [loteId]: valor }));
  };

  /**
   * Promedio más reciente por lote del año seleccionado.
   *
   * El backend permite varios baselines por (lote, año) más los auto-generados
   * por viajes — un mismo `lote_id` puede aparecer N veces. Agrupamos por lote
   * y nos quedamos con el de `updated_at` más reciente (fallback: `id` mayor),
   * que es el que la UI debe mostrar y editar.
   */
  const promedioMasRecientePorLote = useMemo(() => {
    const map = new Map<number, PromedioRow>();
    for (const p of promedios) {
      const existente = map.get(p.lote_id);
      if (!existente) {
        map.set(p.lote_id, p);
        continue;
      }
      const tsNuevo = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      const tsViejo = existente.updated_at ? new Date(existente.updated_at).getTime() : 0;
      if (tsNuevo > tsViejo || (tsNuevo === tsViejo && p.id > existente.id)) {
        map.set(p.lote_id, p);
      }
    }
    return map;
  }, [promedios]);

  const valorActual = (loteId: number): number => {
    if (editados[loteId] !== undefined) return editados[loteId];
    const p = promedioMasRecientePorLote.get(loteId);
    return p ? Number(p.promedio) : 0;
  };

  const hayCambios = Object.keys(editados).length > 0;

  const handleGuardar = async () => {
    const tareas = Object.entries(editados).map(async ([loteIdStr, valor]) => {
      const loteId = Number(loteIdStr);
      // Editar el registro más reciente del lote (no el primero que aparezca).
      const existente = promedioMasRecientePorLote.get(loteId);
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
        // El backend ya no rechaza por duplicado (lote_id, anio) — varios
        // baselines son válidos. El único error específico es
        // PROMEDIO_DE_VIAJE: intento de editar un registro generado
        // automáticamente por un viaje (inmutable).
        if (e?.code === ConfiguracionErrorCodes.PROMEDIO_DE_VIAJE) {
          throw new Error(
            'Este promedio fue generado automáticamente por un viaje y no se puede modificar.',
          );
        }
        throw e;
      }
    });

    try {
      await Promise.all(tareas);
      toast.success('Promedios guardados');
      invalidate(`config:promedios:${anioSeleccionado}`);
      invalidate('config:promedios:all');
      cargar(anioSeleccionado);
    } catch (e: any) {
      console.error('[PromediosTab] Error al guardar:', e);
      toast.error(e?.message ?? 'No se pudieron guardar los cambios');
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Última fecha de actualización entre los promedios mostrados en la tabla
   * (uno por lote — el más reciente). Se usa el ISO completo para que
   * `formatearFecha` lo parsee en hora local (si pasamos solo YYYY-MM-DD JS
   * lo trata como UTC y en COT podríamos ver el día anterior).
   */
  const obtenerUltimaActualizacion = () => {
    const fechas = Array.from(promedioMasRecientePorLote.values())
      .map((p) => p.updated_at)
      .filter((f): f is string => !!f)
      .map((f) => new Date(f).getTime())
      .filter((t) => !Number.isNaN(t));
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

  /**
   * Histórico por lote: agrupa todos los promedios (cualquier origen) por
   * `anio`, toma el más reciente por año, y excluye el año actualmente
   * seleccionado. Devuelto ordenado descendente por año.
   */
  const historicoPorLote = useMemo(() => {
    const map = new Map<number, Array<{ anio: number; promedio: number; updated_at?: string }>>();
    for (const p of historicoTodo) {
      if (p.anio === anioSeleccionado) continue;
      const lista = map.get(p.lote_id) ?? [];
      // Si ya hay un registro para ese año, conservamos el más reciente.
      const existente = lista.find((r) => r.anio === p.anio);
      const valorNum = Number(p.promedio);
      const updatedAt = (p as any).updated_at as string | undefined;
      if (existente) {
        const tsNuevo = updatedAt ? new Date(updatedAt).getTime() : 0;
        const tsViejo = existente.updated_at ? new Date(existente.updated_at).getTime() : 0;
        if (tsNuevo > tsViejo) {
          existente.promedio = valorNum;
          existente.updated_at = updatedAt;
        }
      } else {
        lista.push({ anio: p.anio, promedio: valorNum, updated_at: updatedAt });
      }
      map.set(p.lote_id, lista);
    }
    // Ordenar cada lista desc por año.
    map.forEach((lista) => lista.sort((a, b) => b.anio - a.anio));
    return map;
  }, [historicoTodo, anioSeleccionado]);

  const toggleExpandido = (loteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandido((prev) => (prev === loteId ? null : loteId));
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando promedios…">
    <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Promedios Anuales</CardTitle>
            <CardDescription>Kg promedio por gajo para cada lote</CardDescription>
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
        {/* KPIs */}
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
                  {obtenerUltimaActualizacion()
                    ? formatearFecha(obtenerUltimaActualizacion()!)
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla con acordeón por lote */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lote</TableHead>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Kg Promedio por Gajo</TableHead>
                <TableHead>Fecha Actualización</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => {
                // Promedio más reciente del año seleccionado para este lote.
                // Si hay varios baselines por (lote, año), se elige por
                // `updated_at` desc (mismo criterio que `valorActual`).
                const promedioLote = promedioMasRecientePorLote.get(lote.id);
                const historial = historicoPorLote.get(lote.id) ?? [];
                const estaExpandido = expandido === lote.id;
                const valor = valorActual(lote.id);

                return (
                  <React.Fragment key={lote.id}>
                    {/* Fila principal */}
                    <TableRow className="hover:bg-muted/50 transition-colors">
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
                      <TableCell>
                        {historial.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpandido(lote.id, e)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted"
                            title="Ver historial"
                          >
                            <History className="h-3.5 w-3.5" />
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${estaExpandido ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Acordeón histórico */}
                    {estaExpandido && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="p-0">
                          <div className="px-6 py-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5" />
                              Historial de promedios — {lote.nombre}
                            </p>
                            <div className="rounded-lg border border-border/60 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/40 border-b border-border/60">
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Año</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Kg Promedio por Gajo</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Fecha Actualización</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Variación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {historial.map((h, idx) => {
                                    const siguiente = historial[idx + 1];
                                    const variacion = siguiente ? h.promedio - siguiente.promedio : null;
                                    return (
                                      <tr key={h.anio} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5 font-medium">{h.anio}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="font-semibold">{h.promedio.toFixed(1)}</span>
                                          <span className="text-muted-foreground text-xs ml-1">kg/gajo</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                          <span className="inline-flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" />
                                            {h.updated_at ? formatearFecha(h.updated_at) : '—'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {variacion != null ? (
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                              variacion > 0
                                                ? 'bg-[#1E5631]/10 text-[#1E5631]'
                                                : variacion < 0
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-muted text-muted-foreground'
                                            }`}>
                                              {variacion > 0 ? '+' : ''}{variacion.toFixed(1)} kg
                                            </span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
    </TabLoadingGate>
  );
}
