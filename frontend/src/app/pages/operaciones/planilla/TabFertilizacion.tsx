/**
 * Etapa 2 del wizard de planilla — Tab Fertilización (Labores de Palma).
 * Extraído de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios. El wrapper <TabsContent value="fertilizacion">
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
import type { TrabajoFertilizacion, ColaboradorWizard } from './tipos';
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
  trabajosFertilizacion: TrabajoFertilizacion[];
  fertilizacionEnEdicion: TrabajoFertilizacion | null;
  setFertilizacionEnEdicion: (t: TrabajoFertilizacion) => void;
  colaboradores: ColaboradorWizard[];
  lotesData: LoteOption[];
  sublotes: SubloteOption[];
  insumosLista: string[];
  agregarFertilizacion: () => void;
  cancelarFertilizacion: () => void;
  guardarFertilizacion: () => void;
  editarFertilizacion: (id: string) => void;
  eliminarFertilizacion: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function TabFertilizacion({
  trabajosFertilizacion,
  fertilizacionEnEdicion,
  setFertilizacionEnEdicion,
  colaboradores,
  lotesData,
  sublotes,
  insumosLista,
  agregarFertilizacion,
  cancelarFertilizacion,
  guardarFertilizacion,
  editarFertilizacion,
  eliminarFertilizacion,
  setFormRef,
}: Props) {
  return (
    <>
                      <div className="flex justify-end">
                        <Button onClick={agregarFertilizacion} className="gap-2" disabled={fertilizacionEnEdicion !== null}>
                          <Plus className="h-4 w-4" />
                          Agregar Fertilización
                        </Button>
                      </div>

                      {/* Formulario de edición */}
                      {fertilizacionEnEdicion && (
                        <div ref={setFormRef('fertilizacion')} className="scroll-mt-24">
                        <Card className="border-border border-2 border-primary/50">
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Colaboradores</Label>
                                <MultiSelectColaboradores
                                  colaboradores={colaboradores}
                                  seleccionados={fertilizacionEnEdicion.colaboradores}
                                  onChange={(nuevos) =>
                                    setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: nuevos })
                                  }
                                />
                                {fertilizacionEnEdicion.colaboradores.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {fertilizacionEnEdicion.colaboradores.map((colId) => {
                                      const col = colaboradores.find(c => c.id === colId);
                                      return col ? (
                                        <Badge key={colId} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
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
                                            onClick={() => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, colaboradores: fertilizacionEnEdicion.colaboradores.filter(id => id !== colId) })}
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
                                  value={fertilizacionEnEdicion.lote}
                                  onValueChange={(value) => {
                                    // Autofill: al elegir lote sin sublote,
                                    // se asume que fertilizó el lote completo →
                                    // suma las palmas de todos sus sublotes.
                                    const totalLote = sublotes
                                      .filter((s) => s.loteId === value)
                                      .reduce((acc, s) => acc + Number(s.cantidadPalmas ?? 0), 0);
                                    setFertilizacionEnEdicion({
                                      ...fertilizacionEnEdicion,
                                      lote: value,
                                      sublote: '',
                                      palmas: totalLote,
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
                                  value={fertilizacionEnEdicion.sublote}
                                  onValueChange={(value) => {
                                    const sub = sublotes.find(s => s.id === value);
                                    setFertilizacionEnEdicion({
                                      ...fertilizacionEnEdicion,
                                      sublote: value,
                                      palmas: Number(sub?.cantidadPalmas ?? 0),
                                    });
                                  }}
                                  disabled={!fertilizacionEnEdicion.lote}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sublote" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sublotes
                                      .filter(s => s.loteId === fertilizacionEnEdicion.lote)
                                      .map((sublote) => (
                                        <SelectItem key={sublote.id} value={sublote.id}>
                                          {sublote.nombre}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Palmas</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.palmas || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, palmas: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo de Fertilizante</Label>
                                <Select
                                  value={fertilizacionEnEdicion.tipoFertilizante}
                                  onValueChange={(value) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, tipoFertilizante: value, otroFertilizante: value !== 'Otro' ? '' : fertilizacionEnEdicion.otroFertilizante })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={insumosLista.length === 0 ? 'Sin insumos registrados' : 'Seleccionar tipo'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {insumosLista.length === 0 ? (
                                      <div className="px-2 py-3 text-xs text-muted-foreground">
                                        No hay insumos registrados. Agrégalos en Configuración → Insumos.
                                      </div>
                                    ) : (
                                      <>
                                        {insumosLista.map((fert) => (
                                          <SelectItem key={fert} value={fert}>
                                            {fert}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="Otro">Otro (especificar)</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              {fertilizacionEnEdicion.tipoFertilizante === 'Otro' && (
                                <div className="space-y-2">
                                  <Label>Especificar otro fertilizante</Label>
                                  <Input
                                    placeholder="Ingrese el tipo de fertilizante"
                                    value={fertilizacionEnEdicion.otroFertilizante || ''}
                                    onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, otroFertilizante: e.target.value })}
                                  />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Cantidad (gramos)</Label>
                                <Input
                                  type="number" step="0.001"
                                  placeholder="0"
                                  value={fertilizacionEnEdicion.cantidadGramos || ''}
                                  onChange={(e) => setFertilizacionEnEdicion({ ...fertilizacionEnEdicion, cantidadGramos: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelarFertilizacion} type="button">
                                Cancelar
                              </Button>
                              <Button onClick={guardarFertilizacion} className="gap-2" type="button">
                                <Save className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      )}

                      {/* Cards de fertilizaciones guardadas */}
                      {trabajosFertilizacion.map((trabajo) => {
                        const lote = lotesData.find(l => l.id === trabajo.lote);
                        const sublote = sublotes.find(s => s.id === trabajo.sublote);
                        const fertTipo = trabajo.tipoFertilizante === 'Otro' ? trabajo.otroFertilizante : trabajo.tipoFertilizante;
                        return (
                          <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
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
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-semibold text-sm">{lote?.nombre || 'Lote no especificado'}</h4>
                                    <p className="text-xs text-muted-foreground">{sublote?.nombre || 'Sublote no especificado'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Palmas</p>
                                  <p className="font-bold text-lg">{trabajo.palmas}</p>
                                </div>
                                <div className="text-right shrink-0 min-w-[100px]">
                                  <p className="text-xs text-muted-foreground">Fertilizante</p>
                                  <p className="font-semibold text-xs truncate">{fertTipo || 'No especificado'}</p>
                                  <p className="text-xs text-muted-foreground">{trabajo.cantidadGramos}g</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editarFertilizacion(trabajo.id)}
                                    disabled={fertilizacionEnEdicion !== null}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => eliminarFertilizacion(trabajo.id)}
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

                      {trabajosFertilizacion.length === 0 && !fertilizacionEnEdicion && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No hay registros de fertilización</p>
                          <p className="text-sm">Haz clic en "Agregar Fertilización" para crear uno</p>
                        </div>
                      )}
    </>
  );
}
