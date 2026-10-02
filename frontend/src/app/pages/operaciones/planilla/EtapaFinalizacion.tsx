/**
 * Etapa 5 del wizard de planilla — Finalización (observaciones y ausentes).
 * Extraída de NuevaPlanillaWizard.tsx tal cual; el estado vive en el padre
 * y llega por props. JSX sin cambios.
 */
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Plus, Trash2, ClipboardList, Info } from 'lucide-react';
import type { AusenteRegistro, ColaboradorWizard } from './tipos';
import { opcionesSeleccionables } from './vinculacionPlanilla';
import { etiquetaVacaciones } from './vacacionesPlanilla';
import { etiquetaNovedad } from './novedadesPlanilla';

interface Props {
  modoLectura: boolean;
  observaciones: string;
  setObservaciones: (v: string) => void;
  colaboradores: ColaboradorWizard[];
  ausentes: AusenteRegistro[];
  colaboradorAusenteSeleccionado: string;
  setColaboradorAusenteSeleccionado: (v: string) => void;
  motivoAusenteSeleccionado: string;
  setMotivoAusenteSeleccionado: (v: string) => void;
  setOtroMotivoAusente: (v: string) => void;
  /** PR-N3 — fecha de la planilla; es el piso del campo "Hasta". */
  fecha: string;
  hastaAusente: string;
  setHastaAusente: (v: string) => void;
  horaInicioAusente: string;
  setHoraInicioAusente: (v: string) => void;
  horaFinAusente: string;
  setHoraFinAusente: (v: string) => void;
  motivosLista: string[];
  motivosMap: Map<string, number>;
  agregarAusente: () => void;
  eliminarAusente: (id: string) => void;
}

