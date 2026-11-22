DROP INDEX "bookings_slot_unique";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "unscheduled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_settings" ADD COLUMN "desk_schedules" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_unique" ON "bookings" USING btree ("doctor_id","date","time") WHERE "bookings"."status" <> 'cancelled' and not "bookings"."walk_in" and not "bookings"."flexible" and not "bookings"."unscheduled";