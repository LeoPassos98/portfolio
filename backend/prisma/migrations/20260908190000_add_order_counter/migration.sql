-- CreateTable
CREATE TABLE "contador_ordem_servico" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contador_ordem_servico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contador_ordem_servico_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "contador_ordem_servico_ultimo_numero_check" CHECK ("ultimo_numero" >= 0)
);

-- SeedSingleton
INSERT INTO "contador_ordem_servico" ("id", "ultimo_numero")
SELECT
    1,
    COALESCE(
        MAX(SUBSTRING("numero" FROM '^OS-([0-9]+)$')::INTEGER),
        0
    )
FROM "ordem_servico"
WHERE "numero" ~ '^OS-[0-9]+$';
