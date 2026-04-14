import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../../components/ui/accordion';
import {
  ArrowLeft, Edit, User, Briefcase, Shield, FileText,
  Download, IdCard, Package, Building2, Loader2, Phone,
} from 'lucide-react';
import { colaboradoresApi } from '../../../api/colaboradores';
import { toast } from 'sonner';

const TIPOS_DOC: Record<string, string> = {
  CC: 'Cédula de Ciudadanía', TI: 'Tarjeta de Identidad',
  PASAPORTE: 'Pasaporte', CE: 'Cédula de Extranjería', PPT: 'Permiso por Protección Temporal',
};

export default function ColaboradorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [colaborador, setColaborador] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    colaboradoresApi.ver(Number(id))
      .then(res => {
        setColaborador(res.data);
        // Cargar documentos
        setLoadingDocs(true);
        return colaboradoresApi.getDocumentos(Number(id));
      })
      .then(res => setDocumentos(res.data ?? []))
      .catch(() => toast.error('Error al cargar el colaborador'))
      .finally(() => { setLoading(false); setLoadingDocs(false); });
  }, [id]);

  const descargarDocumento = async (docId: number, nombreArchivo?: string) => {
    const base = (import.meta.env.VITE_API_URL ?? 'https://31.97.7.50:3000/api').replace(/\/+$/, '');
    const token = localStorage.getItem('palmapp_token');
    const tenantId = localStorage.getItem('palmapp_tenant_id');
    try {
      const res = await fetch(`${base}/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
        },
      });
      if (!res.ok) { toast.error('Error al descargar el documento'); return; }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = /filename="(.+)"/.exec(contentDisposition);
      const filename = match ? match[1] : (nombreArchivo || 'documento');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el documento');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Cargando colaborador...
    </div>
  );

  if (!colaborador) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Colaborador no encontrado</p>
    </div>
  );

  const nombre = [colaborador.primer_nombre, colaborador.segundo_nombre, colaborador.primer_apellido, colaborador.segundo_apellido].filter(Boolean).join(' ');
  const iniciales = ((colaborador.primer_nombre?.[0] ?? '') + (colaborador.primer_apellido?.[0] ?? '')).toUpperCase();
  const fmt = (d?: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  // Documentos agrupados por categoría
  const docsPorCategoria = (cat: string) => documentos.filter(d => d.categoria === cat);

  const CATEGORIAS = [
    { key: 'DATOS_BASE', label: 'Datos Base' },
    { key: 'CONTRATACION_LABORAL', label: 'Contratación Laboral' },
    { key: 'SST', label: 'SST' },
    { key: 'PERMISOS_LICENCIAS', label: 'Permisos, Licencias e Incapacidades' },
    { key: 'FINALIZACION_CONTRATO', label: 'Finalización de Contrato' },
    { key: 'DESPRENDIBLES', label: 'Desprendibles' },
    { key: 'OTROS', label: 'Otros' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/colaboradores')}
            className="h-10 w-10 rounded-lg border border-border hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1>Detalle de Colaborador</h1>
              <Badge className={colaborador.estado ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-muted'}>
                {colaborador.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-lead">Información completa del colaborador</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/colaboradores/editar/${id}`)} className="gap-2 bg-primary hover:bg-primary/90">
          <Edit className="h-4 w-4" /> Editar
        </Button>
      </div>

      {/* Card principal */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${colaborador.estado ? 'bg-primary/10 text-primary border-2 border-primary/20' : 'bg-muted text-muted-foreground border-2 border-border'}`}>
              {iniciales}
            </div>
            <div className="flex-1 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-semibold text-lg">{nombre}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="font-semibold text-lg">{colaborador.documento}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-semibold text-lg">{colaborador.cargo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-semibold text-lg">#{colaborador.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de info detallada */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información Personal */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Información Personal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Teléfono</p><p className="font-medium">{colaborador.telefono || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Correo Electrónico</p><p className="font-medium">{colaborador.correo_electronico || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Dirección</p><p className="font-medium">{colaborador.direccion || '-'}</p></div>
            {(colaborador.municipio || colaborador.departamento) && (
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Municipio / Departamento</p><p className="font-medium">{[colaborador.municipio, colaborador.departamento].filter(Boolean).join(', ')}</p></div>
            )}
            {colaborador.contacto_emergencia_nombre && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Contacto de Emergencia</p>
                <p className="font-medium">{colaborador.contacto_emergencia_nombre}</p>
                <p className="text-sm text-muted-foreground">{colaborador.contacto_emergencia_telefono}</p>
              </div>
            )}
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
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Predio Asignado</p><p className="font-medium">{colaborador.predio?.nombre || 'Sin asignar'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Modalidad de Pago</p><p className="font-medium">{colaborador.modalidad_pago === 'FIJO' ? 'Fijo' : 'Variable'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Fecha de Ingreso</p><p className="font-medium">{fmt(colaborador.fecha_ingreso)}</p></div>
            {colaborador.fecha_retiro && (
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Fecha de Retiro</p><p className="font-medium">{fmt(colaborador.fecha_retiro)}</p></div>
            )}
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Salario Base</p><p className="font-medium text-lg">${parseFloat(colaborador.salario_base ?? 0).toLocaleString('es-CO')}</p></div>
          </CardContent>
        </Card>

        {/* Seguridad Social */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Seguridad Social</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">EPS</p><p className="font-medium">{colaborador.eps || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">ARL</p><p className="font-medium">{colaborador.arl || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Fondo de Pensión</p><p className="font-medium">{colaborador.fondo_pension || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Caja de Compensación</p><p className="font-medium">{colaborador.caja_compensacion || '-'}</p></div>
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
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Tipo de Documento</p><p className="font-medium">{TIPOS_DOC[colaborador.tipo_documento] ?? colaborador.tipo_documento}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Número de Documento</p><p className="font-medium">{colaborador.documento}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Fecha de Nacimiento</p><p className="font-medium">{fmt(colaborador.fecha_nacimiento)}</p></div>
            {colaborador.fecha_expedicion_documento && (
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Fecha de Expedición</p><p className="font-medium">{fmt(colaborador.fecha_expedicion_documento)}</p></div>
            )}
            {colaborador.lugar_expedicion && (
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Lugar de Expedición</p><p className="font-medium">{colaborador.lugar_expedicion}</p></div>
            )}
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
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Talla Camisa</p><p className="font-medium">{colaborador.talla_camisa || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Talla Pantalón</p><p className="font-medium">{colaborador.talla_pantalon || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Talla Calzado</p><p className="font-medium">{colaborador.talla_calzado || '-'}</p></div>
          </CardContent>
        </Card>

        {/* Bancario */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Información Bancaria</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Banco</p><p className="font-medium">{colaborador.entidad_bancaria || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Tipo de Cuenta</p><p className="font-medium">{colaborador.tipo_cuenta === 'AHORROS' ? 'Ahorros' : colaborador.tipo_cuenta === 'CORRIENTE' ? 'Corriente' : colaborador.tipo_cuenta || '-'}</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Número de Cuenta</p><p className="font-medium">{colaborador.numero_cuenta || '-'}</p></div>
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
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando documentos...
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {CATEGORIAS.map(cat => {
                  const docs = docsPorCategoria(cat.key);
                  return (
                    <AccordionItem key={cat.key} value={cat.key}>
                      <AccordionTrigger className="text-sm font-semibold">
                        {cat.label}
                        {docs.length > 0 && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{docs.length}</span>
                        )}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {docs.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>No hay documentos en esta categoría</p>
                          </div>
                        ) : (
                          docs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                              <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-primary shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground">{doc.nombre_archivo || doc.tipo_documento}</p>
                                  <p className="text-xs text-muted-foreground">{doc.archivo_nombre_original}</p>
                                  {doc.fecha_documento && <p className="text-xs text-muted-foreground">{fmt(doc.fecha_documento)}</p>}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" title="Descargar" onClick={() => descargarDocumento(doc.id, doc.archivo_nombre_original)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}