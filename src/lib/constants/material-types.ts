import type { MaterialType } from '@/lib/validations/material';

export const MATERIAL_TYPES: Record<MaterialType, string> = {
  raw_materials: 'Raw Materials',
  goods_for_resale: 'Goods for Resale',
  operation_supplies: 'Operation Supplies',
  wip_products: 'WIP Products',
} as const;

export const MATERIAL_TYPE_OPTIONS = Object.entries(MATERIAL_TYPES).map(
  ([value, label]) => ({
    value: value as MaterialType,
    label,
  })
);

export const VALID_MATERIAL_TYPES = Object.keys(MATERIAL_TYPES) as MaterialType[];
