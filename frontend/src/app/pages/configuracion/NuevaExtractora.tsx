/**
 * NuevaExtractora.tsx — Página de creación/edición de una extractora.
 *
 * Reemplaza el modal "Nueva Extractora" del tab Configuración → Viajes. Sigue
 * el patrón de `NuevoConceptoNomina`: ruta dedicada, header con back arrow +
 * botón Guardar al pie, contenido en dos cards (Información de
 * la Empresa + Información de Contacto).
 *
 * Rutas:
 *  - `/configuracion/extractoras/nueva`      → modo creación.
 *  - `/configuracion/extractoras/editar/:id` → modo edición (precarga datos).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import { ConfigSection } from '../../components/configuracion/ConfigSection';
import { extractorasApi, type Extractora } from '../../../api/viajes';
import { getDepartamentos, getMunicipios } from '../../../api/plantacion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';

type DaneItem = { codigo: string; nombre: string };

const FORM_VACIO = {
  razon_social: '',
  nit: '',
  ubicacion: '',
  ciudad: '',                  // nombre del municipio (lo que viaja al backend)
  departamento_codigo: '',     // DANE
  municipio_codigo: '',        // DANE
  telefono: '',                // celular
  telefono_fijo: '',
  email: '',
  contacto_nombre: '',
};

type FormState = typeof FORM_VACIO;

export default function NuevaExtractora() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<FormState>(FORM_VACIO);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Catálogo DANE — Departamentos (cacheado en backend) y municipios (encadenado).
  const [departamentos, setDepartamentos] = useState<DaneItem[]>([]);
  const [municipios, setMunicipios] = useState<DaneItem[]>([]);

  /** Precarga datos en modo edición. */
  useEffect(() => {
    if (!isEdit || !id) return;
    extractorasApi.ver(Number(id))
      .then((res) => {
        const e = res.data;
        setFormData({
          razon_social: e.razon_social ?? '',
          nit: e.nit ?? '',
          ubicacion: e.ubicacion ?? '',
          ciudad: e.ciudad ?? '',
          departamento_codigo: e.departamento_codigo ?? '',
          municipio_codigo: e.municipio_codigo ?? '',
          telefono: e.telefono ?? '',
          telefono_fijo: e.telefono_fijo ?? '',
          email: e.email ?? '',
          contacto_nombre: e.contacto_nombre ?? '',
        });
      })
      .catch((err: any) => {
        toast.error(err?.message ?? 'No se pudo cargar la extractora');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /** Lista de departamentos: una sola vez al montar. */
  useEffect(() => {
    getDepartamentos()
      .then((res) => setDepartamentos(res.data ?? []))
      .catch(() => { /* el select queda vacío pero el form sigue funcional */ });
  }, []);

  /** Lista de municipios encadenada al departamento seleccionado. */
  useEffect(() => {
    if (!formData.departamento_codigo) {
      setMunicipios([]);
      return;
    }
    getMunicipios(formData.departamento_codigo)
      .then((res) => setMunicipios(res.data ?? []))
      .catch(() => setMunicipios([]));
  }, [formData.departamento_codigo]);

  const handleChange = (field: keyof FormState, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!formData.razon_social.trim()) {
      toast.error('Ingresa el nombre de la extractora');
      return;
    }
    if (!formData.nit.trim()) {
      toast.error('Ingresa el NIT de la extractora');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Extractora> = {
        razon_social: formData.razon_social.trim(),
        nit: formData.nit.trim(),
        ubicacion: formData.ubicacion.trim(),
        ciudad: formData.ciudad.trim() || null,
        departamento_codigo: formData.departamento_codigo || null,
        municipio_codigo: formData.municipio_codigo || null,
        telefono: formData.telefono.trim() || null,
        telefono_fijo: formData.telefono_fijo.trim() || null,
        email: formData.email.trim() || null,
        contacto_nombre: formData.contacto_nombre.trim() || null,
      };

      if (isEdit && id) {
        await extractorasApi.editar(Number(id), payload);
        toast.success('Extractora actualizada');
      } else {
        await extractorasApi.crear(payload);
        toast.success('Extractora creada');
      }
      navigate('/configuracion');
    } catch (e: any) {
      if (e?.errors?.nit) {
        toast.error(e.errors.nit[0] ?? 'Ya existe una extractora con este NIT');
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.message?.toLowerCase().includes('nit')) {
        toast.error('Ya existe una extractora con este NIT');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la extractora');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backTo="/configuracion"
        eyebrow="Configuración · Viajes"
        title={isEdit ? 'Editar extractora' : 'Nueva extractora'}
        description="Planta extractora de aceite de palma a la que despachas fruto."
      />

      <ConfigSection
        title="Datos de la empresa"
        description="Identificación y ubicación de la planta."
        contentClassName="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2"
      >
          <div className="space-y-2">
            <Label htmlFor="razon_social">
              Nombre de la Extractora <span className="text-destructive">*</span>
            </Label>
            <Input
              id="razon_social"
              placeholder="Extractora del Cauca S.A."
              value={formData.razon_social}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nit">
              NIT <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nit"
              placeholder="800.123.456-1"
              value={formData.nit}
              onChange={(e) => handleChange('nit', e.target.value)}
              disabled={loading}
            />
          </div>
          {/* Departamento + Ciudad: selects encadenados del catálogo DANE
              (mismo patrón que DatosEmpresaTab). Al cambiar de departamento
              se limpia el municipio para evitar combinaciones inválidas. */}
          <div className="space-y-2">
            <Label htmlFor="departamento_codigo">Departamento</Label>
            <Select
              value={formData.departamento_codigo}
              onValueChange={(codigo) => {
                setFormData((prev) => ({
                  ...prev,
                  departamento_codigo: codigo,
                  municipio_codigo: '',
                  ciudad: '',
                }));
              }}
              disabled={loading}
            >
              <SelectTrigger id="departamento_codigo">
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {[...departamentos].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((d) => (
                  <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Select
              value={formData.municipio_codigo}
              onValueChange={(codigo) => {
                const nombre = municipios.find((m) => m.codigo === codigo)?.nombre ?? '';
                setFormData((prev) => ({ ...prev, municipio_codigo: codigo, ciudad: nombre }));
              }}
              disabled={loading || !formData.departamento_codigo}
            >
              <SelectTrigger id="ciudad">
                <SelectValue placeholder={formData.departamento_codigo
                  ? 'Seleccionar municipio'
                  : 'Selecciona departamento primero'} />
              </SelectTrigger>
              <SelectContent>
                {[...municipios].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((m) => (
                  <SelectItem key={m.codigo} value={m.codigo}>{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ubicacion">Dirección</Label>
            <Input
              id="ubicacion"
              placeholder="Cra 10 # 20-30"
              value={formData.ubicacion}
              onChange={(e) => handleChange('ubicacion', e.target.value)}
              disabled={loading}
            />
          </div>
      </ConfigSection>

      {/* Información de Contacto */}
      <ConfigSection
        title="Contacto"
        description="Persona y medios para coordinar los despachos."
        contentClassName="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2"
      >
          <div className="space-y-2">
            <Label htmlFor="contacto_nombre">Nombre de Contacto</Label>
            <Input
              id="contacto_nombre"
              placeholder="Juan Pérez"
              value={formData.contacto_nombre}
              onChange={(e) => handleChange('contacto_nombre', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Celular</Label>
            <Input
              id="telefono"
              placeholder="+57 300 111 2222"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono_fijo">Teléfono fijo</Label>
            <Input
              id="telefono_fijo"
              placeholder="+57 2 123 4567"
              value={formData.telefono_fijo}
              onChange={(e) => handleChange('telefono_fijo', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="extractora@cauca.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={loading}
            />
          </div>
      </ConfigSection>

      <div className="barra-acciones flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/configuracion')} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save strokeWidth={2} />
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
