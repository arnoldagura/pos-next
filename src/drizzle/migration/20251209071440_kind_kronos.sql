CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'gcash', 'maya', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."output_type" AS ENUM('product', 'material');--> statement-breakpoint
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
ALTER TABLE "order" ADD CONSTRAINT "order_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_table_id_restaurant_table_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_table"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_output_product_id_product_id_fk" FOREIGN KEY ("output_product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_output_material_id_material_id_fk" FOREIGN KEY ("output_material_id") REFERENCES "public"."material"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe_ingredient" ADD CONSTRAINT "production_recipe_ingredient_recipe_id_production_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."production_recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe_ingredient" ADD CONSTRAINT "production_recipe_ingredient_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "production_recipe_ingredient_material_idx" ON "production_recipe_ingredient" USING btree ("material_id");