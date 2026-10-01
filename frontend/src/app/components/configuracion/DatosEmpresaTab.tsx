import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
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
import { cached, invalidate, FOREVER } from '../../../api/cache';
import { useAuth } from '../../contexts/AuthContext';
import { TabLoadingGate } from './TabLoadingGate';

type DaneItem = { codigo: string; nombre: string };

const FORM_VACIO = {
  nombres: '',
  apellidos: '',
  cedula: '',
  nombreComercial: '',
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

/** Campos exclusivos de cada tipo de persona. Los de contacto son comunes. */
const CAMPOS_POR_TIPO: Record<'natural' | 'juridica', (keyof FormState)[]> = {
  natural: ['nombres', 'apellidos', 'cedula', 'nombreComercial'],
  juridica: ['nombreEmpresa', 'razonSocial', 'nit', 'representanteLegal', 'cedulaRepresentante'],
};

/**
 * Deja en blanco los campos que no pertenecen al tipo guardado.
 *
 * Hace falta porque al guardar una persona natural el backend copia el nombre
 * completo en `nombre` y `razon_social`, que son los campos de empresa. Sin
 * esta limpieza, al pasar a Jurídica aparecería el nombre del dueño como si
 * fuera la razón social.
 */
function soloDelTipo(tipo: 'natural' | 'juridica', form: FormState): FormState {
  const otro = tipo === 'natural' ? 'juridica' : 'natural';
  const limpio = { ...form };
  for (const campo of CAMPOS_POR_TIPO[otro]) limpio[campo] = '';
  return limpio;
}

function apiToForm(data: InfoEmpresa): { tipoPersona: 'natural' | 'juridica'; form: FormState } {
  // El backend guarda un solo `representante_nombre`; el formulario natural
  // lo parte en nombres y apellidos para poder pintarlo. Esto es solo para la
  // carga: al alternar el tipo de persona los campos del nuevo tipo se vacían
  // (ver `cambiarTipoPersona`).
  const partes = (data.representante_nombre ?? '').trim().split(/\s+/).filter(Boolean);
  const nombres = partes.slice(0, Math.ceil(partes.length / 2)).join(' ');
  const apellidos = partes.slice(Math.ceil(partes.length / 2)).join(' ');

  // Respetar el `tipo_persona` que devuelve el backend como fuente de verdad.
  // Antes había una heurística que forzaba JURIDICA si venían NIT/nombre/razón
  // social, pero eso ignoraba el valor real cuando el backend guardaba NATURAL
  // pero conservaba datos legacy en esos campos.
  const tipoPersona: 'natural' | 'juridica' =
    data.tipo_persona === 'NATURAL' ? 'natural' : 'juridica';

  return {
    tipoPersona,
    form: {
      nombres,
      apellidos,
      cedula: data.representante_cedula ?? '',
      // Antes el formulario copiaba el nombre completo en `nombre`. Si los dos
      // coinciden no hay nombre comercial de verdad, es ese rastro viejo.
      nombreComercial:
        (data.nombre ?? '').trim() === (data.representante_nombre ?? '').trim()
          ? ''
          : (data.nombre ?? ''),
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
    const comercial = f.nombreComercial.trim();
    return {
      tipo_persona,
      // `nombre` es el comercial, igual que en jurídica. Sin él la finca
      // quedaría sin nombre, así que cae al nombre completo.
      nombre: comercial || nombreCompleto,
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

/** Nombre que mostramos en la finca activa: el de la persona jurídica cuando es
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

  /**
   * Cambio manual del tipo de persona.
   *
   * Entra con los campos del nuevo tipo en blanco: los datos de una persona
   * natural no son los de una empresa, y arrastrarlos hacía que uno guardara
   * sin darse cuenta la cédula del dueño como NIT. Los datos de contacto sí
   * se conservan porque son los mismos en ambos casos.
   *
   * Solo corre desde el selector. La carga inicial usa `setTipoPersona`.
   */
  /**
   * Último estado confirmado por el backend: lo que hay en la base.
   * Es la fuente de la restauración al alternar el tipo de persona, y solo
   * cambia al cargar la pantalla y al guardar con éxito.
   */
  const formGuardado = useRef<FormState>(FORM_VACIO);
  const tipoGuardado = useRef<'natural' | 'juridica'>('juridica');

  const cambiarTipoPersona = (nuevo: 'natural' | 'juridica') => {
    if (nuevo === tipoPersona) return;
    setTipoPersona(nuevo);
    setDatosEmpresa((prev) => {
      const sig = { ...prev };
      // Se restauran desde lo último guardado. Si la finca está guardada como
      // natural, el tipo jurídica no tiene nada que restaurar y entra vacío;
      // al volver a natural reaparecen los datos tal como se guardaron.
      for (const campo of CAMPOS_POR_TIPO[nuevo]) {
        sig[campo] = nuevo === tipoGuardado.current ? formGuardado.current[campo] : '';
      }
      return sig;
    });
  };

  const [loading, setLoading] = useState(true);

  // Selects encadenados de Departamento → Municipio (códigos DANE).
  // El payload del backend guarda el NOMBRE (no el código), así que el state
  // del form mantiene el nombre y aparte trackeamos el código del depto para
  // poder cargar la lista de municipios correspondiente.
  const [departamentos, setDepartamentos] = useState<DaneItem[]>([]);
  const [municipios, setMunicipios] = useState<DaneItem[]>([]);
  const [deptoCodigo, setDeptoCodigo] = useState<string>('');

  // Logo de la finca (§13). `logoUrl` es lo que ya tiene guardado el backend;
  // `logoFile` + `logoPreview` son la selección pendiente de guardar.
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cached('dane:departamentos', getDepartamentos, FOREVER)
      .then((res) => setDepartamentos(res.data ?? []))
      .catch(() => { /* silencioso: el form todavía es usable como texto */ });
  }, []);

  useEffect(() => {
    cached('config:info-empresa', () => configuracionApi.infoEmpresa.obtener())
      .then((res) => {
        const { tipoPersona: tp, form } = apiToForm(res.data);
        const guardado = soloDelTipo(tp, form);
        setTipoPersona(tp);
        setDatosEmpresa(guardado);
        formGuardado.current = guardado;
        tipoGuardado.current = tp;
        setLogoUrl(res.data.logo_url ?? null);
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
    cached(`dane:municipios:${deptoCodigo}`, () => getMunicipios(deptoCodigo), FOREVER)
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

  /** Formatos y tope que valida el backend: jpeg/jpg/png/webp, máx 2MB. */
  const LOGO_TIPOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const LOGO_MAX_BYTES = 2 * 1024 * 1024;

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo tras un error
    if (!file) return;
    if (!LOGO_TIPOS.includes(file.type)) {
      toast.error('El logo debe ser JPG, PNG o WEBP');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('El logo no puede superar 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const quitarLogoPendiente = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    setGuardando(true);
    try {
      const res = await configuracionApi.infoEmpresa.actualizar({
        ...formToPayload(tipoPersona, datosEmpresa),
        // Solo va cuando hay archivo nuevo: con `logo` el request cambia a
        // POST + `_method=PUT` multipart.
        ...(logoFile ? { logo: logoFile } : {}),
      });
      // Invalidamos el caché antes de rehidratar. Sin esto, cuando el
      // usuario vuelve a abrir la pantalla el `cached('config:info-empresa')`
      // devuelve el valor viejo y no se ve el cambio de tipo_persona.
      invalidate('config:info-empresa');
      const { tipoPersona: tp, form } = apiToForm(res.data);
      const guardado = soloDelTipo(tp, form);
      setTipoPersona(tp);
      setDatosEmpresa(guardado);
      formGuardado.current = guardado;
      tipoGuardado.current = tp;
      // La respuesta ya trae la URL pública final del logo. Cada subida genera
      // un nombre distinto y el anterior se borra, así que no hace falta
      // cache-busting ni volver a llamar a `/me`.
      setLogoUrl(res.data.logo_url ?? null);
      quitarLogoPendiente();

      // Refleja el nuevo nombre/NIT/logo en la finca activa del usuario actual
      // → sidebar (footer "finca la esperanza") y cualquier consumidor de
      // `user.fincaActual` se actualizan sin necesidad de re-loguear.
      if (user?.fincaActual) {
        const nuevoNombre = nombreFincaPara(tp, res.data) || user.fincaActual.nombre;
        updateUser({
          fincaActual: {
            ...user.fincaActual,
            nombre: nuevoNombre,
            nit: res.data.nit ?? user.fincaActual.nit ?? '',
            logo_url: res.data.logo_url ?? null,
          },
        });
      }

      toast.success(res.message ?? 'Datos de la empresa guardados correctamente');
    } catch (e: any) {
      if (e?.errors) {
        // Los errores del archivo llegan en `errors.logo`.
        const primero = e.errors.logo?.[0] ?? Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else if (e?.code === 'NIT_DUPLICATED') {
        toast.error('Ya existe otra finca registrada con ese NIT');
      } else if (e?.code === 'NO_DATA') {
        toast.error('No se enviaron datos para actualizar');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar los cambios');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setDatosEmpresa(prev => ({ ...prev, [field]: value }));
  };

  return (
    <TabLoadingGate loading={loading} message="Cargando datos de empresa…">
    <div className="space-y-6">
      {/* Logo de la finca */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Logo de la Finca / Empresa</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Este logo aparecerá en todos los documentos descargables del sistema
            (desprendibles, liquidaciones, novedades, etc.)
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-8">
            {/* Recuadro de vista previa. Punteado y con la leyenda "Sin logo"
                mientras la finca no tenga uno cargado. */}
            <div className="h-28 w-40 shrink-0 rounded-xl border-2 border-dashed border-border bg-muted/20 overflow-hidden flex flex-col items-center justify-center gap-2">
              {logoPreview || logoUrl ? (
                <img
                  src={logoPreview ?? logoUrl ?? ''}
                  alt="Logo de la finca"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <>
                  <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Sin logo</span>
                </>
              )}
            </div>

            <div className="space-y-3">
              {/* El input real va oculto: el botón es el control visible. */}
              <input
                id="logo"
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onLogoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {logoUrl || logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </Button>

              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">
                  Formatos aceptados: PNG, JPG, WEBP · Máximo 2 MB
                </p>
                <p className="text-sm text-muted-foreground">
                  Recomendado: fondo transparente, mínimo 200 × 80 px
                </p>
              </div>

              {logoFile && (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {logoFile.name} — se sube al guardar los cambios
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={quitarLogoPendiente}>
                    Descartar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Select value={tipoPersona} onValueChange={cambiarTipoPersona}>
                <SelectTrigger id="tipoPersona" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona Natural</SelectItem>
                  <SelectItem value="juridica">Persona Jurídica</SelectItem>
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

                  <div className="mt-6 max-w-md space-y-2">
                    <Label htmlFor="nombreComercial">Nombre comercial</Label>
                    <Input
                      id="nombreComercial"
                      value={datosEmpresa.nombreComercial}
                      onChange={(e) => handleChange('nombreComercial', e.target.value)}
                      placeholder="Ej: Finca La Esperanza"
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional. Si lo dejas vacío se usa el nombre completo.
                    </p>
                  </div>
                </div>
              ) : (
                // Persona Jurídica
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Datos de la persona jurídica</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nombreEmpresa">Nombre de la persona jurídica *</Label>
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
                    {[...departamentos].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((d) => (
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
                    {[...municipios].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((m) => (
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
        <Button onClick={handleSave} size="lg" disabled={guardando} className="gap-2">
          <Save className="h-5 w-5" />
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
    </TabLoadingGate>
  );
}
