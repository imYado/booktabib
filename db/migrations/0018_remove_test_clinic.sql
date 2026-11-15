-- Removes the Rezan Medical Center test clinic for good: its doctors, bookings, renewals, ratings,
-- notifications, settings and photos, and its test logins (rezan.*, lana.doctor).
DELETE FROM "doctor_settings" WHERE "doctor_id" IN (SELECT "id" FROM "doctors" WHERE "clinic_id" = 'rezan-medical-center');--> statement-breakpoint
DELETE FROM "bookings" WHERE "clinic_id" = 'rezan-medical-center';--> statement-breakpoint
DELETE FROM "prescriptions" WHERE "clinic_id" = 'rezan-medical-center';--> statement-breakpoint
DELETE FROM "notifications" WHERE "clinic_id" = 'rezan-medical-center';--> statement-breakpoint
DELETE FROM "clinic_settings" WHERE "clinic_id" = 'rezan-medical-center';--> statement-breakpoint
DELETE FROM "images" WHERE "id" IN (
  SELECT "image_id" FROM "clinics" WHERE "id" = 'rezan-medical-center' AND "image_id" IS NOT NULL
  UNION SELECT jsonb_array_elements_text("gallery") FROM "clinics" WHERE "id" = 'rezan-medical-center'
  UNION SELECT "image_id" FROM "doctors" WHERE "clinic_id" = 'rezan-medical-center' AND "image_id" IS NOT NULL
);--> statement-breakpoint
DELETE FROM "users" WHERE "email" IN ('rezan.doctor@example.com', 'lana.doctor@example.com', 'rezan.assistant@example.com', 'rezan.patient@example.com')
  OR "email" ~ '^rezan\.rater[0-9]+@example\.com$';--> statement-breakpoint
-- Any other account still linked to the clinic keeps its login, without a clinic.
UPDATE "users" SET "clinic_id" = NULL, "doctor_id" = NULL WHERE "clinic_id" = 'rezan-medical-center'
  OR "doctor_id" IN (SELECT "id" FROM "doctors" WHERE "clinic_id" = 'rezan-medical-center');--> statement-breakpoint
-- Its doctors, ratings and favourites go with it.
DELETE FROM "clinics" WHERE "id" = 'rezan-medical-center';
