import { useParams, useNavigate, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import {
  ArrowLeft,
  Edit,
  User,
  Briefcase,
  Shield,
  FileText,
  Download,
  IdCard,
  Package,
  Building2
} from 'lucide-react';

interface Document {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  tamaño: string;
  url: string;
}

interface DocumentCategory {
  id: string;
  nombre: string;
  documentos: Document[];
}

export default function ColaboradorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Datos mock del colaborador
  const colaborador = {
    id: id || 'C001',
    nombres: 'Carlos',
    apellidos: 'Pérez',
    nombre: 'Carlos Pérez',
    tipoDocumento: 'Cédula de Ciudadanía',
    cedula: '1234567890',
    fechaNacimiento: '1990-05-15',
    cargo: 'Recolector',
    modalidadPago: 'Producción',
    estado: 'Activo',
    loteAsignado: 'Lote Norte A',
    fechaIngreso: '2024-01-15',
    salario: 1250000,
    telefono: '3001234567',
    email: 'carlos.perez@example.com',
    direccion: 'Calle 123 #45-67',
    estadoCivil: 'Casado',
    contactoEmergencia: 'María Pérez - 3009876543',
    eps: 'Sura',
    arl: 'Positiva',
    pension: 'Porvenir',
    // Dotación
    tallaCamisa: 'L',
    tallaPantalon: '32',
    tallaCalzado: '40',
    // Bancario
    banco: 'Bancolombia',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '12345678901',
  };

  // Documentos base (datos mock)
  const documentosBase = {
    cedula: { id: '1', nombre: 'Cedula_Carlos_Perez.pdf', tipo: 'PDF', fecha: '2024-01-10', tamaño: '250 KB', url: '#' },
    hojaVida: { id: '2', nombre: 'HV_Carlos_Perez.pdf', tipo: 'PDF', fecha: '2024-01-10', tamaño: '340 KB', url: '#' },
    antecedentes: { id: '3', nombre: 'Antecedentes_Carlos_Perez.pdf', tipo: 'PDF', fecha: '2024-01-10', tamaño: '180 KB', url: '#' },
    fichaIngreso: null,
    autorizacionDatos: { id: '5', nombre: 'Autorizacion_Datos.pdf', tipo: 'PDF', fecha: '2024-01-10', tamaño: '120 KB', url: '#' },
  };

  // Categorías de documentos (datos mock)
  const categorias: DocumentCategory[] = [
    { 
      id: 'contratacion', 
      nombre: 'Contratación Laboral', 
      documentos: [
        { id: '10', nombre: 'Contrato_Trabajo.pdf', tipo: 'PDF', fecha: '2024-01-15', tamaño: '450 KB', url: '#' },
        { id: '11', nombre: 'Acuerdo_Confidencialidad.pdf', tipo: 'PDF', fecha: '2024-01-15', tamaño: '320 KB', url: '#' },
      ] 
    },
    { 
      id: 'sst', 
      nombre: 'SST', 
      documentos: [
        { id: '20', nombre: 'Examen_Medico_Ingreso.pdf', tipo: 'PDF', fecha: '2024-01-12', tamaño: '280 KB', url: '#' },
      ] 
    },
    { id: 'permisos', nombre: 'Permisos, Licencias, Incapacidades', documentos: [] },
    { id: 'finalizacion', nombre: 'Finalización Contrato', documentos: [] },
    { id: 'desprendibles', nombre: 'Desprendibles', documentos: [] },
    { id: 'otros', nombre: 'Otros', documentos: [] },
  ];

  const getIniciales = (nombre: string) => {
    const partes = nombre.split(' ');
    return partes.length > 1
      ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
      : nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/colaboradores')}
            className="h-10 w-10 rounded-lg border border-border hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1>Detalle de Colaborador</h1>
              <Badge className={colaborador.estado === 'Activo' 
                ? 'bg-success/10 text-success border-success/20' 
                : 'bg-muted text-muted-foreground border-muted'}>
                {colaborador.estado}
              </Badge>
            </div>
            <p className="text-lead">Información completa del colaborador</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/colaboradores/editar/${id}`)}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Card principal con información del colaborador */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
              colaborador.estado === 'Activo'
                ? 'bg-primary/10 text-primary border-2 border-primary/20'
                : 'bg-muted text-muted-foreground border-2 border-border'
            }`}>
              {getIniciales(colaborador.nombre)}
            </div>

            {/* Información principal */}
            <div className="flex-1 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-semibold text-lg">{colaborador.nombre}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cédula</p>
                <p className="font-semibold text-lg">{colaborador.cedula}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-semibold text-lg">{colaborador.cargo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-semibold text-lg">{colaborador.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de información detallada */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información Personal */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Información Personal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{colaborador.telefono}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{colaborador.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estado Civil</p>
                <p className="font-medium">{colaborador.estadoCivil}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Contacto de Emergencia</p>
                <p className="font-medium">{colaborador.contactoEmergencia}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{colaborador.direccion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Información Laboral</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lote Asignado</p>
                <p className="font-medium">{colaborador.loteAsignado}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Modalidad de Pago</p>
                <p className="font-medium">{colaborador.modalidadPago}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <p className="font-medium">
                  {new Date(colaborador.fechaIngreso).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Salario Base</p>
                <p className="font-medium text-lg">${colaborador.salario.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad Social */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Seguridad</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">EPS</p>
                <p className="font-medium">{colaborador.eps}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ARL</p>
                <p className="font-medium">{colaborador.arl}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pensión</p>
                <p className="font-medium">{colaborador.pension}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identificación */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              <CardTitle>Identificación</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo de Documento</p>
                <p className="font-medium">{colaborador.tipoDocumento}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número de Documento</p>
                <p className="font-medium">{colaborador.cedula}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {new Date(colaborador.fechaNacimiento).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dotación */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Dotación</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Talla Camisa</p>
                <p className="font-medium">{colaborador.tallaCamisa}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Talla Pantalón</p>
                <p className="font-medium">{colaborador.tallaPantalon}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Talla Calzado</p>
                <p className="font-medium">{colaborador.tallaCalzado}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Bancaria */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Información Bancaria</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Banco</p>
                <p className="font-medium">{colaborador.banco}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo de Cuenta</p>
                <p className="font-medium">{colaborador.tipoCuenta}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número de Cuenta</p>
                <p className="font-medium">{colaborador.numeroCuenta}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentos */}
      <div className="space-y-4">
        <h2>Documentos</h2>
        
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Repositorio de Documentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {/* DATOS BASE - Documentos individuales */}
              <AccordionItem value="datos-base">
                <AccordionTrigger className="text-sm font-semibold">
                  Datos Base
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {/* Cédula */}
                  {documentosBase.cedula && (
                    <div className="space-y-2">
                      <Label>Cédula</Label>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{documentosBase.cedula.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentosBase.cedula.fecha} • {documentosBase.cedula.tamaño}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Hoja de vida */}
                  {documentosBase.hojaVida && (
                    <div className="space-y-2">
                      <Label>Hoja de vida</Label>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{documentosBase.hojaVida.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentosBase.hojaVida.fecha} • {documentosBase.hojaVida.tamaño}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Antecedentes */}
                  {documentosBase.antecedentes && (
                    <div className="space-y-2">
                      <Label>Antecedentes</Label>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{documentosBase.antecedentes.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentosBase.antecedentes.fecha} • {documentosBase.antecedentes.tamaño}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Ficha de ingreso */}
                  {documentosBase.fichaIngreso && (
                    <div className="space-y-2">
                      <Label>Ficha de ingreso</Label>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{documentosBase.fichaIngreso.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentosBase.fichaIngreso.fecha} • {documentosBase.fichaIngreso.tamaño}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Autorización de datos personales */}
                  {documentosBase.autorizacionDatos && (
                    <div className="space-y-2">
                      <Label>Autorización de datos personales</Label>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{documentosBase.autorizacionDatos.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentosBase.autorizacionDatos.fecha} • {documentosBase.autorizacionDatos.tamaño}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* OTRAS CATEGORÍAS - Documentos múltiples */}
              {categorias.map((categoria) => (
                <AccordionItem key={categoria.id} value={categoria.id}>
                  <AccordionTrigger className="text-sm font-semibold">
                    {categoria.nombre}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-2">
                      {categoria.documentos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>No hay documentos en esta categoría</p>
                        </div>
                      ) : (
                        categoria.documentos.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary" />
                              <div>
                                <p className="font-medium text-foreground">{doc.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.fecha} • {doc.tamaño}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" title="Descargar">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}