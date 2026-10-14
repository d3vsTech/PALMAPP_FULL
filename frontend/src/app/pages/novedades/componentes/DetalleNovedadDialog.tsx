/**
 * Detalle de una novedad del listado.
 *
 * Dos de las tres fuentes traen detalle propio: las ausencias (§4.2, con
 * `editable{}` para saber qué se puede tocar y los botones de aprobar y
 * rechazar) y las terminaciones de contrato (§6.2, con el motivo del catálogo,
 * las observaciones y la liquidación final si ya existe). Las vacaciones se
 * ven con lo que trae la fila y enlazan a su comprobante.
 *
 * `enlaces.detalle` de la fila es una ruta de **API**, no del front: el front
 * la traduce a la pantalla que corresponde (`rutaDelDetalle`). Navegar a ella
 * tal cual lleva a un 404.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '../../../components/ui/dialog';
import {
  AlertTriangle, ArrowUpRight, Calendar, Check, Download, Eye, FileSignature,
  FileText, Loader2, Paperclip, Pencil, Receipt, Trash2, Upload, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  type AusenciaDetalle, type InitNovedades, type NovedadFila, type PermisosNovedades,
  type TerminacionData,
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

/**
 * A qué pantalla del front lleva "Ver completo".
 *
 * No se puede navegar a `enlaces.detalle` tal cual: son rutas de la API
 * (`novedades/terminaciones/31`) y el router no las conoce. Una terminación se
 * corrige desde la ficha del colaborador (`PUT colaboradores/{id}`), así que
 * ahí es donde lleva.
 */
