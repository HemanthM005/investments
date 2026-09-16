'use client';

import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red for destructive actions. */
  destructive?: boolean;
  onConfirm: () => void;
  /** Optional extra control, e.g. a "also delete the linked record" checkbox. */
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {destructive && <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        {description && (
          <div className="text-sm leading-relaxed text-slate-400">{description}</div>
        )}

        {children}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={destructive ? 'bg-red-600 text-white hover:bg-red-500' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
