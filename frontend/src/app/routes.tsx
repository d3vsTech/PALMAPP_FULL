import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

// ─── Carga eager (críticos para el primer paint) ─────────────────────────────
import Root from './Root';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFound from './pages/errors/NotFound';
import SinPermisos from './pages/errors/SinPermisos';
import SinAcceso from './pages/errors/SinAcceso';
import ErrorRuta from './pages/errors/ErrorRuta';

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
const ImportarColaboradores  = lazyWithRetry(() => import('./pages/colaboradores/ImportarColaboradores'));

// Nómina
const Nomina = lazyWithRetry(() => import('./pages/nomina/Nomina'));
const NominaDetalle = lazyWithRetry(() => import('./pages/nomina/NominaDetalle'));
const NuevaNominaWizard = lazyWithRetry(() => import('./pages/nomina/NuevaNominaWizard'));
const NuevoPrestamo = lazyWithRetry(() => import('./pages/nomina/NuevoPrestamo'));
const Prestamos = lazyWithRetry(() => import('./pages/nomina/Prestamos'));
const PrestamoDetalle = lazyWithRetry(() => import('./pages/nomina/PrestamoDetalle'));
const AbonosPrestamo = lazyWithRetry(() => import('./pages/nomina/AbonosPrestamo'));
const LiquidarTerceros = lazyWithRetry(() => import('./pages/nomina/LiquidarTerceros'));
const LiquidarTerceroDetalle = lazyWithRetry(() => import('./pages/nomina/LiquidarTerceroDetalle'));
const NuevaLiquidacionWizard = lazyWithRetry(() => import('./pages/nomina/NuevaLiquidacionWizard'));
const LiquidarColaborador = lazyWithRetry(() => import('./pages/nomina/LiquidarColaborador'));
const VerLiquidacion = lazyWithRetry(() => import('./pages/nomina/VerLiquidacion'));
const PlanillaDiaria = lazyWithRetry(() => import('./pages/nomina/PlanillaDiaria'));
const DesprendiblePago = lazyWithRetry(() => import('./pages/nomina/DesprendiblePago'));
const ImportarNominasPage = lazyWithRetry(() => import('./pages/nomina/ImportarNominasPage'));

// Novedades
const NovedadesPage = lazyWithRetry(() => import('./pages/novedades/NovedadesPage'));
const NuevaNovedadPage = lazyWithRetry(() => import('./pages/novedades/NuevaNovedadPage'));
const ImportarNovedadesPage = lazyWithRetry(() => import('./pages/novedades/ImportarNovedadesPage'));

// Liquidaciones
const LiquidacionesLayout = lazyWithRetry(() => import('./pages/liquidaciones/LiquidacionesLayout'));
const Liquidaciones = lazyWithRetry(() => import('./pages/liquidaciones/Liquidaciones'));
const CesantiasDetalle = lazyWithRetry(() => import('./pages/liquidaciones/CesantiasDetalle'));
const InteresesDetalle = lazyWithRetry(() => import('./pages/liquidaciones/InteresesDetalle'));
const PrimaDetalle = lazyWithRetry(() => import('./pages/liquidaciones/PrimaDetalle'));
const VacacionesDetalle = lazyWithRetry(() => import('./pages/liquidaciones/VacacionesDetalle'));
const VacacionesHistorico = lazyWithRetry(() => import('./pages/liquidaciones/VacacionesHistorico'));
const LaboratorioPdf = lazyWithRetry(() => import('./pages/dev/LaboratorioPdf'));
const CargaHistoricoVacaciones = lazyWithRetry(() => import('./pages/liquidaciones/vacaciones/CargaHistoricoVacaciones'));
const CargaHistoricoCesantias  = lazyWithRetry(() => import('./pages/liquidaciones/historico/CargaHistoricoCesantias'));
const CargaHistoricoPrima      = lazyWithRetry(() => import('./pages/liquidaciones/historico/CargaHistoricoPrima'));
const CargaHistoricoFinal      = lazyWithRetry(() => import('./pages/liquidaciones/historico/CargaHistoricoLiquidacionFinal'));
const CargaHistoricoVacArchivo = lazyWithRetry(() => import('./pages/liquidaciones/historico/CargaHistoricoVacacionesArchivo'));
const LiquidacionFinalDetalle = lazyWithRetry(() => import('./pages/liquidaciones/LiquidacionFinalDetalle'));
const NuevaCesantia = lazyWithRetry(() => import('./pages/liquidaciones/NuevaCesantia'));
const NuevaIntereses = lazyWithRetry(() => import('./pages/liquidaciones/NuevaIntereses'));
const NuevaPrima = lazyWithRetry(() => import('./pages/liquidaciones/NuevaPrima'));
const NuevaVacaciones = lazyWithRetry(() => import('./pages/liquidaciones/NuevaVacaciones'));
const NuevaLiquidacionFinal = lazyWithRetry(() => import('./pages/liquidaciones/NuevaLiquidacionFinal'));

