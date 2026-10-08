CREATE TYPE "CrewAssignmentCancellationReason" AS ENUM ('INCORRECT_RECORD', 'PLAN_CHANGED');
ALTER TABLE "crew_assignments"
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancelled_by_id" UUID,
  ADD COLUMN "cancellation_reason" "CrewAssignmentCancellationReason",
  ADD CONSTRAINT "crew_assignments_cancellation_check" CHECK (
    ("cancelled_at" IS NULL AND "cancelled_by_id" IS NULL AND "cancellation_reason" IS NULL)
    OR ("cancelled_at" IS NOT NULL AND "cancelled_by_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL)
  ),
  ADD CONSTRAINT "crew_assignments_calendar_check" CHECK (
    "starts_on" >= DATE '0001-01-01' AND "ends_on" <= DATE '9999-12-31'
  ),
  ADD CONSTRAINT "crew_assignments_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
