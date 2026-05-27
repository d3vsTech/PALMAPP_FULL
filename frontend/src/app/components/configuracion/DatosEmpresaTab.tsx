import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type InfoEmpresa,
  type InfoEmpresaPayload,
} from '../../../api/configuracion';

/**
 * Tab "Info Empresa" conectado al API real (§13 API_PARAMETRICAS).
 *
 * Endpoints:
 *   GET  /api/v1/tenant/configuracion/info-empresa  → hidratar form
 *   PUT  /api/v1/tenant/configuracion/info-empresa  → guardar cambios
 *
 * Mapeo de campos del form ↔ API:
 *   nombreEmpresa        ↔ nombre
 *   razonSocial          ↔ razon_social
 *   nit                  ↔ nit
 *   actividadEconomica   ↔ actividad_economica
 *   representanteLegal   ↔ representante_nombre
 *   cedulaRepresentante  ↔ representante_cedula
 *   cargoRepresentante   ↔ representante_cargo
 *   direccion            ↔ direccion
 *   municipio            ↔ municipio
 *   departamento         ↔ departamento
 *   celular              ↔ telefono       (sí, "telefono" = celular per doc)
 *   telefono             ↔ telefono_fijo  (telefono_fijo = fijo)
 *   email                ↔ correo_contacto
 *   sitioWeb             ↔ sitio_web
 */

const FORM_VACIO = {
  nombreEmpresa: '',
  razonSocial: '',
  nit: '',
  direccion: '',
  municipio: '',
  departamento: '',
  telefono: '',
  celular: '',
  email: '',
  sitioWeb: '',
  representanteLegal: '',
  cedulaRepresentante: '',
  cargoRepresentante: '',
  actividadEconomica: '',
};

type FormState = typeof FORM_VACIO;

/** Mapea la respuesta del API al estado del form. */
function apiToForm(data: InfoEmpresa): FormState {
  return {
    nombreEmpresa:       data.nombre ?? '',
    razonSocial:         data.razon_social ?? '',
    nit:                 data.nit ?? '',
    direccion:           data.direccion ?? '',
    municipio:           data.municipio ?? '',
    departamento:        data.departamento ?? '',
    telefono:            data.telefono_fijo ?? '',   // fijo
    celular:             data.telefono ?? '',         // celular
    email:               data.correo_contacto ?? '',
    sitioWeb:            data.sitio_web ?? '',
    representanteLegal:  data.representante_nombre ?? '',
    cedulaRepresentante: data.representante_cedula ?? '',
    cargoRepresentante:  data.representante_cargo ?? '',
    actividadEconomica:  data.actividad_economica ?? '',
  };
}

/** Mapea el estado del form al payload del PUT. */
function formToPayload(f: FormState): InfoEmpresaPayload {
  return {
    nombre:               f.nombreEmpresa.trim(),
    razon_social:         f.razonSocial.trim(),
    nit:                  f.nit.trim(),
    actividad_economica:  f.actividadEconomica.trim(),
    representante_nombre: f.representanteLegal.trim(),
    representante_cedula: f.cedulaRepresentante.trim(),
    representante_cargo:  f.cargoRepresentante.trim(),
    direccion:            f.direccion.trim(),
    departamento:         f.departamento.trim(),
    municipio:            f.municipio.trim(),
    correo_contacto:      f.email.trim(),
    telefono:             f.celular.trim(),          // celular → telefono
    telefono_fijo:        f.telefono.trim(),         // fijo → telefono_fijo
    sitio_web:            f.sitioWeb.trim(),
  };
}

export function DatosEmpresaTab() {
  const [datosEmpresa, setDatosEmpresa] = useState<FormState>(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  /** Error inline para el NIT cuando el backend devuelve NIT_DUPLICATED. */
  const [errorNit, setErrorNit] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    configuracionApi.infoEmpresa.obtener()
      .then((res) => {
        if (!cancelado) setDatosEmpresa(apiToForm(res.data));
      })
      .catch((e: any) => {
        if (!cancelado) {
          toast.error(e?.message ?? 'No se pudo cargar la información de la empresa');
        }
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setDatosEmpresa((prev) => ({ ...prev, [field]: value }));
    if (field === 'nit' && errorNit) setErrorNit(null);
  };

  const handleSave = async () => {
    setGuardando(true);
    setErrorNit(null);
    try {
      const res = await configuracionApi.infoEmpresa.actualizar(formToPayload(datosEmpresa));
      // Re-sincronizamos con lo que devolvió el backend (puede normalizar el NIT, etc.)
      setDatosEmpresa(apiToForm(res.data));
      toast.success(res.message ?? 'Datos de la empresa guardados correctamente');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.NIT_DUPLICATED || e?.errors?.nit) {
        const msg = e?.errors?.nit?.[0] ?? 'Ya existe otra finca con este NIT';
        setErrorNit(msg);
        toast.error(msg);
      } else if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudieron guardar los cambios');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando información de la empresa...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información Legal y Representante Legal */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Información Legal y Representante Legal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Datos de identificación de la empresa y su representante legal</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Datos de la empresa */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Datos de la Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    className={errorNit ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {errorNit && (
                    <p className="text-xs text-destructive">{errorNit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actividadEconomica">Actividad Económica *</Label>
                  <Input
                    id="actividadEconomica"
                    value={datosEmpresa.actividadEconomica}
                    onChange={(e) => handleChange('actividadEconomica', e.target.value)}
                    placeholder="Ej: Cultivo de palma para aceite"
                  />
                </div>
              </div>
            </div>

            {/* Representante Legal */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Representante Legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                <div className="space-y-2">
                  <Label htmlFor="cargoRepresentante">Cargo *</Label>
                  <Input
                    id="cargoRepresentante"
                    value={datosEmpresa.cargoRepresentante}
                    onChange={(e) => handleChange('cargoRepresentante', e.target.value)}
                    placeholder="Gerente General"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación y Contacto */}
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>Ubicación y Contacto</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Dirección, teléfonos y correos electrónicos</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Ubicación */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Ubicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  <Label htmlFor="municipio">Municipio *</Label>
                  <Input
                    id="municipio"
                    value={datosEmpresa.municipio}
                    onChange={(e) => handleChange('municipio', e.target.value)}
                    placeholder="Palmira"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Input
                    id="departamento"
                    value={datosEmpresa.departamento}
                    onChange={(e) => handleChange('departamento', e.target.value)}
                    placeholder="Valle del Cauca"
                  />
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={guardando}>
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
