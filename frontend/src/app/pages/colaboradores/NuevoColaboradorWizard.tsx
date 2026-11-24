import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router';

import { formatFecha } from '../../utils/fecha';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
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
  Phone,
  Eye,
} from 'lucide-react';
import {
  colaboradoresApi,
  buildAvatarUrl,
  TIPO_CONTRATO_COLABORADOR_LABEL,
  type CrearColaboradorPayload,
  type TipoContratoColaborador,
} from '../../../api/colaboradores';
import { fetchConToken } from '../../../api/request';
import { configuracionApi } from '../../../api/configuracion';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';

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
  aplicaSubsidioTransporte: boolean;
  fechaContratacion: string;
  /** PR-L9: va al contrato, no a la ficha. Lo exige la indemnización del art. 64. */
  tipoContrato: string;
  fechaFinPactada: string;
  fechaFinalizacion: string;
  // Detalle de finalización — se despliega cuando hay fechaFinalizacion.
  motivoFinalizacion: string;
  // Seguridad Social
  eps: string;
  arl: string;
  fondoPension: string;
  fondoCesantias: string;
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
  { numero: 1, nombre: 'Personal',       descripcion: 'Datos básicos y contacto', icon: Users },
  { numero: 2, nombre: 'Identificación', descripcion: 'Documentos',               icon: IdCard },
  { numero: 3, nombre: 'Contratación',   descripcion: 'Cargo y salario',          icon: Briefcase },
  { numero: 4, nombre: 'Seguridad',      descripcion: 'EPS, ARL, Pensión',        icon: Shield },
  { numero: 5, nombre: 'Dotación',       descripcion: 'Tallas',                   icon: Package },
  { numero: 6, nombre: 'Bancario',       descripcion: 'Cuenta bancaria',          icon: Building2 },
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
const tiposCuenta     = [
  { codigo: 'AHORROS', label: 'Ahorros' },
  { codigo: 'CORRIENTE', label: 'Corriente' },
];
const tallaCamisas    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallaPantalones = ['28', '30', '32', '34', '36', '38', '40', '42'];
const tallaCalzados   = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const FORM_INICIAL: FormData = {
  estado: true,
  primerApellido: '', segundoApellido: '', primerNombre: '', segundoNombre: '',
  tipoDocumento: 'CC', numeroDocumento: '', fechaExpedicion: '', fechaNacimiento: '', lugarExpedicion: '',
  cargo: '', predioAsignado: '', modalidadPago: 'FIJO', salarioBase: 0, aplicaSubsidioTransporte: false, fechaContratacion: '', tipoContrato: 'INDEFINIDO', fechaFinPactada: '', fechaFinalizacion: '', motivoFinalizacion: '',
  eps: '', arl: '', fondoPension: '', fondoCesantias: '', cajaCompensacion: '',
  tallaCamisa: '', tallaPantalon: '', tallaCalzado: '',
  banco: '', tipoCuenta: 'AHORROS', numeroCuenta: '',
  correo: '', telefono: '', direccion: '', municipio: '', departamento: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
};

// ─── Persistencia local del borrador ────────────────────────────────────────
// La funcionalidad de auto-restaurar borrador en modo creación está
// deshabilitada — confundía al usuario porque al abrir "Nuevo Colaborador"
// aparecían datos de sesiones anteriores. Solo mantenemos `limpiarBorrador`
// para purgar cualquier residuo de versiones previas que sí guardaban.
const DRAFT_KEY = 'palmapp_borrador_colaborador';
const DRAFT_STEP_KEY = 'palmapp_borrador_colaborador_etapa';

function limpiarBorrador() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_STEP_KEY);
  } catch { /* ignorar */ }
}

// ─── Componente ─────────────────────────────────────────────────────────────────
/**
 * Interruptor de la sección "Finalización de Contrato" de la etapa 3.
 *
 * Apagada: la terminación se registra desde Novedades, que es donde queda el
 * histórico, el motivo y el soporte para firma. Dejarla también aquí abría dos
 * caminos para el mismo dato y uno de los dos no alimentaba el histórico.
 *
 * El formulario, el estado y el envío siguen completos: poner `true` la vuelve
 * a mostrar sin tocar nada más.
 */
const MOSTRAR_FINALIZACION: boolean = false;

