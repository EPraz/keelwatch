CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RoleAssignmentSource" AS ENUM ('SYSTEM_SEED', 'ADMIN');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "external_subject" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" UUID,
    "source" "RoleAssignmentSource" NOT NULL DEFAULT 'ADMIN',
    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id", "role_id"),
    CONSTRAINT "user_role_assignment_actor_check" CHECK (
        ("source" = 'SYSTEM_SEED' AND "assigned_by_id" IS NULL)
        OR ("source" = 'ADMIN' AND "assigned_by_id" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "users_external_subject_key" ON "users"("external_subject");
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

ALTER TABLE "user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

