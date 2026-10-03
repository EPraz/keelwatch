-- CreateEnum
CREATE TYPE "VesselStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "vessels" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "registry_number" TEXT NOT NULL,
    "status" "VesselStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "vessels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vessels_name_check" CHECK (
        "name" = BTRIM("name")
        AND CHAR_LENGTH("name") BETWEEN 2 AND 120
    ),
    CONSTRAINT "vessels_registry_number_format_check" CHECK (
        "registry_number" ~ '^KW-[0-9]{6}$'
    )
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vessels_registry_number_key" ON "vessels"("registry_number");

-- AddForeignKey
ALTER TABLE "vessels" ADD CONSTRAINT "vessels_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
