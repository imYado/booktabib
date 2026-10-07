DROP INDEX "bookings_slot_unique";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "walk_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "position" double precision;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_unique" ON "bookings" USING btree ("doctor_id","date","time") WHERE "bookings"."status" <> 'cancelled' and not "bookings"."walk_in";