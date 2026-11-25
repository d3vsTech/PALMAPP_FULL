/** Paso 3: resumen de lo que se va a registrar. Solo lectura. */
import {
  Card, CardDescription, CardHeader, CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import Avatar from '../../../components/common/Avatar';
import { AlertCircle, CheckCircle, Clock, Paperclip, Umbrella } from 'lucide-react';
import {
  esAusencia, esParcial, esTerminacion, esVacaciones, type BorradorNovedad,
} from '../borrador';
import type { CategoriaInit } from '../../../../api/novedades';
import {
  ETIQUETA_CATEGORIA, ICONO_CATEGORIA, calcularDias, esIncapacidad, etiquetaDias,
  formatFechaCorta, formatFechaLarga, formatHora, formatPorcentaje,
  iconoDeMotivo,
} from '../tipos';

const ROTULO = 'text-[13px] font-medium text-muted-foreground';
const FILA = 'border-t border-border px-6 py-4';

interface Props {
  borrador: BorradorNovedad;
  categorias: CategoriaInit[];
  /** Con qué estado nacerá la ausencia, de `init.estado_inicial_ausencias`. */
  estadoInicial: 'APROBADA' | 'PENDIENTE';
  /**
   * PR-N8 — Con qué estado nacería si se adjunta el certificado
   * (`init.estado_inicial_con_soporte`). Solo vale `APROBADA` cuando el
   * usuario puede aprobar.
   */
  estadoConSoporte?: 'APROBADA' | 'PENDIENTE';
}

function CajaFecha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-semibold">{valor}</dd>
    </div>
  );
}

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className={ROTULO}>{rotulo}</dt>
      <dd className="break-words text-sm font-medium">{valor}</dd>
    </div>
  );
}

/**
 * PR-N8 (§0 y §3) — El estado con el que nacerá la ausencia depende de dos
 * cosas: si el Paso 2 adjuntó el certificado y si quien registra puede
 * aprobar. `estado_inicial_con_soporte` ya resuelve la segunda.
 */
function quedaAprobada(
  estadoInicial: 'APROBADA' | 'PENDIENTE',
  conSoporte: 'APROBADA' | 'PENDIENTE' | undefined,
  tieneSoporte: boolean,
): boolean {
  if (estadoInicial === 'APROBADA') return true;
  return tieneSoporte && conSoporte === 'APROBADA';
}

function avisoEstadoInicial(
  estadoInicial: 'APROBADA' | 'PENDIENTE',
  conSoporte: 'APROBADA' | 'PENDIENTE' | undefined,
  tieneSoporte: boolean,
): string {
  if (quedaAprobada(estadoInicial, conSoporte, tieneSoporte)) {
    return tieneSoporte
      ? 'La novedad quedará APROBADA de inmediato, porque adjuntaste el certificado.'
      : 'La novedad quedará APROBADA de inmediato, porque tienes permiso para aprobar.';
  }
  if (conSoporte === 'APROBADA') {
    return 'La novedad quedará PENDIENTE. Si vuelves al paso anterior y adjuntas el certificado, quedará APROBADA.';
  }
  return 'La novedad quedará PENDIENTE hasta que alguien con permiso la apruebe.';
}

