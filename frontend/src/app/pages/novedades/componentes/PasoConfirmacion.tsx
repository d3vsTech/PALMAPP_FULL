/** Paso 3: resumen de lo que se va a registrar. Solo lectura. */
import { Card, CardContent } from '../../../components/ui/card';
import { AlertCircle, CheckCircle, Clock, FileX, Paperclip } from 'lucide-react';
import type { BorradorNovedad } from '../borrador';
import {
  TIPOS_NOVEDAD, calcularDias, categoriaDe, esIncapacidad, esTerminacion,
  etiquetaDias, formatFechaCorta, formatFechaLarga, formatHora, humanizarCausa,
  iniciales, type Colaborador, type TipoNovedad,
} from '../tipos';

const PILDORA = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';
const ROTULO = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

interface Props {
  tipo: TipoNovedad;
  colaborador: Colaborador;
  borrador: BorradorNovedad;
}

/** Recuadro de una fecha del período. */
function CajaFecha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-muted/30 px-4 py-3 text-center">
      <p className="mb-0.5 text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-semibold">{valor}</p>
    </div>
  );
}

export function PasoConfirmacion({ tipo, colaborador, borrador }: Props) {
  const info = TIPOS_NOVEDAD[tipo];
  const TipoIcono = info.icono;
  const categoria = categoriaDe(tipo);
  const CatIcono = categoria.icono;
  const terminacion = esTerminacion(tipo);
  const dias = calcularDias(borrador.fechaInicio, borrador.fechaFin);
  const conHorario = info.requiereHoras && borrador.horaInicio && borrador.horaFin;

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
          <TipoIcono className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={ROTULO}>{categoria.label}</p>
          <p className="truncate text-sm font-semibold text-primary">{info.label}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`${PILDORA} ${info.remunerado ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground'}`}>
            {info.remunerado ? `Remunerado ${info.pct}` : 'No remunerado'}
          </span>
          <span className={`${PILDORA} ${info.afectaSubsidio ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-border bg-muted text-muted-foreground'}`}>
            Subsidio: {info.afectaSubsidio ? 'afecta' : 'no afecta'}
          </span>
        </div>
      </div>

      <Card className="overflow-hidden border-border">
        <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-sm font-bold text-primary">
            {iniciales(colaborador.nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{colaborador.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">
              {colaborador.cargo} · CC {colaborador.cedula}
            </p>
          </div>
          <CatIcono className="h-5 w-5 shrink-0 text-muted-foreground/50" />
        </div>

        <CardContent className="p-0">
          {!terminacion ? (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Período</p>
              <div className="flex flex-wrap items-center gap-4">
                <CajaFecha rotulo="Inicio" valor={formatFechaCorta(borrador.fechaInicio)} />
                <div className="text-xl font-light text-muted-foreground/40">→</div>
                <CajaFecha rotulo="Fin" valor={formatFechaCorta(borrador.fechaFin)} />
                <div className="min-w-0 flex-1 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-center">
                  <p className="mb-0.5 text-xs text-primary/70">Total</p>
                  <p className="text-lg font-bold leading-none text-primary">{dias}</p>
                  <p className="text-xs text-primary/70">{etiquetaDias(dias)}</p>
                </div>
              </div>
              {conHorario && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Horario:</span>
                  <span className="text-sm font-medium">
                    {formatHora(borrador.horaInicio)} – {formatHora(borrador.horaFin)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Fecha de terminación</p>
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <FileX className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm font-semibold text-destructive">
                  {formatFechaLarga(borrador.fechaInicio)}
                </p>
              </div>
              {borrador.causaTerminacion && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Causa</p>
                  <p className="text-sm font-medium">{humanizarCausa(borrador.causaTerminacion)}</p>
                </div>
              )}
            </div>
          )}

          {esIncapacidad(tipo) && (borrador.radicado || borrador.diagnostico) && (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-3 ${ROTULO}`}>Información médica</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {borrador.radicado && (
                  <div className="rounded-lg bg-muted/20 px-4 py-3">
                    <p className="mb-0.5 text-xs text-muted-foreground">Número de radicado</p>
                    <p className="text-sm font-medium">{borrador.radicado}</p>
                  </div>
                )}
                {borrador.diagnostico && (
                  <div className="rounded-lg bg-muted/20 px-4 py-3">
                    <p className="mb-0.5 text-xs text-muted-foreground">Diagnóstico (CIE-10)</p>
                    <p className="text-sm font-medium">{borrador.diagnostico}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {info.tieneAdjunto && (
            <div className="border-b border-border px-5 py-4">
              <p className={`mb-2 ${ROTULO}`}>Soporte adjunto</p>
              {borrador.adjunto ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
                  <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{info.labelAdjunto}</p>
                    <p className="truncate text-sm font-medium">{borrador.adjunto.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {(borrador.adjunto.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">Sin soporte adjunto</p>
              )}
            </div>
          )}

          <div className="px-5 py-4">
            <p className={`mb-2 ${ROTULO}`}>Observaciones</p>
            {borrador.observaciones ? (
              <p className="text-sm leading-relaxed text-foreground">{borrador.observaciones}</p>
            ) : (
              <p className="text-xs italic text-muted-foreground">Sin observaciones</p>
            )}
          </div>
        </CardContent>
      </Card>

      {terminacion && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Generará liquidación final</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Se creará automáticamente una liquidación final pendiente para{' '}
              <strong>{colaborador.nombre}</strong> en el módulo de Liquidaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
