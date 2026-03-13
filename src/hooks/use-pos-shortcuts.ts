'use client';

import { useEffect, useCallback } from 'react';

export interface PosShortcutHandlers {
  onNewOrder?: () => void;       // F1
  onSearch?: () => void;         // F2
  onCheckout?: () => void;       // F3
  onHoldOrder?: () => void;      // F4
  onPendingOrders?: () => void;  // F5
  onTableSelect?: () => void;    // F6
  onClearCart?: () => void;      // F8
  onHelp?: () => void;           // ?
}

export function usePosShortcuts(handlers: PosShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow F-keys and ? even when in inputs (except for search-related)
      if (isInput && !e.key.startsWith('F')) {
        // Only allow ? shortcut outside inputs
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          handlers.onNewOrder?.();
          break;
        case 'F2':
          e.preventDefault();
          handlers.onSearch?.();
          break;
        case 'F3':
          e.preventDefault();
          handlers.onCheckout?.();
          break;
        case 'F4':
          e.preventDefault();
          handlers.onHoldOrder?.();
          break;
        case 'F5':
          e.preventDefault();
          handlers.onPendingOrders?.();
          break;
        case 'F6':
          e.preventDefault();
          handlers.onTableSelect?.();
          break;
        case 'F8':
          e.preventDefault();
          handlers.onClearCart?.();
          break;
        case '?':
          if (!isInput) {
            e.preventDefault();
            handlers.onHelp?.();
          }
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const POS_SHORTCUTS = [
  { key: 'F1', label: 'New Order' },
  { key: 'F2', label: 'Search Products' },
  { key: 'F3', label: 'Checkout' },
  { key: 'F4', label: 'Hold Order' },
  { key: 'F5', label: 'Pending Orders' },
  { key: 'F6', label: 'Select Table' },
  { key: 'F8', label: 'Clear Cart' },
  { key: '?', label: 'Show Shortcuts' },
  { key: 'Ctrl+K', label: 'Focus Search' },
  { key: 'Ctrl+B', label: 'Barcode Scanner' },
  { key: 'Esc', label: 'Clear Search / Close' },
] as const;
