-- Family Pass adults can pay; we don't need to gate them by age. Drop the
-- NOT NULL constraint on Adult.age and PendingAdult.age so the field becomes
-- truly optional.

BEGIN;

ALTER TABLE "Adult"        ALTER COLUMN "age" DROP NOT NULL;
ALTER TABLE "PendingAdult" ALTER COLUMN "age" DROP NOT NULL;

COMMIT;
