import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { Eye, Loader2, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { requestConToken } from '../../../api/request';
import { formatFechaHora } from '../../utils/fecha';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import PageHeader from '../../components/common/PageHeader';
import StatStrip from '../../components/common/StatStrip';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PasswordField from '../auth/PasswordField';
import { num } from '../../lib/formato';

type RolTenant = 'ADMIN';

interface TenantInfo {
  id: number;
  nombre: string;
  nit: string;
  estado: string;
  plan: string;
}

interface TenantUser {
  id: number;
  name: string;
  email: string;
  /** Estado global del usuario, no el de esta finca. */
  status: boolean;
  rol: RolTenant | string;
  /** Estado de la asignación a esta finca. */
  estado: boolean;
  asignado_at?: string;
}

interface GlobalUserOption {
  id: number;
  name: string;
  email: string;
}

interface TenantUsersResponse { data?: unknown[] }
interface TenantDetailResponse { data?: Record<string, unknown> }
interface LaravelPagination<T> { data?: T[] }

const ROLES: RolTenant[] = ['ADMIN'];

function aNumero(valor: unknown, porDefecto = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function aBooleano(valor: unknown, porDefecto = false) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 'activo', 'activa'].includes(v)) return true;
    if (['0', 'false', 'no', 'inactivo', 'inactiva'].includes(v)) return false;
  }
  return porDefecto;
}

function normalizarTenant(raw: Record<string, unknown> | undefined): TenantInfo {
  const r = raw ?? {};
  return {
    id: aNumero(r.id),
    nombre: String(r.nombre ?? ''),
    nit: String(r.nit ?? ''),
    estado: String(r.estado ?? 'ACTIVO'),
    plan: String(r.plan ?? '—'),
  };
}

function normalizarUsuario(raw: unknown): TenantUser {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: aNumero(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    status: aBooleano(r.status, true),
    rol: String(r.rol ?? 'ADMIN'),
    estado: aBooleano(r.estado, true),
    asignado_at: r.asignado_at ? String(r.asignado_at) : '',
  };
}

const FORM_CREAR_VACIO = {
  user_id: '',
  email: '',
  name: '',
  password: '',
  password_confirmation: '',
  rol: 'ADMIN' as RolTenant,
};

const FORM_EDITAR_VACIO = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  rol: 'ADMIN' as RolTenant,
  estado: true,
};

