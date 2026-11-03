import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Eye, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, Star, Store, Trash2, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CrearProveedorModal, {
  type ProveedorFormData,
} from '../../components/super-admin/CrearProveedorModal';
import {
  marketProveedoresAdminApi,
  type ProveedorAdmin,
  type EstadoProveedor,
  type ProveedorPayload,
} from '../../../api/marketProveedoresAdmin';
import { num } from '../../lib/formato';

const POR_PAGINA = 10;

function aNumero(valor: unknown, porDefecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

const VARIANTE_ESTADO: Record<EstadoProveedor, 'success' | 'warning' | 'destructive'> = {
  activo: 'success',
  suspendido: 'warning',
  inactivo: 'destructive',
};

function proveedorAFormulario(p: ProveedorAdmin | null): ProveedorFormData | null {
  if (!p) return null;
  return {
    nombre_empresa: p.nombre_empresa,
    nit: p.nit ?? '',
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    ciudad: p.ciudad,
    departamento: p.departamento,
    descripcion: p.descripcion ?? '',
    logo_url: p.logo_url ?? '',
  };
}

function armarPayload(data: ProveedorFormData): ProveedorPayload {
  const payload: ProveedorPayload = {
    nombre_empresa: data.nombre_empresa.trim(),
    telefono: data.telefono.trim(),
    email: data.email.trim(),
    direccion: data.direccion.trim(),
    ciudad: data.ciudad.trim(),
    departamento: data.departamento.trim(),
  };
  if (data.nit.trim()) payload.nit = data.nit.trim();
  if (data.descripcion.trim()) payload.descripcion = data.descripcion.trim();
  if (data.logo_url.trim()) payload.logo_url = data.logo_url.trim();
  return payload;
}

export default function Proveedores() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoId, setCargandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoProveedor>('TODOS');

  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const [resumen, setResumen] = useState({ total: 0, activos: 0, suspendidos: 0, inactivos: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ProveedorAdmin | null>(null);

  const [confirmacion, setConfirmacion] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'warning' | 'danger';
    onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const pedirConfirmacion = (
    title: string,
    description: string,
    variant: 'warning' | 'danger',
    onConfirm: () => Promise<void>,
  ) => setConfirmacion({ open: true, title, description, variant, onConfirm });

  const cerrarConfirmacion = () => setConfirmacion((p) => ({ ...p, open: false }));

  const cargarProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketProveedoresAdminApi.listar({
        buscar: busqueda.trim() || undefined,
        estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
        sort_by: 'nombre_empresa',
        sort_dir: 'asc',
        per_page: POR_PAGINA,
        page: pagina,
      });
      setProveedores(res.data ?? []);
      setUltimaPagina(aNumero(res.last_page, 1));
      setTotal(aNumero(res.total, 0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores');
      setProveedores([]);
      setUltimaPagina(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroEstado, pagina]);

  // El resumen se calcula sobre todos los proveedores, sin los filtros de la tabla.
  const cargarResumen = useCallback(async () => {
    try {
      const res = await marketProveedoresAdminApi.listar({ per_page: 1000 });
      const todos = res.data ?? [];
      setResumen({
        total: todos.length,
        activos: todos.filter((p) => p.estado === 'activo').length,
        suspendidos: todos.filter((p) => p.estado === 'suspendido').length,
        inactivos: todos.filter((p) => p.estado === 'inactivo').length,
      });
    } catch {
      /* el resumen es secundario: la tabla ya avisa si algo falló */
    }
  }, []);

  useEffect(() => { void cargarResumen(); }, [cargarResumen]);

  useEffect(() => {
    const t = window.setTimeout(() => { void cargarProveedores(); }, 250);
    return () => window.clearTimeout(t);
  }, [cargarProveedores]);

  const recargar = async () => {
    await Promise.all([cargarResumen(), cargarProveedores()]);
    toast.success('Listado actualizado');
  };

  const abrirCrear = () => { setSeleccionado(null); setModalAbierto(true); };

  const abrirEditar = async (id: number) => {
    setCargandoId(id);
    try {
      const res = await marketProveedoresAdminApi.ver(id);
      setSeleccionado(res.data);
      setModalAbierto(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el proveedor');
    } finally {
      setCargandoId(null);
    }
  };

  const guardar = async (form: ProveedorFormData) => {
    setGuardando(true);
    try {
      if (seleccionado) {
        const res = await marketProveedoresAdminApi.actualizar(seleccionado.id, armarPayload(form));
        toast.success(res.message ?? 'Proveedor actualizado');
      } else {
        const res = await marketProveedoresAdminApi.crear(armarPayload(form));
        toast.success(res.message ?? 'Proveedor creado');
      }
      setModalAbierto(false);
      setSeleccionado(null);
      await Promise.all([cargarResumen(), cargarProveedores()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = (p: ProveedorAdmin) => {
    const accion = p.estado === 'activo' ? 'suspender' : 'activar';
    pedirConfirmacion(
      `${accion.charAt(0).toUpperCase()}${accion.slice(1)} proveedor`,
      `¿Seguro que deseas ${accion} "${p.nombre_empresa}"?`,
      'warning',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.toggleEstado(p.id);
          toast.success(res.message ?? 'Estado actualizado');
          cerrarConfirmacion();
          await Promise.all([cargarResumen(), cargarProveedores()]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
        }
      },
    );
  };

  const eliminar = (p: ProveedorAdmin) => {
    if (p.estado === 'activo') {
      toast.error('Suspende el proveedor antes de eliminarlo');
      return;
    }
    pedirConfirmacion(
      'Eliminar proveedor',
      `¿Seguro que deseas eliminar "${p.nombre_empresa}"? Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.eliminar(p.id);
          toast.success(res.message ?? 'Proveedor eliminado');
          cerrarConfirmacion();
          // Si era el último de la página, la página deja de existir.
          if (pagina > 1 && proveedores.length === 1) {
            setPagina((prev) => Math.max(1, prev - 1));
            await cargarResumen();
          } else {
            await Promise.all([cargarResumen(), cargarProveedores()]);
          }
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code === 'PROVIDER_ACTIVE') {
            toast.error('Suspende el proveedor antes de eliminarlo');
          } else {
            toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el proveedor');
          }
        }
      },
    );
  };

  const hayFiltros = busqueda.trim() !== '' || filtroEstado !== 'TODOS';
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super admin"
        title="Proveedores"
        description="Empresas proveedoras del marketplace."
        actions={
          <>
            <Button variant="outline" onClick={() => void recargar()} disabled={loading}>
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
              Recargar
            </Button>
            <Button onClick={abrirCrear}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo proveedor
            </Button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: 'Proveedores', value: num(resumen.total), note: 'registrados en el marketplace' },
          { label: 'Activos', value: num(resumen.activos) },
          { label: 'Suspendidos', value: num(resumen.suspendidos) },
          { label: 'Inactivos', value: num(resumen.inactivos) },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <Input
            aria-label="Buscar proveedores"
            value={busqueda}
            onChange={(e) => { setPagina(1); setBusqueda(e.target.value); }}
            placeholder="Buscar por empresa, NIT o correo"
            className="pl-9"
          />
        </div>
        <Select
          value={filtroEstado}
          onValueChange={(v) => { setPagina(1); setFiltroEstado(v as 'TODOS' | EstadoProveedor); }}
        >
          <SelectTrigger aria-label="Estado" className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="suspendido">Suspendidos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="px-5 py-3.5">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{desde}-{hasta}</span> de{' '}
            <span className="font-medium text-foreground">{num(total)}</span> proveedores
          </p>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/60 text-[13px] text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Empresa</th>
                <th className="px-4 py-2.5 text-left font-semibold">Contacto</th>
                <th className="px-4 py-2.5 text-left font-semibold">Ubicación</th>
                <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Calificación</th>
                <th className="px-4 py-2.5 text-right font-semibold">Productos</th>
                <th className="px-4 py-2.5 text-right font-semibold">Pedidos</th>
                <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando proveedores…
                    </span>
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      title="No se encontraron proveedores"
                      description={hayFiltros
                        ? 'Ningún proveedor coincide con la búsqueda.'
                        : 'Todavía no hay proveedores en el marketplace.'}
                      action={hayFiltros
                        ? { label: 'Quitar filtros', onClick: () => { setBusqueda(''); setFiltroEstado('TODOS'); setPagina(1); } }
                        : { label: 'Nuevo proveedor', onClick: abrirCrear }}
                    />
                  </td>
                </tr>
              ) : (
                proveedores.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-primary-soft text-primary">
                          {p.logo_url
                            ? <img src={p.logo_url} alt="" className="h-full w-full object-cover" />
                            : <Store className="h-4 w-4" strokeWidth={2} />}
                        </span>
                        <span className="min-w-0">
                          <button
                            type="button"
                            onClick={() => void abrirEditar(p.id)}
                            className="block truncate text-left font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {p.nombre_empresa}
                          </button>
                          <span className="block text-xs text-muted-foreground">
                            ID {p.id} · NIT {p.nit || '—'}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-foreground">{p.email || '—'}</span>
                      <span className="block text-xs text-muted-foreground">{p.telefono || 'Sin teléfono'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-foreground">
                        {p.ciudad || '—'}{p.departamento ? `, ${p.departamento}` : ''}
                      </span>
                      <span className="block text-xs text-muted-foreground">{p.direccion || 'Sin dirección'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={VARIANTE_ESTADO[p.estado]} className="capitalize">{p.estado}</Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {Number(p.calificacion_promedio ?? 0).toFixed(2)}
                      </span>
                      <span className="block text-xs text-muted-foreground">{num(p.total_ventas ?? 0)} ventas</span>
                    </td>

                    <td className="px-4 py-3 text-right text-foreground">{num(p.total_productos ?? 0)}</td>

                    <td className="px-4 py-3 text-right">
                      <span className="block text-foreground">{num(p.total_pedidos ?? 0)}</span>
                      <span className="block text-xs text-muted-foreground">{num(p.total_usuarios ?? 0)} usuarios</span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
                        <Button
                          variant="ghost" size="icon" title="Ver y editar"
                          onClick={() => void abrirEditar(p.id)}
                          disabled={cargandoId === p.id}
                        >
                          {cargandoId === p.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Eye className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Usuarios del proveedor"
                          onClick={() => navigate(`/super-admin/proveedores/${p.id}/usuarios`)}
                        >
                          <Users className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Editar"
                          onClick={() => void abrirEditar(p.id)}
                          disabled={cargandoId === p.id}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={p.estado === 'activo' ? 'Suspender' : 'Activar'}
                          onClick={() => alternarEstado(p)}
                        >
                          {p.estado === 'activo'
                            ? <Pause className="h-4 w-4" strokeWidth={2} />
                            : <Play className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="hover:text-destructive"
                          title={p.estado === 'activo' ? 'Suspende primero' : 'Eliminar'}
                          onClick={() => eliminar(p)}
                          disabled={p.estado === 'activo'}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {ultimaPagina > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">Página {pagina} de {ultimaPagina}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline"
                disabled={loading || pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anteriores
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={loading || pagina >= ultimaPagina}
                onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
              >
                Siguientes
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CrearProveedorModal
        isOpen={modalAbierto}
        onClose={() => {
          if (guardando) return;
          setModalAbierto(false);
          setSeleccionado(null);
        }}
        onSave={guardar}
        proveedorData={proveedorAFormulario(seleccionado)}
        isEdit={Boolean(seleccionado)}
        isSaving={guardando}
      />

      <ConfirmDialog
        open={confirmacion.open}
        onClose={cerrarConfirmacion}
        onConfirm={confirmacion.onConfirm}
        title={confirmacion.title}
        description={confirmacion.description}
        variant={confirmacion.variant}
      />
    </div>
  );
}