export function PasoConfirmacion({ borrador, categorias, estadoInicial, estadoConSoporte }: Props) {
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
  /* El backend manda la categoria en mayusculas de titulo; el diseno escribe normal. */
  const rotuloCategoria = borrador.categoria
    ? ETIQUETA_CATEGORIA[borrador.categoria] ?? categoria?.etiqueta
    : categoria?.etiqueta;
  const fechaFin = borrador.fechaFin || borrador.fechaInicio;
  const dias = calcularDias(borrador.fechaInicio, fechaFin);
  const aprobada = quedaAprobada(estadoInicial, estadoConSoporte, !!borrador.documento);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="pb-5">
        <CardTitle>Confirmación</CardTitle>
        <CardDescription>Revisa los datos antes de registrar.</CardDescription>
      </CardHeader>

      {/* ── Tipo ─────────────────────────────────────────────────────────── */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${FILA}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icono className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className={ROTULO}>{rotuloCategoria}</p>
            <p className="break-words text-sm font-semibold text-foreground">
              {motivo?.nombre ?? motivoRetiro?.etiqueta ?? rotuloCategoria}
            </p>
          </div>
        </div>
        {motivo && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={motivo.es_remunerada ? 'success' : 'secondary'}>
              {motivo.es_remunerada
                ? `Remunerado ${formatPorcentaje(motivo.porcentaje_pago_default)}`
                : 'No remunerado'}
            </Badge>
            <Badge variant={motivo.afecta_auxilio_transporte ? 'destructive' : 'secondary'}>
              Subsidio: {motivo.afecta_auxilio_transporte ? 'afecta' : 'no afecta'}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Colaborador ──────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 ${FILA}`}>
        <Avatar nombre={borrador.colaboradorNombre} size="md" className="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <p className="break-words font-semibold">{borrador.colaboradorNombre}</p>
          <p className="text-xs text-muted-foreground">Colaborador</p>
        </div>
      </div>

      {/* ── Período, disfrute o retiro ───────────────────────────────────── */}
      {terminacion ? (
        <div className={FILA}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato rotulo="Fecha de terminación" valor={formatFechaLarga(borrador.fechaInicio)} />
            {motivoRetiro && <Dato rotulo="Causa" valor={motivoRetiro.etiqueta} />}
            {motivoRetiro && (
              <Dato
                rotulo="Indemniza"
                valor={motivoRetiro.indemniza ? `Sí · ${motivoRetiro.norma ?? 'CST art. 64'}` : 'No'}
              />
            )}
          </dl>
        </div>
      ) : vacaciones ? (
        <div className={FILA}>
          <p className={`mb-3 ${ROTULO}`}>Disfrute solicitado</p>
          {/* El calendario ya completó los dos campos, así que se muestran los
              dos: el rango es lo que se paga y los hábiles lo que se descuenta
              del saldo. */}
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CajaFecha rotulo="Inicio" valor={formatFechaCorta(borrador.fechaInicio)} />
            {borrador.fechaFin && <CajaFecha rotulo="Fin" valor={formatFechaCorta(borrador.fechaFin)} />}
            {borrador.diasHabiles && (
              <CajaFecha rotulo="Días hábiles" valor={borrador.diasHabiles} />
            )}
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Se pagan los días calendario del rango, no los hábiles (CST art. 192).
          </p>
        </div>
      ) : (
        <div className={FILA}>
          <p className={`mb-3 ${ROTULO}`}>Período</p>
          {parcial ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <span className="font-medium">{formatFechaLarga(borrador.fechaInicio)}</span>
              <span className="text-muted-foreground">
                de {formatHora(borrador.horaInicio)} a {formatHora(borrador.horaFin)}
              </span>
              <Badge variant="secondary">Informativa</Badge>
            </div>
          ) : (
            <dl className="grid grid-cols-3 gap-2">
              <CajaFecha rotulo="Inicio" valor={formatFechaCorta(borrador.fechaInicio)} />
              <CajaFecha rotulo="Fin" valor={formatFechaCorta(fechaFin)} />
              <CajaFecha rotulo="Total" valor={`${dias} ${etiquetaDias(dias)}`} />
            </dl>
          )}
        </div>
      )}

      {/* ── Información de la incapacidad ────────────────────────────────── */}
      {esIncapacidad(motivo) && (borrador.entidad || borrador.numeroRadicado) && (
        <div className={FILA}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {borrador.entidad && <Dato rotulo="Entidad (EPS o ARL)" valor={borrador.entidad} />}
            {borrador.numeroRadicado && (
              <Dato rotulo="Número de radicado" valor={borrador.numeroRadicado} />
            )}
          </dl>
        </div>
      )}

      {/* ── Soporte ──────────────────────────────────────────────────────── */}
      <div className={FILA}>
        <p className={`mb-2 ${ROTULO}`}>Soporte adjunto</p>
        {borrador.documento ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-2.5">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{borrador.documento.name}</p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {(borrador.documento.size / 1024).toFixed(0)} KB
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin soporte adjunto
            {motivo?.requiere_soporte && '. Este motivo lo pide: se puede adjuntar después.'}
          </p>
        )}
      </div>

      {/* ── Observaciones ────────────────────────────────────────────────── */}
      <div className={FILA}>
        <p className={`mb-1 ${ROTULO}`}>Observaciones</p>
        {borrador.observacion ? (
          <p className="text-sm leading-relaxed text-foreground">{borrador.observacion}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Sin observaciones</p>
        )}
      </div>

      {/* ── Qué pasa al confirmar, uno por fuente ────────────────────────── */}
      {ausencia && (
        <div className={FILA}>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
            <div className="text-sm">
              <p className="text-foreground">
                {avisoEstadoInicial(estadoInicial, estadoConSoporte, !!borrador.documento)}
              </p>
              {/* §0 — Mientras siga PENDIENTE, la nómina no liquida a ese
                  colaborador ni se cierra. Es la consecuencia que el usuario
                  no ve hasta quince días después. */}
              {!aprobada && (
                <p className="mt-0.5 text-muted-foreground">
                  Mientras esté pendiente, la nómina de ese período no podrá liquidar a este
                  colaborador ni cerrarse.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {vacaciones && (
        <div className={FILA}>
          <div className="flex items-start gap-3 rounded-lg border border-warning/15 bg-warning-soft px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <div className="text-sm">
              <p className="font-semibold text-warning">Es una solicitud, no una liquidación</p>
              <p className="mt-0.5 text-foreground">
                Reserva las fechas pero no consume saldo ni toca la nómina. Para aprobarla hay que
                liquidarla desde Liquidaciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {terminacion && (
        <div className={FILA}>
          <div className="flex items-start gap-3 rounded-lg border border-warning/15 bg-warning-soft px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
            <div className="text-sm">
              <p className="font-semibold text-warning">Queda el retiro registrado</p>
              <p className="mt-0.5 text-foreground">
                La ficha de <strong>{borrador.colaboradorNombre}</strong> recibe la fecha y el
                motivo, y el contrato queda terminado. La liquidación final se hace aparte.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
