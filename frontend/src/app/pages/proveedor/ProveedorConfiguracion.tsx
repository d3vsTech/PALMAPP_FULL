import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Bell,
  Truck,
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
  Loader2,
  Save,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  proveedorApi,
  type BancoCatalogoProv,
  type TransportadoraCatalogoProv,
  type ConfiguracionProveedorResponse,
  type ResumenConfigProv,
  type TipoCuentaProv,
} from '../../../api/proveedor';
import { proveedorAuthStorage } from '../../../api/proveedorAuth';
import { getDepartamentos, getMunicipios } from '../../../api/plantacion';

const ETAPAS = [
  { numero: 1, nombre: 'General', descripcion: 'Información básica', icon: Store },
  { numero: 2, nombre: 'Bancario', descripcion: 'Datos de pago', icon: CreditCard },
  { numero: 3, nombre: 'Envíos', descripcion: 'Configuración', icon: Truck },
  { numero: 4, nombre: 'Notificaciones', descripcion: 'Preferencias', icon: Bell },
];

/** Estado local de los 4 formularios. Inicializa con strings vacíos. */
interface FormState {
  general: {
    nombre_empresa: string;
    nit: string;
    telefono: string;
    email: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    descripcion: string;
    logo_url: string;
  };
  bancario: {
    banco_id: string; // string para Select
    tipo_cuenta: TipoCuentaProv | '';
    numero_cuenta: string;
    titular_cuenta: string;
  };
  envios: {
    transportadora_id: string; // string para Select; '' = sin transportadora
    tiempo_preparacion_horas: string;
    monto_envio_gratis: string;
    permitir_recoger_tienda: boolean;
  };
  notificaciones: {
    nuevos_pedidos: boolean;
    cambios_estado: boolean;
    mensajes_clientes: boolean;
    reportes_diarios: boolean;
    reportes_semanales: boolean;
  };
}

const formVacio = (): FormState => ({
  general: {
    nombre_empresa: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    descripcion: '',
    logo_url: '',
  },
  bancario: {
    banco_id: '',
    tipo_cuenta: '',
    numero_cuenta: '',
    titular_cuenta: '',
  },
  envios: {
    transportadora_id: '',
    tiempo_preparacion_horas: '24',
    monto_envio_gratis: '',
    permitir_recoger_tienda: false,
  },
  notificaciones: {
    nuevos_pedidos: true,
    cambios_estado: true,
    mensajes_clientes: true,
    reportes_diarios: false,
    reportes_semanales: false,
  },
});

const aplicarBundle = (data: ConfiguracionProveedorResponse): FormState => ({
  general: {
    nombre_empresa: data.general.nombre_empresa ?? '',
    nit: data.general.nit ?? '',
    telefono: data.general.telefono ?? '',
    email: data.general.email ?? '',
    direccion: data.general.direccion ?? '',
    ciudad: data.general.ciudad ?? '',
    departamento: data.general.departamento ?? '',
    descripcion: data.general.descripcion ?? '',
    logo_url: data.general.logo_url ?? '',
  },
  bancario: {
    banco_id: data.bancario.banco_id != null ? String(data.bancario.banco_id) : '',
    tipo_cuenta: data.bancario.tipo_cuenta ?? '',
    numero_cuenta: data.bancario.numero_cuenta ?? '',
    titular_cuenta: data.bancario.titular_cuenta ?? '',
  },
  envios: {
    transportadora_id: data.envios.transportadora_id != null ? String(data.envios.transportadora_id) : '',
    tiempo_preparacion_horas: data.envios.tiempo_preparacion_horas != null
      ? String(data.envios.tiempo_preparacion_horas)
      : '24',
    monto_envio_gratis: data.envios.monto_envio_gratis ?? '',
    permitir_recoger_tienda: !!data.envios.permitir_recoger_tienda,
  },
  notificaciones: { ...data.notificaciones },
});

