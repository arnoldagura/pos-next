'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      return data.locations || [];
    },
  });

  if (isLoading) {
    return <div className='w-[200px] text-sm text-muted-foreground'>Loading locations...</div>;
  }

  return (
    <div className='flex items-center gap-2'>
      <MapPin className='h-4 w-4 text-muted-foreground' />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className='w-full sm:w-[200px]'>
          <SelectValue placeholder='Filter by category' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Locations</SelectItem>
          {locations?.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
