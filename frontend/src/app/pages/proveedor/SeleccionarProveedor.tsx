/**
 * Pantalla "Seleccionar Proveedor" del Portal Proveedor.
 * Solo se llega aquí si POST /proveedor-auth/login devolvió
 * requires_proveedor_selection: true (usuario con varias empresas).
 *
 * Endpoint: POST /api/v1/proveedor-auth/select-proveedor
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Store, Shield, LogOut, Loader2, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { PalmappLogo } from '../../components/common/PalmappLogo';
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
  const [user, setUser] = useState(proveedorAuthStorage.getUser());
  const [seleccionando, setSeleccionando] = useState<number | null>(null);

  useEffect(() => {
    const token = proveedorAuthStorage.getToken();
    if (!token) {
      navigate('/proveedor/login', { replace: true });
      return;
    }
    // Si guardamos los pendientes en el login, los usamos primero (instantáneo).
    const pend = proveedorAuthStorage.getPendientes();
    if (pend && pend.length > 0) {
      setProveedores(pend);
    } else {
      // Fallback: /me trae user + proveedores accesibles.
      proveedorAuthApi.me()
        .then(res => {
          setUser(res.user);
          proveedorAuthStorage.setUser(res.user);
          setProveedores(res.proveedores ?? []);
          if (!res.proveedores?.length) {
            toast.error('No tienes proveedores activos asignados.');
            handleLogout();
          }
        })
        .catch(err => {
          toast.error(err instanceof Error ? err.message : 'No se pudo cargar tus proveedores');
          handleLogout();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeleccionar = async (p: ProveedorOpcion) => {
    setSeleccionando(p.id);
    try {
      const res = await proveedorAuthApi.selectProveedor(p.id);
      proveedorAuthStorage.setToken(res.token);
      proveedorAuthStorage.setProveedor(res.proveedor);
      proveedorAuthStorage.setRol(res.rol);
      proveedorAuthStorage.clearPendientes();

      localStorage.setItem('proveedorSession', JSON.stringify({
        email: user?.email,
        nombre: res.proveedor.nombre_empresa,
      }));

      toast.success(`Ingresando a ${res.proveedor.nombre_empresa}`);
      navigate('/proveedor/dashboard', { replace: true });
    } catch (err: any) {
      const code = err?.code as string | undefined;
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

  const handleLogout = async () => {
    try { await proveedorAuthApi.logout(); } catch { /* ignorar */ }
    proveedorAuthStorage.clearAll();
    navigate('/proveedor/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <PalmappLogo variant="isotipo" className="h-12 w-auto" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Portal Proveedores</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Selecciona tu proveedor</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Hola, <span className="font-medium text-foreground">{user.name}</span>.
              Elige la empresa con la que vas a trabajar.
            </p>
          )}
        </div>

        {/* Lista */}
        {proveedores.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando proveedores...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {proveedores.map(p => {
              const cargando = seleccionando === p.id;
              const bloqueado = seleccionando !== null && !cargando;
              const logo = buildImagenUrl(p.logo_url ?? null);
              return (
                <button
                  key={p.id}
                  onClick={() => handleSeleccionar(p)}
                  disabled={bloqueado || cargando}
                  className={`group text-left rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cargando ? 'ring-2 ring-primary' : 'hover:border-primary/40 hover:bg-primary/5'}`}
                >
                  <div className="flex items-start gap-4">
                    {logo ? (
                      <img
                        src={logo}
                        alt={p.nombre_empresa}
                        className="h-14 w-14 rounded-xl object-cover border border-border bg-background flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Store className="h-7 w-7 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.nombre_empresa}</h3>
                      {p.nit && (
                        <p className="text-xs text-muted-foreground mt-0.5">NIT: {p.nit}</p>
                      )}
                      {(p.ciudad || p.departamento) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[p.ciudad, p.departamento].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Shield className="h-3 w-3" /> {p.rol}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20 capitalize">
                          {p.estado}
                        </span>
                      </div>
                    </div>

                    <div className="self-center">
                      {cargando
                        ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        : <CheckCircle2 className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      }
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Acciones inferiores */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-border">
          <button
            onClick={() => navigate('/proveedor/login', { replace: true })}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al login
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-destructive hover:underline"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
