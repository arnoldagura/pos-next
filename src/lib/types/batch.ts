export interface Batch {
  id: string;
  materialInventoryId: string;
  batchNumber: string;
  expiryDate: string | null;
  quantity: string;
  cost: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BatchForm = {
  id: string;
  batchNumber: string;
};
