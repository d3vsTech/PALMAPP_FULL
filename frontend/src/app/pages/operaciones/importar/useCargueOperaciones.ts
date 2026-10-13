/**
 * Estado del cargue de operaciones: archivo, validación e importación.
 *
 * Vive aparte de la pantalla porque son dos responsabilidades distintas: aquí
 * está el flujo contra la API, allá el pintado. La pantalla no llama al
 * cliente HTTP directamente.
 *
 * El caso que obliga a tener estado propio es el 409 `NOMINA_ABIERTA_EN_RANGO`:
 * no es un fallo del archivo sino una pregunta al usuario, así que se guarda
 * aparte del `error` para que la pantalla pueda ofrecer las dos salidas en vez
 * de pintar un mensaje rojo.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  importarOperacionesApi,
  ImportarOperacionesErrorCodes as Codigos,
  MAX_FILAS_OPERACIONES,
  type EstadoFinalPlanilla,
  type FormatoPlantillaOperaciones,
  type ResultadoImportacionOperaciones,
  type TipoImportacion,
} from '../../../../api/importarOperaciones';
import { mensajeArchivo } from '../../liquidaciones/historico/comunes';
import { descargarBlob } from '../../liquidaciones/final/comunes';

/** El error del backend cuando trae `code` y, a veces, la tabla en `data`. */
interface ErrorConCodigo {
  code?: string;
  message?: string;
  data?: ResultadoImportacionOperaciones;
}

function codigoDe(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as ErrorConCodigo).code ?? null;
}

function tablaDe(e: unknown): ResultadoImportacionOperaciones | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as ErrorConCodigo).data ?? null;
}

/**
 * Deja la respuesta en una forma que las pantallas puedan recorrer sin
 * preguntar.
 *
 * El backend omite bloques enteros en las filas con error y, en el 422, la
 * tabla puede llegar a medias. Validar aquí, una sola vez, evita que cada
 * componente tenga que defenderse por su cuenta: una lista que falta se vuelve
 * una lista vacía y la tabla se pinta igual.
 */
function normalizarResultado(
  data: ResultadoImportacionOperaciones,
): ResultadoImportacionOperaciones {
  const resumen = data.resumen ?? ({} as ResultadoImportacionOperaciones['resumen']);
  return {
    ...data,
    filas: data.filas ?? [],
    planillas: data.planillas ?? [],
    advertencias: data.advertencias ?? [],
    resumen: {
      ...resumen,
      planillas: resumen.planillas ?? { total: 0, nuevas: 0, existentes: 0, aprobadas: 0 },
    },
  };
}

export interface ConflictoNomina {
  mensaje: string;
  /** Las nóminas abiertas que chocan, tal como las nombra el backend. */
  nominas: Array<{ id: number; etiqueta: string }>;
}