export default function ProveedorConfiguracion() {
  const navigate = useNavigate();
  const rol = proveedorAuthStorage.getRol();
  const esAdmin = rol === 'ADMIN';

  const [etapaActual, setEtapaActual] = useState(1);
  const [form, setForm] = useState<FormState>(formVacio);

  // Catálogos
  const [bancos, setBancos] = useState<BancoCatalogoProv[]>([]);
  const [transportadoras, setTransportadoras] = useState<TransportadoraCatalogoProv[]>([]);
  const [departamentos, setDepartamentos] = useState<{ codigo: string; nombre: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ codigo: string; nombre: string }[]>([]);
  const [deptoSel, setDeptoSel] = useState(''); // código del departamento
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  // Resumen
  const [resumen, setResumen] = useState<ResumenConfigProv | null>(null);

  const [cargandoBundle, setCargandoBundle] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // ── Carga inicial: bundle + catálogos en paralelo ─────────────────────────
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargandoBundle(true);
      try {
        const [bundle, bancosRes, transRes, deptosRes, resumenRes] = await Promise.all([
          proveedorApi.configuracion(),
          proveedorApi.catalogoBancos().catch(() => ({ data: [] })),
          proveedorApi.catalogoTransportadoras().catch(() => ({ data: [] })),
          getDepartamentos().catch(() => ({ data: [] })),
          proveedorApi.configuracionResumen().catch(() => null),
        ]);
        if (cancelado) return;

        setForm(aplicarBundle(bundle.data));
        setBancos(bancosRes.data ?? []);
        setTransportadoras(transRes.data ?? []);
        const deptos = deptosRes.data ?? [];
        setDepartamentos(deptos);
        if (resumenRes) setResumen(resumenRes.data);

        // Resolver código del departamento por nombre (los selects encadenados
        // del checkout también usan este patrón).
        const nombreDepto = bundle.data.general.departamento;
        if (nombreDepto) {
          const match = deptos.find(
            d => d.nombre.toLowerCase() === nombreDepto.toLowerCase(),
          );
          if (match) setDeptoSel(match.codigo);
        }
      } catch (e: any) {
        if (!cancelado) toast.error(e?.message ?? 'Error al cargar la configuración');
      } finally {
        if (!cancelado) setCargandoBundle(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, []);

  // ── Cargar municipios cuando cambia el departamento ───────────────────────
  useEffect(() => {
    if (!deptoSel) { setMunicipios([]); return; }
    const cacheKey = `cache_municipios_${deptoSel}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setMunicipios(JSON.parse(cached)); return; }
    } catch { /* ignorar */ }
    setCargandoMunicipios(true);
    getMunicipios(deptoSel)
      .then((r) => {
        const ms = r.data ?? [];
        setMunicipios(ms);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(ms)); } catch { /* cuota */ }
      })
      .catch(() => setMunicipios([]))
      .finally(() => setCargandoMunicipios(false));
  }, [deptoSel]);

  // ── Refrescar resumen tras cada save exitoso ──────────────────────────────
  const refrescarResumen = async () => {
    try {
      const r = await proveedorApi.configuracionResumen();
      setResumen(r.data);
    } catch { /* no es crítico */ }
  };

  // ── Validación + Save por tab ─────────────────────────────────────────────
  /** Devuelve true si se guardó (o no había nada que guardar). False = error. */
  const guardarTab = async (tab: number): Promise<boolean> => {
    if (!esAdmin) {
      // OPERADOR no puede modificar nada; simulamos éxito para que pueda
      // navegar entre tabs sin trabar el wizard.
      return true;
    }
    setGuardando(true);
    try {
      if (tab === 1) {
        const g = form.general;
        if (!g.nombre_empresa.trim() || !g.telefono.trim() || !g.email.trim()
          || !g.direccion.trim() || !g.ciudad.trim() || !g.departamento.trim()) {
          toast.error('Completa los campos obligatorios de la sección General');
          return false;
        }
        const res = await proveedorApi.updateConfigGeneral({
          nombre_empresa: g.nombre_empresa.trim(),
          nit: g.nit.trim() || null,
          telefono: g.telefono.trim(),
          email: g.email.trim(),
          direccion: g.direccion.trim(),
          ciudad: g.ciudad.trim(),
          departamento: g.departamento.trim(),
          descripcion: g.descripcion.trim() || null,
          logo_url: g.logo_url.trim() || null,
        });
        toast.success(res.message);
      } else if (tab === 2) {
        const b = form.bancario;
        if (!b.banco_id || !b.tipo_cuenta || !b.numero_cuenta.trim() || !b.titular_cuenta.trim()) {
          toast.error('Completa todos los datos bancarios');
          return false;
        }
        const res = await proveedorApi.updateConfigBancario({
          banco_id: Number(b.banco_id),
          tipo_cuenta: b.tipo_cuenta,
          numero_cuenta: b.numero_cuenta.trim(),
          titular_cuenta: b.titular_cuenta.trim(),
        });
        toast.success(res.message);
      } else if (tab === 3) {
        const e = form.envios;
        const horas = parseInt(e.tiempo_preparacion_horas || '0', 10);
        if (!Number.isFinite(horas) || horas < 1 || horas > 720) {
          toast.error('El tiempo de preparación debe estar entre 1 y 720 horas');
          return false;
        }
        const monto = e.monto_envio_gratis.trim()
          ? parseFloat(e.monto_envio_gratis)
          : null;
        const res = await proveedorApi.updateConfigEnvios({
          transportadora_id: e.transportadora_id ? Number(e.transportadora_id) : null,
          tiempo_preparacion_horas: horas,
          monto_envio_gratis: monto,
          permitir_recoger_tienda: e.permitir_recoger_tienda,
        });
        toast.success(res.message);
      } else if (tab === 4) {
        const res = await proveedorApi.updateConfigNotificaciones(form.notificaciones);
        toast.success(res.message);
      }
      refrescarResumen();
      return true;
    } catch (err: any) {
      if (err?.code === 'PERMISSION_DENIED') {
        toast.error('No tienes permisos para modificar la configuración. Pide acceso de Administrador.');
      } else if (err?.errors) {
        // Errores de validación 422 — mostrar el primer mensaje.
        const primero = Object.values(err.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(err?.message ?? 'Error al guardar');
      }
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const handleSiguiente = async () => {
    const ok = await guardarTab(etapaActual);
    if (ok && etapaActual < ETAPAS.length) setEtapaActual(etapaActual + 1);
  };
  const handleFinalizar = async () => {
    const ok = await guardarTab(etapaActual);
    if (ok) toast.success('Configuración completa');
  };
  const pasoAnterior = () => {
    if (etapaActual > 1) setEtapaActual(etapaActual - 1);
  };
  const irAEtapa = (n: number) => setEtapaActual(n);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (cargandoBundle) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando configuración...
      </div>
    );
  }

  const setGeneral = (campo: keyof FormState['general'], valor: string) =>
    setForm(f => ({ ...f, general: { ...f.general, [campo]: valor } }));
  const setBancario = <K extends keyof FormState['bancario']>(campo: K, valor: FormState['bancario'][K]) =>
    setForm(f => ({ ...f, bancario: { ...f.bancario, [campo]: valor } }));
  const setEnvios = <K extends keyof FormState['envios']>(campo: K, valor: FormState['envios'][K]) =>
    setForm(f => ({ ...f, envios: { ...f.envios, [campo]: valor } }));
  const setNotif = (campo: keyof FormState['notificaciones'], valor: boolean) =>
    setForm(f => ({ ...f, notificaciones: { ...f.notificaciones, [campo]: valor } }));

  const inputsDisabled = !esAdmin;
  const porcentajeProgreso = resumen?.progreso?.porcentaje
    ?? Math.round(((etapaActual - 1) / ETAPAS.length) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/proveedor/dashboard')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Configuración</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Administra la información y preferencias de tu cuenta
          </p>
        </div>
      </div>

      {/* Banner de OPERADOR (solo-lectura) */}
      {!esAdmin && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700">Vista de solo lectura</p>
            <p className="text-sm text-amber-700">
              Tu rol es <strong>Operador</strong>. Solo el Administrador del proveedor puede modificar esta configuración.
            </p>
          </div>
        </div>
      )}

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
                      <button
                        onClick={() => irAEtapa(etapa.numero)}
                        className="flex flex-col items-center gap-2 cursor-pointer"
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

          {/* Contenido del paso */}
          <Card className="border-border">
            <CardContent className="p-8 space-y-8">
              {/* Etapa 1: Información General */}
              {etapaActual === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Información General</h2>
                    <p className="text-muted-foreground">Datos básicos de tu empresa</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre_empresa">
                        Nombre de la empresa <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nombre_empresa"
                          value={form.general.nombre_empresa}
                          onChange={(e) => setGeneral('nombre_empresa', e.target.value)}
                          disabled={inputsDisabled}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nit">NIT</Label>
                      <Input
                        id="nit"
                        value={form.general.nit}
                        onChange={(e) => setGeneral('nit', e.target.value)}
                        disabled={inputsDisabled}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">
                        Teléfono <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="telefono"
                          value={form.general.telefono}
                          onChange={(e) => setGeneral('telefono', e.target.value)}
                          disabled={inputsDisabled}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={form.general.email}
                          onChange={(e) => setGeneral('email', e.target.value)}
                          disabled={inputsDisabled}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="direccion">
                        Dirección <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="direccion"
                          value={form.general.direccion}
                          onChange={(e) => setGeneral('direccion', e.target.value)}
                          disabled={inputsDisabled}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Departamento (selects encadenados con auth/departamentos) */}
                    <div className="space-y-2">
                      <Label htmlFor="departamento">
                        Departamento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={deptoSel}
                        onValueChange={(codigo) => {
                          setDeptoSel(codigo);
                          const nombre = departamentos.find(d => d.codigo === codigo)?.nombre ?? '';
                          // Cambiar de departamento limpia el municipio.
                          setForm(f => ({
                            ...f,
                            general: { ...f.general, departamento: nombre, ciudad: '' },
                          }));
                        }}
                        disabled={inputsDisabled}
                      >
                        <SelectTrigger id="departamento">
                          <SelectValue placeholder={
                            departamentos.length === 0 ? 'Cargando...' : 'Selecciona un departamento'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {departamentos.map(d => (
                            <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ciudad">
                        Ciudad / Municipio <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.general.ciudad}
                        onValueChange={(nombre) => setGeneral('ciudad', nombre)}
                        disabled={inputsDisabled || !deptoSel || cargandoMunicipios}
                      >
                        <SelectTrigger id="ciudad">
                          <SelectValue placeholder={
                            !deptoSel
                              ? 'Primero elige departamento'
                              : cargandoMunicipios
                                ? 'Cargando municipios...'
                                : 'Selecciona un municipio'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {municipios.map(m => (
                            <SelectItem key={m.codigo} value={m.nombre}>{m.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="descripcion">Descripción de la empresa</Label>
                      <Textarea
                        id="descripcion"
                        value={form.general.descripcion}
                        onChange={(e) => setGeneral('descripcion', e.target.value)}
                        disabled={inputsDisabled}
                        rows={3}
                        placeholder="Describe brevemente tu empresa y los productos que ofreces..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 2: Datos Bancarios */}
              {etapaActual === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Datos Bancarios</h2>
                    <p className="text-muted-foreground">Información para recibir tus pagos</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="banco">
                        Banco <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.bancario.banco_id}
                        onValueChange={(v) => setBancario('banco_id', v)}
                        disabled={inputsDisabled || bancos.length === 0}
                      >
                        <SelectTrigger id="banco">
                          <SelectValue placeholder={
                            bancos.length === 0 ? 'Cargando bancos...' : 'Selecciona un banco'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos.map(b => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo_cuenta">
                        Tipo de cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.bancario.tipo_cuenta}
                        onValueChange={(v) => setBancario('tipo_cuenta', v as TipoCuentaProv)}
                        disabled={inputsDisabled}
                      >
                        <SelectTrigger id="tipo_cuenta">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ahorros">Ahorros</SelectItem>
                          <SelectItem value="corriente">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numero_cuenta">
                        Número de cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="numero_cuenta"
                        value={form.bancario.numero_cuenta}
                        onChange={(e) => setBancario('numero_cuenta', e.target.value)}
                        disabled={inputsDisabled}
                        placeholder="1234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="titular_cuenta">
                        Titular de la cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="titular_cuenta"
                        value={form.bancario.titular_cuenta}
                        onChange={(e) => setBancario('titular_cuenta', e.target.value)}
                        disabled={inputsDisabled}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-600">
                      Esta información es confidencial y solo se usa para procesar tus pagos.
                      Asegúrate de que los datos sean correctos.
                    </p>
                  </div>
                </div>
              )}

              {/* Etapa 3: Envíos */}
              {etapaActual === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Configuración de Envíos</h2>
                    <p className="text-muted-foreground">Gestiona las opciones de entrega</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="transportadora">Transportadora predeterminada</Label>
                      <Select
                        value={form.envios.transportadora_id || '_none'}
                        onValueChange={(v) => setEnvios(
                          'transportadora_id',
                          v === '_none' ? '' : v,
                        )}
                        disabled={inputsDisabled || transportadoras.length === 0}
                      >
                        <SelectTrigger id="transportadora">
                          <SelectValue placeholder={
                            transportadoras.length === 0 ? 'Cargando...' : 'Selecciona una transportadora'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Sin transportadora predeterminada</SelectItem>
                          {transportadoras.map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiempo_prep">Tiempo de preparación (horas)</Label>
                      <Input
                        id="tiempo_prep"
                        type="number" step="0.001"
                        min={1}
                        max={720}
                        value={form.envios.tiempo_preparacion_horas}
                        onChange={(e) => setEnvios('tiempo_preparacion_horas', e.target.value)}
                        disabled={inputsDisabled}
                      />
                      <p className="text-xs text-muted-foreground">Entre 1 y 720 horas (30 días)</p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="monto_envio_gratis">Monto para envío gratis (COP)</Label>
                      <Input
                        id="monto_envio_gratis"
                        type="number" step="0.001"
                        min={0}
                        value={form.envios.monto_envio_gratis}
                        onChange={(e) => setEnvios('monto_envio_gratis', e.target.value)}
                        disabled={inputsDisabled}
                        placeholder="Dejar vacío si no aplica"
                      />
                      <p className="text-xs text-muted-foreground">
                        Pedidos superiores a este monto tendrán envío gratis
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <Label htmlFor="recoger_tienda">Permitir recoger en tienda</Label>
                          <p className="text-sm text-muted-foreground">
                            Los clientes pueden recoger sus pedidos en tu ubicación
                          </p>
                        </div>
                        <Switch
                          id="recoger_tienda"
                          checked={form.envios.permitir_recoger_tienda}
                          onCheckedChange={(v) => setEnvios('permitir_recoger_tienda', v)}
                          disabled={inputsDisabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 4: Notificaciones */}
              {etapaActual === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Preferencias de Notificaciones</h2>
                    <p className="text-muted-foreground">
                      Configura qué notificaciones deseas recibir por email
                    </p>
                  </div>

                  <div className="space-y-4">
                    {([
                      { key: 'nuevos_pedidos',     label: 'Nuevos pedidos',     desc: 'Recibe notificación cuando tengas un nuevo pedido' },
                      { key: 'cambios_estado',     label: 'Cambios de estado',   desc: 'Notificaciones sobre cambios en el estado de pedidos' },
                      { key: 'mensajes_clientes',  label: 'Mensajes de clientes', desc: 'Te avisamos cuando un cliente te envíe un mensaje' },
                      { key: 'reportes_diarios',   label: 'Reportes diarios',     desc: 'Resumen diario de ventas y pedidos' },
                      { key: 'reportes_semanales', label: 'Reportes semanales',   desc: 'Resumen semanal de rendimiento' },
                    ] as const).map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          id={key}
                          checked={form.notificaciones[key]}
                          onCheckedChange={(v) => setNotif(key, v)}
                          disabled={inputsDisabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={pasoAnterior}
                  disabled={etapaActual === 1 || guardando}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>

                {/* Mostrar botón solo para ADMIN. OPERADOR ve solo "Siguiente". */}
                {etapaActual < ETAPAS.length ? (
                  <Button onClick={handleSiguiente} disabled={guardando} className="gap-2">
                    {guardando
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                      : esAdmin
                        ? <><Save className="h-4 w-4" /> Guardar y siguiente <ArrowRight className="h-4 w-4" /></>
                        : <>Siguiente <ArrowRight className="h-4 w-4" /></>
                    }
                  </Button>
                ) : (
                  esAdmin ? (
                    <Button onClick={handleFinalizar} disabled={guardando} className="gap-2">
                      {guardando
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                        : <><Check className="h-4 w-4" /> Guardar configuración</>
                      }
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Vista de solo lectura</span>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Resumen/Ayuda (1/3) */}
        <div className="space-y-6">
          {/* Progreso (del backend) */}
          <Card className="border-border sticky top-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Progreso</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completado</span>
                  <span className="font-semibold">{porcentajeProgreso}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${porcentajeProgreso}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {resumen
                    ? `${resumen.progreso.etapas_completadas} de ${resumen.progreso.etapas_total} etapas completas`
                    : `Etapa ${etapaActual} de ${ETAPAS.length}`
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resumen del backend (panel derecho oficial) */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Empresa</p>
                  <p className="font-medium">{resumen?.empresa?.nombre_empresa ?? form.general.nombre_empresa ?? '—'}</p>
                  {(resumen?.empresa?.nit ?? form.general.nit) && (
                    <p className="text-xs text-muted-foreground">
                      {resumen?.empresa?.nit ?? form.general.nit}
                    </p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Cuenta bancaria</p>
                  {resumen?.cuenta_bancaria ? (
                    <>
                      <p className="font-medium">{resumen.cuenta_bancaria.banco}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {resumen.cuenta_bancaria.tipo_cuenta} • {resumen.cuenta_bancaria.numero_cuenta_mask}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin configurar</p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Envíos</p>
                  {resumen?.envios ? (
                    <>
                      <p className="font-medium">
                        {resumen.envios.transportadora ?? 'Sin transportadora'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Prep: {resumen.envios.tiempo_preparacion_horas}h
                        {resumen.envios.monto_envio_gratis
                          ? ` • Envío gratis desde $${parseFloat(resumen.envios.monto_envio_gratis).toLocaleString('es-CO')}`
                          : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin configurar</p>
                  )}
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Notificaciones activas</p>
                  <p className="text-xs">
                    {resumen?.notificaciones_activas ?? 0} de {resumen?.notificaciones_total ?? 5}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ayuda contextual */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Ayuda</h3>
              {etapaActual === 1 && (
                <p className="text-sm text-muted-foreground">
                  Ingresa la información legal y de contacto de tu empresa. Estos datos aparecerán en tus facturas y serán visibles para tus clientes.
                </p>
              )}
              {etapaActual === 2 && (
                <p className="text-sm text-muted-foreground">
                  Configura la cuenta bancaria donde recibirás los pagos de tus ventas. Esta información es privada y segura.
                </p>
              )}
              {etapaActual === 3 && (
                <p className="text-sm text-muted-foreground">
                  Define cómo manejarás los envíos de tus productos. Puedes cambiar esta configuración más adelante.
                </p>
              )}
              {etapaActual === 4 && (
                <p className="text-sm text-muted-foreground">
                  Personaliza las notificaciones que recibirás por email. Puedes ajustar estas preferencias en cualquier momento.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
