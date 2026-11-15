ALTER TABLE "clinics" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Every clinic that exists today starts hidden; an administrator makes each one public when it is ready.
UPDATE "clinics" SET "hidden" = true;
