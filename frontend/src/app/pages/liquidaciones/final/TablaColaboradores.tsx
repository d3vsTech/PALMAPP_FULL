/**
 * Tabla de colaboradores para elegir a quién liquidar.
 *
 * La lista sale de `GET /colaboradores` (API_COLABORADORES §1), que sí pagina.
 * El buscador de liquidación final (§11.4) devuelve máximo 30 sin paginación,
 * así que con una finca de 200 personas dejaba fuera a la mayoría.
 *
 * Ese listado NO devuelve `contrato_vigente` (solo lo trae el detalle,
 * `GET /colaboradores/{id}`), así que aquí no se puede mostrar el tipo de
 * contrato: pedirlo daba "Sin contrato" en todas las filas. En su lugar va la
 * modalidad de pago, que el listado sí envía.
 *
 * El precio de ese cambio: el listado paginado no trae `liquidacion_activa`,
 * o sea que aquí no se sabe de antemano quién ya está liquidado. Ese filtro no
 * se pierde, se corre: al elegir a alguien la pantalla pide su ficha
 * (`finales/colaboradores/{id}`), que es la fuente autorizada, y ahí se
 * bloquea. Reconstruir la bandera en el navegador habría exigido traerse todas
 * las liquidaciones de la finca para cruzarlas, que es peor y se desincroniza.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { colaboradoresApi, type Colaborador } from '../../../../api/colaboradores';
import type { ColaboradorLiquidable } from '../../../../api/liquidacionFinal';
import { fmtFecha, mensajeErrorLiquidacion } from './comunes';

const POR_PAGINA = 10;

/** Lo que la tabla necesita de cada fila, venga de donde venga. */
interface FilaColaborador {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: string | null;
  fecha_ingreso: string | null;
  /** Retirado en la ficha: se puede liquidar, pero conviene avisarlo. */
  fecha_retiro: string | null;
}

function nombreDe(c: Colaborador): string {
  return [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

function aFila(c: Colaborador): FilaColaborador {
  return {
    id: c.id,
    nombre_completo: nombreDe(c),
    documento: c.documento,
    cargo: c.cargo ?? null,
    modalidad_pago: c.modalidad_pago ?? null,
    fecha_ingreso: c.fecha_ingreso ?? null,
    fecha_retiro: c.fecha_retiro ?? null,
  };
}

interface Props {
  seleccionado: ColaboradorLiquidable | null;
  onSeleccionar: (empleadoId: number) => void;
  /** En edición el colaborador ya está fijado y no se cambia. */
  deshabilitado?: boolean;
  /** Ya no se usa: la lista del diseño elige con un clic en el nombre. */
  etiquetaAccion?: string;
  /** Marca la fila cuya ficha se está cargando. */
  cargandoId?: number | null;
}

export function TablaColaboradores({
  seleccionado,
  onSeleccionar,
  deshabilitado = false,
  cargandoId = null,
}: Props) {
  const [filas, setFilas] = useState<FilaColaborador[]>([]);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [termino, setTermino] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cambiando, setCambiando] = useState(false);
  const reqRef = useRef(0);

  // El buscador espera a que el usuario deje de escribir y vuelve a la 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setTermino(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    const reqId = ++reqRef.current;
    setCargando(true);
    try {
      const res = await colaboradoresApi.listar({
        search: termino || undefined,
        page: pagina,
        per_page: POR_PAGINA,
      });
      if (reqId !== reqRef.current) return;
      setFilas((res.data ?? []).map(aFila));
      setTotal(res.meta?.total ?? 0);
      setUltimaPagina(res.meta?.last_page ?? 1);
    } catch (e) {
      if (reqId !== reqRef.current) return;
      toast.error(mensajeErrorLiquidacion(e, 'No se pudo cargar la lista de colaboradores'));
      setFilas([]);
      setTotal(0);
      setUltimaPagina(1);
    } finally {
      if (reqId === reqRef.current) setCargando(false);
    }
  }, [termino, pagina]);

  useEffect(() => {
    if (deshabilitado) {
      setCargando(false);
      return;
    }
    void cargar();
  }, [cargar, deshabilitado]);

  const [abierto, setAbierto] = useState(false);

  /** Elige la fila y cierra la lista, como el buscador del diseño. */
  const elegir = (id: number) => {
    onSeleccionar(id);
    setCambiando(false);
    setAbierto(false);
    setBusqueda('');
  };

  // Con alguien elegido el campo muestra su nombre; escribir abre otra búsqueda.
  const mostrandoElegido = !!seleccionado && !cambiando;
  const valorCampo = mostrandoElegido ? seleccionado.nombre_completo : busqueda;

  return (
    <div className="relative space-y-2">
      <Label htmlFor="busqueda-colaborador">Buscar colaborador *</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <Input
          id="busqueda-colaborador"
          type="text"
          value={valorCampo}
          disabled={deshabilitado}
          onChange={(e) => {
            setCambiando(true);
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          // La espera deja que el clic en una opción llegue antes de cerrar.
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder="Nombre o cédula"
          className="pl-9"
          autoComplete="off"
        />
        {cargando && abierto && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            strokeWidth={2}
          />
        )}
      </div>

      {abierto && !deshabilitado && (
        <ListaResultados
          filas={filas}
          cargando={cargando}
          termino={termino}
          total={total}
          pagina={pagina}
          ultimaPagina={ultimaPagina}
          cargandoId={cargandoId}
          onElegir={elegir}
          onPagina={setPagina}
        />
      )}
    </div>
  );
}

/** Lista desplegable bajo el buscador: nombre, cargo y cédula de cada uno. */
function ListaResultados({
  filas, cargando, termino, total, pagina, ultimaPagina, cargandoId, onElegir, onPagina,
}: {
  filas: FilaColaborador[];
  cargando: boolean;
  termino: string;
  total: number;
  pagina: number;
  ultimaPagina: number;
  cargandoId: number | null;
  onElegir: (id: number) => void;
  onPagina: (p: number) => void;
}) {
  // El mousedown evita que el campo pierda el foco y cierre la lista antes del clic.
  const sinFoco = (e: React.MouseEvent) => e.preventDefault();

  if (!cargando && filas.length === 0) {
    return (
      <Card className="absolute z-50 mt-1 w-full gap-0 px-4 py-3 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {termino ? 'No se encontraron colaboradores' : 'No hay colaboradores registrados'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="absolute z-50 mt-1 max-h-72 w-full gap-0 overflow-y-auto py-1 shadow-sm" onMouseDown={sinFoco}>
      {filas.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={cargandoId != null}
          onClick={() => onElegir(c.id)}
          className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-60"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{c.nombre_completo}</span>
            <span className="block text-xs text-muted-foreground">
              {c.cargo ? `${c.cargo} · ` : ''}CC {c.documento}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {c.fecha_retiro && <Badge variant="secondary">Retirado {fmtFecha(c.fecha_retiro)}</Badge>}
            {cargandoId === c.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={2} />}
          </span>
        </button>
      ))}

      {ultimaPagina > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>{total} colaborador{total === 1 ? '' : 'es'}</span>
          <span className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Página anterior"
              disabled={pagina <= 1 || cargando} onClick={() => onPagina(Math.max(1, pagina - 1))}>
              <ChevronLeft strokeWidth={2} />
            </Button>
            <span className="tabular-nums">{pagina} de {ultimaPagina}</span>
            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Página siguiente"
              disabled={pagina >= ultimaPagina || cargando} onClick={() => onPagina(pagina + 1)}>
              <ChevronRight strokeWidth={2} />
            </Button>
          </span>
        </div>
      )}
    </Card>
  );
}
