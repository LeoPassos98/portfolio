-- CreateTable
CREATE TABLE "demo_generation_attempt" (
    "id" UUID NOT NULL,
    "origin_ip_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_generation_attempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "demo_generation_attempt_origin_ip_hash_check"
        CHECK ("origin_ip_hash" ~ '^[0-9a-f]{64}$')
);

-- CreateIndex
CREATE INDEX "demo_generation_attempt_origin_ip_hash_created_at_idx"
ON "demo_generation_attempt" ("origin_ip_hash", "created_at");
