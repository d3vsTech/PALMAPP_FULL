/**
 * Wizard "Nuevo Tercero" — portado tal cual del diseño V.15.
 *
 * Tres pasos: datos del tercero → precios por labor → operarios.
 * Aún NO hay endpoint backend para terceros: `handleGuardar` solo navega
 * de vuelta. Cuando exista la API se conecta sin tocar el JSX.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../../components/ui/accordion';
import {
  ArrowLeft, ArrowRight, Building2, User, Check, Plus, Trash2,
  HardHat, ShieldCheck, DollarSign, Users, UserPlus, Save,
} from 'lucide-react';
import type { EmpresaTercero, ColaboradorTercero } from '../../components/configuracion/TercerosTab';

// ─── Catálogos locales (mientras no exista API) ───────────────────────────────

const EPS_OPTIONS = ['Sura', 'Sanitas', 'Compensar', 'Famisanar', 'Salud Total', 'Nueva EPS'];
const ARL_OPTIONS = ['Sura', 'Positiva', 'Colmena', 'Bolívar', 'Equidad'];

// ─── Tipos del paso 2 ────────────────────────────────────────────────────────

type PrecioCosecha = { lote: string; sublote: string; precioPorKg: number };
type RangoAbonada  = { gramosMinimo: number; gramosMaximo: number; precioPorPalma: number };
type PreciosLabores = {
  cosecha: PrecioCosecha[];
  abonada: RangoAbonada[];
  plateo: number; poda: number; sanidad: number;
};

const preciosVacios = (): PreciosLabores => ({
  cosecha: [
    { lote: 'Lote 1 – Norte', sublote: 'Sublote A', precioPorKg: 0 },
    { lote: 'Lote 2 – Sur',   sublote: 'Sublote B', precioPorKg: 0 },
    { lote: 'Lote 3 – Este',  sublote: 'Sublote C', precioPorKg: 0 },
    { lote: 'Lote 4 – Oeste', sublote: 'Sublote D', precioPorKg: 0 },
  ],
  abonada: [
    { gramosMinimo: 0,    gramosMaximo: 500,  precioPorPalma: 0 },
    { gramosMinimo: 501,  gramosMaximo: 1000, precioPorPalma: 0 },
    { gramosMinimo: 1001, gramosMaximo: 1500, precioPorPalma: 0 },
  ],
  plateo: 0, poda: 0, sanidad: 0,
});

// ─── Paso 1: Datos del Tercero ────────────────────────────────────────────────

function Paso1({ data, onChange }: { data: Partial<EmpresaTercero>; onChange: (d: Partial<EmpresaTercero>) => void }) {
  const set = (k: keyof EmpresaTercero, v: string) => onChange({ ...data, [k]: v });
  const esNatural = data.tipoPersona === 'Natural';

  return (
    <Card className="border-border">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Datos del Tercero</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Información de la empresa o persona contratista</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="font-semibold">Tipo de persona <span className="text-destructive">*</span></Label>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['Jurídica', 'Natural'] as const).map(tipo => (
              <button key={tipo} type="button" onClick={() => set('tipoPersona', tipo)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                  data.tipoPersona === tipo ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}>
                {tipo === 'Jurídica' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                Persona {tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{esNatural ? 'Cédula' : 'NIT'} <span className="text-destructive">*</span></Label>
            <Input value={data.nit ?? ''} onChange={e => set('nit', e.target.value)}
              placeholder={esNatural ? '1.098.765.432' : '900.123.456-1'} />
          </div>
          <div className="space-y-2">
            <Label>{esNatural ? 'Nombre completo' : 'Razón Social'} <span className="text-destructive">*</span></Label>
            <Input value={data.razonSocial ?? ''} onChange={e => set('razonSocial', e.target.value)}
              placeholder={esNatural ? 'Juan Carlos Pérez' : 'Servicios Agro S.A.S'} />
          </div>
          {!esNatural && (
            <div className="space-y-2">
              <Label>Representante Legal</Label>
              <Input value={data.contacto ?? ''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del representante" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={data.telefono ?? ''} onChange={e => set('telefono', e.target.value)} placeholder="3001234567" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Paso 2: Precios por Labor ────────────────────────────────────────────────

function Paso2({ precios, onChange }: { precios: PreciosLabores; onChange: (p: PreciosLabores) => void }) {
  const setCosecha = (idx: number, val: number) =>
    onChange({ ...precios, cosecha: precios.cosecha.map((r, i) => i === idx ? { ...r, precioPorKg: val } : r) });
  const setAbonada = (idx: number, field: keyof RangoAbonada, val: number) =>
    onChange({ ...precios, abonada: precios.abonada.map((r, i) => i === idx ? { ...r, [field]: val } : r) });
  const agregarRango = () => {
    const last = precios.abonada[precios.abonada.length - 1];
    const min = last ? last.gramosMaximo + 1 : 0;
    onChange({ ...precios, abonada: [...precios.abonada, { gramosMinimo: min, gramosMaximo: min + 500, precioPorPalma: 0 }] });
  };
  const setPrecioSimple = (key: 'plateo' | 'poda' | 'sanidad', val: number) => onChange({ ...precios, [key]: val });

  return (
    <Card className="border-border">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Precios por Labor</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Define cuánto se le paga a este tercero por cada labor</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Accordion type="multiple" defaultValue={['cosecha']} className="space-y-3">
          <AccordionItem value="cosecha" className="border-0">
            <Card className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-green-50/50 to-green-50/10 dark:from-green-950/20 py-3 px-4">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <p className="font-semibold text-sm">Cosecha</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Precio por kg de fruto cosechado por lote</p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-xs">Lote</th>
                        <th className="text-left p-3 font-semibold text-xs">Sublote</th>
                        <th className="text-right p-3 font-semibold text-xs">Precio / Kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {precios.cosecha.map((item, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-3">{item.lote}</td>
                          <td className="p-3 text-muted-foreground">{item.sublote}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-muted-foreground text-xs">$</span>
                              <Input type="number" value={item.precioPorKg || ''} onChange={e => setCosecha(i, parseFloat(e.target.value) || 0)} className="w-24 text-right h-8" placeholder="0" />
                              <span className="text-muted-foreground text-xs">/kg</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="abonada" className="border-0">
            <Card className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50/50 to-emerald-50/10 dark:from-emerald-950/20 py-3 px-4">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="text-left">
                    <p className="font-semibold text-sm">Abonada</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Rangos de gramos y precio por palma</p>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={agregarRango}>
                      <Plus className="h-3 w-3" /> Agregar Rango
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>
                      <th className="text-left p-2 text-xs font-semibold">Gramos Mín.</th>
                      <th className="text-left p-2 text-xs font-semibold">Gramos Máx.</th>
                      <th className="text-left p-2 text-xs font-semibold">Precio/Palma</th>
                      <th className="w-8" />
                    </tr></thead>
                    <tbody>
                      {precios.abonada.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-2"><Input type="number" value={r.gramosMinimo || ''} onChange={e => setAbonada(i, 'gramosMinimo', parseFloat(e.target.value) || 0)} className="h-8" /></td>
                          <td className="p-2"><Input type="number" value={r.gramosMaximo || ''} onChange={e => setAbonada(i, 'gramosMaximo', parseFloat(e.target.value) || 0)} className="h-8" /></td>
                          <td className="p-2"><div className="flex gap-1 items-center"><span className="text-muted-foreground text-xs">$</span><Input type="number" value={r.precioPorPalma || ''} onChange={e => setAbonada(i, 'precioPorPalma', parseFloat(e.target.value) || 0)} className="h-8 w-20" /></div></td>
                          <td className="p-2"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onChange({ ...precios, abonada: precios.abonada.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {([
            { key: 'plateo' as const, label: 'Plateo', unidad: 'palma', bg: 'from-amber-50/50 to-amber-50/10 dark:from-amber-950/20' },
            { key: 'poda' as const,   label: 'Poda',   unidad: 'palma', bg: 'from-purple-50/50 to-purple-50/10 dark:from-purple-950/20' },
            { key: 'sanidad' as const, label: 'Sanidad', unidad: 'jornal', bg: 'from-red-50/50 to-red-50/10 dark:from-red-950/20' },
          ]).map(({ key, label, unidad, bg }) => (
            <AccordionItem key={key} value={key} className="border-0">
              <Card className="border-border">
                <CardHeader className={`border-b bg-gradient-to-r ${bg} py-3 px-4`}>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="text-left">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Precio por {unidad}</p>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-muted-foreground">$</span>
                      <Input type="number" value={precios[key] || ''} onChange={e => setPrecioSimple(key, parseFloat(e.target.value) || 0)} placeholder="0" />
                      <span className="text-muted-foreground text-sm">/{unidad}</span>
                    </div>
                    {(precios[key] as number) > 0 && (
                      <p className="text-xs text-success mt-1.5">${(precios[key] as number).toLocaleString('es-CO')} / {unidad}</p>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ─── Paso 3: Operarios ────────────────────────────────────────────────────────

function Paso3({ operarios, onChange }: { operarios: Partial<ColaboradorTercero>[]; onChange: (ops: Partial<ColaboradorTercero>[]) => void }) {
  const [nuevo, setNuevo] = useState<Partial<ColaboradorTercero>>({ estado: 'Activo' });
  const [agregando, setAgregando] = useState(false);

  const agregar = () => {
    if (!nuevo.nombres || !nuevo.apellidos) return;
    onChange([...operarios, { ...nuevo, id: `new-${Date.now()}` }]);
    setNuevo({ estado: 'Activo' });
    setAgregando(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Operarios</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Personal vinculado a este tercero (opcional)</p>
            </div>
          </div>
          {!agregando && (
            <Button variant="outline" className="gap-2" onClick={() => setAgregando(true)}>
              <UserPlus className="h-4 w-4" /> Agregar Operario
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {operarios.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            {operarios.map((op, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3.5 ${idx > 0 ? 'border-t border-border/50' : ''}`}>
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {op.nombres?.[0]}{op.apellidos?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{op.nombres} {op.apellidos}</p>
                  <p className="text-xs text-muted-foreground">
                    {op.cargo || 'Sin cargo'}{op.documento ? ` · CC ${op.documento}` : ''}
                    {op.eps ? ` · EPS: ${op.eps}` : ''}{op.arl ? ` · ARL: ${op.arl}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(operarios.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {operarios.length === 0 && !agregando && (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin operarios. Puedes agregarlos aquí o después de guardar.</p>
          </div>
        )}

        {agregando && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <p className="text-sm font-semibold text-primary">Datos del operario</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombres <span className="text-destructive">*</span></Label>
                <Input value={nuevo.nombres ?? ''} onChange={e => setNuevo(p => ({ ...p, nombres: e.target.value }))} placeholder="Nombres" />
              </div>
              <div className="space-y-2">
                <Label>Apellidos <span className="text-destructive">*</span></Label>
                <Input value={nuevo.apellidos ?? ''} onChange={e => setNuevo(p => ({ ...p, apellidos: e.target.value }))} placeholder="Apellidos" />
              </div>
              <div className="space-y-2">
                <Label>Cédula</Label>
                <Input value={nuevo.documento ?? ''} onChange={e => setNuevo(p => ({ ...p, documento: e.target.value }))} placeholder="Número de cédula" />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={nuevo.cargo ?? ''} onChange={e => setNuevo(p => ({ ...p, cargo: e.target.value }))} placeholder="Cosechero, Podador..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> EPS</Label>
                <Select value={nuevo.eps ?? ''} onValueChange={v => setNuevo(p => ({ ...p, eps: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar EPS" /></SelectTrigger>
                  <SelectContent>{EPS_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5 text-amber-600" /> ARL</Label>
                <Select value={nuevo.arl ?? ''} onValueChange={v => setNuevo(p => ({ ...p, arl: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar ARL" /></SelectTrigger>
                  <SelectContent>{ARL_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAgregando(false)}>Cancelar</Button>
              <Button className="bg-primary hover:bg-primary/90 gap-2" disabled={!nuevo.nombres || !nuevo.apellidos} onClick={agregar}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Datos del Tercero' },
  { num: 2, label: 'Precios por Labor' },
  { num: 3, label: 'Operarios' },
];

export default function NuevoTerceroWizard() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<Partial<EmpresaTercero>>({ tipoPersona: 'Jurídica', estado: 'Activa' });
  const [precios, setPrecios] = useState<PreciosLabores>(preciosVacios());
  const [operarios, setOperarios] = useState<Partial<ColaboradorTercero>[]>([]);

  const pasoValido = paso === 1 ? !!datos.nit && !!datos.razonSocial : true;

  const totalPreciosConfigurados = [
    precios.cosecha.some(c => c.precioPorKg > 0),
    precios.abonada.some(a => a.precioPorPalma > 0),
    precios.plateo > 0, precios.poda > 0, precios.sanidad > 0,
  ].filter(Boolean).length;

  const handleGuardar = () => {
    // TODO: conectar a `tercerosApi.crear` cuando exista el endpoint.
    navigate('/configuracion');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracion')}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Nuevo Tercero</h1>
          <p className="text-muted-foreground mt-1">Registra un contratista o empresa prestadora de servicios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Stepper */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                        paso > s.num
                          ? 'bg-primary border-primary text-primary-foreground'
                          : paso === s.num
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        {paso > s.num ? <Check className="h-5 w-5" /> : s.num}
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${paso === s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 h-0.5 bg-border overflow-hidden rounded-full">
                        <div className={`h-full bg-primary transition-all duration-500 ${paso > s.num ? 'w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contenido del paso */}
          {paso === 1 && <Paso1 data={datos} onChange={setDatos} />}
          {paso === 2 && <Paso2 precios={precios} onChange={setPrecios} />}
          {paso === 3 && <Paso3 operarios={operarios} onChange={setOperarios} />}

          {/* Navegación */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" className="gap-2"
              onClick={() => paso === 1 ? navigate('/configuracion') : setPaso(p => p - 1)}>
              <ArrowLeft className="h-4 w-4" />
              {paso === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            {paso < 3 ? (
              <Button className="gap-2 bg-primary hover:bg-primary/90" disabled={!pasoValido}
                onClick={() => setPaso(p => p + 1)}>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleGuardar}>
                <Save className="h-4 w-4" /> Guardar Tercero
              </Button>
            )}
          </div>
        </div>

        {/* Panel de resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8 border-border">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Datos del tercero */}
              <div className="space-y-3 pb-4 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tercero</p>
                {datos.razonSocial ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      {datos.tipoPersona === 'Natural' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{datos.razonSocial}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">{datos.tipoPersona}</Badge>
                        {datos.nit && <span className="text-xs text-muted-foreground">{datos.tipoPersona === 'Natural' ? 'CC' : 'NIT'} {datos.nit}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin completar</p>
                )}
                {datos.telefono && <p className="text-xs text-muted-foreground">Tel: {datos.telefono}</p>}
              </div>

              {/* Precios configurados */}
              <div className="space-y-3 pb-4 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Precios configurados</p>
                {totalPreciosConfigurados === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin precios definidos</p>
                ) : (
                  <div className="space-y-1.5">
                    {precios.cosecha.some(c => c.precioPorKg > 0) && (
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cosecha</span><span className="font-medium text-success">✓ Configurada</span></div>
                    )}
                    {precios.abonada.some(a => a.precioPorPalma > 0) && (
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Abonada</span><span className="font-medium text-success">✓ Configurada</span></div>
                    )}
                    {precios.plateo > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Plateo</span><span className="font-medium">${precios.plateo.toLocaleString('es-CO')}/palma</span></div>}
                    {precios.poda > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Poda</span><span className="font-medium">${precios.poda.toLocaleString('es-CO')}/palma</span></div>}
                    {precios.sanidad > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Sanidad</span><span className="font-medium">${precios.sanidad.toLocaleString('es-CO')}/jornal</span></div>}
                  </div>
                )}
              </div>

              {/* Operarios */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Operarios ({operarios.length})
                </p>
                {operarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin operarios</p>
                ) : (
                  <div className="space-y-2">
                    {operarios.map((op, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {op.nombres?.[0]}{op.apellidos?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{op.nombres} {op.apellidos}</p>
                          <p className="text-[10px] text-muted-foreground">{op.cargo || 'Sin cargo'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
