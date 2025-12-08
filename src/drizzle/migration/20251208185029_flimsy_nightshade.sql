CREATE TYPE "public"."material_movement_type" AS ENUM('purchase', 'production_consumption', 'adjustment', 'waste', 'expired', 'transfer_in', 'transfer_out', 'transfer_to_pos');--> statement-breakpoint
CREATE TABLE "material_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"material_inventory_id" text NOT NULL,
	"batch_number" text NOT NULL,
	"expiry_date" timestamp,
	"quantity" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"location_id" text NOT NULL,
	"alert_threshold" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit_of_measure" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
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
ALTER TABLE "material_batch" ADD CONSTRAINT "material_batch_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_movement" ADD CONSTRAINT "material_inventory_movement_material_inventory_id_material_inventory_id_fk" FOREIGN KEY ("material_inventory_id") REFERENCES "public"."material_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory_movement" ADD CONSTRAINT "material_inventory_movement_batch_id_material_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."material_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_batch_material_inventory_idx" ON "material_batch" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "material_batch_batch_number_idx" ON "material_batch" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "material_batch_expiry_date_idx" ON "material_batch" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "material_inventory_material_idx" ON "material_inventory" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_inventory_location_idx" ON "material_inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_material_inventory_idx" ON "material_inventory_movement" USING btree ("material_inventory_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_batch_idx" ON "material_inventory_movement" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_type_idx" ON "material_inventory_movement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_date_idx" ON "material_inventory_movement" USING btree ("date");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_reference_idx" ON "material_inventory_movement" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "material_inventory_movement_created_by_idx" ON "material_inventory_movement" USING btree ("created_by");