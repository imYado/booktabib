ALTER TABLE "bookings" ADD COLUMN "finished_at" bigint;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "prescription_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE set null ON UPDATE no action;