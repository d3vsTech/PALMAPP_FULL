/**
 * Completa el otro extremo del disfrute con el calendario del backend.
 *
 * Si el usuario escribe 12 días hábiles, rellena la fecha fin; si elige la
 * fecha fin, rellena los días hábiles. Los dos campos quedan visibles, pero
 * **solo viaja el que el usuario escribió** (`campoVacaciones` del borrador):
 * API_NOVEDADES §5.1 pide exactamente uno y mandar los dos responde 422
 * `VACACIONES_DIAS_INVALIDOS`.
 *
 * El cálculo lo hace `GET liquidaciones/vacaciones/calendario` (§10.2). Aquí
 * no se cuentan festivos ni se decide si el sábado es hábil: eso depende de
 * `liq_vacaciones_sabado_habil` y del calendario del año, y reimplementarlo
 * daría una cifra distinta de la que después liquida.
 */
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { vacacionesApi } from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';
import type { BorradorNovedad } from '../borrador';
import { calcularDias } from '../tipos';

interface Props {
  fechaInicio: string;
  diasHabiles: string;
  fechaFin: string;
  /** Cuál escribió el usuario; el otro es el que se rellena. */
  campo: BorradorNovedad['campoVacaciones'];
  onCambiar: (parcial: Partial<BorradorNovedad>) => void;
}

/** El endpoint solo acepta de 1 a 60 días hábiles (§0.3). */
const MAX_DIAS = 60;

export function CalendarioSolicitud({ fechaInicio, diasHabiles, fechaFin, campo, onCambiar }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo el campo que escribió el usuario dispara el cálculo. Mirar también el
  // derivado haría que la respuesta se volviera a pedir a sí misma.
  const fuente = campo === 'DIAS' ? diasHabiles : campo === 'FECHA' ? fechaFin : '';

  useEffect(() => {
    setError(null);
    if (!fechaInicio || !campo || fuente.trim() === '') return;

    const n = Number(fuente);
    const porDias = campo === 'DIAS' && Number.isInteger(n) && n >= 1 && n <= MAX_DIAS;
    const porFecha = campo === 'FECHA' && fuente >= fechaInicio;
    if (!porDias && !porFecha) return;

    const diasRango = porFecha ? calcularDias(fechaInicio, fuente) : 0;
    /*
     * Con la fecha fin se le piden al calendario tantos días hábiles como días
     * calendario tiene el rango. Como los hábiles nunca superan a los
     * calendario, la ventana que devuelve siempre cubre la fecha elegida, y
     * entonces `dias_no_habiles[]` alcanza para contar los hábiles del rango
     * real sin volver a preguntar.
     */
    const aPedir = porDias ? n : diasRango;
    if (aPedir < 1 || aPedir > MAX_DIAS) return;

    let vivo = true;
    setCargando(true);
    // Los `input` de fecha y número disparan en cada tecla: se deja respirar.
    const temporizador = setTimeout(() => {
      vacacionesApi
        .calendario(fechaInicio, aPedir)
        .then((res) => {
          if (!vivo) return;
          const cal = res.data;
          if (porDias) {
            onCambiar({ fechaFin: cal.fecha_fin });
          } else {
            const noHabiles = cal.dias_no_habiles.filter((d) => d.fecha <= fuente);
            onCambiar({ diasHabiles: String(diasRango - noHabiles.length) });
          }
        })
        .catch((err) => {
          if (!vivo) return;
          // El más útil: el inicio cayó en domingo, festivo o sábado no hábil.
          setError((err as ApiError).message ?? 'No se pudo calcular el calendario');
        })
        .finally(() => { if (vivo) setCargando(false); });
    }, 400);

    return () => { vivo = false; clearTimeout(temporizador); };
    // `onCambiar` se omite a propósito: cambia en cada render del padre y
    // volvería a disparar la petición sin que el usuario haya tocado nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, campo, fuente]);

  if (cargando) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Calculando el calendario
      </p>
    );
  }

  if (error) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    );
  }

  // Sin panel de resumen: el rango ya quedó escrito en los dos campos.
  return null;
}
