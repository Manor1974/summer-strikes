-- Per-family reservation code. Used at the desk to claim a Summer Strikes
-- reservation without going through mybowlingpassport (and without the
-- charge/refund headache that comes with it).
--
-- 6-char alphanumeric, no 0/1/O/I/L (humans confuse them). Backfilled below
-- via a one-shot UPDATE using only safe characters.

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "reservationCode" VARCHAR(8);

-- Backfill existing rows with a unique random code. The substring + replace
-- pulls from a 32-character alphabet (digits 2-9 + letters except O/I/L).
DO $$
DECLARE
  u RECORD;
  c TEXT;
  alphabet TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
BEGIN
  FOR u IN SELECT id FROM "User" WHERE "reservationCode" IS NULL LOOP
    LOOP
      c := '';
      FOR i IN 1..6 LOOP
        c := c || substring(alphabet FROM ((random() * 31)::int + 1) FOR 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "User" WHERE "reservationCode" = c);
    END LOOP;
    UPDATE "User" SET "reservationCode" = c WHERE id = u.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_reservationCode_key" ON "User" ("reservationCode");

COMMIT;
