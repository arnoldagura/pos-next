export type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  image: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface ProductInventoryItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string | null;
  unitPrice: string | null;
  locationId: string;
  locationName: string;
  alertThreshold: string;
  unitOfMeasure: string | null;
  currentQuantity?: string;
  taxRate?: string;
  belowThreshold: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInventoryResponse {
  inventory: ProductInventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LowStockItem {
  inventoryId: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  alertThreshold: number;
  difference: number;
  unitOfMeasure: string | null;
}

export interface AdjustmentData {
  productInventoryId: string;
  quantity: number;
  remarks: string;
  createdBy?: string;
}
