import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Leaf, AlertCircle, Loader2 } from 'lucide-react';
import { palmasApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearPalmas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('loteId');
  const subloteId = searchParams.get('subloteId');
  const lineaId = searchParams.get('lineaId');
  const numeroLinea = searchParams.get('numeroLinea') || '1';
  const nombreSublote = searchParams.get('nombreSublote') || 'Sublote';
  const palmasExistentes = parseInt(searchParams.get('palmasExistentes') || '0');
  
  const [cantidadPalmas, setCantidadPalmas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cantPalmas = parseInt(cantidadPalmas);

    // Validaciones
    if (!cantidadPalmas.trim() || isNaN(cantPalmas) || cantPalmas < 1 || cantPalmas > 9999) {
      alert('La cantidad de palmas debe estar entre 1 y 9999');
      return;
    }

    // Aquí se guardarían las nuevas palmas automáticamente
    console.log('Agregar palmas:', {
      loteId,
      subloteId,
      lineaId,
      numeroLinea,
      cantidadPalmas: cantPalmas,
      codigosGenerados: Array.from({ length: cantPalmas }, (_, i) => 
        `${nombreSublote}-L${numeroLinea}-${String(palmasExistentes + i + 1).padStart(3, '0')}`
      )
    });

    // Volver al detalle del lote
    navigate(`/plantacion/lote/${loteId}`);
  };

  // Generar preview de códigos de palmas
  const generatePreviewCodes = () => {
    const cantPalmas = parseInt(cantidadPalmas);
    
    if (isNaN(cantPalmas) || cantPalmas < 1 || cantPalmas > 9999) {
      return [];
    }

    const maxPreview = Math.min(cantPalmas, 5);
    return Array.from({ length: maxPreview }, (_, i) => 
      `${nombreSublote}-L${numeroLinea}-${String(palmasExistentes + i + 1).padStart(3, '0')}`
    );
  };

  const previewCodes = generatePreviewCodes();

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/plantacion/lote/${loteId}`)}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Leaf className="h-10 w-10 text-success" />
            Agregar Palmas
          </h1>
          <p className="text-muted-foreground mt-1">
            Añade nuevas palmas a <strong className="text-primary">Línea {numeroLinea}</strong> de <strong className="text-primary">{nombreSublote}</strong>
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card className="glass-subtle border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Cantidad de Palmas</CardTitle>
          <CardDescription>
            Los códigos se generan automáticamente de forma secuencial dentro del sublote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la línea actual */}
            <div className="rounded-xl bg-muted/30 border border-border/50 p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sublote</p>
                  <p className="font-semibold text-primary">{nombreSublote}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Línea</p>
                  <p className="font-semibold text-primary">Línea {numeroLinea}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Palmas Existentes</p>
                  <p className="font-semibold text-success">{palmasExistentes}</p>
                </div>
              </div>
            </div>

            {/* Cantidad de Palmas */}
            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad de Palmas a Agregar <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cantidadPalmas"
                type="number"
                min="1"
                max="9999"
                placeholder="Ej: 10"
                value={cantidadPalmas}
                onChange={(e) => setCantidadPalmas(e.target.value)}
                className="h-12 text-base"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Cantidad de palmas a agregar a esta línea (entre 1 y 9999)
              </p>
            </div>

            {/* Preview de códigos generados */}
            {previewCodes.length > 0 && (
              <div className="rounded-xl bg-success/5 border border-success/20 p-6">
                <div className="flex gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-success mb-2">
                      Vista previa de códigos de palmas nuevas
                    </p>
                    <div className="space-y-1">
                      {previewCodes.map((code, index) => (
                        <p key={index} className="text-sm font-mono text-primary bg-white/50 rounded px-2 py-1 inline-block mr-2">
                          {code}
                        </p>
                      ))}
                      {parseInt(cantidadPalmas) > 5 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          ... y {parseInt(cantidadPalmas) - 5} palmas más
                        </p>
                      )}
                    </div>
                    {palmasExistentes > 0 && (
                      <p className="text-xs text-muted-foreground mt-3">
                        La numeración continúa desde {String(palmasExistentes + 1).padStart(3, '0')} hasta {String(palmasExistentes + parseInt(cantidadPalmas)).padStart(3, '0')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex gap-3">
                <Leaf className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Los códigos de palmas se generan automáticamente con formato: <code className="text-primary font-mono">{nombreSublote}-L{numeroLinea}-[contador]</code></li>
                    <li>• El contador de palmas usa 3 dígitos (001, 002, 003...)</li>
                    <li>• Las nuevas palmas se crearán en estado <strong>Activo</strong></li>
                    <li>• Los contadores de la línea y del sublote se actualizarán automáticamente</li>
                    <li>• Nunca se repiten códigos dentro de un sublote</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/plantacion/lote/${loteId}`)}
                className="flex-1 h-12 text-base"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
              >
                <Leaf className="h-5 w-5 mr-2" />
                Agregar Palmas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}