/**
 * AvatarColaborador — componente reutilizable para mostrar/subir/eliminar el avatar.
 *
 * Implementa la sección "Avatar del Colaborador" de la API:
 *  - POST   /api/v1/tenant/colaboradores/{id}/avatar  (multipart, campo `avatar`, máx 3 MB, jpg/png/webp)
 *  - DELETE /api/v1/tenant/colaboradores/{id}/avatar
 *  - Fallback a iniciales (primer_nombre + primer_apellido) cuando avatar_url es null
 *  - Manejo de errores 422 (errors.avatar[]) y 409 AVATAR_NOT_FOUND
 *
 * Los botones son SIEMPRE visibles (no solo al hover) para que funcione en touchscreen.
 */
import { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { colaboradoresApi } from '../../../api/colaboradores';
import { toast } from 'sonner';

interface AvatarColaboradorProps {
  colaboradorId: number;
  avatarUrl?: string | null;
  primerNombre?: string;
  primerApellido?: string;
  estado?: boolean;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  /** Callback que recibe el colaborador actualizado tras subir/eliminar avatar */
  onUpdate?: (colaboradorActualizado: any) => void;
}

const SIZE_MAP = {
  sm: { box: 'h-12 w-12', text: 'text-sm', icon: 'h-3 w-3', btn: 'h-6 w-6' },
  md: { box: 'h-20 w-20', text: 'text-xl', icon: 'h-4 w-4', btn: 'h-7 w-7' },
  lg: { box: 'h-24 w-24', text: 'text-2xl', icon: 'h-4 w-4', btn: 'h-8 w-8' },
};

const MIMES_OK = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Extrae el mensaje más específico del error de la API.
 * Para 422: errors.avatar[0]. Para 409: code AVATAR_NOT_FOUND. Default: message.
 */
function mensajeError(err: unknown): string {
  if (err instanceof Error) {
    // En request.ts el `message` ya viene parseado, pero si es "Error de validación"
    // intentamos buscar más detalle en el message original
    return err.message;
  }
  return 'Error al procesar el avatar';
}

export function AvatarColaborador({
  colaboradorId,
  avatarUrl,
  primerNombre,
  primerApellido,
  estado = true,
  size = 'lg',
  editable = false,
  onUpdate,
}: AvatarColaboradorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dim = SIZE_MAP[size];
  const iniciales = ((primerNombre?.[0] ?? '') + (primerApellido?.[0] ?? '')).toUpperCase() || '??';

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación cliente
    if (!MIMES_OK.includes(file.type.toLowerCase())) {
      toast.error('Formato inválido. Solo JPG, PNG o WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('El avatar no puede superar los 3 MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await colaboradoresApi.subirAvatar(colaboradorId, fd);
      toast.success(res.message ?? 'Avatar actualizado correctamente');
      onUpdate?.(res.data);
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEliminar = async () => {
    setDeleting(true);
    try {
      const res = await colaboradoresApi.eliminarAvatar(colaboradorId);
      toast.success(res.message ?? 'Avatar eliminado correctamente');
      onUpdate?.(res.data);
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Imagen / iniciales */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${primerNombre ?? ''} ${primerApellido ?? ''}`.trim() || 'Avatar'}
          className={`${dim.box} rounded-full object-cover border-2 ${estado ? 'border-primary/20' : 'border-border opacity-60'}`}
        />
      ) : (
        <div
          className={`${dim.box} rounded-full flex items-center justify-center font-bold border-2 ${dim.text} ${
            estado ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {iniciales}
        </div>
      )}

      {/* Botones siempre visibles (compatibles con touch) */}
      {editable && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleSubir}
          />

          {/* Botón cámara — abajo-derecha */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || deleting}
            title={avatarUrl ? 'Cambiar foto' : 'Subir foto'}
            className={`${dim.btn} absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground border-2 border-background shadow-md hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {uploading ? <Loader2 className={`${dim.icon} animate-spin`} /> : <Camera className={dim.icon} />}
          </button>

          {/* Botón eliminar — abajo-izquierda (solo si hay avatar) */}
          {avatarUrl && (
            <button
              type="button"
              onClick={handleEliminar}
              disabled={uploading || deleting}
              title="Eliminar foto"
              className={`${dim.btn} absolute bottom-0 left-0 rounded-full bg-destructive text-destructive-foreground border-2 border-background shadow-md hover:bg-destructive/90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {deleting ? <Loader2 className={`${dim.icon} animate-spin`} /> : <Trash2 className={dim.icon} />}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AvatarColaborador;