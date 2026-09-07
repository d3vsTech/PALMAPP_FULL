/**
 * Etapa 2 del wizard de planilla — Tab Otros (Labores de Palma).
 * Extraído de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios. El wrapper <TabsContent value="otros">
 * queda en el padre.
 */
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { MultiSelectColaboradores } from '../../../components/operaciones/MultiSelectColaboradores';
import { SelectActividadLabor } from '../../../components/operaciones/SelectActividadLabor';
import { Plus, Check, Trash2, Pencil, X } from 'lucide-react';
import type { TrabajoOtros, ColaboradorWizard } from './tipos';
import { ColaboradorChip } from './ColaboradorChip';

/** Forma mínima de los lotes que el padre carga vía wizard-init. */
interface LoteOption {
  id: string;
  nombre: string;
}

/** Forma mínima de los sublotes que el padre carga vía wizard-init. */
interface SubloteOption {
  id: string;
  nombre: string;
  loteId: string;
  cantidadPalmas: number;
}

/** Actividad del catálogo `labor_actividades` (misma forma que en el padre). */
interface ActividadLabor {
  id: number;
  labor_id: number;
  nombre: string;
  precio?: string | number | null;
}

interface Props {
  trabajosOtros: TrabajoOtros[];
  otrosEnEdicion: TrabajoOtros | null;
  setOtrosEnEdicion: (t: TrabajoOtros) => void;
  colaboradores: ColaboradorWizard[];
  lotesData: LoteOption[];
  sublotes: SubloteOption[];
  actividadesPorLabor: Record<string, ActividadLabor[]>;
  agregarOtros: () => void;
  cancelarOtros: () => void;
  guardarOtros: () => void;
  editarOtros: (id: string) => void;
  eliminarOtros: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function TabOtros({
  trabajosOtros,
  otrosEnEdicion,
  setOtrosEnEdicion,
  colaboradores,
  lotesData,
  sublotes,
  actividadesPorLabor,
  agregarOtros,
  cancelarOtros,
  guardarOtros,
  editarOtros,
  eliminarOtros,
  setFormRef,
}: Props) {
  return (
    <>
                      <div className="flex justify-end">
                        <Button onClick={agregarOtros} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Otros
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {otrosEnEdicion && (
                        <div ref={setFormRef('otros')} className="scroll-mt-24">
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={otrosEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setOtrosEnEdicion({ ...otrosEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {otrosEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {otrosEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge
                                          key={colId}
                                          variant="secondary"
                                          className="pl-2.5 pr-1 py-1 gap-1"
                                        >
                                          <span>
                                            {col.nombres} {col.apellidos}
                                            {col.terceroNombre && (
                                              <span
                                                className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle"
                                                title={`Operario del tercero ${col.terceroNombre}`}
                                              >
                                                Tercero · {col.terceroNombre}
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOtrosEnEdicion({
                                                ...otrosEnEdicion,
                                                colaboradores: otrosEnEdicion.colaboradores.filter(id => id !== colId)
                                              });
                                            }}
                                            className="ml-1 hover:bg-muted rounded-sm p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Lote</Label>
                                <Select
                                  value={otrosEnEdicion.lote}
                                  onValueChange={(value) => {
                                    // Al cambiar de lote también limpiamos sublote y numeroPalmas
                                    // (queda inválido el autofill previo).
                                    setOtrosEnEdicion({
                                      ...otrosEnEdicion,
                                      lote: value,
                                      sublote: '',
                                      numeroPalmas: otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA' ? 0 : undefined,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar lote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lotesData.map((lote) => (
                                      <SelectItem key={lote.id} value={lote.id}>
                                        {lote.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sublote</Label>
                                <Select
                                  value={otrosEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    // Autofill de Número de Palmas solo si la labor es POR_PALMA.
                                    const sub = sublotes.find(s => s.id === value);
                                    setOtrosEnEdicion({
                                      ...otrosEnEdicion,
                                      sublote: value,
                                      numeroPalmas: otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA'
                                        ? Number(sub?.cantidadPalmas ?? 0)
                                        : otrosEnEdicion.numeroPalmas,
                                    });
                                  }}
                                  disabled={!otrosEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === otrosEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Trabajo Realizado — mismo componente que Sanidad,
                                  apuntando a la fija OTROS (§19 API_PARAMETRICAS).
                                  Al elegir "Otra" y escribir un trabajo nuevo, al
                                  guardar la tarjeta se crea la actividad en el catálogo
                                  y aparece en Configuración → Labores → Otros. */}
                              <div className="space-y-2 md:col-span-2">
                                <Label>Trabajo Realizado</Label>
                                <SelectActividadLabor
                                  laborId={otrosEnEdicion.laborOtrosRawId}
                                  actividades={actividadesPorLabor[String(otrosEnEdicion.laborOtrosRawId ?? '')] ?? []}
                                  value={otrosEnEdicion.laborRealizada}
                                  actividadId={otrosEnEdicion.laborActividadId ?? null}
                                  onChange={(nombre, id) => setOtrosEnEdicion({
                                    ...otrosEnEdicion,
                                    laborRealizada: nombre,
                                    laborActividadId: id,
                                  })}
                                />
                              </div>

                              {/* Campos dependientes del tipo_pago de la labor seleccionada
                                  (§10 doc API_OPERACIONES.md). Solo se renderizan cuando ya
                                  hay una labor escogida. */}
                              {otrosEnEdicion.laborOtrosTipoPago === 'POR_PALMA' && (
                                <div className="space-y-2">
                                  <Label>
                                    Número de Palmas <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    type="number" step="0.001"
                                    placeholder="0"
                                    value={otrosEnEdicion.numeroPalmas ?? ''}
                                    onChange={(e) =>
                                      setOtrosEnEdicion({
                                        ...otrosEnEdicion,
                                        numeroPalmas: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                              )}

                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarOtros}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarOtros} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosOtros.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Colaboradores */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Colaboradores</p>
                                  {trabajo.colaboradores?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trabajo.colaboradores?.map((colId) => {
                                        const col = colaboradores.find(c => c.id === colId);
                                        return col ? (
                                          <ColaboradorChip key={colId} col={col} />
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin colaboradores</p>
                                  )}
                                </div>

                                {/* Lote/Sublote */}
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{trabajo.nombre || 'Sin nombre'}</h4>
                                    <p className="text-xs text-muted-foreground">{lote?.nombre || 'Sin lote'} - {sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Labor realizada */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Labor</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.laborRealizada || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarOtros(trabajo.id)}
                                    disabled={otrosEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarOtros(trabajo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {trabajosOtros.length === 0 && !otrosEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de otros trabajos</p>
                          <p className="text-sm">Haz clic en "Agregar Otros" para crear uno</p>
                        </div>
                      )}
    </>
  );
}
