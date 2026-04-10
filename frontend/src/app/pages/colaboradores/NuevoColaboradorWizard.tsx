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
} from 'lucide-react';

// Tipos
interface Colaborador {
  id?: string;
  // Información Personal
  nombres: string;
  apellidos: string;
  // Identificación
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  // Contratación
  cargo: string;
  modalidadPago: string;
  salarioBase: number;
  // Seguridad
  eps: string;
  arl: string;
  fondoPension: string;
  // Dotación
  tallaCamisa: string;
  tallaPantalon: string;
  tallaCalzado: string;
  // Bancario
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
}

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

// Etapas del wizard (base)
const ETAPAS_BASE = [
  { numero: 1, nombre: 'Personal', descripcion: 'Información básica', icon: Users },
  { numero: 2, nombre: 'Identificación', descripcion: 'Documentos', icon: IdCard },
  { numero: 3, nombre: 'Contratación', descripcion: 'Cargo y salario', icon: Briefcase },
  { numero: 4, nombre: 'Seguridad', descripcion: 'EPS, ARL, Pensión', icon: Shield },
  { numero: 5, nombre: 'Dotación', descripcion: 'Tallas', icon: Package },
  { numero: 6, nombre: 'Bancario', descripcion: 'Cuenta bancaria', icon: Building2 },
];

// Etapa 7 solo para modo edición
const ETAPA_DOCUMENTOS = { numero: 7, nombre: 'Documentos', descripcion: 'Repositorio', icon: FileText };

// Datos de catálogos
const tiposDocumento = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería (CE)',
  'Permiso por Protección Temporal (PPT)',
];

const modalidadesPago = ['Fijo', 'Producción'];

const tallaCamisas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallaPantalones = ['28', '30', '32', '34', '36', '38', '40', '42'];
const tallaCalzados = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const entidadesEPS = ['Sanitas', 'Compensar', 'Sura', 'Nueva EPS', 'Salud Total', 'Famisanar'];
const entidadesARL = ['Sura', 'Positiva', 'Axisura', 'Liberty'];
const entidadesPension = ['Porvenir', 'Protección', 'Colfondos', 'Old Mutual', 'Skandia'];

const bancos = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Banco Popular', 'Nequi', 'Daviplata'];
const tiposCuenta = ['Ahorros', 'Corriente'];

