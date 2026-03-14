'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: string;
  isDefault?: boolean;
}

interface TenantSelectorProps {
  organizations: Organization[];
  currentOrganizationId: string | null;
  collapsed?: boolean;
}

export function TenantSelector({
  organizations,
  currentOrganizationId,
  collapsed = false,
}: TenantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentOrg = organizations.find((org) => org.id === currentOrganizationId);

  const handleSelectOrganization = async (organizationId: string) => {
    if (organizationId === currentOrganizationId) {
      setOpen(false);
      return;
    }

    setSwitching(true);

    try {
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to switch organization');
      }

      // Invalidate all queries to refetch with new tenant context
      await queryClient.invalidateQueries();

      toast.success('Organization switched successfully');

      // Refresh the page to reload with new tenant context
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  // Show only icon when collapsed
  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='h-10 w-10 p-0'
            title={currentOrg?.name || 'Select organization'}
            disabled={switching}
          >
            <Building2 className='h-5 w-5' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-64 p-0' align='start'>
          <OrganizationList
            organizations={organizations}
            currentOrganizationId={currentOrganizationId}
            onSelect={handleSelectOrganization}
            switching={switching}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          disabled={switching}
        >
          <div className='flex items-center gap-2 min-w-0'>
            <Building2 className='h-4 w-4 shrink-0' />
            <span className='truncate'>{currentOrg?.name || 'Select organization'}</span>
          </div>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 p-0' align='start'>
        <OrganizationList
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
          onSelect={handleSelectOrganization}
          switching={switching}
        />
      </PopoverContent>
    </Popover>
  );
}

interface OrganizationListProps {
  organizations: Organization[];
  currentOrganizationId: string | null;
  onSelect: (organizationId: string) => void;
  switching: boolean;
}

function OrganizationList({
  organizations,
  currentOrganizationId,
  onSelect,
  switching,
}: OrganizationListProps) {
  return (
    <Command>
      <CommandInput placeholder='Search organizations...' />
      <CommandList>
        <CommandEmpty>No organization found.</CommandEmpty>
        <CommandGroup>
          {organizations.map((org) => (
            <CommandItem
              key={org.id}
              value={org.name}
              onSelect={() => onSelect(org.id)}
              disabled={switching}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  currentOrganizationId === org.id ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div className='flex flex-col min-w-0 flex-1'>
                <span className='truncate'>{org.name}</span>
                {org.role && (
                  <span className='text-xs text-muted-foreground truncate'>{org.role}</span>
                )}
              </div>
              {org.isDefault && (
                <span className='ml-2 text-xs bg-muted px-2 py-0.5 rounded'>Default</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
