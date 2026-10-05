/**
 * Paso 2: datos de la novedad.
 *
 * Lo que se pide depende de la pestaña: una ausencia admite rango y horario,
 * una solicitud de vacaciones pide días hábiles o fecha fin, y una terminación
 * pide la causa del catálogo de retiro.
 */
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { AlertCircle, Clock, FileText, Info } from 'lucide-react';
import { BuscadorColaborador } from './BuscadorColaborador';
import { CampoAdjunto } from './CampoAdjunto';
import { CalendarioSolicitud } from './CalendarioSolicitud';
import {
  esAusencia, esParcial, esTerminacion, esVacaciones, type BorradorNovedad,
} from '../borrador';
import type { CategoriaInit } from '../../../../api/novedades';
import {
  calcularDias, esIncapacidad, etiquetaDias, formatHora, formatPorcentaje,
} from '../tipos';

const CLASE_TEXTAREA =
  'flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  borrador: BorradorNovedad;
  /** Para leer `motivos_retiro[]` de la pestaña de terminación. */
  categorias: CategoriaInit[];
  soporte: { mimes: string[]; max_kb: number };
  onCambiar: (parcial: Partial<BorradorNovedad>) => void;
}

export function PasoDetalles({ borrador, categorias, soporte, onCambiar }: Props) {
  const ausencia = esAusencia(borrador);
  const vacaciones = esVacaciones(borrador);
  const terminacion = esTerminacion(borrador);
  const parcial = esParcial(borrador);
  const motivo = borrador.motivo;

  const motivosRetiro = categorias.find((c) => c.codigo === 'TERMINACION_CONTRATO')?.motivos_retiro ?? [];
  const dias = calcularDias(borrador.fechaInicio, borrador.fechaFin || borrador.fechaInicio);

  const titulo = terminacion
    ? 'Datos de la terminación'
    : vacaciones ? 'Datos de la solicitud' : 'Datos de la novedad';

  return (
    <Card className="border-border">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            {motivo ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs" style={motivo.color ? { borderColor: motivo.color, color: motivo.color } : undefined}>
                  {motivo.nombre}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {motivo.es_remunerada ? `Remunerado ${formatPorcentaje(motivo.porcentaje_pago_default)}` : 'No remunerado'}
                  {' · '}
                  {motivo.afecta_auxilio_transporte ? 'descuenta auxilio' : 'conserva el auxilio'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {vacaciones ? 'Queda pendiente hasta que Liquidaciones la apruebe' : 'Registra el retiro del colaborador'}
              </p>
            )}
          </div>
        </div>

        <BuscadorColaborador
          fecha={borrador.fechaInicio}
          seleccionadoId={borrador.colaboradorId}
          nombreInicial={borrador.colaboradorNombre}
          onSeleccionar={(colaboradorId, colaboradorNombre) => onCambiar({ colaboradorId, colaboradorNombre })}
        />

        {/* ── Fechas ────────────────────────────────────────────────────── */}
        {terminacion ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fecha de retiro <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Puede ser futura: la ficha se apaga ese día.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Causa de terminación <span className="text-destructive">*</span></Label>
              <Select
                value={borrador.motivoRetiro}
                onValueChange={(motivoRetiro) => onCambiar({ motivoRetiro })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar causa..." /></SelectTrigger>
                <SelectContent>
                  {motivosRetiro.map((m) => (
                    <SelectItem key={m.codigo} value={m.codigo}>
                      {m.etiqueta}{m.indemniza ? ' (indemniza)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : vacaciones ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Fecha de inicio <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Debe ser hoy o posterior, y día hábil.</p>
            </div>
            <div className="space-y-1.5">
              <Label>
                Días hábiles
                {borrador.campoVacaciones === 'FECHA' && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(calculado)</span>
                )}
              </Label>
              <Input
                type="number" min={1} max={60} placeholder="15"
                value={borrador.diasHabiles}
                onChange={(e) => onCambiar({ diasHabiles: e.target.value, campoVacaciones: 'DIAS' })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                o Fecha fin
                {borrador.campoVacaciones === 'DIAS' && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(calculada)</span>
                )}
              </Label>
              <Input
                type="date"
                value={borrador.fechaFin}
                min={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaFin: e.target.value, campoVacaciones: 'FECHA' })}
              />
            </div>
            {/* El calendario del backend cierra el campo que el usuario no
                llenó: va fuera de la rejilla para ocupar las tres columnas. */}
            <div className="sm:col-span-3">
              <CalendarioSolicitud
                fechaInicio={borrador.fechaInicio}
                diasHabiles={borrador.diasHabiles}
                fechaFin={borrador.fechaFin}
                campo={borrador.campoVacaciones}
                onCambiar={onCambiar}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fecha de inicio <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Input
                type="date"
                value={borrador.fechaFin}
                min={borrador.fechaInicio}
                disabled={parcial}
                onChange={(e) => onCambiar({ fechaFin: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {parcial ? 'Una novedad con horario es de un solo día.' : 'Vacío = un solo día.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Horario: cualquier ausencia puede ser parcial ─────────────── */}
        {ausencia && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Horario <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
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
            {parcial && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-4 py-2.5 text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  De {formatHora(borrador.horaInicio)} a {formatHora(borrador.horaFin)}. Es informativa:
                  no cuenta como día de ausencia en nómina ni cubre el día en la planilla.
                </span>
              </div>
            )}
          </div>
        )}

        {ausencia && !parcial && borrador.fechaInicio && dias > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">Días de novedad:</span>
            <span className="font-bold text-primary">{dias} {etiquetaDias(dias)}</span>
          </div>
        )}

        {/* ── Incapacidades: entidad y radicado ─────────────────────────── */}
        {esIncapacidad(motivo) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Entidad (EPS o ARL)</Label>
              <Input
                placeholder="Ej: EPS SURA"
                maxLength={100}
                value={borrador.entidad}
                onChange={(e) => onCambiar({ entidad: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número de radicado</Label>
              <Input
                placeholder="Ej: INC-2026-0412"
                maxLength={50}
                value={borrador.numeroRadicado}
                onChange={(e) => onCambiar({ numeroRadicado: e.target.value })}
              />
            </div>
          </div>
        )}

        {terminacion && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Esto no liquida</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                Al confirmar queda el retiro en la ficha y el contrato terminado. La liquidación
                final se hace después, desde el enlace que aparece al terminar.
              </p>
            </div>
          </div>
        )}

        <CampoAdjunto
          etiqueta={terminacion ? 'Carta o acta de terminación' : vacaciones ? 'Carta de solicitud' : 'Soporte'}
          ayuda={
            terminacion
              ? 'Solo PDF.'
              : motivo?.requiere_soporte
                ? 'Este motivo pide soporte. Si no lo tiene ahora, puede adjuntarlo después desde el detalle.'
                : undefined
          }
          mimes={terminacion ? ['pdf'] : soporte.mimes}
          maxKb={soporte.max_kb}
          archivo={borrador.documento}
          onCambiar={(documento) => onCambiar({ documento })}
        />

        <div className="space-y-1.5">
          <Label>
            Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <textarea
            value={borrador.observacion}
            onChange={(e) => onCambiar({ observacion: e.target.value })}
            rows={3}
            maxLength={terminacion ? 500 : 2000}
            placeholder="Detalles adicionales sobre la novedad..."
            className={CLASE_TEXTAREA}
          />
        </div>
      </CardContent>
    </Card>
  );
}
