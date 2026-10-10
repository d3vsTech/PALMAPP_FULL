/**
 * Paso 2: colaborador por nombre o cédula, vinculado en la fecha.
 *
 * Consulta `GET colaboradores/select?q=&fecha=` (API_COLABORADORES §0): el
 * backend ya filtra por contrato vigente ese día y marca `novedad_vigente`.
 * La marca no bloquea la selección, solo avisa.
 */
import { useEffect, useRef, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { AlertTriangle, Loader2, User } from 'lucide-react';
import { colaboradoresApi, type ColaboradorSelectItem } from '../../../../api/colaboradores';
import type { ApiError } from '../../../../api/client';
import { formatFecha } from '../tipos';

/** Sin tildes y en minúsculas: "Martinez" encuentra a "Martínez". */
const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const soloDigitos = (t: string) => t.replace(/\D/g, '');

/**
 * Filtra en el navegador lo que llegó del endpoint.
 *
 * El buscador manda `q` a `GET colaboradores/select`, pero hoy la respuesta
 * llega sin filtrar: escribir un nombre no reducía la lista. Hasta que el
 * endpoint lo respete, se filtra aquí sobre lo recibido.
 *
 * Cada palabra escrita debe aparecer en el nombre, así "william p" encuentra
 * a "William Padilla" sin exigir el orden exacto. Si lo escrito son dígitos,
 * se busca también dentro de la cédula.
 */
function filtrarLocal(
  items: ColaboradorSelectItem[],
  texto: string,
): ColaboradorSelectItem[] {
  const q = sinTildes(texto);
  if (!q) return items;
  const palabras = q.split(/\s+/).filter(Boolean);
  const digitos = soloDigitos(texto);

  return items.filter((c) => {
    const nombre = sinTildes(c.nombre_completo);
    if (palabras.every((w) => nombre.includes(w))) return true;
    return digitos.length > 0 && soloDigitos(c.documento).includes(digitos);
  });
}

interface Props {
  /** Acota el listado a quienes tenían contrato ese día. */
  fecha: string;
  seleccionadoId: number | null;
  nombreInicial: string;
  onSeleccionar: (id: number | null, nombre: string) => void;
}

export function BuscadorColaborador({ fecha, seleccionadoId, nombreInicial, onSeleccionar }: Props) {
  const [texto, setTexto] = useState(nombreInicial);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [opciones, setOpciones] = useState<ColaboradorSelectItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // El blur del input llega antes que el click de la sugerencia: se cierra con
  // retardo y el timeout se guarda para poder cancelarlo al elegir.
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);

  const elegido = opciones.find((c) => c.id === seleccionadoId) ?? null;

  /*
   * Con alguien ya elegido, `texto` es su nombre completo y filtrar dejaría
   * la lista en una sola fila. En ese caso se muestra todo, que es lo útil
   * para cambiar de persona.
   */
  const visibles = seleccionadoId != null ? opciones : filtrarLocal(opciones, texto);

  useEffect(() => {
    if (!abierto) return;
    const id = ++reqId.current;
    setCargando(true);
    const t = setTimeout(() => {
      colaboradoresApi
        .selectListado({ q: texto.trim() || undefined, fecha: fecha || undefined })
        .then((res) => {
          if (id !== reqId.current) return;
          setOpciones(res.data ?? []);
          setError(null);
        })
        .catch((err) => {
          if (id !== reqId.current) return;
          setOpciones([]);
          setError((err as ApiError).message ?? 'No se pudo cargar la lista');
        })
        .finally(() => { if (id === reqId.current) setCargando(false); });
    }, texto ? 300 : 0);
    return () => clearTimeout(t);
  }, [texto, fecha, abierto]);

  const elegir = (c: ColaboradorSelectItem) => {
    if (cierre.current) clearTimeout(cierre.current);
    onSeleccionar(c.id, c.nombre_completo);
    setTexto(c.nombre_completo);
    setAbierto(false);
  };

  return (
    <div className="space-y-1.5">
      <Label>Colaborador <span className="text-destructive">*</span></Label>
      <div className="relative">
        <User className="absolute left-3 top-2.5 z-10 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o cédula..."
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            onSeleccionar(null, '');
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => { cierre.current = setTimeout(() => setAbierto(false), 150); }}
        />
        {cargando && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {abierto && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
            {error ? (
              <p className="px-4 py-3 text-sm text-destructive">{error}</p>
            ) : visibles.length === 0 && !cargando ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {fecha
                  ? 'Nadie con contrato vigente en esa fecha coincide con la búsqueda'
                  : 'Sin resultados'}
              </p>
            ) : (
              visibles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => elegir(c)}
                  className="flex w-full flex-col border-b border-border px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted"
                >
                  <span className="font-medium text-foreground">{c.nombre_completo}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.documento} · {c.modalidad_pago === 'FIJO' ? 'Fijo' : 'Producción'}
                  </span>
                  {c.novedad_vigente && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Ya tiene {c.novedad_vigente.tipo.nombre} esos días
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {elegido?.novedad_vigente && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Ya tiene {elegido.novedad_vigente.tipo.nombre} del{' '}
            {formatFecha(elegido.novedad_vigente.fecha_inicio)} al{' '}
            {formatFecha(elegido.novedad_vigente.fecha_fin)}
            {elegido.novedad_vigente.parcial
              ? '. Es parcial, así que no bloquea.'
              : '. Registrar otra en esas fechas será rechazado.'}
          </span>
        </p>
      )}
    </div>
  );
}
