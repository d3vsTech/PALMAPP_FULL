import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Download, FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLiquidaciones, VacacionesColaborador } from '../../contexts/LiquidacionesContext';

// ── Mock pendientes ────────────────────────────────────────────────────────────
const vacacionesData: VacacionesColaborador[] = [
  {
    id: 'vac1', colaboradorId: 'c1', nombreCompleto: 'Carlos Martínez',
    cargo: 'Operario de Cosecha', fechaIngreso: '2024-01-15', salarioBasico: 1750905,
    diasCausados: 15, diasDisfrutados: 0, diasPendientes: 15, diasCompensados: 0,
    ultimoPeriodoInicio: '2024-01-15', ultimoPeriodoFin: '2025-09-20',
    diasHabilesLaborados: 312, estado: 'DISPONIBLE',
  },
  {
    id: 'vac2', colaboradorId: 'c2', nombreCompleto: 'Ana Gómez',
    cargo: 'Supervisora', fechaIngreso: '2023-06-10', salarioBasico: 2500000,
    diasCausados: 37, diasDisfrutados: 15, diasPendientes: 22, diasCompensados: 0,
    ultimoPeriodoInicio: '2024-06-10', ultimoPeriodoFin: '2025-11-01',
    diasHabilesLaborados: 312, estado: 'PARCIAL',
  },
  {
    id: 'vac3', colaboradorId: 'c3', nombreCompleto: 'Luis Pérez',
    cargo: 'Podador', fechaIngreso: '2022-03-20', salarioBasico: 1750905,
    diasCausados: 27, diasDisfrutados: 15, diasPendientes: 12, diasCompensados: 0,
    ultimoPeriodoInicio: '2025-03-20', ultimoPeriodoFin: '2026-03-19',
    diasHabilesLaborados: 312, estado: 'PARCIAL',
  },
  {
    id: 'vac4', colaboradorId: 'c4', nombreCompleto: 'María Torres',
    cargo: 'Almacenista', fechaIngreso: '2021-08-01', salarioBasico: 1900000,
    diasCausados: 30, diasDisfrutados: 0, diasPendientes: 0, diasCompensados: 30,
    ultimoPeriodoInicio: '2024-08-01', ultimoPeriodoFin: '2025-07-31',
    diasHabilesLaborados: 312, valorCompensacion: 3800000, estado: 'COMPENSADO',
  },
  {
    id: 'vac5', colaboradorId: 'c5', nombreCompleto: 'Jorge Ramírez',
    cargo: 'Operario de Poda', fechaIngreso: '2024-09-15', salarioBasico: 1750905,
    diasCausados: 8, diasDisfrutados: 0, diasPendientes: 8, diasCompensados: 0,
    ultimoPeriodoInicio: '2024-09-15', ultimoPeriodoFin: '2025-09-28',
    diasHabilesLaborados: 156, estado: 'DISPONIBLE',
  },
];


// ── Urgencia ──────────────────────────────────────────────────────────────────
type Urgencia = 'VENCIDA' | 'CRITICA' | 'PROXIMA' | 'HOLGADA' | 'AL_DIA';

const URGENCIA_ORDEN: Record<Urgencia, number> = {
  VENCIDA: 0, CRITICA: 1, PROXIMA: 2, HOLGADA: 3, AL_DIA: 4,
};

