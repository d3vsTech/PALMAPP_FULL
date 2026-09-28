/**
 * Piezas compartidas por las dos pantallas de cargue histórico (§12.5 y §13.5).
 *
 * Cesantías y prima son la misma pantalla con columnas distintas: elegir el
 * período, bajar la plantilla, subir el archivo, revisar la tabla y cargar.
 * Lo que se repite entre las dos vive aquí para que un arreglo en el mensaje
 * de un error no haya que hacerlo dos veces.
 */
import { useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Info, Loader2, Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import type { ApiError } from '../../../../api/client';
import {
  descripcionFormato,
  HistoricoArchivoErrorCodes as E,
  MOTIVO_ARCHIVO_LABEL,
  type ArchivoHistorico,
  type IncidenciaFila,
} from '../../../../api/historicoComun';

/** `ApiError` es una interfaz, no una clase: se reconoce por forma. */
export function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'message' in e;
}

/**
 * Los códigos que rechazan el archivo completo traen su propia explicación.
 * Un 422 de validación de Laravel llega sin `code` y con `errors{}`: ahí lo
 * que sirve es el texto del campo, no el genérico.
 */
export function mensajeArchivo(e: unknown): string {
  if (!esApiError(e)) return 'No se pudo procesar el archivo';

  if (e.code === E.HISTORICO_ARCHIVO_INVALIDO) {
    const motivo = (e as { motivo?: keyof typeof MOTIVO_ARCHIVO_LABEL }).motivo;
    const faltantes = (e as { faltantes?: string[] }).faltantes;
    const base = motivo ? MOTIVO_ARCHIVO_LABEL[motivo] : e.message;
    return faltantes?.length ? `${base} Faltan: ${faltantes.join(', ')}.` : base;
  }
  if (e.code === E.HISTORICO_ARCHIVO_VACIO) {
    return 'El archivo no tiene ninguna fila con datos.';
  }
  if (e.code === E.HISTORICO_SEMESTRE_NO_CERRADO) {
    return 'Ese semestre todavía no termina. Solo se cargan semestres ya cerrados.';
  }
  if (e.code === E.CONFIG_LEGAL_INCOMPLETA) {
    return 'Faltan constantes legales. Revise Configuración, Legal, Constantes legales.';
  }

  const primerCampo = Object.values(e.errors ?? {})[0]?.[0];
  return primerCampo || e.message || 'No se pudo procesar el archivo';
}

// ─── Piezas visuales ──────────────────────────────────────────────────────────

/** Una regla numerada, con el número alineado como en la plantilla. */
export function Regla({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-5 shrink-0 text-right font-medium text-muted-foreground">{n}.</span>
      <span>{children}</span>
    </p>
  );
}

/**
 * Cómo se leyó el archivo.
 *
 * Con un CSV esto no es un adorno: si el lector tomó el separador equivocado
 * el archivo se ve como una sola columna y todas las filas fallan igual. Decir
 * "CSV separado por punto y coma" es lo único que le permite al usuario
 * entender por qué, sin abrir el archivo en un editor de texto.
 */
export function ChipFormato({ archivo }: { archivo: ArchivoHistorico | undefined }) {
  const texto = descripcionFormato(archivo);
  if (!texto) return null;
  return (
    <Badge variant="outline" className="font-normal">
      {texto}
    </Badge>
  );
}

interface PropsSelector {
  archivo: File | null;
  /** Línea bajo el nombre: filas leídas y el período elegido. */
  detalle?: React.ReactNode;
  analisis?: ArchivoHistorico;
  onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitar: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
}

