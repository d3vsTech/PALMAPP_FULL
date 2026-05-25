import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function DatosEmpresaTab() {
  const [datosEmpresa, setDatosEmpresa] = useState({
    nombreEmpresa: 'AGRO CAMPO S.A.S.',
    razonSocial: 'AGRO CAMPO S.A.S.',
    nit: '900.123.456-7',
    direccion: 'Km 5 Vía Palmira - Candelaria',
    municipio: 'Palmira',
    departamento: 'Valle del Cauca',
    telefono: '+57 (2) 123 4567',
    celular: '+57 300 123 4567',
    email: 'contacto@agrocampo.com',
    sitioWeb: 'www.agrocampo.com',
    representanteLegal: 'Juan Carlos Pérez Gómez',
    cedulaRepresentante: '16.123.456',
    cargoRepresentante: 'Gerente General',
    actividadEconomica: 'Cultivo de palma para aceite',
    observaciones: ''
  });

  const handleSave = () => {
    console.log('Guardando datos de empresa:', datosEmpresa);
    toast.success('Datos de la empresa guardados correctamente');
  };

  const handleChange = (field: string, value: string) => {
    setDatosEmpresa(prev => ({ ...prev, [field]: value }));
  };

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

            {/* Separador */}
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

            {/* Separador */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Información de Contacto</h3>
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
  );
}
