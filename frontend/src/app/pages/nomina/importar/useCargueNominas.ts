/**
 * Estado del cargue de nóminas históricas: archivo, validación e importación.
 *
 * Vive aparte de la pantalla porque son dos responsabilidades distintas: aquí
 * está el flujo contra la API, allá el pintado.
 *
 * Lo propio de este cargue es `sobrescribir`. Las filas ya cargadas se omiten
 * por defecto, así que resubir un archivo corregido no cambia nada hasta
 * marcarlo; y al marcarlo se reescriben **todas** las ya cargadas, no solo la
 * que el usuario tocó. Por eso cambiarlo obliga a revalidar: la tabla que el
 * usuario está mirando deja de describir lo que va a pasar.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  importarNominasApi,
  ImportarNominasErrorCodes as Codigos,
  MAX_FILAS_NOMINAS,
  type FormatoPlantillaNominas,
  type ResultadoImportacionNominas,
} from '../../../../api/importarNominas';
import { mensajeArchivo } from '../../liquidaciones/historico/comunes';
import { descargarBlob } from '../../liquidaciones/final/comunes';

/** El error del backend cuando trae `code` y, a veces, la tabla en `data`. */
interface ErrorConCodigo {
  code?: string;
  message?: string;
  data?: ResultadoImportacionNominas;
}

function tablaDe(e: unknown): ResultadoImportacionNominas | null {
  if (typeof e !== 'object' || e === null) return null;
  return (e as ErrorConCodigo).data ?? null;
}

const RESUMEN_NOMINAS_VACIO = { total: 0, nuevas: 0, existentes: 0 };

/**
 * Deja la respuesta en una forma que las pantallas puedan recorrer sin
 * preguntar. El backend omite bloques enteros en las filas con error y, en el
 * 422, la tabla puede llegar a medias.
 */
function normalizarResultado(data: ResultadoImportacionNominas): ResultadoImportacionNominas {
  const resumen = data.resumen ?? ({} as ResultadoImportacionNominas['resumen']);
  return {
    ...data,
    nominas: (data.nominas ?? []).map((n) => ({ ...n, faltantes: n.faltantes ?? [] })),
    filas: data.filas ?? [],
    advertencias: data.advertencias ?? [],
    resumen: { ...resumen, nominas: resumen.nominas ?? RESUMEN_NOMINAS_VACIO },
  };
}

export function useCargueNominas(alTerminar: () => void) {
  const inputRef = useRef<HTMLInputElement>(null!);

  const [sobrescribir, setSobrescribir] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoImportacionNominas | null>(null);

  const [descargando, setDescargando] = useState<FormatoPlantillaNominas | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limpiarAnalisis = useCallback(() => {
    setAnalisis(null);
    setError(null);
  }, []);

  const descargarPlantilla = useCallback(async (formato: FormatoPlantillaNominas) => {
    setDescargando(formato);
    try {
      const blob = await importarNominasApi.plantilla(formato);
      descargarBlob(blob, `plantilla_nominas.${formato}`);
    } catch (e) {
      toast.error(mensajeArchivo(e));
    } finally {
      setDescargando(null);
    }
  }, []);

  const validar = useCallback(
    async (file: File, reescribir: boolean) => {
      setValidando(true);
      limpiarAnalisis();
      try {
        const res = await importarNominasApi.validar(file, reescribir);
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
      void validar(file, sobrescribir);
    },
    [validar, sobrescribir],
  );

  const quitarArchivo = useCallback(() => {
    setArchivo(null);
    setSobrescribir(false);
    limpiarAnalisis();
    if (inputRef.current) inputRef.current.value = '';
  }, [limpiarAnalisis]);

  /** Cambia qué se escribe, así que la tabla anterior deja de valer. */
  const cambiarSobrescribir = useCallback(
    (nuevo: boolean) => {
      setSobrescribir(nuevo);
      if (archivo) void validar(archivo, nuevo);
    },
    [archivo, validar],
  );

  const importar = useCallback(async () => {
    if (!archivo) return;
    setImportando(true);
    try {
      const res = await importarNominasApi.importar(archivo, sobrescribir);
      setAnalisis(normalizarResultado(res.data));
      toast.success(res.message ?? 'Cargue terminado');
      alTerminar();
    } catch (e) {
      const tabla = tablaDe(e);
      if (tabla) setAnalisis(normalizarResultado(tabla));
      setError(mensajeArchivo(e));
      toast.error(
        (e as ErrorConCodigo).code === Codigos.NOMINAS_ARCHIVO_CON_ERRORES
          ? 'No se cargó nada. Corrige las filas marcadas y vuelve a subirlo.'
          : 'No se cargó nada.',
      );
    } finally {
      setImportando(false);
    }
  }, [archivo, sobrescribir, alTerminar]);

  return {
    inputRef,
    sobrescribir,
    archivo,
    analisis,
    descargando,
    validando,
    importando,
    error,
    cambiarSobrescribir,
    descargarPlantilla,
    tomarArchivo,
    quitarArchivo,
    importar,
  };
}

function avisarSiEsLargo(filas: number): void {
  if (filas <= MAX_FILAS_NOMINAS) return;
  toast.warning(
    `El archivo trae ${filas} filas y el tope es ${MAX_FILAS_NOMINAS}. Pártelo por mes.`,
  );
}
