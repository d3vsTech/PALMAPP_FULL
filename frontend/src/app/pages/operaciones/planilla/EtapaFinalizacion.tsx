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
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import type { AusenteRegistro, ColaboradorWizard } from './tipos';

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
              <div className="grid gap-4 md:grid-cols-3">
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
                      {colaboradores
                        .filter(col => !col.terceroNombre)
                        .filter(col => !ausentes.some(a => a.colaboradorId === col.id))
                        .map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.nombres} {col.apellidos}
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
            </>
          )}

          {ausentes.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Colaborador</th>
                    <th className="text-left p-3 text-sm font-semibold">Motivo</th>
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
                    return (
                      <tr key={ausente.id} className="border-t border-border">
                        <td className="p-3 text-sm">
                          {col ? `${col.nombres} ${col.apellidos}` : '-'}
                        </td>
                        <td className="p-3 text-sm">{motivoMostrar}</td>
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
