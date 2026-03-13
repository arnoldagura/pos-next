'use client';

import { useState, useEffect } from 'react';
import { ProductGrid } from './product-grid';
import { CartSidebar } from './cart-sidebar';
import { ShortcutHelpDialog } from './shortcut-help-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, ShoppingCart, Keyboard } from 'lucide-react';
import { useCartStore } from '@/stores';

type Location = {
  id: string;
  name: string;
};

export function POSClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showCart, setShowCart] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const cart = useCartStore((state) => state.getActiveCart());
  const itemCount = isClient ? (cart?.items.length || 0) : 0;

  useEffect(() => {
    setIsClient(true);
    fetchLocations();
  }, []);

  // Listen for help shortcut (? key) at this level too
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowHelp(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.locations || []);

      if (data.locations && data.locations.length > 0) {
        setSelectedLocation(data.locations[0].id);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  return (
    <div className='flex h-screen overflow-hidden '>
      <div className='flex-1 flex flex-col overflow-hidden'>
        <div className=' border-b px-6 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <h1 className='text-2xl font-bold'>Point of Sale</h1>

            <div className='flex items-center gap-2'>
              <MapPin className='h-4 w-4 text-gray-500' />
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='Select location' />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowHelp(true)}
              className='hidden lg:flex text-muted-foreground'
              title='Keyboard shortcuts (?)'
            >
              <Keyboard className='h-4 w-4' />
            </Button>

            <Button
              variant='outline'
              size='sm'
              className='lg:hidden'
              onClick={() => setShowCart(!showCart)}
            >
              <ShoppingCart className='h-4 w-4 mr-2' />
              Cart ({itemCount})
            </Button>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid locationId={selectedLocation} />
      </div>

      {/* Cart Sidebar - Desktop */}
      <div className='hidden lg:block w-96 border-l '>
        <CartSidebar locationId={selectedLocation} />
      </div>

      {/* Cart Sidebar - Mobile Overlay */}
      {showCart && (
        <>
          <div
            className='fixed inset-0 bg-black/50 z-40 lg:hidden'
            onClick={() => setShowCart(false)}
          />
          <div className='fixed right-0 top-0 bottom-0 w-96 max-w-full  z-50 lg:hidden shadow-xl'>
            <CartSidebar
              onClose={() => setShowCart(false)}
              locationId={selectedLocation}
            />
          </div>
        </>
      )}

      {/* Keyboard Shortcuts Help */}
      <ShortcutHelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
