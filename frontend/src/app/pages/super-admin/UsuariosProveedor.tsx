/**
 * "Usuarios por proveedor" del super admin.
 *
 * Endpoints:
 *   GET    /api/v1/admin/market/proveedores/{id}
 *   GET    /api/v1/admin/market/proveedores/{id}/usuarios
 *   POST   /api/v1/admin/market/proveedores/{id}/usuarios
 *   PUT    /api/v1/admin/market/proveedores/{id}/usuarios/{userId}
 *   DELETE /api/v1/admin/market/proveedores/{id}/usuarios/{userId}
 *
 * El modal de creación trabaja de dos formas: crea un usuario nuevo y lo
 * vincula, o asigna uno que ya existe en el sistema.
 *
 * Reglas del backend: los roles son ADMIN y OPERADOR; responde 409
 * USER_ALREADY_ASSIGNED si el usuario ya está activo en el proveedor, y 200
 * con "Usuario reactivado…" si la vinculación existía desactivada.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { Eye, Loader2, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  marketProveedoresAdminApi,
  type ProveedorAdmin,
  type ProveedorUser,
  type RolProveedorUser,
  MarketProveedoresErrorCodes,
} from '../../../api/marketProveedoresAdmin';
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

const ROLES: RolProveedorUser[] = ['ADMIN', 'OPERADOR'];

const FORM_CREAR_VACIO = {
  user_id: '',
  email: '',
  name: '',
  password: '',
  password_confirmation: '',
  rol: 'ADMIN' as RolProveedorUser,
};

const FORM_EDITAR_VACIO = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  rol: 'ADMIN' as RolProveedorUser,
  estado: true,
};

interface GlobalUserOption {
  id: number;
  name: string;
  email: string;
}

/** Un dato del detalle. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function UsuariosProveedor() {
  const { proveedorId } = useParams();
  const id = Number(proveedorId);

  const [proveedor, setProveedor] = useState<ProveedorAdmin | null>(null);
  const [usuarios, setUsuarios] = useState<ProveedorUser[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modo, setModo] = useState<'crear' | 'editar'>('crear');
  const [origenAsignacion, setOrigenAsignacion] = useState<'nuevo' | 'existente'>('nuevo');
  const [guardando, setGuardando] = useState(false);

  const [seleccionado, setSeleccionado] = useState<ProveedorUser | null>(null);
  const [detalle, setDetalle] = useState<ProveedorUser | null>(null);
  const [formCrear, setFormCrear] = useState(FORM_CREAR_VACIO);
  const [formEditar, setFormEditar] = useState(FORM_EDITAR_VACIO);

  const [usuariosGlobales, setUsuariosGlobales] = useState<GlobalUserOption[]>([]);
  const [cargandoGlobales, setCargandoGlobales] = useState(false);

  const [confirmacion, setConfirmacion] = useState<{
    open: boolean; title: string; description: string;
    variant: 'warning' | 'danger'; onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', variant: 'warning', onConfirm: async () => {} });

  const pedirConfirmacion = (
    title: string, description: string,
    variant: 'warning' | 'danger', onConfirm: () => Promise<void>,
  ) => setConfirmacion({ open: true, title, description, variant, onConfirm });

  const cerrarConfirmacion = () => setConfirmacion((prev) => ({ ...prev, open: false }));

  const cargarProveedor = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const res = await marketProveedoresAdminApi.ver(id);
      setProveedor(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el proveedor');
    }
  }, [id]);

  const cargarUsuarios = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setCargandoUsuarios(true);
    try {
      const res = await marketProveedoresAdminApi.listarUsuarios(id);
      setUsuarios(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
      setUsuarios([]);
    } finally {
      setCargandoUsuarios(false);
    }
  }, [id]);

  const cargarUsuariosGlobales = useCallback(async () => {
    setCargandoGlobales(true);
    try {
      // Reusa el endpoint global del super admin.
      const res = await requestConToken<{ data?: Record<string, unknown>[] }>(
        '/api/v1/admin/users?per_page=100&status=true',
        { method: 'GET' },
        localStorage.getItem('palmapp_token'),
      );
      const items = Array.isArray(res.data) ? res.data : [];
      setUsuariosGlobales(items.map((it) => ({
        id: Number(it?.id ?? 0),
        name: String(it?.name ?? ''),
        email: String(it?.email ?? ''),
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios globales');
    } finally {
      setCargandoGlobales(false);
    }
  }, []);

  useEffect(() => {
    void cargarProveedor();
    void cargarUsuarios();
  }, [cargarProveedor, cargarUsuarios]);

  const abrirCrear = async () => {
    setModo('crear');
    setOrigenAsignacion('nuevo');
    setFormCrear(FORM_CREAR_VACIO);
    setSeleccionado(null);
    setModalAbierto(true);
    await cargarUsuariosGlobales();
  };

  const abrirEditar = (usuario: ProveedorUser) => {
    setModo('editar');
    setSeleccionado(usuario);
    setFormEditar({
      name: usuario.name,
      email: usuario.email,
      password: '',
      password_confirmation: '',
      rol: (usuario.rol as RolProveedorUser) ?? 'ADMIN',
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

  const filtrados = usuarios.filter((u) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return (
      u.name.toLowerCase().includes(termino) ||
      u.email.toLowerCase().includes(termino) ||
      String(u.rol).toLowerCase().includes(termino)
    );
  });

  const activos = usuarios.filter((u) => u.estado).length;
  const inactivos = usuarios.length - activos;
  const globalesInactivos = usuarios.filter((u) => !u.status).length;

  const crear = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isFinite(id)) return;

    let payload: Record<string, unknown>;

    if (origenAsignacion === 'existente') {
      if (!formCrear.user_id) {
        toast.error('Selecciona un usuario existente');
        return;
      }
      payload = { user_id: Number(formCrear.user_id), rol: formCrear.rol };
    } else {
      if (!formCrear.name.trim() || !formCrear.email.trim() || !formCrear.password.trim()) {
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
        name: formCrear.name.trim(),
        email: formCrear.email.trim(),
        password: formCrear.password.trim(),
        rol: formCrear.rol,
      };
    }

    setGuardando(true);
    try {
      const res = await marketProveedoresAdminApi.crearUsuario(id, payload);
      toast.success(res.message ?? 'Usuario vinculado al proveedor');
      cerrarModal();
      await cargarUsuarios();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === MarketProveedoresErrorCodes.USER_ALREADY_ASSIGNED) {
        toast.error((err as { message?: string }).message ?? 'El usuario ya está asignado a este proveedor');
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo agregar el usuario');
      }
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isFinite(id) || !seleccionado) return;

    const payload: Record<string, unknown> = {
      name: formEditar.name.trim(),
      email: formEditar.email.trim(),
      rol: formEditar.rol,
      estado: formEditar.estado,
    };

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
      const res = await marketProveedoresAdminApi.actualizarUsuario(id, seleccionado.id, payload);
      toast.success(res.message ?? 'Usuario actualizado');
      cerrarModal();
      await cargarUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = (usuario: ProveedorUser) => {
    const accion = usuario.estado ? 'desactivar' : 'activar';
    pedirConfirmacion(
      `${accion[0].toUpperCase()}${accion.slice(1)} usuario`,
      `¿Seguro que deseas ${accion} a "${usuario.name}" en este proveedor?`,
      'warning',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.actualizarUsuario(id, usuario.id, {
            estado: !usuario.estado,
          });
          toast.success(res.message ?? `Usuario ${accion}do`);
          cerrarConfirmacion();
          await cargarUsuarios();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
        }
      },
    );
  };

  const remover = (usuario: ProveedorUser) => {
    pedirConfirmacion(
      'Remover usuario',
      `¿Seguro que deseas desvincular a "${usuario.name}" del proveedor?`,
      'danger',
      async () => {
        try {
          const res = await marketProveedoresAdminApi.eliminarUsuario(id, usuario.id);
          toast.success(res.message ?? 'Usuario desvinculado');
          cerrarConfirmacion();
          await cargarUsuarios();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo desvincular');
        }
      },
    );
  };

  if (!Number.isFinite(id)) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Super admin" title="Usuarios del proveedor" backTo="/super-admin/proveedores" />
        <p className="text-sm text-destructive">El proveedor indicado no es válido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={proveedor ? `Proveedor · NIT ${proveedor.nit || '—'}` : 'Super admin'}
        title={proveedor?.nombre_empresa ? `Usuarios de ${proveedor.nombre_empresa}` : 'Usuarios del proveedor'}
        description="Quién tiene acceso al portal de este proveedor y con qué rol."
        backTo="/super-admin/proveedores"
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
          { label: 'Usuarios vinculados', value: num(usuarios.length), note: 'con acceso al portal' },
          { label: 'Vinculaciones activas', value: num(activos) },
          { label: 'Vinculaciones inactivas', value: num(inactivos) },
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
                <th className="px-4 py-2.5 text-left font-semibold">Vinculación</th>
                <th className="px-4 py-2.5 text-left font-semibold">Cuenta</th>
                <th className="px-4 py-2.5 text-right font-semibold">Vinculado</th>
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
                        : 'Este proveedor todavía no tiene usuarios vinculados.'}
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
                          title={usuario.estado ? 'Desactivar en este proveedor' : 'Activar en este proveedor'}
                          onClick={() => alternarEstado(usuario)}
                        >
                          {usuario.estado
                            ? <Pause className="h-4 w-4" strokeWidth={2} />
                            : <Play className="h-4 w-4" strokeWidth={2} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Desvincular del proveedor"
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
            <DialogTitle>{modo === 'crear' ? 'Agregar usuario' : 'Editar usuario'}</DialogTitle>
            <DialogDescription>
              {modo === 'crear'
                ? 'Vincula un usuario que ya existe o crea uno nuevo para este proveedor.'
                : 'Cambia los datos del usuario y su acceso al portal.'}
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
                  <Label htmlFor="proveedor-usuario-existente">Usuario</Label>
                  <Select
                    value={formCrear.user_id}
                    onValueChange={(v) => setFormCrear((f) => ({ ...f, user_id: v }))}
                  >
                    <SelectTrigger id="proveedor-usuario-existente">
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
                    <Label htmlFor="proveedor-usuario-nombre">Nombre</Label>
                    <Input
                      id="proveedor-usuario-nombre"
                      value={formCrear.name}
                      onChange={(e) => setFormCrear((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proveedor-usuario-correo">Correo electrónico</Label>
                    <Input
                      id="proveedor-usuario-correo"
                      type="email"
                      value={formCrear.email}
                      onChange={(e) => setFormCrear((f) => ({ ...f, email: e.target.value }))}
                      placeholder="usuario@correo.com"
                    />
                  </div>
                  <PasswordField
                    id="proveedor-usuario-password"
                    label="Contraseña"
                    value={formCrear.password}
                    onChange={(v) => setFormCrear((f) => ({ ...f, password: v }))}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="proveedor-usuario-password-confirmacion"
                    label="Confirmar contraseña"
                    value={formCrear.password_confirmation}
                    onChange={(v) => setFormCrear((f) => ({ ...f, password_confirmation: v }))}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="proveedor-usuario-rol">Rol en el proveedor</Label>
                <Select
                  value={formCrear.rol}
                  onValueChange={(v) => setFormCrear((f) => ({ ...f, rol: v as RolProveedorUser }))}
                >
                  <SelectTrigger id="proveedor-usuario-rol"><SelectValue /></SelectTrigger>
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
                <Label htmlFor="proveedor-editar-nombre">Nombre</Label>
                <Input
                  id="proveedor-editar-nombre"
                  value={formEditar.name}
                  onChange={(e) => setFormEditar((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor-editar-correo">Correo electrónico</Label>
                <Input
                  id="proveedor-editar-correo"
                  type="email"
                  value={formEditar.email}
                  onChange={(e) => setFormEditar((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <PasswordField
                id="proveedor-editar-password"
                label="Contraseña nueva"
                value={formEditar.password}
                onChange={(v) => setFormEditar((f) => ({ ...f, password: v }))}
                placeholder="Déjala vacía para no cambiarla"
                autoComplete="new-password"
              />
              {formEditar.password.trim() !== '' && (
                <PasswordField
                  id="proveedor-editar-password-confirmacion"
                  label="Confirmar contraseña"
                  value={formEditar.password_confirmation}
                  onChange={(v) => setFormEditar((f) => ({ ...f, password_confirmation: v }))}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="proveedor-editar-rol">Rol en el proveedor</Label>
                <Select
                  value={formEditar.rol}
                  onValueChange={(v) => setFormEditar((f) => ({ ...f, rol: v as RolProveedorUser }))}
                >
                  <SelectTrigger id="proveedor-editar-rol"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((rol) => <SelectItem key={rol} value={rol}>{rol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proveedor-editar-estado">Vinculación</Label>
                <Select
                  value={formEditar.estado ? 'activa' : 'inactiva'}
                  onValueChange={(v) => setFormEditar((f) => ({ ...f, estado: v === 'activa' }))}
                >
                  <SelectTrigger id="proveedor-editar-estado"><SelectValue /></SelectTrigger>
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
              <Dato label="Vinculación">
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
                <Dato label="Vinculado">
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
