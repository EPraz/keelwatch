-- CreateEnum
CREATE TYPE "ComplianceConditionStatus" AS ENUM ('MISSING', 'EXPIRED', 'EXPIRING_SOON');

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "compliance_notifications" (
    "id" UUID NOT NULL,
    "vessel_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "condition_key" TEXT NOT NULL,
    "status" "ComplianceConditionStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "as_of" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "source_run_id" UUID NOT NULL,

    CONSTRAINT "compliance_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_notification_runs" (
    "id" UUID NOT NULL,
    "job_code" TEXT NOT NULL DEFAULT 'EXPIRY_NOTIFICATIONS',
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "queued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_count" INTEGER NOT NULL DEFAULT 0,
    "failure_code" TEXT,
    "triggered_by_id" UUID NOT NULL,

    CONSTRAINT "compliance_notification_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_notifications_resolved_at_created_at_idx" ON "compliance_notifications"("resolved_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "compliance_notifications_vessel_id_resolved_at_idx" ON "compliance_notifications"("vessel_id", "resolved_at");

-- CreateIndex
CREATE INDEX "compliance_notifications_condition_key_resolved_at_idx" ON "compliance_notifications"("condition_key", "resolved_at");

-- CreateIndex
CREATE INDEX "compliance_notifications_source_run_id_idx" ON "compliance_notifications"("source_run_id");

-- One unresolved notification represents one live compliance condition.
CREATE UNIQUE INDEX "compliance_notifications_active_condition_key" ON "compliance_notifications"("condition_key") WHERE "resolved_at" IS NULL;

-- CreateIndex
CREATE INDEX "compliance_notification_runs_queued_at_idx" ON "compliance_notification_runs"("queued_at" DESC);

-- CreateIndex
CREATE INDEX "compliance_notification_runs_job_code_status_idx" ON "compliance_notification_runs"("job_code", "status");

-- Keep the in-process worker bounded to one active expiry-notification run.
CREATE UNIQUE INDEX "compliance_notification_runs_one_active_job" ON "compliance_notification_runs"("job_code") WHERE "status" IN ('QUEUED', 'RUNNING');

-- AddForeignKey
ALTER TABLE "compliance_notifications" ADD CONSTRAINT "compliance_notifications_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notifications" ADD CONSTRAINT "compliance_notifications_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notifications" ADD CONSTRAINT "compliance_notifications_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "compliance_notification_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notification_runs" ADD CONSTRAINT "compliance_notification_runs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
