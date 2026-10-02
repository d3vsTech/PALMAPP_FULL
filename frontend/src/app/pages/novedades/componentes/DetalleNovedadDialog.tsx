/**
 * Detalle de una novedad del listado.
 *
 * Solo las ausencias tienen endpoint de detalle (§4.2): para ellas se carga
 * `editable{}`, que dice qué se puede tocar en el estado actual, y se ofrecen
 * aprobar y rechazar. Vacaciones y terminaciones se ven con lo que ya trae la
 * fila y enlazan a su propia pantalla.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '../../../components/ui/dialog';
import {
  AlertTriangle, ArrowUpRight, Calendar, Check, Download, FileSignature, Loader2, Paperclip, Pencil, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  type AusenciaDetalle, type InitNovedades, type NovedadFila, type PermisosNovedades,
} from '../../../../api/novedades';
import type { ApiError } from '../../../../api/client';
import { descargarSoporte } from '../soportePdf';
import { EditarNovedadForm } from './EditarNovedadForm';
import {
  ESTADO_BADGE, ESTADO_LABEL, ORIGEN_LABEL, etiquetaDias,
  formatFecha, formatPorcentaje, iniciales,
} from '../tipos';

interface Props {
  fila: NovedadFila | null;
  permisos: PermisosNovedades | null;
  /**
   * Catálogo y parámetros de `novedades/init`. Los necesita el formulario de
   * edición; sin él el botón Editar no se ofrece.
   */
  init?: InitNovedades | null;
  onCerrar: () => void;
  /** Se llama cuando el estado cambió, para refrescar el listado. */
  onCambio: () => void;
}

