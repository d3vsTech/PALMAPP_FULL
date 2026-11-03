import { cn } from '../lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Primera columna con avatar redondo. */
  avatar?: boolean;
  className?: string;
}

/**
 * Esqueleto de tabla para mostrar mientras llegan los datos del API.
 * Se pone dentro de la misma Card que tendrá la tabla.
 */
export default function TableSkeleton({ rows = 5, columns = 5, avatar = false, className }: TableSkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)} aria-busy="true" aria-label="Cargando">
      <div className="flex gap-6 border-b border-border bg-muted/50 px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded-full bg-muted-strong/70" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-border/70 px-5 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex flex-1 items-center gap-3">
              {avatar && c === 0 && <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />}
              <div className={cn('h-3.5 rounded-full bg-muted', c === 0 ? 'w-3/4' : 'w-1/2')} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
