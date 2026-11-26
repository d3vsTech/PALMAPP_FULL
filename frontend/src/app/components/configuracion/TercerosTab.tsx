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
import { sortByFirstName } from '../../utils/personas';
import { Button } from '../ui/button';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import { cn } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  Plus, Building2, User, UserPlus, ChevronDown,
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombres <span className="text-destructive">*</span></Label>
          <Input value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} placeholder="Nombres" />
        </div>
        <div className="space-y-2">
          <Label>Apellidos <span className="text-destructive">*</span></Label>
          <Input value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} placeholder="Apellidos" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tercerosta-cedula">Cédula</Label>
          <Input id="tercerosta-cedula" value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} placeholder="Número de cédula" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tercerosta-cargo">Cargo</Label>
          <Input id="tercerosta-cargo" value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} placeholder="Cosechero, podador..." />
        </div>
        <div className="space-y-2">
          <Label>EPS</Label>
          <Select value={form.eps ?? ''} onValueChange={v => set('eps', v)} disabled={epsCargando || (epsOptions?.length ?? 0) === 0}>
            <SelectTrigger>
              <SelectValue placeholder={epsCargando ? 'Cargando…' : (epsOptions?.length ? 'Seleccionar EPS' : 'Sin catálogo')} />
            </SelectTrigger>
            <SelectContent>
              {[...(epsOptions ?? [])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ARL</Label>
          <Select value={form.arl ?? ''} onValueChange={v => set('arl', v)} disabled={arlCargando || (arlOptions?.length ?? 0) === 0}>
            <SelectTrigger>
              <SelectValue placeholder={arlCargando ? 'Cargando…' : (arlOptions?.length ? 'Seleccionar ARL' : 'Sin catálogo')} />
            </SelectTrigger>
            <SelectContent>
              {[...(arlOptions ?? [])].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button
          disabled={!form.nombres || !form.apellidos || guardando}
          onClick={guardar}
        >
          <Plus strokeWidth={2} /> {guardando ? 'Guardando…' : 'Agregar operario'}
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
      <ConfigSection
        title={
          <span className="inline-flex items-center gap-1">
            Terceros
            <InfoTooltip text="Empresas o personas naturales externas que prestan servicios en la finca. No son colaboradores directos." />
          </span>
        }
        description={
          <>
            {terceros.length} tercero{terceros.length !== 1 ? 's' : ''}
            {totalOperariosCargados > 0 && ` · ${totalOperariosCargados} operario${totalOperariosCargados !== 1 ? 's' : ''} cargado${totalOperariosCargados !== 1 ? 's' : ''}`}
          </>
        }
        flush
        actions={
          <Button onClick={() => navigate('/configuracion/terceros/nuevo')}>
            <Plus strokeWidth={2} />
            Nuevo tercero
          </Button>
        }
      >
        {terceros.length === 0 ? (
          <ConfigEmpty
            title="Sin terceros registrados"
            description="Agrega las empresas o personas que prestan servicios en la finca."
            action={
              <Button onClick={() => navigate('/configuracion/terceros/nuevo')}>
                <Plus strokeWidth={2} />
                Agregar tercero
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {[...terceros].sort((a, b) => {
              // NATURAL: por primer nombre. JURIDICA: por razon social.
              // Mixto: naturales primero, luego juridicas.
              const aName = a.tipo_persona === 'NATURAL'
                ? (a.nombre_completo ?? '').trim().split(/\s+/)[0] ?? ''
                : displayNombre(a);
              const bName = b.tipo_persona === 'NATURAL'
                ? (b.nombre_completo ?? '').trim().split(/\s+/)[0] ?? ''
                : displayNombre(b);
              return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
            }).map(t => {
              const ops = operariosPorTercero[t.id] ?? [];
              const cargando = cargandoOperarios[t.id];
              const esNatural = t.tipo_persona === 'NATURAL';
              const expandido = expandidoId === t.id;
              const nombre = displayNombre(t);
              const documento = displayDocumento(t);

              return (
                <li key={t.id}>
                  {/* Fila del tercero */}
                  <div
                    className={cn(
                      'flex items-center gap-3 py-3 pl-5 pr-3 transition-colors',
                      expandido ? 'bg-muted/40' : 'hover:bg-muted/40',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandido(t.id)}
                      aria-expanded={expandido}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        {esNatural
                          ? <User className="h-4 w-4" strokeWidth={2} />
                          : <Building2 className="h-4 w-4" strokeWidth={2} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-foreground">{nombre || '(sin nombre)'}</span>
                          <Badge variant="outline">{esNatural ? 'Natural' : 'Jurídica'}</Badge>
                          <Badge variant={t.estado ? 'success' : 'secondary'}>
                            {t.estado ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {esNatural ? 'CC' : 'NIT'} {documento}
                          {t.representante && ` · ${t.representante}`}
                          {t.telefono && ` · ${t.telefono}`}
                          {operariosPorTercero[t.id] !== undefined &&
                            ` · ${ops.length} operario${ops.length !== 1 ? 's' : ''}`}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          expandido && 'rotate-180',
                        )}
                        strokeWidth={2}
                      />
                    </button>
                    <ConfigRowActions
                      label={nombre || 'tercero'}
                      onEdit={() => navigate(`/configuracion/terceros/editar/${t.id}`)}
                      onDelete={() => eliminarTercero(t)}
                    />
                  </div>

                  {/* Panel expandido */}
                  {expandido && (
                    <div className="border-t border-border bg-muted/40 px-5 py-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[13px] font-medium text-muted-foreground">
                          Operarios ({ops.length})
                        </p>
                        <Button size="sm" variant="outline" onClick={() => abrirModalOperario(t.id)}>
                          <UserPlus strokeWidth={2} />
                          Agregar operario
                        </Button>
                      </div>

                      {cargando && (
                        <p className="text-sm text-muted-foreground">Cargando operarios…</p>
                      )}

                      {!cargando && ops.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-border bg-card">
                          <Table className="min-w-[640px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Cédula</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead>EPS</TableHead>
                                <TableHead>ARL</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                                <TableHead className="w-12" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortByFirstName(ops).map((op) => (
                                <TableRow key={op.id}>
                                  <TableCell>
                                    <span className="font-medium text-foreground">
                                      {op.nombres} {op.apellidos}
                                    </span>
                                  </TableCell>
                                  <TableCell className="tabular-nums text-muted-foreground">
                                    {op.cedula || '—'}
                                  </TableCell>
                                  <TableCell>{op.cargo || '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{op.eps || '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{op.arl || '—'}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={op.estado ? 'success' : 'secondary'}>
                                      {op.estado ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="pr-2 text-right">
                                    <ConfigRowActions
                                      label={`${op.nombres} ${op.apellidos}`}
                                      onDelete={() => eliminarOperario(t.id, op)}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {!cargando && ops.length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin operarios registrados.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ConfigSection>

      {/* Modal agregar operario */}
      <Dialog open={modalOperario.open} onOpenChange={open => !open && setModalOperario({ open: false, terceroId: null })}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo operario</DialogTitle>
            <DialogDescription>
              Operario vinculado a {terceroDelModal ? displayNombre(terceroDelModal) : 'este tercero'}.
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
      </TabLoadingGate>
    </>
  );
}
