CREATE TABLE "prescriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"doctor_id" text NOT NULL,
	"user_id" text,
	"patient_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"renew_on" date NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	"app_stage" text DEFAULT '' NOT NULL,
	"app_sent_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "time" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "prescription_id" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prescriptions_clinic_idx" ON "prescriptions" USING btree ("clinic_id","renew_on");--> statement-breakpoint
CREATE INDEX "prescriptions_user_idx" ON "prescriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;