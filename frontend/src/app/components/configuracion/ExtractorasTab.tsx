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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Edit, Factory, Phone, Mail, MapPin } from 'lucide-react';
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
      <Card className="border-border">
        <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extractoras</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Plantas extractoras de aceite de palma</p>
            </div>
            <Button onClick={() => navigate('/configuracion/extractoras/nueva')}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Extractora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {extractoras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Factory className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No hay extractoras registradas</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Agrega las plantas extractoras con las que trabajas
              </p>
              <Button onClick={() => navigate('/configuracion/extractoras/nueva')}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Extractora
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {extractoras.map((extractora) => (
                <div
                  key={extractora.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Factory className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{extractora.razon_social}</h3>
                          {extractora.nit && (
                            <p className="text-sm text-muted-foreground">NIT: {extractora.nit}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                        {(extractora.ubicacion || extractora.ciudad) && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {extractora.ubicacion}
                              {extractora.ubicacion && extractora.ciudad ? ', ' : ''}
                              {extractora.ciudad}
                            </span>
                          </div>
                        )}
                        {extractora.contacto_nombre && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Contacto:</span>
                            <span className="font-medium">{extractora.contacto_nombre}</span>
                          </div>
                        )}
                        {extractora.telefono && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{extractora.telefono}</span>
                          </div>
                        )}
                        {extractora.telefono_fijo && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{extractora.telefono_fijo}</span>
                          </div>
                        )}
                        {extractora.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{extractora.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/configuracion/extractoras/editar/${extractora.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarExtractora(extractora)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabLoadingGate>
    </>
  );
}
