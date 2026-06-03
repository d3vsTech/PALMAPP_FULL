import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

// ─── Carga eager (críticos para el primer paint) ─────────────────────────────
import Root from './Root';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFound from './pages/errors/NotFound';
import SinPermisos from './pages/errors/SinPermisos';
import SinAcceso from './pages/errors/SinAcceso';

// ─── Carga lazy (cada pantalla se descarga al entrar) ────────────────────────
// Auth secundario
const RecuperarPassword = lazy(() => import('./pages/auth/RecuperarPassword'));
const RestablecerPassword = lazy(() => import('./pages/auth/RestablecerPassword'));
const SeleccionarFinca = lazy(() => import('./pages/auth/SeleccionarFinca'));

// Dashboard
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

// Agente IA
const AgenteIA = lazy(() => import('./pages/agente-ia/AgenteIA'));

// Métricas
const ProductividadColaboradores = lazy(() => import('./pages/metricas/ProductividadColaboradores'));
const PreciosCosecha = lazy(() => import('./pages/metricas/PreciosCosecha'));
const PromediosLote = lazy(() => import('./pages/metricas/PromediosLote'));
const EstadisticasGenerales = lazy(() => import('./pages/metricas/EstadisticasGenerales'));
const ComparativosHistoricos = lazy(() => import('./pages/metricas/ComparativosHistoricos'));

// Plantación
const MiPlantacion = lazy(() => import('./pages/plantacion/MiPlantacion'));
const NuevoPredioWizard = lazy(() => import('./pages/plantacion/NuevoPredioWizard'));
const CrearEditarLote = lazy(() => import('./pages/plantacion/CrearEditarLote'));
const LoteDetalle = lazy(() => import('./pages/plantacion/LoteDetalle'));
const CrearSublote = lazy(() => import('./pages/plantacion/CrearSublote'));
const CrearLinea = lazy(() => import('./pages/plantacion/CrearLinea'));
const CrearPalmas = lazy(() => import('./pages/plantacion/CrearPalmas'));

// Colaboradores
const Colaboradores = lazy(() => import('./pages/colaboradores/Colaboradores'));
const ColaboradorDetail = lazy(() => import('./pages/colaboradores/ColaboradorDetail'));
const NuevoColaboradorWizard = lazy(() => import('./pages/colaboradores/NuevoColaboradorWizard'));

// Nómina
const Nomina = lazy(() => import('./pages/nomina/Nomina'));
const NominaDetalle = lazy(() => import('./pages/nomina/NominaDetalle'));
const NuevaNominaWizard = lazy(() => import('./pages/nomina/NuevaNominaWizard'));
const NuevoPrestamo = lazy(() => import('./pages/nomina/NuevoPrestamo'));
const NuevaLiquidacionWizard = lazy(() => import('./pages/nomina/NuevaLiquidacionWizard'));
const LiquidarColaborador = lazy(() => import('./pages/nomina/LiquidarColaborador'));
const VerLiquidacion = lazy(() => import('./pages/nomina/VerLiquidacion'));
const PlanillaDiaria = lazy(() => import('./pages/nomina/PlanillaDiaria'));
const DesprendiblePago = lazy(() => import('./pages/nomina/DesprendiblePago'));

// Liquidaciones
const LiquidacionesLayout = lazy(() => import('./pages/liquidaciones/LiquidacionesLayout'));
const Liquidaciones = lazy(() => import('./pages/liquidaciones/Liquidaciones'));
const CesantiasDetalle = lazy(() => import('./pages/liquidaciones/CesantiasDetalle'));
const InteresesDetalle = lazy(() => import('./pages/liquidaciones/InteresesDetalle'));
const PrimaDetalle = lazy(() => import('./pages/liquidaciones/PrimaDetalle'));
const VacacionesDetalle = lazy(() => import('./pages/liquidaciones/VacacionesDetalle'));
const LiquidacionFinalDetalle = lazy(() => import('./pages/liquidaciones/LiquidacionFinalDetalle'));

// Operaciones
const Operaciones = lazy(() => import('./pages/operaciones/Operaciones'));
const NuevaPlanillaWizard = lazy(() => import('./pages/operaciones/NuevaPlanillaWizard'));
const VerPlanilla = lazy(() => import('./pages/operaciones/Verplanilla'));

// Viajes
const Viajes = lazy(() => import('./pages/viajes/Viajes'));
const DetalleViaje = lazy(() => import('./pages/viajes/DetalleViaje'));
const ConteoCosecha = lazy(() => import('./pages/viajes/ConteoCosecha'));
const ConteoCosechaWizard = lazy(() => import('./pages/viajes/Conteocosechawizard'));
const NuevoEditarViaje = lazy(() => import('./pages/viajes/Nuevoeditarviaje'));

