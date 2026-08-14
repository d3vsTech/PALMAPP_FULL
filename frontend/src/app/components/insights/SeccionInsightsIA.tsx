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
import { Badge } from '../ui/badge';
import {
  Sparkles, RefreshCw, Loader2, AlertTriangle, Info,
  Lightbulb, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  insightsApi, esInsightReciente, SEVERIDAD_LABEL, DOMINIO_LABEL,
  PRIORIDAD_LABEL, InsightErrorCodes,
  type Insight, type Severidad,
} from '../../../api/insights';
import { CardAlerta } from './CardAlerta';

/** Cuántas alertas mostrar en el resumen del dashboard (las de mayor severidad).
 *  El usuario puede seguir gestionando el resto — pero no las 40 posibles a la vez. */
const MAX_ALERTAS_VISIBLES = 6;

/** Orden de severidad para ordenar. */
const SEV_ORDER: Record<Severidad, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

export function SeccionInsightsIA() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [estadoUi, setEstadoUi] = useState<'inicial' | 'buscando' | 'generando' | 'listo' | 'error' | 'sin_datos'>('inicial');
  const [progreso, setProgreso] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [tabActiva, setTabActiva] = useState<Severidad | 'TODAS'>('TODAS');

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
            : `El tenant alcanzó el límite de la hora. Espera unos minutos.`,
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
  const contadores: Record<Severidad | 'TODAS', number> = {
    TODAS: activas.length,
    CRITICA: activas.filter((a) => a.severidad === 'CRITICA').length,
    ALTA: activas.filter((a) => a.severidad === 'ALTA').length,
    MEDIA: activas.filter((a) => a.severidad === 'MEDIA').length,
    BAJA: activas.filter((a) => a.severidad === 'BAJA').length,
  };
  const alertasVisibles = [...alertas]
    .sort((a, b) => SEV_ORDER[a.severidad] - SEV_ORDER[b.severidad])
    .filter((a) => tabActiva === 'TODAS' || a.severidad === tabActiva)
    .slice(0, MAX_ALERTAS_VISIBLES);

  const recomendaciones = (insight?.recomendaciones ?? []).filter(
    (r) => r.estado === 'PENDIENTE',
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Diagnóstico IA</h3>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold uppercase">
            IA
          </Badge>
        </div>
        {insight?.procesado_at && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(insight.procesado_at).toLocaleString('es-CO')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={generar}
              disabled={estadoUi === 'generando' || (retryAfter != null && retryAfter > 0)}
              className="gap-1.5"
            >
              {estadoUi === 'generando'
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generando...</>
                : retryAfter && retryAfter > 0
                  ? `Espera ${retryAfter}s`
                  : <><RefreshCw className="h-3.5 w-3.5" />Regenerar</>}
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
                  className="bg-primary h-full transition-all duration-500"
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

      {estadoUi === 'listo' && insight && (
        <>
          {/* Resumen ejecutivo */}
          {insight.resumen_ejecutivo && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <p className="text-sm text-foreground leading-relaxed">
                  {insight.resumen_ejecutivo}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs por severidad */}
          {activas.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {(['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map((sev) => {
                const activa = tabActiva === sev;
                const count = contadores[sev];
                if (sev !== 'TODAS' && count === 0) return null;
                return (
                  <button
                    key={sev}
                    onClick={() => setTabActiva(sev)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      activa
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/40'
                    }`}
                  >
                    {sev === 'TODAS' ? 'Todas' : SEVERIDAD_LABEL[sev].label}
                    <span className="ml-1.5 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Alertas */}
          {activas.length === 0 ? (
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
            <div className="space-y-2">
              {alertasVisibles.map((a) => (
                <CardAlerta key={a.id} alerta={a} />
              ))}
              {activas.length > MAX_ALERTAS_VISIBLES && tabActiva === 'TODAS' && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Mostramos las {MAX_ALERTAS_VISIBLES} más importantes de {activas.length} en total. Usa las pestañas para filtrar.
                </p>
              )}
            </div>
          )}

          {/* Recomendaciones (sección aparte, compacta) */}
          {recomendaciones.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <h4 className="font-semibold text-sm">Sugerencias para tu finca ({recomendaciones.length})</h4>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {recomendaciones.slice(0, 4).map((r) => (
                  <Card key={r.id} className="border-border">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={PRIORIDAD_LABEL[r.prioridad].badgeClass}>
                          {PRIORIDAD_LABEL[r.prioridad].label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {DOMINIO_LABEL[r.dominio]}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{r.titulo}</p>
                      <p className="text-xs text-muted-foreground">{r.descripcion}</p>
                      {r.kpi_objetivo && r.delta_pct_estimado && (
                        <p className="text-[11px] text-primary">
                          Mejora esperada: {r.delta_pct_estimado}%
                          {r.horizonte_dias && ` en ${r.horizonte_dias} días`}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                          onClick={async () => {
                            try {
                              const upd = await insightsApi.marcarRecomendacion(r.id, 'APLICADA');
                              toast.success('Recomendación aplicada');
                              setInsight((prev) => prev ? {
                                ...prev,
                                recomendaciones: (prev.recomendaciones ?? []).map((x) =>
                                  x.id === upd.id ? upd : x,
                                ),
                              } : prev);
                            } catch (err: any) {
                              toast.error(err?.message ?? 'No se pudo aplicar');
                            }
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Aplicar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={async () => {
                            try {
                              const upd = await insightsApi.marcarRecomendacion(r.id, 'DESCARTADA');
                              setInsight((prev) => prev ? {
                                ...prev,
                                recomendaciones: (prev.recomendaciones ?? []).map((x) =>
                                  x.id === upd.id ? upd : x,
                                ),
                              } : prev);
                            } catch (err: any) {
                              toast.error(err?.message ?? 'No se pudo descartar');
                            }
                          }}
                        >
                          Descartar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Hallazgos (observaciones informativas, sin ciclo) */}
          {(insight.hallazgos ?? []).length > 0 && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Otras cosas que notamos</h4>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {(insight.hallazgos ?? []).slice(0, 4).map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <Badge variant="outline" className="text-[9px] shrink-0 h-fit">
                        {DOMINIO_LABEL[h.dominio]}
                      </Badge>
                      <span>{h.texto}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
