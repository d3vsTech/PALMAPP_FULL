/**
 * Listado unificado de novedades (API_NOVEDADES §2).
 *
 * La tabla es la unión de ausencias, vacaciones y terminaciones. Los filtros
 * van al backend, no al arreglo: `meta.totales` cubre el filtro completo y no
 * solo la página visible.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import { AlertTriangle, Eye, Loader2, Paperclip, Plus, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  type CategoriaNovedad, type FiltrosNovedades, type InitNovedades,
  type MetaNovedades, type NovedadFila,
} from '../../../api/novedades';
import type { ApiError } from '../../../api/client';
import { ESTADO_BADGE, ESTADO_LABEL, ETIQUETA_CATEGORIA, formatFecha } from './tipos';
import { DetalleNovedadDialog } from './componentes/DetalleNovedadDialog';

const TODOS = 'todos';
const POR_PAGINA = 20;

/** Las cinco pestañas, en el orden del Paso 1. */
const CATEGORIAS: { valor: CategoriaNovedad; etiqueta: string }[] = (
  ['PERMISOS_LICENCIAS', 'INCAPACIDADES', 'AUSENCIAS_SANCIONES', 'VACACIONES', 'TERMINACION_CONTRATO'] as const
).map((valor) => ({ valor, etiqueta: ETIQUETA_CATEGORIA[valor] }));

const ESTADOS = [
  'PENDIENTE', 'APROBADA', 'RECHAZADA', 'LIQUIDADA',
  'PAGADA', 'PROGRAMADA', 'EFECTIVA',
];

type VarianteBadge = 'secondary' | 'success' | 'warning' | 'info' | 'destructive';

/**
 * Color del badge por código de tipo.
 *
 * `tipo.codigo` es el `tipo_base` de la ausencia, `VACACIONES` o el código del
 * motivo de retiro. Los que están aquí se pintan con los tonos del sistema,
 * que ya saben de modo claro y oscuro. Un motivo del tenant que no esté en la
 * lista cae en `secondary` y lleva su color propio en el punto.
 */
const VARIANTE_TIPO: Record<string, VarianteBadge> = {
  PERMISO_REMUNERADO: 'success',
  PERMISO_NO_REMUNERADO: 'destructive',
  CALAMIDAD_DOMESTICA: 'warning',
  VACACIONES: 'success',
  LICENCIA_MATERNIDAD: 'info',
  LICENCIA_PATERNIDAD: 'info',
  LICENCIA_LUTO: 'secondary',
  INCAPACIDAD_EPS: 'info',
  INCAPACIDAD_ARL: 'info',
  AUSENCIA_INJUSTIFICADA: 'info',
  SUSPENSION_DISCIPLINARIA: 'warning',
  RENUNCIA: 'destructive',
  FINALIZACION_CONTRATO: 'secondary',
};

/**
 * El punto del badge toma el color del motivo, que es del tenant y llega en
 * hexadecimal. Va como variable CSS porque el punto lo pinta el pseudoelemento
 * `before` del badge, al que no llega un `style` normal.
 */
function colorDelPunto(color: string | null): CSSProperties {
  return { ['--punto-tipo']: color ?? 'currentColor' } as CSSProperties;
}

