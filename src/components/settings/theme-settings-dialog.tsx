'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/theme-context';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorSchemes = [
  {
    name: 'Default',
    value: 'default' as const,
    primary: 'oklch(0.208 0.042 265.755)',
  },
  {
    name: 'Blue',
    value: 'blue' as const,
    primary: 'oklch(0.45 0.20 250)',
  },
  {
    name: 'Green',
    value: 'green' as const,
    primary: 'oklch(0.50 0.15 160)',
  },
  {
    name: 'Purple',
    value: 'purple' as const,
    primary: 'oklch(0.45 0.20 300)',
  },
  {
    name: 'Orange',
    value: 'orange' as const,
    primary: 'oklch(0.60 0.20 50)',
  },
  {
    name: 'Red',
    value: 'red' as const,
    primary: 'oklch(0.55 0.22 25)',
  },
  {
    name: 'Pink',
    value: 'pink' as const,
    primary: 'oklch(0.55 0.20 350)',
  },
];

export function ThemeSettingsDialog() {
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='w-full justify-start'>
          <Palette className='h-4 w-4 mr-2' />
          Theme Settings
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Theme Settings</DialogTitle>
          <DialogDescription>
            Customize the appearance of the application
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* Theme Mode */}
          <div className='space-y-3'>
            <Label className='text-base font-medium'>Theme Mode</Label>
            <div className='grid grid-cols-3 gap-2'>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className='justify-start'
                onClick={() => setTheme('light')}
              >
                <Sun className='h-4 w-4 mr-2' />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className='justify-start'
                onClick={() => setTheme('dark')}
              >
                <Moon className='h-4 w-4 mr-2' />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className='justify-start'
                onClick={() => setTheme('system')}
              >
                <Monitor className='h-4 w-4 mr-2' />
                System
              </Button>
            </div>
          </div>

          {/* Color Scheme */}
          <div className='space-y-3'>
            <Label className='text-base font-medium'>Color Scheme</Label>
            <div className='grid grid-cols-2 gap-3'>
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.value}
                  onClick={() => setColorScheme(scheme.value)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border-2 p-3 transition-all hover:border-primary',
                    colorScheme === scheme.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='h-6 w-6 rounded-full border'
                      style={{ backgroundColor: scheme.primary }}
                    />
                    <span className='text-sm font-medium'>{scheme.name}</span>
                  </div>
                  {colorScheme === scheme.value && (
                    <Check className='h-4 w-4 text-primary' />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
