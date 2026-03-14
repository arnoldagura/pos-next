'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      icons={{
        success: <CircleCheckIcon className='size-4' />,
        info: <InfoIcon className='size-4' />,
        warning: <TriangleAlertIcon className='size-4' />,
        error: <OctagonXIcon className='size-4' />,
        loading: <Loader2Icon className='size-4 animate-spin' />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          success:
            'group-[.toaster]:!bg-green-50 dark:group-[.toaster]:!bg-green-950/30 group-[.toaster]:!text-green-900 dark:group-[.toaster]:!text-green-100 group-[.toaster]:!border-green-200 dark:group-[.toaster]:!border-green-800',
          error:
            'group-[.toaster]:!bg-red-50 dark:group-[.toaster]:!bg-red-950/30 group-[.toaster]:!text-red-900 dark:group-[.toaster]:!text-red-100 group-[.toaster]:!border-red-200 dark:group-[.toaster]:!border-red-800',
          warning:
            'group-[.toaster]:!bg-yellow-50 dark:group-[.toaster]:!bg-yellow-950/30 group-[.toaster]:!text-yellow-900 dark:group-[.toaster]:!text-yellow-100 group-[.toaster]:!border-yellow-200 dark:group-[.toaster]:!border-yellow-800',
          info: 'group-[.toaster]:!bg-blue-50 dark:group-[.toaster]:!bg-blue-950/30 group-[.toaster]:!text-blue-900 dark:group-[.toaster]:!text-blue-100 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!border-blue-800',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      style={
        {
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
