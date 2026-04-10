import { AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    iconBorder: 'border-yellow-500/30',
    btnClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    confirmLabel: 'Confirmar',
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10',
    iconBorder: 'border-red-500/30',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white',
    confirmLabel: 'Eliminar',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    iconBorder: 'border-blue-500/30',
    btnClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    confirmLabel: 'Aceptar',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    iconBorder: 'border-green-500/30',
    btnClass: 'bg-green-500 hover:bg-green-600 text-white',
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
  if (!open) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const btnLabel = confirmText ?? config.confirmLabel;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!loading) onClose(); }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
        <div className="p-6 text-center">
          {/* Icono */}
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${config.iconBg} ${config.iconBorder}`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>

          {/* Título */}
          <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>

          {/* Descripción */}
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 border-t border-slate-700/60 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${config.btnClass}`}
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
  if (!open) return null;
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${config.iconBg} ${config.iconBorder}`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>
        <div className="border-t border-slate-700/60 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}