function calcularUrgencia(vac: VacacionesColaborador) {
  if (vac.diasPendientes === 0) {
    return { urgencia: 'AL_DIA' as Urgencia, diasAlVencimiento: Infinity, fechaVencimiento: new Date() };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(vac.ultimoPeriodoFin);
  vencimiento.setFullYear(vencimiento.getFullYear() + 1);
  const dias = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  let urgencia: Urgencia;
  if (dias < 0) urgencia = 'VENCIDA';
  else if (dias <= 15) urgencia = 'CRITICA';
  else if (dias <= 60) urgencia = 'PROXIMA';
  else urgencia = 'HOLGADA';
  return { urgencia, diasAlVencimiento: dias, fechaVencimiento: vencimiento };
}

function semaforoClases(urgencia: Urgencia) {
  switch (urgencia) {
    case 'VENCIDA':  return { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30', label: 'Vencida' };
    case 'CRITICA':  return { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30', label: 'Urgente' };
    case 'PROXIMA':  return { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30', label: 'Próxima' };
    case 'HOLGADA':  return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30', label: 'Con tiempo' };
    case 'AL_DIA':   return { dot: 'bg-muted-foreground', badge: 'bg-muted/50 text-muted-foreground border-border', label: 'Al día' };
  }
}

function diasLabel(dias: number) {
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

function formatFecha(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}


// ── Componente ────────────────────────────────────────────────────────────────
export default function VacacionesTab() {
  const navigate = useNavigate();
  const { vacaciones, setVacaciones } = useLiquidaciones();

  // Siembra la maqueta una sola vez al montar: si se vuelve a la pestaña no
  // debe pisar lo que el usuario haya liquidado en esta sesión.
  useEffect(() => {
    if (vacaciones.length === 0) setVacaciones(vacacionesData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enriched = useMemo(() =>
    vacaciones
      .map(vac => ({ vac, info: calcularUrgencia(vac) }))
      .sort((a, b) => {
        const ord = URGENCIA_ORDEN[a.info.urgencia] - URGENCIA_ORDEN[b.info.urgencia];
        return ord !== 0 ? ord : a.info.diasAlVencimiento - b.info.diasAlVencimiento;
      }),
    [vacaciones]
  );

  /** Filas del reporte, en el mismo orden por urgencia que la tabla. */
  const filasReporte = () => enriched.map(({ vac, info }) => ({
    nombre: vac.nombreCompleto,
    cargo: vac.cargo,
    causados: vac.diasCausados,
    disfrutados: vac.diasDisfrutados,
    compensados: vac.diasCompensados,
    pendientes: vac.diasPendientes,
    vencimiento: vac.diasPendientes === 0 ? '—' : formatFecha(info.fechaVencimiento),
    urgencia: semaforoClases(info.urgencia).label,
    estado: vac.estado,
  }));

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const filas = filasReporte();

    doc.setFontSize(16);
    doc.text('Reporte de Vacaciones', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, 28);

    const pendientes = filas.reduce((s, f) => s + f.pendientes, 0);
    const vencidas = filas.filter(f => f.urgencia === 'Vencida' || f.urgencia === 'Urgente').length;
    doc.setFontSize(12);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    doc.text(`Colaboradores: ${filas.length}`, 14, 45);
    doc.text(`Días pendientes: ${pendientes}`, 14, 51);
    doc.text(`Turnos vencidos o urgentes: ${vencidas}`, 14, 57);

    autoTable(doc, {
      startY: 65,
      head: [['Colaborador', 'Cargo', 'Causados', 'Disfrutados', 'Compensados', 'Pendientes', 'Vencimiento', 'Urgencia', 'Estado']],
      body: filas.map(f => [
        f.nombre, f.cargo, f.causados, f.disfrutados, f.compensados,
        f.pendientes, f.vencimiento, f.urgencia, f.estado,
      ]),
      headStyles: { fillColor: [30, 86, 49] },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 247] },
    });

    doc.save(`vacaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportarExcel = () => {
    const encabezados = [
      'Colaborador', 'Cargo', 'Días causados', 'Días disfrutados', 'Días compensados',
      'Días pendientes', 'Vencimiento', 'Urgencia', 'Estado',
    ];
    // Se entrecomilla cada celda: los nombres y cargos pueden traer comas.
    const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const filas = filasReporte().map(f => [
      f.nombre, f.cargo, f.causados, f.disfrutados, f.compensados,
      f.pendientes, f.vencimiento, f.urgencia, f.estado,
    ]);
    const csv = [encabezados, ...filas].map(fila => fila.map(celda).join(',')).join('\r\n');

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

        <Card className="glass-subtle border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                    <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Días pendientes</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Vencimiento</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                    <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(({ vac, info }, idx) => {
                    const s = semaforoClases(info.urgencia);
                    const esUrgente = info.urgencia === 'VENCIDA' || info.urgencia === 'CRITICA';
                    const esAlDia = info.urgencia === 'AL_DIA';
                    return (
                      <tr key={vac.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{vac.nombreCompleto}</span>
                            <span className="text-xs text-muted-foreground">
                              Ingreso: {new Date(vac.fechaIngreso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground">{vac.cargo}</span>
                        </td>
                        <td className="p-4 text-center">
                          {esAlDia
                            ? <span className="text-sm text-muted-foreground">—</span>
                            : <span className="text-sm font-bold text-amber-600">{vac.diasPendientes}</span>
                          }
                        </td>
                        <td className="p-4">
                          {esAlDia ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold ${esUrgente ? 'text-destructive' : 'text-foreground'}`}>
                                {diasLabel(info.diasAlVencimiento)}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatFecha(info.fechaVencimiento)}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={s.badge}>{s.label}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            {esAlDia ? (
                              <span className="text-xs text-muted-foreground">Sin pendientes</span>
                            ) : (
                              <Button
                                size="sm"
                                variant={esUrgente ? 'default' : 'outline'}
                                onClick={() => navigate(`/liquidaciones/vacaciones/nueva?col=${vac.colaboradorId}`)}
                                className={esUrgente ? '' : 'hover:bg-primary/10 hover:text-primary hover:border-primary'}
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
          </CardContent>
        </Card>
      </div>

      {/* ── Botón histórico ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
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
