import { useState, useEffect, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router';

import { formatFecha } from '../../utils/fecha';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../../components/ui/accordion';
import { Pencil, FileText, Download, Loader2, Eye } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import {
  colaboradoresApi,
  buildAvatarUrl,
  TIPO_CONTRATO_COLABORADOR_LABEL,
  type TipoContratoColaborador,
} from '../../../api/colaboradores';
import { cop } from '../../lib/formato';
import { toast } from 'sonner';

const TIPOS_DOC: Record<string, string> = {
  CC: 'Cédula de Ciudadanía', TI: 'Tarjeta de Identidad',
  PASAPORTE: 'Pasaporte', CE: 'Cédula de Extranjería', PPT: 'Permiso por Protección Temporal',
};

/** Fila de dato: rótulo a la izquierda, valor a la derecha desde 640. */
function Fila({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground sm:text-right">{children}</dd>
    </div>
  );
}

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

  // ─── Documentos: descarga autenticada ──────────────────────────────────────
  const descargarDocumento = async (docId: number, nombreArchivo?: string) => {
    if (!id) return;
    try {
      const blob = await colaboradoresApi.descargarDocumentoBlob(Number(id), docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar el documento');
    }
  };

  // ─── Documentos: visualización en pestaña nueva ────────────────────────────
  const visualizarDocumento = async (doc: any) => {
    if (!id) return;
    // Abrir la pestaña síncronamente al click para evitar el bloqueo de popups
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Tu navegador bloqueó la nueva pestaña. Permite popups para esta página.');
      return;
    }
    newWindow.document.write(
      '<title>Cargando documento...</title><div style="font-family:system-ui;padding:2rem;color:#666">Cargando documento...</div>'
    );

    try {
      const { blob } = await colaboradoresApi.visualizarDocumento(Number(id), doc.id);
      const url = URL.createObjectURL(blob);
      newWindow.location.href = url;
      // Liberar el objectURL después de un rato (cuando el browser ya lo cargó)
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      newWindow.close();
      if (err?.code === 'MIME_NOT_PREVIEWABLE') {
        toast.info('Este tipo de archivo no se puede previsualizar. Descargando...');
        descargarDocumento(doc.id, doc.archivo_nombre_original);
      } else {
        toast.error(err?.message ?? 'Error al visualizar el documento');
      }
    }
  };

  if (loading) return (
    <Card className="gap-0">
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando colaborador…
      </div>
    </Card>
  );

  if (!colaborador) return (
    <Card className="gap-0">
      <EmptyState
        title="No se encontró el colaborador"
        description="La ficha no existe o ya fue eliminada."
        action={{ label: 'Volver a colaboradores', onClick: () => navigate('/colaboradores') }}
      />
    </Card>
  );

  const nombre = [colaborador.primer_nombre, colaborador.segundo_nombre, colaborador.primer_apellido, colaborador.segundo_apellido].filter(Boolean).join(' ');
  const iniciales = ((colaborador.primer_nombre?.[0] ?? '') + (colaborador.primer_apellido?.[0] ?? '')).toUpperCase();
  const fmt = (d?: string) => formatFecha(d, { year: 'numeric', month: 'long', day: 'numeric' });
  const modalidad = colaborador.modalidad_pago === 'FIJO' ? 'Fijo' : 'Variable';
  const tipoCuenta = colaborador.tipo_cuenta === 'AHORROS' ? 'Ahorros'
    : colaborador.tipo_cuenta === 'CORRIENTE' ? 'Corriente'
    : colaborador.tipo_cuenta || '-';

  // Documentos agrupados por categoría
  const docsPorCategoria = (cat: string) => documentos.filter(d => d.categoria === cat);

  const CATEGORIAS = [
    { key: 'DATOS_BASE', label: 'Datos base' },
    { key: 'CONTRATACION_LABORAL', label: 'Contratación laboral' },
    { key: 'SST', label: 'SST' },
    { key: 'PERMISOS_LICENCIAS', label: 'Permisos, licencias e incapacidades' },
    { key: 'FINALIZACION_CONTRATO', label: 'Finalización de contrato' },
    { key: 'DESPRENDIBLES', label: 'Desprendibles' },
    // El pagaré o la autorización de descuento de un préstamo (API_COLABORADORES
    // §7). Lo carga el módulo de Préstamos, pero el archivo vive aquí: sin esta
    // pestaña quedaba guardado e invisible.
    { key: 'PRESTAMOS', label: 'Préstamos y adelantos' },
    { key: 'OTROS', label: 'Otros' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/colaboradores"
        eyebrow={<Link to="/colaboradores" className="hover:text-foreground">Colaboradores</Link>}
        title={nombre}
        description={[colaborador.cargo, modalidad].filter(Boolean).join(' · ')}
        actions={
          <Button variant="outline" onClick={() => navigate(`/colaboradores/editar/${id}`)}>
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Editar
          </Button>
        }
      />

      {/* El nombre no se repite aquí: ya es el título de la página. */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {colaborador.avatar_url ? (
              <img
                src={buildAvatarUrl(colaborador.avatar_url) ?? ''}
                alt={nombre}
                className={`h-16 w-16 shrink-0 rounded-full border border-border object-cover ${colaborador.estado ? '' : 'opacity-60'}`}
              />
            ) : (
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${colaborador.estado ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground'}`}>
                {iniciales}
              </div>
            )}
            <dl className="grid flex-1 grid-cols-2 gap-5 lg:grid-cols-4">
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Documento</dt>
                <dd className="font-semibold tabular-nums">{colaborador.documento}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Cargo</dt>
                <dd className="font-semibold">{colaborador.cargo}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">ID</dt>
                <dd className="font-semibold tabular-nums">#{colaborador.id}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[13px] font-medium text-muted-foreground">Estado</dt>
                <dd>
                  <Badge variant={colaborador.estado ? 'success' : 'secondary'}>
                    {colaborador.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Grid de info detallada */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información personal */}
        <Card>
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="Teléfono">{colaborador.telefono || '-'}</Fila>
              <Fila label="Correo electrónico">{colaborador.correo_electronico || '-'}</Fila>
              <Fila label="Dirección">{colaborador.direccion || '-'}</Fila>
              {(colaborador.municipio || colaborador.departamento) && (
                <Fila label="Municipio y departamento">
                  {[colaborador.municipio, colaborador.departamento].filter(Boolean).join(', ')}
                </Fila>
              )}
              {colaborador.contacto_emergencia_nombre && (
                <Fila label="Contacto de emergencia">
                  {colaborador.contacto_emergencia_nombre}
                  {colaborador.contacto_emergencia_telefono && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {colaborador.contacto_emergencia_telefono}
                    </span>
                  )}
                </Fila>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Información laboral */}
        <Card>
          <CardHeader>
            <CardTitle>Información laboral</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="Predio asignado">{colaborador.predio?.nombre || 'Sin asignar'}</Fila>
              <Fila label="Modalidad de pago">{modalidad}</Fila>
              <Fila label="Fecha de ingreso">{fmt(colaborador.fecha_ingreso)}</Fila>
              {colaborador.contrato_vigente && (
                <Fila label="Tipo de contrato">
                  {TIPO_CONTRATO_COLABORADOR_LABEL[
                    (colaborador.contrato_vigente.tipo_contrato ??
                      'INDEFINIDO') as TipoContratoColaborador
                  ]}
                  {colaborador.contrato_vigente.fecha_fin_pactada && (
                    <span className="font-normal text-muted-foreground">
                      {' '}hasta {fmt(colaborador.contrato_vigente.fecha_fin_pactada)}
                    </span>
                  )}
                </Fila>
              )}
              {colaborador.fecha_retiro && (
                <Fila label="Fecha de retiro">{fmt(colaborador.fecha_retiro)}</Fila>
              )}
              <Fila label="Salario base">
                <span className="tabular-nums">{cop(colaborador.salario_base)}</span>
              </Fila>
            </dl>
          </CardContent>
        </Card>

        {/* Seguridad social */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad social</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="EPS">{colaborador.eps || '-'}</Fila>
              <Fila label="ARL">{colaborador.arl || '-'}</Fila>
              <Fila label="Fondo de pensión">{colaborador.fondo_pension || '-'}</Fila>
              <Fila label="Caja de compensación">{colaborador.caja_compensacion || '-'}</Fila>
            </dl>
          </CardContent>
        </Card>

        {/* Identificación */}
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="Tipo de documento">{TIPOS_DOC[colaborador.tipo_documento] ?? colaborador.tipo_documento}</Fila>
              <Fila label="Número de documento">
                <span className="tabular-nums">{colaborador.documento}</span>
              </Fila>
              <Fila label="Fecha de nacimiento">{fmt(colaborador.fecha_nacimiento)}</Fila>
              {colaborador.fecha_expedicion_documento && (
                <Fila label="Fecha de expedición">{fmt(colaborador.fecha_expedicion_documento)}</Fila>
              )}
              {colaborador.lugar_expedicion && (
                <Fila label="Lugar de expedición">{colaborador.lugar_expedicion}</Fila>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Dotación */}
        <Card>
          <CardHeader>
            <CardTitle>Dotación</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="Talla de camisa">{colaborador.talla_camisa || '-'}</Fila>
              <Fila label="Talla de pantalón">{colaborador.talla_pantalon || '-'}</Fila>
              <Fila label="Talla de calzado">{colaborador.talla_calzado || '-'}</Fila>
            </dl>
          </CardContent>
        </Card>

        {/* Bancario */}
        <Card>
          <CardHeader>
            <CardTitle>Información bancaria</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Fila label="Banco">{colaborador.entidad_bancaria || '-'}</Fila>
              <Fila label="Tipo de cuenta">{tipoCuenta}</Fila>
              <Fila label="Número de cuenta">
                <span className="tabular-nums">{colaborador.numero_cuenta || '-'}</span>
              </Fila>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando documentos…
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {CATEGORIAS.map(cat => {
                const docs = docsPorCategoria(cat.key);
                return (
                  <AccordionItem key={cat.key} value={cat.key}>
                    <AccordionTrigger className="text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        {cat.label}
                        <Badge variant="secondary">{docs.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {docs.length === 0 ? (
                        <p className="rounded-lg bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                          No hay documentos en esta categoría.
                        </p>
                      ) : (
                        docs.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <FileText className="h-4 w-4" strokeWidth={2} />
                              </span>
                              <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-foreground">{doc.nombre_archivo || doc.tipo_documento}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[doc.archivo_nombre_original, doc.fecha_documento ? fmt(doc.fecha_documento) : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                size="icon" variant="ghost" className="text-muted-foreground"
                                title="Visualizar" aria-label="Visualizar"
                                onClick={() => visualizarDocumento(doc)}
                              >
                                <Eye className="h-4 w-4" strokeWidth={2} />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="text-muted-foreground"
                                title="Descargar" aria-label="Descargar"
                                onClick={() => descargarDocumento(doc.id, doc.archivo_nombre_original)}
                              >
                                <Download className="h-4 w-4" strokeWidth={2} />
                              </Button>
                            </div>
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
  );
}