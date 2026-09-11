import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  ArrowLeft, ArrowRight, Check, Users, Calendar,
  Percent, CheckCircle, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatearMoneda, TASA_INTERESES_CESANTIAS } from '../../lib/liquidaciones/calculoUtils';

// ── Mock ──────────────────────────────────────────────────────────────────────
const periodosMock: Record<string, { id: string; descripcion: string; anio: number; tasa: number; fechaInicio: string; fechaFin: string; fechaLimite: string }> = {
  'int-2026': { id: 'int-2026', descripcion: 'Intereses de Cesantías 2026', anio: 2026, tasa: 12, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', fechaLimite: '2027-01-31' },
  'int-2025': { id: 'int-2025', descripcion: 'Intereses de Cesantías 2025', anio: 2025, tasa: 12, fechaInicio: '2025-01-01', fechaFin: '2025-12-31', fechaLimite: '2026-01-31' },
};

const colaboradoresMock = [
  { id: 'c1', nombre: 'Carlos Martínez', cedula: '1.012.345.678', cargo: 'Operario de Cosecha', saldoCesantias: 1800000, diasLaborados: 360, fondo: 'Porvenir' },
  { id: 'c2', nombre: 'Ana Gómez',       cedula: '52.341.567.890', cargo: 'Supervisora',         saldoCesantias: 2300000, diasLaborados: 360, fondo: 'Protección' },
  { id: 'c3', nombre: 'Luis Pérez',       cedula: '1.098.765.432', cargo: 'Podador',             saldoCesantias: 1650000, diasLaborados: 300, fondo: 'Porvenir' },
  { id: 'c4', nombre: 'María Torres',     cedula: '43.765.432.100', cargo: 'Almacenista',         saldoCesantias: 1950000, diasLaborados: 360, fondo: 'Colfondos' },
  { id: 'c5', nombre: 'Jorge Ramírez',    cedula: '1.123.456.789', cargo: 'Operario de Poda',    saldoCesantias: 1720000, diasLaborados: 330, fondo: 'Porvenir' },
];

const calcIntereses = (saldo: number, dias: number) =>
  Math.round((saldo * TASA_INTERESES_CESANTIAS * dias) / 360);

const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ── Step indicator ─────────────────────────────────────────────────────────────
const pasos = [
  { numero: 1, titulo: 'Información del Período', icono: Calendar },
  { numero: 2, titulo: 'Seleccionar Colaboradores', icono: Users },
  { numero: 3, titulo: 'Confirmación', icono: Check },
];

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

export default function InteresesDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const periodo = periodosMock[id ?? 'int-2026'] ?? periodosMock['int-2026'];
  const [paso, setPaso] = useState(1);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const toggleCol = (cid: string) =>
    setSeleccionados(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]);

  const toggleTodos = () =>
    setSeleccionados(seleccionados.length === colaboradoresMock.length ? [] : colaboradoresMock.map(c => c.id));

  const getMonto = (cid: string) => {
    const col = colaboradoresMock.find(c => c.id === cid)!;
    return calcIntereses(col.saldoCesantias, col.diasLaborados);
  };

  const totalGeneral = seleccionados.reduce((s, cid) => s + getMonto(cid), 0);

  const avanzar = () => {
    if (paso === 2 && seleccionados.length === 0) { toast.error('Selecciona al menos un colaborador'); return; }
    setPaso(p => p + 1);
  };

  const confirmar = () => {
    toast.success('Liquidación de intereses confirmada exitosamente');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">{periodo.descripcion}</h1>
        <p className="text-muted-foreground mt-1">Intereses sobre cesantías · Tasa: {periodo.tasa}% anual (Ley 52/75) · Límite: {new Date(periodo.fechaLimite).toLocaleDateString('es-CO')}</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6"><StepBar actual={paso} /></CardContent>
      </Card>

      {/* PASO 1 */}
      {paso === 1 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Percent className="h-5 w-5 text-primary" /></div>
              <div><h2 className="font-semibold text-lg">Información del Período</h2><p className="text-sm text-muted-foreground">Revisa los datos antes de continuar</p></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label>Año</Label><Input value={periodo.anio} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Input value={periodo.descripcion} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Fecha inicio</Label><Input type="date" value={periodo.fechaInicio} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Fecha fin</Label><Input type="date" value={periodo.fechaFin} disabled className="bg-muted/30" /></div>
              <div className="space-y-1.5"><Label>Tasa de interés</Label><Input value={`${periodo.tasa}% anual (Ley 52 de 1975 - fija por ley)`} disabled className="bg-muted/30" /></div>
            </div>
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 text-sm text-orange-800">
              Fecha límite de pago: <strong>{new Date(periodo.fechaLimite).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Los intereses no pagados a tiempo generan sanción de mora.
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
                <div><h2 className="font-semibold text-lg">Seleccionar Personal</h2><p className="text-sm text-muted-foreground">Agrega los colaboradores a este período de intereses</p></div>
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
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fondo</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo Cesantías</th>
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
                        <td className="p-4 text-sm text-muted-foreground">{col.fondo}</td>
                        <td className="p-4 text-right font-semibold text-sm">{formatearMoneda(col.saldoCesantias)}</td>
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
              <p className="text-sm text-muted-foreground">Desprendibles de liquidación de intereses — {seleccionados.length} colaborador{seleccionados.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          {/* Per-collaborator desprendibles */}
          {seleccionados.map((cid) => {
            const col = colaboradoresMock.find(c => c.id === cid)!;
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
                    <p className="text-xs text-muted-foreground">Fondo</p>
                    <p className="text-sm font-medium">{col.fondo}</p>
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
                    <p className="text-sm font-medium">{periodo.anio}</p>
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
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Saldo Cesantías</span>
                        <span className="text-sm font-medium">{formatearMoneda(col.saldoCesantias)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Tasa de Interés</span>
                        <span className="text-sm font-medium">12% anual <span className="text-muted-foreground text-xs">(Ley 52/75)</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días Laborados</span>
                        <span className="text-sm font-medium">{col.diasLaborados}</span>
                      </div>
                    </div>
                    <div className="mx-5 my-3 border-t border-primary/20" />
                    <div className="flex justify-between items-center px-5 pb-4">
                      <span className="text-xs uppercase tracking-wide font-bold text-primary">Fórmula</span>
                      <span className="text-xs text-primary">(Saldo × 12% × Días) ÷ 360</span>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="mx-5 mt-4 border-t-2 border-primary/20" />
                  <div className="flex justify-between items-center px-5 py-4">
                    <span className="text-sm uppercase tracking-wide font-bold">Total Intereses</span>
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
              <p className="text-sm text-muted-foreground">Total intereses a pagar</p>
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
