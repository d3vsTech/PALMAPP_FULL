import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft, Truck, User, MapPin, Calendar, Save, X,
} from 'lucide-react';
import {
  viajesApi, empresasTransportadorasApi, extractorasApi,
  type TransportadorSelect,
  type ExtractoraSelect,
} from '../../../api/viajes';
import { toast } from 'sonner';

/**
 * Visual idéntico al diseño23 NuevoEditarViaje. Inputs editables manuales para
 * Placa / Conductor / Transportador. Internamente cargamos todos los transportadores
 * del API y al escribir la placa hacemos auto-match para resolver `transportador_id`.
 */
export default function NuevoEditarViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    placaVehiculo: '',
    conductor: '',
    transportador: '',
    extractora: '', // razon_social de la extractora seleccionada (visualmente)
    extractoraId: '', // id real para enviar al API
    horaSalida: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Datos del API
  const [transportadores, setTransportadores] = useState<TransportadorSelect[]>([]);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);

  // Mapas para búsqueda rápida por placa
  const transportadoresPorPlaca = useMemo(() => {
    const m = new Map<string, TransportadorSelect>();
    for (const t of transportadores) {
      if (t.placa_vehiculo) m.set(t.placa_vehiculo.trim().toUpperCase(), t);
    }
    return m;
  }, [transportadores]);

  // ── carga inicial: extractoras + (todas las empresas → transportadores)
  useEffect(() => {
    (async () => {
      try {
        const [empR, extR] = await Promise.all([
          empresasTransportadorasApi.select(),
          extractorasApi.select(),
        ]);
        setExtractoras(extR.data ?? []);
        const empresas = empR.data ?? [];
        if (empresas.length > 0) {
          const transResults = await Promise.all(
            empresas.map(e =>
              empresasTransportadorasApi
                .transportadoresDe(Number(e.id))
                .then(r => r.data ?? [])
                .catch(() => [] as TransportadorSelect[])
            )
          );
          setTransportadores(transResults.flat());
        }
      } catch (e) { console.warn('selects error', e); }
    })();
  }, []);

  // ── modo edición: cargar viaje
  useEffect(() => {
    if (!esEdicion || !id) return;
    (async () => {
      try {
        const res = await viajesApi.ver(Number(id));
        const v = res.data as any;
        setFormData({
          fecha:         String(v.fecha_viaje ?? ''),
          placaVehiculo: String(v.placa_vehiculo ?? ''),
          conductor:     String(v.nombre_conductor ?? ''),
          transportador: String(v.empresa?.razon_social ?? v.empresa_transportadora?.razon_social ?? ''),
          extractora:    String(v.extractora?.razon_social ?? ''),
          extractoraId:  String(v.extractora?.id ?? v.extractora_id ?? ''),
          horaSalida:    String(v.hora_salida ?? '').slice(0, 5),
        });
      } catch { navigate('/viajes'); }
    })();
  }, [id, esEdicion, navigate]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value as any }));
    if (errors[field]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  // Auto-match al escribir la placa: busca el transportador y rellena conductor + transportador
  const handlePlacaChange = (raw: string) => {
    const value = raw.toUpperCase();
    const t = transportadoresPorPlaca.get(value.trim());
    setFormData(prev => ({
      ...prev,
      placaVehiculo: value,
      ...(t ? {
        conductor: `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim(),
        transportador: (t as any).empresa_transportadora?.razon_social
                    ?? (t as any).empresa?.razon_social
                    ?? prev.transportador,
      } : {}),
    }));
    if (errors.placaVehiculo) {
      setErrors(prev => { const n = { ...prev }; delete n.placaVehiculo; return n; });
    }
  };

  // Cuando se elige extractora del select, guardamos su id para el API
  const handleExtractoraChange = (razonSocial: string) => {
    const ext = extractoras.find(e => e.razon_social === razonSocial);
    setFormData(prev => ({
      ...prev,
      extractora: razonSocial,
      extractoraId: ext ? String(ext.id) : '',
    }));
    if (errors.extractora) {
      setErrors(prev => { const n = { ...prev }; delete n.extractora; return n; });
    }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.fecha)                  e.fecha          = 'La fecha es requerida';
    if (!formData.placaVehiculo.trim())   e.placaVehiculo  = 'La placa del vehículo es requerida';
    if (!formData.conductor.trim())       e.conductor      = 'El conductor es requerido';
    if (!formData.transportador.trim())   e.transportador  = 'El transportador es requerido';
    if (!formData.extractora)             e.extractora     = 'Debe seleccionar una extractora';
    if (!formData.horaSalida)             e.horaSalida     = 'La hora de salida es requerida';

    // Validar que la placa exista en el catálogo del API
    const t = transportadoresPorPlaca.get(formData.placaVehiculo.trim().toUpperCase());
    if (formData.placaVehiculo.trim() && !t) {
      e.placaVehiculo = 'Placa no encontrada — debe estar registrada en el catálogo';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const t = transportadoresPorPlaca.get(formData.placaVehiculo.trim().toUpperCase());
    if (!t) { toast.error('Transportador no encontrado'); return; }

    setGuardando(true);
    try {
      const payload = {
        fecha_viaje:      formData.fecha,
        hora_salida:      formData.horaSalida,
        transportador_id: Number(t.id),
        extractora_id:    Number(formData.extractoraId),
        observaciones:    null,
        es_homogeneo:     true,
      };
      if (esEdicion && id) {
        await viajesApi.editar(Number(id), payload);
        toast.success('Viaje actualizado');
      } else {
        await viajesApi.crear(payload);
        toast.success('Viaje creado');
      }
      navigate('/viajes');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar viaje');
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

      {/* Header */}
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
          <h1 className="text-4xl font-bold text-foreground">
            {esEdicion ? 'Editar Viaje' : 'Nuevo Viaje'}
          </h1>
          <p className="text-muted-foreground">
            {esEdicion ? 'Modifica la información del viaje' : 'Registra un nuevo despacho de fruto'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
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

                {/* Placa del Vehículo */}
                <div className="space-y-1.5">
                  <Label htmlFor="placaVehiculo" className="flex items-center gap-2 text-sm">
                    <Truck className="h-3.5 w-3.5" />
                    Placa del Vehículo
                  </Label>
                  <Input
                    id="placaVehiculo"
                    placeholder="ABC-123"
                    list="placas-list"
                    value={formData.placaVehiculo}
                    onChange={(e) => handlePlacaChange(e.target.value)}
                    className={errors.placaVehiculo ? 'border-destructive' : ''}
                  />
                  <datalist id="placas-list">
                    {transportadores.map(t => t.placa_vehiculo && (
                      <option key={t.id} value={t.placa_vehiculo}>
                        {`${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim()}
                      </option>
                    ))}
                  </datalist>
                  {errors.placaVehiculo && <p className="text-xs text-destructive">{errors.placaVehiculo}</p>}
                </div>

                {/* Conductor */}
                <div className="space-y-1.5">
                  <Label htmlFor="conductor" className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5" />
                    Conductor
                  </Label>
                  <Input
                    id="conductor"
                    placeholder="Nombre completo del conductor"
                    value={formData.conductor}
                    onChange={(e) => handleInputChange('conductor', e.target.value)}
                    className={errors.conductor ? 'border-destructive' : ''}
                  />
                  {errors.conductor && <p className="text-xs text-destructive">{errors.conductor}</p>}
                </div>

                {/* Transportador */}
                <div className="space-y-1.5">
                  <Label htmlFor="transportador" className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5" />
                    Transportador
                  </Label>
                  <Input
                    id="transportador"
                    placeholder="Nombre del transportador"
                    value={formData.transportador}
                    onChange={(e) => handleInputChange('transportador', e.target.value)}
                    className={errors.transportador ? 'border-destructive' : ''}
                  />
                  {errors.transportador && <p className="text-xs text-destructive">{errors.transportador}</p>}
                </div>

                {/* Extractora */}
                <div className="space-y-1.5">
                  <Label htmlFor="extractora" className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    Extractora Destino
                  </Label>
                  <select
                    id="extractora"
                    value={formData.extractora}
                    onChange={(e) => handleExtractoraChange(e.target.value)}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      errors.extractora ? 'border-destructive' : 'border-input'
                    }`}
                  >
                    <option value="">Seleccionar extractora...</option>
                    {extractoras.map((ext) => (
                      <option key={ext.id} value={ext.razon_social}>
                        {ext.razon_social}
                      </option>
                    ))}
                  </select>
                  {errors.extractora && <p className="text-xs text-destructive">{errors.extractora}</p>}
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

        {/* Botones de Acción */}
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
          <Button type="submit" disabled={guardando} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" />
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Viaje'}
          </Button>
        </div>
      </form>
    </div>
  );
}