/**
 * "Selecciona tu proveedor" del portal de proveedores.
 *
 * Solo se llega aquí si `POST /proveedor-auth/login` devolvió
 * `requires_proveedor_selection: true`, es decir, el usuario tiene varias
 * empresas. Endpoint: `POST /api/v1/proveedor-auth/select-proveedor`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Loader2, LogOut, Store } from 'lucide-react';
import { PalmappLogo } from '../../components/common/PalmappLogo';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/lib/utils';
import {
  proveedorAuthApi,
  proveedorAuthStorage,
  ProveedorAuthErrorCodes,
  type ProveedorOpcion,
} from '../../../api/proveedorAuth';
import { buildImagenUrl } from '../../../api/proveedor';

export default function SeleccionarProveedor() {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorOpcion[]>([]);
  const [user, setUser] = useState(() => proveedorAuthStorage.getUser());
  const [seleccionando, setSeleccionando] = useState<number | null>(null);

  const cerrarSesion = useCallback(async () => {
    try { await proveedorAuthApi.logout(); } catch { /* la sesión local se limpia igual */ }
    proveedorAuthStorage.clearAll();
    navigate('/proveedor/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!proveedorAuthStorage.getToken()) {
      navigate('/proveedor/login', { replace: true });
      return;
    }
    // Si el login guardó los pendientes, se usan: es instantáneo.
    const pendientes = proveedorAuthStorage.getPendientes();
    if (pendientes && pendientes.length > 0) {
      setProveedores(pendientes);
      return;
    }
    // Si no, `/me` trae el usuario y los proveedores a los que accede.
    proveedorAuthApi.me()
      .then((res) => {
        setUser(res.user);
        proveedorAuthStorage.setUser(res.user);
        setProveedores(res.proveedores ?? []);
        if (!res.proveedores?.length) {
          toast.error('No tienes proveedores activos asignados.');
          void cerrarSesion();
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'No se pudo cargar tus proveedores');
        void cerrarSesion();
      });
  }, [navigate, cerrarSesion]);

  const seleccionar = async (p: ProveedorOpcion) => {
    setSeleccionando(p.id);
    try {
      const res = await proveedorAuthApi.selectProveedor(p.id);
      proveedorAuthStorage.setToken(res.token);
      proveedorAuthStorage.setProveedor(res.proveedor);
      proveedorAuthStorage.setRol(res.rol);
      proveedorAuthStorage.clearPendientes();

      // Compatibilidad con código legacy que lee proveedorSession.
      localStorage.setItem('proveedorSession', JSON.stringify({
        email: user?.email,
        nombre: res.proveedor.nombre_empresa,
      }));

      toast.success(`Ingresando a ${res.proveedor.nombre_empresa}`);
      navigate('/proveedor/dashboard', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === ProveedorAuthErrorCodes.PROVEEDOR_ACCESS_DENIED) {
        toast.error('No tienes acceso a este proveedor.');
      } else if (code === ProveedorAuthErrorCodes.PROVEEDOR_INACTIVE) {
        toast.error('Este proveedor no está activo.');
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo seleccionar el proveedor');
      }
    } finally {
      setSeleccionando(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <PalmappLogo variant="complete" className="h-8 w-auto" />
          {user && (
            <div className="min-w-0 text-right leading-tight">
              <p className="truncate text-[13px] font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-3xl">
        <div className="mb-6 space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">Portal de proveedores</p>
          <h1>Selecciona tu proveedor</h1>
          <p className="text-sm text-muted-foreground">Elige la empresa con la que vas a trabajar.</p>
        </div>

        {proveedores.length === 0 ? (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando proveedores…
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {proveedores.map((p) => {
              const cargando = seleccionando === p.id;
              const logo = buildImagenUrl(p.logo_url ?? null);
              const lugar = [p.ciudad, p.departamento].filter(Boolean).join(', ');
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(p)}
                    disabled={seleccionando !== null}
                    className={cn(
                      'flex w-full items-center gap-4 px-4 py-4 text-left transition-colors disabled:cursor-default sm:px-5',
                      cargando ? 'bg-primary-soft' : 'hover:bg-muted/40',
                    )}
                  >
                    {logo ? (
                      <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Store className="h-5 w-5" strokeWidth={2} />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-foreground">{p.nombre_empresa}</span>
                        <Badge variant="secondary">{p.rol}</Badge>
                        {p.estado && <Badge variant="success" className="capitalize">{p.estado}</Badge>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {p.nit && <span>NIT {p.nit}</span>}
                        {lugar && <span>{lugar}</span>}
                      </span>
                    </span>

                    {cargando ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => navigate('/proveedor/login', { replace: true })}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Volver al inicio de sesión
          </button>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
        </div>
      </main>

      <footer className="border-t border-border py-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PalmApp · Tu palma en la palma
        </p>
      </footer>
    </div>
  );
}
