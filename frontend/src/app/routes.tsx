import { createBrowserRouter, Navigate } from 'react-router';
import Root from './Root';

// Auth
import Login from './pages/auth/Login';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import SeleccionarFinca from './pages/auth/SeleccionarFinca';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Agente IA
import AgenteIA from './pages/agente-ia/AgenteIA';

// Métricas
import ProductividadColaboradores from './pages/metricas/ProductividadColaboradores';
import PreciosCosecha from './pages/metricas/PreciosCosecha';
import PromediosLote from './pages/metricas/PromediosLote';
import EstadisticasGenerales from './pages/metricas/EstadisticasGenerales';
import ComparativosHistoricos from './pages/metricas/ComparativosHistoricos';

// Plantación
import MiPlantacion from './pages/plantacion/MiPlantacion';
import CrearEditarPredio from './pages/plantacion/CrearEditarPredio';
import NuevoPredioWizard from './pages/plantacion/NuevoPredioWizard';
import CrearEditarLote from './pages/plantacion/CrearEditarLote';
import LoteDetalle from './pages/plantacion/LoteDetalle';
import CrearSublote from './pages/plantacion/CrearSublote';
import CrearLinea from './pages/plantacion/CrearLinea';
import CrearPalmas from './pages/plantacion/CrearPalmas';

// Colaboradores
import Colaboradores from './pages/colaboradores/Colaboradores';
import ColaboradorDetail from './pages/colaboradores/ColaboradorDetail';
import NuevoColaboradorWizard from './pages/colaboradores/NuevoColaboradorWizard';

// Nómina
import Nomina from './pages/nomina/Nomina';
import NominaDetalle from './pages/nomina/NominaDetalle';

// Liquidaciones
import Liquidaciones from './pages/liquidaciones/Liquidaciones';

// Operaciones
import Operaciones from './pages/operaciones/Operaciones';
import NuevaPlanillaWizard from './pages/operaciones/NuevaPlanillaWizard';
import VerPlanilla from './pages/operaciones/Verplanilla';

// Viajes
import Viajes from './pages/viajes/Viajes';
import DetalleViaje from './pages/viajes/DetalleViaje';
import NuevoViajeWizard from './pages/viajes/NuevoViajeWizard';
import ConteoCosecha from './pages/viajes/ConteoCosecha';
import ConteoCosechaWizard from './pages/viajes/Conteocosechawizard';
import NuevoEditarViaje from './pages/viajes/Nuevoeditarviaje';

// Market
import Market from './pages/market/Market';
import Proveedores from './pages/market/Proveedores';
import ProveedorDetalle from './pages/market/Proveedordetalle';
import ProductoDetalle from './pages/market/Productodetalle';
import Carrito from './pages/market/Carrito';
import Checkout from './pages/market/Checkout';
import Pedidos from './pages/market/Pedidos';
import PedidoDetalle from './pages/market/Pedidodetalle';

// Usuarios
import Usuarios from './pages/usuarios/Usuarios';
import UsuarioDetalle from './pages/usuarios/UsuarioDetalle';
import UsuarioNuevoEditar from './pages/usuarios/UsuarioNuevoEditar';
import UsuarioPermisos from './pages/usuarios/UsuarioPermisos';

// Configuración
import Configuracion from './pages/configuracion/Configuracion';

import MiPerfil from './pages/perfil/MiPerfil';
import ProtectedRoute from './components/common/ProtectedRoute';
import SinAcceso from './pages/errors/SinAcceso';

// Errores
import NotFound from './pages/errors/NotFound';
import SinPermisos from './pages/errors/SinPermisos';

// Super Admin
import SuperAdminLogin from './pages/super-admin/SuperAdminLogin';
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import Fincas from './pages/super-admin/Fincas';
import UsuariosFinca from './pages/super-admin/UsuariosFinca';
import Actividad from './pages/super-admin/Actividad';
import Diagnosticos from './pages/super-admin/Diagnosticos';
import RecuperarPasswordSuperAdmin from './pages/super-admin/RecuperarPassword';
import RestablecerPasswordSuperAdmin from './pages/super-admin/RestablecerPassword';

