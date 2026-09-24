BEGIN;

-- CreateEnum
CREATE TYPE "tipo_environment" AS ENUM ('PRINCIPAL', 'DEMO');

-- CreateTable
CREATE TABLE "environment" (
    "id" UUID NOT NULL,
    "tipo" "tipo_environment" NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "environment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "environment_expiration_by_type_check" CHECK (
        ("tipo" = 'PRINCIPAL' AND "expires_at" IS NULL)
        OR ("tipo" = 'DEMO' AND "expires_at" IS NOT NULL)
    )
);

-- At most one PRINCIPAL can exist. The migration inserts the required one below.
CREATE UNIQUE INDEX "environment_single_principal_key"
ON "environment" ("tipo")
WHERE "tipo" = 'PRINCIPAL';

-- The stable identifier is also used by the Phase 1 application bridge. It is
-- server-owned and is never accepted from an HTTP request.
INSERT INTO "environment" ("id", "tipo", "expires_at")
VALUES ('00000000-0000-4000-8000-000000000001', 'PRINCIPAL', NULL);

-- PRINCIPAL is permanent. Protect both direct deletion and the type change
-- that could otherwise turn it into a deletable DEMO.
CREATE FUNCTION "protect_principal_environment"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD."tipo" = 'PRINCIPAL' THEN
            RAISE EXCEPTION 'Environment PRINCIPAL is permanent and cannot be deleted'
                USING ERRCODE = '23514',
                      CONSTRAINT = 'environment_principal_permanence_check';
        END IF;

        RETURN OLD;
    END IF;

    IF OLD."tipo" = 'PRINCIPAL'
       AND NEW."tipo" IS DISTINCT FROM 'PRINCIPAL' THEN
        RAISE EXCEPTION 'Environment PRINCIPAL cannot be changed to another type'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'environment_principal_permanence_check';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "environment_principal_permanence_trigger"
BEFORE DELETE OR UPDATE OF "tipo" ON "environment"
FOR EACH ROW
EXECUTE FUNCTION "protect_principal_environment"();

-- Expand: keep the new columns nullable until every existing row is validated
-- and associated with PRINCIPAL.
ALTER TABLE "cliente" ADD COLUMN "environment_id" UUID;
ALTER TABLE "funcionario" ADD COLUMN "environment_id" UUID;
ALTER TABLE "usuario" ADD COLUMN "environment_id" UUID;
ALTER TABLE "ordem_servico" ADD COLUMN "environment_id" UUID;
ALTER TABLE "historico_ordem_servico" ADD COLUMN "environment_id" UUID;
ALTER TABLE "contador_ordem_servico" ADD COLUMN "environment_id" UUID;

-- Fail closed if the pre-migration database does not match the relationships
-- that must be preserved by the tenant-aware constraints.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "usuario" AS u
        LEFT JOIN "funcionario" AS f ON f."id" = u."funcionario_id"
        WHERE f."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: usuario references a missing funcionario';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "ordem_servico" AS os
        LEFT JOIN "cliente" AS c ON c."id" = os."cliente_id"
        WHERE c."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: ordem_servico references a missing cliente';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "ordem_servico" AS os
        LEFT JOIN "funcionario" AS f ON f."id" = os."responsavel_id"
        WHERE f."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: ordem_servico references a missing responsavel';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "historico_ordem_servico" AS h
        LEFT JOIN "ordem_servico" AS os ON os."id" = h."ordem_servico_id"
        WHERE os."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: historico references a missing ordem_servico';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "historico_ordem_servico" AS h
        LEFT JOIN "funcionario" AS f ON f."id" = h."responsavel_id"
        WHERE f."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: historico references a missing responsavel';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "historico_ordem_servico" AS h
        LEFT JOIN "usuario" AS u ON u."id" = h."alterado_por_usuario_id"
        WHERE u."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: historico references a missing usuario autor';
    END IF;

    IF (SELECT COUNT(*) FROM "contador_ordem_servico") <> 1
       OR NOT EXISTS (
           SELECT 1
           FROM "contador_ordem_servico"
           WHERE "id" = 1
       ) THEN
        RAISE EXCEPTION 'Environment migration aborted: expected exactly the existing singleton OS counter with id = 1';
    END IF;
