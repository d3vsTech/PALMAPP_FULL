import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  ArrowLeft, ArrowRight, Check, Users, Calendar,
  Plane, CheckCircle, TrendingUp, AlertCircle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatearMoneda } from '../../lib/liquidaciones/calculoUtils';

// ── Mock ──────────────────────────────────────────────────────────────────────
const colaboradoresMock = [
  { id: 'c1', nombre: 'Carlos Martínez', cedula: '1.012.345.678', cargo: 'Operario de Cosecha', salarioPromedio: 1750905, auxilioTransporte: 249095, diasDisponibles: 15 },
  { id: 'c2', nombre: 'Ana Gómez',       cedula: '52.341.567.890', cargo: 'Supervisora',          salarioPromedio: 2500000, auxilioTransporte: 0,      diasDisponibles: 22 },
  { id: 'c3', nombre: 'Luis Pérez',       cedula: '1.098.765.432', cargo: 'Podador',              salarioPromedio: 1750905, auxilioTransporte: 249095, diasDisponibles: 12 },
  { id: 'c4', nombre: 'María Torres',     cedula: '43.765.432.100', cargo: 'Almacenista',          salarioPromedio: 1900000, auxilioTransporte: 249095, diasDisponibles: 30 },
  { id: 'c5', nombre: 'Jorge Ramírez',    cedula: '1.123.456.789', cargo: 'Operario de Poda',     salarioPromedio: 1750905, auxilioTransporte: 249095, diasDisponibles: 8  },
];

type DatosVac = { diasDisfrute: number; diasDinero: number };

const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

const calcValorDia = (salario: number) => Math.round(salario / 30);

const validarDatos = (col: typeof colaboradoresMock[0], d: DatosVac) => {
  if (d.diasDisfrute < 1) return 'sinDisfrute';
  if (d.diasDinero > d.diasDisfrute) return 'dineroSuperior';
  if (d.diasDisfrute + d.diasDinero > col.diasDisponibles) return 'superaDisponibles';
  return 'ok';
};

// ── Stepper (modo batch) ───────────────────────────────────────────────────────
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

