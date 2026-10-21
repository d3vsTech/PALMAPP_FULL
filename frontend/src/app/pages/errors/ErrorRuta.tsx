/**
 * Lo que se ve cuando una pantalla revienta.
 *
 * Sin esto, un error dentro de cualquier componente dejaba la página en blanco:
 * React Router desmonta el árbol y no pone nada en su lugar. El usuario veía
 * el fondo vacío, sin saber si la aplicación se cayó o si está cargando, y sin
 * forma de salir salvo escribir otra URL.
 *
 * Se cuelga de las rutas raíz con `errorElement`, así que cubre cualquier
 * pantalla que cuelgue de ellas.
 */
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

/** El texto que se le muestra al usuario, sin jerga ni stack traces. */
function mensajeDe(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? 'Esa página no existe o se movió.'
      : `El servidor respondió ${error.status}.`;
  }
  return 'Algo falló al abrir esta pantalla.';
}

/** El detalle técnico. Solo sirve en desarrollo; al usuario no le dice nada. */
function detalleDe(error: unknown): string | null {
  if (!import.meta.env.DEV) return null;
  if (error instanceof Error) return error.stack ?? error.message;
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  return typeof error === 'string' ? error : null;
}

export default function ErrorRuta() {
  const error = useRouteError();
  const navigate = useNavigate();
  const detalle = detalleDe(error);

  // El error llega aquí y no a la consola del navegador: sin esto se pierde.
  // eslint-disable-next-line no-console
  console.error('[ruta]', error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">{mensajeDe(error)}</h1>
          <p className="text-sm text-muted-foreground">
            No se perdió nada de lo que ya estaba guardado. Puede volver atrás o
            cargar la pantalla de nuevo.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>

        {detalle && (
          <details className="rounded-lg border border-border bg-muted/30 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Detalle técnico
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {detalle}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
