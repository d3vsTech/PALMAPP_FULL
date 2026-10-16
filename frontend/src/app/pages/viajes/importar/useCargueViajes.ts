/**
 * Estado del cargue de viajes: archivo, validación e importación.
 *
 * Vive aparte de la pantalla porque son dos responsabilidades distintas: aquí
 * está el flujo contra la API, allá el pintado. La pantalla no llama al
 * cliente HTTP directamente.
 *
 * El caso que obliga a tener estado propio es el 409 `NOMINA_ABIERTA_EN_RANGO`:
 * no es un fallo del archivo sino una pregunta al usuario, así que se guarda
 * aparte del `error` para poder ofrecerle la salida en vez de pintar un
 * mensaje rojo. A diferencia del cargue de operaciones, aquí la única salida
 * es forzar: importar en CREADO no esquiva la guarda porque el reconteo de
 * gajos se escribe igual y la nómina lo lee.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  importarViajesApi,
  ImportarViajesErrorCodes as Codigos,
  MAX_FILAS_VIAJES,
  type EstadoFinalViaje,
  type FormatoPlantillaViajes,
  type NominaDelCargue,
  type ResultadoImportacionViajes,
} from '../../../../api/importarViajes';
import { mensajeArchivo } from '../../liquidaciones/historico/comunes';
import { descargarBlob } from '../../liquidaciones/final/comunes';

/** El error del backend cuando trae `code` y, a veces, la tabla en `data`. */
interface ErrorConCodigo {
  code?: string;
  message?: string;
  data?: ResultadoImportacionViajes;
}

function codigoDe(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as ErrorConCodigo).code ?? null;
}

function tablaDe(e: unknown): ResultadoImportacionViajes | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as ErrorConCodigo).data ?? null;
}

const RESUMEN_VACIO: ResultadoImportacionViajes['resumen']['viajes'] = {
  total: 0,
  nuevos: 0,
  ya_cargados: 0,
  con_error: 0,
  con_cosechas: 0,
  sin_cosechas: 0,
  homogeneos: 0,
  sin_promedio: 0,
};

/**
 * Deja la respuesta en una forma que las pantallas puedan recorrer sin
 * preguntar.
 *
 * El backend omite bloques enteros en las filas y los viajes con error y, en
 * el 422, la tabla puede llegar a medias. Validar aquí, una sola vez, evita
 * que cada componente tenga que defenderse por su cuenta.
 */
function normalizarResultado(data: ResultadoImportacionViajes): ResultadoImportacionViajes {
  const resumen = data.resumen ?? ({} as ResultadoImportacionViajes['resumen']);
  return {
    ...data,
    viajes: data.viajes ?? [],
    filas: data.filas ?? [],
    advertencias: data.advertencias ?? [],
    resumen: { ...resumen, viajes: resumen.viajes ?? RESUMEN_VACIO },
  };
}

export interface ConflictoNominaViajes {
  mensaje: string;
  /** Las nóminas abiertas que chocan, tal como las nombra el backend. */
  nominas: NominaDelCargue[];
  /** Las fechas del archivo que esas nóminas cubren. */
  fechas: string[];
  /** Las remisiones afectadas. */
  remisiones: string[];
}

export function useCargueViajes(alTerminar: () => void) {
  const inputRef = useRef<HTMLInputElement>(null!);

  const [estadoFinal, setEstadoFinal] = useState<EstadoFinalViaje>('FINALIZADO');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoImportacionViajes | null>(null);

  const [descargando, setDescargando] = useState<FormatoPlantillaViajes | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<ConflictoNominaViajes | null>(null);

  const limpiarAnalisis = useCallback(() => {
    setAnalisis(null);
    setError(null);
    setConflicto(null);
  }, []);

  const descargarPlantilla = useCallback(async (formato: FormatoPlantillaViajes) => {
    setDescargando(formato);
    try {
      const blob = await importarViajesApi.plantilla(formato);
      descargarBlob(blob, `plantilla_viajes.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargando(null);
    }
  }, []);

  const validar = useCallback(
    async (file: File, estado: EstadoFinalViaje) => {
      setValidando(true);
      limpiarAnalisis();
      try {
        const res = await importarViajesApi.validar(file, estado);
        setAnalisis(normalizarResultado(res.data));
        avisarSiEsLargo(res.data.resumen?.filas ?? 0);
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
      void validar(file, estadoFinal);
    },
    [validar, estadoFinal],
  );

  const quitarArchivo = useCallback(() => {
    setArchivo(null);
    limpiarAnalisis();
    if (inputRef.current) inputRef.current.value = '';
  }, [limpiarAnalisis]);

  /** El estado final cambia el cálculo y los avisos: hay que revalidar. */
  const cambiarEstadoFinal = useCallback(
    (nuevo: EstadoFinalViaje) => {
      setEstadoFinal(nuevo);
      setConflicto(null);
      if (archivo) void validar(archivo, nuevo);
    },
    [archivo, validar],
  );

  const importar = useCallback(
    async (forzar = false) => {
      if (!archivo) return;
      setImportando(true);
      setConflicto(null);
      try {
        const res = await importarViajesApi.importar(archivo, estadoFinal, forzar);
        setAnalisis(normalizarResultado(res.data));
        toast.success(res.message ?? 'Cargue terminado');
        alTerminar();
      } catch (e) {
        manejarFalloDeImportacion(e, { setConflicto, setError, setAnalisis });
      } finally {
        setImportando(false);
      }
    },
    [archivo, estadoFinal, alTerminar],
  );

  return {
    inputRef,
    estadoFinal,
    archivo,
    analisis,
    descargando,
    validando,
    importando,
    error,
    conflicto,
    cambiarEstadoFinal,
    descargarPlantilla,
    tomarArchivo,
    quitarArchivo,
    importar,
    descartarConflicto: () => setConflicto(null),
  };
}

function avisarSiEsLargo(filas: number): void {
  if (filas <= MAX_FILAS_VIAJES) return;
  toast.warning(`El archivo trae ${filas} filas y el tope es ${MAX_FILAS_VIAJES}. Pártelo por mes.`);
}

/**
 * Tres desenlaces distintos del POST de importar, y cada uno pide otra cosa
 * del usuario: el 409 de nómina abierta es una decisión, el 422 con tabla es
 * corregir el archivo, y lo demás es un fallo a secas.
 */
function manejarFalloDeImportacion(
  e: unknown,
  set: {
    setConflicto: (c: ConflictoNominaViajes | null) => void;
    setError: (m: string | null) => void;
    setAnalisis: (a: ResultadoImportacionViajes) => void;
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

function conflictoDesde(
  e: unknown,
  tabla: ResultadoImportacionViajes | null,
): ConflictoNominaViajes {
  const err = e as ErrorConCodigo & {
    nominas?: NominaDelCargue[];
    fechas?: string[];
    viajes?: string[];
  };
  const aviso = tabla?.advertencias.find((a) => a.code === Codigos.NOMINA_ABIERTA_EN_RANGO);
  return {
    mensaje:
      err.message ?? aviso?.mensaje ?? 'Hay una nómina sin cerrar sobre estas fechas.',
    nominas: err.nominas ?? ((aviso?.nominas ?? []) as NominaDelCargue[]),
    fechas: err.fechas ?? ((aviso?.fechas ?? []) as string[]),
    remisiones: err.viajes ?? ((aviso?.viajes ?? []) as string[]),
  };
}
