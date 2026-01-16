'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MaterialCategoryFormDialog } from './material-category-form-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MaterialCategory } from '@/lib/types';

type SortableMaterialCategoryProps = {
  category: MaterialCategory;
  level: number;
  expandedCategories: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (category: MaterialCategory) => void;
  onDelete: (category: MaterialCategory) => void;
};

function SortableMaterialCategory({
  category,
  level,
  expandedCategories,
  onToggleExpand,
  onEdit,
  onDelete,
}: SortableMaterialCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedCategories.has(category.id);
  const paddingLeft = `${level * 2}rem`;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className='flex items-center justify-between p-3 hover:bg-gray-50 border-b'
        style={{ paddingLeft }}
      >
        <div className='flex items-center gap-3 flex-1'>
          <div
            {...attributes}
            {...listeners}
            className='cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded'
          >
            <GripVertical className='h-4 w-4 text-gray-400' />
          </div>

          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(category.id)}
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
              <Package className='h-4 w-4 text-blue-600' />
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
          <Button variant='ghost' size='sm' onClick={() => onEdit(category)}>
            <Pencil className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => onDelete(category)}>
            <Trash2 className='h-4 w-4 text-red-500' />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <SortableContext
          items={category.children!.map((child) => child.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {category.children!.map((child) => (
              <SortableMaterialCategory
                key={child.id}
                category={child}
                level={level + 1}
                expandedCategories={expandedCategories}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export function MaterialCategoriesClient() {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    MaterialCategory | undefined
  >(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/material-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      const categoriesData = data.categories || [];

      const categoryMap = new Map<string, MaterialCategory>();
      const rootCategories: MaterialCategory[] = [];

      categoriesData.forEach((cat: MaterialCategory) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      categoriesData.forEach((cat: MaterialCategory) => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          const parent = categoryMap.get(cat.parentId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      });

      const sortCategories = (cats: MaterialCategory[]) => {
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
      toast.error('Failed to load material categories');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Update display order on the server
    try {
      const updates = newCategories.map((cat, index) => ({
        id: cat.id,
        displayOrder: index,
      }));

      // Update each category's display order
      await Promise.all(
        updates.map((update) =>
          fetch(`/api/material-categories/${update.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: update.displayOrder }),
          })
        )
      );

      toast.success('Category order updated');
    } catch {
      toast.error('Failed to update category order');
      // Revert on error
      fetchCategories();
    }
  };

  const handleEdit = (category: MaterialCategory) => {
    setSelectedCategory(category);
    setShowDialog(true);
  };

  const handleDelete = async (category: MaterialCategory) => {
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
      const response = await fetch(`/api/material-categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      toast.success('Material category deleted successfully');
      fetchCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete category'
      );
      console.error(error);
    }
  };

  return (
    <div className='p-6 space-y-4'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold'>Material Categories</h2>
          <p className='text-gray-600'>
            Organize your materials into categories for better inventory management
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
          <Package className='h-16 w-16 text-gray-300 mb-4' />
          <p className='text-gray-500 mb-4'>No material categories found</p>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((cat) => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category) => (
                <SortableMaterialCategory
                  key={category.id}
                  category={category}
                  level={0}
                  expandedCategories={expandedCategories}
                  onToggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <MaterialCategoryFormDialog
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
