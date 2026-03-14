'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Copy, Power, ChefHat, Package, MoreVertical, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { RecipeFormDialog } from './recipe-form-dialog';
import { CostEstimateDialog } from './cost-estimate-dialog';

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

type RecipeIngredient = {
  id: string;
  recipeId: string;
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
  status: boolean;
  createdAt: string;
  updatedAt: string;
  outputProduct?: Product;
  outputMaterial?: Material;
  ingredients: RecipeIngredient[];
};

export function RecipesClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outputTypeFilter, setOutputTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | undefined>(undefined);
  const [showCostEstimate, setShowCostEstimate] = useState(false);
  const [costEstimateRecipe, setCostEstimateRecipe] = useState<Recipe | undefined>(undefined);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (outputTypeFilter && outputTypeFilter !== 'all')
        params.append('outputType', outputTypeFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/recipes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recipes');

      const data = await response.json();
      setRecipes(data.recipes || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load recipes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, outputTypeFilter, statusFilter]);

  const handleCreateRecipe = () => {
    setSelectedRecipe(undefined);
    setShowRecipeDialog(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDialog(true);
  };

  const handleDuplicateRecipe = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to duplicate recipe');

      toast.success('Recipe duplicated successfully');
      fetchRecipes();
    } catch (error) {
      toast.error('Failed to duplicate recipe');
      console.error(error);
    }
  };

  const handleDeactivateRecipe = async (recipeId: string) => {
    if (
      !confirm(
        'Are you sure you want to deactivate this recipe? It will no longer be available for production.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to deactivate recipe');

      toast.success('Recipe deactivated successfully');
      fetchRecipes();
    } catch (error) {
      toast.error('Failed to deactivate recipe');
      console.error(error);
    }
  };

  const handleViewCostEstimate = (recipe: Recipe) => {
    setCostEstimateRecipe(recipe);
    setShowCostEstimate(true);
  };

  const getOutputName = (recipe: Recipe): string => {
    if (recipe.outputType === 'product') {
      return recipe.outputProduct?.name || 'Unknown Product';
    }
    return recipe.outputMaterial?.name || 'Unknown Material';
  };

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-4 flex-1'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
            <Input
              placeholder='Search recipes...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className='pl-10'
            />
          </div>

          <Select
            value={outputTypeFilter}
            onValueChange={(value) => {
              setOutputTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Output Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Types</SelectItem>
              <SelectItem value='product'>Product</SelectItem>
              <SelectItem value='material'>Material</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='inactive'>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreateRecipe}>
          <Plus className='h-4 w-4 mr-2' />
          New Recipe
        </Button>
      </div>

      {loading ? (
        <div className='text-center py-12'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='mt-2 text-gray-600'>Loading recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className='text-center py-12'>
          <ChefHat className='mx-auto h-12 w-12 text-gray-400' />
          <h3 className='mt-2 text-sm font-medium text-gray-900'>No recipes found</h3>
          <p className='mt-1 text-sm text-gray-500'>Get started by creating a new recipe.</p>
          <div className='mt-6'>
            <Button onClick={handleCreateRecipe}>
              <Plus className='h-4 w-4 mr-2' />
              New Recipe
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe Name</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Ingredients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{recipe.name}</div>
                        {recipe.description && (
                          <div className='text-sm text-gray-500 mt-1'>{recipe.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        {recipe.outputType === 'product' ? (
                          <Package className='h-4 w-4 text-blue-500' />
                        ) : (
                          <ChefHat className='h-4 w-4 text-green-500' />
                        )}
                        <span>{getOutputName(recipe)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipe.outputQuantity} {recipe.unitOfMeasure}
                    </TableCell>
                    <TableCell>
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipe.status ? 'default' : 'secondary'}>
                        {recipe.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                            <Pencil className='h-4 w-4 mr-2' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewCostEstimate(recipe)}>
                            <Package className='h-4 w-4 mr-2' />
                            Cost Estimate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateRecipe(recipe.id)}>
                            <Copy className='h-4 w-4 mr-2' />
                            Duplicate
                          </DropdownMenuItem>
                          {recipe.status && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivateRecipe(recipe.id)}
                              className='text-red-600'
                            >
                              <Power className='h-4 w-4 mr-2' />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-2 mt-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className='text-sm text-gray-600'>
                Page {page} of {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <RecipeFormDialog
        open={showRecipeDialog}
        onOpenChange={setShowRecipeDialog}
        recipe={selectedRecipe}
        onSuccess={fetchRecipes}
      />

      {costEstimateRecipe && (
        <CostEstimateDialog
          open={showCostEstimate}
          onOpenChange={setShowCostEstimate}
          recipe={costEstimateRecipe}
        />
      )}
    </div>
  );
}
