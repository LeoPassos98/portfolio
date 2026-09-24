BEGIN;

-- Existing DEMOs predate the approved lifecycle contract. Their configuration
-- cannot be inferred without fabricating security- and behavior-sensitive data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "environment"
        WHERE "tipo" = 'DEMO'
    ) THEN
        RAISE EXCEPTION 'DEMO lifecycle migration aborted: preexisting DEMO environments require explicit reconciliation';
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "demo_status" AS ENUM (
    'PENDENTE',
    'PROVISIONANDO',
    'PRONTA',
    'FALHA'
);

CREATE TYPE "demo_data_mode" AS ENUM ('EXEMPLO', 'VAZIO');

-- AlterTable
ALTER TABLE "environment"
    ADD COLUMN "demo_status" "demo_status",
    ADD COLUMN "demo_data_mode" "demo_data_mode",
    ADD COLUMN "tutorial_enabled" BOOLEAN,
    ADD COLUMN "origin_ip_hash" VARCHAR(64),
    ADD COLUMN "provisioned_at" TIMESTAMPTZ(6);

-- PRINCIPAL never carries DEMO-only configuration or lifecycle state.
ALTER TABLE "environment"
ADD CONSTRAINT "environment_principal_demo_fields_check" CHECK (
    "tipo" <> 'PRINCIPAL'
    OR (
        "demo_status" IS NULL
        AND "demo_data_mode" IS NULL
        AND "tutorial_enabled" IS NULL
        AND "origin_ip_hash" IS NULL
        AND "provisioned_at" IS NULL
    )
);

-- Every DEMO is born with its complete immutable configuration.
ALTER TABLE "environment"
ADD CONSTRAINT "environment_demo_required_fields_check" CHECK (
    "tipo" <> 'DEMO'
    OR (
        "demo_status" IS NOT NULL
        AND "demo_data_mode" IS NOT NULL
        AND "tutorial_enabled" IS NOT NULL
        AND "origin_ip_hash" IS NOT NULL
    )
);

ALTER TABLE "environment"
ADD CONSTRAINT "environment_demo_fixed_expiration_check" CHECK (
    "tipo" <> 'DEMO'
    OR "expires_at" = "criado_em" + INTERVAL '24 hours'
);

ALTER TABLE "environment"
ADD CONSTRAINT "environment_demo_origin_ip_hash_check" CHECK (
    "tipo" <> 'DEMO'
    OR "origin_ip_hash" ~ '^[0-9a-f]{64}$'
);

ALTER TABLE "environment"
ADD CONSTRAINT "environment_demo_provisioned_at_check" CHECK (
    "tipo" <> 'DEMO'
    OR (
        "demo_status" = 'PRONTA'
        AND "provisioned_at" IS NOT NULL
    )
    OR (
        "demo_status" IN ('PENDENTE', 'PROVISIONANDO', 'FALHA')
        AND "provisioned_at" IS NULL
    )
);

-- Previous versus new state requires a trigger. Immutable fields remain fixed
-- for every row that was a DEMO before the update, including direct SQL writes.
CREATE FUNCTION "protect_demo_environment_lifecycle"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD."tipo" = 'DEMO'
       AND (
           OLD."demo_data_mode" IS DISTINCT FROM NEW."demo_data_mode"
           OR OLD."tutorial_enabled" IS DISTINCT FROM NEW."tutorial_enabled"
           OR OLD."origin_ip_hash" IS DISTINCT FROM NEW."origin_ip_hash"
           OR OLD."expires_at" IS DISTINCT FROM NEW."expires_at"
       ) THEN
        RAISE EXCEPTION 'DEMO configuration and expiration are immutable'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'environment_demo_immutable_fields_check';
    END IF;

    IF OLD."tipo" = 'DEMO'
       AND NEW."tipo" = 'DEMO'
       AND OLD."demo_status" IS DISTINCT FROM NEW."demo_status"
       AND NOT (
           (OLD."demo_status" = 'PENDENTE' AND NEW."demo_status" = 'PROVISIONANDO')
           OR (
               OLD."demo_status" = 'PROVISIONANDO'
               AND NEW."demo_status" IN ('PRONTA', 'FALHA')
           )
           OR (OLD."demo_status" = 'FALHA' AND NEW."demo_status" = 'PROVISIONANDO')
       ) THEN
        RAISE EXCEPTION 'Invalid DEMO status transition from % to %', OLD."demo_status", NEW."demo_status"
            USING ERRCODE = '23514',
                  CONSTRAINT = 'environment_demo_status_transition_check';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "environment_demo_lifecycle_trigger"
BEFORE UPDATE OF
    "demo_status",
    "demo_data_mode",
    "tutorial_enabled",
    "origin_ip_hash",
    "expires_at"
ON "environment"
FOR EACH ROW
EXECUTE FUNCTION "protect_demo_environment_lifecycle"();

-- Indexes support expiration scans and future per-origin admission checks.
CREATE INDEX "environment_tipo_expires_at_idx"
ON "environment" ("tipo", "expires_at");

CREATE INDEX "environment_origin_ip_hash_expires_at_idx"
ON "environment" ("origin_ip_hash", "expires_at");

COMMIT;
