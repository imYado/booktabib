CREATE TABLE "clinic_settings" (
	"clinic_id" text PRIMARY KEY NOT NULL,
	"accent" text DEFAULT 'paper' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_settings" (
	"doctor_id" text PRIMARY KEY NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL
);
