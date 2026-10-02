/**
 * Edición de una novedad de ausencia (API_NOVEDADES §4.3).
 *
 * El formulario no decide qué se puede tocar: lo decide `editable.campos` del
 * detalle. Esa lista cambia con el estado (D7) y con las nóminas cerradas que
 * cruzan el rango, así que replicarla aquí sería tener dos versiones de la
 * misma regla y que una se quede atrás. Un campo que no esté en la lista no
 * se renderiza, y así nunca se manda algo que el backend va a rechazar con
 * 409 `NOVEDAD_CAMPO_NO_EDITABLE`.
 *
 * Solo se envían los campos que el usuario cambió: un PUT con todo el objeto
 * tocaría campos bloqueados aunque llevaran el mismo valor.
 */
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  NovedadesErrorCodes,
  type AusenciaDetalle, type CategoriaInit, type EditarAusenciaPayload,
  type MotivoNovedad,
} from '../../../../api/novedades';
import type { ApiError } from '../../../../api/client';
import { CampoAdjunto } from './CampoAdjunto';

interface Props {
  detalle: AusenciaDetalle;
  /** Catálogo de `novedades/init`, para el selector de motivo. */
  categorias: CategoriaInit[];
  soporte: { mimes: string[]; max_kb: number };
  onCancelar: () => void;
  /** Recibe el detalle actualizado para refrescar el diálogo y el listado. */
  onGuardado: (d: AusenciaDetalle) => void;
}

/** Forma local del formulario. Todo string: es lo que devuelven los inputs. */
interface Form {
  motivoAusenciaId: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  entidad: string;
  numeroRadicado: string;
  porcentajePago: string;
  observacion: string;
}

function formDesdeDetalle(d: AusenciaDetalle): Form {
  return {
    motivoAusenciaId: String(d.motivo_ausencia_id),
    fechaInicio: String(d.fecha_inicio).slice(0, 10),
    fechaFin: d.fecha_fin ? String(d.fecha_fin).slice(0, 10) : '',
    horaInicio: d.hora_inicio ? String(d.hora_inicio).slice(0, 5) : '',
    horaFin: d.hora_fin ? String(d.hora_fin).slice(0, 5) : '',
    entidad: d.entidad ?? '',
    numeroRadicado: d.numero_radicado ?? '',
    porcentajePago: d.porcentaje_pago != null ? String(Number(d.porcentaje_pago)) : '',
    observacion: d.observacion ?? '',
  };
}

/** Las ausencias solo salen de estas tres categorías. */
const CATEGORIAS_AUSENCIA = ['PERMISOS_LICENCIAS', 'INCAPACIDADES', 'AUSENCIAS_SANCIONES'];

function mensajeError(e: ApiError): string {
  switch (e.code) {
    case NovedadesErrorCodes.NOVEDAD_CAMPO_NO_EDITABLE:
      return e.message ?? 'Ese campo ya no se puede cambiar en este estado.';
    case NovedadesErrorCodes.NOVEDAD_EN_NOMINA_CERRADA:
      return 'El nuevo rango toca una nómina cerrada. Reábrela primero.';
    case NovedadesErrorCodes.NOVEDAD_SOLAPADA:
      return e.message ?? 'El colaborador ya tiene otra novedad que cruza esas fechas.';
    case NovedadesErrorCodes.RANGO_INVALIDO:
      return 'La fecha fin no puede ser anterior a la de inicio.';
    case NovedadesErrorCodes.HORARIO_INVALIDO:
      return 'El horario va con las dos horas y de un solo día.';
    case NovedadesErrorCodes.MOTIVO_INACTIVO:
      return 'Ese motivo está inactivo. Actívalo en Configuración o elige otro.';
    case NovedadesErrorCodes.COLABORADOR_SIN_CONTRATO_VIGENTE:
      return e.message ?? 'El colaborador no tenía contrato en alguno de esos días.';
    default:
      return e.message ?? 'No se pudo guardar el cambio.';
  }
}

