CREATE TYPE "public"."booking_status" AS ENUM('pending', 'approved', 'cancelled', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('patient', 'assistant', 'doctor', 'admin');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"user_id" text,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"ticket" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" bigint
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'patient' NOT NULL,
	"clinic_id" text,
	"doctor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_unique" ON "bookings" USING btree ("doctor_id","date","time") WHERE "bookings"."status" <> 'cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ticket_unique" ON "bookings" USING btree ("clinic_id","date","ticket");--> statement-breakpoint
CREATE INDEX "bookings_clinic_date_idx" ON "bookings" USING btree ("clinic_id","date");--> statement-breakpoint
CREATE INDEX "bookings_doctor_date_idx" ON "bookings" USING btree ("doctor_id","date");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");