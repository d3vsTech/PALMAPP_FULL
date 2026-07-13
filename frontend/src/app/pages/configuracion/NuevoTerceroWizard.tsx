/**
 * Wizard "Nuevo Tercero" — conectado al backend (`API_TERCEROS.md`).
 *
 * Flujo de tres pasos:
 *  1. Datos del tercero (Jurídica o Natural)
 *  2. Precios por labor / cosecha / abono (overrides del tercero)
 *  3. Operarios vinculados
 *
 * Al montar, carga `tercerosApi.wizardInit()` para obtener los IDs reales de
 * lotes y labores (sin esto los precios no podrían persistirse). Al guardar:
 *  - POST /terceros                          con datos del paso 1
 *  - POST /terceros/{id}/wizard-complete     toda la configuración en una sola petición
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
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
import {
  tercerosApi,
  TercerosErrorCodes,
  TercerosCacheKeys,
  type CrearTerceroPayload,
  type TerceroWizardInit,
  type WizardCompletePayload,
} from '../../../api/terceros';
import { cached, invalidate } from '../../../api/cache';
import type { ApiError } from '../../../api/client';
import { selectsApi } from '../../../api/operaciones';

// ─── Helper de error tipado ──────────────────────────────────────────────────

/** Estrecha `unknown` a `ApiError` sin usar `any`. */
function asApiError(e: unknown): Partial<ApiError> {
  return (typeof e === 'object' && e !== null) ? (e as Partial<ApiError>) : {};
}

// ─── Tipos del paso 2 ────────────────────────────────────────────────────────

/** Fila de cosecha por lote (id real del backend). */
export type PrecioCosecha = { loteId: number; loteNombre: string; precioPorKg: number };
export type RangoAbonada  = { gramosMinimo: number; gramosMaximo: number; precioPorPalma: number };
/**
 * Override de precio por labor de FINCA configurable por tercero. El
 * `tipo_pago` de las labores de finca está forzado a `JORNAL_FIJO` (ver
 * `API_OPERACIONES.md §3.3`), así que el precio es un valor plano.
 */
export type PrecioLaborFinca = { laborId: number; laborNombre: string; precio: number };

/**
 * Precios configurables en el wizard.
 *
 * - `cosecha`: una fila por lote del tenant (precargada desde `wizard-init`).
 * - `abonada`: rangos de gramos → precio/palma (override del tercero).
 * - `plateo`/`poda`/`sanidad`: precios simples por labor fija. Los IDs reales
 *   de cada labor viven en `bundle.labores_contexto` y se buscan por `tipo`
 *   al persistir; aquí solo guardamos el valor en pesos.
 */
/**
 * Modo de pago override por tercero+labor. `HEREDAR` significa que NO se
 * envía `tipo_pago` en el payload — el backend deja que el modo efectivo
 * sea el del catálogo del tenant (ver §3 de `API_TERCEROS.md`).
 */
export type TipoPagoOverride = 'HEREDAR' | 'POR_PALMA' | 'JORNAL_FIJO';

export type PreciosLabores = {
  cosecha: PrecioCosecha[];
  abonada: RangoAbonada[];
  plateo: number; poda: number; sanidad: number;
  /** Override de modo de pago por labor fija. Por default todas heredan. */
  plateoTipoPago: TipoPagoOverride;
  podaTipoPago: TipoPagoOverride;
  sanidadTipoPago: TipoPagoOverride;
  /** Una entrada por cada labor de FINCA activa del tenant. Precio en COP. */
  finca: PrecioLaborFinca[];
};

export const preciosVacios = (): PreciosLabores => ({
  cosecha: [],
  abonada: [
    { gramosMinimo: 0,    gramosMaximo: 500,  precioPorPalma: 0 },
    { gramosMinimo: 501,  gramosMaximo: 1000, precioPorPalma: 0 },
    { gramosMinimo: 1001, gramosMaximo: 1500, precioPorPalma: 0 },
  ],
  plateo: 0, poda: 0, sanidad: 0,
  plateoTipoPago: 'HEREDAR',
  podaTipoPago: 'HEREDAR',
  sanidadTipoPago: 'HEREDAR',
  finca: [],
});

