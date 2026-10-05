/**
 * MultiSelectColaboradores — dropdown con checkboxes para seleccionar N
 * colaboradores/operarios de una vez, sin cerrar entre selecciones.
 *
 * Sigue el diseño V.26: cada click confirma de inmediato y el dropdown se
 * cierra haciendo click por fuera. No hay botón de aceptar; no hace falta,
 * porque los chips de abajo van mostrando la selección a medida que se arma y
 * quitar a alguien es un click en la misma lista.
 *
 *  - Trigger tipo botón: "N colaboradores seleccionados" o el placeholder.
 *  - Primera fila de la lista alterna todos los visibles.
 *  - Búsqueda por nombre o por empresa del tercero.
 *  - Quien esté de vacaciones o con una novedad vigente ese día (incapacidad,
 *    permiso, licencia) sale deshabilitado, con el rango. Se puede forzar uno
 *    por uno: tanto las vacaciones como una incapacidad se pueden interrumpir
 *    y el trabajador pudo haber ido. El backend acepta el registro y la
 *    nómina lo advierte después.
 *  - Quien no tenía contrato ese día no se ofrece (§1.1), salvo que ya esté
 *    escogido en una tarjeta guardada: ahí sigue visible para poder quitarlo.
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
import { Users, Search, ChevronDown, Plane, AlertTriangle } from 'lucide-react';
import type { NovedadEnPlanilla, VacacionEnPlanilla } from '../../pages/operaciones/planilla/tipos';
import { etiquetaVacaciones } from '../../pages/operaciones/planilla/vacacionesPlanilla';
import { etiquetaNovedad } from '../../pages/operaciones/planilla/novedadesPlanilla';
import { opcionesSeleccionables } from '../../pages/operaciones/planilla/vinculacionPlanilla';

export interface ColaboradorOption {
  id: string;
  nombres: string;
  apellidos: string;
  terceroNombre?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION' | string;
  /** PR-L8 — Vacaciones que cubren la fecha de la planilla. */
  enVacaciones?: VacacionEnPlanilla;
  /** PR-N3 — Incapacidad, permiso o licencia que cubre la fecha. */
  novedadVigente?: NovedadEnPlanilla;
}

/**
 * Texto del motivo por el que la fila sale trabada, o null si no lo está.
 * Las vacaciones mandan sobre la novedad: son el caso más conocido y el que
 * ya tiene su propia nota en la nómina.
 */
