'use client';

import { useState, useEffect } from 'react';
import { ProductGrid } from './product-grid';
import { CartSidebar } from './cart-sidebar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores';

type Location = {
  id: string;
  name: string;
};

export function POSClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showCart, setShowCart] = useState(false);

  const cart = useCartStore((state) => state.getActiveCart());
  const itemCount = cart?.items.length || 0;

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.locations || []);

      // Auto-select first location
      if (data.locations && data.locations.length > 0) {
        setSelectedLocation(data.locations[0].id);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Main Content - Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Point of Sale</h1>

            {/* Location Selector */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select location" />
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

          {/* Mobile Cart Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowCart(!showCart)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart ({itemCount})
          </Button>
        </div>

        {/* Product Grid */}
        <ProductGrid locationId={selectedLocation} />
      </div>

      {/* Cart Sidebar - Desktop */}
      <div className="hidden lg:block w-96 border-l bg-white">
        <CartSidebar />
      </div>

      {/* Cart Sidebar - Mobile Overlay */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-white z-50 lg:hidden shadow-xl">
            <CartSidebar onClose={() => setShowCart(false)} />
          </div>
        </>
      )}
    </div>
  );
}