function Dato({ label, valor, icono }: { label: string; valor: string; icono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icono && <Calendar className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

export function DetalleNovedadDialog({ fila, permisos, init, onCerrar, onCambio }: Props) {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<AusenciaDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | 'editar' | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const esAusencia = fila?.fuente === 'AUSENCIA';

  useEffect(() => {
    setDetalle(null);
    setAccion(null);
    setMotivoRechazo('');
    if (!fila || fila.fuente !== 'AUSENCIA') return;

    let vivo = true;
    setCargando(true);
    novedadesApi.ausencias
      .ver(fila.id)
      .then((res) => { if (vivo) setDetalle(res.data); })
      .catch((err) => {
        if (!vivo) return;
        toast.error((err as ApiError).message ?? 'No se pudo cargar el detalle');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [fila]);

  const aprobar = async () => {
    if (!fila) return;
    setCargando(true);
    try {
      const res = await novedadesApi.ausencias.aprobar(fila.id);
      toast.success(res.message ?? 'Novedad aprobada');
      for (const a of res.advertencias ?? []) toast.warning(a.mensaje ?? a.code, { duration: 7000 });
      onCambio();
      onCerrar();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo aprobar');
    } finally {
      setCargando(false);
    }
  };

  const rechazar = async () => {
    if (!fila) return;
    if (motivoRechazo.trim().length < 5) {
      toast.error('Escribe el motivo del rechazo');
      return;
    }
    setCargando(true);
    try {
      const res = await novedadesApi.ausencias.rechazar(fila.id, motivoRechazo.trim());
      toast.success(res.message ?? 'Novedad rechazada');
      onCambio();
      onCerrar();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo rechazar');
    } finally {
      setCargando(false);
    }
  };

  /** El archivo que subió el usuario, no el acta generada. */
  const bajarAdjunto = async () => {
    if (!fila) return;
    try {
      const blob = await novedadesApi.ausencias.descargarDocumento(fila.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = detalle?.documento?.nombre_archivo ?? `soporte_novedad_${fila.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo descargar el soporte');
    }
  };

  const irAlDetalle = () => {
    if (!fila?.enlaces.detalle) return;
    onCerrar();
    navigate(`/${fila.enlaces.detalle.replace(/^\/+/, '')}`);
  };

  return (
    <Dialog open={!!fila} onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}>
      <DialogContent className="max-w-lg gap-0 rounded-2xl p-0">
        {fila && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5 pr-12">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: fila.tipo.color ?? '#9ca3af' }}
                />
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold">{fila.tipo.nombre}</DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    {ORIGEN_LABEL[fila.origen] ?? fila.origen}
                    {' · '}
                    <span className="uppercase">{fila.fuente.toLowerCase()}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {iniciales(fila.empleado.nombre_completo)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fila.empleado.nombre_completo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {detalle?.empleado.cargo ?? 'Colaborador'} · {fila.empleado.documento}
                </p>
              </div>
              <Badge variant="outline" className={`shrink-0 text-xs ${ESTADO_BADGE[fila.estado] ?? ''}`}>
                {ESTADO_LABEL[fila.estado] ?? fila.estado}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
              <Dato icono label="Fecha inicio" valor={formatFecha(fila.fecha_inicio)} />
              {fila.fuente !== 'TERMINACION' && (
                <Dato icono label="Fecha fin" valor={formatFecha(fila.fecha_fin)} />
              )}
              {fila.parcial ? (
                <Dato label="Horario" valor={`${fila.horario} (informativa)`} />
              ) : fila.dias !== null && (
                <Dato label="Días" valor={`${fila.dias} ${etiquetaDias(fila.dias)}`} />
              )}
              {detalle && (
                <Dato
                  label="Remuneración"
                  valor={detalle.es_remunerada
                    ? `Remunerado · ${formatPorcentaje(detalle.porcentaje_pago)}`
                    : 'No remunerado'}
                />
              )}
            </div>

            {cargando && (
              <div className="flex items-center justify-center gap-2 border-t border-border py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            )}

            {detalle && (detalle.entidad || detalle.numero_radicado) && (
              <div className="grid grid-cols-1 gap-4 border-t border-border px-6 py-4 sm:grid-cols-2">
                {detalle.entidad && <Dato label="Entidad" valor={detalle.entidad} />}
                {detalle.numero_radicado && <Dato label="Radicado" valor={detalle.numero_radicado} />}
              </div>
            )}

            {detalle?.observacion && (
              <div className="border-t border-border px-6 py-4">
                <p className="mb-1 text-xs text-muted-foreground">Observaciones</p>
                <p className="text-sm text-foreground">{detalle.observacion}</p>
              </div>
            )}

            {detalle?.editable.motivo_bloqueo && (
              <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {detalle.editable.motivo_bloqueo === 'RECHAZADA'
                    ? 'Una novedad rechazada no se edita: registra una nueva.'
                    : `Solo se pueden cambiar: ${detalle.editable.campos.join(', ')}.`}
                  {detalle.editable.nominas_cerradas.length > 0 &&
                    ' Hay días dentro de nóminas cerradas que no se pueden mover.'}
                </span>
              </div>
            )}

            {accion === 'editar' && detalle && init ? (
              <EditarNovedadForm
                detalle={detalle}
                categorias={init.categorias}
                soporte={init.parametros.soporte}
                onCancelar={() => setAccion(null)}
                onGuardado={(d) => {
                  setDetalle(d);
                  setAccion(null);
                  onCambio();
                }}
              />
            ) : accion === 'rechazar' ? (
              <div className="space-y-2 border-t border-border px-6 py-4">
                <Label>Motivo del rechazo</Label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej: no llegó el soporte después de 5 días hábiles"
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setAccion(null)} disabled={cargando}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={rechazar} disabled={cargando} className="gap-2">
                    {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Rechazar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {detalle && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => descargarSoporte(detalle)}
                      className="gap-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/5"
                    >
                      <FileSignature className="h-3.5 w-3.5" />
                      Acta para firma
                    </Button>
                  )}
                  {fila.tiene_soporte && esAusencia && (
                    <Button size="sm" variant="outline" onClick={bajarAdjunto} className="gap-2">
                      <Download className="h-3.5 w-3.5" />
                      Adjunto
                    </Button>
                  )}
                  {!fila.tiene_soporte && detalle?.motivo_ausencia.requiere_soporte && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <Paperclip className="h-3.5 w-3.5" />
                      Falta el soporte
                    </span>
                  )}
                  {fila.enlaces.detalle && !esAusencia && (
                    <Button size="sm" variant="outline" onClick={irAlDetalle} className="gap-2">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Ver completo
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* D7 — `campos` vacío significa que en este estado no hay
                      nada editable: el botón no se ofrece en lugar de abrir
                      un formulario sin campos. */}
                  {detalle && init && detalle.editable.campos.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccion('editar')}
                      disabled={cargando}
                      className="gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                  {esAusencia && fila.estado === 'PENDIENTE' && permisos?.puede_aprobar && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setAccion('rechazar')} disabled={cargando} className="gap-2">
                        <X className="h-3.5 w-3.5" />
                        Rechazar
                      </Button>
                      <Button size="sm" onClick={aprobar} disabled={cargando} className="gap-2 bg-success hover:bg-success/90">
                        {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Aprobar
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={onCerrar}>Cerrar</Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
