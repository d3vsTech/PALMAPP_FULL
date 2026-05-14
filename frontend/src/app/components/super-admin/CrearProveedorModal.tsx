import { useEffect, useState, type FormEvent } from 'react';
import { X, Store, MapPin, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import {
  marketProveedoresAdminApi,
  type Departamento,
  type Municipio,
} from '../../../api/marketProveedoresAdmin';

export interface ProveedorFormData {
  nombre_empresa: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  descripcion: string;
  logo_url: string;
}

const EMPTY_FORM: ProveedorFormData = {
  nombre_empresa: '',
  nit: '',
  telefono: '',
  email: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  descripcion: '',
  logo_url: '',
};

interface CrearProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProveedorFormData) => Promise<void> | void;
  proveedorData?: Partial<ProveedorFormData> | null;
  isEdit?: boolean;
  isSaving?: boolean;
}

function buildFormData(data?: Partial<ProveedorFormData> | null): ProveedorFormData {
  return { ...EMPTY_FORM, ...data };
}

export default function CrearProveedorModal({
  isOpen,
  onClose,
  onSave,
  proveedorData,
  isEdit = false,
  isSaving = false,
}: CrearProveedorModalProps) {
  const [formData, setFormData] = useState<ProveedorFormData>(buildFormData(proveedorData));
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(buildFormData(proveedorData));
  }, [isOpen, proveedorData]);

  // Cargar departamentos al abrir
  useEffect(() => {
    if (!isOpen) return;
    setLoadingDepts(true);
    marketProveedoresAdminApi.departamentos()
      .then((r) => setDepartamentos(r.data ?? []))
      .catch((e) => console.error('Error departamentos:', e))
      .finally(() => setLoadingDepts(false));
  }, [isOpen]);

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    if (!formData.departamento) {
      setMunicipios([]);
      return;
    }
    const dept = departamentos.find((d) => d.nombre === formData.departamento);
    if (!dept) return;

    setLoadingMunis(true);
    marketProveedoresAdminApi.municipios(dept.codigo)
      .then((r) => setMunicipios(r.data ?? []))
      .catch((e) => console.error('Error municipios:', e))
      .finally(() => setLoadingMunis(false));
  }, [formData.departamento, departamentos]);

  const update = <K extends keyof ProveedorFormData>(field: K, value: ProveedorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.departamento) {
      alert('Selecciona un departamento');
      return;
    }
    if (!formData.ciudad) {
      alert('Selecciona una ciudad');
      return;
    }
    await onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-[#9032F0]/10"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#9032F0]/15 to-[#6506FF]/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isEdit ? 'Editar proveedor' : 'Crear nuevo proveedor'}
              </h2>
              <p className="text-sm text-gray-400">
                {isEdit
                  ? 'Actualiza los datos del proveedor'
                  : 'Registra una nueva empresa proveedora del marketplace'}
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
          {/* Información general */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#9032F0]" />
              Información de la empresa
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre de la empresa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.nombre_empresa}
                  onChange={(e) => update('nombre_empresa', e.target.value)}
                  placeholder="Ej: AgroInsumos del Valle S.A.S"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">NIT</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.nit}
                  onChange={(e) => update('nit', e.target.value)}
                  placeholder="900123456-7"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Teléfono <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={formData.telefono}
                  onChange={(e) => update('telefono', e.target.value)}
                  placeholder="3157890123"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={150}
                  value={formData.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="ventas@empresa.com"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>
            </div>
          </section>

          {/* Ubicación */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#9032F0]" />
              Ubicación
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Dirección <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={formData.direccion}
                  onChange={(e) => update('direccion', e.target.value)}
                  placeholder="Calle 15 #23-45"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Departamento <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={loadingDepts}
                    value={formData.departamento}
                    onChange={(e) => {
                      update('departamento', e.target.value);
                      update('ciudad', '');
                    }}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">
                      {loadingDepts ? 'Cargando...' : 'Selecciona un departamento'}
                    </option>
                    {departamentos.map((d) => (
                      <option key={d.codigo} value={d.nombre}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                  {loadingDepts && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Ciudad <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={!formData.departamento || loadingMunis}
                    value={formData.ciudad}
                    onChange={(e) => update('ciudad', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.departamento
                        ? 'Primero selecciona un departamento'
                        : loadingMunis
                          ? 'Cargando...'
                          : 'Selecciona una ciudad'}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.codigo} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {loadingMunis && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Información adicional */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#9032F0]" />
              Información adicional (opcional)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => update('descripcion', e.target.value)}
                  placeholder="Breve descripción de la empresa y sus productos"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  URL del logo
                </label>
                <input
                  type="url"
                  maxLength={500}
                  value={formData.logo_url}
                  onChange={(e) => update('logo_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9032F0]/50 focus:border-[#9032F0]/50"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#9032F0] to-[#6506FF] hover:from-[#9032F0]/90 hover:to-[#6506FF]/90 text-white font-semibold shadow-lg shadow-[#9032F0]/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </div>
  );
}
