import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Users,
  IdCard,
  Briefcase,
  Shield,
  Package,
  Building2,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { colaboradoresApi } from '../../../api/colaboradores';
import { fetchConToken } from '../../../api/request';
import { prediosApi } from '../../../api/plantacion';
import { toast } from 'sonner';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface FormData {
  estado: boolean;
  // Personal
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  // Identificación
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
  fechaNacimiento: string;
  lugarExpedicion: string;
  // Contratación
  cargo: string;
  predioAsignado: string;
  modalidadPago: string;
  salarioBase: number;
  fechaContratacion: string;
  fechaFinalizacion: string;
  // Seguridad Social
  eps: string;
  arl: string;
  fondoPension: string;
  cajaCompensacion: string;
  // Dotación
  tallaCamisa: string;
  tallaPantalon: string;
  tallaCalzado: string;
  // Bancario
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  // Contacto
  correo: string;
  telefono: string;
  direccion: string;
  municipio: string;
  departamento: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
}

// ─── Etapas ─────────────────────────────────────────────────────────────────────
const ETAPAS_BASE = [
  { numero: 1, nombre: 'Personal',       descripcion: 'Datos básicos',         icon: Users },
  { numero: 2, nombre: 'Identificación', descripcion: 'Documentos',            icon: IdCard },
  { numero: 3, nombre: 'Contratación',   descripcion: 'Cargo y salario',       icon: Briefcase },
  { numero: 4, nombre: 'Seguridad',      descripcion: 'EPS, ARL, Pensión',     icon: Shield },
  { numero: 5, nombre: 'Dotación',       descripcion: 'Tallas',                icon: Package },
  { numero: 6, nombre: 'Bancario',       descripcion: 'Cuenta bancaria',       icon: Building2 },
];
const ETAPA_DOCUMENTOS = { numero: 7, nombre: 'Documentos', descripcion: 'Repositorio', icon: FileText };

// ─── Catálogos ──────────────────────────────────────────────────────────────────
const tiposDocumento = [
  { codigo: 'CC', label: 'Cédula de Ciudadanía' },
  { codigo: 'TI', label: 'Tarjeta de Identidad' },
  { codigo: 'PASAPORTE', label: 'Pasaporte' },
  { codigo: 'CE', label: 'Cédula de Extranjería' },
  { codigo: 'PPT', label: 'Permiso por Protección Temporal' },
];
const modalidadesPago = [
  { codigo: 'FIJO', label: 'Fijo' },
  { codigo: 'VARIABLE', label: 'Variable' },
];
const entidadesEPS    = ['Sanitas', 'Compensar', 'Sura', 'Nueva EPS', 'Salud Total', 'Famisanar'];
const entidadesARL    = ['Sura', 'Positiva', 'Axisura', 'Liberty'];
const entidadesPension = ['Porvenir', 'Protección', 'Colfondos', 'Old Mutual', 'Skandia'];
const bancos          = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Banco Popular', 'Nequi', 'Daviplata'];
const tiposCuenta     = [
  { codigo: 'AHORROS', label: 'Ahorros' },
  { codigo: 'CORRIENTE', label: 'Corriente' },
  { codigo: 'EFECTIVO', label: 'Efectivo' },
];
const tallaCamisas    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallaPantalones = ['28', '30', '32', '34', '36', '38', '40', '42'];
const tallaCalzados   = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const FORM_INICIAL: FormData = {
  estado: true,
  primerApellido: '', segundoApellido: '', primerNombre: '', segundoNombre: '',
  tipoDocumento: 'CC', numeroDocumento: '', fechaExpedicion: '', fechaNacimiento: '', lugarExpedicion: '',
  cargo: '', predioAsignado: '', modalidadPago: 'FIJO', salarioBase: 0, fechaContratacion: '', fechaFinalizacion: '',
  eps: '', arl: '', fondoPension: '', cajaCompensacion: '',
  tallaCamisa: '', tallaPantalon: '', tallaCalzado: '',
  banco: '', tipoCuenta: 'AHORROS', numeroCuenta: '',
  correo: '', telefono: '', direccion: '', municipio: '', departamento: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
};

