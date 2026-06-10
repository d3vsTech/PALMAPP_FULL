import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  configuracionApi,
  type InfoEmpresa,
  type InfoEmpresaPayload,
  type TipoPersona,
} from '../../../api/configuracion';
import { getDepartamentos, getMunicipios } from '../../../api/plantacion';
import { useAuth } from '../../contexts/AuthContext';
import { TabLoadingGate } from './TabLoadingGate';

type DaneItem = { codigo: string; nombre: string };

const FORM_VACIO = {
  nombres: '',
  apellidos: '',
  cedula: '',
  nombreEmpresa: '',
  razonSocial: '',
  nit: '',
  representanteLegal: '',
  cedulaRepresentante: '',
  direccion: '',
  municipio: '',
  departamento: '',
  telefono: '',
  celular: '',
  email: '',
  sitioWeb: '',
  observaciones: '',
};

type FormState = typeof FORM_VACIO;

function apiToForm(data: InfoEmpresa): { tipoPersona: 'natural' | 'juridica'; form: FormState } {
  // Siempre derivamos nombres/apellidos del representante_nombre, así al
  // alternar el dropdown de Tipo de Persona ambos branches conservan datos.
  const partes = (data.representante_nombre ?? '').trim().split(/\s+/).filter(Boolean);
  const nombres = partes.slice(0, Math.ceil(partes.length / 2)).join(' ');
  const apellidos = partes.slice(Math.ceil(partes.length / 2)).join(' ');

  // Detección heurística: si el tenant tiene NIT o nombre de empresa, asumimos
  // Persona Jurídica aunque el backend marque NATURAL (caso común: el default
  // del backend o un guardado intermedio dejó tipo_persona en estado inconsistente).
  const hayDatosEmpresa = !!(data.nit || data.nombre || data.razon_social);
  const tipoPersona: 'natural' | 'juridica' =
    hayDatosEmpresa ? 'juridica' : (data.tipo_persona === 'NATURAL' ? 'natural' : 'juridica');

  return {
    tipoPersona,
    form: {
      nombres,
      apellidos,
      cedula: data.representante_cedula ?? '',
      nombreEmpresa: data.nombre ?? '',
      razonSocial: data.razon_social ?? '',
      nit: data.nit ?? '',
      representanteLegal: data.representante_nombre ?? '',
      cedulaRepresentante: data.representante_cedula ?? '',
      direccion: data.direccion ?? '',
      municipio: data.municipio ?? '',
      departamento: data.departamento ?? '',
      telefono: data.telefono_fijo ?? '',
      celular: data.telefono ?? '',
      email: data.correo_contacto ?? '',
      sitioWeb: data.sitio_web ?? '',
      observaciones: '',
    },
  };
}

function formToPayload(tipo: 'natural' | 'juridica', f: FormState): InfoEmpresaPayload {
  const tipo_persona: TipoPersona = tipo === 'natural' ? 'NATURAL' : 'JURIDICA';
  if (tipo === 'natural') {
    const nombreCompleto = `${f.nombres.trim()} ${f.apellidos.trim()}`.trim();
    return {
      tipo_persona,
      nombre: nombreCompleto,
      razon_social: nombreCompleto,
      representante_nombre: nombreCompleto,
      representante_cedula: f.cedula.trim(),
      direccion: f.direccion.trim(),
      municipio: f.municipio.trim(),
      departamento: f.departamento.trim(),
      telefono: f.celular.trim(),
      telefono_fijo: f.telefono.trim(),
      correo_contacto: f.email.trim(),
      sitio_web: f.sitioWeb.trim(),
    };
  }
  return {
    tipo_persona,
    nombre: f.nombreEmpresa.trim(),
    razon_social: f.razonSocial.trim(),
    nit: f.nit.trim(),
    representante_nombre: f.representanteLegal.trim(),
    representante_cedula: f.cedulaRepresentante.trim(),
    direccion: f.direccion.trim(),
    municipio: f.municipio.trim(),
    departamento: f.departamento.trim(),
    telefono: f.celular.trim(),
    telefono_fijo: f.telefono.trim(),
    correo_contacto: f.email.trim(),
    sitio_web: f.sitioWeb.trim(),
  };
}

