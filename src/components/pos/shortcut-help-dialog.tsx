'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { POS_SHORTCUTS } from '@/hooks/use-pos-shortcuts';
import { Keyboard } from 'lucide-react';

interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Keyboard className='h-5 w-5' />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Quick actions for faster POS operation</DialogDescription>
        </DialogHeader>

        <div className='space-y-1'>
          {POS_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className='flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50'
            >
              <span className='text-sm'>{shortcut.label}</span>
              <kbd className='inline-flex items-center rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium'>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
