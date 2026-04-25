import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Plus, Leaf, Trash2, CheckCircle, Edit, X, Save, Package } from 'lucide-react';
import { Button }    from '../../components/ui/button';
import { Input }     from '../../components/ui/input';
import { Label }     from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  viajesApi, strField,
  type Viaje, type ViajeDetalle, type OperacionDisponible, type CosechaLibre,
} from '../../../api/viajes';

// ── tipos locales ─────────────────────────────────────────────────────────────

interface DetalleLocal {
  detalleId:   number;          // id de viaje_detalle
  cosechaId:   number;          // id de registro_cosecha
  aprobado:    boolean;
  loteName:    string;
  subloteName: string;
  gajosReport: number;
  gajosReconteo: number | null;
  pesoKg:      number | null;
}

// ── componente ────────────────────────────────────────────────────────────────

export default function ConteoCosecha() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const [viaje,      setViaje]      = useState<Viaje | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [detalles,   setDetalles]   = useState<DetalleLocal[]>([]);

  // Edición de un detalle
  const [editandoId, setEditandoId]   = useState<number | null>(null);
  const [editGajos,  setEditGajos]    = useState('');
  const [editPeso,   setEditPeso]     = useState('');

  // Modal para agregar cosecha
  const [modalOpen,         setModalOpen]         = useState(false);
  const [operaciones,       setOperaciones]       = useState<OperacionDisponible[]>([]);
  const [opSeleccionada,    setOpSeleccionada]    = useState('');
  const [cosechasLibres,    setCosechasLibres]    = useState<CosechaLibre[]>([]);
  const [cargandoOps,       setCargandoOps]       = useState(false);
  const [cargandoCosechas,  setCargandoCosechas]  = useState(false);
  const [agregando,         setAgregando]         = useState(false);

  // ── mapeo API → local ─────────────────────────────────────────────────────
  function mapDetalle(d: ViajeDetalle): DetalleLocal {
    return {
      detalleId:    d.id,
      cosechaId:    d.cosecha_id,
      aprobado:     d.reconteo_aprobado,
      loteName:     d.cosecha?.lote?.nombre ?? '—',
      subloteName:  d.cosecha?.sublote?.nombre ?? '',
      gajosReport:  d.cosecha?.gajos_reportados ?? 0,
      gajosReconteo: d.cosecha?.gajos_reconteo ?? null,
      pesoKg:       d.cosecha?.peso_confirmado ? parseFloat(String(d.cosecha.peso_confirmado)) : null,
    };
  }

  // ── carga viaje ───────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await viajesApi.ver(Number(id));
      setViaje(res.data);
      setDetalles((res.data.detalles ?? []).map(mapDetalle));
    } catch { navigate('/viajes'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── modal: cargar operaciones disponibles ─────────────────────────────────
  useEffect(() => {
    if (!modalOpen) return;
    setCargandoOps(true);
    viajesApi.operacionesDisponibles()
      .then(r => setOperaciones(r.data ?? []))
      .catch(() => {})
      .finally(() => setCargandoOps(false));
  }, [modalOpen]);

  // ── modal: cargar cosechas libres al elegir operación ─────────────────────
  useEffect(() => {
    if (!opSeleccionada) { setCosechasLibres([]); return; }
    setCargandoCosechas(true);
    viajesApi.cosechasLibresDeOperacion(Number(opSeleccionada))
      .then(r => setCosechasLibres(r.data ?? []))
      .catch(() => {})
      .finally(() => setCargandoCosechas(false));
  }, [opSeleccionada]);

  // ── agregar cosecha al viaje ──────────────────────────────────────────────
  const agregarCosecha = async (cosechaId: number) => {
    if (!viaje || agregando) return;
    setAgregando(true);
    try {
      await viajesApi.agregarDetalle(viaje.id, cosechaId);
      toast.success('Cosecha agregada al viaje');
      setModalOpen(false);
      setOpSeleccionada('');
      setCosechasLibres([]);
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al agregar cosecha'); }
    finally { setAgregando(false); }
  };

  // ── quitar cosecha del viaje ──────────────────────────────────────────────
  const quitarCosecha = async (det: DetalleLocal) => {
    if (!viaje || det.aprobado) return;
    if (!confirm('¿Quitar esta cosecha del viaje?')) return;
    setProcesando(true);
    try {
      await viajesApi.eliminarDetalle(viaje.id, det.detalleId);
      toast.success('Cosecha quitada');
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al quitar cosecha'); }
    finally { setProcesando(false); }
  };

  // ── guardar reconteo ──────────────────────────────────────────────────────
  const guardarReconteo = async () => {
    if (!viaje || editandoId === null) return;
    const gajos = parseInt(editGajos);
    if (!gajos || isNaN(gajos)) { toast.error('Ingresa los gajos recontados'); return; }
    setProcesando(true);
    try {
      await viajesApi.hidratarReconteo(viaje.id, editandoId, {
        gajos_reconteo:  gajos,
        peso_confirmado: editPeso ? parseFloat(editPeso) : undefined,
      });
      toast.success('Reconteo guardado');
      setEditandoId(null);
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar reconteo'); }
    finally { setProcesando(false); }
  };

  // ── aprobar reconteo de un detalle ────────────────────────────────────────
  const aprobarDetalle = async (det: DetalleLocal) => {
    if (!viaje) return;
    if (det.gajosReconteo === null) { toast.error('Primero registra el reconteo de gajos'); return; }
    setProcesando(true);
    try {
      const r = await viajesApi.aprobarReconteo(viaje.id, det.detalleId);
      if (r.data.auto_despachado) {
        toast.success('Reconteo aprobado — viaje despachado automáticamente');
        navigate('/viajes');
      } else {
        toast.success('Reconteo aprobado');
        await cargar();
      }
    } catch (e: any) { toast.error(e?.message ?? 'Error al aprobar reconteo'); }
    finally { setProcesando(false); }
  };

  // ── aprobar todos y despachar ─────────────────────────────────────────────
  const finalizarConteo = async () => {
    if (!viaje || detalles.length === 0) return;
    const pendientes = detalles.filter(d => !d.aprobado);
    if (pendientes.some(d => d.gajosReconteo === null)) {
      toast.error('Todos los detalles deben tener reconteo antes de aprobar');
      return;
    }
    setProcesando(true);
    try {
      for (const det of pendientes) {
        const r = await viajesApi.aprobarReconteo(viaje.id, det.detalleId);
        if (r.data.auto_despachado) {
          toast.success('Conteo finalizado — viaje en camino');
          navigate('/viajes');
          return;
        }
      }
      toast.success('Todos los reconteos aprobados');
      await cargar();
    } catch (e: any) { toast.error(e?.message ?? 'Error al finalizar conteo'); }
    finally { setProcesando(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  }
  if (!viaje) return null;

  const rv = viaje as any;
  const todosConReconteo = detalles.every(d => d.gajosReconteo !== null);
  const algunoPendiente  = detalles.some(d => !d.aprobado);

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/viajes/${viaje.id}`)}
            className="h-12 w-12 rounded-xl">
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conteo de Cosecha</h1>
            <p className="text-muted-foreground">{rv.remision} — {String(rv.placa_vehiculo ?? '')} · {strField(rv.extractora)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setModalOpen(true); setOpSeleccionada(''); }} className="gap-2">
            <Plus className="h-4 w-4" /> Agregar Cosecha
          </Button>
          {algunoPendiente && todosConReconteo && (
            <Button onClick={finalizarConteo} disabled={procesando} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {procesando ? 'Procesando...' : 'Aprobar y Despachar'}
            </Button>
          )}
        </div>
      </div>

      {/* Lista de detalles */}
      <div className="space-y-3">
        {detalles.length === 0 ? (
          <Card className="glass-subtle border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No hay cosechas en este viaje</p>
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Agregar cosecha
              </Button>
            </CardContent>
          </Card>
        ) : detalles.map(det => (
          <Card key={det.detalleId} className={`glass-subtle border ${det.aprobado ? 'border-success/30 bg-success/5' : 'border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${det.aprobado ? 'bg-success/15' : 'bg-muted'}`}>
                    <Leaf className={`h-5 w-5 ${det.aprobado ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{det.loteName}</p>
                    {det.subloteName && <p className="text-xs text-muted-foreground">{det.subloteName}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reportados: <strong>{det.gajosReport}</strong>
                      {det.gajosReconteo !== null && <> · Reconteo: <strong className="text-foreground">{det.gajosReconteo}</strong></>}
                      {det.pesoKg !== null && <> · Peso: <strong className="text-foreground">{det.pesoKg.toLocaleString()} kg</strong></>}
                    </p>
                  </div>
                </div>

                {/* Estado + acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  {det.aprobado ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-success bg-success/10 border-success/20">
                      <CheckCircle className="h-3 w-3" /> Aprobado
                    </span>
                  ) : (
                    <>
                      {editandoId === det.detalleId ? (
                        <>
                          <Input
                            type="number" placeholder="Gajos reconteo" value={editGajos}
                            onChange={e => setEditGajos(e.target.value)} className="w-32 h-8 text-sm"
                          />
                          <Input
                            type="number" placeholder="Peso kg" value={editPeso}
                            onChange={e => setEditPeso(e.target.value)} className="w-28 h-8 text-sm"
                          />
                          <Button size="sm" onClick={guardarReconteo} disabled={procesando}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setEditandoId(det.detalleId); setEditGajos(String(det.gajosReconteo ?? det.gajosReport)); setEditPeso(det.pesoKg ? String(det.pesoKg) : ''); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {det.gajosReconteo !== null && (
                            <Button size="sm" onClick={() => aprobarDetalle(det)} disabled={procesando}
                              className="gap-1 bg-success hover:bg-success/90 text-white">
                              <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline"
                            onClick={() => quitarCosecha(det)} disabled={procesando}
                            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal agregar cosecha */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg glass-subtle border-border shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Agregar Cosecha al Viaje</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paso 1: elegir operación */}
              <div className="space-y-1.5">
                <Label className="text-sm">Operación (planilla)</Label>
                <select
                  value={opSeleccionada}
                  onChange={e => setOpSeleccionada(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{cargandoOps ? 'Cargando operaciones...' : 'Seleccionar operación...'}</option>
                  {operaciones.map(o => (
                    <option key={o.id} value={String(o.id)}>
                      Planilla {o.fecha} — {o.cosechas_disponibles_count} cosecha{o.cosechas_disponibles_count !== 1 ? 's' : ''} disponible{o.cosechas_disponibles_count !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paso 2: elegir cosecha */}
              {opSeleccionada && (
                <div className="space-y-2">
                  <Label className="text-sm">Cosecha disponible</Label>
                  {cargandoCosechas ? (
                    <p className="text-sm text-muted-foreground">Cargando cosechas...</p>
                  ) : cosechasLibres.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay cosechas libres en esta operación</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cosechasLibres.map(c => (
                        <button
                          key={c.id}
                          onClick={() => agregarCosecha(c.id)}
                          disabled={agregando}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">{c.lote?.nombre ?? `Cosecha #${c.id}`}</p>
                            {c.sublote && <p className="text-xs text-muted-foreground">{c.sublote.nombre}</p>}
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{c.gajos_reportados} gajos</p>
                            {c.cuadrilla_count && <p className="text-xs text-muted-foreground">{c.cuadrilla_count} colaboradores</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}