import { Location } from './location';
import { Material } from './material';
import { Supplier } from './supplier';

export interface MaterialInventoryFormValues {
  materialId: string;
  locationId: string;
  variantName?: string;
  sku?: string;
  defaultSupplierId?: string | null;
  unitOfMeasure: string;
  cost?: string;
  alertThreshold?: string;
}

export interface MaterialInventory {
  id: string;
  materialId: string;
  locationId: string;
  variantName: string | null;
  sku: string | null;
  defaultSupplierId: string | null;
  unitOfMeasure: string;
  cost: string;
  alertThreshold: string;
  currentQuantity: string;
  material: Material;
  location: Location;
  supplier?: Supplier | null;
  batches: Array<{
    id: string;
    batchNumber: string;
    quantity: string;
    cost: string;
    expiryDate: string | null;
  }>;
}

export interface Movement {
  id: string;
  type: string;
  quantity: string;
  unitPrice: string | null;
  date: string;
  remarks: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
  batch: {
    id: string;
    batchNumber: string;
  } | null;
}

export interface MovementsMaterialInventory {
  id: string;
  material: Pick<Material, 'name'>;
  sku: string | null;
  unitOfMeasure: string;
  location: Location;
  currentQuantity: string;
}

export type BatchDialogMaterialInventory = Pick<
  MaterialInventory,
  'id' | 'unitOfMeasure'
> & {
  material: Pick<MaterialInventory['material'], 'name'>;
  location: Pick<MaterialInventory['location'], 'name'> & { id?: string };
};
