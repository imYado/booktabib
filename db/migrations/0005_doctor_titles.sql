ALTER TABLE "doctors" ADD COLUMN "honorific" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "honorific_other" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
-- Doctors whose names start with "Dr." get the Dr. title instead, so it isn't shown twice.
UPDATE "doctors" SET
  "honorific" = 'dr',
  "name" = jsonb_build_object(
    'en', regexp_replace("name"->>'en', '^Dr\.\s*', ''),
    'ar', regexp_replace("name"->>'ar', '^د\.\s*', ''),
    'ckb', regexp_replace("name"->>'ckb', '^د\.\s*', '')
  )
WHERE "honorific" = 'none' AND "name"->>'en' ~ '^Dr\.';
