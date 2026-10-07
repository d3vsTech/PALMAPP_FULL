/**
 * Vacaciones — turnos pendientes (API_LIQUIDACIONES §10.1).
 *
 * El semáforo de vencimiento lo calcula el backend y llega en
 * `estado_vencimiento` / `dias_para_vencimiento`. Aquí no se recalcula:
 * el corte de los 30 y 90 días es regla de negocio, no de pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Loader2, Plane, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import {
  vacacionesApi,
  type MetaTurnosPendientes,
  type TurnoPendienteVacaciones,
  type VacacionItem,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { SEMAFORO, fmtDias } from './vacaciones/comunes';

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
    <div className="space-y-8">

      {/* ── Solicitudes por resolver (PR-N4) ──────────────────────────────── */}
      {solicitudes.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <div className="flex items-start gap-3">
            <Inbox className="mt-0.5 h-5 w-5 shrink-0 text-orange-700 dark:text-orange-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold text-orange-800 dark:text-orange-300">
                {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} de vacaciones por resolver
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Se pidieron desde Novedades. Liquidarlas es aprobarlas; mientras no se resuelvan,
                la nómina del período paga esos días como trabajados.
              </p>
              <div className="space-y-1">
                {solicitudes.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200/60 bg-background/60 px-3 py-2 dark:border-orange-900/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.empleado.nombre_completo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.dias_habiles} días hábiles
                        {s.fecha_inicio && ` desde ${formatFecha(s.fecha_inicio)}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/liquidaciones/vacaciones/nueva?solicitud=${s.id}`)}
                      className="gap-1.5 bg-success hover:bg-success/90"
                    >
                      Liquidar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Vacaciones pendientes ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* "Histórico de vacaciones" vive en el encabezado del módulo, al
            lado de Importar: al pie quedaba debajo de la tabla y con muchos
            colaboradores tocaba bajar hasta el final para encontrarlo. */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">Vacaciones pendientes</h2>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador o cédula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
        </div>

        {meta && !meta.anticipadas_habilitadas && (
          <p className="text-xs text-muted-foreground">
            Solo se liquidan períodos ya cumplidos. Las vacaciones anticipadas están
            apagadas en Configuración.
          </p>
        )}

        <Card className="glass-subtle border-border">
          <CardContent className="p-0">
            {cargando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando turnos
              </div>
            ) : filas.length === 0 ? (
              <div className="py-16 text-center">
                <Plane className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No hay vacaciones pendientes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {busqueda
                    ? 'Ningún colaborador coincide con la búsqueda.'
                    : 'Nadie tiene días de vacaciones por liquidar.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">No. Documento</th>
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Fecha de ingreso</th>
                      <th className="p-4 text-center text-sm font-semibold text-muted-foreground">Días pendientes</th>
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Vencimiento</th>
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Estado</th>
                      <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, idx) => {
                      const s = SEMAFORO[f.estado_vencimiento];
                      const esUrgente = f.estado_vencimiento === 'VENCIDA' || f.estado_vencimiento === 'URGENTE';
                      const sinSaldo = f.dias_disponibles_exigibles <= 0;
                      const dias = f.dias_para_vencimiento;
                      return (
                        <tr
                          key={f.empleado.id}
                          className={`border-b border-border transition-colors last:border-0 hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                        >
                          <td className="p-4">
                            <span className="text-sm font-medium text-foreground">{f.empleado.nombre_completo}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-foreground">{f.empleado.documento}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-foreground">{formatFecha(f.empleado.fecha_ingreso)}</span>
                          </td>
                          <td className="p-4 text-center">
                            {sinSaldo ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold text-amber-600">
                                  {fmtDias(f.dias_disponibles_exigibles)}
                                </span>
                                {f.dias_causados_periodo_actual > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{fmtDias(f.dias_causados_periodo_actual)} en curso
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {f.fecha_vencimiento == null ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${esUrgente ? 'text-destructive' : 'text-foreground'}`}>
                                  {dias == null
                                    ? '—'
                                    : dias < 0 ? `Vencida hace ${Math.abs(dias)} días`
                                    : dias === 0 ? 'Vence hoy'
                                    : dias === 1 ? 'Vence mañana'
                                    : `Vence en ${dias} días`}
                                </span>
                                <span className="text-xs text-muted-foreground">{formatFecha(f.fecha_vencimiento)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={s.badge}>{s.label}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              {sinSaldo ? (
                                <span className="text-xs text-muted-foreground">Sin pendientes</span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/liquidaciones/vacaciones/nueva?col=${f.empleado.id}`)}
                                >
                                  Liquidar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
