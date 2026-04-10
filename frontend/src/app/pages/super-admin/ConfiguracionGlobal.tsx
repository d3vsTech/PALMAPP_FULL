import { Settings, Bell, Shield, Mail, Database, Zap } from 'lucide-react';

export default function ConfiguracionGlobal() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración Global</h1>
        <p className="text-slate-400">Ajustes generales del sistema AGRO CAMPO</p>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Configuración General</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Nombre del sistema: AGRO CAMPO</p>
            <p>Versión: 1.0.0</p>
            <p>Entorno: Producción</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Notificaciones de vencimiento: Activas</p>
            <p>Alertas de sistema: Activas</p>
            <p>Reportes automáticos: Habilitados</p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Seguridad</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Autenticación de dos factores: Disponible</p>
            <p>Política de contraseñas: Fuerte</p>
            <p>Sesiones: 24 horas</p>
          </div>
        </div>

        {/* Email */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Email</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Servidor SMTP: Configurado</p>
            <p>Emails enviados hoy: 47</p>
            <p>Tasa de entrega: 99.2%</p>
          </div>
        </div>

        {/* Database */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Database className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Base de Datos</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Estado: Operativa</p>
            <p>Último backup: Hace 2 horas</p>
            <p>Uso de almacenamiento: 45%</p>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Rendimiento</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <p>Uptime: 99.8%</p>
            <p>Tiempo de respuesta: 120ms</p>
            <p>Carga del servidor: 34%</p>
          </div>
        </div>
      </div>

      {/* Placeholder */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-12">
        <div className="text-center">
          <Settings className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Configuraciones Avanzadas</h3>
          <p className="text-slate-400">
            Las opciones de configuración detalladas estarán disponibles próximamente.
          </p>
        </div>
      </div>
    </div>
  );
}
