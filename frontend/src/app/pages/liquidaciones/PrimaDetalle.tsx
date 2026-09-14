import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  ArrowLeft, ArrowRight, Check, Users, Calendar,
  Gift, CheckCircle, TrendingUp, Download, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Mock ──────────────────────────────────────────────────────────────────────
const periodosMock: Record<string, { id: string; descripcion: string; anio: number; semestre: string; fechaInicio: string; fechaFin: string; fechaLimite: string; estado: 'BORRADOR' | 'CERRADA'; fechaPago?: string }> = {
  'prima-2026-2': { id: 'prima-2026-2', descripcion: 'Prima 2° Semestre 2026', anio: 2026, semestre: '2°', fechaInicio: '2026-07-01', fechaFin: '2026-12-31', fechaLimite: '2026-12-20', estado: 'BORRADOR' },
  'prima-2026-1': { id: 'prima-2026-1', descripcion: 'Prima 1° Semestre 2026', anio: 2026, semestre: '1°', fechaInicio: '2026-01-01', fechaFin: '2026-06-30', fechaLimite: '2026-06-30', estado: 'CERRADA', fechaPago: '2026-06-28' },
  'prima-2025-2': { id: 'prima-2025-2', descripcion: 'Prima 2° Semestre 2025', anio: 2025, semestre: '2°', fechaInicio: '2025-07-01', fechaFin: '2025-12-31', fechaLimite: '2025-12-20', estado: 'CERRADA', fechaPago: '2025-12-18' },
  'prima-2025-1': { id: 'prima-2025-1', descripcion: 'Prima 1° Semestre 2025', anio: 2025, semestre: '1°', fechaInicio: '2025-01-01', fechaFin: '2025-06-30', fechaLimite: '2025-06-30', estado: 'CERRADA', fechaPago: '2025-06-27' },
  // aliases for backward compat
  'pri-2026-1': { id: 'pri-2026-1', descripcion: 'Prima 1° semestre 2026', anio: 2026, semestre: '1°', fechaInicio: '2026-01-01', fechaFin: '2026-06-30', fechaLimite: '2026-06-30', estado: 'BORRADOR' },
  'pri-2025-2': { id: 'pri-2025-2', descripcion: 'Prima 2° semestre 2025', anio: 2025, semestre: '2°', fechaInicio: '2025-07-01', fechaFin: '2025-12-31', fechaLimite: '2025-12-20', estado: 'CERRADA', fechaPago: '2025-12-18' },
};

const colaboradoresMock = [
  { id: 'c1', nombre: 'Carlos Martínez', cedula: '1.012.345.678', cargo: 'Operario de Cosecha', salarioPromedio: 1750905, auxilioTransporte: 249095, diasLaborados: 180 },
  { id: 'c2', nombre: 'Ana Gómez',       cedula: '52.341.567.890', cargo: 'Supervisora',         salarioPromedio: 2500000, auxilioTransporte: 0,      diasLaborados: 180 },
  { id: 'c3', nombre: 'Luis Pérez',       cedula: '1.098.765.432', cargo: 'Podador',             salarioPromedio: 1750905, auxilioTransporte: 249095, diasLaborados: 150 },
  { id: 'c4', nombre: 'María Torres',     cedula: '43.765.432.100', cargo: 'Almacenista',         salarioPromedio: 1900000, auxilioTransporte: 249095, diasLaborados: 180 },
  { id: 'c5', nombre: 'Jorge Ramírez',    cedula: '1.123.456.789', cargo: 'Operario de Poda',    salarioPromedio: 1750905, auxilioTransporte: 249095, diasLaborados: 165 },
];

const calcPrima = (s: number, a: number, d: number) => Math.round(((s + a) * d) / 360);

const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ── Step indicator ─────────────────────────────────────────────────────────────
const pasos = [
  { numero: 1, titulo: 'Información del Período', icono: Calendar },
  { numero: 2, titulo: 'Seleccionar Colaboradores', icono: Users },
  { numero: 3, titulo: 'Confirmación', icono: Check },
];