// Proveedor (módulo independiente — cuenta separada)
import ProveedorLogin from './pages/proveedor/ProveedorLogin';
import ProveedorLayout from './pages/proveedor/ProveedorLayout';
import ProveedorDashboard from './pages/proveedor/ProveedorDashboard';
import ProveedorProductos from './pages/proveedor/ProveedorProductos';
import ProveedorPedidos from './pages/proveedor/ProveedorPedidos';
import ProveedorEstadisticas from './pages/proveedor/ProveedorEstadisticas';
import ProveedorConfiguracion from './pages/proveedor/ProveedorConfiguracion';
import NuevoProductoProv from './pages/proveedor/NuevoProducto';
import EditarProductoProv from './pages/proveedor/EditarProducto';
import ProductoDetalleProv from './pages/proveedor/ProductoDetalle';
import CargaMasivaProductos from './pages/proveedor/CargaMasivaProductos';
import PedidoDetalleProv from './pages/proveedor/PedidoDetalle';
import ConfiguracionInicialWizard from './pages/proveedor/ConfiguracionInicialWizard';

export const router = createBrowserRouter([
  // ─── Auth finca ───────────────────────────────────────────────────────────
  { path: '/login',                element: <Login /> },
  { path: '/recuperar-password',   element: <RecuperarPassword /> },
  { path: '/restablecer-password', element: <RestablecerPassword /> },
  { path: '/reset-password',                    element: <RestablecerPassword /> },
  { path: '/recuperar-password/reset-password', element: <RestablecerPassword /> },
  { path: '/reset-password',                    element: <RestablecerPassword /> },
  { path: '/recuperar-password/reset-password', element: <RestablecerPassword /> },
  { path: '/seleccionar-finca',    element: <SeleccionarFinca /> },
  { path: '/sin-permisos',          element: <SinAcceso /> },

  // ─── Super Admin ──────────────────────────────────────────────────────────
  { path: '/super-admin/login',                element: <SuperAdminLogin /> },
  { path: '/super-admin/recuperar-password',   element: <RecuperarPasswordSuperAdmin /> },
  { path: '/super-admin/restablecer-password', element: <RestablecerPasswordSuperAdmin /> },
  {
    path: '/super-admin',
    element: <SuperAdminLayout />,
    children: [
      { index: true,                          element: <Navigate to="/super-admin/dashboard" replace /> },
      { path: 'dashboard',                    Component: SuperAdminDashboard },
      { path: 'fincas',                       Component: Fincas },
      { path: 'fincas/:tenantId/usuarios',    Component: UsuariosFinca },
      { path: 'actividad',                    Component: Actividad },
      { path: 'diagnosticos',                 Component: Diagnosticos },
    ],
  },

  // ─── Proveedor (cuenta separada, login propio) ────────────────────────────
  { path: '/proveedor/login',                element: <ProveedorLogin /> },
  { path: '/proveedor/configuracion-inicial', element: <ConfiguracionInicialWizard /> },
  {
    path: '/proveedor',
    element: <ProveedorLayout />,
    children: [
      { index: true,                          element: <Navigate to="/proveedor/dashboard" replace /> },
      { path: 'dashboard',                    Component: ProveedorDashboard },
      { path: 'productos',                    Component: ProveedorProductos },
      { path: 'productos/nuevo',              Component: NuevoProductoProv },
      { path: 'productos/carga-masiva',       Component: CargaMasivaProductos },
      { path: 'productos/editar/:id',         Component: EditarProductoProv },
      { path: 'productos/:id',                Component: ProductoDetalleProv },
      { path: 'pedidos',                      Component: ProveedorPedidos },
      { path: 'pedidos/:id',                  Component: PedidoDetalleProv },
      { path: 'estadisticas',                 Component: ProveedorEstadisticas },
      { path: 'configuracion',                Component: ProveedorConfiguracion },
    ],
  },

  // ─── App finca ────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <ProtectedRoute permiso="dashboard.ver"><Dashboard /></ProtectedRoute> },

      { path: 'agente-ia', Component: AgenteIA },


      { path: 'metricas/productividad-colaboradores', Component: ProductividadColaboradores },
      { path: 'metricas/precios-cosecha',             Component: PreciosCosecha },
      { path: 'metricas/promedios-lote',              Component: PromediosLote },
      { path: 'metricas/estadisticas-generales',      Component: EstadisticasGenerales },
      { path: 'metricas/comparativos-historicos',     Component: ComparativosHistoricos },

      { path: 'plantacion',               element: <ProtectedRoute permiso="lotes.ver"><MiPlantacion /></ProtectedRoute> },
      { path: 'plantacion/predio/nuevo',  Component: NuevoPredioWizard },
      { path: 'plantacion/lote/nuevo',    Component: CrearEditarLote },
      { path: 'plantacion/lote/:id',      Component: LoteDetalle },
      { path: 'plantacion/sublote/nuevo', Component: CrearSublote },
      { path: 'plantacion/linea/nuevo',   Component: CrearLinea },
      { path: 'plantacion/palmas/nuevo',  Component: CrearPalmas },

      { path: 'colaboradores',            element: <ProtectedRoute permiso="colaboradores.ver"><Colaboradores /></ProtectedRoute> },
      { path: 'colaboradores/nuevo',      Component: NuevoColaboradorWizard },
      { path: 'colaboradores/editar/:id', Component: NuevoColaboradorWizard },
      { path: 'colaboradores/:id',        Component: ColaboradorDetail },

      { path: 'nomina',     element: <ProtectedRoute permiso="nomina.ver"><Nomina /></ProtectedRoute> },
      { path: 'nomina/:id',       Component: NominaDetalle },

      { path: 'liquidaciones', Component: Liquidaciones },

      { path: 'operaciones',                  element: <ProtectedRoute permiso="operaciones.ver"><Operaciones /></ProtectedRoute> },
      { path: 'operaciones/planilla/nueva',   Component: NuevaPlanillaWizard },
      { path: 'operaciones/planilla/editar/:id', Component: NuevaPlanillaWizard },
      { path: 'operaciones/planilla/:id',     Component: VerPlanilla },

      { path: 'viajes',                    element: <ProtectedRoute permiso="remisiones.ver"><Viajes /></ProtectedRoute> },
      { path: 'viajes/nuevo',              Component: NuevoEditarViaje },
      { path: 'viajes/editar/:id',         Component: NuevoEditarViaje },
      { path: 'viajes/:id/conteo',         Component: ConteoCosecha },
      { path: 'viajes/:id/conteo-wizard',  Component: ConteoCosechaWizard },
      { path: 'viajes/:id',                Component: DetalleViaje },
      { path: 'remisiones',        Component: Viajes },
      { path: 'remisiones/:id',    Component: DetalleViaje },

      { path: 'market',                  Component: Market },
      { path: 'market/proveedores',      Component: Proveedores },
      { path: 'market/proveedores/:id',  Component: ProveedorDetalle },
      { path: 'market/productos/:id',    Component: ProductoDetalle },
      { path: 'market/carrito',          Component: Carrito },
      { path: 'market/checkout',         Component: Checkout },
      { path: 'market/pedidos',          Component: Pedidos },
      { path: 'market/pedidos/:id',      Component: PedidoDetalle },

      { path: 'usuarios',              element: <ProtectedRoute permiso="usuarios.ver"><Usuarios /></ProtectedRoute> },
      { path: 'usuarios/nuevo',        element: <ProtectedRoute permiso="usuarios.crear"><UsuarioNuevoEditar /></ProtectedRoute> },
      { path: 'usuarios/editar/:id',   element: <ProtectedRoute permiso="usuarios.editar"><UsuarioNuevoEditar /></ProtectedRoute> },
      { path: 'usuarios/permisos/:id', element: <ProtectedRoute permiso="usuarios.editar_permisos"><UsuarioPermisos /></ProtectedRoute> },
      { path: 'usuarios/:id',          Component: UsuarioDetalle },

      { path: 'perfil',         Component: MiPerfil },
      { path: 'configuracion', element: <ProtectedRoute permiso="configuracion.editar"><Configuracion /></ProtectedRoute> },
      { path: 'maestros', element: <Navigate to="/configuracion" replace /> },

      { path: '403', Component: SinPermisos },
      { path: '*',   Component: NotFound },
    ],
  },
]);