/** Un dato del detalle. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function UsuariosFinca() {
  const { tenantId } = useParams();
  const { token } = useAuth();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [usuarios, setUsuarios] = useState<TenantUser[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modo, setModo] = useState<'crear' | 'editar'>('crear');
  const [origenAsignacion, setOrigenAsignacion] = useState<'existente' | 'nuevo'>('nuevo');
  const [guardando, setGuardando] = useState(false);

  const [seleccionado, setSeleccionado] = useState<TenantUser | null>(null);
  const [detalle, setDetalle] = useState<TenantUser | null>(null);
  const [formCrear, setFormCrear] = useState(FORM_CREAR_VACIO);
  const [formEditar, setFormEditar] = useState(FORM_EDITAR_VACIO);

  const [usuariosGlobales, setUsuariosGlobales] = useState<GlobalUserOption[]>([]);
  const [cargandoGlobales, setCargandoGlobales] = useState(false);

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

  const cerrarConfirmacion = () => setConfirmacion((prev) => ({ ...prev, open: false }));

  const cargarTenant = useCallback(async () => {
    if (!token || !tenantId) return;
    try {
      const res = await requestConToken<TenantDetailResponse>(
        `/api/v1/admin/tenants/${tenantId}`,
        { method: 'GET' },
        token,
      );
      setTenant(normalizarTenant(res.data));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la finca');
    }
  }, [tenantId, token]);

  const cargarUsuarios = useCallback(async () => {
    if (!token || !tenantId) return;
    setCargandoUsuarios(true);
    try {
      const res = await requestConToken<TenantUsersResponse>(
        `/api/v1/admin/tenants/${tenantId}/users`,
        { method: 'GET' },
        token,
      );
      const items = Array.isArray(res.data) ? res.data : [];
      setUsuarios(items.map(normalizarUsuario));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios de la finca');
      setUsuarios([]);
    } finally {
      setCargandoUsuarios(false);
    }
  }, [tenantId, token]);

  const cargarUsuariosGlobales = useCallback(async () => {
    if (!token) return;
    setCargandoGlobales(true);
    try {
      const res = await requestConToken<LaravelPagination<Record<string, unknown>>>(
        '/api/v1/admin/users?per_page=100&status=true',
        { method: 'GET' },
        token,
      );
      const items = Array.isArray(res.data) ? res.data : [];
      setUsuariosGlobales(items.map((item) => ({
        id: aNumero(item?.id),
        name: String(item?.name ?? ''),
        email: String(item?.email ?? ''),
      })));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios globales');
    } finally {
      setCargandoGlobales(false);
    }
  }, [token]);

  useEffect(() => {
    void cargarTenant();
    void cargarUsuarios();
  }, [cargarTenant, cargarUsuarios]);

  const abrirCrear = async () => {
    setModo('crear');
    setOrigenAsignacion('nuevo');
    setFormCrear(FORM_CREAR_VACIO);
    setSeleccionado(null);
    setModalAbierto(true);
    await cargarUsuariosGlobales();
  };

  const abrirEditar = (usuario: TenantUser) => {
    setModo('editar');
    setSeleccionado(usuario);
    setFormEditar({
      name: usuario.name,
      email: usuario.email,
      password: '',
      password_confirmation: '',
      rol: (usuario.rol as RolTenant) || 'ADMIN',
      estado: usuario.estado,
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setSeleccionado(null);
    setFormCrear(FORM_CREAR_VACIO);
    setFormEditar(FORM_EDITAR_VACIO);
  };

  const filtrados = usuarios.filter((usuario) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return (
      usuario.name.toLowerCase().includes(termino) ||
      usuario.email.toLowerCase().includes(termino) ||
      String(usuario.rol).toLowerCase().includes(termino)
    );
  });

  const activos = usuarios.filter((u) => u.estado).length;
  const inactivos = usuarios.length - activos;
  const globalesInactivos = usuarios.filter((u) => !u.status).length;

  const crear = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    let payload: Record<string, unknown>;

    if (origenAsignacion === 'existente') {
      if (!formCrear.user_id) {
        toast.error('Selecciona un usuario existente');
        return;
      }
      payload = { user_id: Number(formCrear.user_id), rol: formCrear.rol };
    } else {
      if (!formCrear.email.trim() || !formCrear.name.trim() || !formCrear.password.trim()) {
        toast.error('Completa nombre, correo y contraseña');
        return;
      }
      if (formCrear.password.trim().length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (formCrear.password !== formCrear.password_confirmation) {
        toast.error('Las contraseñas no coinciden. Escríbela igual en ambos campos.');
        return;
      }
      payload = {
        email: formCrear.email.trim(),
        name: formCrear.name.trim(),
        password: formCrear.password.trim(),
        rol: formCrear.rol,
      };
    }

    setGuardando(true);
    try {
      const res = await requestConToken<{ message?: string }>(
        `/api/v1/admin/tenants/${tenantId}/users`,
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      );
      toast.success(res.message ?? 'Usuario asignado a la finca correctamente');
      cerrarModal();
      await cargarUsuarios();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo agregar el usuario a la finca');
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !tenantId || !seleccionado) return;

    const payload: Record<string, unknown> = {
      name: formEditar.name.trim(),
      email: formEditar.email.trim(),
      rol: formEditar.rol,
      estado: formEditar.estado,
    };

    // La contraseña es opcional al editar. Si se escribe, se exige confirmación.
    if (formEditar.password.trim()) {
      if (formEditar.password.trim().length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (formEditar.password !== formEditar.password_confirmation) {
        toast.error('Las contraseñas no coinciden. Escríbela igual en ambos campos.');
        return;
      }
      payload.password = formEditar.password.trim();
    }

    setGuardando(true);
    try {
      const res = await requestConToken<{ message?: string }>(
        `/api/v1/admin/tenants/${tenantId}/users/${seleccionado.id}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        token,
      );
      toast.success(res.message ?? 'Asignación actualizada correctamente');
      cerrarModal();
      await cargarUsuarios();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la asignación');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = (usuario: TenantUser) => {
    if (!token || !tenantId) return;
    const accion = usuario.estado ? 'desactivar' : 'activar';
    pedirConfirmacion(
      `${accion.charAt(0).toUpperCase()}${accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a "${usuario.name}" en esta finca?`,
      'warning',
      async () => {
        try {
          const res = await requestConToken<{ message?: string }>(
            `/api/v1/admin/tenants/${tenantId}/users/${usuario.id}`,
            { method: 'PUT', body: JSON.stringify({ estado: !usuario.estado }) },
            token,
          );
          toast.success(res.message ?? `Usuario ${accion}do correctamente`);
          cerrarConfirmacion();
          await cargarUsuarios();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
        }
      },
    );
  };

  const remover = (usuario: TenantUser) => {
    if (!token || !tenantId) return;
    pedirConfirmacion(
      'Remover usuario',
      `¿Seguro que deseas remover a "${usuario.name}" de esta finca?`,
      'danger',
      async () => {
        try {
          const res = await requestConToken<{ message?: string }>(
            `/api/v1/admin/tenants/${tenantId}/users/${usuario.id}`,
            { method: 'DELETE' },
            token,
          );
          toast.success(res.message ?? 'Usuario removido de la finca');
          cerrarConfirmacion();
          await cargarUsuarios();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo remover el usuario');
        }
      },
    );
  };

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Super admin" title="Usuarios de la finca" backTo="/super-admin/fincas" />
        <p className="text-sm text-destructive">La finca indicada no es válida.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tenant ? `Finca · NIT ${tenant.nit || '—'}` : 'Super admin'}
        title={tenant?.nombre ? `Usuarios de ${tenant.nombre}` : 'Usuarios de la finca'}
        description="Quién tiene acceso a esta finca y con qué rol."
        backTo="/super-admin/fincas"
        actions={
          <Button onClick={() => void abrirCrear()}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Agregar usuario
          </Button>
        }
      />

      <StatStrip
        loading={cargandoUsuarios}
        items={[
          { label: 'Usuarios asignados', value: num(usuarios.length), note: 'con acceso a esta finca' },
          { label: 'Asignaciones activas', value: num(activos) },
          { label: 'Asignaciones inactivas', value: num(inactivos) },
          { label: 'Cuentas inactivas', value: num(globalesInactivos), note: 'desactivadas en todo el sistema' },
        ]}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        <Input
          aria-label="Buscar usuarios"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo o rol"
          className="pl-9"
        />
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-[13px] text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Usuario</th>
                <th className="px-4 py-2.5 text-left font-semibold">Rol</th>
                <th className="px-4 py-2.5 text-left font-semibold">Asignación</th>
                <th className="px-4 py-2.5 text-left font-semibold">Cuenta</th>
                <th className="px-4 py-2.5 text-right font-semibold">Asignado</th>
                <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargandoUsuarios ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando usuarios…
                    </span>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      title="No hay usuarios para mostrar"
                      description={busqueda.trim()
                        ? 'Ningún usuario coincide con la búsqueda.'
                        : 'Esta finca todavía no tiene usuarios asignados.'}
                      action={busqueda.trim()
                        ? { label: 'Quitar búsqueda', onClick: () => setBusqueda('') }
                        : { label: 'Agregar usuario', onClick: () => void abrirCrear() }}
                    />
                  </td>
                </tr>
              ) : (
                filtrados.map((usuario) => (
                  <tr key={usuario.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setDetalle(usuario)}
                        className="block text-left font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {usuario.name || 'Sin nombre'}
                      </button>
                      <span className="block text-xs text-muted-foreground">{usuario.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{usuario.rol}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={usuario.estado ? 'success' : 'destructive'}>
                        {usuario.estado ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={usuario.status ? 'info' : 'warning'}>
                        {usuario.status ? 'Habilitada' : 'Deshabilitada'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                      {usuario.asignado_at ? formatFechaHora(usuario.asignado_at) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
                        <Button variant="ghost" size="icon" title="Ver detalle" onClick={() => setDetalle(usuario)}>
                          <Eye className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(usuario)}>
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={usuario.estado ? 'Desactivar en esta finca' : 'Activar en esta finca'}
                          onClick={() => alternarEstado(usuario)}
                        >
                          {usuario.estado
                            ? <Pause className="h-4 w-4" strokeWidth={2} />
                            : <Play className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Remover de la finca"
                          className="hover:text-destructive"
                          onClick={() => remover(usuario)}
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
      </Card>

      <Dialog open={modalAbierto} onOpenChange={(abierto) => !abierto && cerrarModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modo === 'crear' ? 'Agregar usuario' : 'Editar asignación'}</DialogTitle>
            <DialogDescription>
              {modo === 'crear'
                ? 'Asigna un usuario que ya existe o crea uno nuevo para esta finca.'
                : 'Cambia los datos del usuario y su acceso a esta finca.'}
            </DialogDescription>
          </DialogHeader>

          {modo === 'crear' ? (
            <form onSubmit={crear} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={origenAsignacion === 'nuevo' ? 'default' : 'outline'}
                  onClick={() => setOrigenAsignacion('nuevo')}
                >
                  Usuario nuevo
                </Button>
                <Button
                  type="button"
                  variant={origenAsignacion === 'existente' ? 'default' : 'outline'}
                  onClick={() => setOrigenAsignacion('existente')}
                >
                  Usuario existente
                </Button>
              </div>

              {origenAsignacion === 'existente' ? (
                <div className="space-y-2">
                  <Label htmlFor="usuario-existente">Usuario</Label>
                  <Select
                    value={formCrear.user_id}
                    onValueChange={(v) => setFormCrear((f) => ({ ...f, user_id: v }))}
                  >
                    <SelectTrigger id="usuario-existente">
                      <SelectValue placeholder={cargandoGlobales ? 'Cargando usuarios…' : 'Selecciona un usuario'} />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosGlobales.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} · {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="usuario-nombre">Nombre</Label>
                    <Input
                      id="usuario-nombre"
                      value={formCrear.name}
                      onChange={(e) => setFormCrear((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usuario-correo">Correo electrónico</Label>
                    <Input
                      id="usuario-correo"
                      type="email"
                      value={formCrear.email}
                      onChange={(e) => setFormCrear((f) => ({ ...f, email: e.target.value }))}
                      placeholder="usuario@correo.com"
                    />
                  </div>
                  <PasswordField
                    id="usuario-password"
                    label="Contraseña"
                    value={formCrear.password}
                    onChange={(v) => setFormCrear((f) => ({ ...f, password: v }))}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="usuario-password-confirmacion"
                    label="Confirmar contraseña"
                    value={formCrear.password_confirmation}
                    onChange={(v) => setFormCrear((f) => ({ ...f, password_confirmation: v }))}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="usuario-rol">Rol en la finca</Label>
                <Select
                  value={formCrear.rol}
                  onValueChange={(v) => setFormCrear((f) => ({ ...f, rol: v as RolTenant }))}
                >
                  <SelectTrigger id="usuario-rol"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((rol) => <SelectItem key={rol} value={rol}>{rol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={guardando}>Guardar</Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={editar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editar-nombre">Nombre</Label>
                <Input
                  id="editar-nombre"
                  value={formEditar.name}
                  onChange={(e) => setFormEditar((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editar-correo">Correo electrónico</Label>
                <Input
                  id="editar-correo"
                  type="email"
                  value={formEditar.email}
                  onChange={(e) => setFormEditar((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <PasswordField
                id="editar-password"
                label="Contraseña nueva"
                value={formEditar.password}
                onChange={(v) => setFormEditar((f) => ({ ...f, password: v }))}
                placeholder="Déjala vacía para no cambiarla"
                autoComplete="new-password"
              />
              {formEditar.password.trim() !== '' && (
                <PasswordField
                  id="editar-password-confirmacion"
                  label="Confirmar contraseña"
                  value={formEditar.password_confirmation}
                  onChange={(v) => setFormEditar((f) => ({ ...f, password_confirmation: v }))}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="editar-rol">Rol en la finca</Label>
                <Select
                  value={formEditar.rol}
                  onValueChange={(v) => setFormEditar((f) => ({ ...f, rol: v as RolTenant }))}
                >
                  <SelectTrigger id="editar-rol"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((rol) => <SelectItem key={rol} value={rol}>{rol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editar-estado">Asignación</Label>
                <Select
                  value={formEditar.estado ? 'activa' : 'inactiva'}
                  onValueChange={(v) => setFormEditar((f) => ({ ...f, estado: v === 'activa' }))}
                >
                  <SelectTrigger id="editar-estado"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="inactiva">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={guardando}>Guardar cambios</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detalle !== null} onOpenChange={(abierto) => !abierto && setDetalle(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detalle?.name || 'Usuario'}</DialogTitle>
            <DialogDescription>{detalle?.email}</DialogDescription>
          </DialogHeader>

          {detalle && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Dato label="ID">{detalle.id}</Dato>
              <Dato label="Rol"><Badge variant="secondary">{detalle.rol}</Badge></Dato>
              <Dato label="Asignación">
                <Badge variant={detalle.estado ? 'success' : 'destructive'}>
                  {detalle.estado ? 'Activa' : 'Inactiva'}
                </Badge>
              </Dato>
              <Dato label="Cuenta">
                <Badge variant={detalle.status ? 'info' : 'warning'}>
                  {detalle.status ? 'Habilitada' : 'Deshabilitada'}
                </Badge>
              </Dato>
              <div className="sm:col-span-2">
                <Dato label="Asignado">
                  {detalle.asignado_at ? formatFechaHora(detalle.asignado_at) : '—'}
                </Dato>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

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
