import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

// ─── Carga eager (críticos para el primer paint) ─────────────────────────────
import Root from './Root';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFound from './pages/errors/NotFound';
import SinPermisos from './pages/errors/SinPermisos';
import SinAcceso from './pages/errors/SinAcceso';

/**
 * Variante de `React.lazy` que recarga la página cuando el chunk dinámico no
 * existe en el servidor. Pasa típicamente después de un deploy: el `index.html`
 * cargado en el navegador apunta a hashes viejos (`Foo-DyE1VCcD.js`), Netlify
 * ya los purgó y el `import()` revienta con "Failed to fetch dynamically
 * imported module".
 *
 * Estrategia: un solo retry forzando un `location.reload()`. Usamos
 * `sessionStorage` como circuit breaker para no entrar en loop si el error
 * persiste tras el reload (en ese caso es una falla real — propagamos).
 */
const RELOAD_FLAG = 'palmapp_chunk_reload_attempted';

function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Carga exitosa → limpiamos el flag para futuros deploys.
      try { window.sessionStorage.removeItem(RELOAD_FLAG); } catch {}
      return mod;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      const esChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        err?.name === 'ChunkLoadError';
      const yaReintentado = (() => {
        try { return window.sessionStorage.getItem(RELOAD_FLAG) === '1'; }
        catch { return false; }
      })();
      if (esChunkError && !yaReintentado) {
        try { window.sessionStorage.setItem(RELOAD_FLAG, '1'); } catch {}
        window.location.reload();
        // Devolvemos una promesa que nunca resuelve para suspender el render
        // mientras el navegador recarga la página.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// ─── Carga lazy (cada pantalla se descarga al entrar) ────────────────────────
// Auth secundario
const RecuperarPassword = lazyWithRetry(() => import('./pages/auth/RecuperarPassword'));
const RestablecerPassword = lazyWithRetry(() => import('./pages/auth/RestablecerPassword'));
const SeleccionarFinca = lazyWithRetry(() => import('./pages/auth/SeleccionarFinca'));

// Dashboard
const Dashboard = lazyWithRetry(() => import('./pages/dashboard/Dashboard'));

// Agente IA
const AgenteIA = lazyWithRetry(() => import('./pages/agente-ia/AgenteIA'));

// Métricas
const ProductividadColaboradores = lazyWithRetry(() => import('./pages/metricas/ProductividadColaboradores'));
const PreciosCosecha = lazyWithRetry(() => import('./pages/metricas/PreciosCosecha'));
const PromediosLote = lazyWithRetry(() => import('./pages/metricas/PromediosLote'));
const EstadisticasGenerales = lazyWithRetry(() => import('./pages/metricas/EstadisticasGenerales'));
const ComparativosHistoricos = lazyWithRetry(() => import('./pages/metricas/ComparativosHistoricos'));

// Plantación
const MiPlantacion = lazyWithRetry(() => import('./pages/plantacion/MiPlantacion'));
const NuevoPredioWizard = lazyWithRetry(() => import('./pages/plantacion/NuevoPredioWizard'));
const CrearEditarLote = lazyWithRetry(() => import('./pages/plantacion/CrearEditarLote'));
const LoteDetalle = lazyWithRetry(() => import('./pages/plantacion/LoteDetalle'));
const CrearSublote = lazyWithRetry(() => import('./pages/plantacion/CrearSublote'));
const CrearLinea = lazyWithRetry(() => import('./pages/plantacion/CrearLinea'));
const CrearPalmas = lazyWithRetry(() => import('./pages/plantacion/CrearPalmas'));

// Colaboradores
const Colaboradores = lazyWithRetry(() => import('./pages/colaboradores/Colaboradores'));
const ColaboradorDetail = lazyWithRetry(() => import('./pages/colaboradores/ColaboradorDetail'));
const NuevoColaboradorWizard = lazyWithRetry(() => import('./pages/colaboradores/NuevoColaboradorWizard'));

// Nómina
const Nomina = lazyWithRetry(() => import('./pages/nomina/Nomina'));
const NominaDetalle = lazyWithRetry(() => import('./pages/nomina/NominaDetalle'));
const NuevaNominaWizard = lazyWithRetry(() => import('./pages/nomina/NuevaNominaWizard'));
const NuevoPrestamo = lazyWithRetry(() => import('./pages/nomina/NuevoPrestamo'));
const NuevaLiquidacionWizard = lazyWithRetry(() => import('./pages/nomina/NuevaLiquidacionWizard'));
const LiquidarColaborador = lazyWithRetry(() => import('./pages/nomina/LiquidarColaborador'));
const VerLiquidacion = lazyWithRetry(() => import('./pages/nomina/VerLiquidacion'));
const PlanillaDiaria = lazyWithRetry(() => import('./pages/nomina/PlanillaDiaria'));
const DesprendiblePago = lazyWithRetry(() => import('./pages/nomina/DesprendiblePago'));

// Liquidaciones
const LiquidacionesLayout = lazyWithRetry(() => import('./pages/liquidaciones/LiquidacionesLayout'));
const Liquidaciones = lazyWithRetry(() => import('./pages/liquidaciones/Liquidaciones'));
const CesantiasDetalle = lazyWithRetry(() => import('./pages/liquidaciones/CesantiasDetalle'));
const InteresesDetalle = lazyWithRetry(() => import('./pages/liquidaciones/InteresesDetalle'));
const PrimaDetalle = lazyWithRetry(() => import('./pages/liquidaciones/PrimaDetalle'));
const VacacionesDetalle = lazyWithRetry(() => import('./pages/liquidaciones/VacacionesDetalle'));
const LiquidacionFinalDetalle = lazyWithRetry(() => import('./pages/liquidaciones/LiquidacionFinalDetalle'));

// Operaciones
const Operaciones = lazyWithRetry(() => import('./pages/operaciones/Operaciones'));
const NuevaPlanillaWizard = lazyWithRetry(() => import('./pages/operaciones/NuevaPlanillaWizard'));
const VerPlanilla = lazyWithRetry(() => import('./pages/operaciones/Verplanilla'));

// Viajes
const Viajes = lazyWithRetry(() => import('./pages/viajes/Viajes'));
const DetalleViaje = lazyWithRetry(() => import('./pages/viajes/DetalleViaje'));
const ConteoCosecha = lazyWithRetry(() => import('./pages/viajes/ConteoCosecha'));
const ConteoCosechaWizard = lazyWithRetry(() => import('./pages/viajes/Conteocosechawizard'));
const NuevoEditarViaje = lazyWithRetry(() => import('./pages/viajes/Nuevoeditarviaje'));

// Market
const Market = lazyWithRetry(() => import('./pages/market/Market'));
const Proveedores = lazyWithRetry(() => import('./pages/market/Proveedores'));
const ProveedorDetalle = lazyWithRetry(() => import('./pages/market/Proveedordetalle'));
const ProductoDetalle = lazyWithRetry(() => import('./pages/market/Productodetalle'));
const Carrito = lazyWithRetry(() => import('./pages/market/Carrito'));
const Checkout = lazyWithRetry(() => import('./pages/market/Checkout'));
const Pedidos = lazyWithRetry(() => import('./pages/market/Pedidos'));
const PedidoDetalle = lazyWithRetry(() => import('./pages/market/Pedidodetalle'));

// Usuarios
const Usuarios = lazyWithRetry(() => import('./pages/usuarios/Usuarios'));
const UsuarioDetalle = lazyWithRetry(() => import('./pages/usuarios/UsuarioDetalle'));
const UsuarioNuevoEditar = lazyWithRetry(() => import('./pages/usuarios/UsuarioNuevoEditar'));
const UsuarioPermisos = lazyWithRetry(() => import('./pages/usuarios/UsuarioPermisos'));

// Configuración
const Configuracion = lazyWithRetry(() => import('./pages/configuracion/Configuracion'));
const NuevoConceptoNomina = lazyWithRetry(() => import('./pages/configuracion/NuevoConceptoNomina'));
const NuevoTerceroWizard  = lazyWithRetry(() => import('./pages/configuracion/NuevoTerceroWizard'));
const NuevaExtractora = lazyWithRetry(() => import('./pages/configuracion/NuevaExtractora'));

const MiPerfil = lazyWithRetry(() => import('./pages/perfil/MiPerfil'));

// Super Admin
const SuperAdminLogin = lazyWithRetry(() => import('./pages/super-admin/SuperAdminLogin'));
const SuperAdminLayout = lazyWithRetry(() => import('./pages/super-admin/SuperAdminLayout'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/super-admin/SuperAdminDashboard'));
const Fincas = lazyWithRetry(() => import('./pages/super-admin/Fincas'));
const UsuariosFinca = lazyWithRetry(() => import('./pages/super-admin/UsuariosFinca'));
const ProveedoresAdmin = lazyWithRetry(() => import('./pages/super-admin/Proveedores'));
const UsuariosProveedor = lazyWithRetry(() => import('./pages/super-admin/UsuariosProveedor'));
const Actividad = lazyWithRetry(() => import('./pages/super-admin/Actividad'));
const Diagnosticos = lazyWithRetry(() => import('./pages/super-admin/Diagnosticos'));
const RecuperarPasswordSuperAdmin = lazyWithRetry(() => import('./pages/super-admin/RecuperarPassword'));
const RestablecerPasswordSuperAdmin = lazyWithRetry(() => import('./pages/super-admin/RestablecerPassword'));

// Proveedor (módulo independiente)
const ProveedorLogin = lazyWithRetry(() => import('./pages/proveedor/ProveedorLogin'));
const ProveedorRecuperarPassword = lazyWithRetry(() => import('./pages/proveedor/ProveedorRecuperarPassword'));
const ProveedorRestablecerPassword = lazyWithRetry(() => import('./pages/proveedor/ProveedorRestablecerPassword'));
const SeleccionarProveedor = lazyWithRetry(() => import('./pages/proveedor/SeleccionarProveedor'));
const ProveedorLayout = lazyWithRetry(() => import('./pages/proveedor/ProveedorLayout'));
const ProveedorDashboard = lazyWithRetry(() => import('./pages/proveedor/ProveedorDashboard'));
const ProveedorProductos = lazyWithRetry(() => import('./pages/proveedor/ProveedorProductos'));
const ProveedorPedidos = lazyWithRetry(() => import('./pages/proveedor/ProveedorPedidos'));
const ProveedorEstadisticas = lazyWithRetry(() => import('./pages/proveedor/ProveedorEstadisticas'));
const ProveedorConfiguracion = lazyWithRetry(() => import('./pages/proveedor/ProveedorConfiguracion'));
const MiPerfilProveedor = lazyWithRetry(() => import('./pages/proveedor/MiPerfilProveedor'));
const NuevoProductoProv = lazyWithRetry(() => import('./pages/proveedor/NuevoProducto'));
const EditarProductoProv = lazyWithRetry(() => import('./pages/proveedor/EditarProducto'));
const ProductoDetalleProv = lazyWithRetry(() => import('./pages/proveedor/ProductoDetalle'));
const CargaMasivaProductos = lazyWithRetry(() => import('./pages/proveedor/CargaMasivaProductos'));
const PedidoDetalleProv = lazyWithRetry(() => import('./pages/proveedor/PedidoDetalle'));
const ConfiguracionInicialWizard = lazyWithRetry(() => import('./pages/proveedor/ConfiguracionInicialWizard'));

/** Loader visual cuando una ruta lazy se está descargando. */
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

/** Helper para envolver el elemento de una ruta lazy en un Suspense local. */
function L(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  // ─── Auth finca ───────────────────────────────────────────────────────────
  { path: '/login',                element: <Login /> },
  { path: '/recuperar-password',   element: L(<RecuperarPassword />) },
  { path: '/restablecer-password', element: L(<RestablecerPassword />) },
  { path: '/reset-password',                    element: L(<RestablecerPassword />) },
  { path: '/recuperar-password/reset-password', element: L(<RestablecerPassword />) },
  { path: '/seleccionar-finca',    element: L(<SeleccionarFinca />) },
  { path: '/sin-permisos',          element: <SinAcceso /> },

  // ─── Super Admin ──────────────────────────────────────────────────────────
  { path: '/super-admin/login',                element: L(<SuperAdminLogin />) },
  { path: '/super-admin/recuperar-password',   element: L(<RecuperarPasswordSuperAdmin />) },
  { path: '/super-admin/restablecer-password', element: L(<RestablecerPasswordSuperAdmin />) },
  {
    path: '/super-admin',
    element: L(<SuperAdminLayout />),
    children: [
      { index: true,                          element: <Navigate to="/super-admin/dashboard" replace /> },
      { path: 'dashboard',                    element: L(<SuperAdminDashboard />) },
      { path: 'fincas',                       element: L(<Fincas />) },
      { path: 'fincas/:tenantId/usuarios',    element: L(<UsuariosFinca />) },
      { path: 'proveedores',                       element: L(<ProveedoresAdmin />) },
      { path: 'proveedores/:proveedorId/usuarios', element: L(<UsuariosProveedor />) },
      { path: 'actividad',                    element: L(<Actividad />) },
      { path: 'diagnosticos',                 element: L(<Diagnosticos />) },
    ],
  },

  // ─── Proveedor (cuenta separada, login propio) ────────────────────────────
  { path: '/proveedor/login',                  element: L(<ProveedorLogin />) },
  { path: '/proveedor/seleccionar',            element: L(<SeleccionarProveedor />) },
  { path: '/proveedor/recuperar-password',     element: L(<ProveedorRecuperarPassword />) },
  { path: '/proveedor/restablecer-password',   element: L(<ProveedorRestablecerPassword />) },
  { path: '/proveedor/reset-password',         element: L(<ProveedorRestablecerPassword />) },
  // El backend a veces arma el link como {FRONTEND_PROVEEDOR_URL}/reset-password
  // donde FRONTEND_PROVEEDOR_URL = ".../proveedor/recuperar-password", lo que
  // termina apuntando aquí. Mismo render que /proveedor/reset-password.
  { path: '/proveedor/recuperar-password/reset-password', element: L(<ProveedorRestablecerPassword />) },
  { path: '/proveedor/configuracion-inicial', element: L(<ConfiguracionInicialWizard />) },
  {
    path: '/proveedor',
    element: L(<ProveedorLayout />),
    children: [
      { index: true,                          element: <Navigate to="/proveedor/dashboard" replace /> },
      { path: 'dashboard',                    element: L(<ProveedorDashboard />) },
      { path: 'productos',                    element: L(<ProveedorProductos />) },
      { path: 'productos/nuevo',              element: L(<NuevoProductoProv />) },
      { path: 'productos/carga-masiva',       element: L(<CargaMasivaProductos />) },
      { path: 'productos/editar/:id',         element: L(<EditarProductoProv />) },
      { path: 'productos/:id',                element: L(<ProductoDetalleProv />) },
      { path: 'pedidos',                      element: L(<ProveedorPedidos />) },
      { path: 'pedidos/:id',                  element: L(<PedidoDetalleProv />) },
      { path: 'estadisticas',                 element: L(<ProveedorEstadisticas />) },
      { path: 'configuracion',                element: L(<ProveedorConfiguracion />) },
      { path: 'perfil',                       element: L(<MiPerfilProveedor />) },
    ],
  },

  // ─── App finca ────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <ProtectedRoute permiso="dashboard.ver">{L(<Dashboard />)}</ProtectedRoute> },

      { path: 'agente-ia', element: L(<AgenteIA />) },

      { path: 'metricas/productividad-colaboradores', element: L(<ProductividadColaboradores />) },
      { path: 'metricas/precios-cosecha',             element: L(<PreciosCosecha />) },
      { path: 'metricas/promedios-lote',              element: L(<PromediosLote />) },
      { path: 'metricas/estadisticas-generales',      element: L(<EstadisticasGenerales />) },
      { path: 'metricas/comparativos-historicos',     element: L(<ComparativosHistoricos />) },

      { path: 'plantacion',               element: <ProtectedRoute permiso="lotes.ver">{L(<MiPlantacion />)}</ProtectedRoute> },
      { path: 'plantacion/predio/nuevo',  element: L(<NuevoPredioWizard />) },
      { path: 'plantacion/lote/nuevo',    element: L(<CrearEditarLote />) },
      { path: 'plantacion/lote/:id',      element: L(<LoteDetalle />) },
      { path: 'plantacion/sublote/nuevo', element: L(<CrearSublote />) },
      { path: 'plantacion/linea/nuevo',   element: L(<CrearLinea />) },
      { path: 'plantacion/palmas/nuevo',  element: L(<CrearPalmas />) },

      { path: 'colaboradores',            element: <ProtectedRoute permiso="colaboradores.ver">{L(<Colaboradores />)}</ProtectedRoute> },
      { path: 'colaboradores/nuevo',      element: L(<NuevoColaboradorWizard />) },
      { path: 'colaboradores/editar/:id', element: L(<NuevoColaboradorWizard />) },
      { path: 'colaboradores/:id',        element: L(<ColaboradorDetail />) },

      { path: 'nomina',                     element: <ProtectedRoute permiso="nomina.ver">{L(<Nomina />)}</ProtectedRoute> },
      { path: 'nomina/nueva',               element: L(<NuevaNominaWizard />) },
      { path: 'nomina/nuevo-prestamo',      element: L(<NuevoPrestamo />) },
      { path: 'nomina/planilla-diaria',     element: L(<PlanillaDiaria />) },
      { path: 'nomina/liquidacion/nueva',   element: L(<NuevaLiquidacionWizard />) },
      { path: 'nomina/:id',                 element: L(<NominaDetalle />) },
      { path: 'nomina/:nominaId/liquidar/:colaboradorId',     element: L(<LiquidarColaborador />) },
      { path: 'nomina/:nominaId/ver/:colaboradorId',          element: L(<VerLiquidacion />) },
      { path: 'nomina/:nominaId/desprendible/:colaboradorId', element: L(<DesprendiblePago />) },

      {
        path: 'liquidaciones',
        element: L(<LiquidacionesLayout />),
        children: [
          { index: true,                       element: L(<Liquidaciones />) },
          { path: 'cesantias/:id',             element: L(<CesantiasDetalle />) },
          { path: 'intereses/:id',             element: L(<InteresesDetalle />) },
          { path: 'prima/:id',                 element: L(<PrimaDetalle />) },
          { path: 'vacaciones/:id',            element: L(<VacacionesDetalle />) },
          { path: 'liquidacion-final/:id',     element: L(<LiquidacionFinalDetalle />) },
        ],
      },

      { path: 'operaciones',                     element: <ProtectedRoute permiso="operaciones.ver">{L(<Operaciones />)}</ProtectedRoute> },
      { path: 'operaciones/planilla/nueva',      element: L(<NuevaPlanillaWizard />) },
      { path: 'operaciones/planilla/editar/:id', element: L(<NuevaPlanillaWizard />) },
      { path: 'operaciones/planilla/:id',        element: L(<VerPlanilla />) },

      { path: 'viajes',                    element: <ProtectedRoute permiso="remisiones.ver">{L(<Viajes />)}</ProtectedRoute> },
      { path: 'viajes/nuevo',              element: L(<NuevoEditarViaje />) },
      { path: 'viajes/editar/:id',         element: L(<NuevoEditarViaje />) },
      { path: 'viajes/:id/conteo',         element: L(<ConteoCosecha />) },
      { path: 'viajes/:id/conteo-wizard',  element: L(<ConteoCosechaWizard />) },
      { path: 'viajes/:id',                element: L(<DetalleViaje />) },
      { path: 'remisiones',                element: L(<Viajes />) },
      { path: 'remisiones/:id',            element: L(<DetalleViaje />) },

      { path: 'market',                  element: L(<Market />) },
      { path: 'market/proveedores',      element: L(<Proveedores />) },
      { path: 'market/proveedores/:id',  element: L(<ProveedorDetalle />) },
      { path: 'market/productos/:id',    element: L(<ProductoDetalle />) },
      { path: 'market/carrito',          element: L(<Carrito />) },
      { path: 'market/checkout',         element: L(<Checkout />) },
      { path: 'market/pedidos',          element: L(<Pedidos />) },
      { path: 'market/pedidos/:id',      element: L(<PedidoDetalle />) },

      { path: 'usuarios',              element: <ProtectedRoute permiso="usuarios.ver">{L(<Usuarios />)}</ProtectedRoute> },
      { path: 'usuarios/nuevo',        element: <ProtectedRoute permiso="usuarios.crear">{L(<UsuarioNuevoEditar />)}</ProtectedRoute> },
      { path: 'usuarios/editar/:id',   element: <ProtectedRoute permiso="usuarios.editar">{L(<UsuarioNuevoEditar />)}</ProtectedRoute> },
      { path: 'usuarios/permisos/:id', element: <ProtectedRoute permiso="usuarios.editar_permisos">{L(<UsuarioPermisos />)}</ProtectedRoute> },
      { path: 'usuarios/:id',          element: L(<UsuarioDetalle />) },

      { path: 'perfil',                          element: L(<MiPerfil />) },
      { path: 'configuracion',                   element: <ProtectedRoute permiso="configuracion.editar">{L(<Configuracion />)}</ProtectedRoute> },
      { path: 'configuracion/conceptos/nuevo',   element: <ProtectedRoute permiso="configuracion.editar">{L(<NuevoConceptoNomina />)}</ProtectedRoute> },
      { path: 'configuracion/conceptos/editar',  element: <ProtectedRoute permiso="configuracion.editar">{L(<NuevoConceptoNomina />)}</ProtectedRoute> },
      { path: 'configuracion/extractoras/nueva',     element: <ProtectedRoute permiso="configuracion.editar">{L(<NuevaExtractora />)}</ProtectedRoute> },
      { path: 'configuracion/extractoras/editar/:id', element: <ProtectedRoute permiso="configuracion.editar">{L(<NuevaExtractora />)}</ProtectedRoute> },
      { path: 'configuracion/terceros/nuevo',        element: <ProtectedRoute permiso="configuracion.editar">{L(<NuevoTerceroWizard />)}</ProtectedRoute> },
      { path: 'maestros', element: <Navigate to="/configuracion" replace /> },

      { path: '403', element: <SinPermisos /> },
      { path: '*',   element: <NotFound /> },
    ],
  },
]);
