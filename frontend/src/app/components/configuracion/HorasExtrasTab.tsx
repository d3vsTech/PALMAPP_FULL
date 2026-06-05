import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import {
  configuracionApi,
  type TipoHoraExtra,
  type TipoHoraExtraCodigoItem,
  type FranjaHoraria,
  type CodigoHoraExtra,
  type ConfiguracionNomina,
} from '../../../api/configuracion';
import { TabLoadingGate } from './TabLoadingGate';

/**
 * Tab "Horas Extras" — sigue el doc API_PARAMETRICAS.md §8 y §11.
 *
 * §8 Jornada Laboral: GET/PUT /v1/tenant/configuracion/nomina con `horas_semanales`
 * (1-96, default típico 48 o 42) como alias del divisor (backend calcula
 * divisor = horas × 5). Valores legales colombianos: 48 (CST tradicional → 240)
 * o 42 (Ley 2101/2021 → 210).
 *
 * §11 Tipos de Hora Extra:
 *  - `/codigos`: lista estática de los 7 códigos legales (HED, HEN, RN, HRD, HEDF, HENF, RND)
 *    con metadata para pre-llenar nombre/descripción/es_extra/paga_hora_completa.
 *  - CRUD sobre `/tipos-hora-extra`.
 */

/** Heurística para inferir la franja a partir del código (no viene en /codigos). */
function franjaParaCodigo(codigo: CodigoHoraExtra): FranjaHoraria {
  switch (codigo) {
    case 'HEN':
    case 'RN':
    case 'HENF':
    case 'RND':
      return 'NOCTURNO';
    case 'HED':
    case 'HRD':
    case 'HEDF':
    default:
      return 'DIURNO';
  }
}

/** Porcentaje legal por código (semilla por defecto del doc §11). */
const PORCENTAJE_DEFAULT: Record<CodigoHoraExtra, number> = {
  HED: 25,
  HEN: 75,
  RN: 35,
  HRD: 75,
  HEDF: 100,
  HENF: 150,
  RND: 110,
};

/** ¿El código aplica en festivo? */
function aplicaFestivoParaCodigo(codigo: CodigoHoraExtra): boolean {
  return codigo === 'HRD' || codigo === 'HEDF' || codigo === 'HENF' || codigo === 'RND';
}

/** Claves de caché en sessionStorage para entrada instantánea entre navegaciones. */
const CACHE_KEY_TIPOS   = 'palmapp_cfg_tipos_hora_extra_v1';
const CACHE_KEY_CODIGOS = 'palmapp_cfg_tipos_hora_extra_codigos_v1';
const CACHE_KEY_NOMINA  = 'palmapp_cfg_configuracion_nomina_v1';

