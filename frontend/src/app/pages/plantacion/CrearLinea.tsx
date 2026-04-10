import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, SquareStack, AlertCircle, Loader2 } from 'lucide-react';
import { lineasApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearLinea() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('loteId');
  const subloteId = searchParams.get('subloteId');
  const nombreSublote = searchParams.get('nombreSublote') || 'Sublote';
  
  const [numeroLinea, setNumeroLinea] = useState('');
  const [cantidadPalmas, setCantidadPalmas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numLinea = parseInt(numeroLinea);
    const cantPalmas = parseInt(cantidadPalmas);

    // Validaciones
    if (!numeroLinea.trim() || isNaN(numLinea) || numLinea < 1) {
      alert('El número de línea debe ser mayor o igual a 1');
      return;
    }

    if (!cantidadPalmas.trim() || isNaN(cantPalmas) || cantPalmas < 1 || cantPalmas > 9999) {
      alert('La cantidad de palmas debe estar entre 1 y 9999');
      return;
    }

    // Aquí se guardaría la línea y se crearían las palmas automáticamente
    console.log('Crear línea:', {
      loteId,
      subloteId,
      numeroLinea: numLinea,
      cantidadPalmas: cantPalmas,
      codigosGenerados: Array.from({ length: cantPalmas }, (_, i) => 
        `${nombreSublote}-L${numLinea}-${String(i + 1).padStart(3, '0')}`
      )
    });

    // Volver al detalle del lote
    navigate(`/plantacion/lote/${loteId}`);
  };

  // Generar preview de códigos de palmas
  const generatePreviewCodes = () => {
    const numLinea = parseInt(numeroLinea);
    const cantPalmas = parseInt(cantidadPalmas);
    
    if (isNaN(numLinea) || numLinea < 1 || isNaN(cantPalmas) || cantPalmas < 1 || cantPalmas > 9999) {
      return [];
    }

    const maxPreview = Math.min(cantPalmas, 5);
    return Array.from({ length: maxPreview }, (_, i) => 
      `${nombreSublote}-L${numLinea}-${String(i + 1).padStart(3, '0')}`
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
            <SquareStack className="h-10 w-10 text-success" />
            Nueva Línea
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea una nueva línea en <strong className="text-primary">{nombreSublote}</strong>
          </p>
        </div>
      </div>

      {/* Formulario */}
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
              <Input
                id="numeroLinea"
                type="number"
                min="1"
                placeholder="Ej: 1, 2, 3..."
                value={numeroLinea}
                onChange={(e) => setNumeroLinea(e.target.value)}
                className="h-12 text-base"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Debe ser un número único dentro de este sublote (mínimo 1)
              </p>
            </div>

            {/* Cantidad de Palmas */}
            <div className="space-y-2">
              <Label htmlFor="cantidadPalmas" className="text-base">
                Cantidad de Palmas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cantidadPalmas"
                type="number"
                min="1"
                max="9999"
                placeholder="Ej: 50"
                value={cantidadPalmas}
                onChange={(e) => setCantidadPalmas(e.target.value)}
                className="h-12 text-base"
              />
              <p className="text-sm text-muted-foreground">
                Cantidad de palmas en esta línea (entre 1 y 9999)
              </p>
            </div>

            {/* Preview de códigos generados */}
            {previewCodes.length > 0 && (
              <div className="rounded-xl bg-success/5 border border-success/20 p-6">
                <div className="flex gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-success mb-2">
                      Vista previa de códigos de palmas
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
                  </div>
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex gap-3">
                <SquareStack className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Información importante</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Las palmas se crearán automáticamente con formato: <code className="text-primary font-mono">{nombreSublote}-L[número]-[contador]</code></li>
                    <li>• El contador de palmas usa 3 dígitos (001, 002, 003...)</li>
                    <li>• La línea se creará en estado <strong>Activo</strong></li>
                    <li>• Al eliminar esta línea, todas sus palmas se eliminarán automáticamente</li>
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
                <SquareStack className="h-5 w-5 mr-2" />
                Crear Línea
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}