export default function NuevoColaboradorWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const ETAPAS = isEditMode ? [...ETAPAS_BASE, ETAPA_DOCUMENTOS] : ETAPAS_BASE;

  // En modo creación arrancamos siempre con el form vacío en la etapa 1.
  // Si quedó algún borrador de una sesión anterior lo descartamos, así el
  // usuario no se confunde al abrir "Nuevo Colaborador" y ver datos viejos.
  const [etapaActual, setEtapaActual] = useState(1);
  const [formData, setFormData] = useState<FormData>(FORM_INICIAL);
  const [borradorRestaurado] = useState(false);
  const [predios, setPredios] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoColaborador, setCargandoColaborador] = useState<boolean>(isEditMode);

  // Bloquear scroll global mientras el overlay esté visible.
  useEffect(() => {
    if (!cargandoColaborador) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [cargandoColaborador]);

  // ── Paramétricas desde API ───────────────────────────────────────────────
  const [epsOpciones,       setEpsOpciones]       = useState<string[]>([]);
  const [arlOpciones,       setArlOpciones]       = useState<string[]>([]);
  const [pensionOpciones,   setPensionOpciones]   = useState<string[]>([]);
  const [cesantiasOpciones, setCesantiasOpciones] = useState<string[]>([]);
  const [bancariasOpciones, setBancariasOpciones] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<{codigo:string;nombre:string}[]>([]);
  const [municipios, setMunicipios] = useState<{codigo:string;nombre:string}[]>([]);
  const [deptoSel, setDeptoSel] = useState('');

  // SMLV vigente del tenant — usado para pre-llenar el campo Salario Base
  // en modo creación. Fuente: §14 Constantes Legales (`salario_minimo_vigente`).
  const [smmlv, setSmmlv] = useState<number | null>(null);
  // Bandera para asegurar que el auto-fill del SMLV solo aplica UNA vez,
  // así no pisa lo que el usuario tipea después.
  const [smlvAplicado, setSmlvAplicado] = useState(false);

  useEffect(() => {
    configuracionApi.constantesLegales
      .obtener()
      .then((res) => {
        const v = Number(res.data.salario_minimo_vigente);
        if (Number.isFinite(v) && v > 0) setSmmlv(v);
      })
      .catch(() => { /* silencioso */ });
  }, []);

  // Aplica el SMLV al `salarioBase` cuando ya cargó la constante y todavía
  // está en 0. Corre como efecto separado para que no haya race con
  // wizardInit (que también puede tocar formData).
  // Salta el pre-llenado si la modalidad es VARIABLE — ese caso el salario
  // es opcional y debe quedar vacío hasta que el usuario lo digite.
  useEffect(() => {
    if (isEditMode || smmlv == null || smlvAplicado) return;
    setFormData((prev) => {
      if (prev.modalidadPago === 'VARIABLE') return prev;
      return prev.salarioBase > 0 ? prev : { ...prev, salarioBase: smmlv };
    });
    setSmlvAplicado(true);
  }, [smmlv, isEditMode, smlvAplicado]);

  // Documentos (solo edición)
  const [documentos, setDocumentos] = useState<any[]>([]);
  // Fecha de retiro que llegó del backend al hidratar (edición). Distingue
  // una finalización NUEVA (motivo + soporte obligatorios) de re-guardar un
  // colaborador que ya tenía la finalización registrada con su soporte en el
  // expediente (no se exige re-adjuntar el PDF).
  const fechaRetiroOriginalRef = useRef<string>('');
  const motivoRetiroOriginalRef = useRef<string>('');
  // Soporte documental de finalización de contrato (§4). Se guarda el File
  // y al guardar viaja como `soporte_finalizacion` en multipart POST+_method=PUT.
  const [soporteFinalizacion, setSoporteFinalizacion] = useState<{
    file: File;
    nombre: string;
    fecha: string;
    tamaño: string;
  } | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // ── Foto del Colaborador (avatar) ────────────────────────────────────────
  // Local: preview del archivo elegido (dataURL) + el File pendiente de subir.
  // Remoto: avatar_url del servidor (cuando ya existe).
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [avatarUrlRemoto, setAvatarUrlRemoto] = useState<string | null>(null);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  // Municipio en espera (solo en modo edición): se aplica una vez los
  // municipios del departamento estén cargados, porque el desplegable no
  // muestra un valor que todavía no esta en su lista.
  const [pendingMunicipio, setPendingMunicipio] = useState<string | null>(null);

  // Catálogo de categorías de documentos (cargado desde la API)
  type CatDoc = {
    label: string;
    unico_por_tipo: boolean;
    permite_tipo_personalizado?: boolean;
    tipos: Record<string, string>;
  };
  const [categoriasDocs, setCategoriasDocs] = useState<Record<string, CatDoc> | null>(null);


  // ── Bundle wizard-init: 1 sola petición reemplaza 5 fetches ────────────────
  // Stale-while-revalidate: pinta desde sessionStorage al instante y revalida
  // en background. La caché vive hasta cerrar la pestaña.
  useEffect(() => {
    // 1) Pintar al instante desde la caché de sesión (si existe)
    try {
      const rawPredios = sessionStorage.getItem('cache_predios');
      if (rawPredios) setPredios(JSON.parse(rawPredios));
      const rawCats = sessionStorage.getItem('cache_categorias_docs');
      if (rawCats) setCategoriasDocs(JSON.parse(rawCats));
      const rawEps = sessionStorage.getItem('cache_eps');
      if (rawEps) setEpsOpciones(JSON.parse(rawEps));
      const rawArl = sessionStorage.getItem('cache_arl');
      if (rawArl) setArlOpciones(JSON.parse(rawArl));
      const rawPension = sessionStorage.getItem('cache_pension');
      if (rawPension) setPensionOpciones(JSON.parse(rawPension));
      const rawCesantias = sessionStorage.getItem('cache_cesantias');
      if (rawCesantias) setCesantiasOpciones(JSON.parse(rawCesantias));
      const rawBancos = sessionStorage.getItem('cache_bancos');
      if (rawBancos) setBancariasOpciones(JSON.parse(rawBancos));
      const rawDeptos = sessionStorage.getItem('cache_departamentos');
      if (rawDeptos) setDepartamentos(JSON.parse(rawDeptos));
    } catch { /* ignorar */ }

    // Helpers para hidratar el form en modo edición
    const toDateInput = (v: any): string => {
      if (!v) return '';
      const s = String(v);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    };
    const toNumber = (v: any): number => {
      if (v === null || v === undefined || v === '') return 0;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : 0;
    };

    // 2) Bundle init contra el servidor (1 sola request)
    if (isEditMode) setCargandoColaborador(true);
    let cancelled = false;
    colaboradoresApi.wizardInit(isEditMode && id ? id : undefined)
      .then(({ data }) => {
        if (cancelled) return;
        const { colaborador, parametricas } = data;

        // Paramétricas → estado + caché
        const epsList       = (parametricas.eps                 ?? []).map(e => e.nombre);
        const arlList       = (parametricas.arl                 ?? []).map(e => e.nombre);
        const pensionList   = (parametricas.fondos_pension      ?? []).map(e => e.nombre);
        const cesantiasList = (parametricas.fondos_cesantias    ?? []).map(e => e.nombre);
        const bancosList    = (parametricas.entidades_bancarias ?? []).map(e => e.nombre);

        setPredios((parametricas.predios ?? []) as any[]);
        setEpsOpciones(epsList);
        setArlOpciones(arlList);
        setPensionOpciones(pensionList);
        setCesantiasOpciones(cesantiasList);
        setBancariasOpciones(bancosList);
        setDepartamentos(parametricas.departamentos ?? []);
        setCategoriasDocs(parametricas.documento_categorias as unknown as Record<string, CatDoc>);

        try {
          sessionStorage.setItem('cache_predios',         JSON.stringify(parametricas.predios ?? []));
          sessionStorage.setItem('cache_eps',             JSON.stringify(epsList));
          sessionStorage.setItem('cache_arl',             JSON.stringify(arlList));
          sessionStorage.setItem('cache_pension',         JSON.stringify(pensionList));
          sessionStorage.setItem('cache_cesantias',       JSON.stringify(cesantiasList));
          sessionStorage.setItem('cache_bancos',          JSON.stringify(bancosList));
          sessionStorage.setItem('cache_departamentos',   JSON.stringify(parametricas.departamentos ?? []));
          sessionStorage.setItem('cache_categorias_docs', JSON.stringify(parametricas.documento_categorias ?? {}));
        } catch { /* cuota llena */ }

        // 3) Hidratar form si es edición
        if (colaborador && isEditMode) {
          const d = colaborador;
          if (d.avatar_url) {
            const fullUrl = buildAvatarUrl(d.avatar_url);
            setAvatarUrlRemoto(fullUrl);
            setImagePreview(fullUrl);
          }
          const predioId = d.predio?.id ?? null;
          // Motivos guardados por versiones viejas del wizard como clave
          // interna → texto legible actual, para que el Select los muestre.
          const MOTIVOS_LEGACY: Record<string, string> = {
            renuncia: 'Renuncia voluntaria',
            despido_justa: 'Despido con justa causa',
            despido_sin_justa: 'Despido sin justa causa',
            mutuo_acuerdo: 'Mutuo acuerdo',
            vencimiento: 'Vencimiento de contrato',
            abandono: 'Abandono de cargo',
            otro: 'Otro',
          };
          const motivoGuardado = d.motivo_retiro ?? '';
          fechaRetiroOriginalRef.current = toDateInput(d.fecha_retiro);
          motivoRetiroOriginalRef.current = MOTIVOS_LEGACY[motivoGuardado] ?? motivoGuardado;
          const modalidadPagoForm =
            d.modalidad_pago === 'PRODUCCION' ? 'VARIABLE' :
            (d.modalidad_pago ?? 'FIJO');

          setFormData({
            estado: d.estado ?? true,
            primerApellido: d.primer_apellido ?? '',
            segundoApellido: d.segundo_apellido ?? '',
            primerNombre: d.primer_nombre ?? '',
            segundoNombre: d.segundo_nombre ?? '',
            tipoDocumento: d.tipo_documento ?? 'CC',
            numeroDocumento: d.documento ?? '',
            fechaExpedicion: toDateInput(d.fecha_expedicion_documento),
            fechaNacimiento: toDateInput(d.fecha_nacimiento),
            lugarExpedicion: d.lugar_expedicion ?? '',
            cargo: d.cargo ?? '',
            predioAsignado: predioId ? String(predioId) : '',
            modalidadPago: modalidadPagoForm,
            salarioBase: toNumber(d.salario_base),
            // §3 API_COLABORADORES — `subsidio_transporte` boolean, default true.
            aplicaSubsidioTransporte: d.subsidio_transporte != null
              ? !!d.subsidio_transporte
              : true,
            fechaContratacion: toDateInput(d.fecha_ingreso),
            tipoContrato: d.contrato_vigente?.tipo_contrato ?? 'INDEFINIDO',
            fechaFinPactada: toDateInput(d.contrato_vigente?.fecha_fin_pactada ?? null),
            fechaFinalizacion: toDateInput(d.fecha_retiro),
            motivoFinalizacion: MOTIVOS_LEGACY[motivoGuardado] ?? motivoGuardado,
            eps: d.eps ?? '',
            arl: d.arl ?? '',
            fondoPension: d.fondo_pension ?? '',
            fondoCesantias: d.fondo_cesantias ?? '',
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
            // Municipio se aplica recién cuando municipios estén cargados (ver pendingMunicipio)
            municipio: '',
            departamento: d.departamento ?? '',
            contactoEmergenciaNombre: d.contacto_emergencia_nombre ?? '',
            contactoEmergenciaTelefono: d.contacto_emergencia_telefono ?? '',
          });
          if (d.municipio) setPendingMunicipio(d.municipio);
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(isEditMode
          ? 'Error al cargar datos del colaborador'
          : 'Error al cargar el formulario');
      })
      .finally(() => {
        if (!cancelled) setCargandoColaborador(false);
      });

    return () => { cancelled = true; };
  }, [id, isEditMode]);

  // Cargar municipios cuando cambia departamento (con caché por departamento)
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); return; }
    const cacheKey = `cache_municipios_${deptoSel}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) setMunicipios(JSON.parse(raw));
    } catch { /* ignorar */ }
    const token = localStorage.getItem('palmapp_token');
    fetchConToken(`/api/v1/auth/departamentos/${deptoSel}/municipios`, token)
      .then(r => r.json())
      .then(d => {
        const lista = d.data ?? [];
        setMunicipios(lista);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(lista)); } catch { /* */ }
      })
      .catch(() => {});
  }, [deptoSel]);

  // Cuando ya tenemos la lista de departamentos Y los datos cargados,
  // hacer match por nombre → código y disparar la carga de municipios.
  useEffect(() => {
    if (!isEditMode) return;
    if (!formData.departamento || departamentos.length === 0) return;
    if (deptoSel) return; // ya seteado
    const match = departamentos.find(
      d => d.nombre.toLowerCase() === formData.departamento.toLowerCase()
    );
    if (match) setDeptoSel(match.codigo);
  }, [isEditMode, formData.departamento, departamentos, deptoSel]);

  // Cuando los municipios del departamento ya cargaron, aplicar el municipio pendiente.
  useEffect(() => {
    if (!isEditMode || !pendingMunicipio) return;
    if (municipios.length === 0) return;
    const match = municipios.find(
      m => m.nombre.toLowerCase() === pendingMunicipio.toLowerCase()
    );
    if (match) {
      setFormData(prev => ({ ...prev, municipio: match.nombre }));
      setPendingMunicipio(null);
    }
  }, [isEditMode, pendingMunicipio, municipios]);

  // Cargar documentos al llegar al paso 7
  useEffect(() => {
    if (!isEditMode || !id || etapaActual !== 7) return;
    setLoadingDocs(true);
    colaboradoresApi.getDocumentos(Number(id))
      .then(r => setDocumentos(r.data ?? []))
      .catch(() => toast.error('Error al cargar documentos'))
      .finally(() => setLoadingDocs(false));
  }, [id, isEditMode, etapaActual]);

  // Limpieza one-shot del borrador residual al entrar en modo creación.
  // (La funcionalidad de auto-restauración fue deshabilitada por confundir
  // al usuario cuando abría "Nuevo Colaborador" y veía datos viejos.)
  useEffect(() => {
    if (!isEditMode) limpiarBorrador();
  }, [isEditMode]);

  // Aviso al usuario cuando se restaura un borrador previo
  useEffect(() => {
    if (borradorRestaurado && !isEditMode) {
      toast.info('Borrador restaurado. Puedes continuar donde lo dejaste.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /**
   * Devuelve la lista de campos obligatorios que faltan en la etapa indicada.
   * Si está vacía, la etapa es válida.
   */
  const camposFaltantes = (etapa: number): string[] => {
    const faltan: string[] = [];
    if (etapa === 1) {
      if (!formData.primerNombre.trim())   faltan.push('Primer nombre');
      if (!formData.primerApellido.trim()) faltan.push('Primer apellido');
    } else if (etapa === 2) {
      if (!formData.numeroDocumento.trim()) faltan.push('Número de documento');
      if (!formData.fechaExpedicion)        faltan.push('Fecha de expedición');
      if (!formData.fechaNacimiento)        faltan.push('Fecha de nacimiento');
    } else if (etapa === 3) {
      if (!formData.cargo.trim())                                              faltan.push('Cargo');
      if (formData.modalidadPago !== 'VARIABLE' && formData.salarioBase <= 0)  faltan.push('Salario base');
      if (!formData.fechaContratacion)                                         faltan.push('Fecha de ingreso');
    }
    return faltan;
  };

  /** Muestra toast con la lista de campos faltantes en la etapa actual. */
  const avisarFaltantes = (etapa: number): boolean => {
    const faltan = camposFaltantes(etapa);
    if (faltan.length === 0) return true;
    toast.error(
      faltan.length === 1
        ? `Falta completar: ${faltan[0]}`
        : `Faltan campos obligatorios: ${faltan.join(', ')}`,
    );
    return false;
  };

  const puedeAvanzar = validarEtapa(etapaActual);

  const siguienteEtapa = () => {
    if (etapaActual >= ETAPAS.length) return;
    // En modo edición no bloqueamos el avance — los campos pueden venir
    // parcialmente vacíos del backend. Solo validamos al crear.
    if (!isEditMode && !avisarFaltantes(etapaActual)) return;
    setEtapaActual(e => e + 1);
  };

  const etapaAnterior  = () => etapaActual > 1 && setEtapaActual(e => e - 1);

  const irAEtapa = (n: number) => {
    if (n === etapaActual) return;
    // Moverse hacia atrás siempre se permite
    if (n < etapaActual) { setEtapaActual(n); return; }
    // En modo edición se puede saltar a cualquier etapa
    if (isEditMode) { setEtapaActual(n); return; }
    // En creación, validar todas las etapas desde la actual hasta la objetivo
    for (let e = etapaActual; e < n; e++) {
      if (!avisarFaltantes(e)) {
        if (e !== etapaActual) setEtapaActual(e);
        return;
      }
    }
    setEtapaActual(n);
  };

  // ─── Documentos ────────────────────────────────────────────────────────────
  // ─── Avatar / Foto del Colaborador ─────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación cliente
    const okMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase());
    if (!okMime) { toast.error('Formato inválido. Usa JPG, PNG, GIF o WebP.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('La foto no puede superar los 2 MB'); return; }

    // Preview inmediato
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setAvatarFile(file);

    // Si estamos editando, subir avatar al servidor inmediatamente
    if (isEditMode && id) {
      setSubiendoAvatar(true);
      try {
        const fd = new FormData();
        fd.append('avatar', file);
        const res = await colaboradoresApi.subirAvatar(Number(id), fd);
        const newUrl = buildAvatarUrl(res.data?.avatar_url ?? null);
        setAvatarUrlRemoto(newUrl);
        if (newUrl) setImagePreview(newUrl);
        toast.success(res.message ?? 'Foto actualizada');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al subir la foto');
      } finally {
        setSubiendoAvatar(false);
      }
    }
    // En modo creación: el avatar se sube DESPUÉS del POST de colaborador (ver guardarTodo)
  };

  const handleRemoveImage = async () => {
    setImagePreview(null);
    setAvatarFile(null);
    if (isEditMode && id && avatarUrlRemoto) {
      try {
        await colaboradoresApi.eliminarAvatar(Number(id));
        setAvatarUrlRemoto(null);
        toast.success('Foto eliminada');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar la foto');
      }
    }
  };

  /**
   * Subida directa: file picker → sube de inmediato.
   * Para categorías con `permite_tipo_personalizado` (PERMISOS_LICENCIAS, OTROS)
   * sin tipo fijo, se manda la `categoria` como `tipo_documento` por default.
   */
  const handleSubirDocumento = async (categoria: string, tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB');
      e.target.value = '';
      return;
    }
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

  // Estado para confirmación de eliminación de documento (AlertDialog)
  const [docAEliminar, setDocAEliminar] = useState<{ id: number; nombre: string } | null>(null);

  const confirmarEliminarDocumento = async () => {
    if (!id || !docAEliminar) return;
    const docId = docAEliminar.id;
    try {
      const res = await colaboradoresApi.eliminarDocumento(Number(id), docId);
      toast.success(res.message ?? 'Documento eliminado');
      setDocumentos(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDocAEliminar(null);
    }
  };

  const handleEliminarDocumento = (docId: number, nombre?: string) => {
    setDocAEliminar({ id: docId, nombre: nombre ?? 'este documento' });
  };

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

  const visualizarDocumento = async (doc: any) => {
    if (!id) return;
    // IMPORTANTE: abrir la pestaña síncronamente al click para evitar el bloqueo
    // de popups del navegador (sólo permiten window.open dentro del handler del click).
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Tu navegador bloqueó la nueva pestaña. Permite popups para esta página.');
      return;
    }
    // Loader mínimo mientras se baja el blob
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

  // ─── Guardar ────────────────────────────────────────────────────────────────
  const guardarTodo = async () => {
    // Validaciones solo aplican al CREAR
    if (!isEditMode) {
      if (!formData.primerNombre.trim())    { toast.error('El primer nombre es obligatorio');   setEtapaActual(1); return; }
      if (!formData.primerApellido.trim())  { toast.error('El primer apellido es obligatorio'); setEtapaActual(1); return; }
      if (!formData.numeroDocumento.trim()) { toast.error('El número de documento es obligatorio'); setEtapaActual(2); return; }
      if (!formData.fechaNacimiento)        { toast.error('La fecha de nacimiento es obligatoria'); setEtapaActual(2); return; }
      if (!formData.fechaExpedicion)        { toast.error('La fecha de expedición es obligatoria'); setEtapaActual(2); return; }
      if (!formData.cargo.trim())           { toast.error('El cargo es obligatorio');           setEtapaActual(4); return; }
      if (formData.modalidadPago === 'FIJO' && formData.salarioBase <= 0) { toast.error('El salario base debe ser mayor a 0 para modalidad Fijo'); setEtapaActual(3); return; }
      if (!formData.fechaContratacion)      { toast.error('La fecha de ingreso es obligatoria'); setEtapaActual(4); return; }
    }

    // Finalización de contrato (§4 API_COLABORADORES): con fecha de
    // finalización el motivo es obligatorio. El soporte PDF NO lo es, ni para
    // el backend ni aquí: la carta de renuncia o el acta suelen llegar días
    // después, y exigirla impedía registrar el retiro el día que ocurre. Se
    // puede adjuntar luego desde el expediente del colaborador.
    if (formData.fechaFinalizacion && !formData.motivoFinalizacion) {
      toast.error('Registra el motivo de la finalización de contrato');
      setEtapaActual(3);
      return;
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
      // Para modalidad VARIABLE el salario es opcional, pero si el usuario
      // lo ingresó lo enviamos tal cual (no forzar 0). Para FIJO siempre
      // se exige > 0 en la validación previa.
      body.salario_base               = formData.salarioBase > 0 ? formData.salarioBase : 0;
      body.modalidad_pago             = formData.modalidadPago === 'VARIABLE' ? 'PRODUCCION' : formData.modalidadPago;
      body.fecha_ingreso              = formData.fechaContratacion;
      body.subsidio_transporte        = formData.aplicaSubsidioTransporte;
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
      // Subsidio: en edición lo mandamos siempre (es booleano, no string vacío).
      body.subsidio_transporte             = formData.aplicaSubsidioTransporte;
      body.estado = formData.estado;
    }

    if (formData.tipoContrato) {
      body.tipo_contrato = formData.tipoContrato as TipoContratoColaborador;
      // Solo el término fijo lleva fecha pactada; el backend la limpia en los demás.
      if (formData.tipoContrato === 'TERMINO_FIJO' && formData.fechaFinPactada) {
        body.fecha_fin_pactada = formData.fechaFinPactada;
      }
    }

    if (formData.segundoNombre.trim())             body.segundo_nombre               = formData.segundoNombre.trim();
    if (formData.segundoApellido.trim())           body.segundo_apellido             = formData.segundoApellido.trim();
    if (formData.lugarExpedicion.trim())           body.lugar_expedicion             = formData.lugarExpedicion.trim();
    if (formData.predioAsignado)                   body.predio_id                    = Number(formData.predioAsignado);
    if (formData.fechaFinalizacion) {
      body.fecha_retiro = formData.fechaFinalizacion;
      if (formData.motivoFinalizacion) body.motivo_retiro = formData.motivoFinalizacion;
    } else if (isEditMode && fechaRetiroOriginalRef.current) {
      // §4 — El colaborador TENÍA fecha guardada y el usuario la borró:
      // hay que enviar `null` explícito para limpiarla (reingreso). Omitir
      // el campo hacía que el backend conservara la fecha vieja en silencio.
      body.fecha_retiro = null;
    }
    if (formData.eps.trim())                       body.eps                          = formData.eps.trim();
    if (formData.arl.trim())                       body.arl                          = formData.arl.trim();
    if (formData.fondoPension.trim())              body.fondo_pension                = formData.fondoPension.trim();
    if (formData.fondoCesantias.trim())            body.fondo_cesantias              = formData.fondoCesantias.trim();
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
      let colaboradorId: number | null = null;
      if (isEditMode && id) {
        // §4 — Con soporte de finalización adjunto, PHP solo procesa archivos
        // en POST: se envía multipart con `_method=PUT` y Laravel lo enruta
        // al mismo endpoint de edición. Sin archivo, PUT JSON de siempre.
        if (soporteFinalizacion?.file && formData.fechaFinalizacion) {
          const fd = new FormData();
          fd.append('_method', 'PUT');
          for (const [k, v] of Object.entries(body)) {
            if (v === undefined || v === null) continue;
            // Booleanos como "1"/"0" (contrato multipart del doc §4).
            fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
          }
          fd.append('soporte_finalizacion', soporteFinalizacion.file);
          const res = await colaboradoresApi.editarConSoporte(Number(id), fd);
          toast.success(res.message ?? 'Colaborador actualizado correctamente');
          if (res.documento_finalizacion) {
            toast.success('Soporte de finalización guardado en el expediente');
          }
        } else {
          const res = await colaboradoresApi.editar(Number(id), body);
          toast.success(res.message ?? 'Colaborador actualizado correctamente');
        }
        // Sincronizar la referencia con lo que quedó guardado: si el usuario
        // sigue en el wizard y vuelve a guardar sin tocar la finalización,
        // no se le exige re-adjuntar el soporte.
        fechaRetiroOriginalRef.current = formData.fechaFinalizacion;
        motivoRetiroOriginalRef.current = formData.fechaFinalizacion ? formData.motivoFinalizacion : '';
        colaboradorId = Number(id);
      } else {
        const res = await colaboradoresApi.crear(body as unknown as CrearColaboradorPayload);
        toast.success(res.message ?? 'Colaborador creado correctamente');
        colaboradorId = res.data?.id ?? null;
        // Colaborador creado: ya no necesitamos el borrador local
        limpiarBorrador();
      }
      // En modo creación: subir el avatar después del POST si el usuario eligió uno
      if (!isEditMode && colaboradorId && avatarFile) {
        try {
          const fd = new FormData();
          fd.append('avatar', avatarFile);
          await colaboradoresApi.subirAvatar(colaboradorId, fd);
        } catch (err) {
          console.warn('No se pudo subir la foto:', err);
        }
      }
      navigate('/colaboradores');
    } catch (err) {
      const e = err as { status?: number; message?: string };
      // 413 / PostTooLargeException: el límite de PHP en el servidor
      // (post_max_size) es menor al archivo enviado. El tope real lo
      // define el servidor, no este formulario.
      if (e?.status === 413 || (e?.message ?? '').includes('POST data is too large')) {
        toast.error(
          'El archivo supera el límite del servidor. Intenta con un PDF más liviano o pide al administrador ampliar el límite de subida.',
          { duration: 8000 },
        );
      } else {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    } finally {
      setGuardando(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-6">
      {/* Overlay de carga (solo edición) — montado en <body> vía portal para
          que ignore cualquier transform/contexto de stacking de los padres. */}
      {cargandoColaborador && createPortal(
        <div
          className="flex items-center justify-center bg-background"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
          }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-6 py-4 shadow-md">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Cargando datos del colaborador...</span>
          </div>
        </div>,
        document.body,
      )}

      <PageHeader
        backTo="/colaboradores"
        eyebrow="Colaboradores"
        title={isEditMode ? 'Editar colaborador' : 'Nuevo colaborador'}
        description="Complete la información paso a paso."
        actions={!isEditMode && borradorRestaurado ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              limpiarBorrador();
              setFormData(FORM_INICIAL);
              setEtapaActual(1);
              toast.success('Borrador descartado');
            }}
          >
            Descartar borrador
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Wizard */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Stepper horizontal */}
          <Card>
            <CardContent className="px-4 py-4 sm:px-6">
              <ol className="flex items-center">
                {ETAPAS.map((etapa, index) => {
                  const estaCompleta = etapaActual > etapa.numero;
                  const estaActiva   = etapaActual === etapa.numero;
                  const habilitada   = isEditMode || estaActiva || estaCompleta;
                  return (
                    <li
                      key={etapa.numero}
                      className={`flex items-center ${index < ETAPAS.length - 1 ? 'flex-1' : ''}`}
                    >
                      <button
                        type="button"
                        aria-label={`Ir al paso ${etapa.numero}: ${etapa.nombre}`}
                        aria-current={estaActiva ? 'step' : undefined}
                        onClick={() => irAEtapa(etapa.numero)}
                        className={`flex shrink-0 flex-col items-center gap-2 ${
                          habilitada ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                        disabled={!habilitada}
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                            estaCompleta
                              ? 'border-primary bg-primary text-primary-foreground'
                              : estaActiva
                              ? 'border-primary bg-primary-soft text-primary'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          {estaCompleta ? <Check className="h-5 w-5" strokeWidth={2.5} /> : etapa.numero}
                        </div>
                        <div className={`text-center ${estaActiva ? '' : 'hidden sm:block'}`}>
                          <div
                            className={`text-[13px] font-semibold whitespace-nowrap ${
                              estaActiva || estaCompleta ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {etapa.nombre}
                          </div>
                        </div>
                      </button>

                      {/* Línea conectora */}
                      {index < ETAPAS.length - 1 && (
                        <div className="relative mx-2 h-0.5 flex-1 bg-border sm:-mt-6 sm:mx-4">
                          <div
                            className={`absolute inset-0 bg-primary transition-[width] ${
                              estaCompleta ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {/* ── ETAPA 1: INFORMACIÓN PERSONAL + CONTACTO ── */}
          {etapaActual === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Información personal</CardTitle>
                <CardDescription>Datos básicos y contacto del colaborador.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Foto del colaborador */}
                <div className="space-y-2">
                  <Label>Foto del colaborador</Label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Vista previa"
                          className="w-24 h-24 rounded-full object-cover border-2 border-border"
                        />
                        <button aria-label="Eliminar"
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border border-dashed border-border">
                        {subiendoAvatar
                          ? <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                          : <Upload className="h-8 w-8 text-muted-foreground" />}
                      </div>
                    )}
                    <div>
                      <input
                        aria-label="Seleccionar archivo"
                        type="file"
                        id="foto"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('foto')?.click()}
                        disabled={subiendoAvatar}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {subiendoAvatar ? 'Subiendo...' : 'Cargar Imagen'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, GIF o WebP (máx. 2 MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nombres y apellidos */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primerApellido">Primer apellido <span className="text-destructive">*</span></Label>
                    <Input id="primerApellido" placeholder="Ej: Rodríguez" value={formData.primerApellido} onChange={e => handleInputChange('primerApellido', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoApellido">Segundo apellido</Label>
                    <Input id="segundoApellido" placeholder="Ej: García" value={formData.segundoApellido} onChange={e => handleInputChange('segundoApellido', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primerNombre">Primer nombre <span className="text-destructive">*</span></Label>
                    <Input id="primerNombre" placeholder="Ej: Juan" value={formData.primerNombre} onChange={e => handleInputChange('primerNombre', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoNombre">Segundo nombre</Label>
                    <Input id="segundoNombre" placeholder="Ej: Carlos" value={formData.segundoNombre} onChange={e => handleInputChange('segundoNombre', e.target.value)} />
                  </div>
                </div>

                {/* ── Contacto ── */}
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Datos de contacto</p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-correo-electronico">Correo electrónico</Label>
                      <Input id="nuevocolab-correo-electronico" type="email" placeholder="juan@email.com" value={formData.correo} onChange={e => handleInputChange('correo', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-telefono">Teléfono</Label>
                      <Input id="nuevocolab-telefono" placeholder="3001234567" value={formData.telefono} onChange={e => handleInputChange('telefono', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevocolab-direccion">Dirección</Label>
                    <Input id="nuevocolab-direccion" placeholder="Calle 45 #12-30" value={formData.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-departamento">Departamento</Label>
                      <Select
                        value={deptoSel}
                        onValueChange={codigo => {
                          setDeptoSel(codigo);
                          const nombre = departamentos.find(d => d.codigo === codigo)?.nombre ?? '';
                          handleInputChange('departamento', nombre);
                          handleInputChange('municipio', '');
                          setMunicipios([]);
                        }}
                      >
                        <SelectTrigger id="nuevocolab-departamento">
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {departamentos.map(d => (
                            <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-municipio">Municipio</Label>
                      <Select
                        value={formData.municipio}
                        onValueChange={valor => handleInputChange('municipio', valor)}
                        disabled={!deptoSel}
                      >
                        <SelectTrigger id="nuevocolab-municipio">
                          <SelectValue placeholder="Seleccionar municipio" />
                        </SelectTrigger>
                        <SelectContent>
                          {municipios.map(m => (
                            <SelectItem key={m.codigo} value={m.nombre}>{m.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* ── Contacto de emergencia ── */}
                <div className="border-t border-border pt-6 space-y-4">
                  <p className="text-sm font-semibold">Contacto de emergencia</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-nombre">Nombre</Label>
                      <Input id="nuevocolab-nombre" placeholder="Ej: María López" value={formData.contactoEmergenciaNombre} onChange={e => handleInputChange('contactoEmergenciaNombre', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nuevocolab-telefono-2">Teléfono</Label>
                      <Input id="nuevocolab-telefono-2" placeholder="3109876543" value={formData.contactoEmergenciaTelefono} onChange={e => handleInputChange('contactoEmergenciaTelefono', e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 2: IDENTIFICACIÓN ── */}
          {etapaActual === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Identificación</CardTitle>
                <CardDescription>Documentos de identidad.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-tipo-documento">Tipo de documento <span className="text-destructive">*</span></Label>
                  <Select value={formData.tipoDocumento} onValueChange={v => handleInputChange('tipoDocumento', v)}>
                    <SelectTrigger id="nuevocolab-tipo-documento"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-numero-documento">Número de documento <span className="text-destructive">*</span></Label>
                  <Input id="nuevocolab-numero-documento" placeholder="Ej: 1.234.567.890" value={formData.numeroDocumento} onChange={e => handleInputChange('numeroDocumento', e.target.value)} />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nuevocolab-fecha-expedicion">Fecha de expedición <span className="text-destructive">*</span></Label>
                    <Input id="nuevocolab-fecha-expedicion" type="date" value={formData.fechaExpedicion} onChange={e => handleInputChange('fechaExpedicion', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevocolab-fecha-nacimiento">Fecha de nacimiento <span className="text-destructive">*</span></Label>
                    <Input id="nuevocolab-fecha-nacimiento" type="date" value={formData.fechaNacimiento} onChange={e => handleInputChange('fechaNacimiento', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-lugar-de-expedicion">Lugar de expedición</Label>
                  <Input id="nuevocolab-lugar-de-expedicion" placeholder="Ej: Bucaramanga" value={formData.lugarExpedicion} onChange={e => handleInputChange('lugarExpedicion', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 3: CONTRATACIÓN ── */}
          {/* ── ETAPA 3: CONTRATACIÓN — diseño tomado de V.10 exactamente ──
              Cargo · Predio · Modalidad · Salario Base · grid 3-col
              (Subsidio Transporte | Fecha Contratación | Fecha Finalización).
              El Switch de "Estado del colaborador" se mantiene solo en modo
              edición como fila extra al final (V.10 no lo tiene porque no
              tiene conexión a backend; nosotros sí necesitamos editarlo). */}
          {etapaActual === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Contratación</CardTitle>
                <CardDescription>Cargo y compensación.</CardDescription>
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
                  <Label htmlFor="predioAsignado">Predio asignado</Label>
                  <Select
                    value={formData.predioAsignado || 'none'}
                    onValueChange={(v) => handleInputChange('predioAsignado', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="predioAsignado">
                      <SelectValue placeholder="Selecciona un predio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin predio asignado</SelectItem>
                      {predios.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modalidadPago">
                    Modalidad de pago <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.modalidadPago}
                    onValueChange={(v) => {
                      // Cambia la modalidad. Adicionalmente:
                      //  - VARIABLE → vacía el Salario Base (queda opcional).
                      //  - FIJO/otro → si estaba en 0, pre-rellena con el SMLV
                      //    (mismo comportamiento que el efecto inicial).
                      setFormData((prev) => ({
                        ...prev,
                        modalidadPago: v as typeof prev.modalidadPago,
                        salarioBase:
                          v === 'VARIABLE'
                            ? 0
                            : prev.salarioBase > 0
                              ? prev.salarioBase
                              : smmlv ?? 0,
                      }));
                    }}
                  >
                    <SelectTrigger id="modalidadPago">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modalidadesPago.map((m) => (
                        <SelectItem key={m.codigo} value={m.codigo}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salarioBase">
                    Salario base{' '}
                    {formData.modalidadPago === 'FIJO' && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                    <Input
                      id="salarioBase"
                      type="text"
                      inputMode="numeric"
                      placeholder={
                        formData.modalidadPago === 'VARIABLE'
                          ? 'Opcional'
                          : smmlv
                            ? smmlv.toLocaleString('es-CO')
                            : '1.300.000'
                      }
                      className="pl-7"
                      value={formData.salarioBase > 0 ? formData.salarioBase.toLocaleString('es-CO') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange('salarioBase', parseInt(raw) || 0);
                      }}
                    />
                  </div>
                </div>

                {/* Grid 2 columnas — Subsidio · Fecha Contratación. La Fecha
                    de Finalización pasa abajo a su propia sección con detalle. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aplicaSubsidioTransporte">Subsidio de transporte</Label>
                    <Select
                      value={formData.aplicaSubsidioTransporte ? 'si' : 'no'}
                      onValueChange={(v) =>
                        handleInputChange('aplicaSubsidioTransporte', (v === 'si') as any)
                      }
                    >
                      <SelectTrigger id="aplicaSubsidioTransporte">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaContratacion">
                      Fecha de contratación <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fechaContratacion"
                      type="date"
                      value={formData.fechaContratacion}
                      onChange={(e) => handleInputChange('fechaContratacion', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoContrato">Tipo de contrato</Label>
                    <Select
                      value={formData.tipoContrato}
                      onValueChange={(v) => {
                        handleInputChange('tipoContrato', v);
                        if (v !== 'TERMINO_FIJO') handleInputChange('fechaFinPactada', '');
                      }}
                    >
                      <SelectTrigger id="tipoContrato">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPO_CONTRATO_COLABORADOR_LABEL) as TipoContratoColaborador[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_CONTRATO_COLABORADOR_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define cuántos días de indemnización se pagan si el retiro es sin justa causa.
                    </p>
                  </div>

                  {formData.tipoContrato === 'TERMINO_FIJO' && (
                    <div className="space-y-2">
                      <Label htmlFor="fechaFinPactada">
                        Fecha de fin pactada <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fechaFinPactada"
                        type="date"
                        value={formData.fechaFinPactada}
                        onChange={(e) => handleInputChange('fechaFinPactada', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Sin ella no se puede calcular la indemnización de un contrato a término fijo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sección "Finalización de Contrato" — apagada. La terminación
                    se registra desde Novedades, que además deja el histórico y
                    el soporte firmado. Ver `MOSTRAR_FINALIZACION`. */}
                {MOSTRAR_FINALIZACION && (
                <div className="pt-5 mt-2 border-t border-border space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Finalización de contrato</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si el contrato se termina antes de la fecha pactada, registra la fecha, el motivo y adjunta el soporte.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaFinalizacion">Fecha de finalización</Label>
                    <Input
                      id="fechaFinalizacion"
                      type="date"
                      value={formData.fechaFinalizacion}
                      onChange={(e) => {
                        handleInputChange('fechaFinalizacion', e.target.value);
                        if (!e.target.value) {
                          handleInputChange('motivoFinalizacion', '');
                          setSoporteFinalizacion(null);
                        }
                      }}
                    />
                  </div>

                  {formData.fechaFinalizacion && (
                    <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive-soft p-4">
                      {/* Desaparece al elegir el motivo: dejarlo fijo hacía
                          que el bloque siguiera pareciendo un error ya
                          resuelto. */}
                      {!formData.motivoFinalizacion && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive-soft">
                            <span className="text-destructive text-xs font-bold">!</span>
                          </div>
                          <p className="text-xs text-destructive font-medium">
                            Para guardar con esta fecha de finalización debes registrar el motivo.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="motivoFinalizacion">
                          Motivo de finalización <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.motivoFinalizacion}
                          onValueChange={(v) => handleInputChange('motivoFinalizacion', v)}
                        >
                          <SelectTrigger id="motivoFinalizacion">
                            <SelectValue placeholder="Selecciona el motivo..." />
                          </SelectTrigger>
                          {/* §4 — El backend guarda el motivo tal cual (texto
                              libre) y lo reutiliza como observación del soporte
                              en el expediente. Por eso el value es el texto
                              legible, no una clave interna. */}
                          <SelectContent>
                            <SelectItem value="Renuncia voluntaria">Renuncia voluntaria</SelectItem>
                            <SelectItem value="Despido con justa causa">Despido con justa causa</SelectItem>
                            <SelectItem value="Despido sin justa causa">Despido sin justa causa</SelectItem>
                            <SelectItem value="Mutuo acuerdo">Mutuo acuerdo</SelectItem>
                            <SelectItem value="Vencimiento de contrato">Vencimiento de contrato</SelectItem>
                            <SelectItem value="Abandono de cargo">Abandono de cargo</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-baseline gap-2">
                          Soporte documental
                          <span className="text-xs font-normal text-muted-foreground">
                            opcional, se puede adjuntar después
                          </span>
                        </Label>
                        {soporteFinalizacion ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/40">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <FileText className="h-4 w-4" strokeWidth={2} />
                              </span>
                              <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-foreground">{soporteFinalizacion.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {soporteFinalizacion.fecha} · {soporteFinalizacion.tamaño}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSoporteFinalizacion(null)}
                              className="shrink-0 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                              title="Quitar"
                              aria-label="Quitar soporte documental"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <input
                              aria-label="Seleccionar archivo"
                              type="file"
                              id="upload-soporte-finalizacion"
                              className="hidden"
                              accept=".pdf,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // §4 — el backend solo acepta PDF, máx 10 MB.
                                if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                  toast.error('El soporte debe ser un archivo PDF');
                                  return;
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  toast.error('El archivo supera los 10 MB');
                                  return;
                                }
                                setSoporteFinalizacion({
                                  file,
                                  nombre: file.name,
                                  fecha: new Date().toISOString().split('T')[0],
                                  tamaño: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                                });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('upload-soporte-finalizacion')?.click()}
                              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-5 transition-colors hover:border-primary hover:bg-primary-soft"
                            >
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <div className="text-center">
                                <p className="text-sm font-medium text-foreground">Adjuntar soporte</p>
                                <p className="text-xs text-muted-foreground">Solo PDF (máx. 10 MB)</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 4: SEGURIDAD SOCIAL ── */}
          {etapaActual === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Seguridad social</CardTitle>
                <CardDescription>EPS, ARL y fondo de pensión.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-eps">EPS</Label>
                  <Select value={formData.eps} onValueChange={v => handleInputChange('eps', v)}>
                    <SelectTrigger id="nuevocolab-eps"><SelectValue placeholder="Selecciona una EPS" /></SelectTrigger>
                    {/* EPS: API + fallback legacy */}
                    <SelectContent>
                      {epsOpciones.length > 0 && !epsOpciones.includes(formData.eps) && formData.eps && <SelectItem value={formData.eps}>{formData.eps}</SelectItem>}
                      {epsOpciones.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-arl">ARL</Label>
                  <Select value={formData.arl} onValueChange={v => handleInputChange('arl', v)}>
                    <SelectTrigger id="nuevocolab-arl"><SelectValue placeholder="Selecciona una ARL" /></SelectTrigger>
                    {/* ARL: API + fallback legacy */}
                    <SelectContent>
                      {arlOpciones.length > 0 && !arlOpciones.includes(formData.arl) && formData.arl && <SelectItem value={formData.arl}>{formData.arl}</SelectItem>}
                      {arlOpciones.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-fondo-pension">Fondo de pensión</Label>
                  <Select value={formData.fondoPension} onValueChange={v => handleInputChange('fondoPension', v)}>
                    <SelectTrigger id="nuevocolab-fondo-pension"><SelectValue placeholder="Selecciona un fondo" /></SelectTrigger>
                    {/* Pensión: API + fallback legacy */}
                    <SelectContent>
                      {pensionOpciones.length > 0 && !pensionOpciones.includes(formData.fondoPension) && formData.fondoPension && <SelectItem value={formData.fondoPension}>{formData.fondoPension}</SelectItem>}
                      {pensionOpciones.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-fondo-cesantias">Fondo de cesantías</Label>
                  <Select value={formData.fondoCesantias} onValueChange={v => handleInputChange('fondoCesantias', v)}>
                    <SelectTrigger id="nuevocolab-fondo-cesantias"><SelectValue placeholder="Selecciona un fondo" /></SelectTrigger>
                    <SelectContent>
                      {cesantiasOpciones.length > 0 && !cesantiasOpciones.includes(formData.fondoCesantias) && formData.fondoCesantias && <SelectItem value={formData.fondoCesantias}>{formData.fondoCesantias}</SelectItem>}
                      {cesantiasOpciones.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-caja-de-compensacion">Caja de compensación</Label>
                  <Input id="nuevocolab-caja-de-compensacion" placeholder="Ej: Cafam" value={formData.cajaCompensacion} onChange={e => handleInputChange('cajaCompensacion', e.target.value)} />
                </div>

              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 5: DOTACIÓN ── */}
          {etapaActual === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Dotación</CardTitle>
                <CardDescription>Tallas de ropa y calzado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-talla-camisa">Talla de camisa</Label>
                  <Select value={formData.tallaCamisa} onValueChange={v => handleInputChange('tallaCamisa', v)}>
                    <SelectTrigger id="nuevocolab-talla-camisa"><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent side="bottom" align="start" avoidCollisions={false}>
                      {tallaCamisas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-talla-pantalon">Talla de pantalón</Label>
                  <Select value={formData.tallaPantalon} onValueChange={v => handleInputChange('tallaPantalon', v)}>
                    <SelectTrigger id="nuevocolab-talla-pantalon"><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent side="bottom" align="start" avoidCollisions={false}>
                      {tallaPantalones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-talla-calzado">Talla de calzado</Label>
                  <Select value={formData.tallaCalzado} onValueChange={v => handleInputChange('tallaCalzado', v)}>
                    <SelectTrigger id="nuevocolab-talla-calzado"><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent side="bottom" align="start" avoidCollisions={false}>
                      {tallaCalzados.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 6: BANCARIO ── */}
          {etapaActual === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>Información bancaria</CardTitle>
                <CardDescription>Datos para pagos de nómina.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-banco">Banco</Label>
                  <Select value={formData.banco} onValueChange={v => handleInputChange('banco', v)}>
                    <SelectTrigger id="nuevocolab-banco"><SelectValue placeholder="Selecciona un banco" /></SelectTrigger>
                    <SelectContent>{bancariasOpciones.length > 0 && !bancariasOpciones.includes(formData.banco) && formData.banco && <SelectItem value={formData.banco}>{formData.banco}</SelectItem>}
                      {bancariasOpciones.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-tipo-cuenta">Tipo de cuenta</Label>
                  <Select value={formData.tipoCuenta} onValueChange={v => handleInputChange('tipoCuenta', v)}>
                    <SelectTrigger id="nuevocolab-tipo-cuenta"><SelectValue /></SelectTrigger>
                    <SelectContent>{tiposCuenta.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevocolab-numero-de-cuenta">Número de cuenta</Label>
                  <Input id="nuevocolab-numero-de-cuenta" placeholder="Ej: 04512345678" value={formData.numeroCuenta} onChange={e => handleInputChange('numeroCuenta', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ETAPA 7: DOCUMENTOS (solo edición) ── */}
          {etapaActual === 7 && isEditMode && (
            <Card>
              <CardHeader>
                <CardTitle>Repositorio de documentos</CardTitle>
                <CardDescription>Gestiona los documentos del colaborador por categorías.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDocs || !categoriasDocs ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando documentos...
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(categoriasDocs).map(([catKey, cat]) => {
                      const docsDeCategoria = documentos.filter(d => d.categoria === catKey);
                      const tiposPredefinidos = Object.entries(cat.tipos);
                      return (
                        <AccordionItem key={catKey} value={catKey}>
                          <AccordionTrigger className="text-sm font-semibold">
                            <span className="flex items-center gap-2">
                              {cat.label}
                              <Badge variant="secondary">{docsDeCategoria.length}</Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {tiposPredefinidos.length > 0 && cat.unico_por_tipo ? (
                              /* unico_por_tipo=true: un slot por tipo (reemplaza al subir) — solo DATOS_BASE */
                              tiposPredefinidos.map(([tipo, label]) => {
                                const docDelTipo = docsDeCategoria.find(d => d.tipo_documento === tipo);
                                return (
                                  <div key={tipo} className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">{label}</p>
                                    {docDelTipo ? (
                                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/40">
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                            <FileText className="h-4 w-4" strokeWidth={2} />
                                          </span>
                                          <div className="min-w-0">
                                            <p className="break-words text-sm font-medium text-foreground">{docDelTipo.nombre_archivo || docDelTipo.archivo_nombre_original}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {docDelTipo.fecha_documento ?? docDelTipo.created_at?.split('T')[0]}
                                              {docDelTipo.archivo_tamano ? ` · ${(docDelTipo.archivo_tamano / 1024).toFixed(1)} KB` : ''}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0.5">
                                          <Button size="icon" variant="ghost" className="text-muted-foreground" title="Visualizar" aria-label="Visualizar documento" onClick={() => visualizarDocumento(docDelTipo)}>
                                            <Eye className="h-4 w-4" strokeWidth={2} />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="text-muted-foreground" title="Descargar" aria-label="Descargar documento" onClick={() => descargarDocumento(docDelTipo.id, docDelTipo.archivo_nombre_original)}>
                                            <Download className="h-4 w-4" strokeWidth={2} />
                                          </Button>
                                          <Button size="icon" variant="ghost" onClick={() => handleEliminarDocumento(docDelTipo.id, docDelTipo.archivo_nombre_original)} className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive" title="Eliminar" aria-label="Eliminar documento">
                                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <input type="file" id={`up-${catKey}-${tipo}`} className="hidden"
                                          aria-label="Seleccionar archivo"
                                          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                          onChange={e => handleSubirDocumento(catKey, tipo, e)} />
                                        <Button size="sm" variant="outline" disabled={uploadingDoc}
                                          onClick={() => document.getElementById(`up-${catKey}-${tipo}`)?.click()} className="w-full">
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
                              (() => {
                                // Tipo a enviar: el primer tipo predefinido o la catKey si no hay
                                const tipoDefault = tiposPredefinidos[0]?.[0] ?? catKey;
                                const inputId = `up-${catKey}-multi`;
                                return (
                                  <>
                                    {/* Header: hint + botón Subir */}
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="text-sm text-muted-foreground">
                                        Puedes subir múltiples documentos a esta categoría
                                      </p>
                                      <input type="file" id={inputId} className="hidden"
                                        aria-label="Seleccionar archivo"
                                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                        onChange={e => handleSubirDocumento(catKey, tipoDefault, e)} />
                                      <Button size="sm" disabled={uploadingDoc}
                                        onClick={() => document.getElementById(inputId)?.click()}>
                                        <Upload className="h-4 w-4" />
                                        {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                                      </Button>
                                    </div>

                                    {/* Lista de documentos o placeholder vacío */}
                                    {docsDeCategoria.length === 0 ? (
                                      <div className="space-y-1 py-10 text-center">
                                        <h3 className="text-base font-semibold text-foreground">Sin documentos en esta categoría</h3>
                                        <p className="text-sm text-muted-foreground">Sube el primero con el botón de arriba.</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {docsDeCategoria.map(doc => (
                                          <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/40">
                                            <div className="flex min-w-0 items-center gap-3">
                                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                <FileText className="h-4 w-4" strokeWidth={2} />
                                              </span>
                                              <div className="min-w-0">
                                                <p className="break-words text-sm font-medium text-foreground">{doc.nombre_archivo || doc.archivo_nombre_original}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {(cat.tipos[doc.tipo_documento] ?? doc.tipo_documento)}
                                                  {doc.fecha_documento ? ` · ${doc.fecha_documento}` : (doc.created_at ? ` · ${doc.created_at.split('T')[0]}` : '')}
                                                  {doc.archivo_tamano ? ` · ${(doc.archivo_tamano / 1024).toFixed(1)} KB` : ''}
                                                </p>
                                                {doc.observacion && <p className="mt-0.5 text-xs italic text-muted-foreground">{doc.observacion}</p>}
                                              </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5">
                                              <Button size="icon" variant="ghost" className="text-muted-foreground" title="Visualizar" aria-label="Visualizar documento" onClick={() => visualizarDocumento(doc)}>
                                                <Eye className="h-4 w-4" strokeWidth={2} />
                                              </Button>
                                              <Button size="icon" variant="ghost" className="text-muted-foreground" title="Descargar" aria-label="Descargar documento" onClick={() => descargarDocumento(doc.id, doc.archivo_nombre_original)}>
                                                <Download className="h-4 w-4" strokeWidth={2} />
                                              </Button>
                                              <Button size="icon" variant="ghost" onClick={() => handleEliminarDocumento(doc.id, doc.archivo_nombre_original)} className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive" title="Eliminar" aria-label="Eliminar documento">
                                                <Trash2 className="h-4 w-4" strokeWidth={2} />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()
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
          <div className="barra-acciones flex items-center justify-between gap-2">
            <Button variant="outline" onClick={etapaAnterior} disabled={etapaActual === 1}>
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex gap-2">
              {/* En edición: siempre mostrar Guardar cambios */}
              {isEditMode && (
                <Button onClick={guardarTodo} disabled={guardando} variant="outline">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />Guardar cambios</>}
                </Button>
              )}
              {etapaActual < ETAPAS.length ? (
                <Button onClick={siguienteEtapa} disabled={!isEditMode && !puedeAvanzar}>
                  Siguiente <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                !isEditMode ? (
                  <Button onClick={guardarTodo} disabled={guardando}>
                    {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : <><Save className="h-4 w-4" />Crear colaborador</>}
                  </Button>
                ) : (
                  <Button onClick={async () => { await guardarTodo(); }} disabled={guardando} >
                    {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : 'Finalizar'}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Panel resumen */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-8">
            <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Información personal</p>
                  <p className="font-medium">
                    {[formData.primerNombre, formData.segundoNombre, formData.primerApellido, formData.segundoApellido].filter(Boolean).join(' ') || '-'}
                  </p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Identificación</p>
                  <p className="font-medium">{formData.numeroDocumento || '-'}</p>
                  <p className="text-xs text-muted-foreground">{tiposDocumento.find(t => t.codigo === formData.tipoDocumento)?.label}</p>
                  {formData.fechaExpedicion && (
                    <p className="text-xs text-muted-foreground">Expedición: {formatFecha(formData.fechaExpedicion)}</p>
                  )}
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Cargo</p>
                  <p className="font-medium">{formData.cargo || '-'}</p>
                  <p className="text-xs text-muted-foreground">{modalidadesPago.find(m => m.codigo === formData.modalidadPago)?.label}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Salario base</p>
                  <p className="font-medium tabular-nums">{formData.salarioBase > 0 ? `$${formData.salarioBase.toLocaleString('es-CO')}` : '-'}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Seguridad social</p>
                  <p className="text-xs">EPS: {formData.eps || '-'}</p>
                  <p className="text-xs">ARL: {formData.arl || '-'}</p>
                  <p className="text-xs">Pensión: {formData.fondoPension || '-'}</p>
                  <p className="text-xs">Cesantías: {formData.fondoCesantias || '-'}</p>
                </div>
                <div className="pb-3 border-b border-border">
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Dotación</p>
                  <p className="text-xs">Camisa: {formData.tallaCamisa || '-'}</p>
                  <p className="text-xs">Pantalón: {formData.tallaPantalon || '-'}</p>
                  <p className="text-xs">Calzado: {formData.tallaCalzado || '-'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[13px] font-medium text-muted-foreground">Información bancaria</p>
                  <p className="text-xs">Banco: {formData.banco || '-'}</p>
                  <p className="text-xs">Tipo: {tiposCuenta.find(t => t.codigo === formData.tipoCuenta)?.label}</p>
                  <p className="text-xs">Cuenta: {formData.numeroCuenta || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AlertDialog: confirmación de eliminar documento */}
      <AlertDialog open={!!docAEliminar} onOpenChange={(open) => !open && setDocAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{docAEliminar?.nombre}</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminarDocumento}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}