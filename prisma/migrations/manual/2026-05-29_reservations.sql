-- Customer-facing reservation system. Families enter their reservation code
-- on a form, pick a date + time + party size, and submit. Staff sees the
-- request in /admin/reservations and confirms with a lane assignment
-- (which is written manually to Conqueror until we have an automated path).
--
-- Phase 1 (now): request → staff confirm → SMS notify.
-- Phase 2 (later, when conqueror SQL write is mapped): FRONTDESK1 poller
-- consumes CONFIRMED rows and INSERTs into Conqueror's Reservations table.

BEGIN;

CREATE TYPE "ReservationStatus" AS ENUM (
  'REQUESTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE IF NOT EXISTS "Reservation" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "reservationDate" DATE NOT NULL,
  "startTime"       TEXT NOT NULL,                                -- "17:00" HH:MM
  "partySize"       INTEGER NOT NULL,
  "notes"           TEXT,
  "status"          "ReservationStatus" NOT NULL DEFAULT 'REQUESTED',
  "laneNumber"      INTEGER,
  "confirmedAt"     TIMESTAMP(3),
  "confirmedBy"     TEXT,
  "cancelledAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Reservation_userId_idx"
  ON "Reservation"("userId");
CREATE INDEX IF NOT EXISTS "Reservation_reservationDate_status_idx"
  ON "Reservation"("reservationDate", "status");

COMMIT;
