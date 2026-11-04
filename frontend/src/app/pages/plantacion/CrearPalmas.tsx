/**
 * CrearPalmas.tsx
 * §4.3 POST /palmas — sublote_id*, cantidad_palmas*, linea_id (obligatorio si sublote tiene líneas)
 * §4.6 GET /palmas/batch/{id} — polling cada 3s
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Leaf, Loader2 } from 'lucide-react';
import { palmasApi, type BatchStatus } from '../../../api/plantacion';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';

export default function CrearPalmas() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');
  const subloteId      = sp.get('subloteId');
  const lineaId        = sp.get('lineaId');
  const numeroLinea    = sp.get('numeroLinea') ?? '';
  const nombreSublote  = sp.get('nombreSublote') ?? 'Sublote';
  const palmasExist    = parseInt(sp.get('palmasExistentes') ?? '0');

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
            toast.error('Ocurrió un error al crear las palmas. Puede reintentar.');
          } else {
            toast.success('Palmas creadas correctamente');
          }
          setLoading(false);
          navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId, recargar: true } });
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
    // Con el trabajo en segundo plano el botón sigue bloqueado hasta que
    // `pollBatch` termine; en cualquier otra salida se libera aquí.
    let enSegundoPlano = false;
    try {
      const body: any = { sublote_id: Number(subloteId), cantidad_palmas: cant };
      if (lineaId) body.linea_id = Number(lineaId);
      const res = await palmasApi.crear(body);
      if (res.async === true) {
        enSegundoPlano = true;
        toast.info(`Creando ${cant.toLocaleString('es-CO')} palmas en segundo plano...`);
        pollBatch(res.batch_id);
      } else {
        toast.success(res.message ?? `${res.cantidad_creada} palmas creadas correctamente`);
        navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId, recargar: true } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear palmas');
    } finally {
      if (!enSegundoPlano) setLoading(false);
    }
  };

  const preview = () => {
    const n = parseInt(cantidad);
    if (isNaN(n) || n < 1) return [];
    return Array.from({ length: Math.min(n, 5) }, (_, i) =>
      `${nombreSublote}-${String(palmasExist + i + 1).padStart(3, '0')}`
    );
  };
  const codes = preview();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backTo={`/plantacion/lote/${loteId}`}
        eyebrow="Mi plantación"
        title={<span className="flex items-center gap-3"><Leaf className="h-9 w-9 text-success" strokeWidth={2} />Agregar palmas</span>}
      />

      {/* Avance del lote de palmas que corre en segundo plano */}
      {loading && batch && (
        <Card className="border-primary/25 bg-primary-soft">
          <CardContent className="space-y-2 py-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-primary">Creando palmas en segundo plano</span>
              <span className="text-muted-foreground tabular-nums">{batch.progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${batch.progress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-2xl">Cantidad de palmas</CardTitle>
          <CardDescription>
            Los códigos se generan solos, en orden, dentro del sublote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Sublote</p>
                  <p className="font-semibold text-primary">{nombreSublote}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Línea</p>
                  <p className="font-semibold text-primary">{lineaId ? `Línea ${numeroLinea}` : '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Palmas existentes</p>
                  <p className="font-semibold tabular-nums text-success">
                    {palmasExist.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad de palmas a agregar <span className="text-destructive">*</span>
              </Label>
              <Input id="cantidadPalmas" type="number" step="1" min="1" max="99999" placeholder="Ej: 100"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Entre 1 y 99.999. Más de 5.000 se procesan en segundo plano.
              </p>
            </div>

            {codes.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <p className="mb-2.5 text-sm font-semibold text-foreground">Así quedarán los códigos</p>
                <div className="flex flex-wrap gap-1.5">
                  {codes.map((c, i) => (
                    <span key={i}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold tabular-nums">
                      {c}
                    </span>
                  ))}
                </div>
                {parseInt(cantidad) > 5 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Y {(parseInt(cantidad) - 5).toLocaleString('es-CO')} palmas más.
                  </p>
                )}
                {palmasExist > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    La numeración sigue desde {String(palmasExist + 1).padStart(3, '0')} hasta{' '}
                    {String(palmasExist + parseInt(cantidad)).padStart(3, '0')}.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary-soft p-6">
              <div className="flex gap-3">
                <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Los códigos llevan el formato <span className="font-semibold text-foreground">{nombreSublote}-{lineaId ? `L${numeroLinea}-` : ''}[contador]</span></li>
                    <li>• El contador de palmas usa 3 dígitos (001, 002, 003...)</li>
                    <li>• Las nuevas palmas se crearán en estado <strong>Activo</strong></li>
                    <li>• Los contadores de la línea y del sublote se actualizan solos</li>
                    <li>• Nunca se repiten códigos dentro de un sublote</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="barra-acciones flex items-center gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })}
                className="h-12 flex-1 text-base">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-12 flex-1 text-base">
                {loading
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Creando</>
                  : <><Leaf className="h-5 w-5" strokeWidth={2} />Agregar palmas</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
