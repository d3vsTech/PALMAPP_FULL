/** Paso 3: resumen de lo que se va a registrar. Solo lectura. */
import { Card, CardContent } from '../../../components/ui/card';
import { AlertCircle, CheckCircle, Clock, FileX, Paperclip, Umbrella } from 'lucide-react';
import {
  esAusencia, esParcial, esTerminacion, esVacaciones, type BorradorNovedad,
} from '../borrador';
import type { CategoriaInit } from '../../../../api/novedades';
import {
  ICONO_CATEGORIA, calcularDias, esIncapacidad, etiquetaDias,
  formatFechaCorta, formatFechaLarga, formatHora, formatPorcentaje,
  iconoDeMotivo, iniciales,
} from '../tipos';

const PILDORA = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';
const ROTULO = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

interface Props {
  borrador: BorradorNovedad;
  categorias: CategoriaInit[];
  /** Con qué estado nacerá la ausencia, de `init.estado_inicial_ausencias`. */
  estadoInicial: 'APROBADA' | 'PENDIENTE';
}

function CajaFecha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-muted/30 px-4 py-3 text-center">
      <p className="mb-0.5 text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-semibold">{valor}</p>
    </div>
  );
}

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/20 px-4 py-3">
      <p className="mb-0.5 text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

export function PasoConfirmacion({ borrador, categorias, estadoInicial }: Props) {
  const categoria = categorias.find((c) => c.codigo === borrador.categoria);
  const motivo = borrador.motivo;
  const ausencia = esAusencia(borrador);
  const vacaciones = esVacaciones(borrador);
  const terminacion = esTerminacion(borrador);
  const parcial = esParcial(borrador);

  const Icono = motivo
    ? iconoDeMotivo(motivo)
    : borrador.categoria ? ICONO_CATEGORIA[borrador.categoria] : Umbrella;

  const motivoRetiro = categoria?.motivos_retiro?.find((m) => m.codigo === borrador.motivoRetiro);
  const fechaFin = borrador.fechaFin || borrador.fechaInicio;
  const dias = calcularDias(borrador.fechaInicio, fechaFin);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10">
          <CheckCircle className="h-5 w-5 text-success" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Confirmación</h2>
          <p className="text-sm text-muted-foreground">Revisa los datos antes de registrar</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Icono className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={ROTULO}>{categoria?.etiqueta}</p>
          <p className="truncate text-sm font-semibold text-primary">
            {motivo?.nombre ?? motivoRetiro?.etiqueta ?? categoria?.etiqueta}
          </p>
        </div>
        {motivo && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`${PILDORA} ${motivo.es_remunerada ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground'}`}>
              {motivo.es_remunerada
                ? `Remunerado ${formatPorcentaje(motivo.porcentaje_pago_default)}`
                : 'No remunerado'}
            </span>
            <span className={`${PILDORA} ${motivo.afecta_auxilio_transporte ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-border bg-muted text-muted-foreground'}`}>
              Subsidio: {motivo.afecta_auxilio_transporte ? 'afecta' : 'no afecta'}
            </span>
          </div>
        )}
      </div>

      <Card className="overflow-hidden border-border">
        <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-sm font-bold text-primary">
            {iniciales(borrador.colaboradorNombre || '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{borrador.colaboradorNombre}</p>
            <p className="text-xs text-muted-foreground">Colaborador</p>
          </div>
        </div>

        <CardContent className="p-0">
          {terminacion ? (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Fecha de retiro</p>
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <FileX className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm font-semibold text-destructive">
                  {formatFechaLarga(borrador.fechaInicio)}
                </p>
              </div>
              {motivoRetiro && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Dato rotulo="Causa" valor={motivoRetiro.etiqueta} />
                  <Dato
                    rotulo="Indemniza"
                    valor={motivoRetiro.indemniza ? `Sí · ${motivoRetiro.norma ?? 'CST art. 64'}` : 'No'}
                  />
                </div>
              )}
            </div>
          ) : vacaciones ? (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Disfrute solicitado</p>
              <div className="flex flex-wrap items-center gap-4">
                <CajaFecha rotulo="Inicio" valor={formatFechaCorta(borrador.fechaInicio)} />
                <div className="text-xl font-light text-muted-foreground/40">→</div>
                {borrador.diasHabiles ? (
                  <div className="min-w-0 flex-1 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-center">
                    <p className="mb-0.5 text-xs text-primary/70">Días hábiles</p>
                    <p className="text-lg font-bold leading-none text-primary">{borrador.diasHabiles}</p>
                  </div>
                ) : (
                  <CajaFecha rotulo="Fin" valor={formatFechaCorta(borrador.fechaFin)} />
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                El backend calcula el otro dato con el calendario de festivos de la finca.
              </p>
            </div>
          ) : (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Período</p>
              {parcial ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatFechaLarga(borrador.fechaInicio)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    de {formatHora(borrador.horaInicio)} a {formatHora(borrador.horaFin)}
                  </span>
                  <span className={`${PILDORA} border-border bg-muted text-muted-foreground`}>
                    Informativa
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <CajaFecha rotulo="Inicio" valor={formatFechaCorta(borrador.fechaInicio)} />
                  <div className="text-xl font-light text-muted-foreground/40">→</div>
                  <CajaFecha rotulo="Fin" valor={formatFechaCorta(fechaFin)} />
                  <div className="min-w-0 flex-1 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-center">
                    <p className="mb-0.5 text-xs text-primary/70">Total</p>
                    <p className="text-lg font-bold leading-none text-primary">{dias}</p>
                    <p className="text-xs text-primary/70">{etiquetaDias(dias)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {esIncapacidad(motivo) && (borrador.entidad || borrador.numeroRadicado) && (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Información de la incapacidad</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {borrador.entidad && <Dato rotulo="Entidad" valor={borrador.entidad} />}
                {borrador.numeroRadicado && <Dato rotulo="Radicado" valor={borrador.numeroRadicado} />}
              </div>
            </div>
          )}

          <div className="border-b border-border px-5 py-4">
            <p className={`mb-2 ${ROTULO}`}>Soporte adjunto</p>
            {borrador.documento ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
                <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{borrador.documento.name}</p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {(borrador.documento.size / 1024).toFixed(0)} KB
                </span>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Sin soporte adjunto
                {motivo?.requiere_soporte && '. Este motivo lo pide: se puede adjuntar después.'}
              </p>
            )}
          </div>

          <div className="px-5 py-4">
            <p className={`mb-2 ${ROTULO}`}>Observaciones</p>
            {borrador.observacion ? (
              <p className="text-sm leading-relaxed text-foreground">{borrador.observacion}</p>
            ) : (
              <p className="text-xs italic text-muted-foreground">Sin observaciones</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Avisos de lo que pasa al confirmar, uno por fuente. */}
      {ausencia && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            {estadoInicial === 'APROBADA'
              ? 'La novedad quedará APROBADA de inmediato, porque tienes permiso para aprobar.'
              : 'La novedad quedará PENDIENTE hasta que alguien con permiso la apruebe.'}
          </p>
        </div>
      )}

      {vacaciones && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Es una solicitud, no una liquidación</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Reserva las fechas pero no consume saldo ni toca la nómina. Para aprobarla hay que
              liquidarla desde Liquidaciones.
            </p>
          </div>
        </div>
      )}

      {terminacion && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Queda el retiro registrado</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              La ficha de <strong>{borrador.colaboradorNombre}</strong> recibe la fecha y el motivo, y
              el contrato queda terminado. La liquidación final se hace aparte.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