// ── Modo individual (viene de "Liquidar" en VacacionesTab) ────────────────────
function LiquidacionIndividual({ col }: { col: typeof colaboradoresMock[0] }) {
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasDisfrute, setDiasDisfrute] = useState(0);
  const [diasDinero, setDiasDinero] = useState(0);

  const estado = validarDatos(col, { diasDisfrute, diasDinero });
  const valorDia = calcValorDia(col.salarioPromedio);
  const valorDisfrute = valorDia * diasDisfrute;
  const valorDinero = valorDia * diasDinero;
  const total = valorDisfrute + valorDinero;

  const confirmar = () => {
    if (!fechaInicio) { toast.error('Ingresa la fecha de inicio de vacaciones'); return; }
    if (estado !== 'ok') { toast.error('Corrige los errores antes de confirmar'); return; }
    toast.success('Liquidación de vacaciones confirmada exitosamente');
    navigate('/liquidaciones');
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">Liquidación de Vacaciones</h1>
        <p className="text-muted-foreground mt-1">Registra los días de disfrute y compensación en dinero</p>
      </div>

      {/* Tarjeta colaborador */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
              {getIniciales(col.nombre)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-base">{col.nombre}</p>
              <p className="text-sm text-muted-foreground">{col.cargo} · CC {col.cedula}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Días disponibles</p>
              <p className="text-2xl font-bold text-primary">{col.diasDisponibles}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border mt-4 pt-4">
            <div className="pr-4">
              <p className="text-xs text-muted-foreground">Salario promedio</p>
              <p className="font-semibold text-foreground">{formatearMoneda(col.salarioPromedio)}</p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-muted-foreground">Valor día</p>
              <p className="font-semibold text-foreground">{formatearMoneda(valorDia)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Días de Vacaciones</h2>
              <p className="text-sm text-muted-foreground">Ingresa la fecha de inicio y los días a liquidar</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha inicio de vacaciones</Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label>
                <span className="text-success font-semibold">Días de disfrute</span>
                <span className="text-xs text-muted-foreground ml-2">(descanso efectivo)</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={col.diasDisponibles}
                value={diasDisfrute || ''}
                onChange={e => setDiasDisfrute(Math.max(0, Math.min(parseInt(e.target.value) || 0, col.diasDisponibles)))}
                placeholder="0"
                className={estado === 'sinDisfrute' ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="text-amber-600 font-semibold">Días en dinero</span>
                <span className="text-xs text-muted-foreground ml-2">(compensación — opcional)</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={diasDisfrute}
                value={diasDinero || ''}
                onChange={e => setDiasDinero(Math.max(0, Math.min(parseInt(e.target.value) || 0, col.diasDisponibles)))}
                placeholder="0"
                className={estado === 'dineroSuperior' ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
          </div>

          {/* Barra de uso */}
          {diasDisfrute > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Días a usar: {diasDisfrute + diasDinero} de {col.diasDisponibles}</span>
                <span className={diasDisfrute + diasDinero > col.diasDisponibles ? 'text-destructive font-semibold' : ''}>
                  {Math.round(((diasDisfrute + diasDinero) / col.diasDisponibles) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${(diasDisfrute + diasDinero) > col.diasDisponibles ? 'bg-destructive' : (diasDisfrute + diasDinero) / col.diasDisponibles > 0.75 ? 'bg-amber-500' : 'bg-success'}`}
                  style={{ width: `${Math.min(((diasDisfrute + diasDinero) / col.diasDisponibles) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Mensajes de error */}
          {estado !== 'ok' && diasDisfrute > 0 && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${estado === 'dineroSuperior' || estado === 'superaDisponibles' ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'}`}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {estado === 'dineroSuperior' && `Los días en dinero (${diasDinero}) no pueden superar los días de disfrute (${diasDisfrute}).`}
              {estado === 'superaDisponibles' && `El total (${diasDisfrute + diasDinero} días) supera los días disponibles (${col.diasDisponibles}).`}
            </div>
          )}

          {/* Info legal */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex gap-3 text-sm">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Art. 189 CST:</strong> Los días compensados en dinero no pueden superar los días de disfrute efectivo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Liquidación calculada */}
      {diasDisfrute > 0 && estado === 'ok' && (
        <Card className="border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <p className="font-semibold text-sm">Resumen de liquidación</p>
          </div>
          <CardContent className="p-0">
            {/* Disfrute */}
            <div className="bg-success/5 border-b border-success/10">
              <div className="flex justify-between items-center px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-success">Días de disfrute</p>
                  <p className="text-xs text-muted-foreground">{diasDisfrute} días × {formatearMoneda(valorDia)}</p>
                </div>
                <p className="font-bold text-success">{formatearMoneda(valorDisfrute)}</p>
              </div>
            </div>

            {/* Dinero (si aplica) */}
            {diasDinero > 0 && (
              <div className="bg-amber-50/60 border-b border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/20">
                <div className="flex justify-between items-center px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Días en dinero</p>
                    <p className="text-xs text-muted-foreground">{diasDinero} días × {formatearMoneda(valorDia)}</p>
                  </div>
                  <p className="font-bold text-amber-700 dark:text-amber-400">{formatearMoneda(valorDinero)}</p>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center px-5 py-4">
              <div>
                <p className="font-bold text-base">Total a pagar</p>
                <p className="text-xs text-muted-foreground">{diasDisfrute + diasDinero} días totales</p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatearMoneda(total)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex justify-between">
        <Button variant="outline" asChild className="gap-2">
          <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Cancelar</Link>
        </Button>
        <Button
          onClick={confirmar}
          disabled={estado !== 'ok' || !fechaInicio}
          className="gap-2 bg-success hover:bg-success/90"
        >
          <Check className="h-4 w-4" />Confirmar Liquidación
        </Button>
      </div>
    </div>
  );
}

// ── Modo batch: wizard 3 pasos (componente independiente) ────────────────────
function BatchWizard() {
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1);

  // Paso 1: datos del período
  const [periodoNombre, setPeriodoNombre] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');

  // Paso 2: colaboradores y sus días
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [datosVac, setDatosVac] = useState<Record<string, DatosVac>>({});

  const toggleCol = (cid: string) => {
    setSeleccionados(prev =>
      prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]
    );
    if (!datosVac[cid]) {
      setDatosVac(prev => ({ ...prev, [cid]: { diasDisfrute: 0, diasDinero: 0 } }));
    }
  };

  const toggleTodos = () => {
    if (seleccionados.length === colaboradoresMock.length) {
      setSeleccionados([]);
    } else {
      const todos = colaboradoresMock.map(c => c.id);
      setSeleccionados(todos);
      const init: Record<string, DatosVac> = {};
      todos.forEach(id => { if (!datosVac[id]) init[id] = { diasDisfrute: 0, diasDinero: 0 }; });
      setDatosVac(prev => ({ ...prev, ...init }));
    }
  };

  const setDias = (cid: string, campo: keyof DatosVac, valor: number) => {
    const col = colaboradoresMock.find(c => c.id === cid)!;
    const prev = datosVac[cid] || { diasDisfrute: 0, diasDinero: 0 };
    const next = { ...prev, [campo]: Math.max(0, Math.min(valor, col.diasDisponibles)) };
    setDatosVac(p => ({ ...p, [cid]: next }));
  };

  const getDatos = (cid: string): DatosVac =>
    datosVac[cid] || { diasDisfrute: 0, diasDinero: 0 };

  const todosValidos = seleccionados.length > 0 &&
    seleccionados.every(cid => {
      const col = colaboradoresMock.find(c => c.id === cid)!;
      return validarDatos(col, getDatos(cid)) === 'ok';
    });

  const avanzar = () => {
    if (paso === 1) {
      if (!periodoNombre.trim()) { toast.error('Ingresa un nombre para el período'); return; }
      if (!periodoInicio || !periodoFin) { toast.error('Define las fechas del período'); return; }
      if (periodoFin < periodoInicio) { toast.error('La fecha fin debe ser posterior a la fecha inicio'); return; }
    }
    if (paso === 2) {
      if (seleccionados.length === 0) { toast.error('Selecciona al menos un colaborador'); return; }
      if (!todosValidos) { toast.error('Corrige los errores en los días antes de continuar'); return; }
    }
    setPaso(p => p + 1);
  };

  const confirmar = () => {
    toast.success('Liquidación de vacaciones confirmada exitosamente');
    navigate('/liquidaciones');
  };

  const totalGeneral = seleccionados.reduce((sum, cid) => {
    const col = colaboradoresMock.find(c => c.id === cid)!;
    const d = getDatos(cid);
    const vd = calcValorDia(col.salarioPromedio);
    return sum + vd * (d.diasDisfrute + d.diasDinero);
  }, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/liquidaciones"><ArrowLeft className="h-4 w-4" />Volver a Liquidaciones</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-primary">Nueva Liquidación de Vacaciones</h1>
        <p className="text-muted-foreground mt-1">Registra disfrute de vacaciones y días compensados en dinero</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6"><StepBar actual={paso} /></CardContent>
      </Card>

      {/* ── PASO 1 ── */}
      {paso === 1 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Información del Período</h2>
                <p className="text-sm text-muted-foreground">Define el período de vacaciones a liquidar</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nombre del período</Label>
              <Input
                placeholder="Ej: Vacaciones 1er semestre 2026"
                value={periodoNombre}
                onChange={e => setPeriodoNombre(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input type="date" value={periodoFin} onChange={e => setPeriodoFin(e.target.value)} />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex gap-3 text-sm">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-foreground space-y-1">
                <p className="font-semibold">Art. 186 & 189 CST — Dos tipos de vacaciones</p>
                <p className="text-muted-foreground"><strong className="text-foreground">Días de disfrute:</strong> el trabajador descansa físicamente (obligatorio).</p>
                <p className="text-muted-foreground"><strong className="text-foreground">Días en dinero:</strong> se compensan en efectivo, pero no pueden superar los días de disfrute.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── PASO 2 ── */}
      {paso === 2 && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Seleccionar Personal</h2>
                  <p className="text-sm text-muted-foreground">Registra los días de disfrute y días en dinero por colaborador</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTodos} className="gap-2">
                <Users className="h-4 w-4" />
                {seleccionados.length === colaboradoresMock.length ? 'Quitar Todos' : 'Agregar Todos'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/20 rounded-lg px-4 py-3 border border-border">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary/60 inline-block" />Días disponibles: causados y no usados</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success inline-block" />Disfrute: días de descanso efectivo</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />Dinero: compensación en efectivo (≤ disfrute)</span>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 p-4">
                      <Checkbox checked={seleccionados.length === colaboradoresMock.length} onCheckedChange={toggleTodos} />
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaborador</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días Disponibles</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="text-success">Días Disfrute</span>
                    </th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <span className="text-amber-600">Días Dinero</span>
                    </th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usados</th>
                    <th className="w-8 p-4" />
                  </tr>
                </thead>
                <tbody>
                  {colaboradoresMock.map((col, i) => {
                    const sel = seleccionados.includes(col.id);
                    const d = getDatos(col.id);
                    const estado = sel ? validarDatos(col, d) : 'idle';
                    const totalUsados = d.diasDisfrute + d.diasDinero;
                    const pctUsado = col.diasDisponibles > 0 ? (totalUsados / col.diasDisponibles) * 100 : 0;

                    return (
                      <tr
                        key={col.id}
                        className={`border-b border-border last:border-0 transition-colors ${sel ? 'bg-primary/5' : i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                      >
                        <td className="p-4">
                          <Checkbox checked={sel} onCheckedChange={() => toggleCol(col.id)} />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${sel ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/20'}`}>
                              {getIniciales(col.nombre)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{col.nombre}</p>
                              <p className="text-xs text-muted-foreground">{col.cargo}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center h-8 w-12 rounded-lg text-sm font-bold ${col.diasDisponibles >= 15 ? 'bg-primary/10 text-primary' : col.diasDisponibles >= 8 ? 'bg-amber-50 text-amber-700' : 'bg-destructive/10 text-destructive'}`}>
                            {col.diasDisponibles}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <Input
                            type="number" min={0} max={col.diasDisponibles} disabled={!sel}
                            value={sel ? d.diasDisfrute : ''}
                            onChange={e => setDias(col.id, 'diasDisfrute', parseInt(e.target.value) || 0)}
                            className={`w-20 mx-auto text-center h-8 text-sm ${!sel ? 'opacity-40' : estado === 'sinDisfrute' ? 'border-amber-400 focus-visible:ring-amber-400' : 'border-success/50 focus-visible:ring-success/50'}`}
                            placeholder="0"
                          />
                        </td>

                        <td className="p-4 text-center">
                          <Input
                            type="number" min={0} max={col.diasDisponibles} disabled={!sel}
                            value={sel ? d.diasDinero : ''}
                            onChange={e => setDias(col.id, 'diasDinero', parseInt(e.target.value) || 0)}
                            className={`w-20 mx-auto text-center h-8 text-sm ${!sel ? 'opacity-40' : estado === 'dineroSuperior' ? 'border-destructive focus-visible:ring-destructive' : 'border-amber-400/50 focus-visible:ring-amber-400/50'}`}
                            placeholder="0"
                          />
                        </td>

                        <td className="p-4 text-center">
                          {sel ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-semibold ${estado === 'superaDisponibles' ? 'text-destructive' : 'text-foreground'}`}>
                                {totalUsados}/{col.diasDisponibles}
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pctUsado > 100 ? 'bg-destructive' : pctUsado > 75 ? 'bg-amber-500' : 'bg-success'}`}
                                  style={{ width: `${Math.min(pctUsado, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="pr-4 text-center">
                          {sel && estado === 'ok' && <CheckCircle className="h-4 w-4 text-success" />}
                          {sel && estado !== 'ok' && estado !== 'idle' && (
                            <AlertCircle className={`h-4 w-4 ${estado === 'sinDisfrute' ? 'text-amber-500' : 'text-destructive'}`} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {seleccionados.some(cid => {
              const col = colaboradoresMock.find(c => c.id === cid)!;
              return validarDatos(col, getDatos(cid)) !== 'ok';
            }) && (
              <div className="space-y-2">
                {seleccionados.map(cid => {
                  const col = colaboradoresMock.find(c => c.id === cid)!;
                  const estado = validarDatos(col, getDatos(cid));
                  if (estado === 'ok') return null;
                  return (
                    <div key={cid} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${estado === 'sinDisfrute' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-destructive/5 text-destructive border border-destructive/20'}`}>
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>{col.nombre}:</strong>{' '}
                        {estado === 'sinDisfrute' && 'Debe registrar al menos 1 día de disfrute.'}
                        {estado === 'dineroSuperior' && `Los días en dinero (${getDatos(cid).diasDinero}) no pueden superar los días de disfrute (${getDatos(cid).diasDisfrute}).`}
                        {estado === 'superaDisponibles' && `El total de días (${getDatos(cid).diasDisfrute + getDatos(cid).diasDinero}) supera los días disponibles (${col.diasDisponibles}).`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── PASO 3 ── */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Confirmación</h2>
              <p className="text-sm text-muted-foreground">{periodoNombre} — {seleccionados.length} colaborador{seleccionados.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          {seleccionados.map(cid => {
            const col = colaboradoresMock.find(c => c.id === cid)!;
            const d = getDatos(cid);
            const valorDia = calcValorDia(col.salarioPromedio);
            const valorDisfrute = valorDia * d.diasDisfrute;
            const valorDinero = valorDia * d.diasDinero;
            const total = valorDisfrute + valorDinero;

            return (
              <Card key={cid} className="border-border overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {getIniciales(col.nombre)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{col.nombre}</p>
                    <p className="text-xs text-muted-foreground">{col.cargo}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">Días disponibles</p>
                    <p className="text-sm font-bold text-primary">{col.diasDisponibles} días</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Cédula</p>
                    <p className="text-sm font-medium">{col.cedula}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Valor día</p>
                    <p className="text-sm font-medium">{formatearMoneda(valorDia)}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Período</p>
                    <p className="text-sm font-medium">{periodoNombre}</p>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="bg-success/5 border-b border-success/10">
                    <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">Días de Disfrute</span>
                    </div>
                    <div className="px-5 pb-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días</span>
                        <span className="text-sm font-medium">{d.diasDisfrute} días</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Salario promedio</span>
                        <span className="text-sm font-medium">{formatearMoneda(col.salarioPromedio)}</span>
                      </div>
                    </div>
                    <div className="mx-5 my-3 border-t border-success/20" />
                    <div className="flex justify-between items-center px-5 pb-4">
                      <span className="text-xs uppercase tracking-wide font-bold text-success">Valor disfrute</span>
                      <span className="text-sm font-bold text-success">{formatearMoneda(valorDisfrute)}</span>
                    </div>
                  </div>

                  {d.diasDinero > 0 && (
                    <div className="bg-amber-50/60 border-b border-amber-100">
                      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">Días en Dinero</span>
                      </div>
                      <div className="px-5 pb-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Días</span>
                          <span className="text-sm font-medium">{d.diasDinero} días</span>
                        </div>
                      </div>
                      <div className="mx-5 my-3 border-t border-amber-200" />
                      <div className="flex justify-between items-center px-5 pb-4">
                        <span className="text-xs uppercase tracking-wide font-bold text-amber-700">Valor en dinero</span>
                        <span className="text-sm font-bold text-amber-700">{formatearMoneda(valorDinero)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-5 py-4">
                    <div>
                      <span className="text-sm uppercase tracking-wide font-bold">Total Vacaciones</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.diasDisfrute + d.diasDinero} días totales</p>
                    </div>
                    <span className="text-xl font-bold text-primary">{formatearMoneda(total)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Colaboradores liquidados</p>
              <p className="font-bold text-lg">{seleccionados.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total vacaciones a pagar</p>
              <p className="font-bold text-2xl text-primary">{formatearMoneda(totalGeneral)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={paso === 1 ? () => navigate('/liquidaciones') : () => setPaso(p => p - 1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />{paso === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < 3 ? (
          <Button onClick={avanzar} className="gap-2">
            Siguiente<ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={confirmar} className="gap-2 bg-success hover:bg-success/90">
            <Check className="h-4 w-4" />Confirmar Liquidación
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Componente raíz: decide el modo según ?col= ────────────────────────────────
// Tiene exactamente los mismos hooks en cada render, sin condiciones.
export default function NuevaVacaciones() {
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get('col');
  const colIndividual = preselect ? colaboradoresMock.find(c => c.id === preselect) : null;

  if (colIndividual) {
    return <LiquidacionIndividual col={colIndividual} />;
  }
  return <BatchWizard />;
}
