/**
 * Paso 2: datos de la novedad.
 *
 * Los campos que se muestran dependen del tipo elegido: horario solo si lo
 * exige, radicado y diagnóstico solo en incapacidades, causa solo en
 * terminaciones. Todo sale del catálogo, no de condiciones sueltas aquí.
 */
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { AlertCircle, Clock, FileText, Info } from 'lucide-react';
import { BuscadorColaborador } from './BuscadorColaborador';
import { CampoAdjunto } from './CampoAdjunto';
import type { BorradorNovedad } from '../borrador';
import {
  TIPOS_NOVEDAD, calcularDias, causasDe, esIncapacidad, esTerminacion,
  etiquetaDias, formatHora, type Colaborador, type TipoNovedad,
} from '../tipos';

const CLASE_SELECT =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  tipo: TipoNovedad;
  borrador: BorradorNovedad;
  colaboradores: Colaborador[];
  onCambiar: (parcial: Partial<BorradorNovedad>) => void;
}

export function PasoDetalles({ tipo, borrador, colaboradores, onCambiar }: Props) {
  const info = TIPOS_NOVEDAD[tipo];
  const terminacion = esTerminacion(tipo);
  const incapacidad = esIncapacidad(tipo);
  const dias = calcularDias(borrador.fechaInicio, borrador.fechaFin);

  return (
    <Card className="border-border">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Detalles de la novedad</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${info.dot}`} />
              <Badge variant="outline" className={`text-xs ${info.color}`}>{info.label}</Badge>
            </div>
          </div>
        </div>

        <BuscadorColaborador
          colaboradores={colaboradores}
          seleccionadoId={borrador.colaboradorId}
          onSeleccionar={(colaboradorId) => onCambiar({ colaboradorId })}
        />

        <div className={`grid gap-4 ${terminacion ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label>{terminacion ? 'Fecha efectiva de terminación' : 'Fecha inicio'}</Label>
            <Input
              type="date"
              value={borrador.fechaInicio}
              onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
            />
          </div>
          {!terminacion && (
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={borrador.fechaFin}
                min={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaFin: e.target.value })}
              />
            </div>
          )}
        </div>

        {info.requiereHoras && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Horario</Label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Hora inicio</Label>
                <Input
                  type="time"
                  value={borrador.horaInicio}
                  onChange={(e) => onCambiar({ horaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Hora fin</Label>
                <Input
                  type="time"
                  value={borrador.horaFin}
                  min={borrador.horaInicio}
                  onChange={(e) => onCambiar({ horaFin: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {!terminacion && dias > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">Días de novedad:</span>
            <span className="font-bold text-primary">{dias} {etiquetaDias(dias)}</span>
            {info.requiereHoras && borrador.horaInicio && borrador.horaFin && (
              <>
                <span className="mx-1 text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {formatHora(borrador.horaInicio)} – {formatHora(borrador.horaFin)}
                </span>
              </>
            )}
          </div>
        )}

        {incapacidad && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Número de radicado</Label>
              <Input
                placeholder="Ej: 2026-88210"
                value={borrador.radicado}
                onChange={(e) => onCambiar({ radicado: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnóstico (CIE-10)</Label>
              <Input
                placeholder="Ej: J06 - Infección respiratoria"
                value={borrador.diagnostico}
                onChange={(e) => onCambiar({ diagnostico: e.target.value })}
              />
            </div>
          </div>
        )}

        {terminacion && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Causa de terminación</Label>
              <select
                value={borrador.causaTerminacion}
                onChange={(e) => onCambiar({ causaTerminacion: e.target.value })}
                className={CLASE_SELECT}
              >
                <option value="">Seleccionar causa...</option>
                {causasDe(tipo).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Genera liquidación final</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  Al confirmar esta novedad, se creará automáticamente una liquidación final
                  pendiente para el colaborador.
                </p>
              </div>
            </div>
          </div>
        )}

        {info.tieneAdjunto && (
          <CampoAdjunto
            etiqueta={info.labelAdjunto}
            archivo={borrador.adjunto}
            onCambiar={(adjunto) => onCambiar({ adjunto })}
          />
        )}

        <div className="space-y-1.5">
          <Label>
            Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <textarea
            value={borrador.observaciones}
            onChange={(e) => onCambiar({ observaciones: e.target.value })}
            rows={3}
            placeholder="Detalles adicionales sobre la novedad..."
            className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </CardContent>
    </Card>
  );
}
