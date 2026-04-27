/**
 * CrearEditarLote.tsx
 * §2.0 GET /lotes/semillas
 * §2.2 GET /lotes/{id}
 * §2.3 POST /lotes — predio_id*, nombre*, fecha_siembra?, hectareas_sembradas?, semillas_ids?
 * §2.4 PUT  /lotes/{id} — semillas_ids reemplaza todas
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { ArrowLeft, Save, Sprout, Calendar, Leaf, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { lotesApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearEditarLote() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('id');
  const predioIdParam  = sp.get('predio_id') ?? sp.get('predioId');
  const isEditing      = !!loteId;

  const [loading, setLoading]         = useState(false);
  const [nombre, setNombre]           = useState('');
  const [fechaSiembra, setFecha]      = useState('');
  const [hectareas, setHectareas]     = useState('');
  const [semillasList, setSemillas]   = useState<{ id: number; tipo: string; nombre: string }[]>([]);
  const [semillasIds, setSemillasIds] = useState<number[]>([]);

  useEffect(() => {
    lotesApi.semillas().then(r => setSemillas(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loteId) return;
    lotesApi.ver(Number(loteId)).then(res => {
      const d = res.data;
      setNombre(d.nombre ?? '');
      setFecha(d.fecha_siembra ?? '');
      setHectareas(d.hectareas_sembradas != null ? String(Number(d.hectareas_sembradas)) : '');
      setSemillasIds((d.semillas ?? []).map((s: any) => Number(s.id)));
    }).catch(() => toast.error('Error al cargar datos del lote'));
  }, [loteId]);

  const toggleSemilla = (id: number, checked: boolean) =>
    setSemillasIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('El nombre del lote es obligatorio'); return; }
    setLoading(true);
    try {
      if (isEditing && loteId) {
        const body: any = { nombre: nombre.trim() };
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas)    body.hectareas_sembradas = Number(hectareas);
        body.semillas_ids = semillasIds;
        const res = await lotesApi.editar(Number(loteId), body);
        toast.success(res.message ?? 'Lote actualizado');
      } else {
        if (!predioIdParam) { toast.error('Predio no especificado'); return; }
        const body: any = { predio_id: Number(predioIdParam), nombre: nombre.trim() };
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas)    body.hectareas_sembradas = Number(hectareas);
        if (semillasIds.length > 0) body.semillas_ids = semillasIds;
        const res = await lotesApi.crear(body);
        toast.success(res.message ?? 'Lote creado');
      }
      navigate('/plantacion');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
          className="h-12 w-12 rounded-xl hover:bg-muted border border-border/50">
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

      <Card className="border-border/50 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="text-2xl">Información del Lote</CardTitle>
          <CardDescription>
            Los campos marcados con <span className="text-destructive font-semibold">*</span> son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">

            {/* Nombre */}
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-base font-semibold flex items-center gap-2">
                <Sprout className="h-4 w-4 text-success" />
                Nombre del Lote <span className="text-destructive">*</span>
              </Label>
              <Input id="nombre" placeholder="Ej: Lote 1 - Norte" maxLength={100}
                value={nombre} onChange={e => setNombre(e.target.value)}
                className="h-12 text-base" autoFocus />
            </div>

            {/* Fecha + Hectáreas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="fechaSiembra" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Fecha de Siembra
                </Label>
                <Input id="fechaSiembra" type="date" value={fechaSiembra}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setFecha(e.target.value)} className="h-12 text-base" />
                <p className="text-sm text-muted-foreground">No puede ser fecha futura</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="hectareas" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Hectáreas Sembradas
                </Label>
                <Input id="hectareas" type="number" min="0" step="0.01" placeholder="45.5"
                  value={hectareas} onChange={e => setHectareas(e.target.value)} className="h-12 text-base" />
              </div>
            </div>

            {/* Semillas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Leaf className="h-4 w-4 text-success" />
                Semillas Asociadas
              </Label>
              <p className="text-sm text-muted-foreground">Selecciona una o más semillas del catálogo</p>

              {semillasList.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/10">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-base font-semibold text-muted-foreground mb-2">No hay semillas en el catálogo</p>
                  <p className="text-sm text-muted-foreground">Debes crear semillas primero en Configuración</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6 border rounded-xl bg-gradient-to-br from-muted/20 to-muted/5">
                    {semillasList.map(s => (
                      <div key={s.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          semillasIds.includes(Number(s.id))
                            ? 'bg-success/10 border-success/50 shadow-sm'
                            : 'bg-background border-border/50 hover:border-border'
                        }`}
                        onClick={() => toggleSemilla(Number(s.id), !semillasIds.includes(Number(s.id)))}
                      >
                        <Checkbox
                          id={`semilla-${s.id}`}
                          checked={semillasIds.includes(Number(s.id))}
                          onCheckedChange={checked => toggleSemilla(Number(s.id), checked as boolean)}
                        />
                        <label htmlFor={`semilla-${s.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          <span className="block">{s.nombre}</span>
                          <span className="text-xs text-muted-foreground font-normal">{s.tipo}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {semillasIds.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 border border-success/20">
                      <span className="text-sm font-medium text-success">
                        ✓ {semillasIds.length} semilla{semillasIds.length !== 1 ? 's' : ''} seleccionada{semillasIds.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Al guardar, las semillas seleccionadas reemplazan las anteriores.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-between items-center gap-4 pt-8 mt-8 border-t">
            <Button variant="outline" onClick={() => navigate('/plantacion')} disabled={loading}
              className="h-12 px-6 text-base">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}
              className="h-12 px-8 text-base gap-2 bg-success hover:bg-success/90 text-primary hover:text-primary shadow-lg shadow-success/20">
              {loading
                ? <><Loader2 className="h-5 w-5 animate-spin" />Guardando...</>
                : <><Save className="h-5 w-5" />{isEditing ? 'Guardar Cambios' : 'Crear Lote'}</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}