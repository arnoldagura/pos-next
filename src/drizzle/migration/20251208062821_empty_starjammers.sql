CREATE TYPE "public"."movement_type" AS ENUM('purchase', 'sale', 'adjustment', 'waste', 'transfer_in', 'transfer_out', 'production_output', 'receive_from_material');--> statement-breakpoint
CREATE TABLE "inventory_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_id" text NOT NULL,
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
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movement_inventory_idx" ON "inventory_movement" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "inventory_movement_type_idx" ON "inventory_movement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inventory_movement_date_idx" ON "inventory_movement" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inventory_movement_reference_idx" ON "inventory_movement" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "inventory_movement_created_by_idx" ON "inventory_movement" USING btree ("created_by");