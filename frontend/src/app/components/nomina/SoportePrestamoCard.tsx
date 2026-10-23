/**
 * Soporte del préstamo: el pagaré o la autorización de descuento por nómina
 * (CST arts. 149-150), con su propia nota.
 *
 * Es un documento por préstamo: subir otro reemplaza el anterior. El archivo
 * se guarda en el expediente del colaborador, así que borrarlo desde la ficha
 * también deja el préstamo sin soporte.
 *
 * La tarjeta **no se pinta** cuando `documento` llega `undefined`: eso significa
 * que el backend todavía no expone el soporte, y ofrecer el botón solo daría un
 * 404. Con `null` sí se pinta, porque `null` es "no hay soporte, cárguelo".
 */
import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { Download, Eye, FileText, Loader2, Paperclip, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  prestamosApi, PrestamoErrorCodes, SOPORTE_PRESTAMO,
  type DocumentoPrestamo,
} from '../../../api/prestamos';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';

interface Props {
  prestamoId: number;
  documento: DocumentoPrestamo | null | undefined;
  /** Se llama tras subir, editar la nota o borrar, para recargar el préstamo. */
  onCambio: () => void;
}

/** Los bytes del backend, en algo que se pueda leer de un vistazo. */
function tamanoLegible(bytes: number | null): string {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function SoportePrestamoCard({ prestamoId, documento, onCambio }: Props) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [nota, setNota] = useState(documento?.observacion ?? '');
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  if (documento === undefined) return null;

  const subir = async (archivo: File) => {
    if (archivo.size / 1024 > SOPORTE_PRESTAMO.MAX_KB) {
      toast.error(`El archivo pesa más de ${Math.round(SOPORTE_PRESTAMO.MAX_KB / 1024)} MB`);
      return;
    }
    setTrabajando(true);
    try {
      // La nota viaja con el archivo: así una carga no borra lo ya escrito.
      const res = await prestamosApi.subirDocumento(prestamoId, archivo, nota.trim() || null);
      toast.success(res.message ?? 'Soporte cargado');
      onCambio();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo cargar el soporte');
    } finally {
      setTrabajando(false);
    }
  };

  /** Solo la nota, sin volver a subir el archivo. Vacía, la borra. */
  const guardarNota = async () => {
    setTrabajando(true);
    try {
      const res = await prestamosApi.subirDocumento(prestamoId, null, nota.trim() || null);
      toast.success(res.message ?? 'Observación actualizada');
      onCambio();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo guardar la observación');
    } finally {
      setTrabajando(false);
    }
  };

  const bajar = async (inline: boolean) => {
    try {
      const blob = await prestamosApi.descargarDocumento(prestamoId, inline);
      const url = URL.createObjectURL(blob);
      if (inline) {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = documento?.nombre_archivo ?? `soporte_prestamo_${prestamoId}`;
        a.click();
      }
      // Con `inline` la pestaña nueva necesita la URL viva un momento más.
      setTimeout(() => URL.revokeObjectURL(url), inline ? 60_000 : 0);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === PrestamoErrorCodes.MIME_NOT_PREVIEWABLE) {
        toast.error('Este archivo no se puede ver en el navegador: descárguelo');
      } else if (e.code === PrestamoErrorCodes.PRESTAMO_SIN_DOCUMENTO) {
        toast.error('El archivo ya no está disponible');
        onCambio();
      } else {
        toast.error(e.message ?? 'No se pudo abrir el soporte');
      }
    }
  };

  const borrar = async () => {
    setTrabajando(true);
    try {
      const res = await prestamosApi.eliminarDocumento(prestamoId);
      toast.success(res.message ?? 'Soporte eliminado');
      setNota('');
      setConfirmarBorrar(false);
      onCambio();
    } catch (err) {
      toast.error((err as ApiError).message ?? 'No se pudo eliminar el soporte');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Soporte del préstamo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          aria-label="Seleccionar archivo"
          ref={archivoRef}
          type="file"
          className="hidden"
          accept={SOPORTE_PRESTAMO.MIMES.map((m) => `.${m}`).join(',')}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = '';
            if (archivo) void subir(archivo);
          }}
        />

        {documento ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{documento.nombre_archivo}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  tamanoLegible(documento.archivo_tamano),
                  documento.subido_por,
                  documento.subido_at
                    ? formatFecha(documento.subido_at, { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {documento.previsualizable && (
                <Button size="sm" variant="outline" onClick={() => void bajar(true)} className="gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void bajar(false)} className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Descargar
              </Button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            Sin soporte cargado. Adjunte el pagaré o la autorización de descuento.
          </p>
        )}

        <div>
          <Label htmlFor="soportepre-observacion-del-documento">Observación del documento</Label>
          <Textarea id="soportepre-observacion-del-documento"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Ej: pagaré firmado el 5 de enero, con dos testigos"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Es la nota del archivo, distinta de las observaciones del préstamo.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {documento && (
            <Button
              variant="outline"
              onClick={() => setConfirmarBorrar(true)}
              disabled={trabajando}
              className="gap-2 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          {documento && (
            <Button variant="outline" onClick={guardarNota} disabled={trabajando} className="gap-2">
              {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar observación
            </Button>
          )}
          <Button
            onClick={() => archivoRef.current?.click()}
            disabled={trabajando}
            className="gap-2"
          >
            {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {documento ? 'Reemplazar archivo' : 'Subir soporte'}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmarBorrar} onOpenChange={setConfirmarBorrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el soporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el archivo del expediente del colaborador y el préstamo queda sin
              soporte. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={trabajando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={borrar} disabled={trabajando}>
              {trabajando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
