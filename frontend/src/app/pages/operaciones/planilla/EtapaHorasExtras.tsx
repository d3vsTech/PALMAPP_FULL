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
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={agregarHoraExtra} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Hora Extra
        </Button>
      </div>

      {/* Formulario de edición */}
      {horaExtraEnEdicion && (
        <div ref={setFormRef('horaExtra')} className="scroll-mt-24">
        <Card className="border-primary/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Horas Extras</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registra las horas extras de los colaboradores
                </p>
              </div>
            </div>
          </CardHeader>
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
                    {colaboradores.filter(c => !c.terceroNombre).map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.nombres} {col.apellidos}
                      </SelectItem>
                    ))}
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
                <Label>Número de Horas</Label>
                <Input
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
                <Label>Observación</Label>
                <Textarea
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
              <Button onClick={guardarHoraExtra} className="gap-2">
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
          <Card key={hora.id} className="border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Icon + Colaborador */}
                <div className="flex items-center gap-3">
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
                <div className="text-center shrink-0">
                  <p className="text-xs text-muted-foreground">Horas</p>
                  <p className="font-bold text-lg">{hora.numeroHoras}</p>
                </div>

                {/* Observación */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Observación</p>
                  <p className="text-sm truncate">{hora.observacion || 'Sin observación'}</p>
                </div>

                {/* Botón eliminar */}
                <div className="flex items-center gap-1 shrink-0">
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
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No hay horas extras registradas</p>
          <p className="text-sm">Haz clic en "Agregar Hora Extra" para crear una</p>
        </div>
      )}
    </div>
  );
}
