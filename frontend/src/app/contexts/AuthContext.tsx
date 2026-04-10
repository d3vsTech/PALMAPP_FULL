import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'USUARIO' | 'super_admin' | 'administrador' | 'dueño' | 'jefe_campo';

export interface TenantInfo {
  id: number;
  nombre: string;
  nit?: string;
  plan?: string;
  rol?: string;
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  is_super_admin?: boolean;
  fincaActual?: TenantInfo;
  fincaId?: number;
  fincas?: (TenantInfo & { rol: string })[];
  permisos?: string[];
  modulos?: Record<string, boolean>;
  config_nomina?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  pendingTenantSelection: boolean;
  availableTenants: (TenantInfo & { rol: string })[];
  login: (email: string, password: string, isSuperAdmin?: boolean) => Promise<string>;
  logout: () => Promise<void>;
  selectFinca: (tenantId: number) => Promise<void>;
  hasPermiso: (permiso: string) => boolean;
  hasModulo: (modulo: string) => boolean;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'palmapp_token';
const TENANT_KEY = 'palmapp_tenant_id';
const USER_KEY = 'palmapp_user';
const IS_SUPER_KEY = 'palmapp_is_super_admin';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://31.97.7.50:3000/api').replace(/\/+$/, '');

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = localStorage.getItem(TENANT_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as any)?.message || res.statusText || 'Error del servidor';
    throw new Error(msg);
  }
  return data as T;
}


