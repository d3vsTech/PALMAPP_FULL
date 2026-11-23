/**
 * SeccionInsightsIA
 *
 * Bloque del Dashboard que muestra el diagnóstico IA más reciente del tenant.
 *
 * Comportamiento:
 *  1. Al montar, `GET /insights?scope=TENANT&estado=COMPLETADO&per_page=1`.
 *  2. Si existe y tiene < 24h → mostrar tal cual.
 *  3. Si no existe o es > 24h → dispara `POST /insights` automáticamente
 *     con período mensual y scope TENANT, y hace polling.
 *  4. Mientras procesa → skeleton con contador.
 *  5. Al completar → resumen ejecutivo + tabs por severidad + top alertas.
 *  6. Botón "Regenerar" siempre disponible (respetando rate limit).
 *
 * Ver API_INSIGHTS.md.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Sparkles, RefreshCw, Loader2, AlertTriangle, Info,
  CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  insightsApi, esInsightReciente, SEVERIDAD_LABEL, DOMINIO_LABEL,
  PRIORIDAD_LABEL, InsightErrorCodes,
  type Insight, type Prioridad, type Severidad,
} from '../../../api/insights';
import { CardAlerta } from './CardAlerta';
import { primeraFrase, sinJerga } from '../../lib/texto';

/** Lo que puede mostrar el bloque. Cada una es una lista distinta del informe. */
type Vista = 'alertas' | 'recomendaciones';

/** Orden de severidad para ordenar. */
const SEV_ORDER: Record<Severidad, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

/** Tarjetas que se ven de entrada: una fila completa en pantalla grande. */
const TOPE_TARJETAS = 3;

/**
 * Antigüedad en palabras: "hace 20 min", "hace 3 h", "ayer". Pasada una
 * semana el día y el mes dicen más que la cuenta de días.
 */
