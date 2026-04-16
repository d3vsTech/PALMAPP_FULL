/**
 * CrearEditarLote.tsx
 * §2.0 GET /lotes/semillas              — id, tipo, nombre
 * §2.2 GET /lotes/{id}                  — cargar para editar: semillas[]{id}
 * §2.3 POST /lotes                      — predio_id*, nombre*, fecha_siembra?, hectareas_sembradas?, semillas_ids?
 * §2.4 PUT  /lotes/{id}                 — mismos + estado?; semillas_ids reemplaza todas
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Save, Sprout, Calendar, Leaf, Loader2 } from 'lucide-react';
import { lotesApi } from '../../../api/plantacion';
import { toast } from 'sonner';

export default function CrearEditarLote() {
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const loteId         = sp.get('id');
  const predioIdParam  = sp.get('predio_id') ?? sp.get('predioId');
  const isEditing      = !!loteId;

  const [loading, setLoading]       = useState(false);
  const [nombre, setNombre]         = useState('');
  const [fechaSiembra, setFecha]    = useState('');
  const [hectareas, setHectareas]   = useState('');
  const [semillasList, setSemillas] = useState<{ id: number; tipo: string; nombre: string }[]>([]);
  const [semillasIds, setSemillasIds] = useState<number[]>([]);  // §2.3 semillas_ids

  // §2.0 Cargar catálogo de semillas
  useEffect(() => {
    lotesApi.semillas().then(r => setSemillas(r.data ?? [])).catch(() => {});
  }, []);

  // §2.2 Cargar lote existente para editar
  useEffect(() => {
    if (!loteId) return;
    lotesApi.ver(Number(loteId)).then(res => {
      const d = res.data;
      setNombre(d.nombre ?? '');
      setFecha(d.fecha_siembra ?? '');
      setHectareas(d.hectareas_sembradas != null ? String(Number(d.hectareas_sembradas)) : '');
      // §2.2 semillas[] viene como objetos {id, tipo, nombre}
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
        // §2.4 PUT — semillas_ids reemplaza todas ([] elimina todas)
        const body: any = { nombre: nombre.trim() };
        if (fechaSiembra) body.fecha_siembra = fechaSiembra;
        if (hectareas)    body.hectareas_sembradas = Number(hectareas);
        body.semillas_ids = semillasIds;   // siempre enviar al editar
        const res = await lotesApi.editar(Number(loteId), body);
        toast.success(res.message ?? 'Lote actualizado');
      } else {
        // §2.3 POST
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
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plantacion')}
          className="h-12 w-12 rounded-xl border border-border/50 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30">
            <Sprout className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">{isEditing ? 'Editar Lote' : 'Nuevo Lote'}</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Modifica los datos del lote' : 'Crea un nuevo lote dentro del predio'}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Información del Lote</CardTitle>
          <CardDescription>* = obligatorio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="Ej: Lote A, Lote Norte" maxLength={100}
              value={nombre} onChange={e => setNombre(e.target.value)} className="h-12" autoFocus />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Fecha de Siembra
              </Label>
              {/* §2.3 formato YYYY-MM-DD, no futura */}
              <Input type="date" value={fechaSiembra}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFecha(e.target.value)} className="h-12" />
              <p className="text-xs text-muted-foreground">No puede ser fecha futura</p>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Hectáreas Sembradas</Label>
              {/* §2.3 no puede superar hectáreas disponibles del predio */}
              <Input type="number" min="0" step="0.01" placeholder="Ej: 25.5"
                value={hectareas} onChange={e => setHectareas(e.target.value)} className="h-12" />
            </div>
          </div>

          {/* §2.3 semillas_ids — array de IDs */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Leaf className="h-4 w-4 text-success" /> Semillas Asociadas
            </Label>
            {semillasList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay semillas activas</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {semillasList.map(s => (
                  <label key={s.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <input type="checkbox"
                      checked={semillasIds.includes(Number(s.id))}
                      onChange={e => toggleSemilla(Number(s.id), e.target.checked)}
                      className="h-4 w-4 rounded accent-primary" />
                    <div>
                      <p className="text-sm font-medium">{s.nombre}</p>
                      <p className="text-xs text-muted-foreground">{s.tipo}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {semillasIds.length > 0 && (
              <p className="text-xs text-success font-medium">
                ✓ {semillasIds.length} semilla{semillasIds.length !== 1 ? 's' : ''} seleccionada{semillasIds.length !== 1 ? 's' : ''}
              </p>
            )}
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Al guardar, las semillas seleccionadas reemplazan las anteriores. Sin seleccionar = eliminar todas.
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" disabled={loading}
              onClick={() => navigate('/plantacion')} className="flex-1 h-12">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}
              className="flex-1 h-12 bg-success hover:bg-success/90 text-primary shadow-lg shadow-success/20">
              {loading
                ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Guardando...</>
                : <><Save className="h-5 w-5 mr-2" />{isEditing ? 'Guardar Cambios' : 'Crear Lote'}</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}