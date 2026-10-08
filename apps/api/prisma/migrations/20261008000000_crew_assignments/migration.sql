CREATE TYPE "CrewAssignmentRole" AS ENUM ('DEMO_DECK', 'DEMO_SUPPORT');
CREATE TABLE "crew_assignments" (
  "id" UUID NOT NULL,
  "crew_member_id" UUID NOT NULL,
  "vessel_id" UUID NOT NULL,
  "role" "CrewAssignmentRole" NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID NOT NULL,
  CONSTRAINT "crew_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crew_assignments_dates_check" CHECK ("starts_on" <= "ends_on"),
  CONSTRAINT "crew_assignments_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "crew_assignments_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "crew_assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "crew_assignments_crew_member_id_starts_on_ends_on_idx" ON "crew_assignments"("crew_member_id", "starts_on", "ends_on");
CREATE INDEX "crew_assignments_vessel_id_created_at_id_idx" ON "crew_assignments"("vessel_id", "created_at" DESC, "id" DESC);
