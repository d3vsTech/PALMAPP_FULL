import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle,
  Loader2, XCircle, FileArchive, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi, descargarBlob,
  ESTADOS_IMPORTACION_TERMINALES,
  type ImportacionProductos, type EstadoImportacionProductos,
} from '../../../api/proveedor';

/** Validación local del ZIP antes de subir (rebote inmediato). */
function validarZipLocal(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'El archivo debe tener extensión .zip';
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'El archivo no puede superar los 50 MB';
  }
  // Algunos navegadores no detectan mime de ZIP correctamente; solo rechazamos
  // si el browser sí lo identificó pero NO es zip. Si type es '', dejamos pasar.
  if (file.type && !file.type.includes('zip')) {
    return 'El archivo debe ser un ZIP válido';
  }
  return null;
}

/**
 * Convierte cualquier error del backend, red o validación de Laravel a un
 * mensaje legible en español. Si el mensaje ya está en español, lo devuelve
 * tal cual. Cubre los casos comunes que pueden venir en inglés (Laravel sin
 * traducir, errores HTTP genéricos, mensajes nativos del fetch).
 */
function traducirErrorImportacion(err: any): string {
  // 1) Errores de validación 422 — primer mensaje del array de `errors`.
  const primerError = err?.errors?.archivo?.[0]
    ?? (err?.errors ? Object.values(err.errors).flat()[0] : null);
  const mensaje = typeof primerError === 'string'
    ? primerError
    : (err?.message ?? '');

  // 2) Mapeo de mensajes y claves conocidas → español.
  const TRADUCCIONES: Array<[RegExp | string, string]> = [
    // Laravel sin traducir
    [/validation\.mimes/i, 'El archivo debe ser un ZIP (.zip).'],
    [/validation\.max\.file/i, 'El archivo no puede superar los 50 MB.'],
    [/validation\.max/i, 'El archivo excede el tamaño permitido.'],
    [/validation\.required/i, 'Debes adjuntar un archivo ZIP.'],
    [/validation\.file/i, 'El campo archivo debe ser un archivo válido.'],
    [/must be a file of type/i, 'El archivo debe ser un ZIP (.zip).'],
    [/may not be greater than/i, 'El archivo no puede superar los 50 MB.'],
    [/is required/i, 'Debes adjuntar un archivo ZIP.'],

    // HTTP / red
    [/^Failed to fetch$/i, 'No se pudo conectar con el servidor. Verifica tu conexión.'],
    [/^NetworkError/i, 'No se pudo conectar con el servidor. Verifica tu conexión.'],
    [/Network request failed/i, 'No se pudo conectar con el servidor. Verifica tu conexión.'],
    [/Request Entity Too Large/i, 'El archivo es demasiado grande. Máximo 50 MB.'],
    [/^Payload Too Large$/i, 'El archivo es demasiado grande. Máximo 50 MB.'],
    [/^Internal Server Error$/i, 'Error interno del servidor. Inténtalo de nuevo en unos minutos.'],
    [/^Server Error$/i, 'Error del servidor. Inténtalo de nuevo en unos minutos.'],
    [/^Bad Gateway$/i, 'El servidor no respondió. Inténtalo de nuevo en unos segundos.'],
    [/^Gateway Timeout$/i, 'El servidor tardó demasiado en responder.'],
    [/^Service Unavailable$/i, 'El servicio no está disponible temporalmente.'],
    [/^Unauthorized$/i, 'Tu sesión expiró. Vuelve a iniciar sesión.'],
    [/^Forbidden$/i, 'No tienes permisos para realizar esta acción.'],
    [/^Not Found$/i, 'No se encontró el recurso solicitado.'],

    // Códigos de error específicos del doc
    [/IMPORTACION_INIT_ERROR/i, 'No se pudo iniciar la importación. Inténtalo de nuevo.'],
    [/PROVEEDOR_NOT_SELECTED/i, 'No has seleccionado un proveedor. Inicia sesión otra vez.'],
    [/IMPORTACION_NOT_FOUND/i, 'No se encontró la importación.'],
  ];

  for (const [patron, traduccion] of TRADUCCIONES) {
    if (typeof patron === 'string' ? mensaje.includes(patron) : patron.test(mensaje)) {
      return traduccion;
    }
  }

  // 3) Si el mensaje no está vacío, devolverlo tal cual (asumimos español).
  if (mensaje.trim()) return mensaje;

  // 4) Fallback final por código HTTP.
  if (err?.status === 413) return 'El archivo es demasiado grande. Máximo 50 MB.';
  if (err?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (err?.status === 403) return 'No tienes permisos para realizar esta acción.';
  if (err?.status === 500) return 'Error interno del servidor. Inténtalo de nuevo.';

  return 'No se pudo iniciar la importación. Inténtalo de nuevo.';
}

const estadoLabel: Record<EstadoImportacionProductos, string> = {
  PENDIENTE:   'En cola',
  PROCESANDO:  'Procesando',
  COMPLETADO:  'Completado',
  CON_ERRORES: 'Con errores',
  FALLIDO:     'Falló',
};

const estadoBadgeClass: Record<EstadoImportacionProductos, string> = {
  PENDIENTE:   'bg-muted text-muted-foreground border-border',
  PROCESANDO:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
  COMPLETADO:  'bg-success/10 text-success border-success/20',
  CON_ERRORES: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  FALLIDO:     'bg-destructive/10 text-destructive border-destructive/20',
};

export default function CargaMasivaProductos() {
  const navigate = useNavigate();
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [importacion, setImportacion] = useState<ImportacionProductos | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Referencia para cortar el polling si el usuario sale o reinicia.
  const cancelarPollingRef = useRef<{ cancelado: boolean }>({ cancelado: false });

  useEffect(() => {
    return () => { cancelarPollingRef.current.cancelado = true; };
  }, []);

  const descargarPlantilla = async () => {
    setDescargandoPlantilla(true);
    try {
      const blob = await proveedorApi.descargarPlantillaProductos();
      descargarBlob(blob, 'plantilla_productos.xlsx');
    } catch (e: any) {
      toast.error(traducirErrorImportacion(e));
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  /** Polling cada 2.5s hasta llegar a un estado terminal o timeout (10 min). */
  const pollearImportacion = async (id: number) => {
    cancelarPollingRef.current = { cancelado: false };
    const start = Date.now();
    const TIMEOUT_MS = 600_000;
    const INTERVAL_MS = 2500;
    let intervaloActual = INTERVAL_MS;

    while (!cancelarPollingRef.current.cancelado) {
      if (Date.now() - start > TIMEOUT_MS) {
        toast.error('Tiempo de espera agotado. La importación sigue en proceso; recarga en unos minutos.');
        return;
      }
      try {
        const res = await proveedorApi.estadoImportacionProductos(id);
        setImportacion(res.data);
        if (ESTADOS_IMPORTACION_TERMINALES.includes(res.data.estado)) return;
        // Backoff si hay muchas filas: tras 30s subimos a 4s.
        if (Date.now() - start > 30_000 && res.data.total_filas > 200) {
          intervaloActual = 4000;
        }
      } catch (e: any) {
        // No abortamos al primer error de red; intentamos de nuevo.
        if (e?.code === 'IMPORTACION_NOT_FOUND') {
          toast.error('Importación no encontrada');
          return;
        }
      }
      await new Promise(r => setTimeout(r, intervaloActual));
    }
  };

  const handleArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const errorLocal = validarZipLocal(archivo);
    if (errorLocal) {
      toast.error(errorLocal);
      e.target.value = '';
      return;
    }

    setSubiendo(true);
    setImportacion(null);
    try {
      const res = await proveedorApi.iniciarImportacionProductos(archivo);
      const id = res.data.importacion_id;
      // Estado optimista para que la UI muestre "En cola" mientras polling arranca.
      setImportacion({
        id,
        estado: res.data.estado,
        nombre_archivo_original: archivo.name,
        total_filas: 0,
        filas_exitosas: 0,
        filas_fallidas: 0,
        error_fatal: null,
        resultados: [],
        iniciado_at: null,
        finalizado_at: null,
        created_at: new Date().toISOString(),
      });
      toast.success('Archivo recibido. Procesando en segundo plano...');
      pollearImportacion(id);
    } catch (err: any) {
      toast.error(traducirErrorImportacion(err));
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const reiniciar = () => {
    cancelarPollingRef.current.cancelado = true;
    setImportacion(null);
    if (inputFileRef.current) inputFileRef.current.value = '';
  };

  const estado = importacion?.estado;
  const esTerminal = estado ? ESTADOS_IMPORTACION_TERMINALES.includes(estado) : false;
  const procesando = estado === 'PENDIENTE' || estado === 'PROCESANDO';
  const progresoPct = importacion && importacion.total_filas > 0
    ? Math.round(((importacion.filas_exitosas + importacion.filas_fallidas) / importacion.total_filas) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proveedor/productos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carga Masiva de Productos</h1>
          <p className="text-muted-foreground mt-1">
            Importa múltiples productos con sus imágenes desde un archivo ZIP
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda — Instrucciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Descarga la plantilla Excel</p>
                    <p className="text-sm text-muted-foreground">
                      Trae las 13 columnas correctas con una fila de ejemplo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Llena el Excel y arma la carpeta <code className="text-xs bg-muted px-1 rounded">imagenes/</code></p>
                    <p className="text-sm text-muted-foreground">
                      Cada imagen debe coincidir exactamente con el nombre que pongas en la columna de la plantilla.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Comprime todo en un solo ZIP</p>
                    <p className="text-sm text-muted-foreground">
                      El ZIP debe contener <code className="text-xs bg-muted px-1 rounded">productos.xlsx</code> y la carpeta <code className="text-xs bg-muted px-1 rounded">imagenes/</code> en la raíz.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Sube el ZIP</p>
                    <p className="text-sm text-muted-foreground">
                      El procesamiento ocurre en segundo plano; verás el progreso aquí.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Límites y validaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Tamaño máx. del ZIP:</strong> 50 MB</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Filas máx. en el Excel:</strong> 500</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Tamaño máx. por imagen:</strong> 3 MB</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Formatos de imagen:</strong> jpg, jpeg, png, webp</span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 mt-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-200">
                    Los SKUs duplicados con productos ya existentes en tu catálogo serán marcados como fallidos. El resto se importa normalmente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descargar plantilla</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={descargarPlantilla}
                disabled={descargandoPlantilla}
                className="w-full gap-2"
              >
                {descargandoPlantilla
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Descargar plantilla Excel
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                La plantilla incluye las 13 columnas y un ejemplo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha — Subir + estado en vivo */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Subir archivo ZIP</span>
                {importacion && (
                  <Badge variant="outline" className={estadoBadgeClass[importacion.estado]}>
                    {estadoLabel[importacion.estado]}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Caso 1: sin importación en curso → drop zone */}
              {!importacion && (
                <>
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                    <input
                      ref={inputFileRef}
                      type="file"
                      id="archivo-zip"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={handleArchivoChange}
                      className="hidden"
                      disabled={subiendo}
                    />
                    <label htmlFor="archivo-zip" className="cursor-pointer">
                      <div className="mb-4 flex justify-center">
                        <div className={`p-4 rounded-full ${subiendo ? 'bg-muted animate-pulse' : 'bg-primary/10'}`}>
                          <Upload className={`h-10 w-10 ${subiendo ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">
                        {subiendo ? 'Subiendo archivo...' : 'Haz clic para subir tu archivo'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ZIP con <code className="text-xs bg-muted px-1 rounded">productos.xlsx</code> + carpeta <code className="text-xs bg-muted px-1 rounded">imagenes/</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Máx. 50 MB · 500 filas
                      </p>
                    </label>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/proveedor/productos')}
                    className="w-full"
                    disabled={subiendo}
                  >
                    Cancelar
                  </Button>
                </>
              )}

              {/* Caso 2: importación en curso o terminada */}
              {importacion && (
                <div className="space-y-4">
                  {/* Archivo */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{importacion.nombre_archivo_original}</p>
                      <p className="text-xs text-muted-foreground">
                        ID importación: #{importacion.id}
                      </p>
                    </div>
                  </div>

                  {/* Mientras procesa: barra animada */}
                  {procesando && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {estado === 'PENDIENTE'
                            ? 'En cola, esperando worker...'
                            : 'Procesando productos en el servidor...'}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: '40%' }} />
                      </div>
                    </div>
                  )}

                  {/* Resumen al finalizar */}
                  {esTerminal && (
                    <>
                      {estado === 'COMPLETADO' && (
                        <div className="rounded-lg border-2 border-success bg-success/5 p-6 text-center">
                          <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                          <h3 className="font-semibold mb-1">¡Importación exitosa!</h3>
                          <p className="text-sm text-muted-foreground">
                            Se cargaron {importacion.filas_exitosas} productos correctamente.
                          </p>
                        </div>
                      )}
                      {estado === 'CON_ERRORES' && (
                        <div className="rounded-lg border-2 border-orange-500 bg-orange-500/5 p-6 text-center">
                          <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                          <h3 className="font-semibold mb-1">Importación parcial</h3>
                          <p className="text-sm text-muted-foreground">
                            {importacion.filas_exitosas} productos creados ·{' '}
                            {importacion.filas_fallidas} con errores.
                          </p>
                        </div>
                      )}
                      {estado === 'FALLIDO' && (
                        <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6">
                          <div className="flex gap-3">
                            <XCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <h3 className="font-semibold mb-1">La importación falló</h3>
                              <p className="text-sm text-muted-foreground break-words">
                                {importacion.error_fatal ?? 'Error inesperado al procesar el archivo.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Métricas */}
                      {importacion.total_filas > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-2xl font-bold">{importacion.total_filas}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-success/10">
                            <p className="text-2xl font-bold text-success">{importacion.filas_exitosas}</p>
                            <p className="text-xs text-muted-foreground">Exitosas</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-destructive/10">
                            <p className="text-2xl font-bold text-destructive">{importacion.filas_fallidas}</p>
                            <p className="text-xs text-muted-foreground">Fallidas</p>
                          </div>
                        </div>
                      )}

                      {/* Progreso visual */}
                      {progresoPct > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Procesado</span>
                            <span>{progresoPct}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${progresoPct}%` }} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Acciones post-finalización */}
                  {esTerminal && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={reiniciar} className="flex-1 gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Subir otro archivo
                      </Button>
                      {importacion.filas_exitosas > 0 && (
                        <Button onClick={() => navigate('/proveedor/productos')} className="flex-1">
                          Ver mis productos
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla de resultados detallados (filas fallidas/exitosas) */}
      {importacion && esTerminal && importacion.resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por fila</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead className="w-32">Estado</TableHead>
                    <TableHead className="w-40">SKU</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importacion.resultados.map((r, i) => (
                    <TableRow key={`${r.fila}-${i}`}>
                      <TableCell className="font-mono text-xs">{r.fila}</TableCell>
                      <TableCell>
                        {r.estado === 'exitoso' ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Exitoso
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                            <XCircle className="h-3 w-3" />
                            Fallido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.sku ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.mensaje}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