function motivoBloqueo(col: ColaboradorOption): string | null {
  if (col.enVacaciones) return etiquetaVacaciones(col.enVacaciones);
  if (col.novedadVigente) return etiquetaNovedad(col.novedadVigente);
  return null;
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
   * Ids que el usuario destrabó a propósito en esta apertura
   * del dropdown. Se limpia al cerrar: forzar es una decisión puntual, no un
   * permiso permanente.
   */
  const [forzados, setForzados] = useState<string[]>([]);
  /** Fila que está pidiendo confirmación para forzarse. */
  const [porForzar, setPorForzar] = useState<string | null>(null);

  const abrirCerrar = (siguiente: boolean) => {
    if (siguiente) setBusqueda('');
    setForzados([]);
    setPorForzar(null);
    setOpen(siguiente);
  };

  const opciones = useMemo(() => {
    // §1.1 — Fuera los que no tenían contrato ese día, salvo los que ya están
    // escogidos en una tarjeta guardada: esos tienen que seguir a la vista
    // para poder quitarlos.
    const elegibles = opcionesSeleccionables(colaboradores, seleccionados);
    const q = busqueda.trim().toLowerCase();
    if (!q) return elegibles;
    return elegibles.filter((c) => {
      const nombreCompleto = `${c.nombres} ${c.apellidos}`.toLowerCase();
      const tercero = (c.terceroNombre ?? '').toLowerCase();
      return nombreCompleto.includes(q) || tercero.includes(q);
    });
  }, [colaboradores, busqueda, seleccionados]);

  const seleccionadosSet = useMemo(() => new Set(seleccionados), [seleccionados]);

  const toggle = (id: string) => {
    onChange(
      seleccionadosSet.has(id)
        ? seleccionados.filter((x) => x !== id)
        : [...seleccionados, id],
    );
  };

  /**
   * Alterna todos los visibles. Deja fuera a los trabados: forzarlos es uno
   * por uno y a conciencia.
   */
  const elegiblesVisibles = useMemo(
    () => opciones.filter((o) => !motivoBloqueo(o) || forzados.includes(o.id)),
    [opciones, forzados],
  );
  const todosVisiblesMarcados =
    elegiblesVisibles.length > 0 && elegiblesVisibles.every((o) => seleccionadosSet.has(o.id));

  const alternarTodos = () => {
    if (todosVisiblesMarcados) {
      const ids = new Set(elegiblesVisibles.map((o) => o.id));
      onChange(seleccionados.filter((id) => !ids.has(id)));
    } else {
      onChange(Array.from(new Set([...seleccionados, ...elegiblesVisibles.map((o) => o.id)])));
    }
  };

  return (
    <Popover open={open} onOpenChange={abrirCerrar}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            {seleccionados.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="font-medium text-foreground">
                {seleccionados.length} colaborador{seleccionados.length !== 1 ? 'es' : ''}{' '}
                seleccionado{seleccionados.length !== 1 ? 's' : ''}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-[var(--radix-popover-content-available-height)] flex-col p-0"
        align="start"
        /*
         * Abre hacia abajo siempre, como el resto de la app (el default global
         * `side="bottom"` + `avoidCollisions={false}` de ui/popover.tsx).
         *
         * Lo que sí hacía falta era acotar la altura: la lista es larga y el
         * formulario vive a mitad del wizard, así que abierta cerca del borde
         * inferior se salía de la pantalla y no había forma de llegar al pie.
         * El `--radix-popover-content-available-height` de abajo lo resuelve
         * sin voltear nada: Radix calcula el espacio disponible aunque las
         * colisiones estén desactivadas, porque el middleware `size` corre
         * siempre, fuera de la guarda de `avoidCollisions`.
         */
        style={{
          width: 'var(--radix-popover-trigger-width)',
          minWidth: '320px',
        }}
      >
        <div className="shrink-0 border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar colaborador..."
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        {opciones.length > 0 && (
          <button
            type="button"
            onClick={alternarTodos}
            className="flex w-full shrink-0 items-center gap-3 border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Checkbox checked={todosVisiblesMarcados} className="shrink-0" />
            {todosVisiblesMarcados ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        )}

        {opciones.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">
            {colaboradores.length === 0
              ? 'No hay colaboradores disponibles'
              : 'Sin coincidencias'}
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {sortByFirstName(opciones).map((col) => {
              const checked = seleccionadosSet.has(col.id);
              // Ya seleccionado cuenta como destrabado: si viene de una
              // planilla guardada no se le puede quitar el check de golpe.
              const motivo = motivoBloqueo(col);
              const bloqueado = !!motivo && !forzados.includes(col.id) && !checked;
              const confirmando = porForzar === col.id;

              return (
                <div key={col.id} className={checked ? 'bg-primary/5' : ''}>
                  <button
                    type="button"
                    onClick={() => { if (!bloqueado) toggle(col.id); }}
                    disabled={bloqueado}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      bloqueado ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/60'
                    }`}
                  >
                    <Checkbox checked={checked} disabled={bloqueado} className="shrink-0" />
                    <span className="min-w-0 flex-1 text-left">
                      <span className={`block truncate ${checked ? 'font-medium text-primary' : ''}`}>
                        {col.nombres} {col.apellidos}
                      </span>
                      {motivo && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-500">
                          {col.enVacaciones
                            ? <Plane className="h-3 w-3 shrink-0" />
                            : <AlertTriangle className="h-3 w-3 shrink-0" />}
                          {motivo}
                        </span>
                      )}
                    </span>
                    {col.terceroNombre && (
                      <span className="shrink-0 rounded-full border border-amber-200/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700">
                        Tercero · {col.terceroNombre}
                      </span>
                    )}
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
                        {col.enVacaciones
                          ? 'Está de vacaciones.'
                          : `Tiene novedad vigente: ${col.novedadVigente?.tipo ?? 'ausencia'}.`}{' '}
                        Regístralo solo si de verdad trabajó ese día; la nómina lo va a
                        advertir.
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

        {seleccionados.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {seleccionados.length} seleccionado{seleccionados.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-destructive hover:underline"
            >
              Quitar todos
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
