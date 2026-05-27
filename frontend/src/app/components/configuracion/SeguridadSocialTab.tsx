import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '../ui/confirm-delete-dialog';
import { toast } from 'sonner';
import {
  configuracionApi,
  type ParametricaColaborador,
} from '../../../api/configuracion';

/**
 * Tab "Seguridad Social" conectado al API real (§12 API_PARAMETRICAS).
 *
 * Maneja 3 catálogos del colaborador: EPS, Fondos de Pensión, ARL.
 *   GET    /api/v1/tenant/{base}        → listado paginado
 *   POST   /api/v1/tenant/{base}        → crear
 *   PUT    /api/v1/tenant/{base}/{id}   → editar (+ toggle estado)
 *   DELETE /api/v1/tenant/{base}/{id}   → eliminar
 */

type RecursoColaborador = typeof configuracionApi.eps;

interface SeccionConfig {
  key: string;
  titulo: string;
  descripcion: string;
  etiqueta: string;
  api: RecursoColaborador;
}

const SECCIONES: SeccionConfig[] = [
  {
    key: 'eps',
    titulo: 'Entidades Promotoras de Salud (EPS)',
    descripcion: 'Administradoras de salud disponibles para los colaboradores',
    etiqueta: 'EPS',
    api: configuracionApi.eps,
  },
  {
    key: 'fondos',
    titulo: 'Fondos de Pensión',
    descripcion: 'Administradoras de fondos pensionales',
    etiqueta: 'Fondo',
    api: configuracionApi.fondosPension,
  },
  {
    key: 'arl',
    titulo: 'Administradoras de Riesgos Laborales (ARL)',
    descripcion: 'Entidades de riesgos laborales',
    etiqueta: 'ARL',
    api: configuracionApi.arl,
  },
];

interface SeccionState {
  items: ParametricaColaborador[];
  nuevoNombre: string;
  guardando: boolean;
}

const ESTADO_VACIO: SeccionState = { items: [], nuevoNombre: '', guardando: false };

export function SeguridadSocialTab() {
  const [cargando, setCargando] = useState(true);
  const [secciones, setSecciones] = useState<Record<string, SeccionState>>(() =>
    Object.fromEntries(SECCIONES.map((s) => [s.key, { ...ESTADO_VACIO }]))
  );

  const [aEliminar, setAEliminar] = useState<
    { seccion: SeccionConfig; entidad: ParametricaColaborador } | null
  >(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    Promise.all(SECCIONES.map((s) => s.api.listar({ per_page: 100 })))
      .then((respuestas) => {
        if (cancelado) return;
        setSecciones((prev) => {
          const next = { ...prev };
          SECCIONES.forEach((s, i) => {
            next[s.key] = { ...next[s.key], items: respuestas[i].data };
          });
          return next;
        });
      })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las entidades');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const setNuevoNombre = (key: string, value: string) => {
    setSecciones((prev) => ({ ...prev, [key]: { ...prev[key], nuevoNombre: value } }));
  };

  const agregarEntidad = async (seccion: SeccionConfig) => {
    const estado = secciones[seccion.key];
    const nombre = estado.nuevoNombre.trim();
    if (!nombre) {
      toast.error('Ingresa el nombre de la entidad');
      return;
    }
    setSecciones((prev) => ({ ...prev, [seccion.key]: { ...prev[seccion.key], guardando: true } }));
    try {
      const res = await seccion.api.crear({ nombre });
      setSecciones((prev) => ({
        ...prev,
        [seccion.key]: {
          ...prev[seccion.key],
          items: [...prev[seccion.key].items, res.data],
          nuevoNombre: '',
        },
      }));
      toast.success(res.message ?? `${seccion.etiqueta} agregado correctamente`);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la entidad');
      }
    } finally {
      setSecciones((prev) => ({ ...prev, [seccion.key]: { ...prev[seccion.key], guardando: false } }));
    }
  };

  const toggleEstado = async (seccion: SeccionConfig, entidad: ParametricaColaborador) => {
    try {
      const res = await seccion.api.editar(entidad.id, { estado: !entidad.estado });
      setSecciones((prev) => ({
        ...prev,
        [seccion.key]: {
          ...prev[seccion.key],
          items: prev[seccion.key].items.map((it) => (it.id === entidad.id ? res.data : it)),
        },
      }));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!aEliminar) return;
    const { seccion, entidad } = aEliminar;
    try {
      await seccion.api.eliminar(entidad.id);
      setSecciones((prev) => ({
        ...prev,
        [seccion.key]: {
          ...prev[seccion.key],
          items: prev[seccion.key].items.filter((it) => it.id !== entidad.id),
        },
      }));
      toast.success(`${seccion.etiqueta} eliminado correctamente`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo eliminar la entidad');
    } finally {
      setAEliminar(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando entidades...
      </div>
    );
  }

  return (
    <>
      <ConfirmDeleteDialog
        open={!!aEliminar}
        onOpenChange={(open) => !open && setAEliminar(null)}
        title="Eliminar entidad"
        description={`¿Estás seguro de eliminar "${aEliminar?.entidad.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
      />

      <div className="space-y-6">
        {SECCIONES.map((seccion) => {
          const estado = secciones[seccion.key];
          return (
            <Card key={seccion.key} className="border-border">
              <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
                <CardTitle>{seccion.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{seccion.descripcion}</p>
              </CardHeader>
              <CardContent className="p-6">
                {/* Lista de entidades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {estado.items.map((entidad) => (
                    <div
                      key={entidad.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <span className="font-medium">{entidad.nombre}</span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entidad.estado}
                          onCheckedChange={() => toggleEstado(seccion, entidad)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAEliminar({ seccion, entidad })}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agregar nueva entidad */}
                <div className="flex gap-2">
                  <Input
                    value={estado.nuevoNombre}
                    onChange={(e) => setNuevoNombre(seccion.key, e.target.value)}
                    placeholder={`Nombre del ${seccion.etiqueta.toLowerCase()}`}
                    disabled={estado.guardando}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') agregarEntidad(seccion);
                    }}
                  />
                  <Button
                    onClick={() => agregarEntidad(seccion)}
                    className="gap-2"
                    disabled={estado.guardando}
                  >
                    {estado.guardando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
