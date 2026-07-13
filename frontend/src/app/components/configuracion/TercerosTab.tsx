/**
 * TercerosTab — empresas / personas naturales externas que prestan servicios.
 *
 * Conectado al backend según `API_TERCEROS.md`. Buenas prácticas aplicadas:
 *  - Usa `apiClient` (vía `tercerosApi`/`operariosApi`) — no `requestConToken`.
 *  - Listado cacheado con TTL via `cached(LISTADO_KEY, ...)`; invalidación
 *    explícita tras crear/eliminar/toggle para mantener consistencia.
 *  - Catálogos EPS/ARL del modal "Nuevo Operario" salen del bundle
 *    `tercerosApi.wizardInit()` (también cacheado). Si falla, los selects
 *    quedan deshabilitados con mensaje — sin listas hardcoded.
 *  - Errores manejados por `code` (no por string-matching de message).
 *  - El JSX visual proviene del diseño V.15 — sin cambios.
 */
import React, { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { InfoTooltip } from '../common/InfoTooltip';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { TabLoadingGate } from './TabLoadingGate';
import { cached, invalidate } from '../../../api/cache';
import {
  tercerosApi,
  operariosApi,
  TercerosErrorCodes,
  TercerosCacheKeys,
  type Tercero,
  type Operario,
  type TerceroWizardInit,
} from '../../../api/terceros';
import type { ApiError } from '../../../api/client';

// ─── Helpers de error tipados ────────────────────────────────────────────────

/**
 * Estrecha `unknown` a `ApiError` sin usar `any`. Útil dentro de `catch (e)`
 * para acceder a `code`/`message` de forma type-safe.
 */
function asApiError(e: unknown): Partial<ApiError> {
  return (typeof e === 'object' && e !== null) ? (e as Partial<ApiError>) : {};
}

/** Texto visible del tercero (razón social o nombre completo). */
function displayNombre(t: Tercero): string {
  return t.tipo_persona === 'NATURAL'
    ? (t.nombre_completo ?? '')
    : (t.razon_social ?? '');
}

/** Documento visible (NIT o cédula). */
function displayDocumento(t: Tercero): string {
  return t.tipo_persona === 'NATURAL'
    ? (t.cedula ?? '')
    : (t.nit ?? '');
}

// ─── Formulario inline agregar operario ──────────────────────────────────────

interface FormOperarioProps {
  terceroId: number;
  /** Catálogos del backend. `null` = aún cargando, `[]` = no disponibles. */
  epsOptions: string[] | null;
  arlOptions: string[] | null;
  onGuardado: (op: Operario) => void;
  onCancelar: () => void;
}

function FormOperario({
  terceroId, epsOptions, arlOptions, onGuardado, onCancelar,
}: FormOperarioProps) {
  const [form, setForm] = useState<{
    nombres?: string; apellidos?: string; cedula?: string;
    cargo?: string; eps?: string; arl?: string;
  }>({});
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const epsCargando = epsOptions === null;
  const arlCargando = arlOptions === null;

  const guardar = async () => {
    if (!form.nombres?.trim() || !form.apellidos?.trim()) {
      toast.error('Nombres y apellidos son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const res = await operariosApi.crear(terceroId, {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        cedula: form.cedula?.trim() || undefined,
        cargo: form.cargo?.trim() || undefined,
        eps: form.eps?.trim() || undefined,
        arl: form.arl?.trim() || undefined,
      });
      toast.success('Operario agregado');
      onGuardado(res.data);
    } catch (e) {
      console.error('[TercerosTab] Crear operario:', e);
      toast.error(asApiError(e).message ?? 'No se pudo agregar el operario');
    } finally {
      setGuardando(false);
    }
  };

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
          <Input value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} placeholder="Número de cédula" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cargo</Label>
          <Input value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} placeholder="Cosechero, Podador..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> EPS</Label>
          <Select value={form.eps ?? ''} onValueChange={v => set('eps', v)} disabled={epsCargando || (epsOptions?.length ?? 0) === 0}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={epsCargando ? 'Cargando…' : (epsOptions?.length ? 'Seleccionar EPS' : 'Sin catálogo')} />
            </SelectTrigger>
            <SelectContent>
              {[...(epsOptions ?? [])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><HardHat className="h-3 w-3 text-amber-600" /> ARL</Label>
          <Select value={form.arl ?? ''} onValueChange={v => set('arl', v)} disabled={arlCargando || (arlOptions?.length ?? 0) === 0}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={arlCargando ? 'Cargando…' : (arlOptions?.length ? 'Seleccionar ARL' : 'Sin catálogo')} />
            </SelectTrigger>
            <SelectContent>
              {[...(arlOptions ?? [])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 gap-1.5"
          disabled={!form.nombres || !form.apellidos || guardando}
          onClick={guardar}
        >
          <Plus className="h-3.5 w-3.5" /> {guardando ? 'Guardando…' : 'Agregar Operario'}
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TercerosTab() {
  const navigate = useNavigate();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const [loading, setLoading] = useState(true);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  /** Operarios cargados lazy por tercero. Key = tercero_id. */
  const [operariosPorTercero, setOperariosPorTercero] = useState<Record<number, Operario[]>>({});
  const [cargandoOperarios, setCargandoOperarios] = useState<Record<number, boolean>>({});
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [modalOperario, setModalOperario] = useState<{ open: boolean; terceroId: number | null }>({ open: false, terceroId: null });
  /** Bundle wizard-init para alimentar los selects del modal de operario. */
  const [bundle, setBundle] = useState<TerceroWizardInit | null>(null);

  // ── Carga inicial cacheada ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    cached(TercerosCacheKeys.LISTADO, () => tercerosApi.listar({ per_page: 100 }))
      .then((res) => {
        if (cancelado) return;
        setTerceros(res.data);
      })
      .catch((e) => {
        if (cancelado) return;
        console.error('[TercerosTab] Listar terceros:', e);
        toast.error(asApiError(e).message ?? 'No se pudieron cargar los terceros');
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  /** Carga lazy del bundle al abrir por primera vez el modal de operario. */
  const cargarBundleSiHaceFalta = () => {
    if (bundle !== null) return;
    cached(TercerosCacheKeys.WIZARD_INIT, () => tercerosApi.wizardInit())
      .then((res) => setBundle(res.data))
      .catch((e) => {
        console.error('[TercerosTab] wizard-init:', e);
        // No mostramos toast: los selects ya comunican "Sin catálogo" como
        // fallback visual y el formulario sigue siendo usable (nombres y
        // apellidos siguen permitiendo crear el operario).
      });
  };

  /** Carga lazy de operarios la primera vez que se expande un tercero. */
  const cargarOperarios = async (terceroId: number) => {
    if (operariosPorTercero[terceroId]) return;
    setCargandoOperarios((p) => ({ ...p, [terceroId]: true }));
    try {
      const res = await operariosApi.listarPorTercero(terceroId);
      setOperariosPorTercero((p) => ({ ...p, [terceroId]: res.data }));
    } catch (e) {
      console.error('[TercerosTab] Listar operarios:', e);
      toast.error(asApiError(e).message ?? 'No se pudieron cargar los operarios');
    } finally {
      setCargandoOperarios((p) => ({ ...p, [terceroId]: false }));
    }
  };

  const toggleExpandido = (terceroId: number) => {
    const proximoExpandido = expandidoId === terceroId ? null : terceroId;
    setExpandidoId(proximoExpandido);
    if (proximoExpandido !== null) {
      void cargarOperarios(proximoExpandido);
    }
  };

  const abrirModalOperario = (terceroId: number) => {
    cargarBundleSiHaceFalta();
    setModalOperario({ open: true, terceroId });
  };

  const onOperarioGuardado = (terceroId: number, op: Operario) => {
    setOperariosPorTercero((p) => ({
      ...p,
      [terceroId]: [...(p[terceroId] ?? []), op],
    }));
    setModalOperario({ open: false, terceroId: null });
  };

  const eliminarTercero = (t: Tercero) => {
    confirmDelete({
      title: '¿Eliminar tercero?',
      description: `¿Estás seguro de eliminar "${displayNombre(t)}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await tercerosApi.eliminar(t.id);
          invalidate(TercerosCacheKeys.LISTADO);
          setTerceros((prev) => prev.filter((x) => x.id !== t.id));
          setOperariosPorTercero((p) => {
            const copy = { ...p };
            delete copy[t.id];
            return copy;
          });
          if (expandidoId === t.id) setExpandidoId(null);
          toast.success('Tercero eliminado');
        } catch (e) {
          console.error('[TercerosTab] Eliminar tercero:', e);
          const err = asApiError(e);
          if (err.code === TercerosErrorCodes.TERCERO_CON_OPERARIOS) {
            toast.error('No se puede eliminar: el tercero tiene operarios activos');
          } else {
            toast.error(err.message ?? 'No se pudo eliminar el tercero');
          }
        }
      },
    });
  };

  /**
   * Elimina un operario del tercero (§5 del doc). Si el operario tiene
   * jornales o cosechas, el backend devuelve 409 `OPERARIO_CON_JORNALES`
   * y mostramos un mensaje específico.
   */
  const eliminarOperario = (terceroId: number, op: Operario) => {
    const nombreCompleto = `${op.nombres} ${op.apellidos}`.trim() || 'este operario';
    confirmDelete({
      title: '¿Eliminar operario?',
      description: `¿Estás seguro de eliminar "${nombreCompleto}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await operariosApi.eliminar(terceroId, op.id);
          setOperariosPorTercero((p) => ({
            ...p,
            [terceroId]: (p[terceroId] ?? []).filter((x) => x.id !== op.id),
          }));
          toast.success('Operario eliminado');
        } catch (e) {
          console.error('[TercerosTab] Eliminar operario:', e);
          const err = asApiError(e);
          if (err.code === TercerosErrorCodes.OPERARIO_CON_JORNALES) {
            toast.error('No se puede eliminar: el operario tiene jornales o cosechas registradas');
          } else {
            toast.error(err.message ?? 'No se pudo eliminar el operario');
          }
        }
      },
    });
  };

  // Total de operarios cargados — para el subtítulo del card.
  const totalOperariosCargados = Object.values(operariosPorTercero)
    .reduce((sum, arr) => sum + arr.length, 0);

  // Texto del tercero al que se vincula el operario en el modal.
  const terceroDelModal = modalOperario.terceroId !== null
    ? terceros.find(t => t.id === modalOperario.terceroId)
    : undefined;

  const epsOptions = bundle?.eps.map(e => e.nombre) ?? null;
  const arlOptions = bundle?.arl.map(a => a.nombre) ?? null;

  return (
    <>
      {ConfirmDeleteDialog}
      <TabLoadingGate loading={loading} message="Cargando terceros…">
      <Card className="border-border">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1">
                Terceros
                <InfoTooltip text="Empresas o personas naturales externas que prestan servicios en la finca. No son colaboradores directos." />
              </CardTitle>
              <CardDescription>
                {terceros.length} tercero{terceros.length !== 1 ? 's' : ''}
                {totalOperariosCargados > 0 && ` · ${totalOperariosCargados} operario${totalOperariosCargados !== 1 ? 's' : ''} cargado${totalOperariosCargados !== 1 ? 's' : ''}`}
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
              {[...terceros].sort((a, b) => displayNombre(a).localeCompare(displayNombre(b), 'es', { sensitivity: 'base' })).map(t => {
                const ops = operariosPorTercero[t.id] ?? [];
                const cargando = cargandoOperarios[t.id];
                const esNatural = t.tipo_persona === 'NATURAL';
                const expandido = expandidoId === t.id;
                const nombre = displayNombre(t);
                const documento = displayDocumento(t);

                return (
                  <React.Fragment key={t.id}>
                    {/* Fila del tercero */}
                    <div
                      className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${expandido ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                      onClick={() => toggleExpandido(t.id)}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        {esNatural ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{nombre || '(sin nombre)'}</p>
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            {esNatural ? 'Natural' : 'Jurídica'}
                          </Badge>
                          <Badge className={`text-xs ${t.estado ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                            {t.estado ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {esNatural ? 'CC' : 'NIT'} {documento}
                          {t.representante && ` · ${t.representante}`}
                          {t.telefono && ` · ${t.telefono}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {operariosPorTercero[t.id] !== undefined && (
                          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                            {ops.length} operario{ops.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          title="Editar tercero"
                          onClick={() => navigate(`/configuracion/terceros/editar/${t.id}`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar tercero"
                          onClick={() => eliminarTercero(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${expandido ? 'rotate-180 text-primary' : ''}`} />
                    </div>

                    {/* Panel expandido */}
                    {expandido && (
                      <div className="bg-muted/5 px-5 py-5 space-y-5 border-t border-border/50">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <HardHat className="h-4 w-4 text-primary" />
                              Operarios ({ops.length})
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-8"
                              onClick={() => abrirModalOperario(t.id)}
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Agregar Operario
                            </Button>
                          </div>

                          {cargando && (
                            <p className="text-xs text-muted-foreground italic py-1">Cargando operarios…</p>
                          )}

                          {!cargando && ops.length > 0 && (
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
                                    <th className="text-center p-3 font-semibold w-16">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...ops].sort((a, b) => {
                                    const na = `${a.apellidos ?? ''} ${a.nombres ?? ''}`.trim();
                                    const nb = `${b.apellidos ?? ''} ${b.nombres ?? ''}`.trim();
                                    return na.localeCompare(nb, 'es', { sensitivity: 'base' });
                                  }).map((op, i) => (
                                    <tr key={op.id} className={`border-t border-border/50 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {op.nombres?.[0] ?? ''}{op.apellidos?.[0] ?? ''}
                                          </div>
                                          <span className="font-medium">{op.nombres} {op.apellidos}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-muted-foreground">{op.cedula || '—'}</td>
                                      <td className="p-3">{op.cargo || '—'}</td>
                                      <td className="p-3 text-muted-foreground">{op.eps || '—'}</td>
                                      <td className="p-3 text-muted-foreground">{op.arl || '—'}</td>
                                      <td className="p-3 text-center">
                                        <Badge variant="outline" className={`text-xs ${op.estado ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                                          {op.estado ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                      </td>
                                      <td className="p-3 text-center">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                          title="Eliminar operario"
                                          onClick={() => eliminarOperario(t.id, op)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {!cargando && ops.length === 0 && (
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
        <Dialog open={modalOperario.open} onOpenChange={open => !open && setModalOperario({ open: false, terceroId: null })}>
          <DialogContent style={{ width: 'min(600px, 95vw)', maxWidth: 'min(600px, 95vw)' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" /> Nuevo Operario
              </DialogTitle>
              <DialogDescription>
                Operario vinculado a {terceroDelModal ? displayNombre(terceroDelModal) : 'este tercero'}
              </DialogDescription>
            </DialogHeader>
            {modalOperario.terceroId !== null && (
              <FormOperario
                terceroId={modalOperario.terceroId}
                epsOptions={epsOptions}
                arlOptions={arlOptions}
                onGuardado={(op) => onOperarioGuardado(modalOperario.terceroId!, op)}
                onCancelar={() => setModalOperario({ open: false, terceroId: null })}
              />
            )}
          </DialogContent>
        </Dialog>
      </Card>
      </TabLoadingGate>
    </>
  );
}
