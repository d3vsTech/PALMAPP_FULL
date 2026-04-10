import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Sprout, ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react';
import { lotesApi } from '../../../api/plantacion';
import { toast } from 'sonner';
import { predios, lotes, semillas } from '../../lib/mockData';
import { MapPin, Calendar, Leaf } from 'lucide-react';

export default function CrearEditarLote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('id');
  const predioIdParam = searchParams.get('predioId');
  const isEditing = !!loteId;

  const [nombre, setNombre] = useState('');
  const [predioId, setPredioId] = useState('');
  const [fechaSiembra, setFechaSiembra] = useState('');
  const [variedad, setVariedad] = useState('');
  const [semillasSeleccionadas, setSemillasSeleccionadas] = useState<string[]>([]);
  const [hectareas, setHectareas] = useState('');

  useEffect(() => {
    if (isEditing) {
      const lote = lotes.find((l) => l.id === loteId);
      if (lote) {
        setNombre(lote.nombre);
        setPredioId(lote.predioId);
        setFechaSiembra(lote.fechaSiembra || `${lote.anoSiembra}-01-01`);
        setVariedad(lote.variedad);
        setSemillasSeleccionadas(lote.semillas);
        setHectareas(lote.hectareas.toString());
      }
    } else {
      setPredioId(predioIdParam || '');
    }
  }, [loteId, predioIdParam, isEditing]);

  const handleSemillaChange = (semilla: string, checked: boolean) => {
    if (checked) {
      setSemillasSeleccionadas([...semillasSeleccionadas, semilla]);
    } else {
      setSemillasSeleccionadas(semillasSeleccionadas.filter((s) => s !== semilla));
    }
  };

  // Calcular hectáreas disponibles del predio
  const calcularHectareasDisponibles = (predioSeleccionadoId: string): number => {
    const predio = predios.find((p) => p.id === predioSeleccionadoId);
    if (!predio) return 0;

    // Sumar hectáreas de los lotes existentes del predio (excepto el que se está editando)
    const hectareasUsadas = lotes
      .filter((l) => l.predioId === predioSeleccionadoId && l.id !== loteId)
      .reduce((sum, l) => sum + l.hectareas, 0);

    return predio.hectareas - hectareasUsadas;
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError('El nombre del lote es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: any = { nombre: nombre.trim() };
      if (isEditing) {
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas) body.hectareas_sembradas = Number(hectareas);
        const res = await lotesApi.editar(Number(loteId), body);
        toast.success(res.message ?? 'Lote actualizado correctamente');
      } else {
        if (!predioId) { setError('ID de predio requerido'); setLoading(false); return; }
        body.predio_id = Number(predioId);
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas) body.hectareas_sembradas = Number(hectareas);
        const res = await lotesApi.crear(body);
        toast.success(res.message ?? 'Lote creado correctamente');
      }
      navigate('/plantacion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el lote');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/plantacion');
  };

  const hectareasDisponibles = predioId ? calcularHectareasDisponibles(predioId) : 0;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center border border-success/30 shadow-lg">
            <Sprout className="h-8 w-8 text-success" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {isEditing ? 'Editar Lote' : 'Crear Nuevo Lote'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? 'Modifica la información del lote existente'
                : 'Crea un lote dentro de un predio. Después podrás agregar sublotes, líneas y palmas.'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario Horizontal */}
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-2xl">Información del Lote</CardTitle>
          <CardDescription>
            Los campos marcados con <span className="text-destructive font-semibold">*</span> son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Fila 1: Predio (Full width) */}
            <div className="space-y-3">
              <Label htmlFor="predio" className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Predio <span className="text-destructive">*</span>
              </Label>
              <Select value={predioId} onValueChange={setPredioId}>
                <SelectTrigger id="predio" className="h-12 text-base">
                  <SelectValue placeholder="Selecciona un predio" />
                </SelectTrigger>
                <SelectContent>
                  {predios.map((predio) => (
                    <SelectItem key={predio.id} value={predio.id}>
                      {predio.nombre} ({predio.hectareas} hectáreas totales)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {predioId && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Hectáreas disponibles: <strong className="text-primary font-bold">{hectareasDisponibles.toFixed(2)} hectáreas</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Fila 2: Nombre del Lote (Full width) */}
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-base font-semibold flex items-center gap-2">
                <Sprout className="h-4 w-4 text-success" />
                Nombre del Lote <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Lote 1 - Norte"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Fila 3: Fecha de Siembra + Hectáreas (2 columnas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="fechaSiembra" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Fecha de Siembra <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fechaSiembra"
                  type="date"
                  value={fechaSiembra}
                  onChange={(e) => setFechaSiembra(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="hectareas" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Hectáreas Sembradas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hectareas"
                  type="number"
                  step="0.01"
                  placeholder="45.5"
                  min="0"
                  max={hectareasDisponibles}
                  value={hectareas}
                  onChange={(e) => setHectareas(e.target.value)}
                  className="h-12 text-base"
                />
                {predioId && parseFloat(hectareas) > 0 && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      parseFloat(hectareas) > hectareasDisponibles
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-success/10 text-success border border-success/20'
                    }`}
                  >
                    {parseFloat(hectareas) > hectareasDisponibles
                      ? '⚠️ Excede las hectáreas disponibles'
                      : `✓ Quedarán ${(hectareasDisponibles - parseFloat(hectareas)).toFixed(2)} hectáreas disponibles`}
                  </div>
                )}
              </div>
            </div>

            {/* Fila 4: Variedad (Full width) */}
            <div className="space-y-3">
              <Label htmlFor="variedad" className="text-base font-semibold flex items-center gap-2">
                <Leaf className="h-4 w-4 text-success" />
                Variedad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="variedad"
                placeholder="Ej: Elaeis Guineensis"
                value={variedad}
                onChange={(e) => setVariedad(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Fila 5: Semillas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Sprout className="h-4 w-4 text-success" />
                Semillas <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecciona una o más semillas del catálogo
              </p>

              {semillas.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6 border rounded-xl bg-gradient-to-br from-muted/20 to-muted/5">
                    {semillas.map((semilla) => (
                      <div
                        key={semilla.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          semillasSeleccionadas.includes(semilla.nombre)
                            ? 'bg-success/10 border-success/50 shadow-sm'
                            : 'bg-background border-border/50 hover:border-border'
                        }`}
                        onClick={() =>
                          handleSemillaChange(
                            semilla.nombre,
                            !semillasSeleccionadas.includes(semilla.nombre)
                          )
                        }
                      >
                        <Checkbox
                          id={`semilla-${semilla.id}`}
                          checked={semillasSeleccionadas.includes(semilla.nombre)}
                          onCheckedChange={(checked) =>
                            handleSemillaChange(semilla.nombre, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`semilla-${semilla.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {semilla.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                  {semillasSeleccionadas.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 border border-success/20">
                      <span className="text-sm font-medium text-success">
                        ✓ {semillasSeleccionadas.length} semilla{semillasSeleccionadas.length !== 1 ? 's' : ''} seleccionada{semillasSeleccionadas.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-base font-semibold text-muted-foreground mb-2">
                    No hay semillas en el catálogo
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Debes crear semillas primero en Configuración → Maestros
                  </p>
                  <Link to="/configuracion?tab=maestros">
                    <Button variant="outline" className="gap-2">
                      <Sprout className="h-4 w-4" />
                      Ir a Maestros
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center gap-4 pt-8 mt-8 border-t">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="h-12 px-6 text-base"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="h-12 px-8 text-base gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20"
              disabled={semillas.length === 0}
            >
              <Save className="h-5 w-5" />
              {isEditing ? 'Guardar Cambios' : 'Crear Lote'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}