export function EditarNovedadForm({
  detalle, categorias, soporte, onCancelar, onGuardado,
}: Props) {
  const inicial = useMemo(() => formDesdeDetalle(detalle), [detalle]);
  const [form, setForm] = useState<Form>(inicial);
  const [documento, setDocumento] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const campos = detalle.editable.campos;
  const puede = (c: string) => campos.includes(c);

  /** Todos los motivos de ausencia del catálogo, aplanados. */
  const motivos = useMemo<MotivoNovedad[]>(
    () => categorias
      .filter((c) => CATEGORIAS_AUSENCIA.includes(c.codigo))
      .flatMap((c) => c.motivos ?? []),
    [categorias],
  );

  const cambiar = (parcial: Partial<Form>) => setForm((prev) => ({ ...prev, ...parcial }));

  const guardar = async () => {
    // Solo lo que cambió, y solo si el backend lo permite. Mandar un campo
    // bloqueado con su mismo valor igual responde 409.
    const payload: EditarAusenciaPayload = {};
    if (puede('motivo_ausencia_id') && form.motivoAusenciaId !== inicial.motivoAusenciaId) {
      payload.motivo_ausencia_id = Number(form.motivoAusenciaId);
    }
    if (puede('fecha_inicio') && form.fechaInicio !== inicial.fechaInicio) {
      payload.fecha_inicio = form.fechaInicio;
    }
    if (puede('fecha_fin') && form.fechaFin !== inicial.fechaFin) {
      payload.fecha_fin = form.fechaFin || undefined;
    }
    if (puede('hora_inicio') && form.horaInicio !== inicial.horaInicio) {
      payload.hora_inicio = form.horaInicio || undefined;
    }
    if (puede('hora_fin') && form.horaFin !== inicial.horaFin) {
      payload.hora_fin = form.horaFin || undefined;
    }
    if (puede('entidad') && form.entidad !== inicial.entidad) {
      payload.entidad = form.entidad.trim();
    }
    if (puede('numero_radicado') && form.numeroRadicado !== inicial.numeroRadicado) {
      payload.numero_radicado = form.numeroRadicado.trim();
    }
    if (puede('porcentaje_pago') && form.porcentajePago !== inicial.porcentajePago) {
      payload.porcentaje_pago = Number(form.porcentajePago);
    }
    if (puede('observacion') && form.observacion !== inicial.observacion) {
      payload.observacion = form.observacion.trim();
    }
    if (documento) payload.documento = documento;

    if (Object.keys(payload).length === 0) {
      toast.info('No hay cambios por guardar');
      return;
    }

    // Las dos horas o ninguna: el backend responde 422 con media.
    const hi = payload.hora_inicio ?? form.horaInicio;
    const hf = payload.hora_fin ?? form.horaFin;
    if (!!hi !== !!hf) {
      toast.error('Indica la hora de inicio y la de fin, o deja el horario vacío.');
      return;
    }

    setGuardando(true);
    try {
      const res = await novedadesApi.ausencias.editar(detalle.id, payload);
      toast.success(res.message ?? 'Novedad actualizada');
      for (const a of res.advertencias ?? []) {
        toast.warning(a.mensaje ?? a.code, { duration: 7000 });
      }
      onGuardado(res.data);
    } catch (err) {
      toast.error(mensajeError(err as ApiError), { duration: 8000 });
    } finally {
      setGuardando(false);
    }
  };

  const esParcial = !!form.horaInicio || !!form.horaFin;

  return (
    <div className="space-y-4 border-t border-border px-6 py-4">
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          En este estado solo se pueden cambiar: {campos.join(', ')}. Los demás campos quedan
          fijos porque ya afectaron una nómina o una aprobación.
        </p>
      </div>

      {detalle.editable.nominas_cerradas.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Hay días dentro de{' '}
            {detalle.editable.nominas_cerradas.map((n) => n.etiqueta).join(', ')}. Esos días no
            se pueden agregar ni quitar: el rango nuevo tiene que seguir cubriéndolos.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {puede('motivo_ausencia_id') && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tipo de novedad</Label>
            <Select
              value={form.motivoAusenciaId}
              onValueChange={(v) => cambiar({ motivoAusenciaId: v })}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {motivos.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {puede('fecha_inicio') && (
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => cambiar({ fechaInicio: e.target.value })}
            />
          </div>
        )}

        {puede('fecha_fin') && (
          <div className="space-y-1.5">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={form.fechaFin}
              min={form.fechaInicio || undefined}
              disabled={esParcial}
              onChange={(e) => cambiar({ fechaFin: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Vacío = un solo día</p>
          </div>
        )}

        {(puede('hora_inicio') || puede('hora_fin')) && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Horario</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={form.horaInicio}
                disabled={!puede('hora_inicio') || !!form.fechaFin}
                onChange={(e) => cambiar({ horaInicio: e.target.value })}
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="time"
                value={form.horaFin}
                disabled={!puede('hora_fin') || !!form.fechaFin}
                onChange={(e) => cambiar({ horaFin: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Con horario la novedad es parcial: un solo día e informativa.
            </p>
          </div>
        )}

        {puede('entidad') && (
          <div className="space-y-1.5">
            <Label>Entidad</Label>
            <Input
              value={form.entidad}
              placeholder="EPS o ARL que expidió"
              onChange={(e) => cambiar({ entidad: e.target.value })}
            />
          </div>
        )}

        {puede('numero_radicado') && (
          <div className="space-y-1.5">
            <Label>Número de radicado</Label>
            <Input
              value={form.numeroRadicado}
              onChange={(e) => cambiar({ numeroRadicado: e.target.value })}
            />
          </div>
        )}

        {puede('porcentaje_pago') && (
          <div className="space-y-1.5">
            <Label>Porcentaje de pago</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.porcentajePago}
              onChange={(e) => cambiar({ porcentajePago: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Por defecto sale del motivo. Cambiarlo altera lo que paga la nómina.
            </p>
          </div>
        )}

        {puede('observacion') && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observaciones</Label>
            <textarea
              rows={3}
              maxLength={500}
              value={form.observacion}
              onChange={(e) => cambiar({ observacion: e.target.value })}
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {/* El soporte se puede reemplazar en cualquier estado (§4.6), así que
            no depende de `editable.campos`. */}
        <div className="sm:col-span-2">
          <CampoAdjunto
            etiqueta={detalle.documento ? 'Reemplazar soporte' : 'Adjuntar soporte'}
            mimes={soporte.mimes}
            maxKb={soporte.max_kb}
            archivo={documento}
            onCambiar={setDocumento}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button size="sm" onClick={guardar} disabled={guardando} className="gap-2">
          {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
