'use client';

import { useState, useEffect } from 'react';
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

const formSchema = z.object({
  recipeId: z.string().min(1, 'Recipe is required'),
  locationId: z.string().min(1, 'Location is required'),
  plannedQuantity: z.string().min(1, 'Quantity is required'),
  scheduledDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Recipe {
  id: string;
  name: string;
  outputQuantity: string;
  unitOfMeasure: string;
  outputType: string;
  outputProduct?: { id: string; name: string };
  outputMaterial?: { id: string; name: string };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface ProductionOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ProductionOrderFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductionOrderFormDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeId: '',
      locationId: '',
      plannedQuantity: '',
      scheduledDate: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchRecipes();
      fetchLocations();
    }
  }, [open]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recipes?status=active&limit=100');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      setRecipes(data.recipes || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRecipeChange = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    setSelectedRecipe(recipe || null);

    // Auto-populate quantity with recipe output quantity
    if (recipe) {
      form.setValue('plannedQuantity', recipe.outputQuantity);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          plannedQuantity: parseFloat(values.plannedQuantity),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create production order');
      }

      toast.success('Production order created successfully');
      form.reset();
      setSelectedRecipe(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create production order'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Create Production Order</DialogTitle>
          <DialogDescription>
            Create a new production order from a recipe. Materials will be
            scaled automatically based on quantity.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='recipeId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipe *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleRecipeChange(value);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select recipe' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loading ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        Loading recipes...
                      </div>
                    ) : recipes.length === 0 ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        No active recipes found
                      </div>
                    ) : (
                      recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name} ({recipe.outputQuantity}{' '}
                          {recipe.unitOfMeasure})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedRecipe && (
                  <FormDescription>
                    Output: {selectedRecipe.outputQuantity}{' '}
                    {selectedRecipe.unitOfMeasure} of{' '}
                    {selectedRecipe.outputProduct?.name ||
                      selectedRecipe.outputMaterial?.name}
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
                <FormLabel>Production Location *</FormLabel>
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
                          {location.name} ({location.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Materials will be consumed from this location
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='plannedQuantity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planned Quantity *</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    min='0.01'
                    placeholder='Enter quantity'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {selectedRecipe &&
                    `Ingredients will be scaled by ${
                      field.value
                        ? (
                            parseFloat(field.value) /
                            parseFloat(selectedRecipe.outputQuantity)
                          ).toFixed(2)
                        : '0.00'
                    }x`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='scheduledDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date (Optional)</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormDescription>
                  When do you plan to start production?
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
              Create Order
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
