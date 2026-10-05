import { Injectable } from '@nestjs/common';
import {
  DemoDataMode,
  type Environment,
  type Prisma,
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';

const exampleClients = [
  'Oficina Horizonte (Exemplo)',
  'Papelaria Girassol (Exemplo)',
  'Café da Praça (Exemplo)',
  'Ateliê das Cores (Exemplo)',
  'Mercado Primavera (Exemplo)',
  'Livraria das Nuvens (Exemplo)',
];

const exampleOrders = [
  {
    descricao: 'Revisão de impressora',
    valor: '180.00',
    status: StatusOrdemServico.AGUARDANDO,
    historyCount: 0,
  },
  {
    descricao: 'Instalação de rede local',
    valor: '450.00',
    status: StatusOrdemServico.AGUARDANDO,
    historyCount: 0,
  },
  {
    descricao: 'Manutenção de computador',
    valor: '260.00',
    status: StatusOrdemServico.EM_ANDAMENTO,
    historyCount: 1,
  },
  {
    descricao: 'Configuração de roteador',
    valor: '150.00',
    status: StatusOrdemServico.EM_ANDAMENTO,
    historyCount: 1,
  },
  {
    descricao: 'Troca de armazenamento',
    valor: '380.00',
    status: StatusOrdemServico.CONCLUIDO,
    historyCount: 2,
  },
  {
    descricao: 'Limpeza preventiva de equipamento',
    valor: '120.00',
    status: StatusOrdemServico.CONCLUIDO,
    historyCount: 2,
  },
  {
    descricao: 'Diagnóstico de monitor',
    valor: '90.00',
    status: StatusOrdemServico.CANCELADO,
    historyCount: 3,
  },
  {
    descricao: 'Atualização de sistema',
    valor: '210.00',
    status: StatusOrdemServico.EM_ANDAMENTO,
    historyCount: 1,
  },
];

@Injectable()
export class DemoSeedService {
  async provision(
    transaction: Prisma.TransactionClient,
    environment: Environment,
    usuarioId: string,
  ): Promise<void> {
    if (environment.demoDataMode === DemoDataMode.VAZIO) return;

    // A retry starts from the original shell because the entire previous seed rolls back.
    const counter = await transaction.contadorOrdemServico.findUniqueOrThrow({
      where: { environmentId: environment.id },
    });
    if (counter.ultimoNumero !== 0)
      throw new Error('DEMO shell counter is not empty.');

    const employees = [];
    for (const [index, nome] of [
      'Técnica Aurora (Exemplo)',
      'Técnico Vale (Exemplo)',
    ].entries()) {
      employees.push(
        await transaction.funcionario.create({
          data: {
            environmentId: environment.id,
            nome,
            telefone: `3190000000${index + 1}`,
            email: `tecnico${index + 1}@demo.invalid`,
          },
        }),
      );
    }

    const clients = [];
    for (const [index, nome] of exampleClients.entries()) {
      clients.push(
        await transaction.cliente.create({
          data: {
            environmentId: environment.id,
            nome,
            telefone: `3190000001${index}`,
            email: `cliente${index + 1}@demo.invalid`,
            cep: '30000000',
            logradouro: 'Rua dos Exemplos',
            numero: String(100 + index),
            bairro: 'Bairro Demonstrativo',
            cidade: 'Belo Horizonte',
            uf: 'MG',
          },
        }),
      );
    }

    for (const [index, example] of exampleOrders.entries()) {
      const criadoEm = new Date(
        environment.criadoEm.getTime() - (index + 1) * 86_400_000,
      );
      const atualizadoEm = new Date(
        criadoEm.getTime() + example.historyCount * 3_600_000,
      );
      const order = await transaction.ordemServico.create({
        data: {
          environmentId: environment.id,
          numero: `OS-${String(index + 1).padStart(6, '0')}`,
          descricao: example.descricao,
          valor: example.valor,
          status: example.status,
          visibilidade:
            index % 2 === 0 ? Visibilidade.PUBLICA : Visibilidade.PRIVADA,
          versao: example.historyCount + 1,
          observacoes: 'Dados fictícios para demonstração.',
          criadoEm,
          atualizadoEm,
          concluidoEm:
            example.status === StatusOrdemServico.CONCLUIDO
              ? atualizadoEm
              : null,
          canceladoEm:
            example.status === StatusOrdemServico.CANCELADO
              ? atualizadoEm
              : null,
          clienteId: clients[index % clients.length].id,
          responsavelId: employees[index % employees.length].id,
        },
      });

      for (let version = 1; version <= example.historyCount; version += 1) {
        await transaction.historicoOrdemServico.create({
          data: {
            environmentId: environment.id,
            ordemServicoId: order.id,
            versao: version,
            descricao: order.descricao,
            valor: order.valor,
            observacoes: `Acompanhamento fictício: etapa ${version} do atendimento.`,
            status:
              version === 1
                ? StatusOrdemServico.AGUARDANDO
                : StatusOrdemServico.EM_ANDAMENTO,
            visibilidade: order.visibilidade,
            responsavelId: order.responsavelId,
            alteradoPorUsuarioId: usuarioId,
            snapshotEm: new Date(criadoEm.getTime() + version * 3_600_000),
          },
        });
      }
    }

    await transaction.contadorOrdemServico.update({
      where: { environmentId: environment.id },
      data: { ultimoNumero: exampleOrders.length },
    });
  }
}