// ─── Normalizar rol del API al formato del frontend ──────────────────────────
function normalizarRol(rol: string): string {
  const map: Record<string, string> = {
    'ADMIN': 'administrador',
    'ADMINISTRADOR': 'administrador',
    'LIDER DE CAMPO': 'jefe_campo',
    'LIDER_CAMPO': 'jefe_campo',
    'JEFE_CAMPO': 'jefe_campo',
    'PROPIETARIO': 'dueño',
    'DUENO': 'dueño',
    'super_admin': 'super_admin',
  };
  return map[rol?.toUpperCase()] ?? rol?.toLowerCase() ?? 'USUARIO';
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTenantSelection, setPendingTenantSelection] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<(TenantInfo & { rol: string })[]>([]);

  // ─── Helpers de storage (definidos antes del useEffect que los usa) ───────

  const clearAll = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IS_SUPER_KEY);
    setToken(null);
    setUser(null);
    setPendingTenantSelection(false);
    setAvailableTenants([]);
  };

  const saveToken = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  };

  const saveTenant = (id: number) => {
    localStorage.setItem(TENANT_KEY, String(id));
  };

  // ─── Rehidratar sesión al cargar ──────────────────────────────────────────

  useEffect(() => {
    const rehidratar = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) { setIsLoading(false); return; }

      try {
        const isSuperAdmin = localStorage.getItem(IS_SUPER_KEY) === 'true';

        if (isSuperAdmin) {
          // Verificar token super admin
          const res = await http<any>('/v1/auth/me');
          const u: User = {
            id: res.user?.id,
            nombre: res.user?.name,
            email: res.user?.email,
            rol: 'super_admin',
            is_super_admin: true,
          };
          setUser(u);
          setToken(storedToken);
        } else {
          // Verificar token de finca
          const res = await http<any>('/v1/tenant-auth/me');
          const saved = localStorage.getItem(USER_KEY);
          const savedUser = saved ? JSON.parse(saved) : {};
          const u: User = {
            ...savedUser,
            id: res.user?.id,
            nombre: res.user?.name,
            email: res.user?.email,
            fincas: res.tenants,
          };
          setUser(u);
          setToken(storedToken);
        }
      } catch {
        // Token inválido — limpiar todo
        clearAll();
      } finally {
        setIsLoading(false);
      }
    };
    rehidratar();
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string, isSuperAdmin = false): Promise<string> => {
    if (isSuperAdmin) {
      // Login super admin → POST /api/v1/auth/login
      const res = await http<any>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      saveToken(res.token);
      localStorage.setItem(IS_SUPER_KEY, 'true');

      const newUser: User = {
        id: res.user?.id,
        nombre: res.user?.name,
        email: res.user?.email,
        rol: 'super_admin',
        is_super_admin: true,
      };
      setUser(newUser);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return '/super-admin/dashboard';
    }

    // Login de finca → POST /api/v1/tenant-auth/login
    const res = await http<any>('/v1/tenant-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    saveToken(res.token);
    localStorage.removeItem(IS_SUPER_KEY);

    if (res.requires_tenant_selection) {
      // Múltiples fincas → mostrar selector
      setAvailableTenants(res.tenants ?? []);
      setPendingTenantSelection(true);

      const partialUser: User = {
        id: res.user?.id,
        nombre: res.user?.name,
        email: res.user?.email,
        rol: 'USUARIO',
        fincas: res.tenants,
      };
      setUser(partialUser);
      localStorage.setItem(USER_KEY, JSON.stringify(partialUser));
      return '/seleccionar-finca';
    }

    // Una sola finca → auto-seleccionada
    if (res.tenant?.id) saveTenant(res.tenant.id);

    const newUser: User = {
      id: res.user?.id,
      nombre: res.user?.name,
      email: res.user?.email,
      rol: normalizarRol(res.rol ?? 'USUARIO') as UserRole,
      fincaActual: res.tenant,
      fincaId: res.tenant?.id,
      permisos: res.permisos ?? [],
      modulos: res.modulos ?? {},
      config_nomina: res.config_nomina,
    };
    // Bloquear si no es admin y no tiene ningún permiso
    const esAdmin = (res.rol === 'ADMIN' || res.rol === 'administrador');
    const permisos = res.permisos ?? [];
    if (!esAdmin && permisos.length === 0) {
      clearAll();
      throw new Error('Tu cuenta no tiene permisos asignados en esta finca. Contacta a tu administrador.');
    }

    setUser(newUser);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    return '/';
  };

  // ─── Seleccionar finca ────────────────────────────────────────────────────

  const selectFinca = async (tenantId: number) => {
    // POST /api/v1/tenant-auth/select-tenant
    const res = await http<any>('/v1/tenant-auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    saveToken(res.token);
    saveTenant(res.tenant_id);
    setPendingTenantSelection(false);
    setAvailableTenants([]);

    const fincaInfo = availableTenants.find(t => t.id === tenantId);
    const newUser: User = {
      id: user?.id ?? 0,
      nombre: user?.nombre ?? '',
      email: user?.email ?? '',
      rol: normalizarRol(res.rol ?? 'USUARIO') as UserRole,
      fincaActual: fincaInfo ?? { id: res.tenant_id, nombre: res.tenant_nombre ?? '', nit: '' },
      fincaId: res.tenant_id,
      fincas: availableTenants,
      permisos: res.permisos ?? [],
      modulos: res.modulos ?? {},
      config_nomina: res.config_nomina,
    };

    // Bloquear si no es admin y no tiene permisos
    const esAdminFinca = (res.rol === 'ADMIN' || res.rol === 'administrador');
    if (!esAdminFinca && (res.permisos ?? []).length === 0) {
      clearAll();
      throw new Error('Tu cuenta no tiene permisos asignados en esta finca. Contacta a tu administrador.');
    }

    setUser(newUser);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = async () => {
    try {
      const isSuperAdmin = localStorage.getItem(IS_SUPER_KEY) === 'true';
      const endpoint = isSuperAdmin ? '/v1/auth/logout' : '/v1/tenant-auth/logout';
      await http(endpoint, { method: 'POST' });
    } catch {
      // Silencioso — limpiar de todas formas
    } finally {
      clearAll();
    }
  };

  // ─── Permisos ─────────────────────────────────────────────────────────────

  const hasPermiso = (permiso: string) => {
    if (user?.is_super_admin || user?.rol === 'ADMIN') return true;
    return user?.permisos?.includes(permiso) ?? false;
  };

  const hasModulo = (modulo: string) => {
    return user?.modulos?.[modulo] === true;
  };

  // ─── Value ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !pendingTenantSelection,
      isSuperAdmin: user?.is_super_admin === true,
      isLoading,
      pendingTenantSelection,
      availableTenants,
      login,
      logout,
      selectFinca,
      hasPermiso,
      hasModulo,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}