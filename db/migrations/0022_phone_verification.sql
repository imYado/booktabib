ALTER TABLE "users" ADD COLUMN "phone_verified" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_by" text DEFAULT '' NOT NULL;