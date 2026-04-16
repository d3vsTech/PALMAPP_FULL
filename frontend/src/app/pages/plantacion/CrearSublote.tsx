/**
 * CrearSublote.tsx
 * §3.3 POST /sublotes — lote_id*, nombre*, cantidad_palmas? (0-99999)
 *   - cantidad_palmas <= 5000 → sync (201, sin palmas_async)
 *   - cantidad_palmas > 5000  → async (201 con palmas_async:true + batch_id)
 * §4.6 GET /palmas/batch/{id} — polling cada 3s mientras finished===false
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

  const [nombre, setNombre]           = useState('');
  const [cantidad, setCantidad]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [batch, setBatch]             = useState<BatchStatus | null>(null);

  // §4.6 Polling mientras batch no finaliza
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

      const res = await sublotesApi.crear(body);  // §3.3

      if (res.palmas_async === true && res.batch_id) {
        // Async: palmas > 5000 → polling
        toast.info(`Sublote creado. Creando ${cant.toLocaleString('es-CO')} palmas en segundo plano...`);
        pollBatch(res.batch_id);
      } else {
        // Sync: palmas <= 5000
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/plantacion/lote/${loteId}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="h-10 w-10 text-success" /> Nuevo Sublote
          </h1>
          <p className="text-muted-foreground mt-1">Crea un sublote dentro del lote</p>
        </div>
      </div>

      {/* Barra de progreso §4.6 */}
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

      <Card className="border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Sublote</CardTitle>
          <CardDescription>Nombre y cantidad inicial de palmas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base">
                Nombre del Sublote <span className="text-destructive">*</span>
              </Label>
              <Input placeholder="Ej: Sublote A1, Norte 1" maxLength={50}
                value={nombre} onChange={e => setNombre(e.target.value)}
                className="h-12 text-base" autoFocus />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Cantidad de Palmas (opcional)</Label>
              {/* §3.3: 0-99999; >5000 → async */}
              <Input type="number" min="0" max="99999"
                placeholder="Dejar vacío si se agregarán después"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Si ingresas una cantidad, las palmas se crean automáticamente.
                Más de 5.000 se procesarán en segundo plano.
              </p>
            </div>

            {nombre && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Formato de códigos: <span className="font-mono text-primary">{nombre}-001</span>,{' '}
                  <span className="font-mono text-primary">{nombre}-002</span>, ...
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`)} className="flex-1 h-12">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 h-12 bg-success hover:bg-success/90 text-primary shadow-lg shadow-success/20">
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