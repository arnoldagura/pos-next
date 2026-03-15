'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export type PeriodPreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: {
  id: PeriodPreset;
  label: string;
  getDates: () => { start: string; end: string };
}[] = [
  {
    id: 'today',
    label: 'Today',
    getDates: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { start: today, end: today };
    },
  },
  {
    id: '7d',
    label: '7 Days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
  {
    id: '30d',
    label: '30 Days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
  {
    id: '90d',
    label: '90 Days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 89);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
];

export function getDefaultDateRange(): DateRange {
  const today = format(new Date(), 'yyyy-MM-dd');
  return { startDate: today, endDate: today, label: 'Today' };
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const activePreset = PRESETS.find((p) => {
    const dates = p.getDates();
    return dates.start === value.startDate && dates.end === value.endDate;
  });

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    const dates = preset.getDates();
    onChange({ startDate: dates.start, endDate: dates.end, label: preset.label });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      const startLabel = format(new Date(customStart + 'T00:00:00'), 'MMM d');
      const endLabel = format(new Date(customEnd + 'T00:00:00'), 'MMM d, yyyy');
      onChange({
        startDate: customStart,
        endDate: customEnd,
        label: `${startLabel} - ${endLabel}`,
      });
      setPopoverOpen(false);
    }
  };

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      {PRESETS.map((preset) => (
        <Button
          key={preset.id}
          variant={activePreset?.id === preset.id ? 'default' : 'outline'}
          size='sm'
          onClick={() => handlePreset(preset)}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant={!activePreset ? 'default' : 'outline'} size='sm' className='gap-1'>
            <Calendar className='h-4 w-4' />
            {!activePreset ? value.label : 'Custom'}
            <ChevronDown className='h-3 w-3' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-4' align='end'>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='start-date'>Start Date</Label>
              <Input
                id='start-date'
                type='date'
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd}
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='end-date'>End Date</Label>
              <Input
                id='end-date'
                type='date'
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button
              size='sm'
              className='w-full'
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd || customStart > customEnd}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