export function useCargueOperaciones(alTerminar: () => void) {
  const inputRef = useRef<HTMLInputElement>(null!);

  const [tipo, setTipo] = useState<TipoImportacion>('jornales');
  const [estadoFinal, setEstadoFinal] = useState<EstadoFinalPlanilla>('APROBADA');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoImportacionOperaciones | null>(null);

  const [descargando, setDescargando] = useState<FormatoPlantillaOperaciones | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<ConflictoNomina | null>(null);

  const limpiarAnalisis = useCallback(() => {
    setAnalisis(null);
    setError(null);
    setConflicto(null);
  }, []);

  const descargarPlantilla = useCallback(
    async (formato: FormatoPlantillaOperaciones) => {
      setDescargando(formato);
      try {
        const blob = await importarOperacionesApi.plantilla(tipo, formato);
        descargarBlob(blob, `plantilla_${tipo}.${formato}`);
      } catch (e) {
        toast.error(mensajeArchivo(e));
      } finally {
        setDescargando(null);
      }
    },
    [tipo],
  );

  const validar = useCallback(
    async (file: File, tipoArchivo: TipoImportacion, estado: EstadoFinalPlanilla) => {
      setValidando(true);
      limpiarAnalisis();
      try {
        const res = await importarOperacionesApi.validar(file, tipoArchivo, estado);
        setAnalisis(normalizarResultado(res.data));
        avisarSiEsLargo(res.data.resumen.filas);
      } catch (e) {
        // Un rechazo aquí es del archivo completo, no de una fila: no hay
        // tabla que pintar y el mensaje es lo único que queda.
        setError(mensajeArchivo(e));
      } finally {
        setValidando(false);
      }
    },
    [limpiarAnalisis],
  );

  const tomarArchivo = useCallback(
    (file: File) => {
      setArchivo(file);
      void validar(file, tipo, estadoFinal);
    },
    [validar, tipo, estadoFinal],
  );

  const quitarArchivo = useCallback(() => {
    setArchivo(null);
    limpiarAnalisis();
    if (inputRef.current) inputRef.current.value = '';
  }, [limpiarAnalisis]);

  /** Cambiar de tipo invalida el análisis: son archivos con otras columnas. */
  const cambiarTipo = useCallback(
    (nuevo: TipoImportacion) => {
      setTipo(nuevo);
      setArchivo(null);
      limpiarAnalisis();
      if (inputRef.current) inputRef.current.value = '';
    },
    [limpiarAnalisis],
  );

  /** El estado final cambia el cálculo de la guarda: hay que revalidar. */
  const cambiarEstadoFinal = useCallback(
    (nuevo: EstadoFinalPlanilla) => {
      setEstadoFinal(nuevo);
      setConflicto(null);
      if (archivo) void validar(archivo, tipo, nuevo);
    },
    [archivo, tipo, validar],
  );

  const importar = useCallback(
    async (forzar = false) => {
      if (!archivo) return;
      setImportando(true);
      setConflicto(null);
      try {
        const res = await importarOperacionesApi.importar(archivo, tipo, estadoFinal, forzar);
        toast.success(res.message ?? 'Cargue terminado');
        alTerminar();
      } catch (e) {
        manejarFalloDeImportacion(e, { setConflicto, setError, setAnalisis });
      } finally {
        setImportando(false);
      }
    },
    [archivo, tipo, estadoFinal, alTerminar],
  );

  return {
    inputRef,
    tipo,
    estadoFinal,
    archivo,
    analisis,
    descargando,
    validando,
    importando,
    error,
    conflicto,
    cambiarTipo,
    cambiarEstadoFinal,
    descargarPlantilla,
    tomarArchivo,
    quitarArchivo,
    importar,
    descartarConflicto: () => setConflicto(null),
  };
}

function avisarSiEsLargo(filas: number): void {
  if (filas <= MAX_FILAS_OPERACIONES) return;
  toast.warning(`El archivo trae ${filas} filas y el tope es ${MAX_FILAS_OPERACIONES}. Pártelo por mes.`);
}

/**
 * Tres desenlaces distintos del POST de importar, y cada uno pide otra cosa
 * del usuario: el 409 de nómina abierta es una decisión, el 422 con tabla es
 * corregir el archivo, y lo demás es un fallo a secas.
 */
function manejarFalloDeImportacion(
  e: unknown,
  set: {
    setConflicto: (c: ConflictoNomina | null) => void;
    setError: (m: string | null) => void;
    setAnalisis: (a: ResultadoImportacionOperaciones) => void;
  },
): void {
  const codigo = codigoDe(e);
  const tabla = tablaDe(e);
  if (tabla) set.setAnalisis(normalizarResultado(tabla));

  if (codigo === Codigos.NOMINA_ABIERTA_EN_RANGO) {
    set.setConflicto(conflictoDesde(e, tabla));
    return;
  }

  set.setError(mensajeArchivo(e));
  toast.error('No se cargó nada. Corrige el archivo y vuelve a subirlo.');
}

function conflictoDesde(e: unknown, tabla: ResultadoImportacionOperaciones | null): ConflictoNomina {
  const aviso = tabla?.advertencias.find((a) => a.code === Codigos.NOMINA_ABIERTA_EN_RANGO);
  const nominas = (aviso?.nominas ?? []) as ConflictoNomina['nominas'];
  return {
    mensaje: (e as ErrorConCodigo).message ?? aviso?.mensaje ?? 'Hay una nómina abierta sobre estas fechas.',
    nominas,
  };
}