// ─── Paso 1: Datos del Tercero ────────────────────────────────────────────────

export function Paso1({ data, onChange }: { data: Partial<EmpresaTercero>; onChange: (d: Partial<EmpresaTercero>) => void }) {
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
          {esNatural && (
            <div className="space-y-2">
              <Label>Nombre Comercial</Label>
              <Input
                value={data.nombreComercial ?? ''}
                onChange={e => set('nombreComercial', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}
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
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={data.email ?? ''}
              onChange={e => set('email', e.target.value)}
              placeholder={esNatural ? 'juan.perez@correo.com' : 'contacto@empresa.com'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Paso 2: Precios por Labor ────────────────────────────────────────────────

export function Paso2({ precios, onChange }: { precios: PreciosLabores; onChange: (p: PreciosLabores) => void }) {
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
                        <th className="text-right p-3 font-semibold text-xs">Precio / Kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {precios.cosecha.length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-xs text-muted-foreground italic">
                            No hay lotes registrados. Crea lotes en "Mi Plantación" para configurar precios de cosecha.
                          </td>
                        </tr>
                      )}
                      {precios.cosecha.map((item, i) => (
                        <tr key={item.loteId} className="border-t border-border">
                          <td className="p-3">{item.loteNombre}</td>
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
            { key: 'plateo' as const,  label: 'Plateo',  unidad: 'palma',  bg: 'from-amber-50/50 to-amber-50/10 dark:from-amber-950/20' },
            { key: 'poda' as const,    label: 'Poda',    unidad: 'palma',  bg: 'from-purple-50/50 to-purple-50/10 dark:from-purple-950/20' },
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

          {/* Labores de Finca — override por tercero. Solo aparecen las
              labores con `categoria=FINCA` activas en el tenant. Si el tenant
              no tiene ninguna, este bloque no se renderiza. */}
          {precios.finca.length > 0 && (
            <AccordionItem value="finca" className="border-0">
              <Card className="border-border">
                <CardHeader className="border-b bg-gradient-to-r from-cyan-50/50 to-cyan-50/10 dark:from-cyan-950/20 py-3 px-4">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="text-left">
                      <p className="font-semibold text-sm">Labores de Finca</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Precio plano por jornal para cada labor de finca ({precios.finca.length})
                      </p>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-4 space-y-3">
                    {precios.finca.map((f, idx) => (
                      <div key={f.laborId} className="flex items-center justify-between gap-3 pb-2 border-b border-border/40 last:border-0">
                        <p className="text-sm font-medium flex-1 min-w-0 truncate" title={f.laborNombre}>
                          {f.laborNombre}
                        </p>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={f.precio || ''}
                            onChange={(e) => {
                              const next = [...precios.finca];
                              next[idx] = { ...f, precio: parseFloat(e.target.value) || 0 };
                              onChange({ ...precios, finca: next });
                            }}
                            placeholder="0"
                            className="text-right"
                          />
                          <span className="text-muted-foreground text-sm whitespace-nowrap">/jornal</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ─── Paso 3: Operarios ────────────────────────────────────────────────────────

export function Paso3({
  operarios, onChange, epsOptions, arlOptions,
}: {
  operarios: Partial<ColaboradorTercero>[];
  onChange: (ops: Partial<ColaboradorTercero>[]) => void;
  /** `null` = aún cargando o no disponible. Los `<Select>` lo reflejan. */
  epsOptions: string[] | null;
  arlOptions: string[] | null;
}) {
  const epsLista = epsOptions ?? [];
  const arlLista = arlOptions ?? [];
  const epsCargando = epsOptions === null;
  const arlCargando = arlOptions === null;
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
                <Select
                  value={nuevo.eps ?? ''}
                  onValueChange={(v: string) => setNuevo((p: Partial<ColaboradorTercero>) => ({ ...p, eps: v }))}
                  disabled={epsCargando || epsLista.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={epsCargando ? 'Cargando…' : (epsLista.length ? 'Seleccionar EPS' : 'Sin catálogo')} />
                  </SelectTrigger>
                  <SelectContent>{[...epsLista].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5 text-amber-600" /> ARL</Label>
                <Select
                  value={nuevo.arl ?? ''}
                  onValueChange={(v: string) => setNuevo((p: Partial<ColaboradorTercero>) => ({ ...p, arl: v }))}
                  disabled={arlCargando || arlLista.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={arlCargando ? 'Cargando…' : (arlLista.length ? 'Seleccionar ARL' : 'Sin catálogo')} />
                  </SelectTrigger>
                  <SelectContent>{[...arlLista].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
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
  const [guardando, setGuardando] = useState(false);
  /**
   * Bundle `/terceros/wizard-init` — provee los IDs reales de labores, lotes y
   * los catálogos EPS/ARL.
   *  - `null`        → aún cargando.
   *  - `'error'`     → la llamada falló (sin red, sin permisos). El paso 2 y 3
   *                    quedan informativos pero no bloquean al paso 1, que es
   *                    independiente del bundle.
   *  - `TerceroWizardInit` → datos listos.
   */
  const [bundle, setBundle] = useState<TerceroWizardInit | null | 'error'>(null);

  useEffect(() => {
    let cancelado = false;
    cached(TercerosCacheKeys.WIZARD_INIT, () => tercerosApi.wizardInit())
      .then((res) => {
        if (cancelado) return;
        setBundle(res.data);

        // Prellena la tabla de cosecha con los lotes reales del tenant.
        if (res.data.lotes_contexto.length > 0) {
          setPrecios((prev) => ({
            ...prev,
            cosecha: res.data.lotes_contexto.map((l) => ({
              loteId: l.id,
              loteNombre: l.nombre,
              precioPorKg: 0,
            })),
          }));
        }
        // Si vienen rangos de abono de referencia, los precarga vacíos.
        if (res.data.precios_abono_referencia.length > 0) {
          setPrecios((prev) => ({
            ...prev,
            abonada: res.data.precios_abono_referencia.map((r) => ({
              gramosMinimo: Number(r.gramos_min),
              gramosMaximo: Number(r.gramos_max),
              precioPorPalma: 0,
            })),
          }));
        }

        // Labores de FINCA — ideal: vienen en `labores_contexto` con
        // `categoria: 'FINCA'` (ver §6.1 de API_TERCEROS.md actualizado).
        // Fallback: si el backend aún no incluye FINCA en el bundle, hacemos
        // una llamada extra a `/labores/select?categoria=FINCA`. Así la
        // sección siempre se muestra al admin.
        const fincaItems = res.data.labores_contexto.filter(
          (l) => l.categoria === 'FINCA',
        );
        if (fincaItems.length > 0) {
          setPrecios((prev) => ({
            ...prev,
            finca: fincaItems.map((l) => ({
              laborId: l.id,
              laborNombre: l.nombre,
              precio: 0,
            })),
          }));
        } else {
          // Fallback: pedir directamente al endpoint de catálogos.
          selectsApi.labores({ categoria: 'FINCA', estado: true })
            .then((r) => {
              if (cancelado) return;
              if (r.data.length > 0) {
                setPrecios((prev) => ({
                  ...prev,
                  finca: r.data.map((l) => ({
                    laborId: l.id,
                    laborNombre: l.nombre,
                    precio: 0,
                  })),
                }));
              }
            })
            .catch((err) => {
              console.error('[NuevoTerceroWizard] fallback labores FINCA:', err);
            });
        }
      })
      .catch((e) => {
        if (cancelado) return;
        console.error('[NuevoTerceroWizard] wizard-init falló:', e);
        setBundle('error');
      });

    return () => { cancelado = true; };
  }, []);

  /** Catálogos del bundle. `null` = cargando o no disponible. Sin hardcoded. */
  const bundleListo = bundle !== null && bundle !== 'error';
  const epsOptions: string[] | null = bundleListo ? bundle.eps.map((e) => e.nombre) : null;
  const arlOptions: string[] | null = bundleListo ? bundle.arl.map((a) => a.nombre) : null;

  const pasoValido = paso === 1 ? !!datos.nit && !!datos.razonSocial : true;

  const totalPreciosConfigurados = [
    precios.cosecha.some(c => c.precioPorKg > 0),
    precios.abonada.some(a => a.precioPorPalma > 0),
    precios.plateo > 0, precios.poda > 0, precios.sanidad > 0,
    precios.finca.some(f => f.precio > 0),
  ].filter(Boolean).length;

  /**
   * Construye el payload de creación del tercero según el `tipoPersona`. El
   * form interno usa los mismos inputs (`nit`, `razonSocial`) para ambos
   * tipos para no complicar la UI; aquí los mapeamos al shape del backend.
   *
   * - Jurídica → `nit` + `razon_social` (+ `representante` desde `contacto`).
   * - Natural  → `cedula` (toma valor del input nit) + `nombre_completo`
   *              (toma valor del input razonSocial).
   */
  const construirPayload = (): CrearTerceroPayload | null => {
    const nitOcedula = (datos.nit ?? '').trim();
    const nombre = (datos.razonSocial ?? '').trim();
    if (!nitOcedula || !nombre) return null;

    const common = {
      nombre_comercial: datos.nombreComercial?.trim() || undefined,
      telefono: datos.telefono?.trim() || undefined,
      email: datos.email?.trim() || undefined,
    };

    if (datos.tipoPersona === 'Natural') {
      return {
        tipo_persona: 'NATURAL',
        cedula: nitOcedula,
        nombre_completo: nombre,
        ...common,
      };
    }
    return {
      tipo_persona: 'JURIDICA',
      nit: nitOcedula,
      razon_social: nombre,
      representante: datos.contacto?.trim() || undefined,
      ...common,
    };
  };

  /**
   * Resuelve `labor_id` real para las labores simples (Plateo, Poda, Sanidad)
   * buscándolas en `bundle.labores_contexto` por el campo `tipo`. Devuelve
   * `null` si la labor no está en el catálogo del tenant (caso en el que
   * simplemente se omite la persistencia de ese override).
   */
  const findLaborId = (tipo: 'PLATEO' | 'PODA' | 'SANIDAD'): number | null => {
    if (!bundleListo) return null;
    const item = bundle.labores_contexto.find((l) => l.tipo === tipo);
    return item?.id ?? null;
  };

  /**
   * Flujo de guardado completo (2 peticiones totales):
   *  1. POST /terceros                         — crea el tercero
   *  2. POST /terceros/{id}/wizard-complete    — toda la configuración en una sola petición atómica
   */
  const handleGuardar = async () => {
    const payload = construirPayload();
    if (!payload) {
      toast.error('Faltan datos obligatorios del tercero');
      setPaso(1);
      return;
    }
    setGuardando(true);
    let nuevoId: number | null = null;
    try {
      // 1. Crear el tercero
      const resTercero = await tercerosApi.crear(payload);
      nuevoId = resTercero.data.id;

      // 2. Construir payload de configuración consolidado
      const laborPreciosPayload: WizardCompletePayload['labor_precios'] = [];

      // Labores palma fijas (plateo/poda/sanidad) — labor_id resuelto desde el bundle
      const laboresPalma = [
        { tipo: 'PLATEO'  as const, precio: precios.plateo,  tipoPago: precios.plateoTipoPago  },
        { tipo: 'PODA'    as const, precio: precios.poda,    tipoPago: precios.podaTipoPago    },
        { tipo: 'SANIDAD' as const, precio: precios.sanidad, tipoPago: precios.sanidadTipoPago },
      ];
      for (const { tipo, precio, tipoPago } of laboresPalma) {
        const laborId = findLaborId(tipo);
        if (precio > 0 && laborId !== null) {
          laborPreciosPayload.push({
            labor_id: laborId,
            precio_palma: precio,
            ...(tipoPago !== 'HEREDAR' ? { tipo_pago: tipoPago } : {}),
          });
        }
      }

      // Labores FINCA — labor_id ya resuelto en el estado
      for (const f of precios.finca.filter((f) => f.precio > 0)) {
        laborPreciosPayload.push({ labor_id: f.laborId, precio_palma: f.precio });
      }

      const wizardPayload: WizardCompletePayload = {
        precios_cosecha: precios.cosecha
          .filter((c) => c.precioPorKg > 0)
          .map((c) => ({ lote_id: c.loteId, precio: c.precioPorKg })),
        precios_abono: precios.abonada
          .filter((r) => r.precioPorPalma > 0)
          .map((r) => ({ gramos_min: r.gramosMinimo, gramos_max: r.gramosMaximo, precio_palma: r.precioPorPalma })),
        labor_precios: laborPreciosPayload,
        operarios: operarios
          .filter((o) => o.nombres?.trim() && o.apellidos?.trim())
          .map((op) => ({
            nombres:   op.nombres!.trim(),
            apellidos: op.apellidos!.trim(),
            cedula:    op.documento?.trim() || undefined,
            cargo:     op.cargo?.trim()     || undefined,
            eps:       op.eps?.trim()       || undefined,
            arl:       op.arl?.trim()       || undefined,
          })),
      };

      const hayConfiguracion =
        wizardPayload.precios_cosecha.length > 0 ||
        wizardPayload.precios_abono.length > 0 ||
        wizardPayload.labor_precios.length > 0 ||
        wizardPayload.operarios.length > 0;

      if (hayConfiguracion) {
        await tercerosApi.wizardComplete(nuevoId, wizardPayload);
      }

      toast.success('Tercero creado correctamente');
      // Forzar refresh del listado — sin esto TercerosTab serviría desde caché
      invalidate(TercerosCacheKeys.LISTADO);
      navigate('/configuracion');
    } catch (e) {
      console.error('[NuevoTerceroWizard] Error al guardar:', e);
      const err = asApiError(e);
      if (nuevoId !== null) {
        // Tercero creado, wizard-complete falló — el tercero existe pero sin configuración
        if (err.code === TercerosErrorCodes.RANGO_SOLAPADO) {
          toast.warning('Tercero creado. Los rangos de abono se solapan; configúralos desde la pantalla de edición.');
        } else {
          toast.warning('Tercero creado. La configuración de precios/operarios falló; puedes completarla desde edición.');
        }
        invalidate(TercerosCacheKeys.LISTADO);
        navigate('/configuracion');
      } else {
        toast.error(err.message ?? 'No se pudo crear el tercero');
      }
    } finally {
      setGuardando(false);
    }
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
          {paso === 3 && (
            <Paso3
              operarios={operarios}
              onChange={setOperarios}
              epsOptions={epsOptions}
              arlOptions={arlOptions}
            />
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" className="gap-2"
              onClick={() => paso === 1 ? navigate('/configuracion') : setPaso(p => p - 1)}
              disabled={guardando}>
              <ArrowLeft className="h-4 w-4" />
              {paso === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            {paso < 3 ? (
              <Button className="gap-2 bg-primary hover:bg-primary/90"
                disabled={!pasoValido || guardando}
                onClick={() => setPaso(p => p + 1)}>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleGuardar}
                disabled={guardando}>
                <Save className="h-4 w-4" />
                {guardando ? 'Guardando…' : 'Guardar Tercero'}
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
                {datos.email && <p className="text-xs text-muted-foreground">{datos.email}</p>}
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