function haceCuanto(fecha: Date): string {
  const minutos = Math.round((Date.now() - fecha.getTime()) / 60_000);
  if (minutos < 2) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;

  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function SeccionInsightsIA() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [estadoUi, setEstadoUi] = useState<'inicial' | 'buscando' | 'generando' | 'listo' | 'error' | 'sin_datos'>('inicial');
  const [progreso, setProgreso] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  /** Las dos listas comparten sitio: una u otra, no las dos apiladas. */
  const [vista, setVista] = useState<Vista>('alertas');
  const [severidad, setSeveridad] = useState<Severidad | 'TODAS'>('TODAS');
  const [prioridad, setPrioridad] = useState<Prioridad | 'TODAS'>('TODAS');
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Al cambiar de lista o de filtro la selección empieza otra vez: dejar
  // abierto lo anterior muestra de golpe tarjetas que nadie pidió.
  useEffect(() => {
    setMostrarTodas(false);
  }, [vista, severidad, prioridad]);

  /** Dispara POST /insights + polling. Se llama al montar si no hay reciente,
   *  o cuando el usuario pulsa "Regenerar". */
  const generar = useCallback(async () => {
    setEstadoUi('generando');
    setError(null);
    setProgreso(0);
    try {
      const res = await insightsApi.generar({
        periodo_tipo: 'MENSUAL',
        scope_tipo: 'TENANT',
      });
      // Si el backend reusó uno reciente, no hace falta polling.
      if (res.reused) {
        const completo = await insightsApi.ver(res.id);
        setInsight(completo);
        setEstadoUi('listo');
        return;
      }
      // Polling.
      const t0 = Date.now();
      const completo = await insightsApi.esperar(res.id, {
        delayMs: 3000,
        onProgress: () => {
          // Estimación visual: 30s promedio → % lineal máximo 90%.
          const t = Date.now() - t0;
          setProgreso(Math.min(90, Math.round((t / 30_000) * 90)));
        },
      });
      setProgreso(100);
      if (completo.estado === 'FALLIDO') {
        console.error('[Insight FALLIDO]', completo.error_mensaje);
        setError(completo.error_mensaje ?? 'El servicio falló tras varios reintentos');
        setEstadoUi('error');
      } else {
        setInsight(completo);
        setEstadoUi('listo');
      }
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === InsightErrorCodes.RATE_LIMIT_USUARIO || code === InsightErrorCodes.RATE_LIMIT_TENANT) {
        const sec = Number(err?.retry_after_seconds ?? err?.body?.retry_after_seconds ?? 60);
        setRetryAfter(sec);
        setError(
          code === InsightErrorCodes.RATE_LIMIT_USUARIO
            ? `Estás generando insights muy rápido. Reintenta en ${sec}s.`
            : `Se alcanzó el límite de análisis de esta hora. Espere unos minutos.`,
        );
      } else if (code === InsightErrorCodes.ANTHROPIC_SIN_CONFIGURAR) {
        setError('El servicio de IA no está configurado. Contacta al soporte.');
      } else {
        setError(err?.message ?? 'No se pudo generar el diagnóstico');
      }
      setEstadoUi('error');
    }
  }, []);

  /** Al montar: busca el último insight COMPLETADO. Si es reciente lo usa;
   *  si no, dispara generación automática. */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setEstadoUi('buscando');
      try {
        const lista = await insightsApi.listar({
          scope_tipo: 'TENANT',
          estado: 'COMPLETADO',
          per_page: 1,
        });
        if (cancelado) return;
        const ultimo = lista.data[0];
        if (ultimo && esInsightReciente(ultimo, 24)) {
          const completo = await insightsApi.ver(ultimo.id);
          if (cancelado) return;
          setInsight(completo);
          setEstadoUi('listo');
        } else {
          // No hay reciente → generar automáticamente.
          await generar();
        }
      } catch (err: any) {
        if (cancelado) return;
        // Si el listar falla (403 permiso, 503 anthropic), mostramos error.
        setError(err?.message ?? 'No se pudo cargar el diagnóstico');
        setEstadoUi('error');
      }
    })();
    return () => { cancelado = true; };
  }, [generar]);

  /** Countdown para reactivar el botón "Regenerar" tras rate limit. */
  useEffect(() => {
    if (retryAfter == null || retryAfter <= 0) return;
    const t = setInterval(() => {
      setRetryAfter((v) => (v == null ? null : v - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  // ── Render ─────────────────────────────────────────────────────────────

  const alertas = insight?.alertas ?? [];
  const activas = alertas.filter((a) => a.estado === 'ACTIVA');
  /** Cuantas alertas hay de cada severidad, para las pastillas del filtro. */
  const porSeveridad = (['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const)
    .map((sev) => ({ sev, cuantas: activas.filter((a) => a.severidad === sev).length }))
    .filter((x) => x.cuantas > 0);

  // Las mas graves primero: el diseño muestra tres y las demás quedan
  // detrás del botón de ver más, así que las primeras tienen que ser las
  // que de verdad importan.
  const alertasFiltradas = [...activas]
    .filter((a) => severidad === 'TODAS' || a.severidad === severidad)
    .sort((a, b) => SEV_ORDER[a.severidad] - SEV_ORDER[b.severidad]);

  const recomendaciones = (insight?.recomendaciones ?? []).filter(
    (r) => r.estado === 'PENDIENTE',
  );

  /** Cuantas sugerencias hay de cada prioridad, para las pastillas. */
  const porPrioridad = (['ALTA', 'MEDIA', 'BAJA'] as const)
    .map((p) => ({ p, cuantas: recomendaciones.filter((r) => r.prioridad === p).length }))
    .filter((x) => x.cuantas > 0);

  const recomendacionesFiltradas = recomendaciones.filter(
    (r) => prioridad === 'TODAS' || r.prioridad === prioridad,
  );

  /**
   * El diseño pone tres tarjetas, una fila completa en pantalla grande. El
   * backend manda las que haya, así que el resto espera detrás del botón.
   */
  const lista = vista === 'alertas' ? alertasFiltradas : recomendacionesFiltradas;
  const sobran = Math.max(0, lista.length - TOPE_TARJETAS);
  const alertasVisibles = mostrarTodas ? alertasFiltradas : alertasFiltradas.slice(0, TOPE_TARJETAS);
  const recomendacionesVisibles = mostrarTodas
    ? recomendacionesFiltradas
    : recomendacionesFiltradas.slice(0, TOPE_TARJETAS);

  /**
   * El análisis no encontró nada de qué hablar: ni alertas, ni
   * recomendaciones, ni hallazgos. Pasa con una finca recién creada, y en ese
   * caso el resumen del modelo describe el problema en sus propios términos
   * ("el snapshot del tenant 6 está vacío"), que no es lenguaje para quien
   * administra una finca. Se decide por la estructura y no por el texto:
   * buscar palabras dentro del resumen se rompe al primer cambio del prompt.
   */
  /** Las tres listas del informe, cada una con su etiqueta. */
  const vistas: { clave: Vista; etiqueta: string; cuantos: number }[] = [
    { clave: 'alertas', etiqueta: 'Alertas', cuantos: activas.length },
    { clave: 'recomendaciones', etiqueta: 'Recomendaciones', cuantos: recomendaciones.length },
  ].filter((v): v is { clave: Vista; etiqueta: string; cuantos: number } => v.cuantos > 0);

  const resumenVista =
    vista === 'recomendaciones'
      ? `${recomendaciones.length} ${recomendaciones.length === 1 ? 'sugerencia' : 'sugerencias'} por aplicar`
      : activas.length === 0
        ? 'Todo al día'
        : `${activas.length} ${activas.length === 1 ? 'alerta' : 'alertas'} por revisar`;

  const sinHallazgos =
    (insight?.alertas?.length ?? 0) === 0 &&
    (insight?.recomendaciones?.length ?? 0) === 0;

  const generandoInforme = estadoUi === 'generando';
  const esperandoTurno = retryAfter != null && retryAfter > 0;

  /**
   * Antigüedad del informe y su fecha exacta para el título emergente. Lo que
   * importa de un análisis es qué tan fresco está, no el día y la hora: ocupa
   * menos y se entiende de una.
   */
  const fechaInforme = insight?.procesado_at
    ? {
      relativa: haceCuanto(new Date(insight.procesado_at)),
      completa: new Date(insight.procesado_at).toLocaleString('es-CO'),
    }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-primary dark:bg-accent/20 dark:text-accent">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-base">Hallazgos de tu finca</h2>
              <span className="inline-flex items-center rounded-full bg-accent/30 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-accent/20 dark:text-accent">
                Análisis con IA
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              La inteligencia artificial de PalmApp analiza la información de tu finca y te avisa lo que necesita atención.
            </p>
          </div>
        </div>
        {/* Una sola línea: qué hay por revisar y qué tan viejo es el informe,
            con el botón al frente. La fecha exacta queda en el título
            emergente. En celular el botón se queda en su símbolo. */}
        {fechaInforme && (
          <div className="flex items-center justify-between gap-3 pl-[38px] md:shrink-0 md:justify-end md:pl-0">
            <p
              className="truncate text-[13px] text-muted-foreground"
              title={`Último análisis: ${fechaInforme.completa}`}
            >
              {resumenVista}
              <span aria-hidden> · </span>
              {fechaInforme.relativa}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={generar}
              disabled={generandoInforme || esperandoTurno}
              className="shrink-0 gap-1.5"
              aria-label="Regenerar el análisis"
              title="Regenerar el análisis"
            >
              {generandoInforme
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              {/* La cuenta regresiva se muestra siempre: sin ella el botón
                  parece apagado sin motivo. */}
              <span className={esperandoTurno ? undefined : 'hidden sm:inline'}>
                {generandoInforme
                  ? 'Generando...'
                  : esperandoTurno
                    ? `${retryAfter}s`
                    : 'Regenerar'}
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Estados: buscando / generando / error / sin_datos / listo */}
      {(estadoUi === 'buscando' || estadoUi === 'generando') && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {estadoUi === 'buscando'
                    ? 'Buscando el último informe de tu finca...'
                    : 'Analizando tu finca, esto puede tomar un momento...'}
                </p>
                {estadoUi === 'generando' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estamos revisando la producción, calidad, personal y cosecha del último mes.
                  </p>
                )}
              </div>
            </div>
            {estadoUi === 'generando' && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition duration-500"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {estadoUi === 'error' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">
                  No pudimos hacer el análisis
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <Button
              onClick={generar}
              disabled={retryAfter != null && retryAfter > 0}
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {retryAfter && retryAfter > 0 ? `Espera ${retryAfter}s` : 'Reintentar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {estadoUi === 'listo' && insight && sinHallazgos && (
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Todavía no hay nada que reportar</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No encontramos novedades en el último mes. A medida que registre predios,
                  lotes, cosecha y viajes, aquí van a aparecer las alertas y las
                  recomendaciones para su finca.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {estadoUi === 'listo' && insight && !sinHallazgos && (
        <>
          {/* En celular los dos grupos de filtro se amontonaban al doblar de
              línea. Cada uno va en su propia fila y solo se juntan cuando hay
              ancho de sobra. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {vistas.length > 1 && (
            <div
              role="group"
              aria-label="Qué mostrar"
              className="flex w-fit rounded-lg border border-border bg-card p-0.5 shadow-xs"
            >
              {vistas.map(({ clave, etiqueta, cuantos }) => (
                <button
                  key={clave}
                  type="button"
                  onClick={() => setVista(clave)}
                  aria-pressed={vista === clave}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    vista === clave
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {etiqueta} ({cuantos})
                </button>
              ))}
            </div>
          )}

          {vista === 'recomendaciones' && porPrioridad.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por prioridad">
              {([{ p: 'TODAS' as const, cuantas: recomendaciones.length }, ...porPrioridad]).map(({ p, cuantas }) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridad(p)}
                  aria-pressed={prioridad === p}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                    prioridad === p
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'TODAS' ? 'Todas' : PRIORIDAD_LABEL[p].label}
                  <span className="ml-1 opacity-70">({cuantas})</span>
                </button>
              ))}
            </div>
          )}

          {vista === 'alertas' && porSeveridad.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por gravedad">
              {([{ sev: 'TODAS' as const, cuantas: activas.length }, ...porSeveridad]).map(({ sev, cuantas }) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeveridad(sev)}
                  aria-pressed={severidad === sev}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                    severidad === sev
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sev === 'TODAS' ? 'Todas' : SEVERIDAD_LABEL[sev].label}
                  <span className="ml-1 opacity-70">({cuantas})</span>
                </button>
              ))}
            </div>
          )}
          </div>

          {vista === 'alertas' ? (
            alertasFiltradas.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="font-medium text-foreground">Todo bien en tu finca</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No encontramos nada preocupante en el último análisis.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4 xl:grid-cols-3" role="list" aria-label="Hallazgos de tu finca">
                {alertasVisibles.map((a) => (
                  <div key={a.id} role="listitem">
                    <CardAlerta alerta={a} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="grid gap-3 md:gap-4 xl:grid-cols-3" role="list" aria-label="Sugerencias para tu finca">
              {recomendacionesVisibles.map((r) => (
                <div
                  key={r.id}
                  role="listitem"
                  className="flex flex-col rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORIDAD_LABEL[r.prioridad].badgeClass}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {PRIORIDAD_LABEL[r.prioridad].label}
                    </span>
                    <span className="truncate text-[13px] font-medium text-muted-foreground">
                      {DOMINIO_LABEL[r.dominio]}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground" title={sinJerga(r.titulo)}>
                    {sinJerga(r.titulo)}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground" title={sinJerga(r.descripcion)}>
                    {primeraFrase(r.descripcion)}
                  </p>
                  {r.kpi_objetivo && r.delta_pct_estimado && (
                    <p className="mt-1.5 text-xs text-primary">
                      Mejora esperada {r.delta_pct_estimado} %
                      {r.horizonte_dias && ` en ${r.horizonte_dias} dias`}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const upd = await insightsApi.marcarRecomendacion(r.id, 'APLICADA');
                          toast.success('Sugerencia aplicada');
                          setInsight((prev) => prev ? {
                            ...prev,
                            recomendaciones: (prev.recomendaciones ?? []).map((x) =>
                              x.id === upd.id ? upd : x,
                            ),
                          } : prev);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'No se pudo aplicar');
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Aplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const upd = await insightsApi.marcarRecomendacion(r.id, 'DESCARTADA');
                          setInsight((prev) => prev ? {
                            ...prev,
                            recomendaciones: (prev.recomendaciones ?? []).map((x) =>
                              x.id === upd.id ? upd : x,
                            ),
                          } : prev);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'No se pudo descartar');
                        }
                      }}
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* El diseño deja tres tarjetas a la vista. El backend manda las
              que haya, así que las demás esperan aquí. */}
          {sobran > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setMostrarTodas((v) => !v)}
                aria-expanded={mostrarTodas}
              >
                {mostrarTodas
                  ? <><ChevronUp className="h-4 w-4" strokeWidth={2} />Ver menos</>
                  : <><ChevronDown className="h-4 w-4" strokeWidth={2} />Ver {sobran} más</>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