END $$;

-- Backfill every existing domain row into PRINCIPAL. No business identifier or
-- counter value is recalculated.
UPDATE "cliente"
SET "environment_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "funcionario"
SET "environment_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "usuario"
SET "environment_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "ordem_servico"
SET "environment_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "historico_ordem_servico"
SET "environment_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "contador_ordem_servico"
SET "environment_id" = '00000000-0000-4000-8000-000000000001'
WHERE "id" = 1;

-- Validate the backfill through the same relationships that will become
-- compound foreign keys. These checks deliberately precede NOT NULL.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "usuario" AS u
        JOIN "funcionario" AS f ON f."id" = u."funcionario_id"
        WHERE u."environment_id" IS DISTINCT FROM f."environment_id"
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: usuario and funcionario environments differ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "ordem_servico" AS os
        JOIN "cliente" AS c ON c."id" = os."cliente_id"
        JOIN "funcionario" AS f ON f."id" = os."responsavel_id"
        WHERE os."environment_id" IS DISTINCT FROM c."environment_id"
           OR os."environment_id" IS DISTINCT FROM f."environment_id"
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: ordem_servico environment differs from cliente or responsavel';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "historico_ordem_servico" AS h
        JOIN "ordem_servico" AS os ON os."id" = h."ordem_servico_id"
        JOIN "funcionario" AS f ON f."id" = h."responsavel_id"
        JOIN "usuario" AS u ON u."id" = h."alterado_por_usuario_id"
        WHERE h."environment_id" IS DISTINCT FROM os."environment_id"
           OR h."environment_id" IS DISTINCT FROM f."environment_id"
           OR h."environment_id" IS DISTINCT FROM u."environment_id"
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: historico environment differs from ordem, responsavel or usuario autor';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT "environment_id" FROM "cliente"
            UNION ALL
            SELECT "environment_id" FROM "funcionario"
            UNION ALL
            SELECT "environment_id" FROM "usuario"
            UNION ALL
            SELECT "environment_id" FROM "ordem_servico"
            UNION ALL
            SELECT "environment_id" FROM "historico_ordem_servico"
            UNION ALL
            SELECT "environment_id" FROM "contador_ordem_servico"
        ) AS tenant_rows
        WHERE "environment_id" IS NULL
           OR "environment_id" <> '00000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'Environment migration aborted: the PRINCIPAL backfill is incomplete';
    END IF;
END $$;

-- Contract: environment ownership is now mandatory.
ALTER TABLE "cliente" ALTER COLUMN "environment_id" SET NOT NULL;
ALTER TABLE "funcionario" ALTER COLUMN "environment_id" SET NOT NULL;
ALTER TABLE "usuario" ALTER COLUMN "environment_id" SET NOT NULL;
ALTER TABLE "ordem_servico" ALTER COLUMN "environment_id" SET NOT NULL;
ALTER TABLE "historico_ordem_servico" ALTER COLUMN "environment_id" SET NOT NULL;
ALTER TABLE "contador_ordem_servico" ALTER COLUMN "environment_id" SET NOT NULL;

-- Replace the physical global singleton key with one counter per Environment.
-- ultimo_numero is intentionally left untouched.
ALTER TABLE "contador_ordem_servico"
    DROP CONSTRAINT "contador_ordem_servico_singleton_check",
    DROP CONSTRAINT "contador_ordem_servico_pkey",
    ALTER COLUMN "id" DROP DEFAULT,
    DROP COLUMN "id",
    ADD CONSTRAINT "contador_ordem_servico_pkey" PRIMARY KEY ("environment_id");

-- Compound candidate keys support tenant-aware foreign keys even though UUID
-- identifiers remain globally unique.
CREATE UNIQUE INDEX "cliente_environment_id_id_key"
ON "cliente" ("environment_id", "id");

