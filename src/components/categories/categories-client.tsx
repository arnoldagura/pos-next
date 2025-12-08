'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CategoryFormDialog } from './category-form-dialog';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
};

export function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    Category | undefined
  >(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      const categoriesData = data.categories || [];

      const categoryMap = new Map<string, Category>();
      const rootCategories: Category[] = [];

      categoriesData.forEach((cat: Category) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      categoriesData.forEach((cat: Category) => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          const parent = categoryMap.get(cat.parentId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      });

      const sortCategories = (cats: Category[]) => {
        cats.sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
          }
          return a.name.localeCompare(b.name);
        });
        cats.forEach((cat) => {
          if (cat.children && cat.children.length > 0) {
            sortCategories(cat.children);
          }
        });
      };

      sortCategories(rootCategories);
      setCategories(rootCategories);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowDialog(true);
  };

  const handleDelete = async (category: Category) => {
    if (category.children && category.children.length > 0) {
      toast.error(
        'Cannot delete category with subcategories. Delete or move them first.'
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete category'
      );
      console.error(error);
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const paddingLeft = `${level * 2}rem`;

    return (
      <div key={category.id}>
        <div
          className='flex items-center justify-between p-3 hover:bg-gray-50 border-b'
          style={{ paddingLeft }}
        >
          <div className='flex items-center gap-3 flex-1'>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className='p-1 hover:bg-gray-200 rounded'
              >
                {isExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </button>
            ) : (
              <div className='w-6' />
            )}

            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h3 className='font-medium'>{category.name}</h3>
                <Badge variant={category.isActive ? 'default' : 'secondary'}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {category.description && (
                <p className='text-sm text-gray-600 mt-1'>
                  {category.description}
                </p>
              )}
              <p className='text-xs text-gray-500 mt-1'>
                Slug: {category.slug} • Order: {category.displayOrder}
              </p>
            </div>
          </div>

          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleEdit(category)}
            >
              <Pencil className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleDelete(category)}
            >
              <Trash2 className='h-4 w-4 text-red-500' />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) =>
              renderCategory(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='p-6 space-y-4'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold'>Categories</h2>
          <p className='text-gray-600'>
            Organize your products into categories
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedCategory(undefined);
            setShowDialog(true);
          }}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='text-gray-500'>Loading categories...</div>
        </div>
      ) : categories.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-gray-500 mb-4'>No categories found</p>
          <Button
            onClick={() => {
              setSelectedCategory(undefined);
              setShowDialog(true);
            }}
          >
            <Plus className='h-4 w-4 mr-2' />
            Create First Category
          </Button>
        </div>
      ) : (
        <div className='rounded-md border bg-white'>
          {categories.map((category) => renderCategory(category))}
        </div>
      )}

      <CategoryFormDialog
        category={selectedCategory}
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => {
          fetchCategories();
          setSelectedCategory(undefined);
        }}
      />
    </div>
  );
}
