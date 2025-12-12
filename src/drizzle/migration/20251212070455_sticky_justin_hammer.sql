ALTER TABLE "production_material" RENAME COLUMN "material_id" TO "material_inventory_id";--> statement-breakpoint
ALTER TABLE "production_order" RENAME COLUMN "output_product_id" TO "output_product_inventory_id";--> statement-breakpoint
ALTER TABLE "production_order" RENAME COLUMN "output_material_id" TO "output_material_inventory_id";--> statement-breakpoint
ALTER TABLE "production_material" DROP CONSTRAINT "production_material_material_id_material_id_fk";
--> statement-breakpoint
ALTER TABLE "production_order" DROP CONSTRAINT "production_order_output_product_id_product_id_fk";
--> statement-breakpoint
ALTER TABLE "production_order" DROP CONSTRAINT "production_order_output_material_id_material_id_fk";
--> statement-breakpoint
DROP INDEX "production_material_material_idx";--> statement-breakpoint
DROP INDEX "production_order_output_product_idx";--> statement-breakpoint
DROP INDEX "production_order_output_material_idx";--> statement-breakpoint
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_product_inventory_id_product_inventory_id_fk" FOREIGN KEY ("output_product_inventory_id") REFERENCES "public"."product_inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("output_material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_material_material_inventory_idx" ON "production_material" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "production_order_output_product_inventory_idx" ON "production_order" USING btree ("output_product_inventory_id");--> statement-breakpoint
CREATE INDEX "production_order_output_material_inventory_idx" ON "production_order" USING btree ("output_material_inventory_id");