CREATE UNIQUE INDEX "funcionario_environment_id_id_key"
ON "funcionario" ("environment_id", "id");

CREATE UNIQUE INDEX "usuario_environment_id_id_key"
ON "usuario" ("environment_id", "id");

CREATE UNIQUE INDEX "ordem_servico_environment_id_id_key"
ON "ordem_servico" ("environment_id", "id");

-- Replace global business uniqueness with Environment-scoped uniqueness.
DROP INDEX "cliente_documento_key";
CREATE UNIQUE INDEX "cliente_environment_id_documento_key"
ON "cliente" ("environment_id", "documento");

DROP INDEX "usuario_funcionario_id_key";
CREATE UNIQUE INDEX "usuario_environment_id_funcionario_id_key"
ON "usuario" ("environment_id", "funcionario_id");

DROP INDEX "ordem_servico_numero_key";
CREATE UNIQUE INDEX "ordem_servico_environment_id_numero_key"
ON "ordem_servico" ("environment_id", "numero");

DROP INDEX "historico_ordem_servico_ordem_servico_id_versao_key";
CREATE UNIQUE INDEX "historico_environment_ordem_versao_key"
ON "historico_ordem_servico" ("environment_id", "ordem_servico_id", "versao");

CREATE INDEX "historico_environment_responsavel_idx"
ON "historico_ordem_servico" ("environment_id", "responsavel_id");

CREATE INDEX "historico_environment_autor_idx"
ON "historico_ordem_servico" ("environment_id", "alterado_por_usuario_id");

-- Replace simple domain foreign keys with compound tenant-aware foreign keys.
ALTER TABLE "usuario" DROP CONSTRAINT "usuario_funcionario_id_fkey";
ALTER TABLE "ordem_servico" DROP CONSTRAINT "ordem_servico_cliente_id_fkey";
ALTER TABLE "ordem_servico" DROP CONSTRAINT "ordem_servico_responsavel_id_fkey";
ALTER TABLE "historico_ordem_servico" DROP CONSTRAINT "historico_ordem_servico_ordem_servico_id_fkey";
ALTER TABLE "historico_ordem_servico" DROP CONSTRAINT "historico_ordem_servico_responsavel_id_fkey";
ALTER TABLE "historico_ordem_servico" DROP CONSTRAINT "historico_ordem_servico_alterado_por_usuario_id_fkey";

ALTER TABLE "cliente"
ADD CONSTRAINT "cliente_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "funcionario"
ADD CONSTRAINT "funcionario_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usuario"
ADD CONSTRAINT "usuario_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usuario"
ADD CONSTRAINT "usuario_environment_funcionario_fkey"
FOREIGN KEY ("environment_id", "funcionario_id")
REFERENCES "funcionario" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico"
ADD CONSTRAINT "ordem_servico_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico"
ADD CONSTRAINT "ordem_servico_environment_cliente_fkey"
FOREIGN KEY ("environment_id", "cliente_id")
REFERENCES "cliente" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico"
ADD CONSTRAINT "ordem_servico_environment_responsavel_fkey"
FOREIGN KEY ("environment_id", "responsavel_id")
REFERENCES "funcionario" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "historico_ordem_servico"
ADD CONSTRAINT "historico_ordem_servico_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "historico_ordem_servico"
ADD CONSTRAINT "historico_environment_ordem_fkey"
FOREIGN KEY ("environment_id", "ordem_servico_id")
REFERENCES "ordem_servico" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "historico_ordem_servico"
ADD CONSTRAINT "historico_environment_responsavel_fkey"
FOREIGN KEY ("environment_id", "responsavel_id")
REFERENCES "funcionario" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "historico_ordem_servico"
ADD CONSTRAINT "historico_environment_autor_fkey"
FOREIGN KEY ("environment_id", "alterado_por_usuario_id")
REFERENCES "usuario" ("environment_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contador_ordem_servico"
ADD CONSTRAINT "contador_ordem_servico_environment_id_fkey"
FOREIGN KEY ("environment_id") REFERENCES "environment" ("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
