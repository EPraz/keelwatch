-- CreateTable
CREATE TABLE "certificate_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "certificate_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certificate_types_code_check" CHECK (
        "code" = BTRIM("code")
        AND "code" ~ '^[A-Z][A-Z0-9_]{1,79}$'
    ),
    CONSTRAINT "certificate_types_name_check" CHECK (
        "name" = BTRIM("name")
        AND CHAR_LENGTH("name") BETWEEN 2 AND 120
    )
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "vessel_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issued_on" DATE NOT NULL,
    "expires_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certificates_reference_number_check" CHECK (
        "reference_number" = BTRIM("reference_number")
        AND CHAR_LENGTH("reference_number") BETWEEN 1 AND 80
    ),
    CONSTRAINT "certificates_issuer_check" CHECK (
        "issuer" = BTRIM("issuer")
        AND CHAR_LENGTH("issuer") BETWEEN 2 AND 120
    ),
    CONSTRAINT "certificates_date_order_check" CHECK ("issued_on" <= "expires_on")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_types_code_key" ON "certificate_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_vessel_id_certificate_type_id_reference_number_key"
    ON "certificates"("vessel_id", "certificate_type_id", "reference_number");

-- CreateIndex
CREATE INDEX "certificates_vessel_id_certificate_type_id_expires_on_idx"
    ON "certificates"("vessel_id", "certificate_type_id", "expires_on" DESC);

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_vessel_id_fkey"
    FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_certificate_type_id_fkey"
    FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
