import React from 'react';
import { Button } from './Button.tsx';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 my-4">
      <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 ring-8 ring-amber-500/5">
        {icon}
      </div>
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mb-5">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div 
          className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 text-left rtl:text-right shadow-2xl transition-all relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            {message}
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