export function EtapaFinalizacion({
  modoLectura,
  observaciones,
  setObservaciones,
  colaboradores,
  ausentes,
  colaboradorAusenteSeleccionado,
  setColaboradorAusenteSeleccionado,
  motivoAusenteSeleccionado,
  setMotivoAusenteSeleccionado,
  setOtroMotivoAusente,
  fecha,
  hastaAusente,
  setHastaAusente,
  horaInicioAusente,
  setHoraInicioAusente,
  horaFinAusente,
  setHoraFinAusente,
  motivosLista,
  motivosMap,
  agregarAusente,
  eliminarAusente,
}: Props) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Finalización</CardTitle>
            <p className="text-sm text-muted-foreground">
              Observaciones y ausentes
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            placeholder="Notas o comentarios sobre la jornada..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <Label>Novedades</Label>
          {!modoLectura && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="colaboradorAusente">Colaborador</Label>
                  <Select
                    value={colaboradorAusenteSeleccionado}
                    onValueChange={setColaboradorAusenteSeleccionado}
                  >
                    <SelectTrigger id="colaboradorAusente">
                      <SelectValue placeholder="Seleccionar colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Ausencias: solo empleados propios.
                          §5 del doc no contempla operario_id. */}
                      {opcionesSeleccionables(colaboradores)
                        .filter(col => !col.terceroNombre)
                        .filter(col => !ausentes.some(a => a.colaboradorId === col.id))
                        .map((col) => (
                          /* PR-L8: unas vacaciones ya son la novedad del día.
                             Aquí no hay salida: no existe caso válido para
                             registrarle falta a alguien de vacaciones. */
                          <SelectItem
                            key={col.id}
                            value={col.id}
                            disabled={!!col.enVacaciones || !!col.novedadVigente}
                          >
                            {col.nombres} {col.apellidos}
                            {col.enVacaciones && (
                              <span className="ml-2 text-xs text-amber-700 dark:text-amber-500">
                                {etiquetaVacaciones(col.enVacaciones)}
                              </span>
                            )}
                            {/* PR-N3: dos novedades el mismo día chocan con
                                422 NOVEDAD_SOLAPADA. Se bloquea antes. */}
                            {!col.enVacaciones && col.novedadVigente && (
                              <span className="ml-2 text-xs text-amber-700 dark:text-amber-500">
                                {etiquetaNovedad(col.novedadVigente)}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivoAusente">Motivo</Label>
                  <Select
                    value={motivoAusenteSeleccionado}
                    onValueChange={(value) => {
                      setMotivoAusenteSeleccionado(value);
                      if (value !== 'Otro') {
                        setOtroMotivoAusente('');
                      }
                    }}
                  >
                    <SelectTrigger id="motivoAusente">
                      <SelectValue placeholder="Seleccionar motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {motivosLista.map((motivo) => (
                        <SelectItem key={motivo} value={motivo}>
                          {motivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PR-N3 — "Hasta" y "Horario". Antes solo existía la fecha de
                  la planilla, así que una incapacidad de 10 días se guardaba
                  como un día y volvía a pedirse en cada planilla siguiente. */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="hastaAusente">Hasta</Label>
                  <Input
                    id="hastaAusente"
                    type="date"
                    value={hastaAusente}
                    min={fecha || undefined}
                    disabled={!!horaInicioAusente || !!horaFinAusente}
                    onChange={(e) => setHastaAusente(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vacío = solo el día de la planilla
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaInicioAusente">Horario (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="horaInicioAusente"
                      type="time"
                      value={horaInicioAusente}
                      disabled={!!hastaAusente}
                      onChange={(e) => setHoraInicioAusente(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      aria-label="Hora de fin"
                      type="time"
                      value={horaFinAusente}
                      disabled={!!hastaAusente}
                      onChange={(e) => setHoraFinAusente(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button
                    type="button"
                    onClick={agregarAusente}
                    disabled={!colaboradorAusenteSeleccionado || !motivoAusenteSeleccionado}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>

              {(horaInicioAusente || horaFinAusente) && (
                <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Con horario la novedad es informativa: se registra el permiso
                    por horas pero el día sigue contando como trabajado en nómina.
                  </p>
                </div>
              )}
            </>
          )}

          {ausentes.length > 0 && (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Colaborador</th>
                    <th className="text-left p-3 text-sm font-semibold">Motivo</th>
                    <th className="text-left p-3 text-sm font-semibold">Periodo</th>
                    <th className="text-right p-3 text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ausentes.map((ausente) => {
                    const col = colaboradores.find(c => c.id === ausente.colaboradorId);
                    // El campo `motivo` (texto libre) del backend
                    // es la fuente de verdad — es lo que el usuario
                    // escribió/eligió al crear la ausencia. Se
                    // carga en `otroMotivo` desde el prefill.
                    // Prioridad de display:
                    // 1) texto libre del backend (`otroMotivo`).
                    // 2) nombre del catálogo (fallback).
                    // 3) lookup por ID contra `motivosMap`.
                    // 4) '—' si nada.
                    let motivoMostrar = ausente.otroMotivo || ausente.motivo;
                    if (!motivoMostrar && ausente.motivoAusenciaId != null) {
                      for (const [n, id] of motivosMap.entries()) {
                        if (id === ausente.motivoAusenciaId) { motivoMostrar = n; break; }
                      }
                    }
                    motivoMostrar = motivoMostrar || '—';
                    // PR-N3 — el periodo real de la novedad: un rango, un
                    // horario o el día de la planilla.
                    const periodo = ausente.horaInicio && ausente.horaFin
                      ? `${ausente.horaInicio} a ${ausente.horaFin}`
                      : ausente.fechaFin && ausente.fechaFin !== fecha
                        ? `${fecha} al ${ausente.fechaFin}`
                        : fecha || 'Un día';
                    return (
                      <tr key={ausente.id} className="border-t border-border">
                        <td className="p-3 text-sm">
                          {col ? `${col.nombres} ${col.apellidos}` : '-'}
                        </td>
                        <td className="p-3 text-sm">{motivoMostrar}</td>
                        <td className="p-3 text-sm">
                          {periodo}
                          {ausente.horaInicio && (
                            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                              Parcial
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarAusente(ausente.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {ausentes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <p className="text-sm">No hay ausentes registrados</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
