import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Check,
  Truck,
} from 'lucide-react';
import {
  viajesApi,
  empresasTransportadorasApi,
  extractorasApi,
  type TransportadorSelect,
  type ExtractoraSelect,
  type EmpresaTransportadoraSelect,
} from '../../../api/viajes';
import { toast } from 'sonner';

/**
 * Pantalla "Crear Nuevo Viaje" — replica exacta del diseño .zip,
 * conectada con el contrato de API_VIAJES.md (3 estados).
 *
 * Flujo:
 *  1. Carga empresas + extractoras al montar.
 *  2. Para cada empresa, carga sus transportadores (conductores).
 *  3. El usuario elige un transportador del único Select "Transportador".
 *  4. Conductor y Placa se rellenan automáticamente (disabled, bg-muted).
 *  5. Submit envía: { fecha_viaje, hora_salida, transportador_id, extractora_id }.
 */
export default function NuevoEditarViaje() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    placaVehiculo: '',
    conductor: '',
    transportadorId: '',
    extractoraId: '',
    horaSalida: '',
  });

  const [guardando, setGuardando] = useState(false);

  // Datos del API
  const [empresas, setEmpresas] = useState<EmpresaTransportadoraSelect[]>([]);
  const [transportadores, setTransportadores] = useState<
    Array<TransportadorSelect & { empresaRazonSocial: string }>
  >([]);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);

  // Carga inicial
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

  // Modo edición: cargar viaje existente
  useEffect(() => {
    if (!esEdicion || !id) return;
    (async () => {
      try {
        const res = await viajesApi.ver(Number(id));
        const v = res.data as any;
        setFormData({
          fecha: String(v.fecha_viaje ?? ''),
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
  };

  const puedeGuardar =
    formData.fecha !== '' &&
    formData.placaVehiculo.trim() !== '' &&
    formData.conductor.trim() !== '' &&
    formData.transportadorId !== '' &&
    formData.extractoraId !== '' &&
    formData.horaSalida !== '';

  const guardarViaje = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      // `es_homogeneo` no va en el payload: lo calcula el backend al agregar /
      // quitar detalles de cosecha (§5.1 + §6.1 del doc API_VIAJES.md).
      const payload = {
        fecha_viaje: formData.fecha,
        hora_salida: formData.horaSalida,
        transportador_id: Number(formData.transportadorId),
        extractora_id: Number(formData.extractoraId),
        observaciones: null,
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
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
            {esEdicion
              ? 'Modifica la información del viaje'
              : 'Registra un nuevo despacho de fruto'}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-5xl mx-auto">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Información General</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Datos básicos del viaje
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del Viaje *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange('fecha', e.target.value)}
                />
              </div>

              {/* Transportador */}
              <div className="space-y-2">
                <Label htmlFor="transportador">Transportador *</Label>
                <Select
                  value={formData.transportadorId}
                  onValueChange={handleTransportadorChange}
                >
                  <SelectTrigger id="transportador">
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
              </div>

              {/* Conductor (auto) */}
              <div className="space-y-2">
                <Label htmlFor="conductor">Conductor *</Label>
                <Input
                  id="conductor"
                  placeholder="Selecciona un transportador primero"
                  value={formData.conductor}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Placa (auto) */}
              <div className="space-y-2">
                <Label htmlFor="placaVehiculo">Placa del Vehículo *</Label>
                <Input
                  id="placaVehiculo"
                  placeholder="Selecciona un transportador primero"
                  value={formData.placaVehiculo}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Extractora */}
              <div className="space-y-2">
                <Label htmlFor="extractora">Extractora Destino *</Label>
                <Select
                  value={formData.extractoraId}
                  onValueChange={(value) => handleInputChange('extractoraId', value)}
                >
                  <SelectTrigger id="extractora">
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
              </div>

              {/* Hora de salida */}
              <div className="space-y-2">
                <Label htmlFor="horaSalida">Hora de Salida *</Label>
                <Input
                  id="horaSalida"
                  type="time"
                  value={formData.horaSalida}
                  onChange={(e) => handleInputChange('horaSalida', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/viajes')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Button>

          <Button
            onClick={guardarViaje}
            disabled={!puedeGuardar || guardando}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <Check className="h-4 w-4" />
            {guardando
              ? 'Guardando...'
              : esEdicion
              ? 'Guardar Cambios'
              : 'Crear Viaje'}
          </Button>
        </div>
      </div>
    </div>
  );
}