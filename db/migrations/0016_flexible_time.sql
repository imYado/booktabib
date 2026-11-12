DROP INDEX "bookings_slot_unique";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "flexible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_unique" ON "bookings" USING btree ("doctor_id","date","time") WHERE "bookings"."status" <> 'cancelled' and not "bookings"."walk_in" and not "bookings"."flexible";