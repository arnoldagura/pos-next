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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';
import QuickCreateCategoryDialog from '@/components/ui/quick-create-category-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: { id: string; name: string }) => void;
}

export default function QuickCreateProductDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateProductDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<ComboboxOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [quickCreateCategoryOpen, setQuickCreateCategoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingCategories(true);
      fetch('/api/categories?isActive=true&limit=100')
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
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(categoryId ? { categoryId } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create product');
      }

      const product = await response.json();
      toast.success(`Product "${name.trim()}" created`);
      setName('');
      setCategoryId('');
      onOpenChange(false);
      onCreated({ id: product.id, name: product.name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[400px]'>
        <DialogHeader>
          <DialogTitle>Quick Create Product</DialogTitle>
          <DialogDescription>
            Create a new product to add to inventory. You can edit details later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='product-name'>Product Name *</Label>
            <Input
              id='product-name'
              placeholder='e.g., Iced Coffee, Chicken Wings'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
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
            <Button type='submit' disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <QuickCreateCategoryDialog
      open={quickCreateCategoryOpen}
      onOpenChange={setQuickCreateCategoryOpen}
      apiEndpoint='/api/categories'
      title='Create Product Category'
      onCreated={(cat) => {
        setCategories((prev) => [...prev, { value: cat.id, label: cat.name }]);
        setCategoryId(cat.id);
      }}
    />
  </>
  );
}
