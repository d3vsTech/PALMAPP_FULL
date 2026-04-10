import { Check, Edit2, Package } from 'lucide-react';

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  usuariosPermitidos: number;
  modulosIncluidos: string[];
  color: string;
}

const planesMock: Plan[] = [
  {
    id: '1',
    nombre: 'Básico',
    precio: 99,
    usuariosPermitidos: 10,
    modulosIncluidos: [
      'Dashboard básico',
      'Mi Plantación',
      'Colaboradores',
      'Operaciones básicas',
      'Soporte por email'
    ],
    color: 'from-slate-600 to-slate-700'
  },
  {
    id: '2',
    nombre: 'Profesional',
    precio: 199,
    usuariosPermitidos: 25,
    modulosIncluidos: [
      'Todo lo de Básico',
      'Nómina completa',
      'Control de jornales',
      'Cuadrillas',
      'Viajes y remisiones',
      'Reportes avanzados',
      'Soporte prioritario'
    ],
    color: 'from-blue-600 to-blue-700'
  },
  {
    id: '3',
    nombre: 'Empresarial',
    precio: 399,
    usuariosPermitidos: -1, // Ilimitado
    modulosIncluidos: [
      'Todo lo de Profesional',
      'Control de insumos',
      'Inventario completo',
      'Escalas abonadas',
      'Múltiples predios',
      'API personalizada',
      'Soporte 24/7',
      'Capacitación incluida',
      'Consultoría mensual'
    ],
    color: 'from-purple-600 to-purple-700'
  }
];

export default function Planes() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Planes del Sistema</h1>
        <p className="text-slate-400">Configuración de planes y precios para las fincas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Básico</p>
          <p className="text-2xl font-bold text-white">12 fincas</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Profesional</p>
          <p className="text-2xl font-bold text-blue-400">23 fincas</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Empresarial</p>
          <p className="text-2xl font-bold text-purple-400">12 fincas</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Ingresos mes</p>
          <p className="text-2xl font-bold text-emerald-400">$8,964</p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planesMock.map((plan) => (
          <div
            key={plan.id}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all duration-300 group"
          >
            {/* Header del plan */}
            <div className={`bg-gradient-to-r ${plan.color} p-6 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.nombre}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">${plan.precio}</span>
                  <span className="text-white/70">/mes</span>
                </div>
              </div>
            </div>

            {/* Body del plan */}
            <div className="p-6 space-y-4">
              {/* Usuarios permitidos */}
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-400">Usuarios permitidos</span>
                <span className="text-sm font-semibold text-white">
                  {plan.usuariosPermitidos === -1 ? 'Ilimitados' : plan.usuariosPermitidos}
                </span>
              </div>

              {/* Módulos incluidos */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">Módulos incluidos:</p>
                <div className="space-y-2">
                  {plan.modulosIncluidos.map((modulo, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="mt-0.5 p-1 bg-green-500/10 rounded">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-sm text-slate-400">{modulo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Button */}
              <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <Edit2 className="w-4 h-4" />
                Editar plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info adicional */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuración de Módulos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Control de Jornales</h4>
            <p className="text-xs text-slate-400">
              Cuando está activo, la finca puede gestionar jornales, cuadrillas y labores relacionadas.
            </p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Control de Insumos</h4>
            <p className="text-xs text-slate-400">
              Permite gestionar inventario, insumos y escalas abonadas en la finca.
            </p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Tipo de Pago</h4>
            <p className="text-xs text-slate-400">
              Configure si la finca paga semanal, quincenal o mensualmente a sus colaboradores.
            </p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Múltiples Predios</h4>
            <p className="text-xs text-slate-400">
              Solo disponible en plan Empresarial. Permite gestionar varios predios desde una finca.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
