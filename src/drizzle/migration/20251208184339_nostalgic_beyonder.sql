CREATE TYPE "public"."material_type" AS ENUM('raw_materials', 'goods_for_resale', 'operation_supplies', 'wip_products');--> statement-breakpoint
CREATE TABLE "material" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"description" text,
	"type" "material_type" NOT NULL,
	"category_id" text,
	"supplier_id" text,
	"unit_of_measure" text NOT NULL,
	"default_cost" numeric(10, 2),
	"alert_threshold" numeric(10, 2),
	"expiry_tracking" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_category_id_material_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_name_idx" ON "material" USING btree ("name");--> statement-breakpoint
CREATE INDEX "material_sku_idx" ON "material" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "material_type_idx" ON "material" USING btree ("type");--> statement-breakpoint
CREATE INDEX "material_category_idx" ON "material" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "material_supplier_idx" ON "material" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "material_status_idx" ON "material" USING btree ("status");