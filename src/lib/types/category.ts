import { categoryFormSchema } from '@/components/categories/category-form-dialog';
import z from 'zod';

export type Category = {
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

export type MaterialCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: MaterialCategory[];
};

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type MaterialCategoryFormValues = z.infer<typeof categoryFormSchema>;
