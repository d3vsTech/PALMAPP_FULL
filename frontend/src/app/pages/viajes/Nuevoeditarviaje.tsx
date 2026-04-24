import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  ArrowLeft,
  Truck,
  User,
  MapPin,
  Package,
  Scale,
  Calendar,
  Save,
  X
} from 'lucide-react';

import {
  viajesApi,
  empresasTransportadorasApi,
  extractorasApi,
  type EmpresaTransportadoraSelect,
  type TransportadorSelect,
  type ExtractoraSelect,
} from '../../../api/viajes';

interface Lote {
  id: string;
  nombre: string;
}

// Datos cargados desde API

export default function NuevoEditarViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;

  const [formData, setFormData] = useState({
    fecha:         new Date().toISOString().split('T')[0],
    empresaId:     '',
    transportadorId: '',
    placaVehiculo: '',
    conductor:     '',
    extractoraId:  '',
    horaSalida:    '',
    observaciones: '',
    esHomogeneo:   true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // ── Selects desde API ────────────────────────────────────────────────────
  const [empresas,       setEmpresas]       = useState<EmpresaTransportadoraSelect[]>([]);
  const [transportadores,setTransportadores] = useState<TransportadorSelect[]>([]);
  const [extractoras,    setExtractoras]    = useState<ExtractoraSelect[]>([]);
  const [loadingInit,    setLoadingInit]    = useState(true);
  const [loadingTransp,  setLoadingTransp]  = useState(false);

  // Cargar empresas + extractoras al montar
  useEffect(() => {
    (async () => {
      try {
        const [empRes, extRes] = await Promise.all([
          empresasTransportadorasApi.select(),
          extractorasApi.select(),
        ]);
        setEmpresas(empRes.data ?? []);
        setExtractoras(extRes.data ?? []);
      } catch (e) { console.warn('select error', e); }
      finally { setLoadingInit(false); }
    })();
  }, []);

  // Cargar transportadores cuando cambia la empresa
  useEffect(() => {
    if (!formData.empresaId) { setTransportadores([]); return; }
    setLoadingTransp(true);
    empresasTransportadorasApi
      .transportadoresDe(Number(formData.empresaId))
      .then(r => setTransportadores(r.data ?? []))
      .catch(() => setTransportadores([]))
      .finally(() => setLoadingTransp(false));
  }, [formData.empresaId]);

  // Cargar viaje en modo edición
  useEffect(() => {
    if (!esEdicion || !id) return;
    (async () => {
      try {
        const res = await viajesApi.ver(Number(id));
        const v = res.data;
        setFormData({
          fecha:           v.fecha_viaje,
          empresaId:       String(v.empresa?.id ?? ''),
          transportadorId: String(v.transportador?.id ?? ''),
          placaVehiculo:   v.placa_vehiculo,
          conductor:       v.nombre_conductor,
          extractoraId:    String(v.extractora?.id ?? ''),
          horaSalida:      v.hora_salida?.slice(0,5) ?? '',
          observaciones:   v.observaciones ?? '',
          esHomogeneo:     v.es_homogeneo ?? true,
        });
      } catch { /* viaje no encontrado */ }
    })();
  }, [id, esEdicion]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error al escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleLote = (loteId: string) => {
    setFormData(prev => ({
      ...prev,
      lotesSeleccionados: prev.lotesSeleccionados.includes(loteId)
        ? prev.lotesSeleccionados.filter(id => id !== loteId)
        : [...prev.lotesSeleccionados, loteId]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fecha)           newErrors.fecha = 'La fecha es requerida';
    if (!formData.empresaId)       newErrors.empresaId = 'Seleccione un transportador';
    if (!formData.transportadorId) newErrors.transportadorId = 'Seleccione un conductor';
    if (!formData.extractoraId)    newErrors.extractoraId = 'Seleccione una extractora';
    if (!formData.horaSalida)      newErrors.horaSalida = 'La hora de salida es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setGuardando(true);
    try {
      const payload = {
        fecha_viaje:      formData.fecha,
        hora_salida:      formData.horaSalida,
        transportador_id: Number(formData.transportadorId),
        extractora_id:    Number(formData.extractoraId),
        observaciones:    formData.observaciones || null,
        es_homogeneo:     formData.esHomogeneo,
      };
      if (esEdicion && id) {
        await viajesApi.editar(Number(id), payload);
      } else {
        await viajesApi.crear(payload);
      }
      navigate('/viajes');
    } catch (err: any) {
      alert(err?.message ?? 'Error al guardar viaje');
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
                  value={formData.placaVehiculo}
                  onChange={(e) => handleInputChange('placaVehiculo', e.target.value.toUpperCase())}
                  className={errors.placaVehiculo ? 'border-destructive' : ''}
                />
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
                  onChange={(e) => handleInputChange('extractora', e.target.value)}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    errors.extractora ? 'border-destructive' : 'border-input'
                  }`}
                >
                  <option value="">Seleccionar extractora...</option>
                  {extractorasMock.map((extractora) => (
                    <option key={extractora} value={extractora}>
                      {extractora}
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
          <Button type="submit" className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" />
            {esEdicion ? 'Guardar Cambios' : 'Crear Viaje'}
          </Button>
        </div>
      </form>
    </div>
  );
}