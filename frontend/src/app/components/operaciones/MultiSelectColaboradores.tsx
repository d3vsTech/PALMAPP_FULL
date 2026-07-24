/**
 * MultiSelectColaboradores — dropdown con checkboxes para seleccionar N
 * colaboradores/operarios de una vez, sin cerrar entre selecciones.
 *
 * Reemplaza el patrón anterior de `<Select>` con `value=""` que solo permitía
 * añadir uno a la vez (cerraba el dropdown en cada click). Este componente:
 *
 *  - Trigger tipo botón que muestra "X seleccionados" o placeholder.
 *  - Popover con búsqueda + lista con checkboxes.
 *  - Click sobre una fila hace toggle sin cerrar el popover.
 *  - Chips visuales debajo con los seleccionados (usa `ColaboradorChip`).
 *
 * Los ids conservan el mismo formato que el estado del wizard: `String(empleado.id)`
 * para colaboradores propios y `'O_' + operario.id` para operarios de tercero.
 */
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Users, Search, ChevronDown, X } from 'lucide-react';

export interface ColaboradorOption {
  id: string;
  nombres: string;
  apellidos: string;
  terceroNombre?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
}

interface Props {
  colaboradores: ColaboradorOption[];
  seleccionados: string[];
  onChange: (nuevos: string[]) => void;
  placeholder?: string;
  /** Renderer opcional de un adorno a la derecha de cada opción (ej. precio del override). */
  renderExtra?: (col: ColaboradorOption) => React.ReactNode;
}

export function MultiSelectColaboradores({
  colaboradores,
  seleccionados,
  onChange,
  placeholder = 'Agregar colaboradores',
  renderExtra,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const opciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return colaboradores;
    return colaboradores.filter((c) => {
      const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase();
      const tercero = (c.terceroNombre ?? '').toLowerCase();
      return nombreCompleto.includes(q) || tercero.includes(q);
    });
  }, [colaboradores, busqueda]);

  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados]);

  const toggle = (id: string) => {
    if (seleccionadosSet.has(id)) {
      onChange(seleccionados.filter((x) => x !== id));
    } else {
      onChange([...seleccionados, id]);
    }
  };

  const seleccionarTodos = () => {
    onChange(Array.from(new Set([...seleccionados, ...opciones.map((o) => o.id)])));
  };

  const limpiarSeleccion = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            {seleccionados.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span>
                {seleccionados.length}{' '}
                {seleccionados.length === 1 ? 'seleccionado' : 'seleccionados'}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        sideOffset={4}
        // Ancho exacto del trigger — la variable CSS la expone Radix Popover
        // en tiempo de render. Usamos inline style porque Tailwind arbitrary
        // values a veces no interpola bien las vars de Radix.
        style={{
          width: 'var(--radix-popover-trigger-width)',
          minWidth: '320px',
        }}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        {opciones.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">
            {colaboradores.length === 0
              ? 'No hay colaboradores disponibles'
              : 'Sin coincidencias'}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto py-1">
            {opciones.map((col) => {
              const checked = seleccionadosSet.has(col.id);
              const esFijo = !col.terceroNombre && col.modalidad_pago === 'FIJO';
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggle(col.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${
                    checked ? 'bg-primary/5' : ''
                  }`}
                >
                  <Checkbox checked={checked} className="shrink-0" />
                  <span className="flex-1 text-left flex items-center gap-2 min-w-0">
                    <span className="truncate">
                      {col.nombres} {col.apellidos}
                    </span>
                    {col.terceroNombre && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 border-orange-200 shrink-0"
                      >
                        {col.terceroNombre}
                      </Badge>
                    )}
                    {esFijo && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-semibold uppercase tracking-wide bg-slate-200 text-slate-700 border-slate-300 shrink-0"
                      >
                        FIJO · $0
                      </Badge>
                    )}
                  </span>
                  {renderExtra && <span className="shrink-0">{renderExtra(col)}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 p-2 border-t border-border bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={seleccionarTodos}
            disabled={opciones.length === 0}
          >
            Seleccionar todos
          </Button>
          {seleccionados.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
              onClick={limpiarSeleccion}
            >
              <X className="h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
