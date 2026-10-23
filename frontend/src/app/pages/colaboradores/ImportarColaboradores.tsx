/**
 * Importación masiva de colaboradores. Es una pantalla y no un diálogo:
 * el paso de revisión muestra una tabla con una fila por colaborador y eso
 * no cabe en una ventana flotante.
 *
 * Flujo:
 *   1. PREVIEW   → parseamos el Excel y mostramos lo que se va a subir
 *                  para que el usuario confirme.
 *   2. UPLOAD    → POST /api/v1/tenant/colaboradores/importar y polling
 *                  cada 4 s sobre /importaciones/{id}.
 *   3. RESULTADO → stats y filas con error con descarga CSV.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { comoBoton } from '../../hooks/comoBoton';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle, Upload, Download,
  FileSpreadsheet, X, FileText, ArrowLeft,
} from 'lucide-react';
import {
  colaboradoresApi,
  ESTADOS_IMPORTACION_FINALES,
  type EstadoImportacion,
  type ImportacionColaboradores,
} from '../../../api/colaboradores';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 4000;
const MAX_IMPORT_SIZE_MB = 5;


type Fase = 'intro' | 'preview' | 'uploading' | 'resultado';

/**
 * Espejo de las 31 columnas de la plantilla `formato-carga-empleados.xlsx`.
 * El backend valida la lista completa (ver FIELD_ES más abajo); el preview
 * muestra todas para que el usuario pueda revisar antes de confirmar.
 */
interface FilaPreview {
  fila: number; // número real en la hoja (fila 2 = primer dato)
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo_documento: string;
  documento: string;
  fecha_nacimiento: string;
  fecha_expedicion_documento: string;
  lugar_expedicion: string;
  cargo: string;
  modalidad_pago: string;
  salario_base: string;
  fecha_ingreso: string;
  fecha_retiro: string;
  eps: string;
  fondo_pension: string;
  arl: string;
  caja_compensacion: string;
  talla_camisa: string;
  talla_pantalon: string;
  talla_calzado: string;
  tipo_cuenta: string;
  entidad_bancaria: string;
  numero_cuenta: string;
  correo_electronico: string;
  telefono: string;
  direccion: string;
  municipio: string;
  departamento: string;
  contacto_emergencia_nombre: string;
  contacto_emergencia_telefono: string;
}

