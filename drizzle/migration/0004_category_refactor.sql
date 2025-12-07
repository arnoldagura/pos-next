-- Rename category table to product_category
ALTER TABLE "category" RENAME TO "product_category";
--> statement-breakpoint

-- Remove the image column from product_category
ALTER TABLE "product_category" DROP COLUMN "image";
--> statement-breakpoint

-- Update the unique constraint name
ALTER TABLE "product_category" RENAME CONSTRAINT "category_slug_unique" TO "product_category_slug_unique";
--> statement-breakpoint

-- Drop the old foreign key constraint
ALTER TABLE "product_category" DROP CONSTRAINT "category_parent_id_category_id_fk";
--> statement-breakpoint

-- Add the new foreign key constraint with updated name
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_parent_id_product_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_category"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Create material_category table
CREATE TABLE "material_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"parent_id" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Add foreign key constraint for material_category
ALTER TABLE "material_category" ADD CONSTRAINT "material_category_parent_id_material_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."material_category"("id") ON DELETE set null ON UPDATE no action;
