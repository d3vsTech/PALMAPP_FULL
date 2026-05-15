/**
 * Diálogo de importación masiva de colaboradores.
 * Flujo:
 *   1. PREVIEW   → parseamos el Excel y mostramos lo que se va a subir
 *                  para que el usuario confirme.
 *   2. UPLOAD    → POST /api/v1/tenant/colaboradores/importar y polling
 *                  cada 4 s sobre /importaciones/{id}.
 *   3. RESULTADO → stats y filas con error con descarga CSV.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle, Upload, Download,
  FileSpreadsheet, X,
} from 'lucide-react';
import {
  colaboradoresApi,
  ESTADOS_IMPORTACION_FINALES,
  type EstadoImportacion,
  type ImportacionColaboradores,
} from '../../../api/colaboradores';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 4000;

interface Props {
  open: boolean;
  /** Archivo elegido en el picker nativo (ya validado por extensión y tamaño). */
  file: File | null;
  onOpenChange: (open: boolean) => void;
  /** Callback al cerrar si hubo al menos un colaborador creado. */
  onFinalizado?: () => void;
}

type Fase = 'preview' | 'uploading' | 'resultado';

interface FilaPreview {
  fila: number; // número real en la hoja (fila 2 = primer dato)
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo_documento: string;
  documento: string;
  fecha_nacimiento: string;
  cargo: string;
  modalidad_pago: string;
  salario_base: string;
  fecha_ingreso: string;
}

