'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';
import QuickCreateCategoryDialog from '@/components/ui/quick-create-category-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const MATERIAL_TYPES = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'goods_for_resale', label: 'Goods for Resale' },
  { value: 'operation_supplies', label: 'Operation Supplies' },
  { value: 'wip_products', label: 'Work-in-Progress Products' },
] as const;

interface QuickCreateMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (material: { id: string; name: string; unitOfMeasure: string }) => void;
}

export default function QuickCreateMaterialDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateMaterialDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<ComboboxOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [quickCreateCategoryOpen, setQuickCreateCategoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingCategories(true);
      fetch('/api/material-categories?isActive=true&limit=100')
        .then((r) => r.json())
        .then((data) => {
          setCategories(
            (data.categories || []).map((c: { id: string; name: string }) => ({
              value: c.id,
              label: c.name,
            }))
          );
        })
        .catch(() => toast.error('Failed to load categories'))
        .finally(() => setLoadingCategories(false));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          ...(categoryId ? { categoryId } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create material');
      }

      const material = await response.json();
      toast.success(`Material "${name.trim()}" created`);
      setName('');
      setType('');
      setCategoryId('');
      onOpenChange(false);
      onCreated({
        id: material.id,
        name: material.name,
        unitOfMeasure: material.unitOfMeasure || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[400px]'>
        <DialogHeader>
          <DialogTitle>Quick Create Material</DialogTitle>
          <DialogDescription>
            Create a new material to add to inventory. You can edit details later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='material-name'>Material Name *</Label>
            <Input
              id='material-name'
              placeholder='e.g., Coffee Beans, Flour, Sugar'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className='space-y-2'>
            <Label>Material Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder='Select type' />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Category (Optional)</Label>
            <SearchableCombobox
              options={categories}
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder='Select category'
              searchPlaceholder='Search categories...'
              emptyMessage='No categories found.'
              loading={loadingCategories}
              onCreateNew={() => setQuickCreateCategoryOpen(true)}
              createNewLabel='Create new category'
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting || !name.trim() || !type}>
              {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Create Material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <QuickCreateCategoryDialog
      open={quickCreateCategoryOpen}
      onOpenChange={setQuickCreateCategoryOpen}
      apiEndpoint='/api/material-categories'
      title='Create Material Category'
      onCreated={(cat) => {
        setCategories((prev) => [...prev, { value: cat.id, label: cat.name }]);
        setCategoryId(cat.id);
      }}
    />
    </>
  );
}
