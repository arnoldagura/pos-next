-- Create new tables and types that don't depend on existing data
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"organization_id" text NOT NULL,
	"role_id" text NOT NULL,
	"invited_by" text NOT NULL,
	"token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
-- Step 1: Add organization_id as NULLABLE to all existing tables
ALTER TABLE "material_category" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "product_category" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "restaurant_table" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "material" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "production_order" ADD COLUMN "organization_id" text;--> statement-breakpoint

-- Step 2: Backfill existing rows with the first organization's ID
UPDATE "material_category" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "product_category" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "customer" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "location" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "supplier" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "restaurant_table" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "product" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "material" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "product_inventory" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "material_inventory" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "order" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "production_recipe" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "production_order" SET "organization_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint

-- Step 3: Set NOT NULL constraint now that all rows have a value
ALTER TABLE "material_category" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_category" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "location" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_table" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_inventory" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material_inventory" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "production_recipe" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "production_order" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint

-- Step 4: Add foreign key constraints
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_category" ADD CONSTRAINT "material_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_table" ADD CONSTRAINT "restaurant_table_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_order" ADD CONSTRAINT "production_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 5: Create indexes for performance
CREATE INDEX "material_category_org_idx" ON "material_category" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_category_org_idx" ON "product_category" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_org_idx" ON "customer" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "location_org_idx" ON "location" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "supplier_org_idx" ON "supplier" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "restaurant_table_org_idx" ON "restaurant_table" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_org_idx" ON "product" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "material_org_idx" ON "material" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_inventory_org_idx" ON "product_inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "material_inventory_org_idx" ON "material_inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "order_org_idx" ON "order" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "production_recipe_org_idx" ON "production_recipe" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "production_order_org_idx" ON "production_order" USING btree ("organization_id");