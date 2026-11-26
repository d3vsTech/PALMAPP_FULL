import { AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';

type VariantType = 'warning' | 'danger' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: VariantType;
  loading?: boolean;
}

const variantConfig: Record<VariantType, {
  icon: typeof AlertTriangle;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  btnClass: string;
  confirmLabel: string;
}> = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    iconBg: 'bg-warning-soft',
    iconBorder: 'border-warning/20',
    btnClass: 'bg-warning hover:bg-warning text-white',
    confirmLabel: 'Confirmar',
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive-soft',
    iconBorder: 'border-destructive/20',
    btnClass: 'bg-destructive hover:bg-destructive text-white',
    confirmLabel: 'Eliminar',
  },
  info: {
    icon: Info,
    iconColor: 'text-info',
    iconBg: 'bg-info-soft',
    iconBorder: 'border-info/20',
    btnClass: 'bg-info hover:bg-info text-white',
    confirmLabel: 'Aceptar',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-success',
    iconBg: 'bg-success-soft',
    iconBorder: 'border-success/20',
    btnClass: 'bg-success hover:bg-success text-white',
    confirmLabel: 'Confirmar',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Cancelar',
  variant = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  // Antes del `return null`: un hook no se puede llamar condicionalmente.
  // Mientras guarda no se cierra, para no dejar la operación a medias.
  useCerrarConEscape(open && !loading, onClose);

  if (!open) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const btnLabel = confirmText ?? config.confirmLabel;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Fondo. Es un atajo del mouse: por teclado se sale con Escape, así que
          para un lector de pantalla es decoración. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!loading) onClose(); }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-muted shadow-md">
        <div className="p-6 text-center">
          {/* Icono */}
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${config.iconBg} ${config.iconBorder}`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>

          {/* Título */}
          <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>

          {/* Descripción */}
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 ${config.btnClass}`}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </span>
            ) : (
              btnLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// === ALERT DIALOG (solo mensaje, sin confirmación) ===
interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  variant?: VariantType;
}

export function AlertDialog({ open, onClose, title, description, variant = 'info' }: AlertDialogProps) {
  useCerrarConEscape(open, onClose);

  if (!open) return null;
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-muted shadow-md">
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${config.iconBg} ${config.iconBorder}`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <div className="border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-muted py-2.5 text-sm font-semibold text-white transition-colors hover:bg-muted"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}