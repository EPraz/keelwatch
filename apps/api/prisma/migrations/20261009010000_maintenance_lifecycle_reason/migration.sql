ALTER TABLE "maintenance_orders" ADD COLUMN "reason_code" VARCHAR(40);

ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_reason_matches_state"
CHECK (
  "reason_code" IS NULL OR
  ("status" = 'BLOCKED' AND "reason_code" IN ('AWAITING_RESOURCES', 'COORDINATION_REQUIRED')) OR
  ("status" = 'CANCELLED' AND "reason_code" IN ('INCORRECT_RECORD', 'WORK_NO_LONGER_REQUIRED'))
);