export default function NuevoColaboradorWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [etapaActual, setEtapaActual] = useState(1);

  // Etapas dinámicas basadas en modo
  const ETAPAS = isEditMode ? [...ETAPAS_BASE, ETAPA_DOCUMENTOS] : ETAPAS_BASE;

  // Estado del colaborador
  const [formData, setFormData] = useState<Colaborador>({
    nombres: '',
    apellidos: '',
    tipoDocumento: 'Cédula de Ciudadanía',
    numeroDocumento: '',
    fechaNacimiento: '',
    cargo: '',
    modalidadPago: 'Fijo',
    salarioBase: 0,
    eps: '',
    arl: '',
    fondoPension: '',
    tallaCamisa: '',
    tallaPantalon: '',
    tallaCalzado: '',
    banco: '',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '',
  });

  // Estado de documentos (solo en modo edición)
  const [categorias, setCategorias] = useState<DocumentCategory[]>([
    { id: 'contratacion', nombre: 'Contratación Laboral', documentos: [] },
    { id: 'sst', nombre: 'SST', documentos: [] },
    { id: 'permisos', nombre: 'Permisos, Licencias, Incapacidades', documentos: [] },
    { id: 'finalizacion', nombre: 'Finalización Contrato', documentos: [] },
    { id: 'desprendibles', nombre: 'Desprendibles', documentos: [] },
    { id: 'otros', nombre: 'Otros', documentos: [] },
  ]);

  // Documentos base individuales
  const [documentosBase, setDocumentosBase] = useState<{
    cedula: Document | null;
    hojaVida: Document | null;
    antecedentes: Document | null;
    fichaIngreso: Document | null;
    autorizacionDatos: Document | null;
  }>({
    cedula: null,
    hojaVida: null,
    antecedentes: null,
    fichaIngreso: null,
    autorizacionDatos: null,
  });

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (isEditMode) {
      // Aquí cargarías los datos del colaborador desde el backend
      // Por ahora uso datos mock
      setFormData({
        nombres: 'Juan Carlos',
        apellidos: 'Rodríguez García',
        tipoDocumento: 'Cédula de Ciudadanía',
        numeroDocumento: '1234567890',
        fechaNacimiento: '1990-05-15',
        cargo: 'Operario de Campo',
        modalidadPago: 'Fijo',
        salarioBase: 1300000,
        eps: 'Sanitas',
        arl: 'Sura',
        fondoPension: 'Porvenir',
        tallaCamisa: 'M',
        tallaPantalon: '32',
        tallaCalzado: '40',
        banco: 'Bancolombia',
        tipoCuenta: 'Ahorros',
        numeroCuenta: '123-456-789',
      });
    }
  }, [isEditMode]);

  // === FUNCIONES DE NAVEGACIÓN ===
  const siguienteEtapa = () => {
    if (etapaActual < ETAPAS.length) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const irAEtapa = (numero: number) => {
    // En modo edición, permitir navegación libre
    if (isEditMode) {
      setEtapaActual(numero);
    } else {
      // En modo creación, solo permitir ir a etapas completadas o actual
      if (numero <= etapaActual) {
        setEtapaActual(numero);
      }
    }
  };

  const handleInputChange = (field: keyof Colaborador, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // === FUNCIONES DE VALIDACIÓN ===
  const validarEtapa = (etapa: number): boolean => {
    switch (etapa) {
      case 1:
        return formData.nombres.trim() !== '' && formData.apellidos.trim() !== '';
      case 2:
        return formData.numeroDocumento.trim() !== '';
      case 3:
        return formData.cargo.trim() !== '' && formData.salarioBase > 0;
      case 4:
      case 5:
      case 6:
      case 7: // Etapa de documentos también es opcional
        return true; // Estas etapas son opcionales
      default:
        return false;
    }
  };

  const puedeAvanzar = validarEtapa(etapaActual);

  // === FUNCIONES DE DOCUMENTOS (solo modo edición) ===
  // Función para cargar documentos base individuales
  const handleBaseDocumentUpload = (
    docType: 'cedula' | 'hojaVida' | 'antecedentes' | 'fichaIngreso' | 'autorizacionDatos',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      nombre: file.name,
      tipo: file.type.includes('pdf') ? 'PDF' : 'DOC',
      fecha: new Date().toISOString().split('T')[0],
      tamaño: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      url: URL.createObjectURL(file),
    };

    setDocumentosBase((prev) => ({ ...prev, [docType]: newDocument }));
  };

  const handleDeleteBaseDocument = (
    docType: 'cedula' | 'hojaVida' | 'antecedentes' | 'fichaIngreso' | 'autorizacionDatos'
  ) => {
    setDocumentosBase((prev) => ({ ...prev, [docType]: null }));
  };

  // Función para cargar documentos de categorías
  const handleFileUpload = (categoriaId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      nombre: file.name,
      tipo: file.type.includes('pdf') ? 'PDF' : 'DOC',
      fecha: new Date().toISOString().split('T')[0],
      tamaño: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      url: URL.createObjectURL(file),
    };

    setCategorias((prev) =>
      prev.map((cat) =>
        cat.id === categoriaId
          ? { ...cat, documentos: [...cat.documentos, newDocument] }
          : cat
      )
    );
  };

  const handleDeleteDocument = (categoriaId: string, docId: string) => {
    setCategorias((prev) =>
      prev.map((cat) =>
        cat.id === categoriaId
          ? { ...cat, documentos: cat.documentos.filter((doc) => doc.id !== docId) }
          : cat
      )
    );
  };

  // === FUNCIONES DE GUARDADO ===
  const guardarTodo = () => {
    // Validar campos obligatorios
    if (!formData.nombres.trim()) {
      alert('El nombre es obligatorio');
      setEtapaActual(1);
      return;
    }
    if (!formData.apellidos.trim()) {
      alert('Los apellidos son obligatorios');
      setEtapaActual(1);
      return;
    }
    if (!formData.numeroDocumento.trim()) {
      alert('El número de documento es obligatorio');
      setEtapaActual(2);
      return;
    }
    if (!formData.cargo.trim()) {
      alert('El cargo es obligatorio');
      setEtapaActual(3);
      return;
    }
    if (formData.salarioBase <= 0) {
      alert('El salario base debe ser mayor a 0');
      setEtapaActual(3);
      return;
    }

    console.log(isEditMode ? 'Actualizando colaborador:' : 'Guardando colaborador:', formData);
    alert(isEditMode ? 'Colaborador actualizado exitosamente' : 'Colaborador creado exitosamente');
    navigate('/colaboradores');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/colaboradores')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">
              {isEditMode ? 'Editar Colaborador' : 'Nuevo Colaborador'}
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Completa la información paso a paso
          </p>
        </div>
      </div>

      {/* Layout principal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Wizard (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper horizontal */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva = etapaActual === etapa.numero;
                  const Icon = etapa.icon;

                  return (
                    <div key={etapa.numero} className="flex items-center flex-1">
                      {/* Círculo de etapa */}
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex flex-col items-center gap-2 ${
                          estaActiva || estaCompleta || isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!isEditMode && !estaActiva && !estaCompleta}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                            estaCompleta
                              ? 'bg-primary border-primary text-white'
                              : estaActiva
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {estaCompleta ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div
                            className={`text-xs font-semibold ${
                              estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>

                      {/* Línea conectora */}
                      {index < ETAPAS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-2 bg-border relative">
                          <div
                            className={`absolute inset-0 bg-primary transition-all ${
                              estaCompleta ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contenido de las etapas */}
          <div className="space-y-6">
            {/* ETAPA 1: INFORMACIÓN PERSONAL */}
            {etapaActual === 1 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información Personal</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Datos básicos del colaborador
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombres">
                      Nombres <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nombres"
                      placeholder="Ej: Juan Carlos"
                      value={formData.nombres}
                      onChange={(e) => handleInputChange('nombres', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellidos">
                      Apellidos <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apellidos"
                      placeholder="Ej: Rodríguez García"
                      value={formData.apellidos}
                      onChange={(e) => handleInputChange('apellidos', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 2: IDENTIFICACIÓN */}
            {etapaActual === 2 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <IdCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Identificación</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Documentos de identidad
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipoDocumento">
                      Tipo de Documento <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.tipoDocumento}
                      onValueChange={(value) => handleInputChange('tipoDocumento', value)}
                    >
                      <SelectTrigger id="tipoDocumento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposDocumento.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numeroDocumento">
                      Número de Documento <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="numeroDocumento"
                      placeholder="Ej: 1.234.567.890"
                      value={formData.numeroDocumento}
                      onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 3: CONTRATACIÓN */}
            {etapaActual === 3 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Contratación</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Cargo y compensación
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">
                      Cargo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cargo"
                      placeholder="Ej: Operario de Campo"
                      value={formData.cargo}
                      onChange={(e) => handleInputChange('cargo', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modalidadPago">
                      Modalidad de Pago <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.modalidadPago}
                      onValueChange={(value) => handleInputChange('modalidadPago', value)}
                    >
                      <SelectTrigger id="modalidadPago">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modalidadesPago.map((modalidad) => (
                          <SelectItem key={modalidad} value={modalidad}>
                            {modalidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salarioBase">
                      Salario Base <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="salarioBase"
                      type="number"
                      placeholder="1300000"
                      value={formData.salarioBase || ''}
                      onChange={(e) => handleInputChange('salarioBase', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 4: SEGURIDAD SOCIAL */}
            {etapaActual === 4 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Seguridad Social</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        EPS, ARL y fondo de pensión
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="eps">EPS</Label>
                    <Select
                      value={formData.eps}
                      onValueChange={(value) => handleInputChange('eps', value)}
                    >
                      <SelectTrigger id="eps">
                        <SelectValue placeholder="Selecciona una EPS" />
                      </SelectTrigger>
                      <SelectContent>
                        {entidadesEPS.map((eps) => (
                          <SelectItem key={eps} value={eps}>
                            {eps}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arl">ARL</Label>
                    <Select
                      value={formData.arl}
                      onValueChange={(value) => handleInputChange('arl', value)}
                    >
                      <SelectTrigger id="arl">
                        <SelectValue placeholder="Selecciona una ARL" />
                      </SelectTrigger>
                      <SelectContent>
                        {entidadesARL.map((arl) => (
                          <SelectItem key={arl} value={arl}>
                            {arl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fondoPension">Fondo de Pensión</Label>
                    <Select
                      value={formData.fondoPension}
                      onValueChange={(value) => handleInputChange('fondoPension', value)}
                    >
                      <SelectTrigger id="fondoPension">
                        <SelectValue placeholder="Selecciona un fondo" />
                      </SelectTrigger>
                      <SelectContent>
                        {entidadesPension.map((fondo) => (
                          <SelectItem key={fondo} value={fondo}>
                            {fondo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 5: DOTACIÓN */}
            {etapaActual === 5 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Dotación</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Tallas de ropa y calzado
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tallaCamisa">Talla Camisa</Label>
                    <Select
                      value={formData.tallaCamisa}
                      onValueChange={(value) => handleInputChange('tallaCamisa', value)}
                    >
                      <SelectTrigger id="tallaCamisa">
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {tallaCamisas.map((talla) => (
                          <SelectItem key={talla} value={talla}>
                            {talla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tallaPantalon">Talla Pantalón</Label>
                    <Select
                      value={formData.tallaPantalon}
                      onValueChange={(value) => handleInputChange('tallaPantalon', value)}
                    >
                      <SelectTrigger id="tallaPantalon">
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {tallaPantalones.map((talla) => (
                          <SelectItem key={talla} value={talla}>
                            {talla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tallaCalzado">Talla Calzado</Label>
                    <Select
                      value={formData.tallaCalzado}
                      onValueChange={(value) => handleInputChange('tallaCalzado', value)}
                    >
                      <SelectTrigger id="tallaCalzado">
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {tallaCalzados.map((talla) => (
                          <SelectItem key={talla} value={talla}>
                            {talla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 6: BANCARIO */}
            {etapaActual === 6 && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Información Bancaria</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Datos para pagos de nómina
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="banco">Banco</Label>
                    <Select
                      value={formData.banco}
                      onValueChange={(value) => handleInputChange('banco', value)}
                    >
                      <SelectTrigger id="banco">
                        <SelectValue placeholder="Selecciona un banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {bancos.map((banco) => (
                          <SelectItem key={banco} value={banco}>
                            {banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoCuenta">Tipo de Cuenta</Label>
                    <Select
                      value={formData.tipoCuenta}
                      onValueChange={(value) => handleInputChange('tipoCuenta', value)}
                    >
                      <SelectTrigger id="tipoCuenta">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCuenta.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                    <Input
                      id="numeroCuenta"
                      placeholder="Ej: 123-456-789"
                      value={formData.numeroCuenta}
                      onChange={(e) => handleInputChange('numeroCuenta', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETAPA 7: DOCUMENTOS (solo modo edición) */}
            {etapaActual === 7 && isEditMode && (
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Repositorio de Documentos</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Gestiona los documentos del colaborador por categorías
                      </p>
                    </div>
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
                        <div className="space-y-2">
                          <Label>Cédula</Label>
                          {documentosBase.cedula ? (
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
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBaseDocument('cedula')}
                                  className="text-destructive hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id="upload-cedula"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleBaseDocumentUpload('cedula', e)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('upload-cedula')?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Cargar Cédula
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Hoja de vida */}
                        <div className="space-y-2">
                          <Label>Hoja de vida</Label>
                          {documentosBase.hojaVida ? (
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
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBaseDocument('hojaVida')}
                                  className="text-destructive hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id="upload-hojaVida"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleBaseDocumentUpload('hojaVida', e)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('upload-hojaVida')?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Cargar Hoja de vida
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Antecedentes */}
                        <div className="space-y-2">
                          <Label>Antecedentes</Label>
                          {documentosBase.antecedentes ? (
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
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBaseDocument('antecedentes')}
                                  className="text-destructive hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id="upload-antecedentes"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleBaseDocumentUpload('antecedentes', e)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('upload-antecedentes')?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Cargar Antecedentes
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Ficha de ingreso */}
                        <div className="space-y-2">
                          <Label>Ficha de ingreso</Label>
                          {documentosBase.fichaIngreso ? (
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
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBaseDocument('fichaIngreso')}
                                  className="text-destructive hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id="upload-fichaIngreso"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleBaseDocumentUpload('fichaIngreso', e)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('upload-fichaIngreso')?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Cargar Ficha de ingreso
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Autorización de datos personales */}
                        <div className="space-y-2">
                          <Label>Autorización de datos personales</Label>
                          {documentosBase.autorizacionDatos ? (
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
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBaseDocument('autorizacionDatos')}
                                  className="text-destructive hover:text-destructive"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id="upload-autorizacionDatos"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleBaseDocumentUpload('autorizacionDatos', e)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('upload-autorizacionDatos')?.click()}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Cargar Autorización
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* OTRAS CATEGORÍAS - Documentos múltiples */}
                    {categorias.map((categoria) => (
                      <AccordionItem key={categoria.id} value={categoria.id}>
                        <AccordionTrigger className="text-sm font-semibold">
                          {categoria.nombre}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Puedes subir múltiples documentos a esta categoría
                            </p>
                            <div>
                              <input
                                type="file"
                                id={`upload-${categoria.id}`}
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleFileUpload(categoria.id, e)}
                              />
                              <Button
                                size="sm"
                                onClick={() => document.getElementById(`upload-${categoria.id}`)?.click()}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Subir Documento
                              </Button>
                            </div>
                          </div>

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
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" title="Descargar">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteDocument(categoria.id, doc.id)}
                                      className="text-destructive hover:text-destructive"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
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
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={etapaAnterior}
              disabled={etapaActual === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            {etapaActual < ETAPAS.length ? (
              <Button
                onClick={siguienteEtapa}
                disabled={!puedeAvanzar}
                className="gap-2"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={guardarTodo}
                className="gap-2 bg-success hover:bg-success/90"
              >
                <Save className="h-4 w-4" />
                {isEditMode ? 'Actualizar Colaborador' : 'Crear Colaborador'}
              </Button>
            )}
          </div>
        </div>

        {/* Columna derecha: Resumen (1/3) */}
        <div className="lg:col-span-1">
          <Card className="border-border sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Información Personal</p>
                  <p className="font-medium">
                    {formData.nombres || '-'} {formData.apellidos || '-'}
                  </p>
                </div>

                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Identificación</p>
                  <p className="font-medium">{formData.numeroDocumento || '-'}</p>
                  <p className="text-xs text-muted-foreground">{formData.tipoDocumento}</p>
                </div>

                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Cargo</p>
                  <p className="font-medium">{formData.cargo || '-'}</p>
                  <p className="text-xs text-muted-foreground">{formData.modalidadPago}</p>
                </div>

                <div className="pb-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Salario Base</p>
                  <p className="font-medium">
                    {formData.salarioBase > 0
                      ? `$${formData.salarioBase.toLocaleString('es-CO')}`
                      : '-'}
                  </p>
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
                  <p className="text-xs">Tipo: {formData.tipoCuenta}</p>
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