-- Adds yznobaidi@gmail.com as an administrator. No password is stored here: the account starts with
-- a password that matches nothing, so nobody can sign in to it until an administrator presses
-- "New password" for it on the Staff page and hands over the temporary password, which the new
-- administrator replaces with their own at first sign-in. If the email already has an account
-- (for example they signed up as a patient), that account becomes an administrator instead and
-- keeps its own password.
INSERT INTO "users" ("id", "email", "name", "phone", "password_hash", "role", "must_change_password")
VALUES (
  upper(substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  'yznobaidi@gmail.com',
  'yznobaidi',
  '07874947443',
  '!',
  'admin',
  true
)
ON CONFLICT ("email") DO UPDATE SET
  "role" = 'admin',
  "clinic_id" = NULL,
  "doctor_id" = NULL,
  "phone" = CASE WHEN "users"."phone" = '' THEN EXCLUDED."phone" ELSE "users"."phone" END;
