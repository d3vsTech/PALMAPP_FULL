import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { TabLoadingGate } from './TabLoadingGate';
import {
  configuracionApi,
  type ParametricaColaborador,
} from '../../../api/configuracion';

type RecursoColaborador = typeof configuracionApi.eps;

interface SeccionConfig {
  key: string;
  titulo: string;
  descripcion: string;
  etiqueta: string;
  api: RecursoColaborador;
  /** Catálogo inicial sembrado en background si la lista viene vacía. */
  defaults: string[];
}

/** Catálogos iniciales — entidades vigentes en Colombia (al 2026). */
const EPS_DEFAULT = [
  'Sura', 'Sanitas', 'Nueva EPS', 'Compensar', 'Famisanar',
  'Salud Total', 'Aliansalud', 'Mutual Ser', 'Coosalud',
  'Capital Salud', 'Cajacopi', 'Asmet Salud', 'Savia Salud',
  'EPM Salud', 'Comfenalco Valle', 'Emssanar', 'Capresoca',
];
const ARL_DEFAULT = [
  'Sura', 'Positiva', 'Colmena Seguros', 'Bolívar',
  'Liberty Seguros', 'La Equidad', 'Mapfre', 'Axa Colpatria', 'Aurora',
];
const FONDOS_PENSION_DEFAULT = [
  'Porvenir', 'Protección', 'Colfondos', 'Skandia', 'Colpensiones',
];
const FONDOS_CESANTIAS_DEFAULT = [
  'Porvenir', 'Protección', 'Colfondos', 'Skandia', 'Fondo Nacional del Ahorro',
];

const SECCIONES: SeccionConfig[] = [
  {
    key: 'eps',
    titulo: 'Entidades Promotoras de Salud (EPS)',
    descripcion: 'Administradoras de salud disponibles para los colaboradores',
    etiqueta: 'EPS',
    api: configuracionApi.eps,
    defaults: EPS_DEFAULT,
  },
  {
    key: 'arl',
    titulo: 'Administradoras de Riesgos Laborales (ARL)',
    descripcion: 'Entidades de riesgos laborales',
    etiqueta: 'ARL',
    api: configuracionApi.arl,
    defaults: ARL_DEFAULT,
  },
  {
    key: 'fondos',
    titulo: 'Fondos de Pensiones',
    descripcion: 'Administradoras de fondos pensionales',
    etiqueta: 'Fondo de Pensiones',
    api: configuracionApi.fondosPension,
    defaults: FONDOS_PENSION_DEFAULT,
  },
  {
    key: 'fondos-cesantias',
    titulo: 'Fondos de Cesantías',
    descripcion: 'Administradoras de fondos de cesantías',
    etiqueta: 'Fondo de Cesantías',
    api: configuracionApi.fondosCesantias,
    defaults: FONDOS_CESANTIAS_DEFAULT,
  },
];

export function SeguridadSocialTab() {
  const [items, setItems] = useState<Record<string, ParametricaColaborador[]>>(() =>
    Object.fromEntries(SECCIONES.map((s) => [s.key, []]))
  );
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const respuestas = await Promise.all(
          SECCIONES.map((s) => s.api.listar({ per_page: 100 })),
        );
        if (cancelado) return;

        const next: Record<string, ParametricaColaborador[]> = {};
        // Sembramos en background cualquier sección que venga vacía.
        await Promise.all(SECCIONES.map(async (s, i) => {
          const existentes = respuestas[i].data ?? [];
          if (existentes.length > 0) {
            next[s.key] = existentes;
            return;
          }
          const creados: ParametricaColaborador[] = [];
          for (const nombre of s.defaults) {
            try {
              const r = await s.api.crear({ nombre });
              creados.push(r.data);
            } catch { /* skip duplicados / fallos puntuales */ }
          }
          next[s.key] = creados;
        }));

        if (!cancelado) setItems(next);
      } catch (e: any) {
        if (!cancelado) toast.error(e?.message ?? 'No se pudieron cargar las entidades');
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const agregarEntidad = async (seccion: SeccionConfig) => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      toast.error('Ingresa el nombre de la entidad');
      return;
    }
    try {
      const res = await seccion.api.crear({ nombre });
      setItems((prev) => ({ ...prev, [seccion.key]: [...prev[seccion.key], res.data] }));
      setNuevoNombre('');
      toast.success(`${seccion.etiqueta} agregado correctamente`);
    } catch (e: any) {
      if (e?.errors) {
        const primero = Object.values(e.errors).flat()[0];
        toast.error(typeof primero === 'string' ? primero : 'Error de validación');
      } else {
        toast.error(e?.message ?? 'No se pudo guardar la entidad');
      }
    }
  };

  const eliminarEntidad = (
    seccion: SeccionConfig,
    entidad: ParametricaColaborador
  ) => {
    confirmDelete({
      title: 'Eliminar entidad',
      description: `¿Estás seguro de eliminar "${entidad.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await seccion.api.eliminar(entidad.id);
          setItems((prev) => ({
            ...prev,
            [seccion.key]: prev[seccion.key].filter((it) => it.id !== entidad.id),
          }));
          toast.success(`${seccion.etiqueta} eliminado correctamente`);
        } catch (e: any) {
          toast.error(e?.message ?? 'No se pudo eliminar la entidad');
        }
      },
    });
  };

  const renderSeccion = (seccion: SeccionConfig) => {
    const lista = items[seccion.key] ?? [];
    return (
      <Card key={seccion.key} className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle>{seccion.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{seccion.descripcion}</p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Lista de entidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {[...lista].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })).map((entidad) => (
              <div
                key={entidad.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
              >
                <span className="font-medium">{entidad.nombre}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminarEntidad(seccion, entidad)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Agregar nueva entidad */}
          <div className="flex gap-2">
            <Input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder={`Nombre del ${seccion.etiqueta.toLowerCase()}`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  agregarEntidad(seccion);
                }
              }}
            />
            <Button onClick={() => agregarEntidad(seccion)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {ConfirmDeleteDialog}
      <TabLoadingGate loading={loading} message="Cargando seguridad social…">
      <div className="space-y-6">
        {SECCIONES.map((seccion) => renderSeccion(seccion))}
      </div>
      </TabLoadingGate>
    </>
  );
}
