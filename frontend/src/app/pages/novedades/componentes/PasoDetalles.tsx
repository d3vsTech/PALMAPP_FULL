/**
 * Paso 2: datos de la novedad.
 *
 * Lo que se pide depende de la pestaña: una ausencia admite rango y horario,
 * una solicitud de vacaciones pide días hábiles o fecha fin, y una terminación
 * pide la causa del catálogo de retiro.
 */
import { useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { AlertCircle, Clock, Info } from 'lucide-react';
import { BuscadorColaborador } from './BuscadorColaborador';
import { CampoAdjunto } from './CampoAdjunto';
import { CalendarioSolicitud } from './CalendarioSolicitud';
import {
  esAusencia, esParcial, esTerminacion, esVacaciones, type BorradorNovedad,
} from '../borrador';
import type { CategoriaInit } from '../../../../api/novedades';
import {
  calcularDias, entidadDeLaFicha, esIncapacidad, etiquetaDias, formatHora, formatPorcentaje,
} from '../tipos';

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

  /*
   * La entidad se rellena sola desde la ficha, pero queda editable. Aquí se
   * guarda lo último que puso el formulario: si el campo sigue igual, al
   * cambiar de colaborador se reemplaza por la afiliación del nuevo; si el
   * usuario lo corrigió a mano, se respeta.
   */
  const entidadAutomatica = useRef('');

  const motivosRetiro = categorias.find((c) => c.codigo === 'TERMINACION_CONTRATO')?.motivos_retiro ?? [];
  const dias = calcularDias(borrador.fechaInicio, borrador.fechaFin || borrador.fechaInicio);

  const titulo = terminacion
    ? 'Detalles de la terminación'
    : vacaciones ? 'Detalles de la solicitud' : 'Detalles de la novedad';

  const descripcion = terminacion
    ? 'Colaborador, fecha de retiro y causa de la terminación.'
    : vacaciones
      ? 'Colaborador, fechas del disfrute y soportes de la solicitud.'
      : 'Colaborador, fechas y soportes de la novedad.';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{titulo}</CardTitle>
          {motivo && (
            <Badge
              variant="outline"
              style={motivo.color ? { borderColor: motivo.color, color: motivo.color } : undefined}
            >
              {motivo.nombre}
            </Badge>
          )}
        </div>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {motivo && (
          <p className="text-sm text-muted-foreground">
            {motivo.es_remunerada
              ? `Remunerado ${formatPorcentaje(motivo.porcentaje_pago_default)}`
              : 'No remunerado'}
            {' · '}
            {motivo.afecta_auxilio_transporte ? 'descuenta auxilio' : 'conserva el auxilio'}
          </p>
        )}

        {/* El porcentaje del motivo cubre un solo tramo del escalón legal.
            Sin decirlo, quien registra una incapacidad larga la parte en dos
            para aplicar el 50 % a mano, y la nómina lo haría dos veces
            (API_NOMINA §9.6). */}
        {motivo?.tipo_base === 'INCAPACIDAD_EPS' && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ese porcentaje aplica del día 3 al 90. La nómina paga los dos primeros días al 100 %
            por cuenta de la empresa y baja al 50 % del día 91 en adelante, sin bajar nunca del
            mínimo diario. Registre la incapacidad completa: no hay que partirla.
          </p>
        )}

        <BuscadorColaborador
          fecha={borrador.fechaInicio}
          seleccionadoId={borrador.colaboradorId}
          nombreInicial={borrador.colaboradorNombre}
          onSeleccionar={(colaboradorId, colaboradorNombre, colaborador) => {
            const cambios: Partial<BorradorNovedad> = { colaboradorId, colaboradorNombre };
            /*
             * En una incapacidad la entidad casi siempre es la afiliación de
             * la ficha, y tenerla que copiar a mano es un paso de más donde
             * además se escribe mal. Queda editable: hay traslados que
             * todavía no se reflejan en la ficha.
             */
            const escritoAMano =
              borrador.entidad.trim() !== '' &&
              borrador.entidad.trim() !== entidadAutomatica.current.trim();
            if (esIncapacidad(motivo) && !escritoAMano) {
              const entidad = entidadDeLaFicha(colaborador, motivo);
              entidadAutomatica.current = entidad;
              cambios.entidad = entidad;
            }
            onCambiar(cambios);
          }}
        />

        {/* ── Fechas ────────────────────────────────────────────────────── */}
        {terminacion ? (
          <div className="space-y-2">
            <Label htmlFor="novedad-fecha-terminacion">
              Fecha efectiva de terminación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="novedad-fecha-terminacion"
              type="date"
              value={borrador.fechaInicio}
              onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Puede ser futura: la ficha se apaga ese día.
            </p>
          </div>
        ) : vacaciones ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="novedad-fecha-inicio">
                Fecha de inicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="novedad-fecha-inicio"
                type="date"
                value={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Debe ser hoy o posterior, y día hábil.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="novedad-dias-habiles">
                Días hábiles
                {borrador.campoVacaciones === 'FECHA' && (
                  <span className="ml-1 font-normal text-muted-foreground">(calculado)</span>
                )}
              </Label>
              <Input
                id="novedad-dias-habiles"
                type="number" min={1} max={60} placeholder="15"
                value={borrador.diasHabiles}
                onChange={(e) => onCambiar({ diasHabiles: e.target.value, campoVacaciones: 'DIAS' })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novedad-fecha-fin">
                o Fecha de fin
                {borrador.campoVacaciones === 'DIAS' && (
                  <span className="ml-1 font-normal text-muted-foreground">(calculada)</span>
                )}
              </Label>
              <Input
                id="novedad-fecha-fin"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="novedad-fecha-inicio">
                Fecha de inicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="novedad-fecha-inicio"
                type="date"
                value={borrador.fechaInicio}
                onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novedad-fecha-fin">
                Fecha de fin <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="novedad-fecha-fin"
                type="date"
                value={borrador.fechaFin}
                min={borrador.fechaInicio}
                disabled={parcial}
                onChange={(e) => onCambiar({ fechaFin: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {parcial
                  ? 'Con horario la novedad cubre un solo día.'
                  : 'Déjelo en blanco si la novedad es de un solo día.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Horario: cualquier ausencia puede ser parcial ─────────────── */}
        {ausencia && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <Label>
                Horario <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-normal text-muted-foreground" htmlFor="novedad-hora-inicio">
                  Hora de inicio
                </Label>
                <Input
                  id="novedad-hora-inicio"
                  type="time"
                  value={borrador.horaInicio}
                  onChange={(e) => onCambiar({ horaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-normal text-muted-foreground" htmlFor="novedad-hora-fin">
                  Hora de fin
                </Label>
                <Input
                  id="novedad-hora-fin"
                  type="time"
                  value={borrador.horaFin}
                  min={borrador.horaInicio}
                  onChange={(e) => onCambiar({ horaFin: e.target.value })}
                />
              </div>
            </div>
            {parcial && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <span className="text-muted-foreground">
                  De {formatHora(borrador.horaInicio)} a {formatHora(borrador.horaFin)}. Es informativa:
                  no cuenta como día de ausencia en nómina ni cubre el día en la planilla.
                </span>
              </div>
            )}
          </div>
        )}

        {ausencia && !parcial && borrador.fechaInicio && dias > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="text-muted-foreground">Días de novedad:</span>
            <span className="font-semibold text-foreground">{dias} {etiquetaDias(dias)}</span>
          </div>
        )}

        {/* ── Incapacidades: entidad y radicado ─────────────────────────── */}
        {esIncapacidad(motivo) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="novedad-entidad">Entidad (EPS o ARL)</Label>
              <Input
                id="novedad-entidad"
                placeholder="Ej.: EPS SURA"
                maxLength={100}
                value={borrador.entidad}
                onChange={(e) => onCambiar({ entidad: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novedad-radicado">Número de radicado</Label>
              <Input
                id="novedad-radicado"
                placeholder="Ej.: INC-2026-0412"
                maxLength={50}
                value={borrador.numeroRadicado}
                onChange={(e) => onCambiar({ numeroRadicado: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ── Terminación: causa y aviso ────────────────────────────────── */}
        {terminacion && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novedad-causa">
                Causa de terminación <span className="text-destructive">*</span>
              </Label>
              <Select
                value={borrador.motivoRetiro}
                onValueChange={(motivoRetiro) => onCambiar({ motivoRetiro })}
              >
                <SelectTrigger id="novedad-causa">
                  <SelectValue placeholder="Selecciona la causa" />
                </SelectTrigger>
                <SelectContent>
                  {motivosRetiro.map((m) => (
                    <SelectItem key={m.codigo} value={m.codigo}>
                      {m.etiqueta}{m.indemniza ? ' (indemniza)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-warning/15 bg-warning-soft px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
              <div className="text-sm">
                <p className="font-semibold text-warning">Esto no liquida</p>
                <p className="mt-0.5 text-foreground">
                  Al confirmar queda el retiro en la ficha y el contrato terminado. La liquidación
                  final se hace después, desde el enlace que aparece al terminar.
                </p>
              </div>
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

        <div className="space-y-2">
          <Label htmlFor="novedad-observaciones">
            Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="novedad-observaciones"
            value={borrador.observacion}
            onChange={(e) => onCambiar({ observacion: e.target.value })}
            rows={3}
            maxLength={terminacion ? 500 : 2000}
            placeholder="Detalles adicionales sobre la novedad"
            className="resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
