import { useEffect, useState } from 'react';
import { ConfigSection, ConfigEmpty } from './ConfigSection';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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

/** Etiqueta legible de la franja; el backend la devuelve en mayúsculas. */
function franjaLabel(franja: FranjaHoraria): string {
  if (franja === 'NOCTURNO') return 'Nocturna';
  if (franja === 'MIXTO') return 'Mixta';
  return 'Diurna';
}

/** Porcentaje legal por código según **Ley 2466/2025** (recargo dominical 75% → 90%).
 *  Solo se usa como fallback si `/codigos` no devuelve `porcentaje_recargo`. */
const PORCENTAJE_DEFAULT: Record<CodigoHoraExtra, number> = {
  HED: 25,
  HEN: 75,
  RN: 35,
  HRD: 90,
  HEDF: 115,
  HENF: 165,
  RND: 125,
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

      // 3) Sembrar los 7 tipos en PARALELO. `/codigos` ya trae `porcentaje_recargo`
      //    actualizado por Ley 2466/2025 — lo usamos si viene, si no caemos al hardcoded.
      const resultados = await Promise.allSettled(
        codigos.map((c) => {
          const pct = Number(c.porcentaje_recargo);
          return configuracionApi.tiposHoraExtra.crear({
            codigo: c.codigo,
            nombre: c.nombre,
            porcentaje_recargo: Number.isFinite(pct) ? pct : PORCENTAJE_DEFAULT[c.codigo],
            franja_horaria: franjaParaCodigo(c.codigo),
            aplica_festivo: aplicaFestivoParaCodigo(c.codigo),
            es_extra: c.es_extra,
            paga_hora_completa: c.paga_hora_completa,
            descripcion: c.descripcion,
          });
        }),
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
      <ConfigSection
        title="Jornada laboral semanal"
        description="Número de horas ordinarias por semana."
      >
        <div className="max-w-xs space-y-2">
          <Label htmlFor="horasSemanales">
            Horas semanales <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="horasSemanales"
              type="number"
              step="0.001"
              min={1}
              max={96}
              value={horasSemanales}
              onChange={(e) => setHorasSemanales(e.target.value)}
              onBlur={() => handleGuardarJornada(horasSemanales)}
              disabled={!nominaActual}
              className="w-28 tabular-nums"
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Según la legislación colombiana: 48 horas semanales
          </p>
        </div>
      </ConfigSection>

      {/* Tipos de horas extra — solo lectura (catálogo legal colombiano). */}
      <ConfigSection
        flush
        title="Tipos de horas extra"
        description="Recargos sobre el valor de la hora ordinaria."
      >
        {tipos.length === 0 ? (
          <ConfigEmpty
            title="Sin tipos de hora extra"
            description="El catálogo legal se carga con la nómina."
          />
        ) : (
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Tipo</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead className="pr-5 text-right">Recargo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="whitespace-normal pl-5">
                    <p className="font-semibold text-foreground">{tipo.nombre}</p>
                    <p className="font-mono text-xs uppercase text-muted-foreground">{tipo.codigo}</p>
                    {tipo.descripcion && (
                      <p className="text-xs text-muted-foreground">{tipo.descripcion}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tipo.franja_horaria && (
                        <Badge variant="secondary">{franjaLabel(tipo.franja_horaria)}</Badge>
                      )}
                      {tipo.aplica_festivo && <Badge variant="info">Festivo</Badge>}
                      {!tipo.es_extra && <Badge variant="secondary">Solo recargo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 text-right font-semibold tabular-nums">
                    +{tipo.porcentaje_recargo}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
    </div>
    </TabLoadingGate>
  );
}
