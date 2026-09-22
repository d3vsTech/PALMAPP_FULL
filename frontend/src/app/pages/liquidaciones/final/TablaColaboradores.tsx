/**
 * Tabla de colaboradores para elegir a quién liquidar.
 *
 * La lista sale de `GET /colaboradores` (API_COLABORADORES §1), que sí pagina.
 * El buscador de liquidación final (§11.4) devuelve máximo 30 sin paginación,
 * así que con una finca de 200 personas dejaba fuera a la mayoría.
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
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { colaboradoresApi, type Colaborador } from '../../../../api/colaboradores';
import { TIPO_CONTRATO_LABEL, type ColaboradorLiquidable } from '../../../../api/liquidacionFinal';
import { fmtFecha, getIniciales, mensajeErrorLiquidacion } from './comunes';

const POR_PAGINA = 10;

/** Lo que la tabla necesita de cada fila, venga de donde venga. */
interface FilaColaborador {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  tipo_contrato: string | null;
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
    tipo_contrato: c.contrato_vigente?.tipo_contrato ?? null,
    fecha_ingreso: c.fecha_ingreso ?? null,
    fecha_retiro: c.fecha_retiro ?? null,
  };
}

interface Props {
  seleccionado: ColaboradorLiquidable | null;
  onSeleccionar: (empleadoId: number) => void;
  /** En edición el colaborador ya está fijado y no se cambia. */
  deshabilitado?: boolean;
  /** Texto del botón de cada fila, según el flujo. */
  etiquetaAccion?: string;
  /** Marca la fila cuya ficha se está cargando. */
  cargandoId?: number | null;
}

export function TablaColaboradores({
  seleccionado,
  onSeleccionar,
  deshabilitado = false,
  etiquetaAccion = 'Seleccionar',
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

  // Ya hay uno elegido: se muestra plegado hasta que pidan cambiarlo.
  if (seleccionado && !cambiando) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {getIniciales(seleccionado.nombre_completo)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{seleccionado.nombre_completo}</p>
            <p className="truncate text-xs text-muted-foreground">
              CC {seleccionado.documento}
              {seleccionado.cargo ? ` · ${seleccionado.cargo}` : ''}
            </p>
          </div>
        </div>

        {!deshabilitado && (
          <Button type="button" variant="outline" size="sm" onClick={() => setCambiando(true)}>
            Cambiar colaborador
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          className="pl-9"
        />
        {cargando && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground">
                Colaborador
              </th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Cédula</th>
              <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground sm:table-cell">
                Contrato
              </th>
              <th className="hidden p-3 text-left text-xs font-semibold text-muted-foreground md:table-cell">
                Ingreso
              </th>
              <th className="p-3 text-right text-xs font-semibold text-muted-foreground">Acción</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Users className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {termino
                      ? 'Ningún colaborador coincide con esa búsqueda'
                      : 'No hay colaboradores registrados'}
                  </p>
                </td>
              </tr>
            ) : (
              filas.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${
                    i % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {getIniciales(c.nombre_completo)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.nombre_completo}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.cargo ?? '—'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-sm text-muted-foreground">{c.documento}</td>

                  <td className="hidden p-3 text-sm text-muted-foreground sm:table-cell">
                    {c.tipo_contrato
                      ? (TIPO_CONTRATO_LABEL[
                          c.tipo_contrato as keyof typeof TIPO_CONTRATO_LABEL
                        ] ?? c.tipo_contrato)
                      : 'Sin contrato'}
                  </td>

                  <td className="hidden p-3 text-sm text-muted-foreground md:table-cell">
                    {fmtFecha(c.fecha_ingreso)}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      {c.fecha_retiro && (
                        <Badge variant="outline" className="text-[10px]">
                          Retirado {fmtFecha(c.fecha_retiro)}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={cargandoId != null}
                        onClick={() => {
                          onSeleccionar(c.id);
                          setCambiando(false);
                        }}
                        className="gap-1.5"
                      >
                        {cargandoId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        {etiquetaAccion}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filas.length} de <span className="font-medium text-foreground">{total}</span>{' '}
            colaborador{total === 1 ? '' : 'es'}
            {termino ? ' con esa búsqueda' : ''}
          </p>

          {ultimaPagina > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pagina <= 1 || cargando}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {pagina} de {ultimaPagina}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pagina >= ultimaPagina || cargando}
                onClick={() => setPagina((p) => p + 1)}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {seleccionado && cambiando && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setCambiando(false)}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
