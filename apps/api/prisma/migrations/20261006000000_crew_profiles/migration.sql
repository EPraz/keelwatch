CREATE TABLE "crew_members" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "crew_number" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crew_members_name_check" CHECK (
        char_length("display_name") BETWEEN 2 AND 120 AND "display_name" = btrim("display_name")
    ),
    CONSTRAINT "crew_members_number_check" CHECK ("crew_number" ~ '^KW-C-[0-9]{6}$')
);
CREATE UNIQUE INDEX "crew_members_crew_number_key" ON "crew_members"("crew_number");
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
