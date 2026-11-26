/**
 * Etapa 2 del wizard de planilla — Tab Plateo (Labores de Palma).
 * Extraído de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios. El wrapper <TabsContent value="plateo">
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
import { Plus, Save, Trash2, Pencil, X } from 'lucide-react';
import type { TrabajoPlateo, ColaboradorWizard } from './tipos';
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

interface Props {
  trabajosPlateo: TrabajoPlateo[];
  plateoEnEdicion: TrabajoPlateo | null;
  setPlateoEnEdicion: (t: TrabajoPlateo) => void;
  colaboradores: ColaboradorWizard[];
  lotesData: LoteOption[];
  sublotes: SubloteOption[];
  agregarPlateo: () => void;
  cancelarPlateo: () => void;
  guardarPlateo: () => void;
  editarPlateo: (id: string) => void;
  eliminarPlateo: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function TabPlateo({
  trabajosPlateo,
  plateoEnEdicion,
  setPlateoEnEdicion,
  colaboradores,
  lotesData,
  sublotes,
  agregarPlateo,
  cancelarPlateo,
  guardarPlateo,
  editarPlateo,
  eliminarPlateo,
  setFormRef,
}: Props) {
  return (
    <>
                      <div className="flex justify-end">
                        <Button onClick={agregarPlateo}  disabled={plateoEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar plateo
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {plateoEnEdicion && (
                        <div ref={setFormRef('plateo')} className="scroll-mt-24">
                        <Card className="border-primary/40 bg-muted/40">
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={plateoEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {plateoEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {plateoEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                          <span>{col.nombres} {col.apellidos}{col.terceroNombre ? <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-warning-soft text-warning border border-warning/20 font-medium align-middle">Tercero · {col.terceroNombre}</span> : null}</span>
                                          <button
                                            type="button"
                                            onClick={() => setPlateoEnEdicion({ ...plateoEnEdicion, colaboradores: plateoEnEdicion.colaboradores.filter(id => id !== colId) })}
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
                                  value={plateoEnEdicion.lote}
                                  onValueChange={(value) => setPlateoEnEdicion({ ...plateoEnEdicion, lote: value, sublote: '' })}
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
                                  value={plateoEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    const sub = sublotes.find(s => s.id === value);
                                    setPlateoEnEdicion({
                                      ...plateoEnEdicion,
                                      sublote: value,
                                      numeroPalmas: Number(sub?.cantidadPalmas ?? 0),
                                    });
                                  }}
                                  disabled={!plateoEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === plateoEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="tabplateo-numero-de-palmas">Número de palmas</Label>
                                <Input id="tabplateo-numero-de-palmas"
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={plateoEnEdicion.numeroPalmas || ''}
                                  onChange={(e) => setPlateoEnEdicion({ ...plateoEnEdicion, numeroPalmas: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarPlateo} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarPlateo}  type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de plateos guardados */}
                      {trabajosPlateo.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        return (
                          <Card key={trabajo.id}>
                            <CardContent className="p-4">
                              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:gap-4">
                                <div className="order-1 min-w-0 flex-1 md:order-none">
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
                                {/* Corta el renglon: abajo van el lote y la cifra. */}
                                <div aria-hidden className="order-3 w-full md:hidden" />
                                <div className="order-4 min-w-0 flex-1 md:order-none md:w-36 md:flex-none md:shrink-0">
                                  <h4 className="font-semibold text-sm truncate">{lote?.nombre || 'Lote no especificado'}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{sublote?.nombre || 'Sublote no especificado'}</p>
                                </div>
                                <div className="order-5 w-20 shrink-0 text-right max-md:empty:hidden md:order-none md:w-20">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="text-lg font-bold tabular-nums">{trabajo.numeroPalmas}</p>
                                </div>
                                <div className="order-2 ml-auto flex shrink-0 items-center gap-1 md:order-none md:ml-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarPlateo(trabajo.id)}
                                    disabled={plateoEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarPlateo(trabajo.id)}
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

                      {trabajosPlateo.length === 0 && !plateoEnEdicion && (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                          <p>No hay registros de plateo</p>
                          <p className="text-sm">Haz clic en "Agregar plateo" para crear uno</p>
                        </div>
                      )}
    </>
  );
}
