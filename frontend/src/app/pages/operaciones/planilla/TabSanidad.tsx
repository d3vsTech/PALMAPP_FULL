/**
 * Etapa 2 del wizard de planilla — Tab Sanidad (Labores de Palma).
 * Extraído de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios. El wrapper <TabsContent value="sanidad">
 * queda en el padre.
 */
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
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
import type { TrabajoSanidad, ColaboradorWizard } from './tipos';
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
  trabajosSanidad: TrabajoSanidad[];
  sanidadEnEdicion: TrabajoSanidad | null;
  setSanidadEnEdicion: (t: TrabajoSanidad) => void;
  colaboradores: ColaboradorWizard[];
  lotesData: LoteOption[];
  sublotes: SubloteOption[];
  palmaTipoToId: Map<string, number>;
  actividadesPorLabor: Record<string, ActividadLabor[]>;
  agregarSanidad: () => void;
  cancelarSanidad: () => void;
  guardarSanidad: () => void;
  editarSanidad: (id: string) => void;
  eliminarSanidad: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function TabSanidad({
  trabajosSanidad,
  sanidadEnEdicion,
  setSanidadEnEdicion,
  colaboradores,
  lotesData,
  sublotes,
  palmaTipoToId,
  actividadesPorLabor,
  agregarSanidad,
  cancelarSanidad,
  guardarSanidad,
  editarSanidad,
  eliminarSanidad,
  setFormRef,
}: Props) {
  return (
    <>
                      <div className="flex justify-end">
                        <Button onClick={agregarSanidad} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar Sanidad
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {sanidadEnEdicion && (
                        <div ref={setFormRef('sanidad')} className="scroll-mt-24">
                        <Card className="border-primary/50 shadow-lg">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={sanidadEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {sanidadEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {sanidadEnEdicion.colaboradores.map((colId) => {
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
                                              setSanidadEnEdicion({
                                                ...sanidadEnEdicion,
                                                colaboradores: sanidadEnEdicion.colaboradores.filter(id => id !== colId)
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
                                  value={sanidadEnEdicion.lote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, lote: value, sublote: '' });
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
                                  value={sanidadEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    setSanidadEnEdicion({ ...sanidadEnEdicion, sublote: value });
                                  }}
                                  disabled={!sanidadEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === sanidadEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Trabajo Realizado</Label>
                                <SelectActividadLabor
                                  laborId={palmaTipoToId.get('SANIDAD')}
                                  actividades={actividadesPorLabor[String(palmaTipoToId.get('SANIDAD') ?? '')] ?? []}
                                  value={sanidadEnEdicion.trabajoRealizado}
                                  actividadId={sanidadEnEdicion.laborActividadId ?? null}
                                  onChange={(nombre, id) => setSanidadEnEdicion({
                                    ...sanidadEnEdicion,
                                    trabajoRealizado: nombre,
                                    laborActividadId: id,
                                  })}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={cancelarSanidad}>
                                Cancelar
                              </Button>
                              <Button onClick={guardarSanidad} className="gap-2">
                                <Check className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Lista de trabajos guardados */}
                      {trabajosSanidad.map((trabajo) => {
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
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Sin lote'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sin sublote'}</p>
                                  </div>
                                </div>

                                {/* Trabajo realizado */}
                                <div className="text-right shrink-0 max-w-xs">
                                  <p className="text-xs text-muted-foreground">Trabajo</p>
                                  <p className="font-semibold text-sm truncate">{trabajo.trabajoRealizado || 'Sin descripción'}</p>
                                </div>

                                {/* Botón eliminar */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarSanidad(trabajo.id)}
                                    disabled={sanidadEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarSanidad(trabajo.id)}
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

                      {trabajosSanidad.length === 0 && !sanidadEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de sanidad vegetal</p>
                          <p className="text-sm">Haz clic en "Agregar Sanidad" para crear uno</p>
                        </div>
                      )}
    </>
  );
}