export function HorasExtrasTab() {
  // `loading` arranca true; pasa a false en cuanto entra la primera data
  // (sea desde cache o desde el primer fetch en background).
  const hayCacheTipos = (() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_TIPOS);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as TipoHoraExtra[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch { return false; }
  })();
  const [loading, setLoading] = useState(!hayCacheTipos);
  const [tipos, setTipos] = useState<TipoHoraExtra[]>([]);
  const [horasSemanales, setHorasSemanales] = useState<string>('48');
  const [nominaActual, setNominaActual] = useState<ConfiguracionNomina | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  // Estrategia "stale-while-revalidate":
  //  1. Muestra al instante lo que esté en sessionStorage (carga visual = 0ms).
  //  2. En background pide al backend y refresca caché + UI.
  //  3. Si la respuesta del backend viene vacía y nunca se sembró, crea los 7
  //     tipos legales en PARALELO (no secuencial — todo en ~1 request round-trip).
  useEffect(() => {
    let cancelado = false;

    // 1) Pintar desde caché si existe.
    try {
      const rawTipos = sessionStorage.getItem(CACHE_KEY_TIPOS);
      if (rawTipos) {
        const parsed = JSON.parse(rawTipos) as TipoHoraExtra[];
        if (Array.isArray(parsed) && parsed.length > 0) setTipos(parsed);
      }
    } catch { /* caché corrupto: ignorar */ }

    // 2) Revalidar en background.
    (async () => {
      const [listarRes, codigosRes] = await Promise.all([
        configuracionApi.tiposHoraExtra.listar({ per_page: 100 }).catch(() => ({ data: [] as TipoHoraExtra[] })),
        configuracionApi.tiposHoraExtra.codigos().catch(() => ({ data: [] as TipoHoraExtraCodigoItem[] })),
      ]);
      if (cancelado) return;
      // Listo el primer roundtrip → quitamos el loader aunque luego haya
      // seeding en paralelo (la UI ya tiene algo que pintar).
      setLoading(false);

      const codigos = codigosRes.data ?? [];
      if (codigos.length > 0) {
        try { sessionStorage.setItem(CACHE_KEY_CODIGOS, JSON.stringify(codigos)); } catch {}
      }

      const items = listarRes.data ?? [];
      if (items.length > 0) {
        setTipos(items);
        try { sessionStorage.setItem(CACHE_KEY_TIPOS, JSON.stringify(items)); } catch {}
        return;
      }

      // Lista vacía y sin catálogo → no podemos sembrar.
      if (codigos.length === 0) {
        setTipos([]);
        return;
      }

      // 3) Sembrar los 7 tipos en PARALELO (mucho más rápido que secuencial).
      const resultados = await Promise.allSettled(
        codigos.map((c) =>
          configuracionApi.tiposHoraExtra.crear({
            codigo: c.codigo,
            nombre: c.nombre,
            porcentaje_recargo: PORCENTAJE_DEFAULT[c.codigo],
            franja_horaria: franjaParaCodigo(c.codigo),
            aplica_festivo: aplicaFestivoParaCodigo(c.codigo),
            es_extra: c.es_extra,
            paga_hora_completa: c.paga_hora_completa,
            descripcion: c.descripcion,
          }),
        ),
      );
      if (cancelado) return;

      const creados: TipoHoraExtra[] = resultados
        .filter((r): r is PromiseFulfilledResult<{ data: TipoHoraExtra; message: string }> => r.status === 'fulfilled')
        .map((r) => r.value.data);

      // Si todos los POST tuvieron éxito usamos esos directamente. Si alguno
      // falló por race condition (otro tab sembró antes) refetcheamos.
      if (creados.length === codigos.length) {
        setTipos(creados);
        try { sessionStorage.setItem(CACHE_KEY_TIPOS, JSON.stringify(creados)); } catch {}
        return;
      }

      try {
        const final = await configuracionApi.tiposHoraExtra.listar({ per_page: 100 });
        if (cancelado) return;
        setTipos(final.data ?? creados);
        try { sessionStorage.setItem(CACHE_KEY_TIPOS, JSON.stringify(final.data ?? creados)); } catch {}
      } catch {
        if (!cancelado) setTipos(creados);
      }
    })();

    // Jornada laboral: también cacheada para entrada instantánea.
    try {
      const rawNomina = sessionStorage.getItem(CACHE_KEY_NOMINA);
      if (rawNomina) {
        const parsed = JSON.parse(rawNomina) as ConfiguracionNomina;
        if (parsed && parsed.divisor_jornada_mensual) {
          setNominaActual(parsed);
          const horas = parsed.horas_semanales
            ?? (parsed.divisor_jornada_mensual === 210 ? 42 : 48);
          setHorasSemanales(String(horas));
        }
      }
    } catch {}

    configuracionApi.configuracionNomina.obtener()
      .then((res) => {
        if (cancelado) return;
        setNominaActual(res.data);
        const horas = res.data.horas_semanales
          ?? (res.data.divisor_jornada_mensual === 210 ? 42 : 48);
        setHorasSemanales(String(horas));
        try { sessionStorage.setItem(CACHE_KEY_NOMINA, JSON.stringify(res.data)); } catch {}
      })
      .catch((e: any) => toast.error(e?.message ?? 'No se pudo cargar la jornada semanal'));

    return () => { cancelado = true; };
  }, []);

  // ── Jornada semanal (§8) ───────────────────────────────────────────────────
  const handleGuardarJornada = async (raw: string) => {
    const horas = Number(raw);
    if (!Number.isFinite(horas) || horas < 1 || horas > 96) {
      toast.error('Las horas semanales deben estar entre 1 y 96');
      return;
    }
    // El backend acepta horas_semanales en rango 1-96. Calcula automáticamente
    // divisor = horas × 5. Valores típicos: 48 (CST tradicional, divisor 240)
    // o 42 (Ley 2101/2021, divisor 210).
    try {
      const res = await configuracionApi.configuracionNomina.actualizar({
        horas_semanales: horas,
      });
      setNominaActual(res.data);
      toast.success(res.message ?? 'Jornada semanal actualizada');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la jornada semanal');
      }
    }
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando horas extra…">
    <div className="space-y-6">
      {/* Jornada Laboral Semanal */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Jornada Laboral Semanal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Número de horas ordinarias por semana</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="horasSemanales">Horas Semanales *</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                id="horasSemanales"
                type="number"
                min={1}
                max={96}
                value={horasSemanales}
                onChange={(e) => setHorasSemanales(e.target.value)}
                onBlur={() => handleGuardarJornada(horasSemanales)}
                className="text-2xl font-bold text-center"
                disabled={!nominaActual}
              />
              <span className="text-lg font-medium text-muted-foreground">horas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Horas Extras — solo lectura (catálogo legal colombiano). */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div>
            <CardTitle>Tipos de Horas Extras</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Recargos sobre el valor hora ordinaria (7 tipos legales colombianos)
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {tipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay tipos registrados.
              </p>
            ) : (
              tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-semibold">
                        {tipo.codigo}
                      </span>
                      <p className="font-semibold">{tipo.nombre}</p>
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-bold">
                        +{tipo.porcentaje_recargo}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tipo.franja_horaria}
                        {tipo.aplica_festivo && ' · festivo'}
                        {!tipo.es_extra && ' · solo recargo'}
                      </span>
                    </div>
                    {tipo.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">{tipo.descripcion}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </TabLoadingGate>
  );
}
