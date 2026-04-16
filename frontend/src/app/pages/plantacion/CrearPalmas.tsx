/**
 * CrearPalmas.tsx
 * §4.3 POST /palmas — sublote_id*, cantidad_palmas* (1-99999), linea_id (condicional)
 *   <= 5000 → 201 sync  (async:false, cantidad_creada)
 *   > 5000  → 202 async (async:true,  batch_id)
 *   linea_id OBLIGATORIO si el sublote tiene líneas (422 si no se envía)
 * §4.6 GET /palmas/batch/{id} — polling cada 3s, timeout 10min
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Leaf, AlertCircle, Loader2 } from 'lucide-react';
import { palmasApi, type BatchStatus } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearPalmas() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');
  const subloteId      = sp.get('subloteId');
  const lineaId        = sp.get('lineaId');          // presente si el sublote tiene líneas
  const numeroLinea    = sp.get('numeroLinea') ?? '';
  const nombreSublote  = sp.get('nombreSublote') ?? 'Sublote';
  const palmasExist    = parseInt(sp.get('palmasExistentes') ?? '0');

  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading]   = useState(false);
  const [batch, setBatch]       = useState<BatchStatus | null>(null);

  // §4.6 Polling cada 3s hasta finished===true (máximo 10 min)
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
            toast.error('Ocurrió un error al crear las palmas. Puede reintentar.');
          } else {
            toast.success('Palmas creadas correctamente');
          }
          setLoading(false);
          navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } });
          return;
        }
      } catch { break; }
    }
    setLoading(false);
    toast.error('Tiempo de espera agotado');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(cantidad);
    if (!cantidad.trim() || isNaN(cant) || cant < 1 || cant > 99999) {
      toast.error('Ingresa una cantidad entre 1 y 99.999'); return;
    }
    if (!subloteId) { toast.error('Sublote no especificado'); return; }

    setLoading(true);
    setBatch(null);
    try {
      // §4.3: linea_id obligatorio si el sublote tiene líneas
      const body: any = { sublote_id: Number(subloteId), cantidad_palmas: cant };
      if (lineaId) body.linea_id = Number(lineaId);

      const res = await palmasApi.crear(body);

      if (res.async === true) {
        // 202 async
        toast.info(`Creando ${cant.toLocaleString('es-CO')} palmas en segundo plano...`);
        pollBatch(res.batch_id);
      } else {
        // 201 sync
        toast.success(res.message ?? `${res.cantidad_creada} palmas creadas correctamente`);
        setLoading(false);
        navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear palmas');
      setLoading(false);
    }
  };

  // Vista previa de códigos (formato del API: {nombre_sublote}-{contador_3_digitos})
  const preview = () => {
    const n = parseInt(cantidad);
    if (isNaN(n) || n < 1) return [];
    return Array.from({ length: Math.min(n, 5) }, (_, i) =>
      `${nombreSublote}-${String(palmasExist + i + 1).padStart(3, '0')}`
    );
  };
  const codes = preview();

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/plantacion/lote/${loteId}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Leaf className="h-10 w-10 text-success" /> Agregar Palmas
          </h1>
          <p className="text-muted-foreground mt-1">
            {lineaId
              ? <>Línea <strong className="text-primary">{numeroLinea}</strong> de <strong className="text-primary">{nombreSublote}</strong></>
              : <>Sublote <strong className="text-primary">{nombreSublote}</strong></>}
          </p>
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
          <CardTitle className="text-2xl">Cantidad de Palmas</CardTitle>
          <CardDescription>Los códigos se generan secuencialmente dentro del sublote</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen */}
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sublote</p>
                  <p className="font-semibold text-primary">{nombreSublote}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Palmas actuales</p>
                  <p className="font-semibold text-success">{palmasExist.toLocaleString('es-CO')}</p>
                </div>
                {lineaId && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Línea</p>
                    <p className="font-semibold text-primary">Línea {numeroLinea}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">
                Cantidad de Palmas <span className="text-destructive">*</span>
              </Label>
              {/* §4.3: 1-99999; >5000 → async */}
              <Input type="number" min="1" max="99999" placeholder="Ej: 100"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Entre 1 y 99.999. Más de 5.000 se procesan en segundo plano.
              </p>
            </div>

            {codes.length > 0 && (
              <div className="rounded-xl bg-success/5 border border-success/20 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-success mb-2">Vista previa de códigos</p>
                    <div className="flex flex-wrap gap-2">
                      {codes.map((c, i) => (
                        <span key={i} className="text-sm font-mono text-primary bg-background/70 rounded px-2 py-1">
                          {c}
                        </span>
                      ))}
                      {parseInt(cantidad) > 5 && (
                        <span className="text-sm text-muted-foreground">y {parseInt(cantidad) - 5} más...</span>
                      )}
                    </div>
                  </div>
                </div>
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
                  : <><Leaf className="h-5 w-5 mr-2" />Agregar Palmas</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}