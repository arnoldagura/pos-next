CREATE TYPE "public"."organization_status" AS ENUM('active', 'suspended', 'trial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('raw_materials', 'goods_for_resale', 'operation_supplies', 'wip_products');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('purchase', 'sale', 'adjustment', 'waste', 'transfer_in', 'transfer_out', 'production_output', 'receive_from_material');--> statement-breakpoint
CREATE TYPE "public"."material_movement_type" AS ENUM('purchase', 'production_consumption', 'adjustment', 'waste', 'expired', 'transfer_in', 'transfer_out', 'transfer_to_pos');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'gcash', 'maya', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."output_type" AS ENUM('product', 'material');--> statement-breakpoint
CREATE TYPE "public"."production_order_status" AS ENUM('draft', 'scheduled', 'in_progress', 'completed', 'costing_done', 'cancelled');--> statement-breakpoint
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
CREATE TABLE "product_category" (
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
	CONSTRAINT "product_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"country" varchar(100),
	"notes" text,
	"loyalty_points" text DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"subdomain" text,
	"domain" text,
	"status" "organization_status" DEFAULT 'trial' NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'starter' NOT NULL,
	"max_users" integer DEFAULT 5 NOT NULL,
	"max_locations" integer DEFAULT 1 NOT NULL,
	"settings" jsonb,
	"billing_email" text,
	"contact_name" text,
	"contact_phone" text,
	"address" text,
	"city" text,
	"country" text,
	"tax_id" text,
	"trial_ends_at" timestamp,
	"subscription_starts_at" timestamp,
	"subscription_ends_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "organization_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "user_organization" (
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role_id" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"invited_by" text,
	"invited_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	CONSTRAINT "user_organization_user_id_organization_id_pk" PRIMARY KEY("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"state" text,
	"zip_code" text,
	"country" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_table" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"location_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" text,
	"image" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "material_type" NOT NULL,
	"category_id" text,
	"image" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"variant_name" text,
	"slug" text NOT NULL,
	"sku" text,
	"barcode" text,
	"unit_price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2),
	"current_quantity" numeric(10, 2) NOT NULL,
	"unit_of_measure" text NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"alert_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_inventory_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_inventory_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_inventory_barcode_unique" UNIQUE("barcode"),
	CONSTRAINT "product_inventory_product_location_variant_unique" UNIQUE("product_id","location_id","variant_name")
);
--> statement-breakpoint
CREATE TABLE "product_inventory_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"product_inventory_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2),
	"date" timestamp DEFAULT now() NOT NULL,
	"remarks" text,
	"reference_type" text,
	"reference_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"material_inventory_id" text NOT NULL,
	"batch_number" text NOT NULL,
	"expiry_date" timestamp,
	"quantity" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_name" text,
	"material_id" text NOT NULL,
	"location_id" text NOT NULL,
	"sku" text,
	"default_supplier_id" text,
	"unit_of_measure" text NOT NULL,
	"cost" numeric(10, 2),
	"current_quantity" numeric(10, 2) NOT NULL,
	"alert_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_inventory_sku_unique" UNIQUE("sku"),
	CONSTRAINT "material_inventory_material_location_unique" UNIQUE("material_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "material_inventory_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"material_inventory_id" text NOT NULL,
	"batch_id" text,
	"type" "material_movement_type" NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2),
	"date" timestamp DEFAULT now() NOT NULL,
	"remarks" text,
	"reference_type" text,
	"reference_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"location_id" text NOT NULL,
	"table_id" text,
	"customer_id" text,
	"customer_name" text,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"total_discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2),
	"change_given" numeric(10, 2),
	"notes" text,
	"created_by" text,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"product_sku" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_type" text DEFAULT 'fixed',
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_recipe" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"output_type" "output_type" NOT NULL,
	"output_product_id" text,
	"output_material_id" text,
	"output_quantity" numeric(10, 2) NOT NULL,
	"unit_of_measure" text NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_recipe_ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_of_measure" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_material" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"material_id" text NOT NULL,
	"material_inventory_id" text NOT NULL,
	"planned_quantity" numeric(10, 2) NOT NULL,
	"actual_quantity" numeric(10, 2),
	"unit_of_measure" text NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_order" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"location_id" text NOT NULL,
	"planned_quantity" numeric(10, 2) NOT NULL,
	"actual_quantity" numeric(10, 2),
	"status" "production_order_status" DEFAULT 'draft' NOT NULL,
	"output_type" "output_type" NOT NULL,
	"output_product_inventory_id" text,
	"output_material_inventory_id" text,
	"scheduled_date" date,
	"started_at" timestamp,
	"completed_at" timestamp,
	"material_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"labor_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"overhead_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"unit_cost" numeric(10, 2),
	"suggested_price" numeric(10, 2),
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_quality_check" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"check_type" text NOT NULL,
	"check_result" text NOT NULL,
	"notes" text,
	"checked_by" text,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permission" DROP CONSTRAINT "permission_name_unique";--> statement-breakpoint
ALTER TABLE "role" DROP CONSTRAINT "role_name_unique";--> statement-breakpoint
ALTER TABLE "permission" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "permission" ADD COLUMN "is_global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "is_global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "material_category" ADD CONSTRAINT "material_category_parent_id_material_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."material_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_parent_id_product_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organization" ADD CONSTRAINT "user_organization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organization" ADD CONSTRAINT "user_organization_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organization" ADD CONSTRAINT "user_organization_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organization" ADD CONSTRAINT "user_organization_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_table" ADD CONSTRAINT "restaurant_table_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_category_id_material_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory_movement" ADD CONSTRAINT "product_inventory_movement_product_inventory_id_product_inventory_id_fk" FOREIGN KEY ("product_inventory_id") REFERENCES "public"."product_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_batch" ADD CONSTRAINT "material_batch_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_default_supplier_id_supplier_id_fk" FOREIGN KEY ("default_supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_movement" ADD CONSTRAINT "material_inventory_movement_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_movement" ADD CONSTRAINT "material_inventory_movement_batch_id_material_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."material_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_table_id_restaurant_table_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_table"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_output_product_id_product_id_fk" FOREIGN KEY ("output_product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_output_material_id_material_id_fk" FOREIGN KEY ("output_material_id") REFERENCES "public"."material"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe_ingredient" ADD CONSTRAINT "production_recipe_ingredient_recipe_id_production_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."production_recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe_ingredient" ADD CONSTRAINT "production_recipe_ingredient_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_production_order_id_production_order_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_recipe_id_production_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."production_recipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_product_inventory_id_product_inventory_id_fk" FOREIGN KEY ("output_product_inventory_id") REFERENCES "public"."product_inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("output_material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_quality_check" ADD CONSTRAINT "production_quality_check_production_order_id_production_order_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organization_status_idx" ON "organization" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_subdomain_idx" ON "organization" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "user_organization_user_idx" ON "user_organization" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_organization_org_idx" ON "user_organization" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_organization_role_idx" ON "user_organization" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "product_name_idx" ON "product" USING btree ("name");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_status_idx" ON "product" USING btree ("status");--> statement-breakpoint
CREATE INDEX "material_name_idx" ON "material" USING btree ("name");--> statement-breakpoint
CREATE INDEX "material_type_idx" ON "material" USING btree ("type");--> statement-breakpoint
CREATE INDEX "material_category_idx" ON "material" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "material_status_idx" ON "material" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_inventory_product_idx" ON "product_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_location_idx" ON "product_inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "product_slug_idx" ON "product_inventory" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_sku_idx" ON "product_inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_barcode_idx" ON "product_inventory" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "product_inventory_movement_inventory_idx" ON "product_inventory_movement" USING btree ("product_inventory_id");--> statement-breakpoint
CREATE INDEX "product_inventory_movement_type_idx" ON "product_inventory_movement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "product_inventory_movement_date_idx" ON "product_inventory_movement" USING btree ("date");--> statement-breakpoint
CREATE INDEX "product_inventory_movement_reference_idx" ON "product_inventory_movement" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "product_inventory_movement_created_by_idx" ON "product_inventory_movement" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "material_batch_material_inventory_idx" ON "material_batch" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "material_batch_batch_number_idx" ON "material_batch" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "material_batch_expiry_date_idx" ON "material_batch" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "material_inventory_material_idx" ON "material_inventory" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_inventory_location_idx" ON "material_inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "material_sku_idx" ON "material_inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "material_supplier_idx" ON "material_inventory" USING btree ("default_supplier_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_material_inventory_idx" ON "material_inventory_movement" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_batch_idx" ON "material_inventory_movement" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_type_idx" ON "material_inventory_movement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_date_idx" ON "material_inventory_movement" USING btree ("date");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_reference_idx" ON "material_inventory_movement" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_created_by_idx" ON "material_inventory_movement" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "order_number_idx" ON "order" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "order_location_idx" ON "order" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_created_at_idx" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_item_product_idx" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "production_recipe_name_idx" ON "production_recipe" USING btree ("name");--> statement-breakpoint
CREATE INDEX "production_recipe_output_type_idx" ON "production_recipe" USING btree ("output_type");--> statement-breakpoint
CREATE INDEX "production_recipe_output_product_idx" ON "production_recipe" USING btree ("output_product_id");--> statement-breakpoint
CREATE INDEX "production_recipe_output_material_idx" ON "production_recipe" USING btree ("output_material_id");--> statement-breakpoint
CREATE INDEX "production_recipe_status_idx" ON "production_recipe" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_recipe_ingredient_recipe_idx" ON "production_recipe_ingredient" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "production_recipe_ingredient_material_idx" ON "production_recipe_ingredient" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "production_material_production_order_idx" ON "production_material" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_material_material_idx" ON "production_material" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "production_material_material_inventory_idx" ON "production_material" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "production_order_recipe_idx" ON "production_order" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "production_order_location_idx" ON "production_order" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "production_order_output_product_inventory_idx" ON "production_order" USING btree ("output_product_inventory_id");--> statement-breakpoint
CREATE INDEX "production_order_output_material_inventory_idx" ON "production_order" USING btree ("output_material_inventory_id");--> statement-breakpoint
CREATE INDEX "production_order_status_idx" ON "production_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_order_scheduled_date_idx" ON "production_order" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "production_quality_check_production_order_idx" ON "production_quality_check" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_quality_check_checked_at_idx" ON "production_quality_check" USING btree ("checked_at");--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permission_org_idx" ON "permission" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "permission_name_org_idx" ON "permission" USING btree ("name","organization_id");--> statement-breakpoint
CREATE INDEX "role_org_idx" ON "role" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "role_name_org_idx" ON "role" USING btree ("name","organization_id");