CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved', 'maintenance');--> statement-breakpoint
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
ALTER TABLE "restaurant_table" ADD CONSTRAINT "restaurant_table_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;