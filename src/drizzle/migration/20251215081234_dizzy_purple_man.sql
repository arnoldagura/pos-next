ALTER TABLE "product_inventory" RENAME COLUMN "cost_price" TO "cost";--> statement-breakpoint
ALTER TABLE "product_inventory" ADD COLUMN "current_quantity" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD COLUMN "current_quantity" numeric(10, 2) NOT NULL;