// ─── Componente ─────────────────────────────────────────────────────────────────
export default function NuevoColaboradorWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const ETAPAS = isEditMode ? [...ETAPAS_BASE, ETAPA_DOCUMENTOS] : ETAPAS_BASE;

  const [etapaActual, setEtapaActual] = useState(1);
  const [formData, setFormData] = useState<FormData>(FORM_INICIAL);
  const [predios, setPredios] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [departamentos, setDepartamentos] = useState<{codigo:string;nombre:string}[]>([]);
  const [municipios, setMunicipios] = useState<{codigo:string;nombre:string}[]>([]);
  const [deptoSel, setDeptoSel] = useState('');

  // Documentos (solo edición)
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Cargar predios
  useEffect(() => {
    prediosApi.listar({ per_page: 100 })
      .then(r => setPredios(r.data ?? []))
      .catch(() => {});
  }, []);

  // Cargar departamentos
  useEffect(() => {
    const token = localStorage.getItem('palmapp_token');
    fetchConToken('/api/v1/auth/departamentos', token)
      .then(r => r.json())
      .then(d => setDepartamentos(d.data ?? []))
      .catch(() => {});
  }, []);

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); return; }
    const token = localStorage.getItem('palmapp_token');
    fetchConToken(`/api/v1/auth/departamentos/${deptoSel}/municipios`, token)
      .then(r => r.json())
      .then(d => setMunicipios(d.data ?? []))
      .catch(() => {});
  }, [deptoSel]);

  // Cargar datos en modo edición
  useEffect(() => {
    if (!isEditMode || !id) return;
    colaboradoresApi.ver(Number(id)).then(res => {
      const d = res.data;
      setFormData({
        estado: d.estado ?? true,
        primerApellido: d.primer_apellido ?? '',
        segundoApellido: d.segundo_apellido ?? '',
        primerNombre: d.primer_nombre ?? '',
        segundoNombre: d.segundo_nombre ?? '',
        tipoDocumento: d.tipo_documento ?? 'CC',
        numeroDocumento: d.documento ?? '',
        fechaExpedicion: d.fecha_expedicion_documento ?? '',
        fechaNacimiento: d.fecha_nacimiento ?? '',
        lugarExpedicion: d.lugar_expedicion ?? '',
        cargo: d.cargo ?? '',
        predioAsignado: d.predio?.id ? String(d.predio.id) : '',
        modalidadPago: (d.modalidad_pago === 'PRODUCCION' ? 'VARIABLE' : d.modalidad_pago) ?? 'FIJO',
        salarioBase: parseFloat(d.salario_base ?? '0'),
        fechaContratacion: d.fecha_ingreso ?? '',
        fechaFinalizacion: d.fecha_retiro ?? '',
        eps: d.eps ?? '',
        arl: d.arl ?? '',
        fondoPension: d.fondo_pension ?? '',
        cajaCompensacion: d.caja_compensacion ?? '',
        tallaCamisa: d.talla_camisa ?? '',
        tallaPantalon: d.talla_pantalon ?? '',
        tallaCalzado: d.talla_calzado ?? '',
        banco: d.entidad_bancaria ?? '',
        tipoCuenta: d.tipo_cuenta ?? 'AHORROS',
        numeroCuenta: d.numero_cuenta ?? '',
        correo: d.correo_electronico ?? '',
        telefono: d.telefono ?? '',
        direccion: d.direccion ?? '',
        municipio: d.municipio ?? '',
        departamento: d.departamento ?? '',
        // Will be set by departamento name matching

        contactoEmergenciaNombre: d.contacto_emergencia_nombre ?? '',
        contactoEmergenciaTelefono: d.contacto_emergencia_telefono ?? '',
      });
    }).catch(() => toast.error('Error al cargar datos del colaborador'));
  }, [id, isEditMode]);

  // Cargar documentos al llegar al paso 7
  useEffect(() => {
    if (!isEditMode || !id || etapaActual !== 7) return;
    setLoadingDocs(true);
    colaboradoresApi.getDocumentos(Number(id))
      .then(r => setDocumentos(r.data ?? []))
      .catch(() => toast.error('Error al cargar documentos'))
      .finally(() => setLoadingDocs(false));
  }, [id, isEditMode, etapaActual]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof FormData, value: string | number) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const validarEtapa = (etapa: number): boolean => {
    switch (etapa) {
      case 1: return !!formData.primerNombre.trim() && !!formData.primerApellido.trim();
      case 2: return !!formData.numeroDocumento.trim() && !!formData.fechaExpedicion && !!formData.fechaNacimiento;
      case 3: return !!formData.cargo.trim() && (formData.modalidadPago === 'VARIABLE' || formData.salarioBase > 0) && !!formData.fechaContratacion;
      default: return true;
    }
  };

  const puedeAvanzar = validarEtapa(etapaActual);
  const siguienteEtapa = () => etapaActual < ETAPAS.length && setEtapaActual(e => e + 1);
  const etapaAnterior  = () => etapaActual > 1 && setEtapaActual(e => e - 1);
  const irAEtapa = (n: number) => {
    if (isEditMode || n <= etapaActual) setEtapaActual(n);
  };

  // ─── Documentos ────────────────────────────────────────────────────────────
  const handleSubirDocumento = async (categoria: string, tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('categoria', categoria);
      fd.append('tipo_documento', tipo);
      const res = await colaboradoresApi.subirDocumento(Number(id), fd);
      toast.success(res.message ?? 'Documento subido');
      const updated = await colaboradoresApi.getDocumentos(Number(id));
      setDocumentos(updated.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir documento');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleEliminarDocumento = async (docId: number) => {
    if (!id) return;
    try {
      const res = await colaboradoresApi.eliminarDocumento(Number(id), docId);
      toast.success(res.message ?? 'Documento eliminado');
      setDocumentos(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

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

  // ─── Guardar ────────────────────────────────────────────────────────────────
  const guardarTodo = async () => {
    // Validaciones solo aplican al CREAR
    if (!isEditMode) {
      if (!formData.primerNombre.trim())    { toast.error('El primer nombre es obligatorio');   setEtapaActual(1); return; }
      if (!formData.primerApellido.trim())  { toast.error('El primer apellido es obligatorio'); setEtapaActual(1); return; }
      if (!formData.numeroDocumento.trim()) { toast.error('El número de documento es obligatorio'); setEtapaActual(2); return; }
      if (!formData.fechaNacimiento)        { toast.error('La fecha de nacimiento es obligatoria'); setEtapaActual(2); return; }
      if (!formData.fechaExpedicion)        { toast.error('La fecha de expedición es obligatoria'); setEtapaActual(2); return; }
      if (!formData.cargo.trim())           { toast.error('El cargo es obligatorio');           setEtapaActual(3); return; }
      if (formData.modalidadPago === 'FIJO' && formData.salarioBase <= 0) { toast.error('El salario base debe ser mayor a 0 para modalidad Fijo'); setEtapaActual(3); return; }
      if (!formData.fechaContratacion)      { toast.error('La fecha de ingreso es obligatoria'); setEtapaActual(3); return; }
    }

    // Para CREAR: body con campos obligatorios fijos
    // Para EDITAR: body con solo los campos que tienen valor (todos opcionales según API)
    const body: Record<string, unknown> = {};

    if (!isEditMode) {
      // Obligatorios solo en creación
      body.primer_nombre              = formData.primerNombre.trim();
      body.primer_apellido            = formData.primerApellido.trim();
      body.tipo_documento             = formData.tipoDocumento;
      body.documento                  = formData.numeroDocumento.trim();
      body.fecha_nacimiento           = formData.fechaNacimiento;
      body.fecha_expedicion_documento = formData.fechaExpedicion;
      body.cargo                      = formData.cargo.trim();
      body.salario_base               = formData.modalidadPago === 'VARIABLE' ? 0 : formData.salarioBase;
      body.modalidad_pago             = formData.modalidadPago === 'VARIABLE' ? 'PRODUCCION' : formData.modalidadPago;
      body.fecha_ingreso              = formData.fechaContratacion;
    } else {
      // En edición enviar solo los que tienen valor
      if (formData.primerNombre.trim())    body.primer_nombre              = formData.primerNombre.trim();
      if (formData.primerApellido.trim())  body.primer_apellido            = formData.primerApellido.trim();
      if (formData.tipoDocumento)          body.tipo_documento             = formData.tipoDocumento;
      if (formData.numeroDocumento.trim()) body.documento                  = formData.numeroDocumento.trim();
      if (formData.fechaNacimiento)        body.fecha_nacimiento           = formData.fechaNacimiento;
      if (formData.fechaExpedicion)        body.fecha_expedicion_documento = formData.fechaExpedicion;
      if (formData.cargo.trim())           body.cargo                      = formData.cargo.trim();
      if (formData.salarioBase > 0)        body.salario_base               = formData.salarioBase;
      if (formData.modalidadPago)          body.modalidad_pago             = formData.modalidadPago === 'VARIABLE' ? 'PRODUCCION' : formData.modalidadPago;
      if (formData.fechaContratacion)      body.fecha_ingreso              = formData.fechaContratacion;
      body.estado = formData.estado;
    }

    if (formData.segundoNombre.trim())             body.segundo_nombre               = formData.segundoNombre.trim();
    if (formData.segundoApellido.trim())           body.segundo_apellido             = formData.segundoApellido.trim();
    if (formData.lugarExpedicion.trim())           body.lugar_expedicion             = formData.lugarExpedicion.trim();
    if (formData.predioAsignado)                   body.predio_id                    = Number(formData.predioAsignado);
    if (formData.fechaFinalizacion)                body.fecha_retiro                 = formData.fechaFinalizacion;
    if (formData.eps.trim())                       body.eps                          = formData.eps.trim();
    if (formData.arl.trim())                       body.arl                          = formData.arl.trim();
    if (formData.fondoPension.trim())              body.fondo_pension                = formData.fondoPension.trim();
    if (formData.cajaCompensacion.trim())          body.caja_compensacion            = formData.cajaCompensacion.trim();
    if (formData.tallaCamisa)                      body.talla_camisa                 = formData.tallaCamisa;
    if (formData.tallaPantalon)                    body.talla_pantalon               = formData.tallaPantalon;
    if (formData.tallaCalzado)                     body.talla_calzado                = formData.tallaCalzado;
    if (formData.banco.trim())                     body.entidad_bancaria             = formData.banco.trim();
    if (formData.tipoCuenta)                       body.tipo_cuenta                  = formData.tipoCuenta;
    if (formData.numeroCuenta.trim())              body.numero_cuenta                = formData.numeroCuenta.trim();
    if (formData.correo.trim())                    body.correo_electronico           = formData.correo.trim();
    if (formData.telefono.trim())                  body.telefono                     = formData.telefono.trim();
    if (formData.direccion.trim())                 body.direccion                    = formData.direccion.trim();
    if (formData.municipio.trim())                 body.municipio                    = formData.municipio.trim();
    if (formData.departamento.trim())              body.departamento                 = formData.departamento.trim();
    if (formData.contactoEmergenciaNombre.trim())  body.contacto_emergencia_nombre   = formData.contactoEmergenciaNombre.trim();
    if (formData.contactoEmergenciaTelefono.trim()) body.contacto_emergencia_telefono = formData.contactoEmergenciaTelefono.trim();

    setGuardando(true);
    try {
      if (isEditMode && id) {
        const res = await colaboradoresApi.editar(Number(id), body);
        toast.success(res.message ?? 'Colaborador actualizado correctamente');
      } else {
        const res = await colaboradoresApi.crear(body);
        toast.success(res.message ?? 'Colaborador creado correctamente');
      }
      navigate('/colaboradores');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/colaboradores')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold text-foreground">
            {isEditMode ? 'Editar Colaborador' : 'Nuevo Colaborador'}
          </h1>
        </div>
        <p className="text-muted-foreground ml-14">Completa la información paso a paso</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wizard */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva   = etapaActual === etapa.numero;
                  const Icon = etapa.icon;
                  return (
                    <div key={etapa.numero} className="flex items-center flex-1">
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${estaActiva || estaCompleta || isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        disabled={!isEditMode && !estaActiva && !estaCompleta}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${estaCompleta ? 'bg-primary border-primary text-white' : estaActiva ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                          {estaCompleta ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className={`text-xs font-semibold ${estaActiva ? 'text-primary' : estaCompleta ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {etapa.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground hidden sm:block">{etapa.descripcion}</div>
                        </div>
                      </button>
                      {index < ETAPAS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 ${estaCompleta ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── ETAPA 1: INFORMACIÓN PERSONAL ── */}
          {etapaActual === 1 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Información Personal</CardTitle>
                    <p className="text-sm text-muted-foreground">Datos básicos del colaborador</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primerApellido">Primer Apellido <span className="text-destructive">*</span></Label>
                    <Input id="primerApellido" placeholder="Ej: Rodríguez" value={formData.primerApellido} onChange={e => handleInputChange('primerApellido', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoApellido">Segundo Apellido</Label>
                    <Input id="segundoApellido" placeholder="Ej: García" value={formData.segundoApellido} onChange={e => handleInputChange('segundoApellido', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primerNombre">Primer Nombre <span className="text-destructive">*</span></Label>
                    <Input id="primerNombre" placeholder="Ej: Juan" value={formData.primerNombre} onChange={e => handleInputChange('primerNombre', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoNombre">Segundo Nombre</Label>
                    <Input id="segundoNombre" placeholder="Ej: Carlos" value={formData.segundoNombre} onChange={e => handleInputChange('segundoNombre', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 2: IDENTIFICACIÓN ── */}
          {etapaActual === 2 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <IdCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Identificación</CardTitle>
                    <p className="text-sm text-muted-foreground">Documentos de identidad</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo de Documento <span className="text-destructive">*</span></Label>
                  <Select value={formData.tipoDocumento} onValueChange={v => handleInputChange('tipoDocumento', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Documento <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: 1.234.567.890" value={formData.numeroDocumento} onChange={e => handleInputChange('numeroDocumento', e.target.value)} />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha de Expedición <span className="text-destructive">*</span></Label>
                    <Input type="date" value={formData.fechaExpedicion} onChange={e => handleInputChange('fechaExpedicion', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento <span className="text-destructive">*</span></Label>
                    <Input type="date" value={formData.fechaNacimiento} onChange={e => handleInputChange('fechaNacimiento', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lugar de Expedición</Label>
                  <Input placeholder="Ej: Bucaramanga" value={formData.lugarExpedicion} onChange={e => handleInputChange('lugarExpedicion', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 3: CONTRATACIÓN ── */}
          {etapaActual === 3 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Contratación</CardTitle>
                    <p className="text-sm text-muted-foreground">Cargo y compensación</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Cargo <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ej: Operario de Campo" value={formData.cargo} onChange={e => handleInputChange('cargo', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Predio Asignado</Label>
                  <Select value={formData.predioAsignado} onValueChange={v => handleInputChange('predioAsignado', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Sin predio asignado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin predio</SelectItem>
                      {predios.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidad de Pago <span className="text-destructive">*</span></Label>
                  <Select value={formData.modalidadPago} onValueChange={v => handleInputChange('modalidadPago', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {modalidadesPago.map(m => <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salario Base {formData.modalidadPago === 'FIJO' && <span className="text-destructive">*</span>}</Label>
                  {formData.modalidadPago === 'VARIABLE' ? (
                    <Input type="number" placeholder="Opcional para variable" value={formData.salarioBase || ''} onChange={e => handleInputChange('salarioBase', parseFloat(e.target.value) || 0)} />
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                      <Input
                        type="text"
                        placeholder="1.300.000"
                        className="pl-7"
                        value={formData.salarioBase > 0 ? formData.salarioBase.toLocaleString('es-CO') : ''}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          handleInputChange('salarioBase', parseInt(raw) || 0);
                        }}
                      />
                    </div>
                  )}
                </div>
                {isEditMode && (
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Estado del colaborador</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.estado ? 'Activo — puede ser incluido en nómina' : 'Inactivo — no aparece en operaciones'}
                      </p>
                    </div>
                    <Switch
                      checked={formData.estado}
                      onCheckedChange={v => handleInputChange('estado', v as any)}
                    />
                  </div>
                )}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso <span className="text-destructive">*</span></Label>
                    <Input type="date" value={formData.fechaContratacion} onChange={e => handleInputChange('fechaContratacion', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Retiro</Label>
                    <Input type="date" value={formData.fechaFinalizacion} onChange={e => handleInputChange('fechaFinalizacion', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 4: SEGURIDAD SOCIAL ── */}
          {etapaActual === 4 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Seguridad Social</CardTitle>
                    <p className="text-sm text-muted-foreground">EPS, ARL y fondo de pensión</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>EPS</Label>
                  <Select value={formData.eps} onValueChange={v => handleInputChange('eps', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una EPS" /></SelectTrigger>
                    <SelectContent>{entidadesEPS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ARL</Label>
                  <Select value={formData.arl} onValueChange={v => handleInputChange('arl', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una ARL" /></SelectTrigger>
                    <SelectContent>{entidadesARL.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fondo de Pensión</Label>
                  <Select value={formData.fondoPension} onValueChange={v => handleInputChange('fondoPension', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un fondo" /></SelectTrigger>
                    <SelectContent>{entidadesPension.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Caja de Compensación</Label>
                  <Input placeholder="Ej: Cafam" value={formData.cajaCompensacion} onChange={e => handleInputChange('cajaCompensacion', e.target.value)} />
                </div>
                {/* Contacto de emergencia aquí */}
                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-sm font-semibold">Contacto de Emergencia</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input placeholder="Ej: María López" value={formData.contactoEmergenciaNombre} onChange={e => handleInputChange('contactoEmergenciaNombre', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input placeholder="3109876543" value={formData.contactoEmergenciaTelefono} onChange={e => handleInputChange('contactoEmergenciaTelefono', e.target.value)} />
                    </div>
                  </div>
                </div>
                {/* Datos de contacto */}
                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-sm font-semibold">Datos de Contacto</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Correo Electrónico</Label>
                      <Input type="email" placeholder="juan@email.com" value={formData.correo} onChange={e => handleInputChange('correo', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input placeholder="3001234567" value={formData.telefono} onChange={e => handleInputChange('telefono', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input placeholder="Calle 45 #12-30" value={formData.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <select
                        value={deptoSel}
                        onChange={e => {
                          setDeptoSel(e.target.value);
                          const nombre = departamentos.find(d => d.codigo === e.target.value)?.nombre ?? '';
                          handleInputChange('departamento', nombre);
                          handleInputChange('municipio', '');
                          setMunicipios([]);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Seleccionar departamento...</option>
                        {departamentos.map(d => (
                          <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Municipio</Label>
                      <select
                        value={formData.municipio}
                        onChange={e => handleInputChange('municipio', e.target.value)}
                        disabled={!deptoSel}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        <option value="">Seleccionar municipio...</option>
                        {municipios.map(m => (
                          <option key={m.codigo} value={m.nombre}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 5: DOTACIÓN ── */}
          {etapaActual === 5 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Dotación</CardTitle>
                    <p className="text-sm text-muted-foreground">Tallas de ropa y calzado</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Talla Camisa</Label>
                  <Select value={formData.tallaCamisa} onValueChange={v => handleInputChange('tallaCamisa', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent>{tallaCamisas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Talla Pantalón</Label>
                  <Select value={formData.tallaPantalon} onValueChange={v => handleInputChange('tallaPantalon', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent>{tallaPantalones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Talla Calzado</Label>
                  <Select value={formData.tallaCalzado} onValueChange={v => handleInputChange('tallaCalzado', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent>{tallaCalzados.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 6: BANCARIO ── */}
          {etapaActual === 6 && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Información Bancaria</CardTitle>
                    <p className="text-sm text-muted-foreground">Datos para pagos de nómina</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Select value={formData.banco} onValueChange={v => handleInputChange('banco', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un banco" /></SelectTrigger>
                    <SelectContent>{bancos.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cuenta</Label>
                  <Select value={formData.tipoCuenta} onValueChange={v => handleInputChange('tipoCuenta', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tiposCuenta.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Cuenta</Label>
                  <Input placeholder="Ej: 04512345678" value={formData.numeroCuenta} onChange={e => handleInputChange('numeroCuenta', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 7: DOCUMENTOS (solo edición) ── */}
          {etapaActual === 7 && isEditMode && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Repositorio de Documentos</CardTitle>
                    <p className="text-sm text-muted-foreground">Gestiona los documentos del colaborador por categorías</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando documentos...
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {[
                      { key: 'DATOS_BASE',            label: 'Datos Base',                           unico: true,  tipos: { DOCUMENTO_DE_IDENTIDAD: 'Cédula', HOJA_DE_VIDA: 'Hoja de vida', ANTECEDENTES: 'Antecedentes', AUTORIZACION_DATOS_PERSONALES: 'Autorización datos personales' } },
                      { key: 'CONTRATACION_LABORAL',  label: 'Contratación Laboral',                 unico: true,  tipos: { CONTRATO_DE_TRABAJO: 'Contrato de trabajo', ACUERDO_DE_CONFIDENCIALIDAD: 'Acuerdo de confidencialidad' } },
                      { key: 'SST',                   label: 'SST',                                  unico: true,  tipos: { EXAMEN_DE_INGRESO: 'Examen de ingreso' } },
                      { key: 'PERMISOS_LICENCIAS',    label: 'Permisos, Licencias e Incapacidades',  unico: false, tipos: {} },
                      { key: 'FINALIZACION_CONTRATO', label: 'Finalización de Contrato',             unico: false, tipos: { FINALIZACION_CONTRATO: 'Finalización de contrato' } },
                      { key: 'DESPRENDIBLES',         label: 'Desprendibles',                        unico: false, tipos: { DESPRENDIBLES: 'Desprendibles' } },
                      { key: 'OTROS',                 label: 'Otros',                                unico: false, tipos: {} },
                    ].map(cat => {
                      const docsDeCategoria = documentos.filter(d => d.categoria === cat.key);
                      return (
                        <AccordionItem key={cat.key} value={cat.key}>
                          <AccordionTrigger className="text-sm font-semibold">
                            {cat.label}
                            {docsDeCategoria.length > 0 && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{docsDeCategoria.length}</span>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {/* Helper component for a single doc row */}
                            {Object.keys(cat.tipos).length > 0 && cat.unico ? (
                              /* unico_por_tipo=true: un slot por tipo (reemplaza al subir) */
                              Object.entries(cat.tipos as Record<string, string>).map(([tipo, label]) => {
                                const docDelTipo = docsDeCategoria.find(d => d.tipo_documento === tipo);
                                return (
                                  <div key={tipo} className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">{label}</p>
                                    {docDelTipo ? (
                                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/20">
                                        <div className="flex items-center gap-3">
                                          <FileText className="h-8 w-8 text-primary shrink-0" />
                                          <div>
                                            <p className="text-sm font-medium">{docDelTipo.archivo_nombre_original}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {docDelTipo.fecha_documento ?? docDelTipo.created_at?.split('T')[0]}
                                              {docDelTipo.archivo_tamano ? ` • ${(docDelTipo.archivo_tamano / 1024).toFixed(1)} KB` : ''}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button size="sm" variant="ghost" title="Descargar" onClick={() => descargarDocumento(docDelTipo.id, docDelTipo.archivo_nombre_original)}>
                                            <Download className="h-4 w-4" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => handleEliminarDocumento(docDelTipo.id)} className="text-destructive hover:text-destructive" title="Eliminar">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <input type="file" id={`up-${cat.key}-${tipo}`} className="hidden"
                                          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                          onChange={e => handleSubirDocumento(cat.key, tipo, e)} />
                                        <Button size="sm" variant="outline" disabled={uploadingDoc}
                                          onClick={() => document.getElementById(`up-${cat.key}-${tipo}`)?.click()} className="w-full">
                                          <Upload className="h-4 w-4 mr-2" />
                                          {uploadingDoc ? 'Subiendo...' : `Cargar ${label}`}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              /* unico_por_tipo=false: múltiples documentos permitidos */
                              <>
                                {/* Mostrar todos los docs existentes */}
                                {docsDeCategoria.map(doc => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/20">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-8 w-8 text-primary shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium">{doc.nombre_archivo || doc.archivo_nombre_original}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {doc.fecha_documento ?? doc.created_at?.split('T')[0]}
                                          {doc.archivo_tamano ? ` • ${(doc.archivo_tamano / 1024).toFixed(1)} KB` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button size="sm" variant="ghost" title="Descargar" onClick={() => descargarDocumento(doc.id, doc.archivo_nombre_original)}>
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleEliminarDocumento(doc.id)} className="text-destructive hover:text-destructive" title="Eliminar">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {/* Botón subir — usa el tipo correcto según la categoría */}
                                {Object.keys(cat.tipos).length > 0 ? (
                                  Object.entries(cat.tipos as Record<string, string>).map(([tipo, label]) => (
                                    <div key={tipo}>
                                      <input type="file" id={`up-${cat.key}-${tipo}-multi`} className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                        onChange={e => handleSubirDocumento(cat.key, tipo, e)} />
                                      <Button size="sm" variant="outline" disabled={uploadingDoc}
                                        onClick={() => document.getElementById(`up-${cat.key}-${tipo}-multi`)?.click()} className="w-full">
                                        <Upload className="h-4 w-4 mr-2" />
                                        {uploadingDoc ? 'Subiendo...' : `Subir ${label}`}
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <div>
                                    <input type="file" id={`up-${cat.key}-libre`} className="hidden"
                                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                      onChange={e => handleSubirDocumento(cat.key, cat.key, e)} />
                                    <Button size="sm" variant="outline" disabled={uploadingDoc}
                                      onClick={() => document.getElementById(`up-${cat.key}-libre`)?.click()} className="w-full">
                                      <Upload className="h-4 w-4 mr-2" />
                                      {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navegación */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex gap-2">
              {/* En edición: siempre mostrar Guardar cambios */}
              {isEditMode && (
                <Button onClick={guardarTodo} disabled={guardando} variant="outline" className="gap-2">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />Guardar cambios</>}
                </Button>
              )}
              {etapaActual < ETAPAS.length ? (
                <Button onClick={siguienteEtapa} disabled={!isEditMode && !puedeAvanzar} className="gap-2">
                  Siguiente <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                !isEditMode ? (
                  <Button onClick={guardarTodo} disabled={guardando} className="gap-2 bg-success hover:bg-success/90">
                    {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />Crear Colaborador</>}
                  </Button>
                ) : (
                  <Button onClick={async () => { await guardarTodo(); }} disabled={guardando} className="gap-2 bg-success hover:bg-success/90">
                    {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : 'Finalizar'}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Panel resumen */}
        <div className="lg:col-span-1">
          <Card className="border-border sticky top-8">
            <CardHeader><CardTitle className="text-lg">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Información Personal</p>
                  <p className="font-medium">
                    {[formData.primerNombre, formData.segundoNombre, formData.primerApellido, formData.segundoApellido].filter(Boolean).join(' ') || '-'}
                  </p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Identificación</p>
                  <p className="font-medium">{formData.numeroDocumento || '-'}</p>
                  <p className="text-xs text-muted-foreground">{tiposDocumento.find(t => t.codigo === formData.tipoDocumento)?.label}</p>
                  {formData.fechaExpedicion && (
                    <p className="text-xs text-muted-foreground">Expedición: {new Date(formData.fechaExpedicion + 'T12:00:00').toLocaleDateString('es-CO')}</p>
                  )}
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Cargo</p>
                  <p className="font-medium">{formData.cargo || '-'}</p>
                  <p className="text-xs text-muted-foreground">{modalidadesPago.find(m => m.codigo === formData.modalidadPago)?.label}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Salario Base</p>
                  <p className="font-medium">{formData.salarioBase > 0 ? `$${formData.salarioBase.toLocaleString('es-CO')}` : '-'}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Seguridad Social</p>
                  <p className="text-xs">EPS: {formData.eps || '-'}</p>
                  <p className="text-xs">ARL: {formData.arl || '-'}</p>
                  <p className="text-xs">Pensión: {formData.fondoPension || '-'}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Dotación</p>
                  <p className="text-xs">Camisa: {formData.tallaCamisa || '-'}</p>
                  <p className="text-xs">Pantalón: {formData.tallaPantalon || '-'}</p>
                  <p className="text-xs">Calzado: {formData.tallaCalzado || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Información Bancaria</p>
                  <p className="text-xs">Banco: {formData.banco || '-'}</p>
                  <p className="text-xs">Tipo: {tiposCuenta.find(t => t.codigo === formData.tipoCuenta)?.label}</p>
                  <p className="text-xs">Cuenta: {formData.numeroCuenta || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}