export default function ImportarColaboradoresDialog({
  open, file, onOpenChange, onFinalizado,
}: Props) {
  const pollingRef = useRef<number | null>(null);

  const [fase, setFase] = useState<Fase>('preview');
  const [filas, setFilas] = useState<FilaPreview[]>([]);
  const [errorParse, setErrorParse] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<ImportacionColaboradores | null>(null);

  const huboExitos = !!estado && estado.filas_exitosas > 0;

  // ── Reset al cerrar ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
      setFase('preview');
      setFilas([]);
      setErrorParse(null);
      setEnviando(false);
      setEstado(null);
    }
  }, [open]);

  // ── Parsear el Excel al abrir con archivo ──────────────────────────────────
  useEffect(() => {
    if (!open || !file) return;
    setErrorParse(null);
    setFilas([]);
    file.arrayBuffer().then(buf => {
      try {
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          setErrorParse('El archivo no contiene hojas válidas');
          return;
        }
        const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd',
        });
        const parsed: FilaPreview[] = json.map((r, i) => ({
          fila: i + 2,
          primer_nombre:    str(r['primer_nombre']),
          segundo_nombre:   str(r['segundo_nombre']),
          primer_apellido:  str(r['primer_apellido']),
          segundo_apellido: str(r['segundo_apellido']),
          tipo_documento:   str(r['tipo_documento']),
          documento:        str(r['documento']),
          fecha_nacimiento: str(r['fecha_nacimiento']),
          cargo:            str(r['cargo']),
          modalidad_pago:   str(r['modalidad_pago']),
          salario_base:     str(r['salario_base']),
          fecha_ingreso:    str(r['fecha_ingreso']),
        }));
        // Filtra filas totalmente vacías (sin documento ni nombres)
        const limpias = parsed.filter(p =>
          p.documento.trim() !== '' ||
          p.primer_nombre.trim() !== '' ||
          p.primer_apellido.trim() !== ''
        );
        if (limpias.length === 0) {
          setErrorParse('No se detectaron filas con datos');
          return;
        }
        setFilas(limpias);
      } catch (err) {
        setErrorParse(err instanceof Error ? err.message : 'No se pudo leer el Excel');
      }
    }).catch(() => setErrorParse('No se pudo leer el archivo'));
  }, [open, file]);

  // ── Subida + polling ──────────────────────────────────────────────────────
  const confirmar = async () => {
    if (!file) return;
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const res = await colaboradoresApi.importar(fd);
      setFase('uploading');
      setEstado({
        id: res.data.importacion_id,
        estado: res.data.estado,
        nombre_archivo_original: file.name,
        total_filas: 0,
        filas_exitosas: 0,
        filas_fallidas: 0,
        error_fatal: null,
        resultados: [],
        iniciado_at: null,
        finalizado_at: null,
        created_at: new Date().toISOString(),
      });
      iniciarPolling(res.data.importacion_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error iniciando la importación');
    } finally {
      setEnviando(false);
    }
  };

  const iniciarPolling = (id: number) => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await colaboradoresApi.estadoImportacion(id);
        setEstado(res.data);
        if (ESTADOS_IMPORTACION_FINALES.includes(res.data.estado)) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          setFase('resultado');
          if (res.data.estado === 'COMPLETADO') {
            toast.success(`Importación completada: ${res.data.filas_exitosas} creados`);
          } else if (res.data.estado === 'CON_ERRORES') {
            toast.warning(`Finalizada con ${res.data.filas_fallidas} errores`);
          } else if (res.data.estado === 'FALLIDO') {
            toast.error('La importación falló');
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error consultando estado');
      }
    }, POLL_INTERVAL_MS);
  };

  const cerrar = () => {
    onOpenChange(false);
    if (huboExitos) onFinalizado?.();
  };

  const descargarErrores = () => {
    if (!estado) return;
    const fallidos = (estado.resultados ?? []).filter(r => r.estado === 'fallido');
    if (fallidos.length === 0) return;
    const rows = [['Fila', 'Documento', 'Mensaje']];
    fallidos.forEach(r => rows.push([String(r.fila), r.documento ?? '', traducirMensaje(r.mensaje)]));
    const csv = rows.map(c => c.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `errores_importacion_${estado.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const enProgreso = fase === 'uploading';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!enProgreso || !next) onOpenChange(next); }}>
      <DialogContent
        className="max-w-5xl w-[95vw] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden"
      >
        <DialogHeader className="p-6 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importación masiva de colaboradores
          </DialogTitle>
          <DialogDescription>
            {file ? <>Archivo: <strong>{file.name}</strong></> : 'Selecciona un archivo Excel para empezar.'}
          </DialogDescription>
        </DialogHeader>

        {fase === 'preview'   && (
          <VistaPreview
            filas={filas}
            errorParse={errorParse}
            enviando={enviando}
            onCancelar={cerrar}
            onConfirmar={confirmar}
          />
        )}
        {fase === 'uploading' && estado && (
          <VistaProcesando estado={estado} />
        )}
        {fase === 'resultado' && estado && (
          <VistaResultado
            estado={estado}
            onDescargarErrores={descargarErrores}
            onCerrar={cerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Vista: preview de lo que se va a subir
// ────────────────────────────────────────────────────────────────────────────────
function VistaPreview({
  filas, errorParse, enviando, onCancelar, onConfirmar,
}: {
  filas: FilaPreview[];
  errorParse: string | null;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const total = filas.length;
  const docsRepetidos = useMemo(() => {
    const cnt = new Map<string, number>();
    filas.forEach(f => {
      const k = f.documento.trim();
      if (!k) return;
      cnt.set(k, (cnt.get(k) ?? 0) + 1);
    });
    return new Set(Array.from(cnt.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [filas]);

  if (errorParse) {
    return (
      <>
        <div className="overflow-auto p-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">No se pudo leer el archivo</p>
              <p className="text-sm text-muted-foreground">{errorParse}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border p-4 flex justify-end bg-background">
          <Button variant="outline" onClick={onCancelar} className="gap-2">
            <X className="h-4 w-4" /> Cerrar
          </Button>
        </div>
      </>
    );
  }

  if (filas.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground gap-3 py-10">
        <Loader2 className="w-5 h-5 animate-spin" /> Leyendo archivo...
      </div>
    );
  }

  return (
    <>
      {/* Encabezado de info */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3 bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            {total} {total === 1 ? 'fila detectada' : 'filas detectadas'}
          </Badge>
          {docsRepetidos.size > 0 && (
            <Badge className="bg-warning/10 text-warning border-warning/20">
              {docsRepetidos.size} documento(s) repetido(s)
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Revisa los datos antes de continuar.
        </p>
      </div>

      {/* Tabla — única zona con scroll; crece con el contenido hasta un máximo */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10">
            <tr className="border-b border-border">
              <Th>Fila</Th>
              <Th>Nombres</Th>
              <Th>Apellidos</Th>
              <Th>Tipo doc.</Th>
              <Th>Documento</Th>
              <Th>F. nacimiento</Th>
              <Th>Cargo</Th>
              <Th>Modalidad</Th>
              <Th>Salario</Th>
              <Th>F. ingreso</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const dup = !!f.documento && docsRepetidos.has(f.documento.trim());
              return (
                <tr key={`${f.fila}-${i}`}
                    className={`border-b border-border last:border-0 ${dup ? 'bg-warning/5' : i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                  <Td className="font-mono text-muted-foreground">{f.fila}</Td>
                  <Td>{[f.primer_nombre, f.segundo_nombre].filter(Boolean).join(' ') || '—'}</Td>
                  <Td>{[f.primer_apellido, f.segundo_apellido].filter(Boolean).join(' ') || '—'}</Td>
                  <Td>{f.tipo_documento || '—'}</Td>
                  <Td className={dup ? 'text-warning font-semibold' : ''}>{f.documento || '—'}</Td>
                  <Td>{f.fecha_nacimiento || '—'}</Td>
                  <Td>{f.cargo || '—'}</Td>
                  <Td>{f.modalidad_pago || '—'}</Td>
                  <Td>{f.salario_base || '—'}</Td>
                  <Td>{f.fecha_ingreso || '—'}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer fijo con los botones */}
      <div className="shrink-0 border-t border-border p-4 flex justify-end gap-2 bg-background">
        <Button variant="outline" onClick={onCancelar} disabled={enviando} className="gap-2">
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button onClick={onConfirmar} disabled={enviando || filas.length === 0} className="gap-2">
          {enviando
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : <><Upload className="h-4 w-4" /> Confirmar e importar {total} {total === 1 ? 'fila' : 'filas'}</>
          }
        </Button>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Vista: procesando (polling)
// ────────────────────────────────────────────────────────────────────────────────
function VistaProcesando({ estado }: { estado: ImportacionColaboradores }) {
  return (
    <div className="overflow-auto p-6">
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="font-semibold">Procesando importación...</span>
          </div>
          <EstadoBadge estado={estado.estado} />
        </div>
        <Progress value={undefined as unknown as number} className="animate-pulse" />
        <p className="text-xs text-muted-foreground mt-2">
          El proceso es asíncrono. Se valida fila por fila en el servidor.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Vista: resultado
// ────────────────────────────────────────────────────────────────────────────────
function VistaResultado({
  estado, onDescargarErrores, onCerrar,
}: {
  estado: ImportacionColaboradores;
  onDescargarErrores: () => void;
  onCerrar: () => void;
}) {
  const resultados = estado.resultados ?? [];
  const fallidos = resultados.filter(r => r.estado === 'fallido');
  const total = estado.total_filas || resultados.length || 0;
  const pctExito = total > 0 ? Math.round((estado.filas_exitosas / total) * 100) : 0;

  return (
    <>
      <div className="overflow-auto p-6 space-y-5 max-h-[65vh]">
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              {iconoEstado(estado.estado)}
              <span className="font-semibold">Importación finalizada</span>
            </div>
            <EstadoBadge estado={estado.estado} />
          </div>
          {total > 0 && (
            <>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progreso</span>
                <span className="font-semibold text-foreground">{pctExito}% creados</span>
              </div>
              <Progress value={pctExito} />
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Filas totales" value={total} tone="default" />
          <Stat label="Creados"       value={estado.filas_exitosas} tone="success" Icon={CheckCircle2} />
          <Stat label="Con errores"   value={estado.filas_fallidas} tone="error"   Icon={AlertTriangle} />
        </div>

        {estado.error_fatal && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Error fatal</p>
              <p className="text-sm text-muted-foreground">{traducirMensaje(estado.error_fatal)}</p>
            </div>
          </div>
        )}

        {fallidos.length > 0 && (
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-semibold text-sm">Filas con errores ({fallidos.length})</span>
              </div>
              <Button variant="outline" size="sm" onClick={onDescargarErrores} className="gap-2">
                <Download className="h-4 w-4" /> CSV
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-muted-foreground w-16">Fila</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground w-32">Documento</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {fallidos.map((r, i) => (
                    <tr key={`${r.fila}-${i}`} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-foreground align-top">{r.fila}</td>
                      <td className="p-3 align-top">{r.documento || '—'}</td>
                      <td className="p-3 text-muted-foreground whitespace-pre-line align-top">{traducirMensaje(r.mensaje)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4 flex justify-end gap-2 bg-background">
        <Button onClick={onCerrar} className="gap-2">
          Cerrar
        </Button>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// UI helpers
// ────────────────────────────────────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-top whitespace-nowrap ${className}`}>{children}</td>;
}

function iconoEstado(e: EstadoImportacion) {
  if (e === 'COMPLETADO')  return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (e === 'CON_ERRORES') return <AlertTriangle className="h-5 w-5 text-warning" />;
  if (e === 'FALLIDO')     return <XCircle className="h-5 w-5 text-destructive" />;
  return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
}

function EstadoBadge({ estado }: { estado: EstadoImportacion }) {
  const map: Record<EstadoImportacion, { label: string; cls: string }> = {
    PENDIENTE:   { label: 'Pendiente',   cls: 'bg-muted text-muted-foreground border-border' },
    PROCESANDO:  { label: 'Procesando',  cls: 'bg-primary/10 text-primary border-primary/20' },
    COMPLETADO:  { label: 'Completado',  cls: 'bg-success/10 text-success border-success/20' },
    CON_ERRORES: { label: 'Con errores', cls: 'bg-warning/10 text-warning border-warning/20' },
    FALLIDO:     { label: 'Fallido',     cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  return <Badge className={map[estado].cls}>{map[estado].label}</Badge>;
}

function Stat({
  label, value, tone, Icon,
}: {
  label: string;
  value: number | string;
  tone: 'default' | 'success' | 'error';
  Icon?: any;
}) {
  const tones: Record<typeof tone, string> = {
    default: 'border-border',
    success: 'border-success/30 bg-success/5',
    error:   'border-destructive/30 bg-destructive/5',
  };
  const valueColor = tone === 'success' ? 'text-success'
                   : tone === 'error'   ? 'text-destructive' : 'text-foreground';
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {Icon && <Icon className="h-4 w-4" />} {label}
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Traductor de mensajes de validación (Laravel → español)
// ────────────────────────────────────────────────────────────────────────────────
const FIELD_ES: Record<string, string> = {
  primer_nombre: 'el primer nombre',
  segundo_nombre: 'el segundo nombre',
  primer_apellido: 'el primer apellido',
  segundo_apellido: 'el segundo apellido',
  tipo_documento: 'el tipo de documento',
  documento: 'el documento',
  fecha_nacimiento: 'la fecha de nacimiento',
  fecha_expedicion_documento: 'la fecha de expedición del documento',
  lugar_expedicion: 'el lugar de expedición',
  cargo: 'el cargo',
  modalidad_pago: 'la modalidad de pago',
  salario_base: 'el salario base',
  fecha_ingreso: 'la fecha de ingreso',
  fecha_retiro: 'la fecha de retiro',
  eps: 'la EPS',
  fondo_pension: 'el fondo de pensión',
  arl: 'la ARL',
  caja_compensacion: 'la caja de compensación',
  talla_camisa: 'la talla de camisa',
  talla_pantalon: 'la talla de pantalón',
  talla_calzado: 'la talla de calzado',
  tipo_cuenta: 'el tipo de cuenta',
  entidad_bancaria: 'la entidad bancaria',
  numero_cuenta: 'el número de cuenta',
  correo_electronico: 'el correo electrónico',
  telefono: 'el teléfono',
  direccion: 'la dirección',
  municipio: 'el municipio',
  departamento: 'el departamento',
  contacto_emergencia_nombre: 'el nombre del contacto de emergencia',
  contacto_emergencia_telefono: 'el teléfono del contacto de emergencia',
};

function fieldEs(raw: string): string {
  const key = raw.replace(/\s+/g, '_').toLowerCase();
  return FIELD_ES[key] ?? raw.replace(/_/g, ' ');
}

/** Traduce mensajes típicos de Laravel; soporta múltiples partes separadas por "|". */
function traducirMensaje(msg: string): string {
  if (!msg) return msg;
  return msg
    .split('|')
    .map(part => traducirParte(part.trim()))
    .filter(Boolean)
    .join(' | ');
}

function traducirParte(p: string): string {
  if (!p) return p;

  // Patrones tipo "campo: detalle ya en español" → se deja el detalle.
  const conPrefijo = p.match(/^([a-z_]+)\s*:\s*(.+)$/i);
  if (conPrefijo) {
    return `${fieldEs(conPrefijo[1])}: ${traducirParte(conPrefijo[2])}`;
  }

  // 1) "The X has already been taken."
  let m = p.match(/^The\s+(.+?)\s+has already been taken\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} ya está en uso.`;

  // 2) "The X field is required."
  m = p.match(/^The\s+(.+?)\s+field is required\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} es obligatorio.`;

  // 3) "The X field must be a valid date."
  m = p.match(/^The\s+(.+?)\s+field must be a valid date\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser una fecha válida.`;

  // 4) "The X field must be a date before or equal to today."
  m = p.match(/^The\s+(.+?)\s+field must be a date before or equal to today\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser hoy o anterior.`;

  // 5) "The X field must be a date after Y."
  m = p.match(/^The\s+(.+?)\s+field must be a date after\s+(.+?)\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser posterior a ${m[2]}.`;

  // 6) "The X field must be a date after or equal to Y."
  m = p.match(/^The\s+(.+?)\s+field must be a date after or equal to\s+(.+?)\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser igual o posterior a ${m[2]}.`;

  // 7) "The X field must not be greater than N characters."
  m = p.match(/^The\s+(.+?)\s+field must not be greater than\s+(\d+)\s+characters\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} no puede tener más de ${m[2]} caracteres.`;

  // 8) "The X field must be at least N characters."
  m = p.match(/^The\s+(.+?)\s+field must be at least\s+(\d+)\s+characters\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe tener al menos ${m[2]} caracteres.`;

  // 9) "The X field must be a valid email address."
  m = p.match(/^The\s+(.+?)\s+field must be a valid email address\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} no es un correo válido.`;

  // 10) "The selected X is invalid."
  m = p.match(/^The selected\s+(.+?)\s+is invalid\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} seleccionado no es válido.`;

  // 11) "The X field must be a number."
  m = p.match(/^The\s+(.+?)\s+field must be a number\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser un número.`;

  // 12) "The X field must be at least N."
  m = p.match(/^The\s+(.+?)\s+field must be at least\s+([\d.]+)\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser al menos ${m[2]}.`;

  // 13) "The X format is invalid."
  m = p.match(/^The\s+(.+?)\s+format is invalid\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} tiene un formato inválido.`;

  // 14) "The X field must be one of: Y."
  m = p.match(/^The\s+(.+?)\s+field must be one of:\s*(.+?)\.?$/i);
  if (m) return `${capitalize(fieldEs(m[1]))} debe ser uno de: ${m[2]}.`;

  return p;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}
