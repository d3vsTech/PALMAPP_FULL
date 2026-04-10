import {
  Settings,
  Server,
  Database,
  HardDrive,
  Zap,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Code,
  Cpu,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchConToken } from '../../../api/request';

export default function Diagnosticos() {
  const { token } = useAuth();
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  const cargarDiagnosticos = async () => {
    if (!token) return;

    setCargando(true);

    try {
      const respuesta = await fetchConToken('/api/v1/admin/diagnostics', token);
      const resultado = await respuesta.json();

      if (respuesta.ok) {
        setDatos(resultado.data);
        setUltimaActualizacion(new Date());
      }
    } catch (error) {
      console.error('Error al cargar diagnósticos:', error);
    } finally {
      setLoading(false);
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDiagnosticos();
  }, [token]);

  const diagnosticos = [
    {
      titulo: 'Aplicación',
      icono: Code,
      colorIcono: 'text-[#9032F0]',
      bgIcono: 'from-[#9032F0]/20 to-[#6506FF]/10',
      borderIcono: 'border-[#9032F0]/30',
      datos: [
        { label: 'Nombre', valor: datos?.aplicacion?.nombre ?? 'Cargando...' },
        { label: 'Versión Laravel', valor: datos?.aplicacion?.laravel ?? 'Cargando...' },
        { label: 'Entorno', valor: datos?.aplicacion?.entorno ?? 'Cargando...' },
        { label: 'Zona Horaria', valor: datos?.aplicacion?.timezone ?? 'Cargando...' },
      ],
    },
    {
      titulo: 'Servidor',
      icono: Server,
      colorIcono: 'text-blue-400',
      bgIcono: 'from-blue-500/20 to-blue-600/10',
      borderIcono: 'border-blue-500/30',
      datos: [
        { label: 'Hostname', valor: datos?.servidor?.hostname ?? 'Cargando...' },
        { label: 'Sistema Operativo', valor: datos?.servidor?.sistema_operativo ?? 'Cargando...' },
        { label: 'Servidor Web', valor: datos?.servidor?.servidor_web ?? 'Cargando...' },
        { label: 'Uptime', valor: datos?.servidor?.tiempo_actividad ?? 'Cargando...' },
      ],
    },
    {
      titulo: 'PHP',
      icono: Zap,
      colorIcono: 'text-purple-400',
      bgIcono: 'from-purple-500/20 to-purple-600/10',
      borderIcono: 'border-purple-500/30',
      datos: [
        { label: 'Versión', valor: datos?.php?.version ?? 'Cargando...' },
        { label: 'Memoria Límite', valor: datos?.php?.memoria_limite ?? 'Cargando...' },
        { label: 'Memoria en Uso', valor: datos?.php?.memoria_uso_actual ?? 'Cargando...' },
        { label: 'Extensiones Activas', valor: datos?.php?.extensiones_cargadas ?? 'Cargando...' },
      ],
    },
    {
      titulo: 'Disco',
      icono: HardDrive,
      colorIcono: 'text-yellow-400',
      bgIcono: 'from-yellow-500/20 to-yellow-600/10',
      borderIcono: 'border-yellow-500/30',
      datos: [
        { label: 'Total', valor: datos?.disco?.total ?? 'Cargando...' },
        { label: 'Usado', valor: datos?.disco?.usado ?? 'Cargando...' },
        { label: 'Libre', valor: datos?.disco?.libre ?? 'Cargando...' },
        { label: 'Uso', valor: datos?.disco?.uso_porcentaje ?? 'Cargando...' },
      ],
    },
    {
      titulo: 'Base de Datos',
      icono: Database,
      colorIcono: 'text-green-400',
      bgIcono: 'from-green-500/20 to-green-600/10',
      borderIcono: 'border-green-500/30',
      datos: [
        { label: 'Driver', valor: datos?.base_datos?.driver ?? 'Cargando...' },
        { label: 'Versión', valor: datos?.base_datos?.version ?? 'Cargando...' },
        { label: 'Peso Total', valor: datos?.base_datos?.peso_mb ?? datos?.base_datos?.peso ?? 'Cargando...' },
        { label: 'Total Tablas', valor: datos?.base_datos?.tablas ?? 'Cargando...' },
        { label: 'Conexión', valor: datos?.base_datos?.conexion ?? 'Cargando...' },
      ],
    },
    {
      titulo: 'Cache',
      icono: Activity,
      colorIcono: 'text-cyan-400',
      bgIcono: 'from-cyan-500/20 to-cyan-600/10',
      borderIcono: 'border-cyan-500/30',
      datos: [
        { label: 'Driver', valor: datos?.cache?.driver ?? 'Cargando...' },
        { label: 'Estado', valor: datos?.cache?.estado ?? 'Cargando...' },
      ],
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-[#9032F0]/20 to-[#6506FF]/20 border border-[#9032F0]/30 rounded-xl">
              <Settings className="h-6 w-6 text-[#9032F0]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Diagnósticos del Sistema</h1>
          </div>
          <p className="text-slate-400">
            Información del servidor y estado del sistema en tiempo real
          </p>
        </div>

        <button
          onClick={() => void cargarDiagnosticos()}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#9032F0]/30 rounded-xl text-white transition-all duration-200 group disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 transition-transform ${cargando ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          <span className="text-sm font-medium">Actualizar</span>
        </button>
      </div>

      {/* Última actualización */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Globe className="h-3.5 w-3.5" />
        <span>
          Última actualización: {ultimaActualizacion.toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Grid de diagnósticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {diagnosticos.map((diagnostico, index) => {
          const Icono = diagnostico.icono;

          return (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#9032F0]/30 transition-all duration-300 group"
            >
              {/* Header de la card */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 bg-gradient-to-br ${diagnostico.bgIcono} border ${diagnostico.borderIcono} rounded-xl`}>
                    <Icono className={`h-5 w-5 ${diagnostico.colorIcono}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{diagnostico.titulo}</h3>
                </div>

                {/* Badge de estado */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>OK</span>
                </div>
              </div>

              {/* Datos */}
              <div className="space-y-3">
                {diagnostico.datos.map((dato, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 text-sm">
                    <span className="text-slate-400 font-medium flex-shrink-0">
                      {dato.label}:
                    </span>
                    <span className="text-white font-semibold text-right break-all">
                      {dato.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#9032F0]/10 border border-[#9032F0]/30 rounded-lg flex-shrink-0">
            <Cpu className="h-5 w-5 text-[#9032F0]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">
              Monitoreo en Tiempo Real
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Este panel muestra el estado actual del sistema. Los datos se actualizan cada vez que se recarga la página.
              Para un monitoreo continuo, utilice el botón Actualizar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}