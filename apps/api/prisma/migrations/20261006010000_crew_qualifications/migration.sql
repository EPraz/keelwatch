CREATE TYPE "QualificationKind" AS ENUM ('DEMO_SAFETY', 'DEMO_DECK');
CREATE TABLE "crew_qualifications" (
  "id" UUID NOT NULL,
  "crew_member_id" UUID NOT NULL,
  "kind" "QualificationKind" NOT NULL,
  "reference_number" TEXT NOT NULL,
  "valid_from" DATE NOT NULL,
  "expires_on" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID NOT NULL,
  CONSTRAINT "crew_qualifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crew_qualifications_dates_check" CHECK ("valid_from" <= "expires_on"),
  CONSTRAINT "crew_qualifications_reference_check" CHECK ("reference_number" ~ '^KW-Q-[0-9]{6}$'),
  CONSTRAINT "crew_qualifications_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "crew_qualifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "crew_qualifications_crew_member_id_reference_number_key" ON "crew_qualifications"("crew_member_id", "reference_number");
CREATE INDEX "crew_qualifications_crew_member_id_created_at_id_idx" ON "crew_qualifications"("crew_member_id", "created_at" DESC, "id" DESC);
