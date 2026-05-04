import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

const ETAPAS = [
  { numero: 1, nombre: 'General', descripcion: 'Información básica', icon: Store },
  { numero: 2, nombre: 'Bancario', descripcion: 'Datos de pago', icon: CreditCard },
  { numero: 3, nombre: 'Envíos', descripcion: 'Configuración', icon: Truck },
  { numero: 4, nombre: 'Notificaciones', descripcion: 'Preferencias', icon: Bell },
];

export default function ProveedorConfiguracion() {
  const navigate = useNavigate();
  const [etapaActual, setEtapaActual] = useState(1);

  // Datos del formulario
  const [datosGenerales, setDatosGenerales] = useState({
    nombreEmpresa: 'AgroInsumos del Valle',
    nit: '900.123.456-7',
    telefono: '(602) 555-1234',
    email: 'info@agroinsumos.com',
    direccion: 'Calle 12 #34-56',
    ciudad: 'Cali',
    departamento: 'Valle del Cauca',
    descripcion: 'Proveedor líder de insumos agrícolas para el sector palmero',
  });

  const [datosBancarios, setDatosBancarios] = useState({
    banco: 'Bancolombia',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '1234567890',
    titular: 'AgroInsumos del Valle S.A.S',
  });

  const [configuracionEnvios, setConfiguracionEnvios] = useState({
    tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8: 'Servientrega',
    tiempoPreparacion: '24',
    costoEnvioGratis: '500000',
    aceptaRecogerTienda: true,
  });

  const [notificaciones, setNotificaciones] = useState({
    nuevosPedidos: true,
    cambiosEstado: true,
    mensajesClientes: true,
    reportesDiarios: false,
    reportesSemanales: true,
  });

  const siguientePaso = () => {
    if (etapaActual < ETAPAS.length) {
      setEtapaActual(etapaActual + 1);
    }
  };

  const pasoAnterior = () => {
    if (etapaActual > 1) {
      setEtapaActual(etapaActual - 1);
    }
  };

  const irAEtapa = (numero: number) => {
    setEtapaActual(numero);
  };

  const guardarConfiguracion = () => {
    toast.success('Configuración guardada exitosamente');
  };

  const validarPasoActual = () => {
    if (etapaActual === 1) {
      if (!datosGenerales.nombreEmpresa || !datosGenerales.nit || !datosGenerales.telefono || !datosGenerales.email) {
        toast.error('Por favor completa todos los campos obligatorios');
        return false;
      }
    }
    if (etapaActual === 2) {
      if (!datosBancarios.banco || !datosBancarios.numeroCuenta || !datosBancarios.titular) {
        toast.error('Por favor completa todos los datos bancarios');
        return false;
      }
    }
    return true;
  };

  const handleSiguiente = () => {
    if (validarPasoActual()) {
      siguientePaso();
    }
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
                      <Label htmlFor="nombreEmpresa">
                        Nombre de la empresa <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nombreEmpresa"
                          value={datosGenerales.nombreEmpresa}
                          onChange={(e) =>
                            setDatosGenerales({ ...datosGenerales, nombreEmpresa: e.target.value })
                          }
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nit">
                        NIT <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="nit"
                        value={datosGenerales.nit}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, nit: e.target.value })}
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
                          value={datosGenerales.telefono}
                          onChange={(e) =>
                            setDatosGenerales({ ...datosGenerales, telefono: e.target.value })
                          }
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
                          value={datosGenerales.email}
                          onChange={(e) =>
                            setDatosGenerales({ ...datosGenerales, email: e.target.value })
                          }
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
                          value={datosGenerales.direccion}
                          onChange={(e) =>
                            setDatosGenerales({ ...datosGenerales, direccion: e.target.value })
                          }
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ciudad">
                        Ciudad <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="ciudad"
                        value={datosGenerales.ciudad}
                        onChange={(e) =>
                          setDatosGenerales({ ...datosGenerales, ciudad: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="departamento">
                        Departamento <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="departamento"
                        value={datosGenerales.departamento}
                        onChange={(e) =>
                          setDatosGenerales({ ...datosGenerales, departamento: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="descripcion">Descripción de la empresa</Label>
                      <Textarea
                        id="descripcion"
                        value={datosGenerales.descripcion}
                        onChange={(e) =>
                          setDatosGenerales({ ...datosGenerales, descripcion: e.target.value })
                        }
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
                        value={datosBancarios.banco}
                        onValueChange={(v) => setDatosBancarios({ ...datosBancarios, banco: v })}
                      >
                        <SelectTrigger id="banco">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                          <SelectItem value="Banco de Bogotá">Banco de Bogotá</SelectItem>
                          <SelectItem value="Davivienda">Davivienda</SelectItem>
                          <SelectItem value="BBVA">BBVA</SelectItem>
                          <SelectItem value="Banco Popular">Banco Popular</SelectItem>
                          <SelectItem value="Banco de Occidente">Banco de Occidente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipoCuenta">
                        Tipo de cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={datosBancarios.tipoCuenta}
                        onValueChange={(v) => setDatosBancarios({ ...datosBancarios, tipoCuenta: v })}
                      >
                        <SelectTrigger id="tipoCuenta">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ahorros">Ahorros</SelectItem>
                          <SelectItem value="Corriente">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numeroCuenta">
                        Número de cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="numeroCuenta"
                        value={datosBancarios.numeroCuenta}
                        onChange={(e) =>
                          setDatosBancarios({ ...datosBancarios, numeroCuenta: e.target.value })
                        }
                        placeholder="1234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="titular">
                        Titular de la cuenta <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="titular"
                        value={datosBancarios.titular}
                        onChange={(e) =>
                          setDatosBancarios({ ...datosBancarios, titular: e.target.value })
                        }
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

              {/* Etapa 3: Configuración de Envíos */}
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
                        value={configuracionEnvios.tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8}
                        onValueChange={(v) =>
                          setConfiguracionEnvios({
                            ...configuracionEnvios,
                            tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8: v,
                          })
                        }
                      >
                        <SelectTrigger id="transportadora">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Servientrega">Servientrega</SelectItem>
                          <SelectItem value="Coordinadora">Coordinadora</SelectItem>
                          <SelectItem value="Interrapidísimo">Interrapidísimo</SelectItem>
                          <SelectItem value="Envía">Envía</SelectItem>
                          <SelectItem value="Deprisa">Deprisa</SelectItem>
                          <SelectItem value="Transporte Propio">Transporte Propio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiempoPreparacion">Tiempo de preparación (horas)</Label>
                      <Input
                        id="tiempoPreparacion"
                        type="number"
                        value={configuracionEnvios.tiempoPreparacion}
                        onChange={(e) =>
                          setConfiguracionEnvios({
                            ...configuracionEnvios,
                            tiempoPreparacion: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Tiempo estimado para preparar los pedidos
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="costoEnvioGratis">Monto para envío gratis (COP)</Label>
                      <Input
                        id="costoEnvioGratis"
                        type="number"
                        value={configuracionEnvios.costoEnvioGratis}
                        onChange={(e) =>
                          setConfiguracionEnvios({
                            ...configuracionEnvios,
                            costoEnvioGratis: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Pedidos superiores a este monto tendrán envío gratis
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <Label htmlFor="recogerTienda">Permitir recoger en tienda</Label>
                          <p className="text-sm text-muted-foreground">
                            Los clientes pueden recoger sus pedidos en tu ubicación
                          </p>
                        </div>
                        <Switch
                          id="recogerTienda"
                          checked={configuracionEnvios.aceptaRecogerTienda}
                          onCheckedChange={(checked) =>
                            setConfiguracionEnvios({
                              ...configuracionEnvios,
                              aceptaRecogerTienda: checked,
                            })
                          }
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
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="nuevosPedidos" className="cursor-pointer">
                          Nuevos pedidos
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Recibe notificación cuando tengas un nuevo pedido
                        </p>
                      </div>
                      <Switch
                        id="nuevosPedidos"
                        checked={notificaciones.nuevosPedidos}
                        onCheckedChange={(checked) =>
                          setNotificaciones({ ...notificaciones, nuevosPedidos: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="cambiosEstado" className="cursor-pointer">
                          Cambios de estado
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Notificaciones sobre cambios en el estado de pedidos
                        </p>
                      </div>
                      <Switch
                        id="cambiosEstado"
                        checked={notificaciones.cambiosEstado}
                        onCheckedChange={(checked) =>
                          setNotificaciones({ ...notificaciones, cambiosEstado: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="mensajesClientes" className="cursor-pointer">
                          Mensajes de clientes
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Te avisamos cuando un cliente te envíe un mensaje
                        </p>
                      </div>
                      <Switch
                        id="mensajesClientes"
                        checked={notificaciones.mensajesClientes}
                        onCheckedChange={(checked) =>
                          setNotificaciones({ ...notificaciones, mensajesClientes: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="reportesDiarios" className="cursor-pointer">
                          Reportes diarios
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Resumen diario de ventas y pedidos
                        </p>
                      </div>
                      <Switch
                        id="reportesDiarios"
                        checked={notificaciones.reportesDiarios}
                        onCheckedChange={(checked) =>
                          setNotificaciones({ ...notificaciones, reportesDiarios: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="reportesSemanales" className="cursor-pointer">
                          Reportes semanales
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Resumen semanal de rendimiento
                        </p>
                      </div>
                      <Switch
                        id="reportesSemanales"
                        checked={notificaciones.reportesSemanales}
                        onCheckedChange={(checked) =>
                          setNotificaciones({ ...notificaciones, reportesSemanales: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={pasoAnterior}
                  disabled={etapaActual === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>

                {etapaActual < ETAPAS.length ? (
                  <Button onClick={handleSiguiente} className="gap-2">
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={guardarConfiguracion} className="gap-2">
                    <Check className="h-4 w-4" />
                    Guardar Configuración
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Resumen/Ayuda (1/3) */}
        <div className="space-y-6">
          {/* Progreso */}
          <Card className="border-border sticky top-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Progreso</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completado</span>
                  <span className="font-semibold">{Math.round(((etapaActual - 1) / ETAPAS.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((etapaActual - 1) / ETAPAS.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Etapa {etapaActual} de {ETAPAS.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de datos */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Empresa</p>
                  <p className="font-medium">{datosGenerales.nombreEmpresa}</p>
                  <p className="text-xs text-muted-foreground">{datosGenerales.nit}</p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Cuenta bancaria</p>
                  <p className="font-medium">{datosBancarios.banco}</p>
                  <p className="text-xs text-muted-foreground">
                    {datosBancarios.tipoCuenta} {datosBancarios.numeroCuenta ? `• ${datosBancarios.numeroCuenta.slice(-4)}` : ''}
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Envíos</p>
                  <p className="font-medium">{configuracionEnvios.tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8}</p>
                  <p className="text-xs text-muted-foreground">
                    Prep: {configuracionEnvios.tiempoPreparacion}h • Envío gratis: ${parseInt(configuracionEnvios.costoEnvioGratis).toLocaleString()}
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Notificaciones activas</p>
                  <p className="text-xs">
                    {Object.values(notificaciones).filter(Boolean).length} de {Object.keys(notificaciones).length}
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