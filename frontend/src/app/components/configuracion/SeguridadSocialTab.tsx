import { useEffect, useState } from 'react';
import { ConfigSection, ConfigRowActions } from './ConfigSection';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';
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
    titulo: 'Entidades promotoras de salud (EPS)',
    descripcion: 'Administradoras de salud disponibles para los colaboradores.',
    etiqueta: 'EPS',
    api: configuracionApi.eps,
    defaults: EPS_DEFAULT,
  },
  {
    key: 'arl',
    titulo: 'Administradoras de riesgos laborales (ARL)',
    descripcion: 'Entidades de riesgos laborales.',
    etiqueta: 'ARL',
    api: configuracionApi.arl,
    defaults: ARL_DEFAULT,
  },
  {
    key: 'fondos',
    titulo: 'Fondos de pensiones',
    descripcion: 'Administradoras de fondos pensionales.',
    etiqueta: 'Fondo de pensiones',
    api: configuracionApi.fondosPension,
    defaults: FONDOS_PENSION_DEFAULT,
  },
  {
    key: 'fondos-cesantias',
    titulo: 'Fondos de cesantías',
    descripcion: 'Administradoras de fondos de cesantías.',
    etiqueta: 'Fondo de cesantías',
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
      <ConfigSection title={seccion.titulo} description={seccion.descripcion} flush>
        {lista.length > 0 ? (
          <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
            {[...lista]
              .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
              .map((entidad, i) => (
                <li
                  key={entidad.id}
                  className={cn(
                    'flex items-center justify-between gap-2 py-1.5 pl-5 pr-3',
                    'sm:border-b sm:border-border',
                    i % 2 === 1 && 'sm:border-l',
                  )}
                >
                  <span className="break-words text-sm font-medium text-foreground">{entidad.nombre}</span>
                  <ConfigRowActions
                    label={entidad.nombre}
                    onDelete={() => eliminarEntidad(seccion, entidad)}
                  />
                </li>
              ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Todavía no hay entidades registradas.
          </p>
        )}

        <div className="flex gap-2 border-t border-border px-5 py-4 sm:border-t-0">
          <Input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder={`Nombre de la ${/^[A-Z]+$/.test(seccion.etiqueta) ? seccion.etiqueta : seccion.etiqueta.toLowerCase()}`}
            aria-label={`Nombre de la nueva entidad (${seccion.etiqueta})`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') agregarEntidad(seccion);
            }}
          />
          <Button variant="outline" onClick={() => agregarEntidad(seccion)}>
            <Plus strokeWidth={2} />
            Agregar
          </Button>
        </div>
      </ConfigSection>
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
