/**
 * Etapa 4 del wizard de planilla — Horas Extras.
 * Extraída de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios.
 */
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Plus, Trash2, Pencil, Check, Clock } from 'lucide-react';
import type { HoraExtra, ColaboradorWizard } from './tipos';
import { opcionesSeleccionables } from './vinculacionPlanilla';
import { etiquetaVacaciones } from './vacacionesPlanilla';
import { etiquetaNovedad } from './novedadesPlanilla';

interface Props {
  horasExtras: HoraExtra[];
  horaExtraEnEdicion: HoraExtra | null;
  setHoraExtraEnEdicion: (h: HoraExtra) => void;
  colaboradores: ColaboradorWizard[];
  /** Nombres reales del tenant traídos por `wizard-init`. */
  tiposHoraExtraLista: string[];
  agregarHoraExtra: () => void;
  cancelarHoraExtra: () => void;
  guardarHoraExtra: () => void;
  editarHoraExtra: (id: string) => void;
  eliminarHoraExtra: (id: string) => void;
  setFormRef: (key: string) => (el: HTMLDivElement | null) => void;
}

export function EtapaHorasExtras({
  horasExtras,
  horaExtraEnEdicion,
  setHoraExtraEnEdicion,
  colaboradores,
  tiposHoraExtraLista,
  agregarHoraExtra,
  cancelarHoraExtra,
  guardarHoraExtra,
  editarHoraExtra,
  eliminarHoraExtra,
  setFormRef,
}: Props) {  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
              <Clock className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <div>
              <CardTitle>Horas extras</CardTitle>
              <p className="text-sm text-muted-foreground">
                Registra las horas extras de los colaboradores
              </p>
            </div>
          </div>
          <Button onClick={agregarHoraExtra} className="self-end sm:self-auto">
            <Plus className="h-4 w-4" />
            Agregar hora extra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

      {/* Formulario de edición */}
      {horaExtraEnEdicion && (
        <div ref={setFormRef('horaExtra')} className="scroll-mt-24">
        <Card className="border-primary/40 bg-muted/40">
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Colaborador (siempre primero) */}
              <div className="space-y-2 md:col-span-2">
                <Label>Colaborador</Label>
                <Select
                  value={horaExtraEnEdicion.colaboradorId}
                  onValueChange={(value) => {
                    setHoraExtraEnEdicion({ ...horaExtraEnEdicion, colaboradorId: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Otro selector sin XOR de operario (paso 4/5). */}
                    {opcionesSeleccionables(colaboradores, [horaExtraEnEdicion.colaboradorId])
                      .filter(c => !c.terceroNombre).map((col) => {
                      // PR-N3: una incapacidad o un permiso vigente deja el
                      // día sin jornada, así que tampoco hay horas extra.
                      const bloqueado = !!col.enVacaciones || !!col.novedadVigente;
                      return (
                        <SelectItem key={col.id} value={col.id} disabled={bloqueado}>
                          {col.nombres} {col.apellidos}
                          {col.enVacaciones && (
                            <span className="ml-2 text-xs text-warning">
                              {etiquetaVacaciones(col.enVacaciones)}
                            </span>
                          )}
                          {!col.enVacaciones && col.novedadVigente && (
                            <span className="ml-2 text-xs text-warning">
                              {etiquetaNovedad(col.novedadVigente)}
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Hora</Label>
                <Select
                  value={horaExtraEnEdicion.tipoHora}
                  onValueChange={(value) => {
                    setHoraExtraEnEdicion({ ...horaExtraEnEdicion, tipoHora: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      tiposHoraExtraLista.length === 0
                        ? 'No hay tipos configurados'
                        : 'Seleccionar tipo de hora'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Usa los nombres reales del tenant traídos por
                        `wizard-init`; el hardcoded viejo `tiposHoraExtra`
                        no matcheaba con `tiposHoraExtraMap` al guardar. */}
                    {tiposHoraExtraLista.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etapahoras-numero-de-horas">Número de Horas</Label>
                <Input id="etapahoras-numero-de-horas"
                  type="number" step="0.001"
                  placeholder="0"
                  value={horaExtraEnEdicion.numeroHoras || ''}
                  onChange={(e) => {
                    setHoraExtraEnEdicion({
                      ...horaExtraEnEdicion,
                      numeroHoras: parseFloat(e.target.value) || 0
                    });
                  }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="etapahoras-observacion">Observación</Label>
                <Textarea id="etapahoras-observacion"
                  placeholder="Observaciones sobre la hora extra..."
                  value={horaExtraEnEdicion.observacion}
                  onChange={(e) => {
                    setHoraExtraEnEdicion({ ...horaExtraEnEdicion, observacion: e.target.value });
                  }}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={cancelarHoraExtra}>
                Cancelar
              </Button>
              <Button onClick={guardarHoraExtra}>
                <Check className="h-4 w-4" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Lista de horas extras guardadas */}
      {horasExtras.map((hora) => {
        const colaborador = colaboradores.find(c => c.id === hora.colaboradorId);

        return (
          <Card key={hora.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Icon + Colaborador */}
                <div className="order-first flex min-w-0 flex-1 basis-auto items-center gap-3 md:order-none md:flex-none">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {colaborador ? `${colaborador.nombres} ${colaborador.apellidos}` : 'Sin colaborador'}
                    </h4>
                    <p className="text-xs text-muted-foreground">{hora.tipoHora}</p>
                  </div>
                </div>

                {/* Horas */}
                <div className="flex w-full shrink-0 items-baseline justify-between md:block md:w-auto md:text-center">
                  <p className="text-xs text-muted-foreground">Horas</p>
                  <p className="text-lg font-bold tabular-nums">{hora.numeroHoras}</p>
                </div>

                {/* Observación */}
                <div className="min-w-0 flex-1 basis-full md:basis-0">
                  <p className="text-xs text-muted-foreground">Observación</p>
                  <p className="text-sm truncate">{hora.observacion || 'Sin observación'}</p>
                </div>

                {/* Botón eliminar */}
                <div className="order-first ml-auto flex shrink-0 items-center gap-1 md:order-none md:ml-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editarHoraExtra(hora.id)}
                    disabled={horaExtraEnEdicion !== null}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarHoraExtra(hora.id)}
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

      {horasExtras.length === 0 && !horaExtraEnEdicion && (
        <div className="space-y-1 py-12 text-center">
          <h3 className="text-base font-semibold text-foreground">Todavía no hay horas extras</h3>
          <p className="text-sm text-muted-foreground">Agrégalas con el botón de arriba.</p>
        </div>
      )}

      </CardContent>
    </Card>
  );
}
