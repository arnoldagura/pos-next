'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin, Phone, Mail, Search } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/list-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { LocationFormDialog, Location } from './location-form-dialog';

export function LocationsClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/locations?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch locations');

      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      toast.error('Failed to load locations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setShowDialog(true);
  };

  const handleDelete = async (location: Location) => {
    const confirmed = confirm(
      `Are you sure you want to delete "${location.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete location');
      }

      toast.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
      console.error(error);
    }
  };

  const formatAddress = (location: Location) => {
    const parts = [
      location.address,
      location.city,
      location.state,
      location.zipCode,
      location.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className='p-6 space-y-4'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold'>Locations</h2>
          <p className='text-gray-600'>Manage warehouse and store locations</p>
        </div>
        <Button
          onClick={() => {
            setSelectedLocation(undefined);
            setShowDialog(true);
          }}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add Location
        </Button>
      </div>

      {/* Search */}
      <div className='flex items-center gap-2'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
          <Input
            placeholder='Search locations...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={5} showToolbar={false} />
      ) : locations.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <MapPin className='h-12 w-12 text-gray-400 mb-4' />
          <p className='text-gray-500 mb-4'>
            {searchQuery ? 'No locations found' : 'No locations yet'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                setSelectedLocation(undefined);
                setShowDialog(true);
              }}
            >
              <Plus className='h-4 w-4 mr-2' />
              Create First Location
            </Button>
          )}
        </div>
      ) : (
        <div className='rounded-md border '>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-[70px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <MapPin className='h-4 w-4 text-gray-400' />
                      <div>
                        <div className='font-medium'>{location.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm text-gray-600'>{formatAddress(location)}</div>
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1 text-sm'>
                      {location.phone && (
                        <div className='flex items-center gap-1 text-gray-600'>
                          <Phone className='h-3 w-3' />
                          {location.phone}
                        </div>
                      )}
                      {location.email && (
                        <div className='flex items-center gap-1 text-gray-600'>
                          <Mail className='h-3 w-3' />
                          {location.email}
                        </div>
                      )}
                      {!location.phone && !location.email && (
                        <span className='text-gray-400'>-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.isActive ? 'default' : 'secondary'}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Pencil className='h-4 w-4 mr-2' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(location)}
                          className='text-red-600'
                        >
                          <Trash2 className='h-4 w-4 mr-2' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LocationFormDialog
        location={selectedLocation}
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => {
          fetchLocations();
          setSelectedLocation(undefined);
        }}
      />
    </div>
  );
}