// Operaciones
const Operaciones = lazyWithRetry(() => import('./pages/operaciones/Operaciones'));
const NuevaPlanillaWizard = lazyWithRetry(() => import('./pages/operaciones/NuevaPlanillaWizard'));
const VerPlanilla = lazyWithRetry(() => import('./pages/operaciones/Verplanilla'));
const ImportarOperacionesPage = lazyWithRetry(() => import('./pages/operaciones/ImportarOperacionesPage'));

// Viajes
const Viajes = lazyWithRetry(() => import('./pages/viajes/Viajes'));
const DetalleViaje = lazyWithRetry(() => import('./pages/viajes/DetalleViaje'));
const ConteoCosecha = lazyWithRetry(() => import('./pages/viajes/ConteoCosecha'));
const NuevoEditarViaje = lazyWithRetry(() => import('./pages/viajes/Nuevoeditarviaje'));
const AjustesCosecha = lazyWithRetry(() => import('./pages/viajes/AjustesCosecha'));
const ImportarViajesPage = lazyWithRetry(() => import('./pages/viajes/ImportarViajesPage'));

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
const EditarTerceroWizard = lazyWithRetry(() => import('./pages/configuracion/EditarTerceroWizard'));
const NuevaExtractora = lazyWithRetry(() => import('./pages/configuracion/NuevaExtractora'));
const CalendarioFestivos = lazyWithRetry(() => import('./pages/configuracion/CalendarioFestivos'));

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
const ProveedorLayout = lazyWithRetry(() => import('./pages/proveedor/Proveedorlayout'));
const ProveedorDashboard = lazyWithRetry(() => import('./pages/proveedor/ProveedorDashboard'));
const ProveedorProductos = lazyWithRetry(() => import('./pages/proveedor/ProveedorProductos'));
const ProveedorPedidos = lazyWithRetry(() => import('./pages/proveedor/ProveedorPedidos'));
const ProveedorEstadisticas = lazyWithRetry(() => import('./pages/proveedor/ProveedorEstadisticas'));
const ProveedorConfiguracion = lazyWithRetry(() => import('./pages/proveedor/ProveedorConfiguracion'));
const MiPerfilProveedor = lazyWithRetry(() => import('./pages/proveedor/MiPerfilProveedor'));
const NuevoProductoProv = lazyWithRetry(() => import('./pages/proveedor/NuevoProducto'));
const EditarProductoProv = lazyWithRetry(() => import('./pages/proveedor/EditarProducto'));
const ProductoDetalleProv = lazyWithRetry(() => import('./pages/proveedor/Productodetalle'));
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
function conSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

/**
 * Ruta lazy protegida por permiso. Se usa el MISMO permiso del listado del
 * módulo para todas sus pantallas hijas: quien puede ver el módulo entra,
 * quien no, cae en /403 aunque escriba la URL directa. Los permisos
 * granulares (crear/editar) los valida el backend en cada endpoint.
 */
