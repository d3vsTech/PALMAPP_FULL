import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Truck, User, MapPin, Calendar, Save, X } from 'lucide-react';
import { Button }      from '../../components/ui/button';
import { Input }       from '../../components/ui/input';
import { Label }       from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  viajesApi, empresasTransportadorasApi, extractorasApi, strField,
  type EmpresaTransportadoraSelect,
  type TransportadorSelect,
  type ExtractoraSelect,
} from '../../../api/viajes';

export default function NuevoEditarViaje() {
  const navigate    = useNavigate();
  const { id }      = useParams<{ id: string }>();
  const esEdicion   = Boolean(id);

  // ── form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    fecha:           new Date().toISOString().split('T')[0],
    empresaId:       '',
    transportadorId: '',
    placaVehiculo:   '',
    conductor:       '',
    extractoraId:    '',
    horaSalida:      '',
    observaciones:   '',
    esHomogeneo:     true,
  });
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // ── selects desde API ──────────────────────────────────────────────────────
  const [empresas,        setEmpresas]        = useState<EmpresaTransportadoraSelect[]>([]);
  const [transportadores, setTransportadores] = useState<TransportadorSelect[]>([]);
  const [extractoras,     setExtractoras]     = useState<ExtractoraSelect[]>([]);
  const [loadingInit,     setLoadingInit]     = useState(true);
  const [loadingTransp,   setLoadingTransp]   = useState(false);

  // Carga inicial: empresas + extractoras
  useEffect(() => {
    (async () => {
      try {
        const [empR, extR] = await Promise.all([
          empresasTransportadorasApi.select(),
          extractorasApi.select(),
        ]);
        setEmpresas(empR.data ?? []);
        setExtractoras(extR.data ?? []);
      } catch (e) { console.warn('selects error', e); }
      finally { setLoadingInit(false); }
    })();
  }, []);

  // Transportadores encadenados a empresa
  useEffect(() => {
    if (!form.empresaId) { setTransportadores([]); return; }
    setLoadingTransp(true);
    empresasTransportadorasApi
      .transportadoresDe(Number(form.empresaId))
      .then(r => setTransportadores(r.data ?? []))
      .catch(() => setTransportadores([]))
      .finally(() => setLoadingTransp(false));
  }, [form.empresaId]);

  // Modo edición: cargar datos del viaje
  useEffect(() => {
    if (!esEdicion || !id) return;
    (async () => {
      try {
        const res = await viajesApi.ver(Number(id));
        const v = res.data as any;
        setForm({
          fecha:           String(v.fecha_viaje ?? ''),
          empresaId:       String(v.empresa?.id ?? v.empresa_transportadora_id ?? ''),
          transportadorId: String(v.transportador?.id ?? v.transportador_id ?? ''),
          placaVehiculo:   String(v.placa_vehiculo ?? ''),
          conductor:       String(v.nombre_conductor ?? ''),
          extractoraId:    String(v.extractora?.id ?? v.extractora_id ?? ''),
          horaSalida:      String(v.hora_salida ?? '').slice(0, 5),
          observaciones:   String(v.observaciones ?? ''),
          esHomogeneo:     Boolean(v.es_homogeneo ?? true),
        });
      } catch { navigate('/viajes'); }
    })();
  }, [id, esEdicion, navigate]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const set = (k: keyof typeof form, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.fecha)           e.fecha           = 'La fecha es requerida';
    if (!form.empresaId)       e.empresaId       = 'Seleccione empresa transportadora';
    if (!form.transportadorId) e.transportadorId = 'Seleccione un conductor';
    if (!form.extractoraId)    e.extractoraId    = 'Seleccione una extractora';
    if (!form.horaSalida)      e.horaSalida      = 'La hora de salida es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        fecha_viaje:      form.fecha,
        hora_salida:      form.horaSalida,
        transportador_id: Number(form.transportadorId),
        extractora_id:    Number(form.extractoraId),
        observaciones:    form.observaciones || null,
        es_homogeneo:     form.esHomogeneo,
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/viajes')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
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
          <CardContent className="space-y-5">

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" /> Fecha del Viaje
              </Label>
              <Input type="date" value={form.fecha}
                onChange={e => set('fecha', e.target.value)}
                className={errors.fecha ? 'border-destructive' : ''} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha}</p>}
            </div>

            {/* Empresa transportadora */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Truck className="h-3.5 w-3.5" /> Empresa Transportadora
              </Label>
              <select
                value={form.empresaId}
                onChange={e => { set('empresaId', e.target.value); set('transportadorId', ''); set('placaVehiculo', ''); set('conductor', ''); }}
                disabled={loadingInit}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.empresaId ? 'border-destructive' : 'border-input'}`}
              >
                <option value="">{loadingInit ? 'Cargando...' : 'Seleccionar empresa...'}</option>
                {empresas.map(e => (
                  <option key={e.id} value={String(e.id)}>{e.razon_social}</option>
                ))}
              </select>
              {errors.empresaId && <p className="text-xs text-destructive">{errors.empresaId}</p>}
            </div>

            {/* Conductor */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" /> Conductor
              </Label>
              <select
                value={form.transportadorId}
                onChange={e => {
                  const t = transportadores.find(t => String(t.id) === e.target.value);
                  set('transportadorId', e.target.value);
                  if (t) {
                    set('placaVehiculo', t.placa_vehiculo ?? '');
                    set('conductor', `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim());
                  }
                }}
                disabled={!form.empresaId || loadingTransp}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.transportadorId ? 'border-destructive' : 'border-input'}`}
              >
                <option value="">
                  {!form.empresaId ? 'Seleccione empresa primero' : loadingTransp ? 'Cargando...' : 'Seleccionar conductor...'}
                </option>
                {transportadores.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {`${t.nombres} ${t.apellidos}`.trim()} — {t.placa_vehiculo}
                    {t.tipo_vehiculo ? ` (${t.tipo_vehiculo})` : ''}
                  </option>
                ))}
              </select>
              {errors.transportadorId && <p className="text-xs text-destructive">{errors.transportadorId}</p>}
            </div>

            {/* Placa (auto-completada, solo visual) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Truck className="h-3.5 w-3.5" /> Placa del Vehículo
              </Label>
              <Input
                value={form.placaVehiculo}
                onChange={e => set('placaVehiculo', e.target.value.toUpperCase())}
                placeholder="Se completa al elegir conductor"
              />
            </div>

            {/* Extractora */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5" /> Extractora Destino
              </Label>
              <select
                value={form.extractoraId}
                onChange={e => set('extractoraId', e.target.value)}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.extractoraId ? 'border-destructive' : 'border-input'}`}
              >
                <option value="">Seleccionar extractora...</option>
                {extractoras.map(ext => (
                  <option key={ext.id} value={String(ext.id)}>
                    {ext.razon_social}{ext.ciudad ? ` — ${ext.ciudad}` : ''}
                  </option>
                ))}
              </select>
              {errors.extractoraId && <p className="text-xs text-destructive">{errors.extractoraId}</p>}
            </div>

            {/* Hora de salida */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" /> Hora de Salida
              </Label>
              <Input type="time" value={form.horaSalida}
                onChange={e => set('horaSalida', e.target.value)}
                className={errors.horaSalida ? 'border-destructive' : ''} />
              {errors.horaSalida && <p className="text-xs text-destructive">{errors.horaSalida}</p>}
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label className="text-sm">Observaciones</Label>
              <textarea
                value={form.observaciones}
                onChange={e => set('observaciones', e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Observaciones opcionales..."
              />
            </div>

            {/* Tipo de cálculo */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="esHomogeneo"
                checked={form.esHomogeneo}
                onChange={e => set('esHomogeneo', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="esHomogeneo" className="text-sm cursor-pointer">
                Cálculo homogéneo — distribuye el peso por igual entre todas las cosechas del viaje
              </Label>
            </div>

          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/viajes')} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
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