/**
 * CardAlerta
 *
 * Una alerta del diagnóstico IA, con la forma de tarjeta del sistema visual:
 * icono del dominio, nombre del dominio, pastilla de severidad, título,
 * descripción y la cifra encontrada abajo.
 *
 * Las alertas son informativas: no tienen acciones de resolver ni descartar.
 * Si más adelante se necesita gestionarlas, se vuelven a agregar los botones
 * con su AlertDialog y la llamada a `insightsApi.marcarAlerta`.
 */
import { Link } from 'react-router';
import {
  AlertTriangle, ArrowRight, CalendarDays, CloudRain, Droplets, Scale, Sprout,
  TrendingDown, Users, type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { primeraFrase, sinJerga } from '../../lib/texto';
import {
  SEVERIDAD_LABEL, DOMINIO_LABEL,
  type Alerta, type Dominio, type Severidad,
} from '../../../api/insights';

interface Props {
  alerta: Alerta;
}

/**
 * Métricas técnicas del backend traducidas a algo legible. Si llega una que
 * no está mapeada, se muestra el slug con los guiones bajos convertidos.
 */
const METRICA_LABEL: Record<string, string> = {
  kg_gajo: 'Kilos por gajo',
  kg_totales: 'Producción total (kg)',
  kg_totales_vs_gajos: 'Kilos vs gajos reportados',
  delta_gajos_pct: 'Diferencia entre reportado y reconteo (%)',
  delta_gajos_pct_promedio: 'Diferencia entre reportado y reconteo',
  gajos_pendientes_clavijo: 'Gajos cortados sin camión',
  delta_kg_gajo_pct: 'Caída en kilos por gajo (%)',
  delta_kg_pct: 'Cambio en producción total (%)',
  fruto_verde_pct: 'Fruto verde (%)',
  sobre_maduro_pct: 'Fruto sobre-maduro (%)',
  podrido_pct: 'Fruto podrido (%)',
  pedunculo_largo_pct: 'Pedúnculo largo (%)',
  mal_formado_pct: 'Fruto mal formado (%)',
  horas_extra_semanales: 'Horas extra por semana',
  ausencias_injustificadas: 'Ausencias sin justificar',
  dias_sin_labor: 'Días sin atender el lote',
  costo_por_palma: 'Costo por palma ($)',
  delta_costo_pct: 'Cambio en el costo (%)',
  podrido_pct_post_lluvia: 'Fruto podrido tras lluvia (%)',
};

/** Cada dominio con su icono. El que no esté mapeado usa el de advertencia. */
const ICONO_DOMINIO: Record<Dominio, LucideIcon> = {
  rendimiento_lotes: TrendingDown,
  calidad_post_cosecha: Sprout,
  friccion_laboral: Users,
  cobertura_agronomica: Droplets,
  calidad_medicion: Scale,
  contratistas_vs_propios: Users,
  impacto_lluvia: CloudRain,
  comparativa_ano_ano: CalendarDays,
};

/**
 * Algunas alertas se resuelven en una pantalla concreta, no en el módulo
 * entero del dominio. La métrica manda sobre el dominio cuando está acá.
 *
 * 2026-11-11 — Los gajos cortados que nunca llegaron a un camión se deciden
 * en Viajes → Ajuste de gajos (clavijo o reasignación); mandar al liquidador
 * a Operaciones lo deja a dos pantallas de donde puede hacer algo.
 */
const RUTA_METRICA: Record<string, string> = {
  gajos_pendientes_clavijo: '/viajes/ajustes-cosecha',
};

/**
 * A dónde lleva el enlace de cada dominio. `comparativa_ano_ano` queda sin
 * destino a propósito: cruza varios módulos y mandar a uno solo despista.
 */
const RUTA_DOMINIO: Partial<Record<Dominio, string>> = {
  rendimiento_lotes: '/plantacion',
  calidad_post_cosecha: '/viajes',
  friccion_laboral: '/colaboradores',
  cobertura_agronomica: '/operaciones',
  calidad_medicion: '/operaciones',
  contratistas_vs_propios: '/colaboradores',
  impacto_lluvia: '/operaciones',
};

/** El recuadro del icono toma el tono de la severidad. */
const TONO_ICONO: Record<Severidad, string> = {
  CRITICA: 'bg-destructive-soft text-destructive',
  ALTA: 'bg-warning-soft text-warning',
  MEDIA: 'bg-warning-soft text-warning',
  BAJA: 'bg-info-soft text-info',
};

function formatearMetrica(slug: string | null | undefined): string {
  if (!slug) return '';
  if (METRICA_LABEL[slug]) return METRICA_LABEL[slug];
  return slug
    .replace(/_/g, ' ')
    .replace(/\bpct\b/gi, '%')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatearValor(v: string | null | undefined): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  // Enteros exactos sin decimales; los demás con dos como máximo.
  if (Number.isInteger(n)) return n.toLocaleString('es-CO');
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

export function CardAlerta({ alerta }: Props) {
  const severidad = SEVERIDAD_LABEL[alerta.severidad];
  const dominio = DOMINIO_LABEL[alerta.dominio] ?? alerta.dominio;
  const Icono = ICONO_DOMINIO[alerta.dominio] ?? AlertTriangle;
  const ruta = (alerta.metrica ? RUTA_METRICA[alerta.metrica] : undefined)
    ?? RUTA_DOMINIO[alerta.dominio];

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-muted-strong">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', TONO_ICONO[alerta.severidad])}>
            <Icono className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="truncate text-[13px] font-medium text-muted-foreground">{dominio}</span>
        </div>
        <span className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          severidad.badgeClass,
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {severidad.label}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground" title={sinJerga(alerta.titulo)}>
        {sinJerga(alerta.titulo)}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground" title={sinJerga(alerta.descripcion)}>
        {primeraFrase(alerta.descripcion)}
      </p>

      {!alerta.evidencia_verificada && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Sin evidencia verificada
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        {/* Valor y unidad en una sola línea, como en el diseño. El límite
            vive en el tooltip: en la tarjeta añadía un renglón de más. */}
        <p
          className="min-w-0 truncate text-xl font-bold text-foreground"
          title={alerta.umbral != null ? `Límite ${formatearValor(alerta.umbral)}` : undefined}
        >
          {formatearValor(alerta.valor)}
          {alerta.metrica && (
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">
              {formatearMetrica(alerta.metrica).toLowerCase()}
            </span>
          )}
        </p>
        {ruta && (
          <Link
            to={ruta}
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            Ver <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
    </div>
  );
}