export default function NovedadesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [init, setInit] = useState<InitNovedades | null>(null);
  const [filas, setFilas] = useState<NovedadFila[]>([]);
  const [meta, setMeta] = useState<MetaNovedades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [verNovedad, setVerNovedad] = useState<NovedadFila | null>(null);
  /**
   * `?novedad=<id>` abre el detalle de esa fila apenas carga el listado.
   *
   * Lo usa el bloqueo de nómina (API_NOMINA §5.1): desde la pantalla de
   * liquidación el liquidador llega directo a la novedad que lo frena, en vez
   * de tener que buscarla entre todas. El id solo es único dentro de su
   * fuente, así que el enlace manda también `?fuente=`, que ya es un filtro.
   */
  const novedadDeLaUrl = searchParams.get('novedad');
  const [urlAtendida, setUrlAtendida] = useState(false);

  /** Abre el detalle que pide la URL, una sola vez por visita. */
  const abrirLaDeLaUrl = (lista: NovedadFila[]) => {
    if (urlAtendida || !novedadDeLaUrl) return;
    const buscada = lista.find((f) => String(f.id) === novedadDeLaUrl);
    setUrlAtendida(true);
    if (buscada) setVerNovedad(buscada);
  };

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string>(TODOS);
  const [estado, setEstado] = useState<string>(TODOS);
  const [fuente, setFuente] = useState<string>(() => searchParams.get('fuente') ?? TODOS);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const reqId = useRef(0);

  /**
   * PR-N8 (§3.9 punto 3) — Cuántas ausencias están PENDIENTE en toda la finca,
   * sin importar los filtros de la tabla. Es la bandeja que hay que vaciar
   * antes de liquidar la nómina, así que el número no puede depender de lo que
   * el usuario esté filtrando. `null` mientras no se sabe.
   */
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    novedadesApi
      .init()
      .then(setInit)
      .catch(() => { /* el listado funciona sin init; solo se ocultan los botones */ });
    contarPendientes();
  }, []);

  /** Pide solo el total: `per_page: 1` porque las filas no se usan. */
  const contarPendientes = () => {
    novedadesApi
      .listar({ estado: 'PENDIENTE', fuente: 'AUSENCIA', page: 1, per_page: 1 })
      .then((res) => setPendientes(res.meta?.total ?? 0))
      .catch(() => setPendientes(null));
  };

  const cargar = () => {
    const id = ++reqId.current;
    setCargando(true);
    const filtros: FiltrosNovedades = {
      q: busqueda.trim() || undefined,
      categoria: categoria !== TODOS ? (categoria as CategoriaNovedad) : undefined,
      estado: estado !== TODOS ? estado : undefined,
      fuente: fuente !== TODOS ? (fuente as FiltrosNovedades['fuente']) : undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      page: pagina,
      per_page: POR_PAGINA,
      con_totales: 1,
    };
    novedadesApi
      .listar(filtros)
      .then((res) => {
        if (id !== reqId.current) return;
        setFilas(res.data ?? []);
        setMeta(res.meta);
        abrirLaDeLaUrl(res.data ?? []);
      })
      .catch((err) => {
        if (id !== reqId.current) return;
        setFilas([]);
        toast.error((err as ApiError).message ?? 'No se pudieron cargar las novedades');
      })
      .finally(() => { if (id === reqId.current) setCargando(false); });
  };

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, categoria, estado, fuente, desde, hasta, pagina]);

  // Cualquier filtro nuevo vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoria, estado, fuente, desde, hasta]);

  const hayFiltros =
    !!busqueda || categoria !== TODOS || estado !== TODOS || fuente !== TODOS || !!desde || !!hasta;

  const limpiar = () => {
    setBusqueda(''); setCategoria(TODOS); setEstado(TODOS);
    setFuente(TODOS); setDesde(''); setHasta('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novedades"
        description="Permisos, incapacidades, ausencias, vacaciones y terminaciones de contrato."
        actions={
          <>
            {init?.permisos.puede_importar && (
              <Button variant="outline" onClick={() => navigate('/novedades/importar')}>
                <Upload />
                Importar novedades
              </Button>
            )}
            <Button onClick={() => navigate('/novedades/nueva')}>
              <Plus />
              Nueva novedad
            </Button>
          </>
        }
      />

      {/* Totales por categoría del filtro completo, no de la página. */}
      {meta?.totales && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="gap-0 px-4 py-3">
            <p className="text-[13px] text-muted-foreground">Total</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{meta.totales.total}</p>
          </Card>
          {CATEGORIAS.map((c) => (
            <Card key={c.valor} className="gap-0 px-4 py-3">
              <p className="text-[13px] text-muted-foreground">{c.etiqueta}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                {meta.totales?.[c.valor] ?? 0}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* PR-N8 — Una ausencia sin aprobar impide liquidar a ese colaborador y
          cerrar su nómina. El acceso directo deja la bandeja a un clic en vez
          de a dos selects. */}
      {pendientes !== null && pendientes > 0 && (
        <button
          type="button"
          onClick={() => { setEstado('PENDIENTE'); setFuente('AUSENCIA'); }}
          className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-left transition hover:border-warning/20 dark:hover:border-warning/40"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">
              {pendientes} {pendientes === 1 ? 'novedad' : 'novedades'} pendiente{pendientes === 1 ? '' : 's'} de aprobar
            </p>
            <p className="text-xs text-warning">
              Mientras sigan sin aprobar, la nómina no liquida a esos colaboradores ni se cierra.
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-warning underline underline-offset-2">
            Ver pendientes
          </span>
        </button>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar colaborador o cédula"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-full sm:w-[13rem]" aria-label="Categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas las categorías</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.valor} value={c.valor}>{c.etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>{ESTADO_LABEL[e] ?? e}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fuente} onValueChange={setFuente}>
            <SelectTrigger className="w-full sm:w-[10rem]" aria-label="Fuente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Toda fuente</SelectItem>
              <SelectItem value="AUSENCIA">Ausencias</SelectItem>
              <SelectItem value="VACACION">Vacaciones</SelectItem>
              <SelectItem value="TERMINACION">Terminaciones</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex min-w-0 flex-1 basis-[40%] flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-none sm:basis-auto sm:flex-row sm:items-center sm:gap-1.5">
            Desde
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full sm:w-36"
            />
          </label>
          <label className="flex min-w-0 flex-1 basis-[40%] flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-none sm:basis-auto sm:flex-row sm:items-center sm:gap-1.5">
            Hasta
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full sm:w-36"
            />
          </label>

          {hayFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiar} className="text-muted-foreground">
              <X />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[13px] font-medium text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
                <th className="px-4 py-2.5 text-left font-semibold">Tipo</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Inicio</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold lg:table-cell">Fin</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Días</th>
                <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Estado</th>
                <th className="w-12 px-2 py-2.5">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando novedades
                    </span>
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">No se encontraron novedades</p>
                        <p className="text-sm text-muted-foreground">
                          {hayFiltros
                            ? 'Ajusta o limpia los filtros para ver más resultados.'
                            : 'Todavía no hay novedades registradas.'}
                        </p>
                      </div>
                      {hayFiltros && (
                        <Button variant="outline" size="sm" onClick={limpiar}>Limpiar filtros</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filas.map((n) => (
                <tr key={`${n.fuente}-${n.id}`} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setVerNovedad(n)}
                      className="text-left font-semibold text-foreground hover:text-primary"
                    >
                      {n.empleado.nombre_completo}
                      {n.empleado.eliminado && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(eliminado)</span>
                      )}
                    </button>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {n.empleado.documento}
                      <span className="lg:hidden"> · {formatFecha(n.fecha_inicio)}</span>
                    </span>
                    {/* Estado bajo el nombre mientras su columna no cabe. */}
                    <span className="mt-1 block lg:hidden">
                      <Badge variant="outline" className={ESTADO_BADGE[n.estado] ?? ''}>
                        {ESTADO_LABEL[n.estado] ?? n.estado}
                      </Badge>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={VARIANTE_TIPO[n.tipo.codigo] ?? 'secondary'}
                        className={VARIANTE_TIPO[n.tipo.codigo] ? undefined : 'before:bg-[var(--punto-tipo)]'}
                        style={VARIANTE_TIPO[n.tipo.codigo] ? undefined : colorDelPunto(n.tipo.color)}
                      >
                        {n.tipo.nombre}
                      </Badge>
                      {n.tiene_soporte && (
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Con soporte" />
                      )}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums lg:table-cell">
                    {formatFecha(n.fecha_inicio)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums lg:table-cell">
                    {n.fuente === 'TERMINACION'
                      ? <span className="text-muted-foreground">—</span>
                      : formatFecha(n.fecha_fin)}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold tabular-nums sm:table-cell">
                    {n.dias === null
                      ? <span className="font-normal text-muted-foreground">—</span>
                      : n.parcial ? <span className="font-normal">Parcial</span> : n.dias}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <Badge variant="outline" className={ESTADO_BADGE[n.estado] ?? ''}>
                      {ESTADO_LABEL[n.estado] ?? n.estado}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => setVerNovedad(n)}
                      aria-label="Ver novedad"
                      title="Ver"
                    >
                      <Eye />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{meta?.total ?? 0}</span>{' '}
            {hayFiltros ? 'novedades con los filtros aplicados' : 'novedades registradas'}
          </p>
          {meta && meta.last_page > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline" size="sm"
                disabled={pagina <= 1 || cargando}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={pagina >= meta.last_page || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </Card>

      <DetalleNovedadDialog
        fila={verNovedad}
        permisos={init?.permisos ?? null}
        init={init}
        onCerrar={() => setVerNovedad(null)}
        onCambio={() => { cargar(); contarPendientes(); }}
      />
    </div>
  );
}
