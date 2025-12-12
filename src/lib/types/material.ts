import { z } from 'zod';
import { materialTypeSchema } from '../validations/material';

export type MaterialType = z.infer<typeof materialTypeSchema>;

export interface Material {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  image: string | null;
  status: boolean;
  type: MaterialType;
  sku: string | null;
  unitOfMeasure: string;
  category?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type MaterialForm = Omit<Material, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
