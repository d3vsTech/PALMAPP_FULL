import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import { ArrowLeft, Check, Truck, Loader2 } from 'lucide-react';
import {
  empresasTransportadorasApi,
  extractorasApi,
  viajesApi,
  type EmpresaTransportadoraSelect,
  type TransportadorSelect,
  type ExtractoraSelect,
} from '../../../api/viajes';
import { toast } from 'sonner';

export default function NuevoViajeWizard() {
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaSalida, setHoraSalida] = useState('');
  const [empresaId, setEmpresaId] = useState<string>('');
  const [transportadorId, setTransportadorId] = useState<string>('');
  const [extractoraId, setExtractoraId] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  const [empresas, setEmpresas] = useState<EmpresaTransportadoraSelect[]>([]);
  const [transportadores, setTransportadores] = useState<TransportadorSelect[]>([]);
  const [extractoras, setExtractoras] = useState<ExtractoraSelect[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTransp, setLoadingTransp] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, extRes] = await Promise.all([
          empresasTransportadorasApi.select(),
          extractorasApi.select(),
        ]);
        setEmpresas(empRes.data ?? []);
        setExtractoras(extRes.data ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!empresaId) { setTransportadores([]); setTransportadorId(''); return; }
    setLoadingTransp(true);
    setTransportadorId('');
    empresasTransportadorasApi
      .transportadoresDe(Number(empresaId))
      .then((r) => setTransportadores(r.data ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar conductores'))
      .finally(() => setLoadingTransp(false));
  }, [empresaId]);

  const transportadorSel = transportadores.find((t) => String(t.id) === transportadorId);
  const placaVehiculo = transportadorSel?.placa_vehiculo ?? '';
  const puedeGuardar = Boolean(fecha && horaSalida && empresaId && transportadorId && extractoraId);

  const guardarViaje = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const res = await viajesApi.crear({
        fecha_viaje: fecha,
        hora_salida: horaSalida,
        transportador_id: Number(transportadorId),
        extractora_id: Number(extractoraId),
        observaciones: observaciones.trim() || null,
        es_homogeneo: true,
      });
      toast.success(`Viaje creado: ${res.data.remision}`);
      navigate('/viajes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el viaje');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/viajes')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Nuevo Viaje</h1>
          </div>
          <p className="text-muted-foreground ml-14">Registra un nuevo despacho de fruto</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Información General</CardTitle>
                <p className="text-sm text-muted-foreground">Datos básicos del viaje</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingInit ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando datos...
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha del Viaje *</Label>
                  <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa">Transportador *</Label>
                  <Select value={empresaId} onValueChange={setEmpresaId}>
                    <SelectTrigger id="empresa"><SelectValue placeholder="Seleccionar transportador..." /></SelectTrigger>
                    <SelectContent>
                      {empresas.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.razon_social}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conductor">Conductor *</Label>
                  <Select value={transportadorId} onValueChange={setTransportadorId} disabled={!empresaId || loadingTransp}>
                    <SelectTrigger id="conductor">
                      <SelectValue placeholder={!empresaId ? 'Selecciona transportador primero' : loadingTransp ? 'Cargando...' : 'Seleccionar conductor...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {transportadores.map((t) => (<SelectItem key={t.id} value={String(t.id)}>{t.nombres} {t.apellidos}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa del Vehículo *</Label>
                  <Input id="placa" placeholder="Selecciona un conductor" value={placaVehiculo} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extractora">Extractora Destino *</Label>
                  <Select value={extractoraId} onValueChange={setExtractoraId}>
                    <SelectTrigger id="extractora"><SelectValue placeholder="Seleccionar extractora..." /></SelectTrigger>
                    <SelectContent>
                      {extractoras.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.razon_social}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Hora de Salida *</Label>
                  <Input id="hora" type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input id="observaciones" placeholder="Opcional..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate('/viajes')} className="gap-2" disabled={guardando}>
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={guardarViaje} disabled={!puedeGuardar || guardando} className="gap-2 bg-success hover:bg-success/90">
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {guardando ? 'Creando...' : 'Crear Viaje'}
          </Button>
        </div>
      </div>
    </div>
  );
}