/** El selector de archivo, con el nombre y el formato una vez elegido. */
export function SelectorArchivo({
  archivo,
  detalle,
  analisis,
  onElegir,
  onQuitar,
  inputRef,
  accept,
}: PropsSelector) {
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onElegir} />

      {!archivo ? (
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="h-12 w-full gap-2 border-dashed"
        >
          <Upload className="h-4 w-4" />
          Seleccionar archivo
        </Button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{archivo.name}</p>
                <ChipFormato archivo={analisis} />
              </div>
              {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuitar} className="px-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}


/**
 * Un paso del cargue, con el círculo numerado a la izquierda y la acción
 * principal del paso a la derecha del encabezado.
 */
export function PasoCard({
  n,
  titulo,
  subtitulo,
  accion,
  children,
}: {
  n: number;
  titulo: string;
  subtitulo?: string;
  /** Botón del encabezado, alineado a la derecha (ej. "Descargar plantilla"). */
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {n}
            </span>
            <div>
              <p className="font-semibold text-foreground">{titulo}</p>
              {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
            </div>
          </div>
          {accion}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">{children}</CardContent>
    </Card>
  );
}

/** Los formatos que acepta el cargue, como chip bajo la zona de arrastre. */
export function ChipExtensiones({ accept }: { accept: string }) {
  return (
    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
      {accept.split(',').map((e) => e.trim()).join(' · ')}
    </span>
  );
}

interface PropsZona {
  archivo: File | null;
  /** Línea bajo el nombre: filas leídas y el período elegido. */
  detalle?: React.ReactNode;
  analisis?: ArchivoHistorico;
  /** Recibe el archivo, venga del input o de un arrastre. */
  onArchivo: (file: File) => void;
  onQuitar: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
}

/**
 * Zona de arrastrar y soltar. Reemplaza al botón "Seleccionar archivo": el
 * input sigue existiendo oculto, porque arrastrar no es una opción en móvil
 * ni con teclado.
 */
export function ZonaArchivo({
  archivo,
  detalle,
  analisis,
  onArchivo,
  onQuitar,
  inputRef,
  accept,
}: PropsZona) {
  const [encima, setEncima] = useState(false);

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    setEncima(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onArchivo(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Se limpia para poder volver a elegir el mismo archivo tras un error.
          e.target.value = '';
          if (file) onArchivo(file);
        }}
      />

      {!archivo ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltar}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            encima ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Arrastra tu archivo aquí</p>
            <p className="text-sm font-medium text-primary">o haz clic para seleccionar</p>
          </div>
          <ChipExtensiones accept={accept} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{archivo.name}</p>
                <ChipFormato archivo={analisis} />
              </div>
              {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuitar} className="px-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}


/** Una columna de la plantilla, como la nombra el backend en la fila 1. */
export interface ColumnaPlantilla {
  /** El nombre exacto de la cabecera. Cambiarlo rompe el cargue. */
  nombre: string;
  /** La celda no puede ir vacía. La cabecera es obligatoria siempre. */
  requerida?: boolean;
}

/**
 * Vista previa de la plantilla: las columnas con su nombre exacto y unas
 * filas de ejemplo.
 *
 * Los nombres salen del contrato (API_LIQUIDACIONES §12.1 y §13.1) y son la
 * única parte del archivo que el usuario no puede inventar: el lector
 * reconoce las cabeceras por nombre y descarta las que no conoce.
 */
export function VistaPreviaPlantilla({
  columnas,
  filas,
}: {
  columnas: ColumnaPlantilla[];
  filas: string[][];
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columnas.map((c) => (
                <th
                  key={c.nombre}
                  className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-foreground"
                >
                  {c.nombre}
                  {c.requerida && <span className="ml-1 text-destructive">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {fila.map((celda, j) => (
                  <td
                    key={j}
                    className={`whitespace-nowrap px-4 py-2.5 ${
                      celda ? 'text-muted-foreground' : 'text-muted-foreground/40'
                    }`}
                  >
                    {celda || '(vacío)'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> La celda no puede ir vacía. En las demás
        columnas la cabecera debe existir igual, y si la celda va vacía el sistema pone el
        valor por defecto. Las filas del ejemplo son ilustrativas: la plantilla trae una que
        hay que borrar antes de cargar.
      </p>
    </div>
  );
}

/** Aviso de "revisando el archivo" y el error que lo rechazó completo. */
export function EstadoValidacion({
  validando,
  error,
}: {
  validando: boolean;
  error: string | null;
}) {
  return (
    <>
      {validando && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Revisando el archivo...
        </p>
      )}
      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}

/** Columnas del archivo que el lector descartó. */
export function CabecerasIgnoradas({ cabeceras }: { cabeceras: string[] }) {
  if (cabeceras.length === 0) return null;
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Se ignoraron estas columnas porque el sistema no las usa: {cabeceras.join(', ')}.
    </p>
  );
}

/**
 * Errores y advertencias de una fila, debajo del nombre del colaborador:
 * es donde el usuario los lee sin perder de vista a quién corresponden.
 */
export function IncidenciasFila({
  errores,
  advertencias,
  etiquetasError,
  etiquetasAdvertencia,
}: {
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
  etiquetasError: Record<string, string>;
  etiquetasAdvertencia: Record<string, string>;
}) {
  return (
    <>
      {errores.map((x, i) => (
        <p
          key={`e-${x.code}-${i}`}
          className="mt-1 flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {x.mensaje || etiquetasError[x.code] || x.code}
        </p>
      ))}
      {advertencias.map((x, i) => (
        <p
          key={`a-${x.code}-${i}`}
          className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
        >
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {x.mensaje || etiquetasAdvertencia[x.code] || x.code}
        </p>
      ))}
    </>
  );
}

/** Celda del colaborador: nombre y cédula, o el documento crudo del archivo. */
export function CeldaColaborador({
  nombre,
  documento,
  documentoArchivo,
}: {
  nombre: string | undefined;
  documento: string | undefined;
  documentoArchivo: string | null;
}) {
  if (!nombre) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Sin colaborador</p>
        <p className="text-xs text-muted-foreground">
          {documentoArchivo ? `en el archivo: ${documentoArchivo}` : 'sin cédula'}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{nombre}</p>
      <p className="truncate text-xs text-muted-foreground">CC {documento}</p>
    </div>
  );
}
