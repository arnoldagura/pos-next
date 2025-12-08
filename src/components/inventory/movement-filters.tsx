'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MOVEMENT_TYPE_LABELS, type MovementType } from '@/hooks/use-movements';

interface MovementFiltersProps {
  filters: {
    type?: MovementType;
    startDate?: string;
    endDate?: string;
  };
  onFiltersChange: (filters: {
    type?: MovementType;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export function MovementFilters({ filters, onFiltersChange }: MovementFiltersProps) {
  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === 'all' ? undefined : (value as MovementType),
    });
  };

  const handleStartDateChange = (value: string) => {
    onFiltersChange({
      ...filters,
      startDate: value || undefined,
    });
  };

  const handleEndDateChange = (value: string) => {
    onFiltersChange({
      ...filters,
      endDate: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasActiveFilters = filters.type || filters.startDate || filters.endDate;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Movement Type</Label>
          <Select
            value={filters.type || 'all'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
