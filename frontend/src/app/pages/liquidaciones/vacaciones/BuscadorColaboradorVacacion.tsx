/**
 * Buscador de colaborador para liquidar vacaciones.
 *
 * El diseño deja elegir a la persona dentro de la misma pantalla; aquí se
 * entraba solo con `?col=` desde la pestaña de vacaciones y, sin ese
 * parámetro, la pantalla quedaba sin salida. La lista es la misma de turnos
 * pendientes (§10.1): no hay consulta nueva, solo se muestra acá.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { vacacionesApi, type TurnoPendienteVacaciones } from '../../../../api/vacaciones';
import type { ApiError } from '../../../../api/client';
import { SEMAFORO, fmtDias } from './comunes';

interface Props {
  onElegir: (empleadoId: number) => void;
}

export function BuscadorColaboradorVacacion({ onElegir }: Props) {
  const [filas, setFilas] = useState<TurnoPendienteVacaciones[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [termino, setTermino] = useState('');
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const reqRef = useRef(0);

  // Espera a que el usuario deje de escribir antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => setTermino(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const reqId = ++reqRef.current;
    setCargando(true);
    vacacionesApi
      .pendientes({ q: termino || undefined, per_page: 50 })
      .then((res) => {
        if (reqId !== reqRef.current) return;
        setFilas(res.data);
      })
      .catch((err) => {
        if (reqId !== reqRef.current) return;
        toast.error((err as ApiError).message ?? 'No se pudo cargar la lista de colaboradores');
        setFilas([]);
      })
      .finally(() => {
        if (reqId === reqRef.current) setCargando(false);
      });
  }, [termino]);

  return (
    <div className="relative space-y-2">
      <Label htmlFor="busqueda-colaborador-vacacion">Buscar colaborador *</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <Input
          id="busqueda-colaborador-vacacion"
          type="text"
          value={busqueda}
          onChange={(e) => {
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

      {abierto && !cargando && filas.length === 0 && (
        <Card className="absolute z-50 mt-1 w-full gap-0 px-4 py-3 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {termino ? 'No se encontraron colaboradores' : 'No hay turnos de vacaciones pendientes'}
          </p>
        </Card>
      )}

      {abierto && filas.length > 0 && (
        <Card
          className="absolute z-50 mt-1 max-h-72 w-full gap-0 overflow-y-auto py-1 shadow-sm"
          // Evita que el campo pierda el foco y cierre la lista antes del clic.
          onMouseDown={(e) => e.preventDefault()}
        >
          {filas.map((f) => {
            const s = SEMAFORO[f.estado_vencimiento];
            return (
              <button
                key={f.empleado.id}
                type="button"
                onClick={() => onElegir(f.empleado.id)}
                className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {f.empleado.nombre_completo}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {f.empleado.cargo ? `${f.empleado.cargo} · ` : ''}CC {f.empleado.documento}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {fmtDias(f.dias_disponibles_exigibles)} días disponibles
                  </span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </span>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
