CREATE TABLE "clinic_ratings" (
	"user_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"stars" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_ratings_user_id_clinic_id_pk" PRIMARY KEY("user_id","clinic_id"),
	CONSTRAINT "clinic_ratings_stars" CHECK ("clinic_ratings"."stars" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "clinic_ratings" ADD CONSTRAINT "clinic_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_ratings" ADD CONSTRAINT "clinic_ratings_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_ratings_clinic_idx" ON "clinic_ratings" USING btree ("clinic_id");--> statement-breakpoint
ALTER TABLE "clinics" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "clinics" DROP COLUMN "reviews";