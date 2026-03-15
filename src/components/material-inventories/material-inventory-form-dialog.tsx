'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Material, Location, Supplier } from '@/lib/types';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';
import QuickCreateMaterialDialog from './quick-create-material-dialog';

const formSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  locationId: z.string().min(1, 'Location is required'),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  defaultSupplierId: z.string().optional().nullable(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  cost: z.string().optional(),
  alertThreshold: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MaterialInventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MaterialInventoryFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: MaterialInventoryFormDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materialId: '',
      locationId: '',
      variantName: '',
      sku: '',
      defaultSupplierId: '',
      unitOfMeasure: '',
      cost: '',
      alertThreshold: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchMaterials();
      fetchLocations();
      fetchSuppliers();
    }
  }, [open]);

  const fetchMaterials = async (search?: string) => {
    try {
      setLoadingMaterials(true);
      const params = new URLSearchParams({ status: 'active', limit: '100' });
      if (search) params.set('search', search);
      const response = await fetch(`/api/materials?${params}`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleMaterialSearch = useCallback((search: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchMaterials(search || undefined);
    }, 300);
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations?limit=100');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?limit=100');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    setSelectedMaterial(material || null);

    if (material) {
      form.setValue('unitOfMeasure', material.unitOfMeasure);
    }
  };

  const materialOptions: ComboboxOption[] = materials.map((m) => ({
    value: m.id,
    label: m.name + (m.sku ? ` (${m.sku})` : ''),
    description: m.category ? m.category.name : undefined,
  }));

  const handleMaterialCreated = (material: { id: string; name: string; unitOfMeasure: string }) => {
    setMaterials((prev) => [{ ...material, status: true } as unknown as Material, ...prev]);
    form.setValue('materialId', material.id, { shouldValidate: true });
    if (material.unitOfMeasure) {
      form.setValue('unitOfMeasure', material.unitOfMeasure);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const submitData = {
        materialId: values.materialId,
        locationId: values.locationId,
        variantName: values.variantName || undefined,
        sku: values.sku || undefined,
        defaultSupplierId: values.defaultSupplierId || null,
        unitOfMeasure: values.unitOfMeasure,
        cost: values.cost ? parseFloat(values.cost) : undefined,
        alertThreshold: values.alertThreshold ? parseFloat(values.alertThreshold) : undefined,
      };
      const response = await fetch('/api/material-inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create material inventory');
      }

      toast.success('Material inventory created successfully');
      form.reset();
      setSelectedMaterial(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating material inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create material inventory');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Material to Inventory</DialogTitle>
            <DialogDescription>
              Set up inventory tracking for a material at a specific location
            </DialogDescription>
          </DialogHeader>

          <Form form={form} onSubmit={onSubmit} className='space-y-4'>
            <FormField
              control={form.control}
              name='materialId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material *</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      options={materialOptions}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleMaterialChange(value);
                      }}
                      placeholder='Select material'
                      searchPlaceholder='Search materials...'
                      emptyMessage='No materials found.'
                      loading={loadingMaterials}
                      onSearchChange={handleMaterialSearch}
                      onCreateNew={() => setQuickCreateOpen(true)}
                      createNewLabel='Create new material'
                    />
                  </FormControl>
                  {selectedMaterial && (
                    <FormDescription>
                      Unit: {selectedMaterial.unitOfMeasure}
                      {selectedMaterial.category && ` • ${selectedMaterial.category.name}`}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='locationId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select location' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.length === 0 ? (
                        <div className='p-2 text-center text-sm text-muted-foreground'>
                          No locations found
                        </div>
                      ) : (
                        locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Location where this material will be stored</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='variantName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., Standard, Large, Premium' {...field} />
                  </FormControl>
                  <FormDescription>
                    Distinguishes different variants of the same material
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='sku'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='Stock Keeping Unit' {...field} />
                  </FormControl>
                  <FormDescription>Unique identifier for this material variant</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='unitOfMeasure'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., kg, L, pcs' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='defaultSupplierId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Supplier (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select supplier' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>No default supplier</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Preferred supplier for this material variant</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='cost'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost per Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' min='0' placeholder='0.00' {...field} />
                  </FormControl>
                  <FormDescription>Default cost per unit of measure</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='alertThreshold'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Threshold (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='Enter threshold quantity'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Get notified when stock falls below this level
                    {selectedMaterial && ` (in ${selectedMaterial.unitOfMeasure})`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={submitting}>
                {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Add Material
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <QuickCreateMaterialDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onCreated={handleMaterialCreated}
      />
    </>
  );
}
