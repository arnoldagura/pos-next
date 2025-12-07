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
