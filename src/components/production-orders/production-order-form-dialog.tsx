'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const ingredientSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  materialInventoryId: z.string().min(1, 'Material inventory is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  cost: z.string().optional(),
});

const formSchema = z.object({
  recipeId: z.string().min(1, 'Recipe is required'),
  locationId: z.string().min(1, 'Location is required'),
  plannedQuantity: z.string().min(1, 'Quantity is required'),
  scheduledDate: z.string().optional(),
  ingredients: z.array(ingredientSchema),
  outputProductInventoryId: z.string().optional(),
  outputMaterialInventoryId: z.string().optional(),
});

const priceFormSchema = z.object({
  unitPrice: z.string().min(1, 'Price is required'),
  variantName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type PriceFormValues = z.infer<typeof priceFormSchema>;

interface Recipe {
  id: string;
  name: string;
  outputQuantity: string;
  unitOfMeasure: string;
  outputType: string;
  outputProduct?: { id: string; name: string };
  outputMaterial?: { id: string; name: string };
  ingredients?: RecipeIngredient[];
}

interface RecipeIngredient {
  id: string;
  materialId: string;
  quantity: string;
  unitOfMeasure: string;
  material: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Material {
  id: string;
  name: string;
  unitOfMeasure: string;
}

interface MaterialInventory {
  id: string;
  materialId: string;
  locationId: string;
  variantName: string | null;
  material: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
  location: {
    id: string;
    name: string;
  };
}

interface ProductionOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProductInventory {
  id: string;
  locationId: string;
  variantName: string | null;
  productId: string;
  productName: string;
}

export default function ProductionOrderFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductionOrderFormDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [materialInventories, setMaterialInventories] = useState<
    Record<string, MaterialInventory[]>
  >({});
  const [outputProductInventories, setOutputProductInventories] = useState<ProductInventory[]>([]);
  const [outputMaterialInventories, setOutputMaterialInventories] = useState<MaterialInventory[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingInventory, setCreatingInventory] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeId: '',
      locationId: '',
      plannedQuantity: '',
      scheduledDate: '',
      ingredients: [],
      outputProductInventoryId: '',
      outputMaterialInventoryId: '',
    },
  });

  const priceForm = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      unitPrice: '0',
      variantName: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  useEffect(() => {
    if (open) {
      fetchRecipes();
      fetchLocations();
      fetchMaterials();
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

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    }
  };

  const fetchMaterialInventoriesForMaterial = async (materialId: string, locationId: string) => {
    try {
      const response = await fetch(
        `/api/material-inventories/by-material?materialId=${materialId}&locationId=${locationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch material inventories');
      const data = await response.json();
      console.log('data2', data);
      setMaterialInventories((prev) => ({
        ...prev,
        [materialId]: data,
      }));
      return data;
    } catch (error) {
      console.error('Error fetching material inventories:', error);
      toast.error('Failed to load material inventory options');
      return [];
    }
  };

  const createProductInventory = async () => {
    if (!selectedRecipe || !selectedRecipe.outputProduct || !selectedLocation) {
      toast.error('Please select a recipe and location first');
      return;
    }

    // Reset and show price dialog
    priceForm.reset({
      unitPrice: '0',
      variantName: '',
    });
    setShowPriceDialog(true);
  };

  const handleCreateProductInventoryWithPrice = async (data: PriceFormValues) => {
    if (!selectedRecipe || !selectedRecipe.outputProduct || !selectedLocation) {
      return;
    }

    const unitPrice = parseFloat(data.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast.error('Please enter a valid price (must be a positive number)');
      return;
    }

    try {
      setCreatingInventory(true);
      setShowPriceDialog(false);

      const response = await fetch('/api/product-inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedRecipe.outputProduct.id,
          locationId: selectedLocation,
          unitPrice: unitPrice,
          variantName: data.variantName || undefined,
          unitOfMeasure: selectedRecipe.unitOfMeasure || 'pcs',
          alertThreshold: 10,
          taxRate: 0,
        }),
      });
      console.log('response', response);
      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to create product inventory';
        toast.error(`Failed to create product inventory: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const newInventory = await response.json();
      toast.success('Product inventory created successfully');
      console.log('newInventory', newInventory);
      // await fetchOutputInventories(selectedRecipe, selectedLocation);
      setOutputProductInventories((prev) => [...prev, newInventory]);

      form.setValue('outputProductInventoryId', newInventory.id, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } catch (error) {
      console.error('Error creating product inventory:', error);
      // Only show toast if we haven't already shown one for a response error
      if (error instanceof Error && !error.message.includes('Failed to create')) {
        toast.error(`Failed to create product inventory: ${error.message}`);
      }
    } finally {
      setCreatingInventory(false);
    }
  };

  const createMaterialInventory = async () => {
    if (!selectedRecipe || !selectedRecipe.outputMaterial || !selectedLocation) {
      toast.error('Please select a recipe and location first');
      return;
    }

    try {
      setCreatingInventory(true);
      const response = await fetch('/api/material-inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedRecipe.outputMaterial.id,
          locationId: selectedLocation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to create material inventory';
        toast.error(`Failed to create material inventory: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const newInventory = await response.json();
      toast.success('Material inventory created successfully');

      // Refresh the list
      await fetchOutputInventories(selectedRecipe, selectedLocation);

      // Auto-select the newly created inventory
      form.setValue('outputMaterialInventoryId', newInventory.id);
    } catch (error) {
      console.error('Error creating material inventory:', error);
      // Only show toast if we haven't already shown one for a response error
      if (error instanceof Error && !error.message.includes('Failed to create')) {
        toast.error(`Failed to create material inventory: ${error.message}`);
      }
    } finally {
      setCreatingInventory(false);
    }
  };

  const fetchOutputInventories = async (recipe: Recipe, locationId: string) => {
    try {
      console.log('data3');
      if (recipe.outputType === 'product' && recipe.outputProduct) {
        const response = await fetch(
          `/api/product-inventories?productId=${recipe.outputProduct.id}&locationId=${locationId}`
        );
        if (!response.ok) throw new Error('Failed to fetch product inventories');
        const data = await response.json();
        console.log('data', data);
        setOutputProductInventories(data.inventory || []);

        if (data.inventory && data.inventory.length > 0) {
          console.log('data.inventory[0]', data.inventory[0].id);
          // form.setValue('outputProductInventoryId', data.inventory[0].id);
          form.setValue('outputProductInventoryId', data.inventory[0].id, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          console.log('form', form.getValues());
        }
      } else if (recipe.outputType === 'material' && recipe.outputMaterial) {
        const response = await fetch(
          `/api/material-inventories/by-material?materialId=${recipe.outputMaterial.id}&locationId=${locationId}`
        );
        if (!response.ok) throw new Error('Failed to fetch material inventories');
        const data = await response.json();
        console.log('data', data);
        setOutputMaterialInventories(data.inventory || []);

        // Auto-select first if available
        if (data && data.length > 0) {
          form.setValue('outputMaterialInventoryId', data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching output inventories:', error);
      toast.error('Failed to load output inventory options');
    }
  };

  const handleRecipeChange = async (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    setSelectedRecipe(recipe || null);

    if (recipe) {
      form.setValue('plannedQuantity', recipe.outputQuantity);

      const locationId = form.getValues('locationId');
      if (locationId) {
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          await loadRecipeIngredientsToForm(recipe, locationId);
        }
        await fetchOutputInventories(recipe, locationId);
      }
    }
  };

  const handleLocationChange = async (locationId: string) => {
    setSelectedLocation(locationId);

    if (selectedRecipe) {
      if (selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0) {
        await loadRecipeIngredientsToForm(selectedRecipe, locationId);
      }
      await fetchOutputInventories(selectedRecipe, locationId);
    }
  };

  const loadRecipeIngredientsToForm = async (recipe: Recipe, locationId: string) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return;

    const scalingFactor =
      parseFloat(form.getValues('plannedQuantity') || recipe.outputQuantity) /
      parseFloat(recipe.outputQuantity);

    // Clear current ingredients
    form.setValue('ingredients', []);

    // Show loading state
    setLoading(true);

    try {
      // Fetch all inventories in parallel for better performance
      const ingredientPromises = recipe.ingredients.map(async (ingredient) => {
        const inventories = await fetchMaterialInventoriesForMaterial(
          ingredient.materialId,
          locationId
        );
        return { ingredient, inventories };
      });

      const results = await Promise.all(ingredientPromises);

      // Add ingredients to form
      for (const { ingredient, inventories } of results) {
        const firstInventory = inventories[0];

        if (firstInventory) {
          const scaledQuantity = parseFloat(ingredient.quantity) * scalingFactor;

          append({
            materialId: ingredient.materialId,
            materialInventoryId: firstInventory.id,
            quantity: scaledQuantity.toFixed(2),
            cost: '',
            unitOfMeasure: ingredient.unitOfMeasure,
          });
        } else {
          // If no inventory found, still add the ingredient but without inventory selected
          const scaledQuantity = parseFloat(ingredient.quantity) * scalingFactor;

          append({
            materialId: ingredient.materialId,
            materialInventoryId: '',
            quantity: scaledQuantity.toFixed(2),
            unitOfMeasure: ingredient.unitOfMeasure,
            cost: '',
          });

          toast.warning(`No inventory found for ${ingredient.material.name} at this location`);
        }
      }
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      toast.error('Failed to load some ingredients');
    } finally {
      setLoading(false);
    }
  };

  const handleReloadRecipe = async () => {
    if (!selectedRecipe || !selectedLocation) {
      toast.error('Please select a recipe and location first');
      return;
    }

    const confirmed = confirm(
      'This will reset all ingredient changes to the recipe template. Continue?'
    );

    if (confirmed) {
      await loadRecipeIngredientsToForm(selectedRecipe, selectedLocation);
      toast.success('Recipe template reloaded');
    }
  };

  const handleAddIngredient = () => {
    append({
      materialId: '',
      materialInventoryId: '',
      quantity: '',
      unitOfMeasure: '',
      cost: '',
    });
  };

  const handleMaterialChange = async (index: number, materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      form.setValue(`ingredients.${index}.unitOfMeasure`, material.unitOfMeasure);
    }

    const locationId = form.getValues('locationId');
    if (locationId) {
      const inventories = await fetchMaterialInventoriesForMaterial(materialId, locationId);

      // Auto-select first available inventory
      if (inventories.length > 0) {
        form.setValue(`ingredients.${index}.materialInventoryId`, inventories[0].id);
      }
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
          ingredients: values.ingredients.map((ing) => ({
            materialId: ing.materialId,
            materialInventoryId: ing.materialInventoryId,
            quantity: parseFloat(ing.quantity),
            unitOfMeasure: ing.unitOfMeasure,
            cost: ing.cost ? parseFloat(ing.cost) : undefined,
          })),
          outputProductInventoryId: values.outputProductInventoryId || undefined,
          outputMaterialInventoryId: values.outputMaterialInventoryId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create production order');
      }

      toast.success('Production order created successfully');
      form.reset();
      setSelectedRecipe(null);
      setSelectedLocation('');
      setMaterialInventories({});
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create production order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showPriceDialog} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-[800px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Production Order</DialogTitle>
            <DialogDescription>
              Create a new production order from a recipe. You can customize ingredients and select
              specific material inventories.
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
                            {recipe.name} ({recipe.outputQuantity} {recipe.unitOfMeasure})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedRecipe && (
                    <FormDescription>
                      Output: {selectedRecipe.outputQuantity} {selectedRecipe.unitOfMeasure} of{' '}
                      {selectedRecipe.outputProduct?.name || selectedRecipe.outputMaterial?.name}
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
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleLocationChange(value);
                    }}
                    value={field.value}
                  >
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
                  <FormDescription>Materials will be consumed from this location</FormDescription>
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
                      onChange={(e) => {
                        field.onChange(e);
                        // Recalculate ingredient quantities when planned quantity changes
                        if (selectedRecipe && selectedRecipe.ingredients) {
                          const scalingFactor =
                            parseFloat(e.target.value) / parseFloat(selectedRecipe.outputQuantity);
                          fields.forEach((_, index) => {
                            const ingredientMaterialId = form.getValues(
                              `ingredients.${index}.materialId`
                            );
                            const recipeIngredient = selectedRecipe.ingredients?.find(
                              (ing) => ing.materialId === ingredientMaterialId
                            );
                            if (recipeIngredient) {
                              const scaledQty =
                                parseFloat(recipeIngredient.quantity) * scalingFactor;
                              form.setValue(`ingredients.${index}.quantity`, scaledQty.toFixed(2));
                            }
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedRecipe &&
                      `Ingredients will be scaled by ${
                        field.value
                          ? (
                              parseFloat(field.value) / parseFloat(selectedRecipe.outputQuantity)
                            ).toFixed(2)
                          : '0.00'
                      }x`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Output Inventory Selector for Product */}
            {selectedRecipe && selectedRecipe.outputType === 'product' && (
              <FormField
                control={form.control}
                name='outputProductInventoryId'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center justify-between'>
                      <FormLabel>Output Product Inventory *</FormLabel>
                      {selectedLocation && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={createProductInventory}
                          disabled={creatingInventory}
                        >
                          {creatingInventory ? (
                            <>
                              <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className='h-3 w-3 mr-1' />
                              Create New
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Select
                      value={field.value ?? ''}
                      disabled={outputProductInventories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select product inventory' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {outputProductInventories.length === 0 ? (
                          <div className='p-2 text-center text-sm text-muted-foreground'>
                            No product inventory found
                          </div>
                        ) : (
                          outputProductInventories.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.productName}
                              {inv.variantName ? ` - ${inv.variantName}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {outputProductInventories.length === 0
                        ? 'Create a product inventory to continue'
                        : 'The finished product will be added to this inventory after completion'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Output Inventory Selector for Material */}
            {selectedRecipe && selectedRecipe.outputType === 'material' && (
              <FormField
                control={form.control}
                name='outputMaterialInventoryId'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center justify-between'>
                      <FormLabel>Output Material Inventory *</FormLabel>
                      {outputMaterialInventories.length === 0 && selectedLocation && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={createMaterialInventory}
                          disabled={creatingInventory}
                        >
                          {creatingInventory ? (
                            <>
                              <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className='h-3 w-3 mr-1' />
                              Create New
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={outputMaterialInventories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select material inventory' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {outputMaterialInventories.length === 0 ? (
                          <div className='p-2 text-center text-sm text-muted-foreground'>
                            No material inventory found
                          </div>
                        ) : (
                          outputMaterialInventories.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.material.name}
                              {inv.variantName ? ` - ${inv.variantName}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {outputMaterialInventories.length === 0
                        ? 'Create a material inventory to continue'
                        : 'The finished material will be added to this inventory after completion'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='scheduledDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type='date' {...field} />
                  </FormControl>
                  <FormDescription>When do you plan to start production?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <FormLabel>Ingredients</FormLabel>
                <div className='flex gap-2'>
                  {selectedRecipe &&
                    selectedRecipe.ingredients &&
                    selectedRecipe.ingredients.length > 0 && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleReloadRecipe}
                        disabled={!selectedLocation || loading}
                      >
                        <RotateCcw className='h-4 w-4 mr-2' />
                        Reset to Recipe
                      </Button>
                    )}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddIngredient}
                    disabled={!selectedLocation}
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Add Ingredient
                  </Button>
                </div>
              </div>

              {loading && fields.length === 0 ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-sm text-muted-foreground'>Loading ingredients...</span>
                </div>
              ) : fields.length === 0 ? (
                <div className='text-center py-8 border-2 border-dashed rounded-lg'>
                  <p className='text-sm text-muted-foreground mb-2'>No ingredients added yet</p>
                  <p className='text-xs text-muted-foreground'>
                    {!selectedRecipe
                      ? 'Select a recipe to load ingredients automatically'
                      : !selectedLocation
                        ? 'Select a location to continue'
                        : 'Click "Add Ingredient" to add ingredients manually'}
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {fields.map((field, index) => {
                    const materialId = form.watch(`ingredients.${index}.materialId`);
                    const materialName = materials.find((m) => m.id === materialId)?.name;

                    return (
                      <Card key={field.id}>
                        <CardContent className='pt-4 space-y-3'>
                          <div className='flex items-start justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-medium text-muted-foreground'>
                                Ingredient #{index + 1}
                              </span>
                              {materialName && (
                                <span className='text-xs font-semibold text-primary'>
                                  {materialName}
                                </span>
                              )}
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => remove(index)}
                              className='h-6 w-6 p-0 text-destructive hover:text-destructive'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.materialId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Material *</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      handleMaterialChange(index, value);
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder='Select material' />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {materials.map((material) => (
                                        <SelectItem key={material.id} value={material.id}>
                                          {material.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.materialInventoryId`}
                              render={({ field }) => {
                                const materialId = form.watch(`ingredients.${index}.materialId`);
                                const inventories = materialInventories[materialId] || [];

                                return (
                                  <FormItem>
                                    <FormLabel>Material Inventory *</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={!materialId}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder='Select inventory' />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {inventories.length === 0 ? (
                                          <div className='p-2 text-center text-sm text-muted-foreground'>
                                            No inventory found
                                          </div>
                                        ) : (
                                          inventories.map((inv) => (
                                            <SelectItem key={inv.id} value={inv.id}>
                                              {inv.variantName || inv.material.name} @{' '}
                                              {inv.location.name}
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='0.01'
                                      min='0.01'
                                      placeholder='0.00'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.unitOfMeasure`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit *</FormLabel>
                                  <FormControl>
                                    <Input placeholder='kg, L, pcs' {...field} readOnly />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.cost`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Cost</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='0.01'
                                      min='0'
                                      placeholder='0.00'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedRecipe && fields.length > 0 && (
              <div className='rounded-lg bg-muted p-4 space-y-2'>
                <h4 className='text-sm font-semibold'>Order Summary</h4>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <div className='text-muted-foreground'>Recipe:</div>
                  <div className='font-medium'>{selectedRecipe.name}</div>

                  <div className='text-muted-foreground'>Output:</div>
                  <div className='font-medium'>
                    {form.watch('plannedQuantity')} {selectedRecipe.unitOfMeasure}
                  </div>

                  <div className='text-muted-foreground'>Location:</div>
                  <div className='font-medium'>
                    {locations.find((l) => l.id === selectedLocation)?.name || '-'}
                  </div>

                  <div className='text-muted-foreground'>Ingredients:</div>
                  <div className='font-medium'>{fields.length} item(s)</div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={submitting || fields.length === 0}>
                {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Create Order
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Price Input Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Set Inventory Info</DialogTitle>
            <DialogDescription>
              Enter price and variant for {selectedRecipe?.outputProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <Form
            form={priceForm}
            onSubmit={handleCreateProductInventoryWithPrice}
            className='space-y-4 py-4'
          >
            <FormField
              control={priceForm.control}
              name='unitPrice'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='0.00'
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormDescription>
                    This will be the selling price per {selectedRecipe?.unitOfMeasure || 'unit'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={priceForm.control}
              name='variantName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., Standard, Large, Premium' {...field} />
                  </FormControl>
                  <FormDescription>
                    Distinguishes different variants of the same product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setShowPriceDialog(false)}
                disabled={creatingInventory}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={creatingInventory}>
                {creatingInventory && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Create Inventory
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
