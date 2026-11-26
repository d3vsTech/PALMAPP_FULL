import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface FiltrosFilaProps {
  busqueda: string;
  onBusqueda: (v: string) => void;
  placeholder?: string;
  /** Selects u otros controles que van a la derecha. */
  children?: ReactNode;
  /** Si hay filtros activos se muestra el conteo y "Limpiar filtros". */
  activos?: boolean;
  resultados?: number;
  onLimpiar?: () => void;
}

/** Fila de filtros sobre la tabla: búsqueda a la izquierda, selects a la derecha. */
export default function FiltrosFila({
  busqueda,
  onBusqueda,
  placeholder = 'Buscar',
  children,
  activos,
  resultados,
  onLimpiar,
}: FiltrosFilaProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        <Input
          type="search"
          placeholder={placeholder}
          value={busqueda}
          onChange={e => onBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {activos && onLimpiar && (
          <>
            {resultados !== undefined && (
              <span className="text-sm text-muted-foreground">
                {resultados} resultado{resultados !== 1 ? 's' : ''}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onLimpiar}>
              Limpiar filtros
            </Button>
          </>
        )}
        {children}
      </div>
    </div>
  );
}
