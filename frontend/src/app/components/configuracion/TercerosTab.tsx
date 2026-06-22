/**
 * TercerosTab — empresas/personas naturales externas que prestan servicios.
 *
 * Portado tal cual del diseño V.15 (carpeta `PalmApp - V220626`). El backend
 * NO tiene endpoint todavía: los datos viven en `MOCK_TERCEROS` /
 * `MOCK_OPERARIOS` locales y solo persisten en memoria mientras se navega.
 * Cuando exista la API, se reemplazan las constantes mock por las llamadas a
 * `tercerosApi` / `operariosApi` sin tocar el JSX.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  Plus, Pencil, Building2, User, HardHat, ShieldCheck, UserPlus,
  ChevronDown, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { InfoTooltip } from '../common/InfoTooltip';

// ─── Tipos locales (mientras no exista API) ──────────────────────────────────

export type EmpresaTercero = {
  id: string;
  razonSocial: string;
  nit: string;
  tipoPersona: 'Jurídica' | 'Natural';
  contacto?: string;
  telefono?: string;
  estado: 'Activa' | 'Inactiva';
};

export type ColaboradorTercero = {
  id: string;
  empresaId: string;
  nombres: string;
  apellidos: string;
  documento: string;
  cargo: string;
  eps: string;
  arl: string;
  tarifaDiaria: number;
  estado: 'Activo' | 'Inactivo';
};

// ─── Mocks (placeholder hasta que exista la API) ─────────────────────────────

const MOCK_TERCEROS: EmpresaTercero[] = [
  {
    id: 't1', razonSocial: 'Servicios Agrícolas del Llano S.A.S.',
    nit: '900.123.456-1', tipoPersona: 'Jurídica',
    contacto: 'Andrés Rojas', telefono: '+57 312 444 5566', estado: 'Activa',
  },
  {
    id: 't2', razonSocial: 'Cuadrilla La Palmera',
    nit: '11.222.333', tipoPersona: 'Natural',
    contacto: 'Pedro Méndez', telefono: '+57 301 222 3344', estado: 'Activa',
  },
];

const MOCK_OPERARIOS: ColaboradorTercero[] = [
  {
    id: 'ct1', empresaId: 't1', nombres: 'Carlos', apellidos: 'Ramírez',
    documento: '1.098.765.432', cargo: 'Cosechero', eps: 'Sura', arl: 'Positiva',
    tarifaDiaria: 0, estado: 'Activo',
  },
  {
    id: 'ct2', empresaId: 't1', nombres: 'Luis', apellidos: 'Pérez',
    documento: '1.123.456.789', cargo: 'Podador', eps: 'Sanitas', arl: 'Colmena',
    tarifaDiaria: 0, estado: 'Activo',
  },
];

const EPS_OPTIONS = ['Sura', 'Sanitas', 'Compensar', 'Famisanar', 'Salud Total', 'Nueva EPS'];
const ARL_OPTIONS = ['Sura', 'Positiva', 'Colmena', 'Bolívar', 'Equidad'];

// ─── Formulario inline agregar operario ──────────────────────────────────────

function FormOperario({
  terceroId, onGuardar, onCancelar,
}: { terceroId: string; onGuardar: (c: ColaboradorTercero) => void; onCancelar: () => void }) {
  const [form, setForm] = useState<Partial<ColaboradorTercero>>({ estado: 'Activo' });
  const set = (k: keyof ColaboradorTercero, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
      <p className="text-sm font-semibold text-primary flex items-center gap-2">
        <HardHat className="h-4 w-4" /> Nuevo Operario
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombres <span className="text-destructive">*</span></Label>
          <Input value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} placeholder="Nombres" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Apellidos <span className="text-destructive">*</span></Label>
          <Input value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} placeholder="Apellidos" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cédula</Label>
          <Input value={form.documento ?? ''} onChange={e => set('documento', e.target.value)} placeholder="Número de cédula" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cargo</Label>
          <Input value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} placeholder="Cosechero, Podador..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> EPS</Label>
          <Select value={form.eps ?? ''} onValueChange={v => set('eps', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar EPS" /></SelectTrigger>
            <SelectContent>{EPS_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><HardHat className="h-3 w-3 text-amber-600" /> ARL</Label>
          <Select value={form.arl ?? ''} onValueChange={v => set('arl', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar ARL" /></SelectTrigger>
            <SelectContent>{ARL_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5"
          disabled={!form.nombres || !form.apellidos}
          onClick={() => onGuardar({
            id: `ct${Date.now()}`,
            empresaId: terceroId,
            nombres: form.nombres!,
            apellidos: form.apellidos!,
            documento: form.documento ?? '',
            cargo: form.cargo ?? '',
            eps: form.eps ?? '',
            arl: form.arl ?? '',
            tarifaDiaria: 0,
            estado: 'Activo',
          })}>
          <Plus className="h-3.5 w-3.5" /> Agregar Operario
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TercerosTab() {
  const navigate = useNavigate();
  const [terceros, setTerceros] = useState<EmpresaTercero[]>(MOCK_TERCEROS);
  const [operarios, setOperarios] = useState<ColaboradorTercero[]>(MOCK_OPERARIOS);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [modalOperario, setModalOperario] = useState<{ open: boolean; terceroId: string }>({ open: false, terceroId: '' });

  const guardarOperario = (c: ColaboradorTercero) => {
    setOperarios(prev => [...prev, c]);
    setModalOperario({ open: false, terceroId: '' });
  };

  const eliminarTercero = (id: string) => {
    setTerceros(prev => prev.filter(t => t.id !== id));
    setOperarios(prev => prev.filter(o => o.empresaId !== id));
    if (expandidoId === id) setExpandidoId(null);
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-1">
              Terceros
              <InfoTooltip text="Empresas o personas naturales externas que prestan servicios en la finca. No son colaboradores directos." />
            </CardTitle>
            <CardDescription>
              {terceros.length} tercero{terceros.length !== 1 ? 's' : ''} · {operarios.length} operario{operarios.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button onClick={() => navigate('/configuracion/terceros/nuevo')} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nuevo Tercero
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {terceros.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin terceros registrados.</p>
            <Button size="sm" className="mt-3 gap-2" onClick={() => navigate('/configuracion/terceros/nuevo')}>
              <Plus className="h-4 w-4" /> Agregar primer tercero
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {terceros.map(t => {
              const ops = operarios.filter(o => o.empresaId === t.id);
              const esNatural = t.tipoPersona === 'Natural';
              const expandido = expandidoId === t.id;

              return (
                <React.Fragment key={t.id}>
                  {/* Fila del tercero */}
                  <div
                    className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${expandido ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    onClick={() => setExpandidoId(expandido ? null : t.id)}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      {esNatural ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{t.razonSocial}</p>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">{t.tipoPersona ?? 'Jurídica'}</Badge>
                        <Badge className={`text-xs ${t.estado === 'Activa' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>{t.estado}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {esNatural ? 'CC' : 'NIT'} {t.nit}
                        {t.contacto && ` · ${t.contacto}`}
                        {t.telefono && ` · ${t.telefono}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {ops.length} operario{ops.length !== 1 ? 's' : ''}
                      </span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        title="Editar tercero">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar tercero"
                        onClick={() => eliminarTercero(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${expandido ? 'rotate-180 text-primary' : ''}`} />
                  </div>

                  {/* Panel expandido */}
                  {expandido && (
                    <div className="bg-muted/5 px-5 py-5 space-y-5 border-t border-border/50">
                      {/* Operarios */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            <HardHat className="h-4 w-4 text-primary" />
                            Operarios ({ops.length})
                          </p>
                          <Button size="sm" variant="outline" className="gap-1.5 h-8"
                            onClick={() => setModalOperario({ open: true, terceroId: t.id })}>
                            <UserPlus className="h-3.5 w-3.5" /> Agregar Operario
                          </Button>
                        </div>

                        {ops.length > 0 && (
                          <div className="rounded-xl border border-border overflow-hidden mb-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/30 text-xs text-muted-foreground">
                                  <th className="text-left p-3 font-semibold">Nombre</th>
                                  <th className="text-left p-3 font-semibold">Cédula</th>
                                  <th className="text-left p-3 font-semibold">Cargo</th>
                                  <th className="text-left p-3 font-semibold">
                                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> EPS</span>
                                  </th>
                                  <th className="text-left p-3 font-semibold">
                                    <span className="flex items-center gap-1"><HardHat className="h-3 w-3 text-amber-600" /> ARL</span>
                                  </th>
                                  <th className="text-center p-3 font-semibold">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ops.map((op, i) => (
                                  <tr key={op.id} className={`border-t border-border/50 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                                          {op.nombres[0]}{op.apellidos[0]}
                                        </div>
                                        <span className="font-medium">{op.nombres} {op.apellidos}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">{op.documento || '—'}</td>
                                    <td className="p-3">{op.cargo || '—'}</td>
                                    <td className="p-3 text-muted-foreground">{op.eps || '—'}</td>
                                    <td className="p-3 text-muted-foreground">{op.arl || '—'}</td>
                                    <td className="p-3 text-center">
                                      <Badge variant="outline" className={`text-xs ${op.estado === 'Activo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                                        {op.estado}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {ops.length === 0 && (
                          <p className="text-xs text-muted-foreground italic py-1">Sin operarios registrados.</p>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal agregar operario */}
      <Dialog open={modalOperario.open} onOpenChange={open => !open && setModalOperario({ open: false, terceroId: '' })}>
        <DialogContent style={{ width: 'min(600px, 95vw)', maxWidth: 'min(600px, 95vw)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" /> Nuevo Operario
            </DialogTitle>
            <DialogDescription>
              Operario vinculado a {terceros.find(t => t.id === modalOperario.terceroId)?.razonSocial ?? 'este tercero'}
            </DialogDescription>
          </DialogHeader>
          <FormOperario
            terceroId={modalOperario.terceroId}
            onGuardar={guardarOperario}
            onCancelar={() => setModalOperario({ open: false, terceroId: '' })}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
