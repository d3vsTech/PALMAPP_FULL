import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

export type StatTone = 'green' | 'lime' | 'amber' | 'blue' | 'red' | 'neutral';

export interface StatItem {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  /** Se acepta por compatibilidad, pero no se muestra: los indicadores van sin ícono. */
  icon?: LucideIcon;
  /** Color del recuadro del ícono. Por defecto, verde. */
  tone?: StatTone;
  /**
   * Variación frente al período anterior. Solo con datos reales del API;
   * nunca se rellena con cifras de ejemplo.
   */
  trend?: { label: string; direction: 'up' | 'down' | 'flat'; positive?: boolean };
}

interface StatStripProps {
  items: StatItem[];
  /** Muestra esqueletos mientras llegan los datos. */
  loading?: boolean;
  className?: string;
}

function Trend({ trend, hero }: { trend: NonNullable<StatItem['trend']>; hero: boolean }) {
  const Icon = trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : ArrowRight;
  const good = trend.positive ?? trend.direction === 'up';
  const cls = hero
    ? 'bg-white/12 text-accent'
    : trend.direction === 'flat'
      ? 'bg-muted text-muted-foreground'
      : good
        ? 'bg-success-soft text-success'
        : 'bg-destructive-soft text-destructive';
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {trend.label}
    </span>
  );
}

/**
 * Indicadores de la pantalla. Cada uno en su tarjeta; el primero es el dato protagonista
 * y va sobre el verde de la marca. En celular ocupa todo el ancho y los demás van de a 2;
 * 2 por fila en tablet y todos en una fila en escritorio.
 */
export default function StatStrip({ items, loading = false, className }: StatStripProps) {
  const cols = Math.min(items.length || 4, 4);
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-3 md:gap-4',
        cols === 3 && 'lg:grid-cols-3',
        cols >= 4 && 'lg:grid-cols-4',
        className
      )}
    >
      {(loading ? Array.from({ length: cols }, (_, i) => ({ label: `cargando-${i}`, value: '' }) as StatItem) : items).map((k, i) => {
        const hero = i === 0;
        const solaEnFila = !hero && i === items.length - 1 && items.length % 2 === 0;
        return (
          <div
            key={k.label}
            className={cn(
              'group relative min-w-0 overflow-hidden rounded-xl px-4 py-3.5 transition-colors duration-200 sm:px-5 sm:py-4',
              (hero || solaEnFila) && 'col-span-2 sm:col-span-1',
              hero
                ? 'bg-primary text-white dark:bg-primary-soft dark:text-foreground'
                : 'border border-border bg-card hover:border-muted-strong'
            )}
          >
            {hero && (
              <svg aria-hidden viewBox="0 0 120 120" className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-white/[0.07] dark:text-primary/10">
                <path fill="currentColor" d="M60 116V58c-8-20-30-32-52-28 9 18 30 28 52 28Zm0-58c8-20 30-32 52-28-9 18-30 28-52 28ZM60 58c-5-16-2-34 0-46 2 12 5 30 0 46Z" />
              </svg>
            )}
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className={cn('h-3.5 w-24 rounded-full', hero ? 'bg-white/20' : 'bg-muted')} />
                <div className={cn('h-7 w-32 rounded-lg', hero ? 'bg-white/25' : 'bg-muted')} />
                <div className={cn('h-3 w-20 rounded-full', hero ? 'bg-white/15' : 'bg-muted')} />
              </div>
            ) : (
              <>
                <dt className="flex items-center justify-between gap-3">
                  <span className={cn('text-sm font-medium', hero ? 'text-white/75 dark:text-muted-foreground' : 'text-muted-foreground')}>
                    {k.label}
                  </span>
                </dt>
                <dd className="mt-2 flex items-baseline gap-1.5">
                  <span className={cn('font-bold', hero ? 'text-3xl' : 'text-xl sm:text-3xl', hero ? 'text-white dark:text-foreground' : 'text-foreground')}>{k.value}</span>
                  {k.unit && (
                    <span className={cn('text-sm font-medium', hero ? 'text-white/70 dark:text-muted-foreground' : 'text-muted-foreground')}>
                      {k.unit}
                    </span>
                  )}
                </dd>
                {(k.note || k.trend) && (
                  <dd className={cn('mt-1.5 flex flex-wrap items-center gap-2 text-[13px]', hero ? 'text-white/70 dark:text-muted-foreground' : 'text-muted-foreground')}>
                    {k.trend && <Trend trend={k.trend} hero={hero} />}
                    {k.note && <span>{k.note}</span>}
                  </dd>
                )}
              </>
            )}
          </div>
        );
      })}
    </dl>
  );
}
