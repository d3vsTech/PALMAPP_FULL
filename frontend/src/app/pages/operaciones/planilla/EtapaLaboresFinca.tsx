/**
 * Etapa 3 del wizard de planilla — Labores de Finca (auxiliares).
 * Extraída de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios.
 */
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import type { TrabajoAuxiliar, ColaboradorWizard } from './tipos';

interface Props {
  trabajosAuxiliares: TrabajoAuxiliar[];
  auxiliarEnEdicion: TrabajoAuxiliar | null;
  setAuxiliarEnEdicion: (t: TrabajoAuxiliar) => void;
  colaboradores: ColaboradorWizard[];
  laboresLista: string[];
  agregarAuxiliar: () => void;
  cancelarAuxiliar: () => void;
  guardarAuxiliar: () => void;
  editarAuxiliar: (id: string) => void;
  eliminarAuxiliar: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function EtapaLaboresFinca({
  trabajosAuxiliares,
  auxiliarEnEdicion,
  setAuxiliarEnEdicion,
  colaboradores,
  laboresLista,
  agregarAuxiliar,
  cancelarAuxiliar,
  guardarAuxiliar,
  editarAuxiliar,
  eliminarAuxiliar,
  setFormRef,
}: Props) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Labores de Finca</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reparaciones, mantenimiento y trabajos complementarios
            </p>
          </div>
          <Button
            onClick={agregarAuxiliar}
            className="gap-2"
            disabled={auxiliarEnEdicion !== null}
          >
            <Plus className="h-4 w-4" />
            Agregar Labor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario de edición */}
        {auxiliarEnEdicion && (
          <div ref={setFormRef('auxiliar')} className="scroll-mt-24">
          <Card className="border-border border-2 border-primary/50">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select
                    value={auxiliarEnEdicion.nombre}
                    onValueChange={(value) =>
                      setAuxiliarEnEdicion({ ...auxiliarEnEdicion, nombre: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Labores de Finca §3.3 — sí soporta operarios
                          (mismo endpoint /jornales que palma). El
                          `value` es el id local (`10` o `'O_5'`)
                          para distinguir colaborador vs operario
                          al guardar. Visualmente muestra el nombre
                          con badge "Tercero" si aplica. */}
                      {colaboradores.map((col) => {
                        const fullName = `${col.nombres} ${col.apellidos}`.trim();
                        return (
                          <SelectItem key={col.id} value={col.id}>
                            {fullName}
                            {col.terceroNombre ? (
                              <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle">
                                Tercero · {col.terceroNombre}
                              </span>
                            ) : null}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Labor</Label>
                  <Select
                    value={auxiliarEnEdicion.labor}
                    onValueChange={(value) =>
                      setAuxiliarEnEdicion({
                        ...auxiliarEnEdicion,
                        labor: value,
                        otraLabor: value !== 'Otro' ? '' : auxiliarEnEdicion.otraLabor,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar labor" />
                    </SelectTrigger>
                    <SelectContent>
                      {laboresLista.length === 0 ? (
                        <SelectItem value="__sin_labores__" disabled>
                          No hay labores configuradas
                        </SelectItem>
                      ) : (
                        laboresLista.map((labor) => (
                          <SelectItem key={labor} value={labor}>
                            {labor}
                          </SelectItem>
                        ))
                      )}
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {auxiliarEnEdicion.labor === 'Otro' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Especificar otra labor</Label>
                    <Input
                      placeholder="Ingrese el tipo de labor"
                      value={auxiliarEnEdicion.otraLabor || ''}
                      onChange={(e) =>
                        setAuxiliarEnEdicion({ ...auxiliarEnEdicion, otraLabor: e.target.value })
                      }
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Lugar</Label>
                  <Input
                    placeholder="Ubicación"
                    value={auxiliarEnEdicion.lugar}
                    onChange={(e) =>
                      setAuxiliarEnEdicion({ ...auxiliarEnEdicion, lugar: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={cancelarAuxiliar} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={guardarAuxiliar} className="gap-2 bg-success hover:bg-success/90">
                  <Save className="h-4 w-4" />
                  Guardar Labor
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Cards de labores guardadas */}
        {trabajosAuxiliares.map((trabajo) => {
          const labelLabor =
            trabajo.labor === 'Otro' && trabajo.otraLabor ? trabajo.otraLabor : trabajo.labor;
          // `trabajo.nombre` ahora es el id local — resolvemos al
          // nombre vía lookup en `colaboradores`. Si la persona
          // es operario, mostramos el badge del tercero.
          const personaSel = colaboradores.find((c) => c.id === trabajo.nombre);
          const personaTexto = personaSel
            ? `${personaSel.nombres} ${personaSel.apellidos}`.trim()
            : trabajo.nombre || 'Sin colaborador';
          return (
            <Card key={trabajo.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Colaborador</p>
                    <p className="font-semibold text-sm">
                      {personaTexto}
                      {personaSel?.terceroNombre ? (
                        <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 font-medium align-middle">
                          Tercero · {personaSel.terceroNombre}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Labor</p>
                    <p className="text-sm font-medium">{labelLabor || 'Sin labor'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Lugar</p>
                    <p className="text-sm">{trabajo.lugar || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editarAuxiliar(trabajo.id)}
                      disabled={auxiliarEnEdicion !== null}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarAuxiliar(trabajo.id)}
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

        {trabajosAuxiliares.length === 0 && !auxiliarEnEdicion && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay registros de labores de finca</p>
            <p className="text-sm">Haz clic en "Agregar Labor" para crear uno</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
