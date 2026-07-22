import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft, Truck, User, MapPin, Calendar, Save, X, Hash, FileText,
} from 'lucide-react';
import {
  viajesApi,
  empresasTransportadorasApi,
  extractorasApi,
  ViajesErrorCodes,
  type TransportadorSelect,
  type ExtractoraSelect,
  type EmpresaTransportadoraSelect,
  type CrearViajePayload,
  type EditarViajePayload,
} from '../../../api/viajes';
import {
  rangosNumeracionApi,
  type RangoNumeracionSelectItem,
} from '../../../api/rangosNumeracion';
import { toast } from 'sonner';

/**
 * Pantalla "Crear/Editar Viaje" — diseño V.17 (glass card, breadcrumb,
 * labels con iconos inline), conectada al contrato de API_VIAJES.md
 * (modelo de 3 estados).
 *
 * Flujo:
 *  1. Carga empresas + extractoras al montar.
 *  2. Para cada empresa, carga sus transportadores (conductores).
 *  3. El usuario elige un transportador; Conductor y Placa se rellenan solos.
 *  4. Submit envía { fecha_viaje, hora_salida, transportador_id, extractora_id }.
 */
export default function NuevoEditarViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    prefijo: '',
    numeroRemision: '',
    /**
     * Id del `rango_numeracion` elegido (§18). Se envía en el payload del
     * `POST /viajes` para que el backend genere la remisión como
     * `{prefijo}-{numero_zeropaded}`. Opcional: si queda vacío, el backend
     * usa el formato automático `REM-{YYYY}-{NNN}`.
     */
    rangoNumeracionId: '',
    placaVehiculo: '',
    conductor: '',
    transportadorId: '',
    extractoraId: '',
    horaSalida: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const [empresas, setEmpresas] = useState<EmpresaTransportadoraSelect[]>([]);
  const [transportadores, setTransportadores] = useState<
    Array<TransportadorSelect & { empresaRazonSocial: string }>
  >([]);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);
  // Rangos de numeración activos (§18 Configuración → Viajes → Rangos).
  // Poblan el dropdown "Prefijo"; al elegir uno se autocompleta el
  // "Número de Remisión" con `numero_actual`. El backend ya filtra por
  // `estado=true` en `/rangos-numeracion/select`.
  const [rangosRemision, setRangosRemision] = useState<RangoNumeracionSelectItem[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await rangosNumeracionApi.select({ tipo_documento: 'REMISION' });
        setRangosRemision(res.data ?? []);
      } catch (err) {
        // No bloquea el form — sin rangos, el usuario puede seguir sin
        // asignar prefijo manual (el backend usa el formato automático).
        console.warn('[rangos-numeracion/select] error:', err);
      }
    })();
  }, []);

  // Carga inicial: empresas + extractoras + transportadores por empresa.
  useEffect(() => {
    (async () => {
      try {
        const [empR, extR] = await Promise.all([
          empresasTransportadorasApi.select(),
          extractorasApi.select(),
        ]);
        const emps = empR.data ?? [];
        setEmpresas(emps);
        setExtractoras(extR.data ?? []);
        if (emps.length > 0) {
          const transResults = await Promise.all(
            emps.map(e =>
              empresasTransportadorasApi
                .transportadoresDe(Number(e.id))
                .then(r => (r.data ?? []).map(t => ({ ...t, empresaRazonSocial: e.razon_social })))
                .catch(() => [] as Array<TransportadorSelect & { empresaRazonSocial: string }>)
            )
          );
          setTransportadores(transResults.flat());
        }
      } catch (e) {
        console.warn('selects error', e);
      }
    })();
  }, []);

  // Modo edición: cargar viaje existente.
  useEffect(() => {
    if (!esEdicion || !id) return;
    (async () => {
      try {
        const res = await viajesApi.ver(Number(id));
        const v = res.data as any;
        setFormData({
          fecha: String(v.fecha_viaje ?? ''),
          // Rehidratamos el rango si el viaje ya fue creado con uno.
          // El backend expone `rango_numeracion` (con id/prefijo) o el
          // simple `rango_numeracion_id`.
          prefijo: String(v.rango_numeracion?.prefijo ?? ''),
          numeroRemision: String(v.remision ?? ''),
          rangoNumeracionId: String(v.rango_numeracion?.id ?? v.rango_numeracion_id ?? ''),
          placaVehiculo: String(v.placa_vehiculo ?? ''),
          conductor: String(v.nombre_conductor ?? ''),
          transportadorId: String(v.transportador?.id ?? v.transportador_id ?? ''),
          extractoraId: String(v.extractora?.id ?? v.extractora_id ?? ''),
          horaSalida: String(v.hora_salida ?? '').slice(0, 5),
        });
      } catch {
        navigate('/viajes');
      }
    })();
  }, [id, esEdicion, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const handleTransportadorChange = (transportadorId: string) => {
    const t = transportadores.find(x => String(x.id) === transportadorId);
    if (t) {
      setFormData(prev => ({
        ...prev,
        transportadorId,
        conductor: `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim(),
        placaVehiculo: t.placa_vehiculo ?? '',
      }));
    } else {
      setFormData(prev => ({ ...prev, transportadorId }));
    }
    if (errors.transportadorId) {
      setErrors(prev => {
        const n = { ...prev };
        delete n.transportadorId;
        return n;
      });
    }
  };

  const validateForm = (): boolean => {
    const n: Record<string, string> = {};
    if (!formData.fecha) n.fecha = 'La fecha es requerida';
    if (!formData.transportadorId) n.transportadorId = 'El transportador es requerido';
    if (!formData.conductor.trim()) n.conductor = 'El conductor es requerido';
    if (!formData.placaVehiculo.trim()) n.placaVehiculo = 'La placa del vehículo es requerida';
    if (!formData.extractoraId) n.extractoraId = 'Debe seleccionar una extractora';
    if (!formData.horaSalida) n.horaSalida = 'La hora de salida es requerida';
    setErrors(n);
    return Object.keys(n).length === 0;
  };

  const guardarViaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setGuardando(true);
    try {
      // `es_homogeneo` no va en el payload: lo calcula el backend al agregar /
      // quitar detalles de cosecha (§5.1 + §6.1 del doc API_VIAJES.md).
      //
      // `rango_numeracion_id` (§18): opcional. Si el usuario eligió un
      // prefijo del dropdown, incluimos el id para que el backend genere
      // la remisión como `{prefijo}-{numero_zeropaded}`. Si lo omite, el
      // backend usa el formato automático `REM-{YYYY}-{NNN}`.
      const rangoId = formData.rangoNumeracionId
        ? Number(formData.rangoNumeracionId)
        : null;

      if (esEdicion && id) {
        const payload: EditarViajePayload = {
          fecha_viaje: formData.fecha,
          hora_salida: formData.horaSalida,
          transportador_id: Number(formData.transportadorId),
          extractora_id: Number(formData.extractoraId),
          observaciones: null,
          rango_numeracion_id: rangoId,
        };
        await viajesApi.editar(Number(id), payload);
        toast.success('Viaje actualizado');
      } else {
        const payload: CrearViajePayload = {
          fecha_viaje: formData.fecha,
          hora_salida: formData.horaSalida,
          transportador_id: Number(formData.transportadorId),
          extractora_id: Number(formData.extractoraId),
          observaciones: null,
          rango_numeracion_id: rangoId,
        };
        await viajesApi.crear(payload);
        toast.success('Viaje creado');
      }
      navigate('/viajes');
    } catch (err: any) {
      const code = err?.code ?? '';
      // §9 códigos del módulo Viajes que pueden aparecer al crear/editar:
      if (code === ViajesErrorCodes.TRANSPORTADOR_INACTIVO) {
        toast.error('El conductor seleccionado está inactivo. Actívalo en Configuración → Viajes → Transportadores.');
      } else if (code === ViajesErrorCodes.EXTRACTORA_INACTIVA) {
        toast.error('La extractora seleccionada está inactiva. Actívala en Configuración → Viajes → Extractoras.');
      } else if (code === ViajesErrorCodes.VIAJE_NO_EDITABLE) {
        toast.error('El viaje ya no está en estado CREADO — no se puede editar.');
      } else if (code === ViajesErrorCodes.REMISION_DUPLICADA) {
        toast.error('Colisión de número de remisión. Intenta de nuevo.');
      } else if (code === 'RANGO_INACTIVO') {
        // §18 rangos de numeración
        toast.error('El rango de numeración seleccionado está inactivo. Elige otro o actívalo en Configuración → Viajes → Rangos de Numeración.');
      } else if (code === 'RANGO_AGOTADO') {
        toast.error('El rango de numeración se agotó (numero_actual > numero_hasta). Amplía "Número Hasta" o crea un nuevo rango.');
      } else if (code === ViajesErrorCodes.MODULO_DESHABILITADO) {
        toast.error('El módulo de Viajes está deshabilitado para esta finca.');
      } else {
        toast.error(err?.message ?? 'Error al guardar viaje');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/viajes">Viajes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{esEdicion ? 'Editar Viaje' : 'Nuevo Viaje'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header con botón atrás */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/viajes')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary">
            {esEdicion ? 'Editar Viaje' : 'Nuevo Viaje'}
          </h1>
          <p className="text-muted-foreground">
            {esEdicion ? 'Modifica la información del viaje' : 'Registra un nuevo despacho de fruto'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={guardarViaje}>
        <div className="max-w-5xl mx-auto">
          <Card className="glass-subtle border-border shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Información del Viaje</CardTitle>
                  <CardDescription className="text-xs">Datos básicos del despacho</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primera fila: Fecha · Prefijo · Número de Remisión.
                  Va separada del resto para destacar los datos de la
                  remisión física de despacho. */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <Label htmlFor="fecha" className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    Fecha del Viaje
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                    className={errors.fecha ? 'border-destructive' : ''}
                  />
                  {errors.fecha && <p className="text-xs text-destructive">{errors.fecha}</p>}
                </div>

                {/* Prefijo (dropdown alimentado por los rangos activos
                    de "Rangos de Numeración" → tipo Remisión).
                    Al elegir uno, "Número de Remisión" se auto-rellena
                    con el `numero_actual` del rango. */}
                <div className="space-y-1.5">
                  <Label htmlFor="prefijo" className="flex items-center gap-2 text-sm">
                    <Hash className="h-3.5 w-3.5" />
                    Prefijo
                  </Label>
                  <Select
                    value={formData.prefijo}
                    onValueChange={(v) => {
                      const r = rangosRemision.find((x) => x.prefijo === v);
                      setFormData((prev) => ({
                        ...prev,
                        prefijo: v,
                        // Guardamos el id del rango para enviarlo en el
                        // payload como `rango_numeracion_id` (§18).
                        rangoNumeracionId: r ? String(r.id) : '',
                        // Solo prellenamos el número de remisión si no lo
                        // ha editado manualmente todavía (o si estaba con
                        // el consecutivo de otro prefijo).
                        numeroRemision: r ? String(r.numero_actual) : prev.numeroRemision,
                      }));
                      if (errors.prefijo) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.prefijo;
                          return n;
                        });
                      }
                    }}
                  >
                    <SelectTrigger
                      id="prefijo"
                      className={errors.prefijo ? 'border-destructive' : ''}
                    >
                      <SelectValue
                        placeholder={
                          rangosRemision.length === 0
                            ? 'Configura un rango primero'
                            : 'Seleccionar prefijo...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {rangosRemision.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No hay rangos activos. Créalos en Configuración → Viajes → Rangos de Numeración.
                        </div>
                      ) : (
                        rangosRemision.map((r) => (
                          <SelectItem key={r.id} value={r.prefijo}>
                            {r.prefijo}{' '}
                            <span className="text-xs text-muted-foreground">
                              (próximo: {r.numero_actual})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.prefijo && <p className="text-xs text-destructive">{errors.prefijo}</p>}
                </div>

                {/* Número de Remisión — se auto-rellena con el consecutivo
                    del rango seleccionado, pero el usuario puede editarlo
                    manualmente si necesita saltar/repetir un número. */}
                <div className="space-y-1.5">
                  <Label htmlFor="numeroRemision" className="flex items-center gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5" />
                    Número de Remisión
                  </Label>
                  <Input
                    id="numeroRemision"
                    placeholder={formData.prefijo ? 'Consecutivo del rango' : 'Selecciona un prefijo primero'}
                    value={formData.numeroRemision}
                    onChange={(e) => handleInputChange('numeroRemision', e.target.value)}
                    className={errors.numeroRemision ? 'border-destructive' : ''}
                  />
                  {errors.numeroRemision && (
                    <p className="text-xs text-destructive">{errors.numeroRemision}</p>
                  )}
                </div>
              </div>

              {/* Segunda sección: datos del despacho (transportador, vehículo, destino, hora). */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Transportador (empresa) */}
                <div className="space-y-1.5">
                  <Label htmlFor="transportador" className="flex items-center gap-2 text-sm">
                    <Truck className="h-3.5 w-3.5" />
                    Transportador
                  </Label>
                  <Select
                    value={formData.transportadorId}
                    onValueChange={handleTransportadorChange}
                  >
                    <SelectTrigger
                      id="transportador"
                      className={errors.transportadorId ? 'border-destructive' : ''}
                    >
                      <SelectValue placeholder="Seleccionar transportador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {transportadores.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.empresaRazonSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.transportadorId && (
                    <p className="text-xs text-destructive">{errors.transportadorId}</p>
                  )}
                </div>

                {/* Conductor (auto) */}
                <div className="space-y-1.5">
                  <Label htmlFor="conductor" className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5" />
                    Conductor
                  </Label>
                  <Input
                    id="conductor"
                    placeholder="Selecciona un transportador primero"
                    value={formData.conductor}
                    disabled
                    className={`bg-muted ${errors.conductor ? 'border-destructive' : ''}`}
                  />
                  {errors.conductor && <p className="text-xs text-destructive">{errors.conductor}</p>}
                </div>

                {/* Placa (auto) */}
                <div className="space-y-1.5">
                  <Label htmlFor="placaVehiculo" className="flex items-center gap-2 text-sm">
                    <Truck className="h-3.5 w-3.5" />
                    Placa del Vehículo
                  </Label>
                  <Input
                    id="placaVehiculo"
                    placeholder="Selecciona un transportador primero"
                    value={formData.placaVehiculo}
                    disabled
                    className={`bg-muted ${errors.placaVehiculo ? 'border-destructive' : ''}`}
                  />
                  {errors.placaVehiculo && (
                    <p className="text-xs text-destructive">{errors.placaVehiculo}</p>
                  )}
                </div>

                {/* Extractora */}
                <div className="space-y-1.5">
                  <Label htmlFor="extractora" className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    Extractora Destino
                  </Label>
                  <Select
                    value={formData.extractoraId}
                    onValueChange={(v) => handleInputChange('extractoraId', v)}
                  >
                    <SelectTrigger
                      id="extractora"
                      className={errors.extractoraId ? 'border-destructive' : ''}
                    >
                      <SelectValue placeholder="Seleccionar extractora..." />
                    </SelectTrigger>
                    <SelectContent>
                      {extractoras.map((ext) => (
                        <SelectItem key={ext.id} value={String(ext.id)}>
                          {ext.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.extractoraId && (
                    <p className="text-xs text-destructive">{errors.extractoraId}</p>
                  )}
                </div>

                {/* Hora de Salida */}
                <div className="space-y-1.5">
                  <Label htmlFor="horaSalida" className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    Hora de Salida
                  </Label>
                  <Input
                    id="horaSalida"
                    type="time"
                    value={formData.horaSalida}
                    onChange={(e) => handleInputChange('horaSalida', e.target.value)}
                    className={errors.horaSalida ? 'border-destructive' : ''}
                  />
                  {errors.horaSalida && <p className="text-xs text-destructive">{errors.horaSalida}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/viajes')}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={guardando}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Viaje'}
          </Button>
        </div>
      </form>
    </div>
  );
}