// ── Vista de período CERRADO ──────────────────────────────────────────────────
function VistaCerrada({ periodo }: { periodo: typeof periodosMock[string] }) {

  const total = colaboradoresMock.reduce((s, col) =>
    s + calcPrima(col.salarioPromedio, col.auxilioTransporte, col.diasLaborados), 0);

  const descargarPDF = () => {
    const doc = new jsPDF();
    const verde: [number, number, number] = [30, 86, 49];

    doc.setFillColor(...verde);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SOPORTE DE LIQUIDACIÓN DE PRIMA DE SERVICIOS', 105, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 20, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PERÍODO', 14, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const infoY = 42;
    doc.text(`Descripción: ${periodo.descripcion}`, 14, infoY);
    doc.text(`Semestre: ${periodo.semestre} semestre ${periodo.anio}`, 14, infoY + 6);
    doc.text(`Período: ${new Date(periodo.fechaInicio).toLocaleDateString('es-CO')} al ${new Date(periodo.fechaFin).toLocaleDateString('es-CO')}`, 14, infoY + 12);
    doc.text(`Fecha límite de pago: ${new Date(periodo.fechaLimite).toLocaleDateString('es-CO')}`, 14, infoY + 18);
    if (periodo.fechaPago) doc.text(`Fecha de pago: ${new Date(periodo.fechaPago).toLocaleDateString('es-CO')}`, 14, infoY + 24);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE POR COLABORADOR', 14, infoY + 34);

    autoTable(doc, {
      startY: infoY + 38,
      head: [['Colaborador', 'Cédula', 'Cargo', 'Sal. Promedio', 'Aux. Transp.', 'Días', 'Prima']],
      body: colaboradoresMock.map(col => {
        const monto = calcPrima(col.salarioPromedio, col.auxilioTransporte, col.diasLaborados);
        return [
          col.nombre, col.cedula, col.cargo,
          formatearMoneda(col.salarioPromedio),
          col.auxilioTransporte > 0 ? formatearMoneda(col.auxilioTransporte) : '$0',
          col.diasLaborados,
          formatearMoneda(monto),
        ];
      }),
      foot: [['', '', '', '', '', 'TOTAL PRIMA', formatearMoneda(total)]],
      headStyles: { fillColor: verde, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: verde, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 247] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Marco Legal: Art. 306 CST — La prima se paga el 30 de junio y el 20 de diciembre de cada año.', 14, finalY);
    const firmaY = finalY + 20;
    doc.setFont('helvetica', 'normal');
    doc.line(14, firmaY, 90, firmaY);
    doc.line(120, firmaY, 196, firmaY);
    doc.setFontSize(9);
    doc.text('Firma del Empleador', 52, firmaY + 5, { align: 'center' });
    doc.text('Firma del Contador / Revisor', 158, firmaY + 5, { align: 'center' });

    doc.save(`Soporte_Prima_${periodo.semestre.replace('°', '')}_Sem_${periodo.anio}.pdf`);
    toast.success('Soporte descargado correctamente');
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
          <p className="text-muted-foreground mt-1">{periodo.semestre} semestre · Prima de servicios (Art. 306 CST)</p>
        </div>
        <Badge className="bg-success/10 text-success border border-success/30 text-sm px-3 py-1 shrink-0">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Liquidado
        </Badge>
      </div>

      <Card className="border-border">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Período</p>
              <p className="text-sm font-medium">{new Date(periodo.fechaInicio).toLocaleDateString('es-CO')} – {new Date(periodo.fechaFin).toLocaleDateString('es-CO')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Semestre</p>
              <p className="text-sm font-medium">{periodo.semestre} semestre {periodo.anio}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Fecha límite</p>
              <p className="text-sm font-medium">{new Date(periodo.fechaLimite).toLocaleDateString('es-CO')}</p>
            </div>
            {periodo.fechaPago && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Pagado el</p>
                <p className="text-sm font-semibold text-success">{new Date(periodo.fechaPago).toLocaleDateString('es-CO')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />Imprimir
        </Button>
        <Button onClick={descargarPDF} className="gap-2">
          <Download className="h-4 w-4" />Descargar Soporte PDF
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Detalle por Colaborador</h2>
          <p className="text-sm text-muted-foreground">{colaboradoresMock.length} colaboradores liquidados</p>
        </div>
        {colaboradoresMock.map((col) => {
          const baseTotal = col.salarioPromedio + col.auxilioTransporte;
          const monto = calcPrima(col.salarioPromedio, col.auxilioTransporte, col.diasLaborados);
          return (
            <Card key={col.id} className="border-border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {getIniciales(col.nombre)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{col.nombre}</p>
                  <p className="text-xs text-muted-foreground">{col.cargo}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Semestre</p>
                  <p className="text-sm font-medium">{periodo.semestre} · {periodo.anio}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
                <div className="px-5 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Cédula</p>
                  <p className="text-sm font-medium">{col.cedula}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Días Laborados</p>
                  <p className="text-sm font-medium">{col.diasLaborados}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Período</p>
                  <p className="text-sm font-medium">{new Date(periodo.fechaInicio).toLocaleDateString('es-CO', {month:'short'})} – {new Date(periodo.fechaFin).toLocaleDateString('es-CO', {month:'short', year:'numeric'})}</p>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="bg-primary/5 border-b border-primary/10">
                  <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Base de Cálculo</span>
                  </div>
                  <div className="px-5 pb-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Salario Promedio</span>
                      <span className="text-sm font-medium">{formatearMoneda(col.salarioPromedio)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Auxilio de Transporte</span>
                      <span className="text-sm font-medium">{col.auxilioTransporte > 0 ? formatearMoneda(col.auxilioTransporte) : <span className="text-muted-foreground">$0</span>}</span>
                    </div>
                  </div>
                  <div className="mx-5 my-3 border-t border-primary/20" />
                  <div className="flex justify-between items-center px-5 pb-4">
                    <span className="text-xs uppercase tracking-wide font-bold text-primary">Total Base</span>
                    <span className="text-sm font-bold text-primary">{formatearMoneda(baseTotal)}</span>
                  </div>
                </div>
                <div className="px-5 pt-4 pb-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días Laborados</span>
                    <span className="text-sm font-medium">{col.diasLaborados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fórmula</span>
                    <span className="text-xs text-muted-foreground">(Base × Días) ÷ 360</span>
                  </div>
                </div>
                <div className="mx-5 border-t-2 border-primary/20" />
                <div className="flex justify-between items-center px-5 py-4">
                  <span className="text-sm uppercase tracking-wide font-bold">Total Prima</span>
                  <span className="text-xl font-bold text-primary">{formatearMoneda(monto)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-5 rounded-xl border border-success/20 bg-success/5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total colaboradores</p>
          <p className="font-bold text-lg">{colaboradoresMock.length}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total prima pagada</p>
          <p className="font-bold text-2xl text-success">{formatearMoneda(total)}</p>
        </div>
      </div>
    </div>
  );
}

function StepBar({ actual }: { actual: number }) {
  return (
    <div className="flex items-center gap-0">
      {pasos.map((paso, idx) => {
        const completado = actual > paso.numero;
        const activo = actual === paso.numero;
        const Icono = paso.icono;
        return (
          <div key={paso.numero} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-colors ${completado ? 'bg-primary border-primary' : activo ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
                {completado ? <Check className="h-5 w-5 text-white" /> : <Icono className={`h-5 w-5 ${activo ? 'text-primary' : 'text-muted-foreground'}`} />}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${activo || completado ? 'text-primary' : 'text-muted-foreground'}`}>Paso {paso.numero}</p>
                <p className={`text-xs hidden sm:block ${activo ? 'text-foreground' : 'text-muted-foreground'}`}>{paso.titulo}</p>
              </div>
            </div>
            {idx < pasos.length - 1 && <div className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${actual > paso.numero ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function PrimaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const periodo = periodosMock[id ?? 'prima-2026-2'] ?? periodosMock['prima-2026-2'];

  // Los hooks van antes de cualquier return: al navegar entre un período
  // cerrado y uno en borrador el orden debe mantenerse.
  const [paso, setPaso] = useState(1);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const toggleCol = (cid: string) =>
    setSeleccionados(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]);

  const toggleTodos = () =>
    setSeleccionados(seleccionados.length === colaboradoresMock.length ? [] : colaboradoresMock.map(c => c.id));

  const getMonto = (cid: string) => {
    const col = colaboradoresMock.find(c => c.id === cid)!;
    return calcPrima(col.salarioPromedio, col.auxilioTransporte, col.diasLaborados);
  };

  const totalGeneral = seleccionados.reduce((s, cid) => s + getMonto(cid), 0);

  const avanzar = () => {
    if (paso === 2 && seleccionados.length === 0) { toast.error('Selecciona al menos un colaborador'); return; }
    setPaso(p => p + 1);
  };

  const confirmar = () => {
    toast.success('Liquidación de prima confirmada exitosamente');
    navigate('/liquidaciones');
  };

  if (periodo.estado === 'CERRADA') return <VistaCerrada periodo={periodo} />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
        <p className="text-muted-foreground mt-1">{periodo.semestre} semestre · Límite: {new Date(periodo.fechaLimite).toLocaleDateString('es-CO')}</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6"><StepBar actual={paso} /></CardContent>
      </Card>

      {/* PASO 1 */}
      {paso === 1 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Gift className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold text-lg">Información del Período</h2><p className="text-sm text-muted-foreground">Revisa los datos antes de continuar</p></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label>Año</Label><Input value={periodo.anio} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Semestre</Label><Input value={`${periodo.semestre} semestre`} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Fecha inicio</Label><Input type="date" value={periodo.fechaInicio} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Fecha fin</Label><Input type="date" value={periodo.fechaFin} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Descripción</Label><Input value={periodo.descripcion} disabled className="bg-muted/30" /></div>
            </div>
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-foreground">
              Fecha límite de pago: <strong>{new Date(periodo.fechaLimite).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. La prima debe pagarse en las fechas establecidas por ley (Art. 306 CST).
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                <div><h2 className="font-semibold text-lg">Seleccionar Personal</h2><p className="text-sm text-muted-foreground">Agrega los colaboradores a este período de prima</p></div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTodos} className="gap-2">
                <Users className="h-4 w-4" />{seleccionados.length === colaboradoresMock.length ? 'Quitar Todos' : 'Agregar Todos'}
              </Button>
            </div>
            {seleccionados.length > 0 && (
              <div className="text-sm text-primary font-medium">
                {seleccionados.length} colaborador{seleccionados.length !== 1 ? 'es' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 p-4"><Checkbox checked={seleccionados.length === colaboradoresMock.length} onCheckedChange={toggleTodos} /></th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cargo</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salario Base</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradoresMock.map((col, i) => {
                    const sel = seleccionados.includes(col.id);
                    return (
                      <tr key={col.id} onClick={() => toggleCol(col.id)}
                        className={`border-b border-border last:border-0 cursor-pointer transition-colors ${sel ? 'bg-primary/5' : i % 2 === 0 ? 'bg-background hover:bg-muted/20' : 'bg-muted/5 hover:bg-muted/20'}`}>
                        <td className="p-4"><Checkbox checked={sel} onCheckedChange={() => toggleCol(col.id)} onClick={e => e.stopPropagation()} /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border ${sel ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/20'}`}>{getIniciales(col.nombre)}</div>
                            <span className="font-medium text-sm">{col.nombre}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{col.cargo}</td>
                        <td className="p-4 text-right font-semibold text-sm">{formatearMoneda(col.salarioPromedio)}</td>
                        <td className="p-4 text-right text-sm text-muted-foreground">{col.diasLaborados}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 3: Confirmación */}
      {paso === 3 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Confirmación</h2>
              <p className="text-sm text-muted-foreground">Desprendibles de liquidación de prima — {seleccionados.length} colaborador{seleccionados.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          {/* Per-collaborator desprendibles */}
          {seleccionados.map((cid) => {
            const col = colaboradoresMock.find(c => c.id === cid)!;
            const baseTotal = col.salarioPromedio + col.auxilioTransporte;
            const monto = getMonto(cid);
            return (
              <Card key={cid} className="border-border overflow-hidden">
                {/* Desprendible header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {getIniciales(col.nombre)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{col.nombre}</p>
                    <p className="text-xs text-muted-foreground">{col.cargo}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">Semestre</p>
                    <p className="text-sm font-medium">{periodo.semestre} · {periodo.anio}</p>
                  </div>
                </div>

                {/* Info bar */}
                <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Cédula</p>
                    <p className="text-sm font-medium">{col.cedula}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Días Laborados</p>
                    <p className="text-sm font-medium">{col.diasLaborados}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Período</p>
                    <p className="text-sm font-medium">{periodo.fechaInicio} – {periodo.fechaFin}</p>
                  </div>
                </div>

                <CardContent className="p-0">
                  {/* Base de Cálculo */}
                  <div className="bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Base de Cálculo</span>
                    </div>
                    <div className="px-5 pb-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Salario Promedio</span>
                        <span className="text-sm font-medium">{formatearMoneda(col.salarioPromedio)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Auxilio de Transporte</span>
                        <span className="text-sm font-medium">{col.auxilioTransporte > 0 ? formatearMoneda(col.auxilioTransporte) : <span className="text-muted-foreground">$0</span>}</span>
                      </div>
                    </div>
                    <div className="mx-5 my-3 border-t border-primary/20" />
                    <div className="flex justify-between items-center px-5 pb-4">
                      <span className="text-xs uppercase tracking-wide font-bold text-primary">Total Base</span>
                      <span className="text-sm font-bold text-primary">{formatearMoneda(baseTotal)}</span>
                    </div>
                  </div>

                  {/* Liquidación */}
                  <div className="px-5 pt-4 pb-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días Laborados</span>
                      <span className="text-sm font-medium">{col.diasLaborados}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fórmula</span>
                      <span className="text-xs text-muted-foreground">(Base × Días) ÷ 360</span>
                    </div>
                  </div>
                  <div className="mx-5 border-t-2 border-primary/20" />
                  <div className="flex justify-between items-center px-5 py-4">
                    <span className="text-sm uppercase tracking-wide font-bold">Total Prima</span>
                    <span className="text-xl font-bold text-primary">{formatearMoneda(monto)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Total resumen */}
          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Colaboradores liquidados</p>
              <p className="font-bold text-lg">{seleccionados.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total prima a pagar</p>
              <p className="font-bold text-2xl text-primary">{formatearMoneda(totalGeneral)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={paso === 1 ? () => navigate('/liquidaciones') : () => setPaso(p => p - 1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < 3 ? (
          <Button onClick={avanzar} className="gap-2">Siguiente<ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={confirmar} className="gap-2 bg-success hover:bg-success/90"><Check className="h-4 w-4" />Confirmar Liquidación</Button>
        )}
      </div>
    </div>
  );
}