function rutaDelDetalle(fila: NovedadFila): { ruta: string; etiqueta: string } | null {
  switch (fila.fuente) {
    case 'VACACION':
      return { ruta: `/liquidaciones/vacaciones/${fila.id}`, etiqueta: 'Ver liquidación' };
    case 'TERMINACION':
      return { ruta: `/colaboradores/${fila.empleado.id}`, etiqueta: 'Ver colaborador' };
    default:
      // La ausencia ya se ve completa en este mismo diálogo.
      return null;
  }
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

/** Los bytes del backend, en algo que se lea de un vistazo. */
function tamanoLegible(bytes: number | null | undefined): string {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DetalleNovedadDialog({ fila, permisos, init, onCerrar, onCambio }: Props) {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<AusenciaDetalle | null>(null);
  const [terminacion, setTerminacion] = useState<TerminacionData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | 'editar' | 'eliminar' | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  /** El input de archivo vive oculto: el botón visible es el que se dispara. */
  const archivoRef = useRef<HTMLInputElement>(null);

  const esAusencia = fila?.fuente === 'AUSENCIA';
  /*
   * §5.3 — Una vacación no tiene DELETE: la solicitud PENDIENTE se rechaza
   * (queda CANCELADA y libera el rango), la APROBADA se anula desde
   * Liquidaciones y la PAGADA exige anular el pago primero. El rechazo tiene
   * dos puertas al mismo código; desde aquí se usa la de Novedades.
   */
  const esSolicitudVacacion = fila?.fuente === 'VACACION' && fila.estado === 'PENDIENTE';
  /** §4.2 — Lo decide el backend: una LIQUIDADA o con días en nómina cerrada no. */
  const puedeEliminar = esAusencia && (detalle?.editable.puede_eliminar ?? false);

  useEffect(() => {
    setDetalle(null);
    setTerminacion(null);
    setAccion(null);
    setMotivoRechazo('');
    if (!fila) return;

    // Una terminación de origen FICHA no tiene detalle (§6.2): el tenant no
    // lleva contratos y el retiro vive solo en la ficha del colaborador.
    const pide = fila.fuente === 'AUSENCIA'
      || (fila.fuente === 'TERMINACION' && !!fila.enlaces.detalle);
    if (!pide) return;

    let vivo = true;
    setCargando(true);
    const peticion = fila.fuente === 'AUSENCIA'
      // En una terminación `id` es el id del CONTRATO, no del colaborador.
      ? novedadesApi.ausencias.ver(fila.id).then((res) => { if (vivo) setDetalle(res.data); })
      : novedadesApi.terminaciones.ver(fila.id).then((res) => { if (vivo) setTerminacion(res.data); });

    peticion
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

  /**
   * §4.6 (PR-N8) — Subir el soporte **aprueba** la novedad si quien lo sube
   * puede aprobar. Si no, queda adjunto y la respuesta avisa con
   * `SOPORTE_SIN_APROBAR`: por eso el `message` del backend se muestra tal
   * cual en vez de un texto propio, es el único que sabe cómo quedó.
   */
  const subirSoporte = async (archivo: File) => {
    if (!fila) return;
    const maxKb = init?.parametros.soporte.max_kb;
    if (maxKb && archivo.size / 1024 > maxKb) {
      toast.error(`El archivo pesa más de ${Math.round(maxKb / 1024)} MB`);
      return;
    }
    setCargando(true);
    try {
      const res = await novedadesApi.ausencias.subirDocumento(fila.id, archivo);
      toast.success(res.message ?? 'Soporte adjuntado');
      for (const a of res.advertencias ?? []) toast.warning(a.mensaje ?? a.code, { duration: 7000 });
      setDetalle(res.data);
      onCambio();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo adjuntar el soporte');
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
      const res = esSolicitudVacacion
        ? await novedadesApi.vacaciones.rechazar(fila.id, motivoRechazo.trim())
        : await novedadesApi.ausencias.rechazar(fila.id, motivoRechazo.trim());
      toast.success(res.message ?? 'Novedad rechazada');
      onCambio();
      onCerrar();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo rechazar');
    } finally {
      setCargando(false);
    }
  };

  /**
   * §4.3 — Borrado físico, solo de ausencias. Se lleva el soporte del
   * expediente, así que no hay vuelta atrás y se confirma aparte.
   */
  const eliminar = async () => {
    if (!fila) return;
    setCargando(true);
    try {
      const res = await novedadesApi.ausencias.eliminar(fila.id);
      toast.success(res.message ?? 'Novedad eliminada');
      onCambio();
      onCerrar();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'AUSENCIA_LIQUIDADA') {
        toast.error('Ya se liquidó en una nómina: no se puede eliminar');
      } else if (e.code === 'NOVEDAD_EN_NOMINA_CERRADA') {
        toast.error('Sus días caen en una nómina cerrada: no se puede eliminar');
      } else {
        toast.error(e.message ?? 'No se pudo eliminar');
      }
    } finally {
      setCargando(false);
    }
  };

  /**
   * El archivo que subió el usuario, no el acta generada.
   *
   * Con `inline` se abre en una pestaña; solo lo admiten pdf, jpeg, png y webp
   * (`documento.previsualizable`), y por eso el botón "Ver" no sale siempre.
   */
  const bajarAdjunto = async (inline = false) => {
    if (!fila) return;
    try {
      const blob = await novedadesApi.ausencias.descargarDocumento(fila.id, inline);
      const url = URL.createObjectURL(blob);
      if (inline) {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = detalle?.documento?.nombre_archivo ?? `soporte_novedad_${fila.id}`;
        a.click();
      }
      // La pestaña nueva necesita la URL viva un rato más que una descarga.
      setTimeout(() => URL.revokeObjectURL(url), inline ? 60_000 : 0);
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo abrir el soporte');
    }
  };

  const irA = (ruta: string) => {
    onCerrar();
    navigate(ruta);
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
                    {fila.fuente === 'TERMINACION'
                      ? 'Terminación de contrato'
                      : `Registrada desde ${ORIGEN_LABEL[fila.origen] ?? fila.origen}`}
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
              {/* v1.6 (PR-L15) — Solo lectura: el modo se escoge al liquidar
                  en Liquidaciones. Aquí importa porque explica por qué la
                  quincena del disfrute trae ese valor. */}
              {fila.modo_pago && (
                <Dato
                  label="Forma de pago"
                  valor={fila.modo_pago === 'NOMINA'
                    ? 'En nómina: cada nómina del disfrute paga su tramo'
                    : 'Pago directo desde Liquidaciones'}
                />
              )}
            </div>

            {terminacion && (
              <>
                <div className="grid grid-cols-1 gap-4 border-t border-border px-6 py-4 sm:grid-cols-2">
                  <Dato label="Motivo" valor={terminacion.terminacion.motivo.etiqueta} />
                  <Dato label="Norma" valor={terminacion.terminacion.motivo.norma || '—'} />
                  {terminacion.contrato && (
                    <>
                      <Dato label="Tipo de contrato" valor={terminacion.contrato.tipo_contrato} />
                      <Dato icono label="Inicio del contrato" valor={formatFecha(terminacion.contrato.fecha_inicio)} />
                    </>
                  )}
                </div>

                {terminacion.terminacion.observaciones && (
                  <div className="border-t border-border px-6 py-4">
                    <p className="mb-1 text-xs text-muted-foreground">Observaciones</p>
                    <p className="text-sm text-foreground">{terminacion.terminacion.observaciones}</p>
                  </div>
                )}

                {/*
                  Por qué esta fila existe si la ficha no muestra retiro.
                  `coincide_con_ficha` es la señal: el contrato conserva su
                  terminación aunque después alguien reingrese al colaborador
                  desde la ficha, porque un reingreso abre un contrato nuevo y
                  no resucita el anterior. Sin decirlo, la fila parece salida
                  de la nada.
                */}
                {(() => {
                  const t = terminacion.terminacion;
                  const notas: string[] = [];
                  if (!t.coincide_con_ficha) {
                    notas.push(
                      terminacion.empleado.fecha_retiro
                        ? `La ficha del colaborador registra otro retiro (${formatFecha(terminacion.empleado.fecha_retiro)}). Esta fila es la del contrato.`
                        : 'La ficha del colaborador ya no registra retiro: se reingresó después. Esta fila es el contrato anterior, que quedó terminado.',
                    );
                  } else if (!t.ficha_inactivada) {
                    notas.push('La ficha del colaborador sigue activa: se apaga el día del retiro.');
                  }
                  if (t.reingreso) {
                    notas.push('El colaborador reingresó con un contrato posterior a esta terminación.');
                  }
                  if (notas.length === 0) return null;
                  return (
                    <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="space-y-1">
                        {notas.map((n) => <span key={n} className="block">{n}</span>)}
                      </span>
                    </div>
                  );
                })()}
              </>
            )}

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

            {/*
              El soporte se ve, no se adivina. Antes era un botón "Adjunto" en
              la fila de acciones, al lado del acta para firma y del botón de
              subir: tres cosas distintas que parecían la misma. Aquí el archivo
              se muestra con su nombre y su peso, y las acciones que le
              corresponden quedan pegadas a él.
            */}
            {esAusencia && detalle && (
              <div className="border-t border-border px-6 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Soporte adjunto
                </p>
                {detalle.documento ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{detalle.documento.nombre_archivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {tamanoLegible(detalle.documento.archivo_tamano) || 'Archivo adjunto'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detalle.documento.previsualizable && (
                        <Button size="sm" variant="outline" onClick={() => void bajarAdjunto(true)} className="gap-2">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void bajarAdjunto(false)} className="gap-2">
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    {detalle.motivo_ausencia.requiere_soporte
                      ? 'Este motivo pide soporte y todavía no se ha adjuntado.'
                      : 'Sin soporte adjunto.'}
                  </p>
                )}

                {/* §4.6 — Se adjunta en cualquier estado que lo admita; en una
                    PENDIENTE además aprueba si quien sube puede aprobar. */}
                {detalle.editable.campos.includes('documento') && (
                  <>
                    <input
                      ref={archivoRef}
                      type="file"
                      className="hidden"
                      accept={init?.parametros.soporte.mimes.map((m) => `.${m}`).join(',')}
                      onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        e.target.value = '';
                        if (archivo) void subirSoporte(archivo);
                      }}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archivoRef.current?.click()}
                        disabled={cargando}
                        className="gap-2"
                      >
                        {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {detalle.documento ? 'Reemplazar soporte' : 'Subir soporte'}
                      </Button>
                      {fila.estado === 'PENDIENTE' && permisos?.puede_aprobar && (
                        <span className="text-xs text-muted-foreground">
                          Al adjuntar el certificado la novedad queda aprobada.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* El formulario de edición trae su propio aviso, más explícito y
                pegado a los campos: mostrar los dos decía lo mismo dos veces. */}
            {detalle?.editable.motivo_bloqueo && accion !== 'editar' && (
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
            ) : accion === 'eliminar' ? (
              <div className="space-y-3 border-t border-border px-6 py-4">
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Se elimina la novedad y su soporte del expediente. No se puede deshacer.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAccion(null)} disabled={cargando}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={eliminar} disabled={cargando} className="gap-2">
                    {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : accion === 'rechazar' ? (
              <div className="space-y-2 border-t border-border px-6 py-4">
                <Label>Motivo del rechazo</Label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder={esSolicitudVacacion
                    ? 'Ej: no hay cobertura en campo esa semana'
                    : 'Ej: no llegó el soporte después de 5 días hábiles'}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {esSolicitudVacacion && (
                  <p className="text-xs text-muted-foreground">
                    La solicitud queda rechazada y las fechas vuelven a estar libres.
                  </p>
                )}
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
                  {/* El acta que genera la finca para que el colaborador
                      firme: no tiene nada que ver con el archivo adjunto, por
                      eso el nombre dice que se genera. */}
                  {detalle && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => descargarSoporte(detalle)}
                      className="gap-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/5"
                    >
                      <FileSignature className="h-3.5 w-3.5" />
                      Generar acta para firma
                    </Button>
                  )}

                  {/* Una terminación ya liquidada enlaza a su liquidación
                      final: es el documento que cierra el retiro. */}
                  {terminacion?.liquidacion && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => irA(`/liquidaciones/liquidacion-final/${terminacion.liquidacion!.id}`)}
                      className="gap-2"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Liquidación final
                    </Button>
                  )}
                  {(() => {
                    const destino = rutaDelDetalle(fila);
                    if (!destino) return null;
                    return (
                      <Button size="sm" variant="outline" onClick={() => irA(destino.ruta)} className="gap-2">
                        {fila.fuente === 'TERMINACION'
                          ? <User className="h-3.5 w-3.5" />
                          : <ArrowUpRight className="h-3.5 w-3.5" />}
                        {destino.etiqueta}
                      </Button>
                    );
                  })()}
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
                  {puedeEliminar && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccion('eliminar')}
                      disabled={cargando}
                      className="gap-2 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
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
                  {/* La solicitud de vacaciones se liquida desde Liquidaciones
                      (ese es el botón "Liquidar" de arriba); aquí solo se
                      rechaza. */}
                  {esSolicitudVacacion && permisos?.puede_aprobar && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccion('rechazar')}
                      disabled={cargando}
                      className="gap-2 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rechazar solicitud
                    </Button>
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