function protegida(permiso: string, node: React.ReactNode) {
  return <ProtectedRoute permiso={permiso}>{conSuspense(node)}</ProtectedRoute>;
}

/**
 * Ruta suelta de primer nivel, como los login. No cuelga de ningún layout, así
 * que necesita su propia pantalla de error: sin ella, un fallo ahí deja la
 * página en blanco y sin salida. Las rutas hijas no la necesitan; heredan la
 * de su árbol.
 */
function ruta(path: string, element: React.ReactNode) {
  return { path, element, errorElement: <ErrorRuta /> };
}

export const router = createBrowserRouter([
  // ─── Auth finca ───────────────────────────────────────────────────────────
  ruta('/login', <Login />),
  ruta('/recuperar-password', conSuspense(<RecuperarPassword />)),
  ruta('/restablecer-password', conSuspense(<RestablecerPassword />)),
  ruta('/reset-password', conSuspense(<RestablecerPassword />)),
  ruta('/recuperar-password/reset-password', conSuspense(<RestablecerPassword />)),
  ruta('/seleccionar-finca', conSuspense(<SeleccionarFinca />)),
  ruta('/sin-permisos', <SinAcceso />),

  /**
   * Banco de pruebas de los PDF que arma el navegador. Público y solo en
   * desarrollo: los documentos no dependen del backend, pero las pantallas que
   * los descargan sí exigen sesión, así que con la API caída no había forma de
   * revisarlos. `import.meta.env.DEV` deja la ruta fuera del build.
   */
  ...(import.meta.env.DEV
    ? [ruta('/pdf-lab', conSuspense(<LaboratorioPdf />))]
    : []),

  // ─── Super Admin ──────────────────────────────────────────────────────────
  ruta('/super-admin/login', conSuspense(<SuperAdminLogin />)),
  ruta('/super-admin/recuperar-password', conSuspense(<RecuperarPasswordSuperAdmin />)),
  ruta('/super-admin/restablecer-password', conSuspense(<RestablecerPasswordSuperAdmin />)),
  {
    path: '/super-admin',
    element: conSuspense(<SuperAdminLayout />),
    errorElement: <ErrorRuta />,
    children: [
      { index: true,                          element: <Navigate to="/super-admin/dashboard" replace /> },
      { path: 'dashboard',                    element: conSuspense(<SuperAdminDashboard />) },
      { path: 'fincas',                       element: conSuspense(<Fincas />) },
      { path: 'fincas/:tenantId/usuarios',    element: conSuspense(<UsuariosFinca />) },
      { path: 'proveedores',                       element: conSuspense(<ProveedoresAdmin />) },
      { path: 'proveedores/:proveedorId/usuarios', element: conSuspense(<UsuariosProveedor />) },
      { path: 'actividad',                    element: conSuspense(<Actividad />) },
      { path: 'diagnosticos',                 element: conSuspense(<Diagnosticos />) },
    ],
  },

  // ─── Proveedor (cuenta separada, login propio) ────────────────────────────
  ruta('/proveedor/login', conSuspense(<ProveedorLogin />)),
  ruta('/proveedor/seleccionar', conSuspense(<SeleccionarProveedor />)),
  ruta('/proveedor/recuperar-password', conSuspense(<ProveedorRecuperarPassword />)),
  ruta('/proveedor/restablecer-password', conSuspense(<ProveedorRestablecerPassword />)),
  ruta('/proveedor/reset-password', conSuspense(<ProveedorRestablecerPassword />)),
  // El backend a veces arma el link como {FRONTEND_PROVEEDOR_URL}/reset-password
  // donde FRONTEND_PROVEEDOR_URL = ".../proveedor/recuperar-password", lo que
  // termina apuntando aquí. Mismo render que /proveedor/reset-password.
  ruta('/proveedor/recuperar-password/reset-password', conSuspense(<ProveedorRestablecerPassword />)),
  ruta('/proveedor/configuracion-inicial', conSuspense(<ConfiguracionInicialWizard />)),
  {
    path: '/proveedor',
    element: conSuspense(<ProveedorLayout />),
    errorElement: <ErrorRuta />,
    children: [
      { index: true,                          element: <Navigate to="/proveedor/dashboard" replace /> },
      { path: 'dashboard',                    element: conSuspense(<ProveedorDashboard />) },
      { path: 'productos',                    element: conSuspense(<ProveedorProductos />) },
      { path: 'productos/nuevo',              element: conSuspense(<NuevoProductoProv />) },
      { path: 'productos/carga-masiva',       element: conSuspense(<CargaMasivaProductos />) },
      { path: 'productos/editar/:id',         element: conSuspense(<EditarProductoProv />) },
      { path: 'productos/:id',                element: conSuspense(<ProductoDetalleProv />) },
      { path: 'pedidos',                      element: conSuspense(<ProveedorPedidos />) },
      { path: 'pedidos/:id',                  element: conSuspense(<PedidoDetalleProv />) },
      { path: 'estadisticas',                 element: conSuspense(<ProveedorEstadisticas />) },
      { path: 'configuracion',                element: conSuspense(<ProveedorConfiguracion />) },
      { path: 'perfil',                       element: conSuspense(<MiPerfilProveedor />) },
    ],
  },

  // ─── App finca ────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorRuta />,
    children: [
      { index: true, element: <ProtectedRoute permiso="dashboard.ver">{conSuspense(<Dashboard />)}</ProtectedRoute> },

      { path: 'agente-ia', element: conSuspense(<AgenteIA />) },

      { path: 'metricas/productividad-colaboradores', element: conSuspense(<ProductividadColaboradores />) },
      { path: 'metricas/precios-cosecha',             element: conSuspense(<PreciosCosecha />) },
      { path: 'metricas/promedios-lote',              element: conSuspense(<PromediosLote />) },
      { path: 'metricas/estadisticas-generales',      element: conSuspense(<EstadisticasGenerales />) },
      { path: 'metricas/comparativos-historicos',     element: conSuspense(<ComparativosHistoricos />) },

      { path: 'plantacion',               element: protegida('lotes.ver', <MiPlantacion />) },
      { path: 'plantacion/predio/nuevo',  element: protegida('lotes.ver', <NuevoPredioWizard />) },
      { path: 'plantacion/lote/nuevo',    element: protegida('lotes.ver', <CrearEditarLote />) },
      { path: 'plantacion/lote/:id',      element: protegida('lotes.ver', <LoteDetalle />) },
      { path: 'plantacion/sublote/nuevo', element: protegida('lotes.ver', <CrearSublote />) },
      { path: 'plantacion/linea/nuevo',   element: protegida('lotes.ver', <CrearLinea />) },
      { path: 'plantacion/palmas/nuevo',  element: protegida('lotes.ver', <CrearPalmas />) },

      { path: 'colaboradores',            element: protegida('colaboradores.ver', <Colaboradores />) },
      { path: 'colaboradores/nuevo',      element: protegida('colaboradores.ver', <NuevoColaboradorWizard />) },
      { path: 'colaboradores/importar',   element: protegida('colaboradores.crear', <ImportarColaboradores />) },
      { path: 'colaboradores/editar/:id', element: protegida('colaboradores.ver', <NuevoColaboradorWizard />) },
      { path: 'colaboradores/:id',        element: protegida('colaboradores.ver', <ColaboradorDetail />) },

      { path: 'nomina',                     element: protegida('nomina.ver', <Nomina />) },
      { path: 'nomina/nueva',               element: protegida('nomina.ver', <NuevaNominaWizard />) },
      { path: 'nomina/:id/editar',          element: protegida('nomina.ver', <NuevaNominaWizard />) },
      { path: 'nomina/prestamos',                       element: protegida('nomina.ver', <Prestamos />) },
      { path: 'nomina/prestamos/:prestamoId/abonos',    element: protegida('nomina.ver', <AbonosPrestamo />) },
      { path: 'nomina/prestamos/:id',                   element: protegida('nomina.ver', <PrestamoDetalle />) },
      { path: 'nomina/nuevo-prestamo',                  element: protegida('nomina.ver', <NuevoPrestamo />) },
      { path: 'nomina/importar',            element: protegida('nomina.ver', <ImportarNominasPage />) },
      { path: 'nomina/planilla-diaria',     element: protegida('nomina.ver', <PlanillaDiaria />) },
      { path: 'nomina/liquidacion/nueva',   element: protegida('nomina.ver', <NuevaLiquidacionWizard />) },
      { path: 'nomina/:id',                 element: protegida('nomina.ver', <NominaDetalle />) },
      { path: 'nomina/:nominaId/liquidar/:colaboradorId',     element: protegida('nomina.ver', <LiquidarColaborador />) },
      { path: 'nomina/:nominaId/ver/:colaboradorId',          element: protegida('nomina.ver', <VerLiquidacion />) },
      { path: 'nomina/:nominaId/desprendible/:colaboradorId', element: protegida('nomina.ver', <DesprendiblePago />) },
      { path: 'nomina/:nominaId/liquidar-terceros',           element: protegida('nomina.ver', <LiquidarTerceros />) },
      { path: 'nomina/:nominaId/tercero/:terceroId/liquidar', element: protegida('nomina.ver', <LiquidarTerceroDetalle />) },

      {
        path: 'liquidaciones',
        element: <ProtectedRoute permiso="liquidaciones.ver">{conSuspense(<LiquidacionesLayout />)}</ProtectedRoute>,
        children: [
          { index: true,                       element: conSuspense(<Liquidaciones />) },
          { path: 'cesantias/nueva',           element: conSuspense(<NuevaCesantia />) },
          { path: 'cesantias/:id',             element: conSuspense(<CesantiasDetalle />) },
          { path: 'intereses/nueva',           element: conSuspense(<NuevaIntereses />) },
          { path: 'intereses/:id',             element: conSuspense(<InteresesDetalle />) },
          { path: 'prima/nueva',               element: conSuspense(<NuevaPrima />) },
          { path: 'prima/:id',                 element: conSuspense(<PrimaDetalle />) },
          { path: 'vacaciones/nueva',          element: conSuspense(<NuevaVacaciones />) },
          { path: 'vacaciones/historico',      element: conSuspense(<VacacionesHistorico />) },
          { path: 'vacaciones/carga-historico', element: conSuspense(<CargaHistoricoVacArchivo />) },
          { path: 'vacaciones/carga-historico/manual', element: conSuspense(<CargaHistoricoVacaciones />) },
          { path: 'cesantias/carga-historico', element: conSuspense(<CargaHistoricoCesantias />) },
          { path: 'prima/carga-historico',     element: conSuspense(<CargaHistoricoPrima />) },
          { path: 'finales/carga-historico',   element: conSuspense(<CargaHistoricoFinal />) },
          { path: 'vacaciones/:id',            element: conSuspense(<VacacionesDetalle />) },
          { path: 'liquidacion-final/nueva',   element: conSuspense(<NuevaLiquidacionFinal />) },
          { path: 'liquidacion-final/:id/editar', element: conSuspense(<NuevaLiquidacionFinal />) },
          { path: 'liquidacion-final/:id',     element: conSuspense(<LiquidacionFinalDetalle />) },
        ],
      },

      { path: 'operaciones',                     element: protegida('operaciones.ver', <Operaciones />) },
      { path: 'operaciones/planilla/nueva',      element: protegida('operaciones.ver', <NuevaPlanillaWizard />) },
      { path: 'operaciones/planilla/editar/:id', element: protegida('operaciones.ver', <NuevaPlanillaWizard />) },
      { path: 'operaciones/planilla/:id',        element: protegida('operaciones.ver', <VerPlanilla />) },
      { path: 'operaciones/importar',            element: protegida('operaciones.importar', <ImportarOperacionesPage />) },

      { path: 'novedades',                 element: protegida('novedades.ver', <NovedadesPage />) },
      { path: 'novedades/nueva',           element: protegida('novedades.ver', <NuevaNovedadPage />) },
      { path: 'novedades/importar',        element: protegida('novedades.importar', <ImportarNovedadesPage />) },

      { path: 'viajes',                    element: protegida('viajes.ver', <Viajes />) },
      { path: 'viajes/ajustes-cosecha',    element: protegida('viajes.ver', <AjustesCosecha />) },
      { path: 'viajes/nuevo',              element: protegida('viajes.ver', <NuevoEditarViaje />) },
      { path: 'viajes/editar/:id',         element: protegida('viajes.ver', <NuevoEditarViaje />) },
      { path: 'viajes/importar',           element: protegida('viajes.ver', <ImportarViajesPage />) },
      { path: 'viajes/:id/conteo',         element: protegida('viajes.ver', <ConteoCosecha />) },
      { path: 'viajes/:id',                element: protegida('viajes.ver', <DetalleViaje />) },
      { path: 'remisiones',                element: protegida('viajes.ver', <Viajes />) },
      { path: 'remisiones/:id',            element: protegida('viajes.ver', <DetalleViaje />) },

      { path: 'market',                  element: conSuspense(<Market />) },
      { path: 'market/proveedores',      element: conSuspense(<Proveedores />) },
      { path: 'market/proveedores/:id',  element: conSuspense(<ProveedorDetalle />) },
      { path: 'market/productos/:id',    element: conSuspense(<ProductoDetalle />) },
      { path: 'market/carrito',          element: conSuspense(<Carrito />) },
      { path: 'market/checkout',         element: conSuspense(<Checkout />) },
      { path: 'market/pedidos',                element: conSuspense(<Pedidos />) },
      { path: 'market/pedidos/:id',            element: conSuspense(<PedidoDetalle />) },

      { path: 'usuarios',              element: <ProtectedRoute permiso="usuarios.ver">{conSuspense(<Usuarios />)}</ProtectedRoute> },
      { path: 'usuarios/nuevo',        element: <ProtectedRoute permiso="usuarios.crear">{conSuspense(<UsuarioNuevoEditar />)}</ProtectedRoute> },
      { path: 'usuarios/editar/:id',   element: <ProtectedRoute permiso="usuarios.editar">{conSuspense(<UsuarioNuevoEditar />)}</ProtectedRoute> },
      { path: 'usuarios/permisos/:id', element: <ProtectedRoute permiso="usuarios.editar_permisos">{conSuspense(<UsuarioPermisos />)}</ProtectedRoute> },
      { path: 'usuarios/:id',          element: protegida('usuarios.ver', <UsuarioDetalle />) },

      { path: 'perfil',                          element: conSuspense(<MiPerfil />) },
      { path: 'configuracion',                   element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<Configuracion />)}</ProtectedRoute> },
      { path: 'configuracion/conceptos/nuevo',   element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<NuevoConceptoNomina />)}</ProtectedRoute> },
      { path: 'configuracion/conceptos/editar',  element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<NuevoConceptoNomina />)}</ProtectedRoute> },
      { path: 'configuracion/extractoras/nueva',     element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<NuevaExtractora />)}</ProtectedRoute> },
      { path: 'configuracion/extractoras/editar/:id', element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<NuevaExtractora />)}</ProtectedRoute> },
      { path: 'configuracion/terceros/nuevo',        element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<NuevoTerceroWizard />)}</ProtectedRoute> },
      { path: 'configuracion/terceros/editar/:id',   element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<EditarTerceroWizard />)}</ProtectedRoute> },
      { path: 'configuracion/festivos',              element: <ProtectedRoute permiso="configuracion.editar">{conSuspense(<CalendarioFestivos />)}</ProtectedRoute> },
      { path: 'maestros', element: <Navigate to="/configuracion" replace /> },

      { path: '403', element: <SinPermisos /> },
      { path: '*',   element: <NotFound /> },
    ],
  },
]);
