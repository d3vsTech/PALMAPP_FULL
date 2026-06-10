/**
 * ExtractorasTab — listado de extractoras de aceite de palma.
 *
 * El create/edit ya no es un modal en este tab: el botón "Nueva Extractora"
 * navega a `/configuracion/extractoras/nueva` y el lápiz a
 * `/configuracion/extractoras/editar/:id` — ver [NuevaExtractora.tsx].
 */
import { useEffect, useState } from 'react';
import { cached } from '../../../api/cache';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
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
      .catch((e: any) => toast.error(e?.message ?? 'No se pudieron cargar las extractoras'))
      .finally(() => setLoading(false));
  }, []);

  const eliminarExtractora = (extractora: Extractora) => {
    confirmDelete({
      title: 'Eliminar extractora',
      description: `¿Estás seguro de eliminar "${extractora.razon_social}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await extractorasApi.eliminar(extractora.id);
          setExtractoras((prev) => prev.filter((e) => e.id !== extractora.id));
          toast.success('Extractora eliminada');
        } catch (e: any) {
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay extractoras registradas. Agrega la primera con "Nueva Extractora".
            </p>
          ) : (
            <div className="space-y-3">
              {extractoras.map((extractora) => (
                <div
                  key={extractora.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{extractora.razon_social}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {extractora.nit && <span>NIT: {extractora.nit}</span>}
                        {extractora.ciudad && <span>📍 {extractora.ciudad}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/configuracion/extractoras/editar/${extractora.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarExtractora(extractora)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Información de contacto */}
                  {(extractora.contacto_nombre || extractora.telefono || extractora.email || extractora.ubicacion) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-3 border-t border-border">
                      {extractora.contacto_nombre && (
                        <div>
                          <span className="text-muted-foreground">Contacto:</span>
                          <span className="ml-2 font-medium">{extractora.contacto_nombre}</span>
                        </div>
                      )}
                      {extractora.telefono && (
                        <div>
                          <span className="text-muted-foreground">Celular:</span>
                          <span className="ml-2 font-medium">{extractora.telefono}</span>
                        </div>
                      )}
                      {extractora.telefono_fijo && (
                        <div>
                          <span className="text-muted-foreground">Tel. Fijo:</span>
                          <span className="ml-2 font-medium">{extractora.telefono_fijo}</span>
                        </div>
                      )}
                      {extractora.email && (
                        <div>
                          <span className="text-muted-foreground">Correo:</span>
                          <span className="ml-2 font-medium">{extractora.email}</span>
                        </div>
                      )}
                      {extractora.ubicacion && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Dirección:</span>
                          <span className="ml-2 font-medium">{extractora.ubicacion}</span>
                        </div>
                      )}
                    </div>
                  )}
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
