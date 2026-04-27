/**
 * CrearLinea.tsx
 * §5.1 GET /lineas?sublote_id=X — sugerir siguiente número libre
 * §5.3 POST /lineas — sublote_id*, numero*, cantidad_palmas?
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, SquareStack, AlertCircle, Loader2 } from 'lucide-react';
import { lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearLinea() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('loteId');
  const subloteId      = sp.get('subloteId');
  const nombreSublote  = sp.get('nombreSublote') ?? 'Sublote';

  const [numerosExistentes, setNumerosExistentes] = useState<number[]>([]);
  const [numero, setNumero]           = useState('');
  const [cantTeorica, setCantTeorica] = useState('');
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!subloteId) return;
    lineasApi.listar({ sublote_id: Number(subloteId), per_page: 100 })
      .then(res => {
        const nums = (res.data ?? []).map((l: any) => Number(l.numero)).sort((a: number, b: number) => a - b);
        setNumerosExistentes(nums);
        let sig = 1;
        while (nums.includes(sig)) sig++;
        setNumero(String(sig));
      })
      .catch(() => {});
  }, [subloteId]);

  const generatePreviewCodes = () => {
    const numLinea = parseInt(numero);
    const cantPalmas = parseInt(cantTeorica);
    if (isNaN(numLinea) || numLinea < 1 || isNaN(cantPalmas) || cantPalmas < 1) return [];
    return Array.from({ length: Math.min(cantPalmas, 5) }, (_, i) =>
      `${nombreSublote}-L${numLinea}-${String(i + 1).padStart(3, '0')}`
    );
  };
  const previewCodes = generatePreviewCodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(numero);
    if (!numero.trim() || isNaN(num) || num < 1) { toast.error('El número debe ser mayor o igual a 1'); return; }
    if (!subloteId) { toast.error('Sublote no especificado'); return; }
    if (numerosExistentes.includes(num)) {
      toast.error(`La línea ${num} ya existe. El siguiente número libre es ${Math.max(...numerosExistentes) + 1}`);
      return;
    }
    const cant = cantTeorica ? parseInt(cantTeorica) : undefined;
    if (cantTeorica && (isNaN(cant!) || cant! < 0)) { toast.error('Cantidad inválida'); return; }

    setLoading(true);
    try {
      const body: any = { sublote_id: Number(subloteId), numero: num };
      if (cant != null && cant > 0) body.cantidad_palmas = cant;
      const res = await lineasApi.crear(body);
      toast.success(res.message ?? 'Línea creada correctamente');
      navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear línea');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon"
          onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <SquareStack className="h-10 w-10 text-success" />
            Nueva Línea
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea una nueva línea en <strong className="text-primary">{nombreSublote}</strong>
          </p>
        </div>
      </div>

      <Card className="glass-subtle border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información de la Línea</CardTitle>
          <CardDescription>
            Las palmas se crearán automáticamente con códigos secuenciales únicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Número de Línea */}
            <div className="space-y-2">
              <Label htmlFor="numeroLinea" className="text-base">
                Número de Línea <span className="text-destructive">*</span>
              </Label>
              <Input id="numeroLinea" type="number" min="1" placeholder="Ej: 1, 2, 3..."
                value={numero} onChange={e => setNumero(e.target.value)}
                className="h-12 text-base" autoFocus />
              <p className="text-sm text-muted-foreground">
                Debe ser un número único dentro de este sublote (mínimo 1)
              </p>
              {numerosExistentes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ya existe{numerosExistentes.length > 1 ? 'n' : ''}: <span className="font-mono text-primary">{numerosExistentes.join(', ')}</span>
                </p>
              )}
            </div>

            {/* Cantidad de Palmas */}
            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad Teórica de Palmas <span className="text-muted-foreground text-sm font-normal">(opcional)</span>
              </Label>
              <Input id="cantidadPalmas" type="number" min="0" max="9999" placeholder="Ej: 50"
                value={cantTeorica} onChange={e => setCantTeorica(e.target.value)}
                className="h-12 text-base" />
              <p className="text-sm text-muted-foreground">
                Es informativo. Las palmas reales se crean desde "Agregar Palmas".
              </p>
            </div>

            {/* Preview de códigos */}
            {previewCodes.length > 0 && (
              <div className="rounded-xl bg-success/5 border border-success/20 p-6">
                <div className="flex gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-success mb-2">Vista previa de códigos de palmas</p>
                    <div className="space-y-1">
                      {previewCodes.map((code, index) => (
                        <p key={index} className="text-sm font-mono text-primary bg-white/50 rounded px-2 py-1 inline-block mr-2">
                          {code}
                        </p>
                      ))}
                      {parseInt(cantTeorica) > 5 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          ... y {parseInt(cantTeorica) - 5} palmas más
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex gap-3">
                <SquareStack className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Las palmas se crearán con formato: <code className="text-primary font-mono">{nombreSublote}-L[número]-[contador]</code></li>
                    <li>• El contador de palmas usa 3 dígitos (001, 002, 003...)</li>
                    <li>• La línea se creará en estado <strong>Activo</strong></li>
                    <li>• Al eliminar esta línea, todas sus palmas se eliminarán automáticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="button" variant="outline" disabled={loading}
                onClick={() => navigate(`/plantacion/lote/${loteId}`, { state: { openSubloteId: subloteId } })}
                className="flex-1 h-12 text-base">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
                {loading
                  ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Creando...</>
                  : <><SquareStack className="h-5 w-5 mr-2" />Crear Línea</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}