export default function ImportarColaboradores() {
  const navigate = useNavigate();
  const pollingRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fase, setFase] = useState<Fase>('intro');
  const [file, setFile] = useState<File | null>(null);
  const [filas, setFilas] = useState<FilaPreview[]>([]);
  const [errorParse, setErrorParse] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<ImportacionColaboradores | null>(null);


  // ── Limpieza al salir ────────────────────────────────────────────────────────
  // Una pantalla nace limpia; lo único que hay que soltar al salir es el
  // polling, que si no sigue preguntando por una importación que ya nadie ve.
  useEffect(
    () => () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    },
    [],
  );

  // ── Picker de archivo (botón "Seleccionar archivo" en la fase intro) ───────
  /** Valida y acepta el archivo, venga del botón o de arrastrarlo. */
  const tomarArchivo = (f: File) => {
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error('El archivo debe ser .xlsx o .xls');
      return;
    }
    if (f.size > MAX_IMPORT_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo supera ${MAX_IMPORT_SIZE_MB} MB`);
      return;
    }
    setFile(f);
    setFase('preview');
  };

  const onArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = ''; // permite re-elegir el mismo
    if (f) tomarArchivo(f);
  };

  // ── Descargar plantilla Excel ──────────────────────────────────────────────
  // Sirve el archivo estático tal cual está en `public/formato-carga-empleados.xlsx`
  // (byte-idéntico al que subió el cliente). Sin fallback runtime — si el
  // archivo no se puede obtener, mostramos un error en lugar de generar uno
  // diferente que confunda al usuario.
  const PLANTILLA_URL = '/formato-carga-empleados.xlsx';
  const descargarPlantilla = async () => {
    try {
      const res = await fetch(PLANTILLA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'formato-carga-empleados.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(
        'No se pudo descargar la plantilla. Verifica que el archivo esté disponible.',
      );
      console.error('Error al descargar plantilla:', e);
    }
  };

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
          primer_nombre:               str(r['primer_nombre']),
          segundo_nombre:              str(r['segundo_nombre']),
          primer_apellido:             str(r['primer_apellido']),
          segundo_apellido:            str(r['segundo_apellido']),
          tipo_documento:              str(r['tipo_documento']),
          documento:                   str(r['documento']),
          fecha_nacimiento:            str(r['fecha_nacimiento']),
          fecha_expedicion_documento:  str(r['fecha_expedicion_documento']),
          lugar_expedicion:            str(r['lugar_expedicion']),
          cargo:                       str(r['cargo']),
          modalidad_pago:              str(r['modalidad_pago']),
          salario_base:                str(r['salario_base']),
          fecha_ingreso:               str(r['fecha_ingreso']),
          fecha_retiro:                str(r['fecha_retiro']),
          eps:                         str(r['eps']),
          fondo_pension:               str(r['fondo_pension']),
          arl:                         str(r['arl']),
          caja_compensacion:           str(r['caja_compensacion']),
          talla_camisa:                str(r['talla_camisa']),
          talla_pantalon:              str(r['talla_pantalon']),
          talla_calzado:               str(r['talla_calzado']),
          tipo_cuenta:                 str(r['tipo_cuenta']),
          entidad_bancaria:            str(r['entidad_bancaria']),
          numero_cuenta:               str(r['numero_cuenta']),
          correo_electronico:          str(r['correo_electronico']),
          telefono:                    str(r['telefono']),
          direccion:                   str(r['direccion']),
          municipio:                   str(r['municipio']),
          departamento:                str(r['departamento']),
          contacto_emergencia_nombre:  str(r['contacto_emergencia_nombre']),
          contacto_emergencia_telefono:str(r['contacto_emergencia_telefono']),
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
  }, [file]);

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
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    navigate('/colaboradores');
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
    <div className="space-y-6">
      {/* Mientras sube no se puede salir: cortar a mitad dejaría parte de los
          colaboradores creados y parte no, sin forma de saber cuáles. */}
      <Button
        variant="ghost"
        size="sm"
        disabled={enProgreso}
        onClick={cerrar}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Colaboradores
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Importar colaboradores</h1>
          <p className="mt-0.5 text-muted-foreground">
            {fase === 'intro'
              ? 'Cargue un archivo de Excel con la información de los colaboradores'
              : file
                ? <>Archivo: <strong>{file.name}</strong></>
                : 'Seleccione un archivo de Excel para empezar'}
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col p-0">

        {/* input file oculto, lo dispara el botón "Seleccionar archivo" */}
        <input
          aria-label="Seleccionar archivo"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onArchivoChange}
        />

        {fase === 'intro' && (
          <VistaIntro
            onDescargarPlantilla={descargarPlantilla}
            onSeleccionarArchivo={() => fileInputRef.current?.click()}
            onSoltarArchivo={tomarArchivo}
            onCancelar={cerrar}
          />
        )}
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
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Vista: intro — descargar plantilla + seleccionar archivo
// ────────────────────────────────────────────────────────────────────────────────
/**
 * Las columnas de la plantilla, en el mismo orden del archivo, con una fila de
 * ejemplo por cada una.
 *
 * Están todas a propósito: el usuario llena el Excel fuera de la aplicación y
 * necesita ver qué se espera en cada celda, sobre todo el formato de las
 * fechas y los valores que admiten modalidad de pago o tipo de cuenta. La
 * tabla se desplaza de lado para recorrerlas.
 */
const COLUMNAS_PLANTILLA = [
  'Primer Nombre', 'Segundo Nombre', 'Primer Apellido', 'Segundo Apellido',
  'Tipo Documento', 'Número Documento', 'Fecha Nacimiento', 'Fecha Expedición',
  'Lugar Expedición', 'Cargo', 'Modalidad Pago', 'Salario Base',
  'Fecha Ingreso', 'Fecha Retiro', 'EPS', 'Fondo Pensión', 'ARL',
  'Caja Compensación', 'Talla Camisa', 'Talla Pantalón', 'Talla Calzado',
  'Tipo Cuenta', 'Entidad Bancaria', 'Número Cuenta', 'Correo Electrónico',
  'Teléfono', 'Dirección', 'Municipio', 'Departamento',
  'Contacto Emergencia', 'Teléfono Emergencia',
];

const EJEMPLO_PLANTILLA = [
  [
    'Carlos', 'Alberto', 'Rodríguez', 'García', 'CC', '1001234567',
    '1990-05-14', '2008-06-20', 'Villavicencio', 'Cosechero', 'PRODUCCION',
    '1750905', '2024-01-15', '', 'Sanitas', 'Porvenir', 'Sura',
    'Cafam', 'M', '32', '41', 'AHORROS', 'Bancolombia', '12345678901',
    'carlos.rodriguez@correo.com', '3105550101', 'Km 12 vía Acacías',
    'Villavicencio', 'Meta', 'Ana García', '3109998877',
  ],
  [
    'María', 'Fernanda', 'González', 'López', 'CC', '1009876543',
    '1995-11-02', '2013-12-05', 'Acacías', 'Operaria', 'FIJO',
    '1750905', '2025-03-01', '', 'Nueva EPS', 'Colfondos', 'Positiva',
    'Cofrem', 'S', '10', '37', 'AHORROS', 'Davivienda', '98765432100',
    'maria.gonzalez@correo.com', '3112224455', 'Calle 8 # 4-20',
    'Acacías', 'Meta', 'Pedro López', '3114445566',
  ],
  [
    'Juan', '', 'Pérez', 'Torres', 'CC', '1011223344',
    '1988-02-28', '2006-03-15', 'Granada', 'Supervisor', 'FIJO',
    '2200000', '2023-08-10', '2026-04-30', 'Sura', 'Protección', 'Sura',
    'Cafam', 'L', '34', '42', 'CORRIENTE', 'BBVA', '55512345678',
    'juan.perez@correo.com', '3123334444', 'Vereda El Triunfo',
    'Granada', 'Meta', 'Luz Torres', '3126667788',
  ],
];

/** El número del paso, como en los demás cargues del sistema. */
function Paso({ n, titulo, descripcion, accion }: {
  n: number;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {n}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{titulo}</p>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {accion}
    </div>
  );
}

function VistaIntro({
  onDescargarPlantilla, onSeleccionarArchivo, onSoltarArchivo, onCancelar,
}: {
  onDescargarPlantilla: () => void;
  onSeleccionarArchivo: () => void;
  onSoltarArchivo: (archivo: File) => void;
  onCancelar: () => void;
}) {
  const [arrastrando, setArrastrando] = useState(false);

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) onSoltarArchivo(archivo);
  };

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Paso 1: la plantilla, con lo que trae por dentro */}
        <div className="rounded-xl border border-border p-5">
          <Paso
            n={1}
            titulo="Descarga la plantilla"
            descripcion="Usa esta plantilla para preparar tus datos correctamente"
            accion={
              <Button variant="outline" onClick={onDescargarPlantilla} className="shrink-0 gap-2">
                <Download className="h-4 w-4" /> Descargar plantilla
              </Button>
            }
          />

          <div className="mt-4 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary/5">
                  {COLUMNAS_PLANTILLA.map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EJEMPLO_PLANTILLA.map((fila) => (
                  <tr key={fila[5]} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {fila.map((celda, i) => (
                      <td key={COLUMNAS_PLANTILLA[i]} className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {celda || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {COLUMNAS_PLANTILLA.length} columnas. Solo el documento y los nombres son
            obligatorios; lo demás se completa después desde la ficha. Formatos
            aceptados: <span className="font-medium">.xlsx, .xls</span>
          </p>
        </div>

        {/* Paso 2: el archivo */}
        <div className="rounded-xl border border-border p-5">
          <Paso
            n={2}
            titulo="Carga tu archivo"
            descripcion="Arrastra el archivo o haz clic para seleccionarlo"
          />

          <div
            onDrop={alSoltar}
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            {...comoBoton(onSeleccionarArchivo)}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
              arrastrando
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
              arrastrando ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Upload className={`h-8 w-8 transition-colors ${
                arrastrando ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                {arrastrando ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                o <span className="font-medium text-primary">haz clic para seleccionar</span>
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              .xlsx · .xls
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-border bg-background p-4">
        <Button variant="outline" onClick={onCancelar} className="gap-2">
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </>
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

      {/* Tabla — única zona con scroll; muestra las 31 columnas de la plantilla.
          Scroll horizontal libre para revisar todo antes de confirmar. */}
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
              <Th>F. expedición</Th>
              <Th>Lugar expedición</Th>
              <Th>Cargo</Th>
              <Th>Modalidad</Th>
              <Th>Salario</Th>
              <Th>F. ingreso</Th>
              <Th>F. retiro</Th>
              <Th>EPS</Th>
              <Th>Pensión</Th>
              <Th>ARL</Th>
              <Th>Caja comp.</Th>
              <Th>Camisa</Th>
              <Th>Pantalón</Th>
              <Th>Calzado</Th>
              <Th>Tipo cuenta</Th>
              <Th>Banco</Th>
              <Th>Nº cuenta</Th>
              <Th>Correo</Th>
              <Th>Teléfono</Th>
              <Th>Dirección</Th>
              <Th>Municipio</Th>
              <Th>Departamento</Th>
              <Th>Contacto emerg.</Th>
              <Th>Tel. emerg.</Th>
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
                  <Td>{f.fecha_expedicion_documento || '—'}</Td>
                  <Td>{f.lugar_expedicion || '—'}</Td>
                  <Td>{f.cargo || '—'}</Td>
                  <Td>{f.modalidad_pago || '—'}</Td>
                  <Td>{f.salario_base || '—'}</Td>
                  <Td>{f.fecha_ingreso || '—'}</Td>
                  <Td>{f.fecha_retiro || '—'}</Td>
                  <Td>{f.eps || '—'}</Td>
                  <Td>{f.fondo_pension || '—'}</Td>
                  <Td>{f.arl || '—'}</Td>
                  <Td>{f.caja_compensacion || '—'}</Td>
                  <Td>{f.talla_camisa || '—'}</Td>
                  <Td>{f.talla_pantalon || '—'}</Td>
                  <Td>{f.talla_calzado || '—'}</Td>
                  <Td>{f.tipo_cuenta || '—'}</Td>
                  <Td>{f.entidad_bancaria || '—'}</Td>
                  <Td>{f.numero_cuenta || '—'}</Td>
                  <Td>{f.correo_electronico || '—'}</Td>
                  <Td>{f.telefono || '—'}</Td>
                  <Td>{f.direccion || '—'}</Td>
                  <Td>{f.municipio || '—'}</Td>
                  <Td>{f.departamento || '—'}</Td>
                  <Td>{f.contacto_emergencia_nombre || '—'}</Td>
                  <Td>{f.contacto_emergencia_telefono || '—'}</Td>
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
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
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