// Market
const Market = lazy(() => import('./pages/market/Market'));
const Proveedores = lazy(() => import('./pages/market/Proveedores'));
const ProveedorDetalle = lazy(() => import('./pages/market/Proveedordetalle'));
const ProductoDetalle = lazy(() => import('./pages/market/Productodetalle'));
const Carrito = lazy(() => import('./pages/market/Carrito'));
const Checkout = lazy(() => import('./pages/market/Checkout'));
const Pedidos = lazy(() => import('./pages/market/Pedidos'));
const PedidoDetalle = lazy(() => import('./pages/market/Pedidodetalle'));

// Usuarios
const Usuarios = lazy(() => import('./pages/usuarios/Usuarios'));
const UsuarioDetalle = lazy(() => import('./pages/usuarios/UsuarioDetalle'));
const UsuarioNuevoEditar = lazy(() => import('./pages/usuarios/UsuarioNuevoEditar'));
const UsuarioPermisos = lazy(() => import('./pages/usuarios/UsuarioPermisos'));

// Configuración
const Configuracion = lazy(() => import('./pages/configuracion/Configuracion'));
const NuevoConceptoNomina = lazy(() => import('./pages/configuracion/NuevoConceptoNomina'));

const MiPerfil = lazy(() => import('./pages/perfil/MiPerfil'));

// Super Admin
const SuperAdminLogin = lazy(() => import('./pages/super-admin/SuperAdminLogin'));
const SuperAdminLayout = lazy(() => import('./pages/super-admin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard'));
const Fincas = lazy(() => import('./pages/super-admin/Fincas'));
const UsuariosFinca = lazy(() => import('./pages/super-admin/UsuariosFinca'));
const ProveedoresAdmin = lazy(() => import('./pages/super-admin/Proveedores'));
const UsuariosProveedor = lazy(() => import('./pages/super-admin/UsuariosProveedor'));
const Actividad = lazy(() => import('./pages/super-admin/Actividad'));
const Diagnosticos = lazy(() => import('./pages/super-admin/Diagnosticos'));
const RecuperarPasswordSuperAdmin = lazy(() => import('./pages/super-admin/RecuperarPassword'));
const RestablecerPasswordSuperAdmin = lazy(() => import('./pages/super-admin/RestablecerPassword'));

// Proveedor (módulo independiente)
const ProveedorLogin = lazy(() => import('./pages/proveedor/ProveedorLogin'));
const ProveedorRecuperarPassword = lazy(() => import('./pages/proveedor/ProveedorRecuperarPassword'));
const ProveedorRestablecerPassword = lazy(() => import('./pages/proveedor/ProveedorRestablecerPassword'));
const SeleccionarProveedor = lazy(() => import('./pages/proveedor/SeleccionarProveedor'));
const ProveedorLayout = lazy(() => import('./pages/proveedor/ProveedorLayout'));
const ProveedorDashboard = lazy(() => import('./pages/proveedor/ProveedorDashboard'));
const ProveedorProductos = lazy(() => import('./pages/proveedor/ProveedorProductos'));
const ProveedorPedidos = lazy(() => import('./pages/proveedor/ProveedorPedidos'));
const ProveedorEstadisticas = lazy(() => import('./pages/proveedor/ProveedorEstadisticas'));
const ProveedorConfiguracion = lazy(() => import('./pages/proveedor/ProveedorConfiguracion'));
const MiPerfilProveedor = lazy(() => import('./pages/proveedor/MiPerfilProveedor'));
const NuevoProductoProv = lazy(() => import('./pages/proveedor/NuevoProducto'));
const EditarProductoProv = lazy(() => import('./pages/proveedor/EditarProducto'));
const ProductoDetalleProv = lazy(() => import('./pages/proveedor/ProductoDetalle'));
const CargaMasivaProductos = lazy(() => import('./pages/proveedor/CargaMasivaProductos'));
const PedidoDetalleProv = lazy(() => import('./pages/proveedor/PedidoDetalle'));
const ConfiguracionInicialWizard = lazy(() => import('./pages/proveedor/ConfiguracionInicialWizard'));

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
      { path: 'maestros', element: <Navigate to="/configuracion" replace /> },

      { path: '403', element: <SinPermisos /> },
      { path: '*',   element: <NotFound /> },
    ],
  },
]);
