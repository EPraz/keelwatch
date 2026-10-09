CREATE TYPE "MaintenanceCategory" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED');

CREATE TABLE "maintenance_orders" (
  "id" UUID NOT NULL,
  "vessel_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "category" "MaintenanceCategory" NOT NULL,
  "priority" "MaintenancePriority" NOT NULL,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
  "assignee_id" UUID,
  "target_date" DATE,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "created_by_id" UUID NOT NULL,
  CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_orders_title_check" CHECK (char_length("title") BETWEEN 2 AND 120 AND "title" = btrim("title")),
  CONSTRAINT "maintenance_orders_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "maintenance_orders_date_check" CHECK ("target_date" IS NULL OR "target_date" BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')
);
CREATE INDEX "maintenance_orders_vessel_id_created_at_id_idx" ON "maintenance_orders"("vessel_id", "created_at" DESC, "id" DESC);
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
