'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface InventoryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function InventoryFilters({ searchQuery, onSearchChange }: InventoryFiltersProps) {
  return (
    <div className='flex items-center gap-4'>
      <div className='relative flex-1 max-w-sm'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search products or SKU...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-10'
        />
      </div>
    </div>
  );
}
