/**
 * CrearSublote.tsx
 * §3.3 POST /sublotes — lote_id*, nombre*, cantidad_palmas?
 * §4.6 GET /palmas/batch/{id} — polling cada 3s
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Sprout, Loader2 } from 'lucide-react';
import { sublotesApi, palmasApi, type BatchStatus } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearSublote() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');

  const [nombre, setNombre]     = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading]   = useState(false);
  const [batch, setBatch]       = useState<BatchStatus | null>(null);

  const pollBatch = async (batchId: string) => {
    const INTERVAL = 3_000;
    const TIMEOUT  = 600_000;
    const start    = Date.now();
    while (Date.now() - start < TIMEOUT) {
      await new Promise(r => setTimeout(r, INTERVAL));
      try {
        const res = await palmasApi.getBatch(batchId);
        setBatch(res.data);
        if (res.data.finished) {
          if (res.data.has_failures) {
            toast.error('El sublote se creó pero hubo un error creando las palmas');
          } else {
            toast.success('Sublote y palmas creados correctamente');
          }
          setLoading(false);
          navigate(`/plantacion/lote/${loteId}`);
          return;
        }
      } catch { break; }
    }
    setLoading(false);
    toast.error('Tiempo de espera agotado');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!loteId)        { toast.error('Lote no especificado'); return; }
    const cant = cantidad ? parseInt(cantidad) : 0;
    if (cantidad && (isNaN(cant) || cant < 0 || cant > 99999)) {
      toast.error('La cantidad debe estar entre 0 y 99.999'); return;
    }
    setLoading(true);
    setBatch(null);
    try {
      const body: any = { lote_id: Number(loteId), nombre: nombre.trim() };
      if (cant > 0) body.cantidad_palmas = cant;
      const res = await sublotesApi.crear(body);
      if (res.palmas_async === true && res.batch_id) {
        toast.info(`Sublote creado. Creando ${cant.toLocaleString('es-CO')} palmas en segundo plano...`);
        pollBatch(res.batch_id);
      } else {
        toast.success(res.message ?? 'Sublote creado correctamente');
        setLoading(false);
        navigate(`/plantacion/lote/${loteId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear sublote');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/plantacion/lote/${loteId}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Sprout className="h-10 w-10 text-success" />
            Nuevo Sublote
          </h1>
          <p className="text-muted-foreground mt-1">Crea un nuevo sublote dentro del lote</p>
        </div>
      </div>

      {/* Barra de progreso batch */}
      {loading && batch && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-primary font-medium">Creando palmas en segundo plano...</span>
              <span className="text-muted-foreground">{batch.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${batch.progress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-subtle border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Sublote</CardTitle>
          <CardDescription>
            Ingresa el nombre del sublote. La cantidad de palmas se actualizará automáticamente al agregar líneas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombreSublote" className="text-base">
                Nombre del Sublote <span className="text-destructive">*</span>
              </Label>
              <Input id="nombreSublote" placeholder="Ej: Sublote A1, Norte 1, Sector B" maxLength={50}
                value={nombre} onChange={e => setNombre(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Usa un nombre descriptivo que te ayude a identificar este sublote fácilmente
              </p>
            </div>

            {/* Cantidad de palmas */}
            <div className="space-y-2">
              <Label className="text-base">Cantidad de Palmas <span className="text-muted-foreground text-sm font-normal">(opcional)</span></Label>
              <Input type="number" min="0" max="99999"
                placeholder="Dejar vacío si se agregarán después"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Si ingresas una cantidad, las palmas se crean automáticamente. Más de 5.000 se procesarán en segundo plano.
              </p>
            </div>

            {/* Preview de código */}
            {nombre && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Formato de códigos: <span className="font-mono text-primary">{nombre}-001</span>,{' '}
                  <span className="font-mono text-primary">{nombre}-002</span>, ...
                </p>
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex gap-3">
                <Sprout className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• La cantidad de palmas se calculará automáticamente al agregar líneas</li>
                    <li>• El sublote se creará en estado <strong>Activo</strong></li>
                    <li>• Podrás gestionar líneas y palmas después de crear el sublote</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`)}
                className="flex-1 h-12 text-base">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
                {loading
                  ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Creando...</>
                  : <><Sprout className="h-5 w-5 mr-2" />Crear Sublote</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}