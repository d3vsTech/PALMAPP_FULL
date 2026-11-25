/**
 * Vacaciones — turnos pendientes (API_LIQUIDACIONES §10.1).
 *
 * El semáforo de vencimiento lo calcula el backend y llega en
 * `estado_vencimiento` / `dias_para_vencimiento`. Aquí no se recalcula:
 * el corte de los 30 y 90 días es regla de negocio, no de pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calculator, Search, Loader2, Inbox, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  type MetaTurnosPendientes,
  type TurnoPendienteVacaciones,
  type VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { SEMAFORO, fmtDias, fmtFechaCorta } from './vacaciones/comunes';
import AnularVacacionDialog from './vacaciones/AnularVacacionDialog';
import SeccionEncabezado from '../../components/liquidaciones/SeccionEncabezado';
import FiltrosFila from '../../components/liquidaciones/FiltrosFila';
import VacioCard from '../../components/liquidaciones/VacioCard';

function textoVencimiento(dias: number | null): string {
  if (dias == null) return '—';
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

export default function VacacionesTab() {
  const navigate = useNavigate();

  const [filas, setFilas] = useState<TurnoPendienteVacaciones[]>([]);
  const [meta, setMeta] = useState<MetaTurnosPendientes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  /**
   * PR-N4 — Solicitudes PENDIENTE venidas de Novedades. Van arriba porque
   * piden acción: mientras no se liquiden ni se rechacen, la nómina del
   * período paga esos días como trabajados.
   */
  const [solicitudes, setSolicitudes] = useState<VacacionItem[]>([]);
  /**
   * §10.10 — Rechazar es `anular` desde PENDIENTE: no hay endpoint propio.
   * Sin guardas de nómina, porque una solicitud nunca neutralizó nada; queda
   * CANCELADA sin `liquidado_at` y el rango vuelve a estar libre.
   */
  const [aRechazar, setARechazar] = useState<VacacionItem | null>(null);
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    vacacionesApi
      .pendientes({
        q: busqueda.trim() || undefined,
        per_page: 100,
      })
      .then((res) => {
        if (reqId !== reqIdRef.current) return;
        setFilas(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const e = err as ApiError;
        toast.error(e.message ?? 'Error al cargar los turnos de vacaciones');
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setCargando(false);
      });
  };

  // Las solicitudes no dependen de la búsqueda: son pocas y son un aviso,
  // no un listado. Un fallo aquí no puede tumbar la pestaña.
  useEffect(() => {
    let vivo = true;
    vacacionesApi
      .listar({ estado: 'PENDIENTE', per_page: 10 })
      .then((res) => { if (vivo) setSolicitudes(res.data); })
      .catch(() => { if (vivo) setSolicitudes([]); });
    return () => { vivo = false; };
  }, []);

  // Búsqueda con respiro: el endpoint recorre la causación de cada empleado.
  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  return (
    <div className="space-y-6">

      {/* ── Solicitudes por resolver (PR-N4) ──────────────────────────────── */}
      {solicitudes.length > 0 && (
        <div className="flex gap-2 rounded-lg bg-warning-soft p-3">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} de vacaciones por resolver
              </p>
              <p className="text-sm text-foreground">
                Se pidieron desde Novedades. Liquidarlas es aprobarlas; mientras no se resuelvan,
                la nómina del período paga esos días como trabajados.
              </p>
            </div>
            <div className="space-y-1.5">
              {solicitudes.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.empleado.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.dias_habiles} días hábiles
                      {s.fecha_inicio && ` desde ${formatFecha(s.fecha_inicio)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setARechazar(s)}
                      className="hover:text-destructive"
                    >
                      <X strokeWidth={2} />
                      Rechazar
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/liquidaciones/vacaciones/nueva?solicitud=${s.id}`)}>
                      <Calculator strokeWidth={2} />
                      Liquidar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Al rechazarla desaparece del panel y el saldo del colaborador no se
          mueve: una solicitud nunca lo consumió. */}
      <AnularVacacionDialog
        vacacion={aRechazar}
        modo="solicitud"
        onCerrar={() => setARechazar(null)}
        onAnulada={(v) => setSolicitudes((prev) => prev.filter((s) => s.id !== v.id))}
      />

      {/* "Histórico de vacaciones" vive en el encabezado del módulo. */}
      <SeccionEncabezado
        title="Vacaciones pendientes"
        description={
          meta && !meta.anticipadas_habilitadas
            ? 'Ordenadas por urgencia. Solo se liquidan períodos ya cumplidos: las anticipadas están apagadas en Configuración.'
            : 'Ordenadas por urgencia: primero las que vencen antes.'
        }
      />

      <div className="space-y-3">
        <FiltrosFila
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          placeholder="Buscar colaborador o cédula"
        />

        {cargando ? (
          <Card className="flex-row items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando turnos...
          </Card>
        ) : filas.length === 0 ? (
          <VacioCard
            icon={Search}
            title="Sin resultados"
            description={busqueda ? 'Ningún colaborador coincide con la búsqueda.' : 'Nadie tiene días de vacaciones por liquidar.'}
            action={busqueda ? <Button variant="outline" onClick={() => setBusqueda('')}>Limpiar búsqueda</Button> : undefined}
          />
        ) : (
          <Card className="gap-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="whitespace-nowrap bg-muted/60 text-[13px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">Colaborador</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold md:table-cell">Documento</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold lg:table-cell">Fecha de ingreso</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Días pend.</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Vencimiento</th>
                    <th className="hidden px-4 py-2.5 text-left font-semibold sm:table-cell">Estado</th>
                    <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((f) => (
                    <FilaTurno key={f.empleado.id} fila={f} onLiquidar={() => navigate(`/liquidaciones/vacaciones/nueva?col=${f.empleado.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function FilaTurno({ fila: f, onLiquidar }: { fila: TurnoPendienteVacaciones; onLiquidar: () => void }) {
  const s = SEMAFORO[f.estado_vencimiento];
  const esUrgente = f.estado_vencimiento === 'VENCIDA' || f.estado_vencimiento === 'URGENTE';
  const sinSaldo = f.dias_disponibles_exigibles <= 0;
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-5 py-3">
        <span className="font-semibold text-foreground">{f.empleado.nombre_completo}</span>
        {/* El cargo va siempre bajo el nombre, como en el diseño. */}
        <span className="block text-xs text-muted-foreground">{f.empleado.cargo ?? 'Sin cargo'}</span>
        <span className="mt-1 block sm:hidden">
          <Badge variant={s.variant}>{s.label}</Badge>
        </span>
      </td>
      <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">{f.empleado.documento}</td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">{fmtFechaCorta(f.empleado.fecha_ingreso)}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
        {sinSaldo ? (
          <span className="font-normal text-muted-foreground">—</span>
        ) : (
          <>
            {fmtDias(f.dias_disponibles_exigibles)}
            {f.dias_causados_periodo_actual > 0 && (
              <span className="block whitespace-nowrap text-xs font-normal text-muted-foreground">
                +{fmtDias(f.dias_causados_periodo_actual)} en curso
              </span>
            )}
          </>
        )}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        {f.fecha_vencimiento == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span className={`whitespace-nowrap ${esUrgente ? 'font-medium text-destructive' : 'text-foreground'}`}>
              {textoVencimiento(f.dias_para_vencimiento)}
            </span>
            <span className="block text-xs text-muted-foreground">{fmtFechaCorta(f.fecha_vencimiento)}</span>
          </>
        )}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <Badge variant={s.variant}>{s.label}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {sinSaldo ? (
          <span className="text-xs text-muted-foreground">Sin pendientes</span>
        ) : (
          <Button variant="outline" size="sm" onClick={onLiquidar}>
            <Calculator strokeWidth={2} />
            Liquidar
          </Button>
        )}
      </td>
    </tr>
  );
}
