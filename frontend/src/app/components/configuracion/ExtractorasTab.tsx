/**
 * ExtractorasTab — listado de extractoras de aceite de palma.
 *
 * El create/edit ya no es un modal en este tab: el botón "Nueva Extractora"
 * navega a `/configuracion/extractoras/nueva` y el lápiz a
 * `/configuracion/extractoras/editar/:id` — ver [NuevaExtractora.tsx].
 *
 * Diseño visual portado del V.15 (`PalmApp - V220626`): empty state con icono,
 * tarjetas con icono Factory, grid de contacto con iconos. La capa de datos
 * usa `extractorasApi` real (no mocks).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfigSection, ConfigEmpty, ConfigRowActions } from './ConfigSection';
import { Button } from '../ui/button';
import { Plus, Phone, Mail, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { cached } from '../../../api/cache';
import { extractorasApi, type Extractora } from '../../../api/viajes';
import { TabLoadingGate } from './TabLoadingGate';

export function ExtractorasTab() {
  const navigate = useNavigate();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const [extractoras, setExtractoras] = useState<Extractora[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cached('config:extractoras', () => extractorasApi.listar({ per_page: 100 }))
      .then((res) => setExtractoras(res.data))
      .catch((e: any) => {
        console.error('[ExtractorasTab] Error al cargar extractoras:', e);
        toast.error(e?.message ?? 'No se pudieron cargar las extractoras');
      })
      .finally(() => setLoading(false));
  }, []);

  const eliminarExtractora = (extractora: Extractora) => {
    confirmDelete({
      title: '¿Eliminar extractora?',
      description: `¿Estás seguro de que deseas eliminar "${extractora.razon_social}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await extractorasApi.eliminar(extractora.id);
          setExtractoras((prev) => prev.filter((e) => e.id !== extractora.id));
          toast.success('Extractora eliminada correctamente');
        } catch (e: any) {
          console.error('[ExtractorasTab] Error al eliminar:', e);
          toast.error(e?.message ?? 'No se pudo eliminar la extractora');
        }
      },
    });
  };

  return (
    <>
      {ConfirmDeleteDialog}

      <TabLoadingGate loading={loading} message="Cargando extractoras…">
      <ConfigSection
        title="Extractoras"
        description="Plantas extractoras de aceite de palma a las que se despacha fruto."
        flush
        actions={
          <Button onClick={() => navigate('/configuracion/extractoras/nueva')}>
            <Plus strokeWidth={2} />
            Nueva extractora
          </Button>
        }
      >
        {extractoras.length === 0 ? (
          <ConfigEmpty
            title="No hay extractoras registradas"
            description="Agrega las plantas extractoras con las que trabajas."
            action={
              <Button onClick={() => navigate('/configuracion/extractoras/nueva')}>
                <Plus strokeWidth={2} />
                Agregar extractora
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {[...extractoras]
              .sort((a, b) => (a.razon_social ?? '').localeCompare(b.razon_social ?? '', 'es', { sensitivity: 'base' }))
              .map((extractora) => (
                <li key={extractora.id} className="flex items-start justify-between gap-3 py-4 pl-5 pr-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">{extractora.razon_social}</p>
                      {extractora.nit && (
                        <p className="text-xs text-muted-foreground">NIT {extractora.nit}</p>
                      )}
                    </div>
                    <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      {(extractora.ubicacion || extractora.ciudad) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <dd className="break-words">
                            {extractora.ubicacion}
                            {extractora.ubicacion && extractora.ciudad ? ', ' : ''}
                            {extractora.ciudad}
                          </dd>
                        </div>
                      )}
                      {extractora.contacto_nombre && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <dd className="truncate text-foreground">{extractora.contacto_nombre}</dd>
                        </div>
                      )}
                      {extractora.telefono && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <dd className="tabular-nums">{extractora.telefono}</dd>
                        </div>
                      )}
                      {extractora.telefono_fijo && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <dd className="tabular-nums">{extractora.telefono_fijo}</dd>
                        </div>
                      )}
                      {extractora.email && (
                        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <dd className="break-all">{extractora.email}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <ConfigRowActions
                    label={extractora.razon_social ?? 'extractora'}
                    onEdit={() => navigate(`/configuracion/extractoras/editar/${extractora.id}`)}
                    onDelete={() => eliminarExtractora(extractora)}
                  />
                </li>
              ))}
          </ul>
        )}
      </ConfigSection>
      </TabLoadingGate>
    </>
  );
}
