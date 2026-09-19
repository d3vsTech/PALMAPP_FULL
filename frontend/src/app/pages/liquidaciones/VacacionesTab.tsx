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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Download, FileText, History, Search, Loader2, Plane, AlertTriangle, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  vacacionesApi,
  type EstadoVencimiento,
  type MetaTurnosPendientes,
  type TurnoPendienteVacaciones,
} from '../../../api/vacaciones';
import type { ApiError } from '../../../api/client';
import { formatFecha } from '../../utils/fecha';
import { SEMAFORO, fmtDias } from './vacaciones/comunes';

const ESTADOS_FILTRO: Array<{ valor: string; label: string }> = [
  { valor: 'todos', label: 'Todos los estados' },
  { valor: 'VENCIDA', label: 'Vencidas' },
  { valor: 'URGENTE', label: 'Urgentes' },
  { valor: 'PROXIMA', label: 'Próximas' },
  { valor: 'CON_TIEMPO', label: 'Con tiempo' },
  { valor: 'AL_DIA', label: 'Al día' },
];

export default function VacacionesTab() {
  const navigate = useNavigate();

  const [filas, setFilas] = useState<TurnoPendienteVacaciones[]>([]);
  const [meta, setMeta] = useState<MetaTurnosPendientes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const reqIdRef = useRef(0);

  const cargar = () => {
    const reqId = ++reqIdRef.current;
    setCargando(true);
    vacacionesApi
      .pendientes({
        q: busqueda.trim() || undefined,
        estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoVencimiento) : undefined,
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

  // Búsqueda con respiro: el endpoint recorre la causación de cada empleado.
  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroEstado]);

  const porEstado = meta?.totales.por_estado;
  const urgentes = (porEstado?.VENCIDA ?? 0) + (porEstado?.URGENTE ?? 0);

  /** Filas del reporte, en el mismo orden que la tabla. */
  const filasReporte = () => filas.map((f) => ({
    nombre: f.empleado.nombre_completo,
    documento: f.empleado.documento,
    cargo: f.empleado.cargo ?? '—',
    generados: fmtDias(f.dias_generados),
    disfrutados: fmtDias(f.dias_disfrutados),
    compensados: fmtDias(f.dias_compensados),
    exigibles: fmtDias(f.dias_disponibles_exigibles),
    vencimiento: f.fecha_vencimiento ? formatFecha(f.fecha_vencimiento) : '—',
    estado: SEMAFORO[f.estado_vencimiento].label,
  }));

  const exportarPDF = () => {
    if (filas.length === 0) { toast.error('No hay turnos para exportar'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const reporte = filasReporte();

    doc.setFontSize(16);
    doc.text('Reporte de Vacaciones', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Colaboradores: ${meta?.totales.colaboradores ?? filas.length}`, 14, 45);
    doc.text(`Días exigibles: ${fmtDias(meta?.totales.dias_exigibles ?? 0)}`, 14, 51);
    doc.text(`Turnos vencidos o urgentes: ${urgentes}`, 14, 57);

    autoTable(doc, {
      startY: 65,
      head: [['Colaborador', 'Documento', 'Cargo', 'Generados', 'Disfrutados', 'Compensados', 'Exigibles', 'Vencimiento', 'Estado']],
      body: reporte.map((f) => [
        f.nombre, f.documento, f.cargo, f.generados, f.disfrutados,
        f.compensados, f.exigibles, f.vencimiento, f.estado,
      ]),
      headStyles: { fillColor: [30, 86, 49] },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 247] },
    });

    doc.save(`vacaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    if (filas.length === 0) { toast.error('No hay turnos para exportar'); return; }
    const encabezados = [
      'Colaborador', 'Documento', 'Cargo', 'Días generados', 'Días disfrutados',
      'Días compensados', 'Días exigibles', 'Vencimiento', 'Estado',
    ];
    // Se entrecomilla cada celda: los nombres y cargos pueden traer comas.
    const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const cuerpo = filasReporte().map((f) => [
      f.nombre, f.documento, f.cargo, f.generados, f.disfrutados,
      f.compensados, f.exigibles, f.vencimiento, f.estado,
    ]);
    const csv = [encabezados, ...cuerpo].map((fila) => fila.map(celda).join(',')).join('\r\n');

    // El BOM hace que Excel lea las tildes y la ñ correctamente.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacaciones_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Excel generado exitosamente');
  };

  return (
    <div className="space-y-8">

      {/* ── Tarjetas de resumen ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-subtle border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Colaboradores con saldo</p>
              <p className="text-2xl font-bold text-foreground">{meta?.totales.colaboradores ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días exigibles</p>
              <p className="text-2xl font-bold text-foreground">{fmtDias(meta?.totales.dias_exigibles ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencidas o urgentes</p>
              <p className="text-2xl font-bold text-foreground">{urgentes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sección 1: Turnos pendientes ──────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">Turnos pendientes</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[13rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS_FILTRO.map((e) => (
                <SelectItem key={e.valor} value={e.valor}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <p className="font-medium text-foreground">No hay turnos pendientes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {busqueda || filtroEstado !== 'todos'
                    ? 'Prueba con otro filtro.'
                    : 'Nadie tiene días de vacaciones por liquidar.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Colaborador</th>
                      <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Cargo</th>
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
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{f.empleado.nombre_completo}</span>
                              <span className="text-xs text-muted-foreground">
                                CC {f.empleado.documento} · Ingreso: {formatFecha(f.empleado.fecha_ingreso)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-foreground">{f.empleado.cargo ?? '—'}</span>
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
                                    : dias < 0 ? `Venció hace ${Math.abs(dias)} días`
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
                                  variant={esUrgente ? 'default' : 'outline'}
                                  onClick={() => navigate(`/liquidaciones/vacaciones/nueva?col=${f.empleado.id}`)}
                                  className={esUrgente ? '' : 'hover:border-primary hover:bg-primary/10 hover:text-primary'}
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

      {/* ── Acciones de pie ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/liquidaciones/vacaciones/carga-historico')}
          className="gap-2"
        >
          <CalendarClock className="h-4 w-4" />
          Cargar vacaciones anteriores
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/liquidaciones/vacaciones/historico')}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Histórico de liquidaciones
        </Button>
      </div>
    </div>
  );
}
