'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Material = {
  id: string;
  name: string;
  unitOfMeasure: string;
  defaultCost: string | null;
};

type Product = {
  id: string;
  name: string;
};

type Ingredient = {
  materialId: string;
  quantity: number;
  unitOfMeasure: string;
};

type RecipeIngredient = {
  id: string;
  materialId: string;
  quantity: string;
  unitOfMeasure: string;
  material: Material;
};

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  outputType: 'product' | 'material';
  outputProductId: string | null;
  outputMaterialId: string | null;
  outputQuantity: string;
  unitOfMeasure: string;
  ingredients: RecipeIngredient[];
};

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe;
  onSuccess: () => void;
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
}: RecipeFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outputType, setOutputType] = useState<'product' | 'material'>(
    'product'
  );
  const [outputProductId, setOutputProductId] = useState('');
  const [outputMaterialId, setOutputMaterialId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');
  const [outputUnitOfMeasure, setOutputUnitOfMeasure] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { materialId: '', quantity: 0, unitOfMeasure: '' },
  ]);

  useEffect(() => {
    if (open) {
      fetchMaterials();
      fetchProducts();

      if (recipe) {
        // Edit mode - populate form
        setName(recipe.name);
        setDescription(recipe.description || '');
        setOutputType(recipe.outputType);
        setOutputProductId(recipe.outputProductId || '');
        setOutputMaterialId(recipe.outputMaterialId || '');
        setOutputQuantity(recipe.outputQuantity);
        setOutputUnitOfMeasure(recipe.unitOfMeasure);
        setIngredients(
          recipe.ingredients.map((ing) => ({
            materialId: ing.materialId,
            quantity: parseFloat(ing.quantity),
            unitOfMeasure: ing.unitOfMeasure,
          }))
        );
      } else {
        // Create mode - reset form
        resetForm();
      }
    }
  }, [open, recipe]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setOutputType('product');
    setOutputProductId('');
    setOutputMaterialId('');
    setOutputQuantity('');
    setOutputUnitOfMeasure('');
    setIngredients([{ materialId: '', quantity: 0, unitOfMeasure: '' }]);
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials?status=true');
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?status=true');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { materialId: '', quantity: 0, unitOfMeasure: '' },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string | number
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      updateIngredient(index, 'materialId', materialId);
      updateIngredient(index, 'unitOfMeasure', material.unitOfMeasure);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    if (outputType === 'product' && !outputProductId) {
      toast.error('Please select an output product');
      return;
    }

    if (outputType === 'material' && !outputMaterialId) {
      toast.error('Please select an output material');
      return;
    }

    if (!outputQuantity || parseFloat(outputQuantity) <= 0) {
      toast.error('Output quantity must be greater than 0');
      return;
    }

    if (!outputUnitOfMeasure.trim()) {
      toast.error('Output unit of measure is required');
      return;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.materialId && ing.quantity > 0 && ing.unitOfMeasure.trim()
    );

    if (validIngredients.length === 0) {
      toast.error('At least one valid ingredient is required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        outputType,
        outputProductId: outputType === 'product' ? outputProductId : undefined,
        outputMaterialId:
          outputType === 'material' ? outputMaterialId : undefined,
        outputQuantity: parseFloat(outputQuantity),
        unitOfMeasure: outputUnitOfMeasure.trim(),
        ingredients: validIngredients,
      };

      const url = recipe ? `/api/recipes/${recipe.id}` : '/api/recipes';
      const method = recipe ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save recipe');
      }

      toast.success(
        recipe ? 'Recipe updated successfully' : 'Recipe created successfully'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save recipe'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {recipe ? 'Edit Recipe' : 'Create New Recipe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6 mt-4'>
          {/* Basic Information */}
          <div className='space-y-4'>
            <div>
              <Label htmlFor='name'>Recipe Name *</Label>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., Chocolate Cake Recipe'
                required
              />
            </div>

            <div>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description of the recipe'
                rows={3}
              />
            </div>
          </div>

          {/* Output Configuration */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Output</h3>

            <div>
              <Label htmlFor='outputType'>Output Type *</Label>
              <Select
                value={outputType}
                onValueChange={(value: 'product' | 'material') =>
                  setOutputType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='product'>Product</SelectItem>
                  <SelectItem value='material'>Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {outputType === 'product' ? (
              <div>
                <Label htmlFor='outputProductId'>Output Product *</Label>
                <Select
                  value={outputProductId}
                  onValueChange={setOutputProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select product' />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor='outputMaterialId'>Output Material *</Label>
                <Select
                  value={outputMaterialId}
                  onValueChange={setOutputMaterialId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select material' />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='outputQuantity'>Output Quantity *</Label>
                <Input
                  id='outputQuantity'
                  type='number'
                  step='0.01'
                  min='0.01'
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(e.target.value)}
                  placeholder='e.g., 10'
                  required
                />
              </div>
              <div>
                <Label htmlFor='outputUnitOfMeasure'>Unit of Measure *</Label>
                <Input
                  id='outputUnitOfMeasure'
                  value={outputUnitOfMeasure}
                  onChange={(e) => setOutputUnitOfMeasure(e.target.value)}
                  placeholder='e.g., kg, L, units'
                  required
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-medium'>Ingredients *</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addIngredient}
              >
                <Plus className='h-4 w-4 mr-2' />
                Add Ingredient
              </Button>
            </div>

            <div className='space-y-3'>
              {ingredients.map((ingredient, index) => (
                <div key={index} className='flex items-end gap-2'>
                  <div className='flex-1'>
                    <Label>Material *</Label>
                    <Select
                      value={ingredient.materialId}
                      onValueChange={(value) =>
                        handleMaterialChange(index, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select material' />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='w-32'>
                    <Label>Quantity *</Label>
                    <Input
                      type='number'
                      step='0.01'
                      min='0.01'
                      value={ingredient.quantity || ''}
                      onChange={(e) =>
                        updateIngredient(
                          index,
                          'quantity',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder='0.00'
                    />
                  </div>
                  <div className='w-32'>
                    <Label>Unit *</Label>
                    <Input
                      value={ingredient.unitOfMeasure}
                      onChange={(e) =>
                        updateIngredient(index, 'unitOfMeasure', e.target.value)
                      }
                      placeholder='kg, L'
                      disabled
                    />
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading
                ? 'Saving...'
                : recipe
                ? 'Update Recipe'
                : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
