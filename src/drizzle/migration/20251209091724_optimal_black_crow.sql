CREATE TYPE "public"."production_order_status" AS ENUM('draft', 'scheduled', 'in_progress', 'completed', 'costing_done', 'cancelled');--> statement-breakpoint
CREATE TABLE "production_material" (
	"id" text PRIMARY KEY NOT NULL,
	"production_order_id" text NOT NULL,
	"material_id" text NOT NULL,
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
	"output_product_id" text,
	"output_material_id" text,
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
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_production_order_id_production_order_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_material" ADD CONSTRAINT "production_material_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_recipe_id_production_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."production_recipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_product_id_product_id_fk" FOREIGN KEY ("output_product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_output_material_id_material_id_fk" FOREIGN KEY ("output_material_id") REFERENCES "public"."material"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_quality_check" ADD CONSTRAINT "production_quality_check_production_order_id_production_order_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_material_production_order_idx" ON "production_material" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_material_material_idx" ON "production_material" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "production_order_recipe_idx" ON "production_order" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "production_order_location_idx" ON "production_order" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "production_order_output_product_idx" ON "production_order" USING btree ("output_product_id");--> statement-breakpoint
CREATE INDEX "production_order_output_material_idx" ON "production_order" USING btree ("output_material_id");--> statement-breakpoint
CREATE INDEX "production_order_status_idx" ON "production_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_order_scheduled_date_idx" ON "production_order" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "production_quality_check_production_order_idx" ON "production_quality_check" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "production_quality_check_checked_at_idx" ON "production_quality_check" USING btree ("checked_at");