/** Nombre que mostramos en la finca activa: "Nombre de la Empresa" cuando es
 *  Jurídica, "Nombres Apellidos" cuando es Natural. */
function nombreFincaPara(tipo: 'natural' | 'juridica', data: InfoEmpresa): string {
  if (tipo === 'natural') {
    return (data.representante_nombre ?? data.nombre ?? '').trim();
  }
  return (data.nombre ?? data.razon_social ?? '').trim();
}

export function DatosEmpresaTab() {
  const { user, updateUser } = useAuth();
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('juridica');
  const [datosEmpresa, setDatosEmpresa] = useState<FormState>(FORM_VACIO);
  const [loading, setLoading] = useState(true);

  // Selects encadenados de Departamento → Municipio (códigos DANE).
  // El payload del backend guarda el NOMBRE (no el código), así que el state
  // del form mantiene el nombre y aparte trackeamos el código del depto para
  // poder cargar la lista de municipios correspondiente.
  const [departamentos, setDepartamentos] = useState<DaneItem[]>([]);
  const [municipios, setMunicipios] = useState<DaneItem[]>([]);
  const [deptoCodigo, setDeptoCodigo] = useState<string>('');

  useEffect(() => {
    getDepartamentos()
      .then((res) => setDepartamentos(res.data ?? []))
      .catch(() => { /* silencioso: el form todavía es usable como texto */ });
  }, []);

  useEffect(() => {
    configuracionApi.infoEmpresa.obtener()
      .then((res) => {
        const { tipoPersona: tp, form } = apiToForm(res.data);
        setTipoPersona(tp);
        setDatosEmpresa(form);
      })
      .catch((e: any) => {
        toast.error(e?.message ?? 'No se pudo cargar la información de la empresa');
      })
      .finally(() => setLoading(false));
  }, []);

  // Cuando ya tengo el listado de departamentos + el nombre cargado del API,
  // resuelvo el código DANE para poder pedir los municipios.
  useEffect(() => {
    if (!departamentos.length || !datosEmpresa.departamento) return;
    const match = departamentos.find(
      (d) => d.nombre.localeCompare(datosEmpresa.departamento, 'es', { sensitivity: 'base' }) === 0,
    );
    if (match && match.codigo !== deptoCodigo) setDeptoCodigo(match.codigo);
  }, [departamentos, datosEmpresa.departamento, deptoCodigo]);

  // Cargar municipios cada vez que cambia el código del departamento.
  useEffect(() => {
    if (!deptoCodigo) {
      setMunicipios([]);
      return;
    }
    getMunicipios(deptoCodigo)
      .then((res) => setMunicipios(res.data ?? []))
      .catch(() => setMunicipios([]));
  }, [deptoCodigo]);

  const onDepartamentoChange = (codigo: string) => {
    setDeptoCodigo(codigo);
    const nombre = departamentos.find((d) => d.codigo === codigo)?.nombre ?? '';
    setDatosEmpresa((prev) => ({ ...prev, departamento: nombre, municipio: '' }));
  };

  const onMunicipioChange = (nombre: string) => {
    setDatosEmpresa((prev) => ({ ...prev, municipio: nombre }));
  };

  const handleSave = async () => {
    try {
      const res = await configuracionApi.infoEmpresa.actualizar(
        formToPayload(tipoPersona, datosEmpresa)
      );
      const { tipoPersona: tp, form } = apiToForm(res.data);
      setTipoPersona(tp);
      setDatosEmpresa(form);

      // Refleja el nuevo nombre/NIT en la finca activa del usuario actual
      // → sidebar (footer "finca la esperanza") y cualquier consumidor de
      // `user.fincaActual` se actualizan sin necesidad de re-loguear.
      if (user?.fincaActual) {
        const nuevoNombre = nombreFincaPara(tp, res.data) || user.fincaActual.nombre;
        updateUser({
          fincaActual: {
            ...user.fincaActual,
            nombre: nuevoNombre,
            nit: res.data.nit ?? user.fincaActual.nit ?? '',
          },
        });
      }

      toast.success(res.message ?? 'Datos de la empresa guardados correctamente');
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar los cambios');
      }
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setDatosEmpresa(prev => ({ ...prev, [field]: value }));
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando datos de empresa…">
    <div className="space-y-6">
      {/* Información Legal */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Información Legal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Datos de identificación y tipo de persona</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Tipo de Persona */}
            <div className="max-w-md">
              <Label htmlFor="tipoPersona">Tipo de Persona *</Label>
              <Select value={tipoPersona} onValueChange={(value: 'natural' | 'juridica') => setTipoPersona(value)}>
                <SelectTrigger id="tipoPersona" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona Natural</SelectItem>
                  <SelectItem value="juridica">Persona Jurídica (Empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos según tipo de persona */}
            <div className="border-t border-border pt-6">
              {tipoPersona === 'natural' ? (
                // Persona Natural
                <div>
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Datos Personales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombres">Nombres *</Label>
                      <Input
                        id="nombres"
                        value={datosEmpresa.nombres}
                        onChange={(e) => handleChange('nombres', e.target.value)}
                        placeholder="Ej: Juan Carlos"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apellidos">Apellidos *</Label>
                      <Input
                        id="apellidos"
                        value={datosEmpresa.apellidos}
                        onChange={(e) => handleChange('apellidos', e.target.value)}
                        placeholder="Ej: Pérez Gómez"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cedula">Cédula *</Label>
                      <Input
                        id="cedula"
                        value={datosEmpresa.cedula}
                        onChange={(e) => handleChange('cedula', e.target.value)}
                        placeholder="16.123.456"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Persona Jurídica
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Datos de la Empresa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nombreEmpresa">Nombre de la Empresa *</Label>
                        <Input
                          id="nombreEmpresa"
                          value={datosEmpresa.nombreEmpresa}
                          onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                          placeholder="Ej: AGRO CAMPO S.A.S."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="razonSocial">Razón Social *</Label>
                        <Input
                          id="razonSocial"
                          value={datosEmpresa.razonSocial}
                          onChange={(e) => handleChange('razonSocial', e.target.value)}
                          placeholder="Ej: AGRO CAMPO S.A.S."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nit">NIT *</Label>
                        <Input
                          id="nit"
                          value={datosEmpresa.nit}
                          onChange={(e) => handleChange('nit', e.target.value)}
                          placeholder="900.123.456-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Representante Legal */}
                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Representante Legal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="representanteLegal">Nombre Completo *</Label>
                        <Input
                          id="representanteLegal"
                          value={datosEmpresa.representanteLegal}
                          onChange={(e) => handleChange('representanteLegal', e.target.value)}
                          placeholder="Juan Carlos Pérez Gómez"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cedulaRepresentante">Cédula *</Label>
                        <Input
                          id="cedulaRepresentante"
                          value={datosEmpresa.cedulaRepresentante}
                          onChange={(e) => handleChange('cedulaRepresentante', e.target.value)}
                          placeholder="16.123.456"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de contacto */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Datos de contacto</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Dirección, teléfonos y correos electrónicos</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Ubicación */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Ubicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input
                    id="direccion"
                    value={datosEmpresa.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    placeholder="Km 5 Vía Palmira - Candelaria"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento *</Label>
                  <select
                    id="departamento"
                    value={deptoCodigo}
                    onChange={(e) => onDepartamentoChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccionar departamento...</option>
                    {departamentos.map((d) => (
                      <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio *</Label>
                  <select
                    id="municipio"
                    value={datosEmpresa.municipio}
                    onChange={(e) => onMunicipioChange(e.target.value)}
                    disabled={!deptoCodigo}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar municipio...</option>
                    {municipios.map((m) => (
                      <option key={m.codigo} value={m.nombre}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Datos de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono Fijo</Label>
                  <Input
                    id="telefono"
                    value={datosEmpresa.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    placeholder="+57 (2) 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular">Celular *</Label>
                  <Input
                    id="celular"
                    value={datosEmpresa.celular}
                    onChange={(e) => handleChange('celular', e.target.value)}
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={datosEmpresa.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contacto@agrocampo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sitioWeb">Sitio Web</Label>
                  <Input
                    id="sitioWeb"
                    value={datosEmpresa.sitioWeb}
                    onChange={(e) => handleChange('sitioWeb', e.target.value)}
                    placeholder="www.agrocampo.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-5 w-5" />
          Guardar Cambios
        </Button>
      </div>
    </div>
    </TabLoadingGate>
  );
}
