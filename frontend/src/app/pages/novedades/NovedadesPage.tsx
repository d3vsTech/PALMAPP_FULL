/**
 * Listado unificado de novedades (API_NOVEDADES §2).
 *
 * La tabla es la unión de ausencias, vacaciones y terminaciones. Los filtros
 * van al backend, no al arreglo: `meta.totales` cubre el filtro completo y no
 * solo la página visible.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Loader2, Paperclip, Plus, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  novedadesApi,
  type CategoriaNovedad, type FiltrosNovedades, type InitNovedades,
  type MetaNovedades, type NovedadFila,
} from '../../../api/novedades';
import type { ApiError } from '../../../api/client';
import { ESTADO_BADGE, ESTADO_LABEL, ORIGEN_LABEL, formatFecha } from './tipos';
import { DetalleNovedadDialog } from './componentes/DetalleNovedadDialog';

const TODOS = 'todos';
const POR_PAGINA = 20;

/** Las cinco pestañas, en el orden del Paso 1. */
const CATEGORIAS: { valor: CategoriaNovedad; etiqueta: string }[] = [
  { valor: 'PERMISOS_LICENCIAS', etiqueta: 'Permisos y Licencias' },
  { valor: 'INCAPACIDADES', etiqueta: 'Incapacidades' },
  { valor: 'AUSENCIAS_SANCIONES', etiqueta: 'Ausencias y Sanciones' },
  { valor: 'VACACIONES', etiqueta: 'Vacaciones' },
  { valor: 'TERMINACION_CONTRATO', etiqueta: 'Terminación de Contrato' },
];

const ESTADOS = [
  'PENDIENTE', 'APROBADA', 'RECHAZADA', 'LIQUIDADA',
  'PAGADA', 'PROGRAMADA', 'EFECTIVA',
];

export default function NovedadesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [init, setInit] = useState<InitNovedades | null>(null);
  const [filas, setFilas] = useState<NovedadFila[]>([]);
  const [meta, setMeta] = useState<MetaNovedades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [verNovedad, setVerNovedad] = useState<NovedadFila | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string>(TODOS);
  const [estado, setEstado] = useState<string>(TODOS);
  const [fuente, setFuente] = useState<string>(searchParams.get('fuente') ?? TODOS);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const reqId = useRef(0);

  useEffect(() => {
    novedadesApi
      .init()
      .then(setInit)
      .catch(() => { /* el listado funciona sin init; solo se ocultan los botones */ });
  }, []);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Novedades</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permisos, incapacidades, ausencias, vacaciones y terminaciones de contrato
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:shrink-0">
          {init?.permisos.puede_importar && (
            <Button
              variant="outline"
              onClick={() => navigate('/novedades/importar')}
              className="w-full gap-2 border-2 border-primary text-primary hover:bg-primary/5 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Importar Novedades
            </Button>
          )}
          <Button onClick={() => navigate('/novedades/nueva')} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Nueva Novedad
          </Button>
        </div>
      </div>

      {/* Totales por categoría del filtro completo, no de la página. */}
      {meta?.totales && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="border-border">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{meta.totales.total}</p>
            </CardContent>
          </Card>
          {CATEGORIAS.map((c) => (
            <Card key={c.valor} className="border-border">
              <CardContent className="p-3">
                <p className="truncate text-xs text-muted-foreground" title={c.etiqueta}>{c.etiqueta}</p>
                <p className="text-xl font-bold text-foreground">{meta.totales?.[c.valor] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="h-9 w-[13rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las categorías</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c.valor} value={c.valor}>{c.etiqueta}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="h-9 w-[11rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{ESTADO_LABEL[e] ?? e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fuente} onValueChange={setFuente}>
          <SelectTrigger className="h-9 w-[10rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Toda fuente</SelectItem>
            <SelectItem value="AUSENCIA">Ausencias</SelectItem>
            <SelectItem value="VACACION">Vacaciones</SelectItem>
            <SelectItem value="TERMINACION">Terminaciones</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-xs">Desde</span>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-xs">Hasta</span>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-36 text-sm" />
        </div>

        {hayFiltros && (
          <button
            onClick={limpiar}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />Limpiar
          </button>
        )}
      </div>

      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Tipo de novedad</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha inicio</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha fin</th>
                  <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Estado</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando novedades
                      </span>
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      {hayFiltros
                        ? 'No se encontraron novedades con los filtros aplicados'
                        : 'Todavía no hay novedades registradas'}
                    </td>
                  </tr>
                ) : filas.map((n, idx) => (
                  <tr
                    key={`${n.fuente}-${n.id}`}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {n.empleado.nombre_completo}
                          {n.empleado.eliminado && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">(eliminado)</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{n.empleado.documento}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: n.tipo.color ?? '#9ca3af' }}
                        />
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-xs">{n.tipo.nombre}</Badge>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {ORIGEN_LABEL[n.origen] ?? n.origen}
                            {n.parcial && n.horario && ` · ${n.horario}`}
                            {n.tiene_soporte && ' · con soporte'}
                          </p>
                        </div>
                        {n.tiene_soporte && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{formatFecha(n.fecha_inicio)}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {n.fuente === 'TERMINACION' ? '—' : formatFecha(n.fecha_fin)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        {n.dias === null ? '—' : n.parcial ? 'Parcial' : n.dias}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={`text-xs ${ESTADO_BADGE[n.estado] ?? ''}`}>
                        {ESTADO_LABEL[n.estado] ?? n.estado}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVerNovedad(n)}
                          className="hover:border-primary hover:bg-primary/10 hover:text-primary"
                        >
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{meta?.total ?? 0}</span> novedades
              {hayFiltros && ' con los filtros aplicados'}
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
        </CardContent>
      </Card>

      <DetalleNovedadDialog
        fila={verNovedad}
        permisos={init?.permisos ?? null}
        init={init}
        onCerrar={() => setVerNovedad(null)}
        onCambio={cargar}
      />
    </div>
  );
}
