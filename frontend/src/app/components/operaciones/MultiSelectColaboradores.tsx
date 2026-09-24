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
 *  - Quien esté de vacaciones ese día sale deshabilitado, con el rango y el
 *    comprobante. Se puede forzar uno por uno: las vacaciones se interrumpen
 *    legalmente y el trabajador pudo haber ido. El backend acepta el
 *    registro y la nómina lo advierte después.
 *
 * Los ids conservan el mismo formato que el estado del wizard: `String(empleado.id)`
 * para colaboradores propios y `'O_' + operario.id` para operarios de tercero.
 */
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Users, Search, ChevronDown, X, Check, Plane, AlertTriangle } from 'lucide-react';
import type { VacacionEnPlanilla } from '../../pages/operaciones/planilla/tipos';
import { etiquetaVacaciones } from '../../pages/operaciones/planilla/vacacionesPlanilla';
import { opcionesSeleccionables } from '../../pages/operaciones/planilla/vinculacionPlanilla';

export interface ColaboradorOption {
  id: string;
  nombres: string;
  apellidos: string;
  terceroNombre?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
  /** PR-L8 — Vacaciones que cubren la fecha de la planilla. */
  enVacaciones?: VacacionEnPlanilla;
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
  /**
   * Borrador local de la selección mientras el popover está abierto.
   * Solo "Aceptar" hace commit vía onChange; cerrar por fuera descarta.
   */
  const [draft, setDraft] = useState<string[]>([]);
  /**
   * Ids de vacacionistas que el usuario destrabó a propósito en esta apertura
   * del popover. Se limpia al cerrar: forzar es una decisión puntual, no un
   * permiso permanente.
   */
  const [forzados, setForzados] = useState<string[]>([]);
  /** Fila que está pidiendo confirmación para forzarse. */
  const [porForzar, setPorForzar] = useState<string | null>(null);

  const abrirCerrar = (siguiente: boolean) => {
    if (siguiente) {
      setDraft(seleccionados);
      setBusqueda('');
    }
    setForzados([]);
    setPorForzar(null);
    setOpen(siguiente);
  };

  const aceptar = () => {
    onChange(draft);
    setOpen(false);
  };

  const opciones = useMemo(() => {
    // §1.1 — Fuera los que no tenían contrato ese día, salvo los que ya están
    // escogidos en una tarjeta guardada: esos tienen que seguir a la vista
    // para poder quitarlos.
    const elegibles = opcionesSeleccionables(colaboradores, draft);
    const q = busqueda.trim().toLowerCase();
    if (!q) return elegibles;
    return elegibles.filter((c) => {
      const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase();
      const tercero = (c.terceroNombre ?? '').toLowerCase();
      return nombreCompleto.includes(q) || tercero.includes(q);
    });
  }, [colaboradores, busqueda, draft]);

  const seleccionadosSet = useMemo(() => new Set(draft), [draft]);

  const toggle = (id: string) => {
    if (seleccionadosSet.has(id)) {
      setDraft(draft.filter((x) => x !== id));
    } else {
      setDraft([...draft, id]);
    }
  };

  const seleccionarTodos = () => {
    // Deja fuera a los de vacaciones: forzarlos es uno por uno y a conciencia.
    const elegibles = opciones.filter((o) => !o.enVacaciones || forzados.includes(o.id));
    setDraft(Array.from(new Set([...draft, ...elegibles.map((o) => o.id)])));
  };

  const limpiarSeleccion = () => setDraft([]);

  return (
    <Popover open={open} onOpenChange={abrirCerrar}>
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
        // side="bottom" y avoidCollisions=false ya son defaults globales en
        // src/app/components/ui/popover.tsx — todo popover abre hacia abajo.
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
            {sortByFirstName(opciones).map((col) => {
              const checked = seleccionadosSet.has(col.id);
              // Ya seleccionado cuenta como destrabado: si viene de una
              // planilla guardada no se le puede quitar el check de golpe.
              const bloqueado = !!col.enVacaciones && !forzados.includes(col.id) && !checked;
              const confirmando = porForzar === col.id;

              return (
                <div key={col.id} className={checked ? 'bg-primary/5' : ''}>
                  <button
                    type="button"
                    onClick={() => { if (!bloqueado) toggle(col.id); }}
                    disabled={bloqueado}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      bloqueado ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/60'
                    }`}
                  >
                    <Checkbox checked={checked} disabled={bloqueado} className="shrink-0" />
                    <span className="flex-1 text-left min-w-0">
                      <span className="block truncate">
                        {col.nombres} {col.apellidos}
                      </span>
                      {col.enVacaciones && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-500">
                          <Plane className="h-3 w-3 shrink-0" />
                          {etiquetaVacaciones(col.enVacaciones)}
                        </span>
                      )}
                    </span>
                    {renderExtra && <span className="shrink-0">{renderExtra(col)}</span>}
                  </button>

                  {bloqueado && !confirmando && (
                    <div className="px-3 pb-2 pl-10">
                      <button
                        type="button"
                        onClick={() => setPorForzar(col.id)}
                        className="text-[11px] font-medium text-primary underline underline-offset-2"
                      >
                        Registrar de todas formas
                      </button>
                    </div>
                  )}

                  {confirmando && (
                    <div className="mx-3 mb-2 ml-10 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-800/40 dark:bg-amber-950/20">
                      <p className="flex gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                        Está de vacaciones. Regístralo solo si de verdad trabajó ese día;
                        la nómina lo va a advertir.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 text-[11px]"
                          onClick={() => {
                            setForzados((prev) => [...prev, col.id]);
                            setPorForzar(null);
                            toggle(col.id);
                          }}
                        >
                          Sí, registrar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px]"
                          onClick={() => setPorForzar(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
          <div className="flex items-center gap-2">
            {draft.length > 0 && (
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
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={aceptar}
            >
              <Check className="h-3 w-3" />
              Aceptar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
