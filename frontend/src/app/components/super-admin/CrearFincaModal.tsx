import { useEffect, useState, type FormEvent, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchConToken } from '../../../api/request';
import {
  X,
  Building2,
  MapPin,
  Package,
} from 'lucide-react';

interface Departamento {
  codigo: string;
  nombre: string;
}

interface Municipio {
  codigo: string;
  nombre: string;
}

export interface FincaFormData {
  tipo_persona: 'NATURAL' | 'JURIDICA';
  nombre: string;
  nit: string;
  razon_social: string;
  correo_contacto: string;
  telefono: string;
  direccion: string;
  departamento: string;
  municipio: string;
  fecha_activacion: string;
  fecha_suspension: string;
}

interface CrearFincaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: FincaFormData) => Promise<void> | void;
  fincaData?: Partial<FincaFormData> | null;
  isEdit?: boolean;
  isSaving?: boolean;
}

const EMPTY_FORM: FincaFormData = {
  tipo_persona: 'NATURAL',
  nombre: '',
  nit: '',
  razon_social: '',
  correo_contacto: '',
  telefono: '',
  direccion: '',
  departamento: '',
  municipio: '',
  fecha_activacion: '',
  fecha_suspension: '',
};

function buildFormData(
  fincaData?: Partial<FincaFormData> | null,
): FincaFormData {
  return {
    ...EMPTY_FORM,
    ...fincaData,
  };
}

export default function CrearFincaModal({
  isOpen,
  onClose,
  onSave,
  fincaData,
  isEdit = false,
  isSaving = false,
}: CrearFincaModalProps) {
  const [formData, setFormData] = useState<FincaFormData>(
    buildFormData(fincaData),
  );
  const { token } = useAuth();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [showDeptList, setShowDeptList] = useState(false);
  const [showMuniList, setShowMuniList] = useState(false);

  // Cargar departamentos al abrir el modal
  useEffect(() => {
    if (!isOpen || !token) return;

    const cargarDepartamentos = async () => {
      setLoadingDepts(true);
      try {
        const respuesta = await fetchConToken('/api/v1/auth/departamentos', token);
        const resultado = await respuesta.json();
        if (respuesta.ok) {
          setDepartamentos(resultado.data || []);
        }
      } catch (error) {
        console.error('Error al cargar departamentos:', error);
      } finally {
        setLoadingDepts(false);
      }
    };

    cargarDepartamentos();
  }, [isOpen, token]);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (!formData.departamento || !token) {
      setMunicipios([]);
      return;
    }

    // Buscar el código del departamento seleccionado
    const dept = departamentos.find(d => d.nombre === formData.departamento);
    if (!dept) return;

    const cargarMunicipios = async () => {
      setLoadingMunis(true);
      try {
        const respuesta = await fetchConToken(`/api/v1/auth/departamentos/${dept.codigo}/municipios`, token);
        const resultado = await respuesta.json();
        if (respuesta.ok) {
          setMunicipios(resultado.data || []);
        }
      } catch (error) {
        console.error('Error al cargar municipios:', error);
      } finally {
        setLoadingMunis(false);
      }
    };

    cargarMunicipios();
  }, [formData.departamento, token, departamentos]);
  useEffect(() => {
    if (isOpen) {
      setFormData(buildFormData(fincaData));
    }
  }, [isOpen, fincaData]);

  const updateField = <K extends keyof FincaFormData>(
    field: K,
    value: FincaFormData[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

 const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.departamento) {
      alert('Selecciona un departamento');
      return;
    }

    if (!formData.municipio) {
      alert('Selecciona un municipio');
      return;
    }

    await onSave?.(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-[#9032F0]/10"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#9032F0]/15 to-[#6506FF]/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isEdit ? 'Editar finca' : 'Crear nueva finca'}
              </h2>
              <p className="text-sm text-gray-400">
                {isEdit
                  ? 'Actualiza la configuración del tenant'
                  : 'Registra una nueva finca en el sistema'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-152px)] overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#9032F0]" />
              Información general
            </h3>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de persona *
                </label>
                <select
                  value={formData.tipo_persona}
                  onChange={(e) => updateField('tipo_persona', e.target.value as 'NATURAL' | 'JURIDICA')}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  required
                >
                  <option value="NATURAL" className="bg-[#111]">NATURAL</option>
                  <option value="JURIDICA" className="bg-[#111]">JURIDICA</option>
                </select>
              </div>
              
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="Ej: Finca La Esperanza"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  NIT *
                </label>
                <input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => updateField('nit', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="Ej: 900123456-1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Razón social *
                </label>
                <input
                  type="text"
                  value={formData.razon_social}
                  onChange={(e) => updateField('razon_social', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="Ej: Agrícola Palmas S.A.S."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Correo de contacto *
                </label>
                <input
                  type="email"
                  value={formData.correo_contacto}
                  onChange={(e) =>
                    updateField('correo_contacto', e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="contacto@finca.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono *
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => updateField('telefono', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="3001234567"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Ubicación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => updateField('direccion', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder="Vereda, km, referencia..."
                />
              </div>

             <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Departamento *
                </label>
                <input
                  type="text"
                  value={formData.departamento}
                  onChange={(e) => {
                    updateField('departamento', e.target.value);
                    updateField('municipio', '');
                    setShowDeptList(true);
                  }}
                  onFocus={() => setShowDeptList(true)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  placeholder={loadingDepts ? 'Cargando...' : 'Buscar departamento...'}
                />
                {showDeptList && departamentos.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#111] shadow-xl">
                    {departamentos
                      .filter(d => d.nombre.toLowerCase().includes(formData.departamento.toLowerCase()))
                      .map((dept) => (
                        <button
                          key={dept.codigo}
                          type="button"
                          onClick={() => {
                            updateField('departamento', dept.nombre);
                            updateField('municipio', '');
                            setShowDeptList(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          {dept.nombre}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Municipio *
                </label>
                <input
                  type="text"
                  value={formData.municipio}
                  onChange={(e) => {
                    updateField('municipio', e.target.value);
                    setShowMuniList(true);
                  }}
                  onFocus={() => setShowMuniList(true)}
                  disabled={!formData.departamento || loadingMunis}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 disabled:opacity-50"
                  placeholder={loadingMunis ? 'Cargando municipios...' : 'Buscar municipio...'}
                />
                {showMuniList && municipios.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#111] shadow-xl">
                    {municipios
                      .filter(m => m.nombre.toLowerCase().includes(formData.municipio.toLowerCase()))
                      .map((muni) => (
                        <button
                          key={muni.codigo}
                          type="button"
                          onClick={() => {
                            updateField('municipio', muni.nombre);
                            setShowMuniList(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          {muni.nombre}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-400" />
              Fechas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de activación *
                </label>
                <input
                  type="date"
                  value={formData.fecha_activacion}
                  onChange={(e) => updateField('fecha_activacion', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de suspensión *
                </label>
                <input
                  type="date"
                  value={formData.fecha_suspension}
                  onChange={(e) => updateField('fecha_suspension', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50"
                  required
                />
              </div>
            </div>
          </section>

        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/10 bg-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#9032F0] to-[#6506FF] text-white font-semibold hover:opacity-95 transition-all disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            {isSaving
              ? 'Guardando...'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear finca'}
          </button>
        </div>
      </form>
    </div>
  );
}