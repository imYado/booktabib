ALTER TABLE "clinics" ADD COLUMN "hours" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "info" jsonb DEFAULT '[]'::jsonb NOT NULL;