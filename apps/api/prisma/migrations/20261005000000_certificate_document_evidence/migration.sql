CREATE TYPE "CertificateDocumentStatus" AS ENUM (
  'QUARANTINED',
  'AVAILABLE',
  'REJECTED',
  'DELETED'
);

CREATE TYPE "DocumentScanResult" AS ENUM (
  'PENDING',
  'NO_THREATS_FOUND',
  'THREATS_FOUND',
  'FAILED'
);

CREATE TABLE "certificate_documents" (
  "id" UUID NOT NULL,
  "certificate_id" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "original_file_name" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "status" "CertificateDocumentStatus" NOT NULL DEFAULT 'QUARANTINED',
  "scan_result" "DocumentScanResult" NOT NULL DEFAULT 'PENDING',
  "scan_provider" TEXT NOT NULL,
  "failure_code" TEXT,
  "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaded_by_id" UUID NOT NULL,
  "available_at" TIMESTAMPTZ(3),
  "rejected_at" TIMESTAMPTZ(3),
  "delete_after" TIMESTAMPTZ(3),
  "object_deleted_at" TIMESTAMPTZ(3),

  CONSTRAINT "certificate_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certificate_documents_size_bytes_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
  CONSTRAINT "certificate_documents_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "certificate_documents_media_type_check" CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png')),
  CONSTRAINT "certificate_documents_state_check" CHECK (
    ("status" = 'QUARANTINED' AND "available_at" IS NULL AND "rejected_at" IS NULL AND "object_deleted_at" IS NULL)
    OR ("status" = 'AVAILABLE' AND "scan_result" = 'NO_THREATS_FOUND' AND "available_at" IS NOT NULL AND "rejected_at" IS NULL AND "object_deleted_at" IS NULL)
    OR ("status" = 'REJECTED' AND "scan_result" IN ('THREATS_FOUND', 'FAILED') AND "available_at" IS NULL AND "rejected_at" IS NOT NULL)
    OR ("status" = 'DELETED' AND "object_deleted_at" IS NOT NULL)
  ),
  CONSTRAINT "certificate_documents_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "certificate_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "certificate_documents_storage_key_key"
  ON "certificate_documents"("storage_key");
CREATE INDEX "certificate_documents_certificate_id_uploaded_at_idx"
  ON "certificate_documents"("certificate_id", "uploaded_at" DESC);
CREATE INDEX "certificate_documents_status_uploaded_at_idx"
  ON "certificate_documents"("status", "uploaded_at");
CREATE INDEX "certificate_documents_delete_after_idx"
  ON "certificate_documents"("delete_after");
CREATE UNIQUE INDEX "certificate_documents_one_current_per_certificate_idx"
  ON "certificate_documents"("certificate_id")
  WHERE "status" IN ('QUARANTINED', 'AVAILABLE');
