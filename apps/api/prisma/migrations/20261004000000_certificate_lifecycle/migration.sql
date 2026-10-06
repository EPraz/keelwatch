-- AlterTable
ALTER TABLE "certificates"
    ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "archived_at" TIMESTAMPTZ(3);

-- AddConstraint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_archived_at_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

-- CreateIndex
CREATE INDEX "certificates_vessel_id_archived_at_certificate_type_id_expires_on_idx"
    ON "certificates"("vessel_id", "archived_at", "certificate_type_id", "expires_on" DESC);
