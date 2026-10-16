/**
 * LaborActividadesPanel
 *
 * Panel expandible con la lista de "Actividades" (sublabores) de una labor.
 *
 * Aquí se renombran y se eliminan; crear va por el botón "Nueva Labor" de la
 * cabecera de Labores Palma, que es un solo sitio para las dos labores que
 * admiten trabajos en vez de uno por desplegable.
 * Se usa dentro de las tarjetas de:
 *  - Sanidad (labor fija).
 *  - Otros (labor fija, desde agosto 2026).
 *  - Labores custom de PALMA (es_sistema=false, tipo=null).
 *
 * Este panel solo administra NOMBRE y ESTADO de las sublabores. El precio
 * (§4.7 LABORES_JORNALES) se edita únicamente en "Precios de Labores"
 * (PreciosLaboresTab), para tener una sola pantalla como fuente de verdad
 * de valores monetarios.
 *
 * Endpoints: §19 API_PARAMETRICAS — `configuracionApi.laborActividades.*`.
 * El listado se pide en la primera expansión y se cachea en state local.
 */
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Edit, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import {
  configuracionApi,
  ConfiguracionErrorCodes,
  type LaborActividad,
} from '../../../api/configuracion';

interface Props {
  laborId: number;
  /** true cuando el panel está expandido — dispara el fetch inicial. */
  open: boolean;
}

export function LaborActividadesPanel({ laborId, open }: Props) {
  const [actividades, setActividades] = useState<LaborActividad[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  // Fetch inicial: la primera vez que se abre.
  if (open && actividades === null && !cargando) {
    setCargando(true);
    configuracionApi.laborActividades
      .listarPorLabor(laborId, { estado: 'all' })
      .then((res) => setActividades(res.data ?? []))
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las actividades'))
      .finally(() => setCargando(false));
  }

  const iniciarEdicion = (act: LaborActividad) => {
    setEditandoId(act.id);
    setNombreEditado(act.nombre);
  };

  const guardarEdicion = async (id: number) => {
    const nombre = nombreEditado.trim();
    if (nombre.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setGuardando(true);
    try {
      // No editamos precio aquí — es responsabilidad de "Precios de Labores".
      const res = await configuracionApi.laborActividades.editar(id, {
        nombre,
      });
      setActividades((prev) => (prev ?? []).map((a) => (a.id === id ? res.data : a)));
      setEditandoId(null);
      setNombreEditado('');
      toast.success('Trabajo actualizado');
    } catch (e: any) {
      if (e?.code === ConfiguracionErrorCodes.ACTIVIDAD_DUPLICADA) {
        toast.error('Ya existe un trabajo con ese nombre');
      } else {
        toast.error(e?.message ?? 'No se pudo actualizar el trabajo');
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (act: LaborActividad) => {
    confirmDelete({
      title: '¿Eliminar trabajo?',
      description: `¿Estás seguro de eliminar "${act.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await configuracionApi.laborActividades.eliminar(act.id);
          setActividades((prev) => (prev ?? []).filter((a) => a.id !== act.id));
          toast.success('Trabajo eliminado');
        } catch (e: any) {
          if (e?.code === ConfiguracionErrorCodes.ACTIVIDAD_CON_JORNALES) {
            toast.error('No se puede eliminar: tiene registros asociados');
          } else {
            toast.error(e?.message ?? 'No se pudo eliminar el trabajo');
          }
        }
      },
    });
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-muted/10 border-t border-border/50 space-y-3">
      {ConfirmDeleteDialog}

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Trabajos disponibles
      </p>

      {cargando ? (
        <p className="text-xs text-muted-foreground py-2">Cargando…</p>
      ) : (actividades ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No hay trabajos registrados todavía.
        </p>
      ) : (
        <div className="space-y-1.5">
          {(actividades ?? []).map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-background border border-border/50"
            >
              {editandoId === act.id ? (
                <>
                  <Input
                    autoFocus
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    disabled={guardando}
                    maxLength={150}
                    className="h-7 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); guardarEdicion(act.id); }
                      if (e.key === 'Escape') { setEditandoId(null); setNombreEditado(''); }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => guardarEdicion(act.id)}
                    disabled={guardando}
                    className="h-7 px-2"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditandoId(null); setNombreEditado(''); }}
                    disabled={guardando}
                    className="h-7 px-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">{act.nombre}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => iniciarEdicion(act)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminar(act)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
