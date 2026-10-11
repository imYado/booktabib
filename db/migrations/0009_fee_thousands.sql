-- Round existing prices to whole thousands of dinars before enforcing it.
UPDATE "doctors" SET "fee" = greatest(0, round("fee" / 1000.0) * 1000) WHERE "fee" % 1000 <> 0 OR "fee" < 0;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_fee_thousands" CHECK ("doctors"."fee" >= 0 and "doctors"."fee" % 1000 = 0);