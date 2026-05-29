-- One-shot manual migration to add bowlerNumber to Child and Adult.
-- Uses a shared sequence so kids and Family Pass adults pull from the same
-- pool — no collisions. Sequence starts at 1000 (Manor Lanes' existing FBT
-- bowlers occupy 1-527 currently, so 1000+ is clean headroom).

BEGIN;

-- Create the shared sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS bowler_id_seq START 1000 INCREMENT BY 1 MINVALUE 1000;

-- Add bowlerNumber to Child. NOT NULL + DEFAULT means existing rows
-- (Evan, Dylan) get values from the sequence immediately.
ALTER TABLE "Child"
  ADD COLUMN IF NOT EXISTS "bowlerNumber" INTEGER NOT NULL DEFAULT nextval('bowler_id_seq');
CREATE UNIQUE INDEX IF NOT EXISTS "Child_bowlerNumber_key" ON "Child" ("bowlerNumber");

-- Same for Adult (Brian's Family Pass adult will get the next sequence value)
ALTER TABLE "Adult"
  ADD COLUMN IF NOT EXISTS "bowlerNumber" INTEGER NOT NULL DEFAULT nextval('bowler_id_seq');
CREATE UNIQUE INDEX IF NOT EXISTS "Adult_bowlerNumber_key" ON "Adult" ("bowlerNumber");

COMMIT;
