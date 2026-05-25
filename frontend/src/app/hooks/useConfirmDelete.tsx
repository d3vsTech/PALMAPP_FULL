import { useState } from 'react';
import { ConfirmDeleteDialog } from '../components/ui/confirm-delete-dialog';

interface UseConfirmDeleteOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDelete() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmDeleteOptions>({
    title: '¿Estás seguro?',
    description: 'Esta acción no se puede deshacer.',
    confirmText: 'Eliminar',
    onConfirm: () => {},
  });

  const confirmDelete = (opts: UseConfirmDeleteOptions) => {
    setOptions({
      title: opts.title || '¿Estás seguro?',
      description: opts.description || 'Esta acción no se puede deshacer.',
      confirmText: opts.confirmText || 'Eliminar',
      onConfirm: opts.onConfirm,
    });
    setIsOpen(true);
  };

  const dialog = (
    <ConfirmDeleteDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title={options.title || '¿Estás seguro?'}
      description={options.description || 'Esta acción no se puede deshacer.'}
      confirmText={options.confirmText || 'Eliminar'}
      onConfirm={options.onConfirm}
    />
  );

  return { confirmDelete, ConfirmDeleteDialog: dialog };
}
