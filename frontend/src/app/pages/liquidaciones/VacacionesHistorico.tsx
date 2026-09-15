import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Search, Download } from 'lucide-react';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoricoVacacion {
  id: string;
  colaborador: string;
  cargo: string;
  fechaInicio: string;
  fechaPago: string;
  diasDisfrute: number;
  diasDinero: number;
  totalPagado: number;
  estado: 'PAGADA' | 'ANULADA';
}

const historicoData: HistoricoVacacion[] = [
  { id: 'h1', colaborador: 'Ana Gómez',       cargo: 'Supervisora',         fechaInicio: '2025-01-06', fechaPago: '2024-12-31', diasDisfrute: 15, diasDinero: 0,  totalPagado: 1250000, estado: 'PAGADA' },
  { id: 'h2', colaborador: 'Luis Pérez',       cargo: 'Podador',             fechaInicio: '2024-07-15', fechaPago: '2024-07-10', diasDisfrute: 12, diasDinero: 3,  totalPagado: 875000,  estado: 'PAGADA' },
  { id: 'h3', colaborador: 'María Torres',     cargo: 'Almacenista',         fechaInicio: '2025-03-03', fechaPago: '2025-02-28', diasDisfrute: 15, diasDinero: 15, totalPagado: 1900000, estado: 'PAGADA' },
  { id: 'h4', colaborador: 'Carlos Martínez',  cargo: 'Operario de Cosecha', fechaInicio: '2024-04-01', fechaPago: '2024-03-28', diasDisfrute: 10, diasDinero: 0,  totalPagado: 583635,  estado: 'PAGADA' },
  { id: 'h5', colaborador: 'Jorge Ramírez',    cargo: 'Operario de Poda',    fechaInicio: '2024-08-12', fechaPago: '2024-08-08', diasDisfrute: 8,  diasDinero: 0,  totalPagado: 466908,  estado: 'PAGADA' },
  { id: 'h6', colaborador: 'Ana Gómez',        cargo: 'Supervisora',         fechaInicio: '2024-01-08', fechaPago: '2024-01-03', diasDisfrute: 15, diasDinero: 7,  totalPagado: 1766667, estado: 'PAGADA' },
  { id: 'h7', colaborador: 'Luis Pérez',       cargo: 'Podador',             fechaInicio: '2023-07-10', fechaPago: '2023-07-05', diasDisfrute: 15, diasDinero: 0,  totalPagado: 875452,  estado: 'ANULADA' },
  { id: 'h8', colaborador: 'María Torres',     cargo: 'Almacenista',         fechaInicio: '2024-09-02', fechaPago: '2024-08-29', diasDisfrute: 15, diasDinero: 0,  totalPagado: 950000,  estado: 'PAGADA' },
];

function formatFechaStr(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function descargarComprobante(h: HistoricoVacacion) {
  const doc = new jsPDF();
  const verde: [number, number, number] = [30, 86, 49];

  // Encabezado
  doc.setFillColor(...verde);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PALMAPP', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprobante de Liquidación de Vacaciones', 14, 21);

  doc.setTextColor(0, 0, 0);

  // Info del colaborador
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del colaborador', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Colaborador: ${h.colaborador}`, 14, 46);
  doc.text(`Cargo: ${h.cargo}`, 14, 53);
  doc.text(`Fecha de pago: ${formatFechaStr(h.fechaPago)}`, 14, 60);
  doc.text(`Inicio vacaciones: ${formatFechaStr(h.fechaInicio)}`, 110, 46);

  // Tabla de conceptos
  autoTable(doc, {
    startY: 70,
    head: [['Concepto', 'Días', 'Valor']],
    body: [
      ['Días de disfrute', String(h.diasDisfrute), formatearMoneda(Math.round(h.totalPagado * h.diasDisfrute / (h.diasDisfrute + h.diasDinero || 1)))],
      ...(h.diasDinero > 0 ? [['Días en dinero (Art. 189 CST)', String(h.diasDinero), formatearMoneda(Math.round(h.totalPagado * h.diasDinero / (h.diasDisfrute + h.diasDinero)))]] : []),
    ],
    foot: [['Total a pagar', String(h.diasDisfrute + h.diasDinero), formatearMoneda(h.totalPagado)]],
    headStyles: { fillColor: verde },
    footStyles: { fillColor: [240, 247, 240], textColor: [30, 86, 49], fontStyle: 'bold' },
  });

  // Marco legal
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Art. 186 CST: 15 días hábiles de vacaciones por año de servicio.', 14, finalY);
  doc.text('Art. 189 CST: Los días compensados en dinero no pueden superar los días de disfrute.', 14, finalY + 5);

  // Firmas
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const firmaY = finalY + 25;
  doc.line(14, firmaY, 85, firmaY);
  doc.line(120, firmaY, 196, firmaY);
  doc.text('Firma empleador', 14, firmaY + 5);
  doc.text('Firma colaborador', 120, firmaY + 5);

  doc.save(`comprobante_vacaciones_${h.colaborador.replace(/ /g, '_')}_${h.fechaPago}.pdf`);
}

export default function VacacionesHistorico() {
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const filtrado = useMemo(() =>
    historicoData.filter(h => {
      const cumpleNombre = h.colaborador.toLowerCase().includes(filtroNombre.toLowerCase());
      const cumpleEstado = filtroEstado === '' || h.estado === filtroEstado;
      const cumpleDesde  = filtroDesde === '' || h.fechaPago >= filtroDesde;
      const cumpleHasta  = filtroHasta === '' || h.fechaPago <= filtroHasta;
      return cumpleNombre && cumpleEstado && cumpleDesde && cumpleHasta;
    }),
    [filtroNombre, filtroEstado, filtroDesde, filtroHasta]
  );

  const totalPagado = filtrado
    .filter(h => h.estado === 'PAGADA')
    .reduce((s, h) => s + h.totalPagado, 0);

  const hayFiltros = filtroNombre || filtroDesde || filtroHasta || filtroEstado;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">Histórico de Vacaciones</h1>
        <p className="text-muted-foreground mt-1">Registro de todas las vacaciones liquidadas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={filtroNombre}
            onChange={e => setFiltroNombre(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Desde</span>
          <Input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="h-9" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Hasta</span>
          <Input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="h-9" />
        </div>

        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los estados</option>
          <option value="PAGADA">Pagada</option>
          <option value="ANULADA">Anulada</option>
        </select>

        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFiltroNombre(''); setFiltroDesde(''); setFiltroHasta(''); setFiltroEstado(''); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card className="glass-subtle border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Colaborador</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Cargo</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Días disfrute</th>
                  <th className="text-center p-4 font-semibold text-sm text-muted-foreground">Días dinero</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Inicio vacaciones</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Fecha pago</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Total pagado</th>
                  <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                      No se encontraron registros con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filtrado.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4">
                        <span className="text-sm font-medium text-foreground">{h.colaborador}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{h.cargo}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-success">{h.diasDisfrute}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-amber-600">{h.diasDinero > 0 ? h.diasDinero : '—'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{formatFechaStr(h.fechaInicio)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{formatFechaStr(h.fechaPago)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-foreground">{formatearMoneda(h.totalPagado)}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={
                          h.estado === 'PAGADA'
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                        }>
                          {h.estado === 'PAGADA' ? 'Pagada' : 'Anulada'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => descargarComprobante(h)}
                          className="gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filtrado.length}</span> registros
              {(filtroDesde || filtroHasta) && ' en el período seleccionado'}
            </p>
            <p className="text-sm text-muted-foreground">
              Total pagado:{' '}
              <span className="font-semibold text-foreground">{formatearMoneda(totalPagado)}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
