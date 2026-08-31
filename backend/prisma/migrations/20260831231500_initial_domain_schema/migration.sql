-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "perfil" AS ENUM ('ADMINISTRADOR', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "status_ordem_servico" AS ENUM ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "visibilidade" AS ENUM ('PRIVADA', 'PUBLICA');

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionario" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email_login" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deve_alterar_senha" BOOLEAN NOT NULL DEFAULT true,
    "funcionario_id" UUID NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "status" "status_ordem_servico" NOT NULL DEFAULT 'AGUARDANDO',
    "visibilidade" "visibilidade" NOT NULL DEFAULT 'PRIVADA',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMPTZ(6),
    "cancelado_em" TIMESTAMPTZ(6),
    "cliente_id" UUID NOT NULL,
    "responsavel_id" UUID NOT NULL,

    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ordem_servico_valor_check" CHECK ("valor" >= 0)
);

-- CreateTable
CREATE TABLE "historico_ordem_servico" (
    "id" UUID NOT NULL,
    "versao" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "status" "status_ordem_servico" NOT NULL,
    "visibilidade" "visibilidade" NOT NULL,
    "concluido_em" TIMESTAMPTZ(6),
    "cancelado_em" TIMESTAMPTZ(6),
    "snapshot_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ordem_servico_id" UUID NOT NULL,
    "responsavel_id" UUID NOT NULL,
    "alterado_por_usuario_id" UUID NOT NULL,

    CONSTRAINT "historico_ordem_servico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "historico_ordem_servico_valor_check" CHECK ("valor" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "cliente_documento_key" ON "cliente"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_login_key" ON "usuario"("email_login");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_funcionario_id_key" ON "usuario"("funcionario_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_numero_key" ON "ordem_servico"("numero");

-- CreateIndex
CREATE INDEX "ordem_servico_cliente_id_idx" ON "ordem_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "ordem_servico_responsavel_id_idx" ON "ordem_servico"("responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "historico_ordem_servico_ordem_servico_id_versao_key" ON "historico_ordem_servico"("ordem_servico_id", "versao");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_ordem_servico" ADD CONSTRAINT "historico_ordem_servico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_ordem_servico" ADD CONSTRAINT "historico_ordem_servico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_ordem_servico" ADD CONSTRAINT "historico_ordem_servico_alterado_por_usuario_id_fkey" FOREIGN KEY ("alterado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
