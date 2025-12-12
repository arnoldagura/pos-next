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
