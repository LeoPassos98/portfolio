import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { useSuccessFeedback } from "../../../components/feedback/useSuccessFeedback";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Select } from "../../../components/ui/Select";
import type { HttpErrorResponse } from "../../../shared/lib/http/apiClient";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import { ordersQueryKeys } from "../api/orderQueryKeys";
import {
  getOrder,
  getOrderHistory,
  updateOrder,
  type OrderHttpErrorResponse,
} from "../api/ordersApi";
import {
  canReopenOrder,
  getAllowedOrderReopenStatuses,
  getOrderEditPermissions,
} from "../lib/orderVisibility";
import type { OrderStatus, OrderVisibility } from "../types/order";

const statusDetails = {
  awaiting: { label: "Aguardando", variant: "warning" },
  "in-progress": { label: "Em andamento", variant: "info" },
  completed: { label: "Concluída", variant: "success" },
  cancelled: { label: "Cancelada", variant: "neutral" },
} as const satisfies Record<OrderStatus, { label: string; variant: string }>;

const visibilityDetails = {
  public: { label: "Pública", variant: "info" },
  private: { label: "Privada", variant: "neutral" },
} as const satisfies Record<
  OrderVisibility,
  { label: string; variant: string }
>;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isOrderApiError(error: unknown, code: OrderHttpErrorResponse["code"]) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  );
}

function isOrderId(value: string | undefined): value is string {
  return (
    value !== undefined &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function OrderDetailsSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando ordem de serviço">
        <div className="h-5 w-40 rounded bg-neutral-bg" />
        <div className="mt-6 h-8 w-48 rounded bg-neutral-bg" />
        <div className="mt-3 h-5 w-36 rounded bg-neutral-bg" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="bg-surface h-80 rounded-ui border border-neutral-bg" />
          <div className="bg-surface h-80 rounded-ui border border-neutral-bg lg:order-last" />
        </div>
        <div className="bg-surface mt-8 h-32 rounded-ui border border-neutral-bg" />
      </div>
    </AppLayout>
  );
}

function OrderHistorySkeleton() {
  return (
    <ol
      className="mt-4 space-y-4"
      aria-label="Carregando histórico da ordem de serviço"
    >
      {[0, 1].map((item) => (
        <li
          key={item}
          className="bg-surface animate-pulse rounded-ui border border-neutral-bg p-4"
        >
          <div className="h-5 w-28 rounded bg-neutral-bg" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-4 w-40 rounded bg-neutral-bg" />
            <div className="h-4 w-32 rounded bg-neutral-bg" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function OrderDetailsPage() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const { showSuccess } = useSuccessFeedback();
  const { orderId } = useParams<{ orderId: string }>();
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    orderId: string;
    snapshotId: string;
  } | null>(null);
  const [isReopenPanelOpen, setIsReopenPanelOpen] = useState(false);
  const [reopenStatus, setReopenStatus] = useState<OrderStatus>("awaiting");
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [canReloadReopenData, setCanReloadReopenData] = useState(false);
  const [isReloadingReopenData, setIsReloadingReopenData] = useState(false);
  const hasValidOrderId = isOrderId(orderId);
  const {
    data: order,
    error: orderError,
    isError: isOrderError,
    isPending: isOrderPending,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: ordersQueryKeys.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId!),
    enabled: hasValidOrderId,
  });
  const reopenMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Parameters<typeof updateOrder>[1];
    }) => updateOrder(id, values),
  });
  const {
    data: orderHistory = [],
    isError: isOrderHistoryError,
    isPending: isOrderHistoryPending,
    refetch: refetchOrderHistory,
  } = useQuery({
    queryKey: ordersQueryKeys.history(orderId ?? ""),
    queryFn: () => getOrderHistory(orderId!),
    enabled: hasValidOrderId && order !== undefined,
  });

  const backLink = (
    <Link
      to="/orders"
      className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Voltar para Ordens
    </Link>
  );

  if (!hasValidOrderId || isOrderApiError(orderError, "ORDER_NOT_FOUND")) {
    return (
      <AppLayout>
        {backLink}
        <div className="mt-6">
          <EmptyState
            title="Ordem não encontrada ou sem acesso"
            description="Não foi possível localizar a ordem solicitada ou ela não está acessível para você."
          />
        </div>
      </AppLayout>
    );
  }

  if (isOrderPending) return <OrderDetailsSkeleton />;

  if (isOrderError || !order) {
    return (
      <AppLayout>
        {backLink}
        <div className="mt-6 space-y-4">
          <EmptyState
            title="Não foi possível carregar a ordem"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetchOrder()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentOrder = order;
  const editPermissions = session
    ? getOrderEditPermissions(currentOrder, session.currentUser)
    : null;
  const canEditCurrentOrder = editPermissions?.canEdit === true;
  const allowedReopenStatuses = session
    ? getAllowedOrderReopenStatuses(currentOrder, session.currentUser)
    : [];
  const canReopenCurrentOrder =
    session !== null && canReopenOrder(currentOrder, session.currentUser);

  async function reloadReopenData() {
    if (isReloadingReopenData) {
      return;
    }

    setIsReloadingReopenData(true);
    try {
      const refreshedOrder = await queryClient.fetchQuery({
        queryKey: ordersQueryKeys.detail(currentOrder.id),
        queryFn: () => getOrder(currentOrder.id),
      });
      queryClient.setQueryData(
        ordersQueryKeys.detail(currentOrder.id),
        refreshedOrder,
      );
      await queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.history(currentOrder.id),
      });
      setReopenError(null);
      setCanReloadReopenData(false);
      setIsReopenPanelOpen(false);
    } catch {
      setReopenError(
        "Não foi possível recarregar os dados da ordem de serviço. Tente novamente.",
      );
    } finally {
      setIsReloadingReopenData(false);
    }
  }

  async function reopenOrder() {
    if (
      reopenMutation.isPending ||
      !allowedReopenStatuses.includes(reopenStatus)
    ) {
      return;
    }

    setReopenError(null);
    setCanReloadReopenData(false);

    try {
      const updatedOrder = await reopenMutation.mutateAsync({
        id: currentOrder.id,
        values: {
          version: currentOrder.version,
          description: currentOrder.description,
          value: currentOrder.value,
          ...(currentOrder.notes ? { notes: currentOrder.notes } : {}),
          status: reopenStatus,
          visibility: currentOrder.visibility,
        },
      });
      queryClient.setQueryData(
        ordersQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: ordersQueryKeys.history(updatedOrder.id),
        }),
      ]);
      setIsReopenPanelOpen(false);
      showSuccess("Ordem de serviço reaberta com sucesso.");
    } catch (error) {
      if (isOrderApiError(error, "ORDER_VERSION_CONFLICT")) {
        setReopenError(
          "Esta OS foi alterada por outra pessoa enquanto você a editava. Recarregue os dados antes de salvar novamente.",
        );
        setCanReloadReopenData(true);
        return;
      }

      if (isOrderApiError(error, "ORDER_UPDATE_FORBIDDEN")) {
        setReopenError("Você não possui mais permissão para alterar esta OS.");
        setCanReloadReopenData(true);
        return;
      }

      if (isOrderApiError(error, "ORDER_UPDATE_INVALID_FOR_STATE")) {
        setReopenError(
          "O estado atual desta OS não permite esta alteração. Recarregue os dados.",
        );
        setCanReloadReopenData(true);
        return;
      }

      setReopenError(
        "Não foi possível reabrir a ordem de serviço. Tente novamente.",
      );
    }
  }

  const selectedHistoryItem =
    selectedSnapshot?.orderId === orderId
      ? orderHistory.find(
          (snapshot) => snapshot.id === selectedSnapshot.snapshotId,
        )
      : undefined;
  const displayedOrder = selectedHistoryItem
    ? {
        ...order,
        description: selectedHistoryItem.description,
        value: selectedHistoryItem.value,
        notes: selectedHistoryItem.notes,
        responsibleEmployeeId: selectedHistoryItem.responsibleEmployeeId,
        responsibleName: selectedHistoryItem.responsibleName,
        status: selectedHistoryItem.status,
        visibility: selectedHistoryItem.visibility,
        completedAt: selectedHistoryItem.completedAt,
        cancelledAt: selectedHistoryItem.cancelledAt,
      }
    : order;
  const statusDetail = statusDetails[displayedOrder.status];
  const visibilityDetail = visibilityDetails[displayedOrder.visibility];
  const updateDate = selectedHistoryItem?.changedAt ?? order.updatedAt;
  const updateLabel = selectedHistoryItem
    ? "Versão preservada em"
    : "Última atualização";

  return (
    <AppLayout>
      {backLink}

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground text-2xl font-bold">
              {order.number}
            </h1>
            <StatusBadge variant={statusDetail.variant}>
              {statusDetail.label}
            </StatusBadge>
            <StatusBadge variant={visibilityDetail.variant}>
              {visibilityDetail.label}
            </StatusBadge>
          </div>
          <p className="text-neutral mt-1">{order.clientName}</p>
        </div>
        {!selectedHistoryItem &&
        (canEditCurrentOrder || canReopenCurrentOrder) ? (
          <div className="flex flex-wrap gap-3">
            {canEditCurrentOrder ? (
              <Link
                to={`/orders/${order.id}/edit`}
                className="bg-primary rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Editar
              </Link>
            ) : null}
            {canReopenCurrentOrder ? (
              <Button
                type="button"
                onClick={() => {
                  setReopenError(null);
                  setCanReloadReopenData(false);
                  setIsReopenPanelOpen(true);
                }}
              >
                Reabrir OS
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {!selectedHistoryItem && isReopenPanelOpen && canReopenCurrentOrder ? (
        <section
          aria-labelledby="reopen-order-title"
          className="bg-surface mt-6 max-w-3xl rounded-ui border border-neutral-bg p-4 sm:p-6"
        >
          <h2
            id="reopen-order-title"
            className="text-foreground text-lg font-bold"
          >
            Reabrir OS
          </h2>
          <p className="text-neutral mt-2">
            Escolha o status ativo que a ordem terá ao ser reaberta.
          </p>
          <div className="mt-4 max-w-xs space-y-2">
            <label
              htmlFor="reopen-order-status"
              className="text-foreground text-sm font-medium"
            >
              Status
            </label>
            <Select
              id="reopen-order-status"
              value={reopenStatus}
              disabled={reopenMutation.isPending}
              onChange={(event) =>
                setReopenStatus(event.target.value as OrderStatus)
              }
            >
              {allowedReopenStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusDetails[status].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={reopenMutation.isPending}
              onClick={() => void reopenOrder()}
            >
              {reopenMutation.isPending ? "Reabrindo..." : "Reabrir OS"}
            </Button>
            <Button
              type="button"
              className="bg-neutral text-white hover:bg-neutral"
              disabled={reopenMutation.isPending}
              onClick={() => setIsReopenPanelOpen(false)}
            >
              Cancelar
            </Button>
          </div>
          {reopenError ? (
            <p className="text-error mt-4 text-sm" role="alert">
              {reopenError}
            </p>
          ) : null}
          {canReloadReopenData ? (
            <Button
              type="button"
              className="mt-4"
              disabled={isReloadingReopenData}
              onClick={() => void reloadReopenData()}
            >
              {isReloadingReopenData
                ? "Recarregando dados..."
                : "Recarregar dados"}
            </Button>
          ) : null}
        </section>
      ) : null}

      {selectedHistoryItem ? (
        <section
          aria-labelledby="historical-version-title"
          className="bg-info-bg mt-6 flex flex-col gap-4 rounded-ui border border-info p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 id="historical-version-title" className="text-info font-bold">
              Versão {selectedHistoryItem.version} — somente leitura
            </h2>
            <p className="text-info mt-1 text-sm">
              Preservada em{" "}
              <time dateTime={selectedHistoryItem.changedAt}>
                {dateTimeFormatter.format(
                  new Date(selectedHistoryItem.changedAt),
                )}
              </time>{" "}
              por {selectedHistoryItem.authorName}.
            </p>
          </div>
          <Button type="button" onClick={() => setSelectedSnapshot(null)}>
            Voltar para versão atual
          </Button>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <aside
          aria-labelledby="order-summary-title"
          className="bg-surface rounded-ui border border-neutral-bg p-4 sm:p-6 lg:order-last"
        >
          <h2
            id="order-summary-title"
            className="text-foreground text-lg font-bold"
          >
            Resumo operacional
          </h2>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-neutral text-sm">Valor</dt>
              <dd className="text-foreground mt-1 text-xl font-bold">
                {currencyFormatter.format(Number(displayedOrder.value))}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Responsável</dt>
              <dd className="text-foreground mt-1 font-medium">
                {displayedOrder.responsibleName}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Status</dt>
              <dd className="mt-2">
                <StatusBadge variant={statusDetail.variant}>
                  {statusDetail.label}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Visibilidade</dt>
              <dd className="mt-2">
                <StatusBadge variant={visibilityDetail.variant}>
                  {visibilityDetail.label}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Criada em</dt>
              <dd className="text-foreground mt-1 font-medium">
                <time dateTime={order.createdAt}>
                  {dateTimeFormatter.format(new Date(order.createdAt))}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">{updateLabel}</dt>
              <dd className="text-foreground mt-1 font-medium">
                <time dateTime={updateDate}>
                  {dateTimeFormatter.format(new Date(updateDate))}
                </time>
              </dd>
            </div>
          </dl>
        </aside>

        <div className="bg-surface rounded-ui border border-neutral-bg p-4 sm:p-6">
          <section aria-labelledby="order-service-title">
            <h2
              id="order-service-title"
              className="text-foreground text-lg font-bold"
            >
              Serviço
            </h2>
            <p className="text-foreground mt-4 whitespace-pre-wrap">
              {displayedOrder.description}
            </p>
            <div className="mt-6">
              <h3 className="text-foreground text-sm font-medium">
                Observações
              </h3>
              <p className="text-neutral mt-2 whitespace-pre-wrap">
                {displayedOrder.notes ?? "Nenhuma observação informada."}
              </p>
            </div>
          </section>
          <section
            aria-labelledby="order-client-title"
            className="mt-8 border-t border-neutral-bg pt-6"
          >
            <h2
              id="order-client-title"
              className="text-foreground text-lg font-bold"
            >
              Cliente
            </h2>
            <dl className="mt-4">
              <div>
                <dt className="text-neutral text-sm">Cliente vinculado</dt>
                <dd className="text-foreground mt-1 font-medium">
                  {order.clientName}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <section aria-labelledby="order-history-title" className="mt-8">
        <h2
          id="order-history-title"
          className="text-foreground text-xl font-bold"
        >
          Histórico
        </h2>
        {isOrderHistoryPending ? <OrderHistorySkeleton /> : null}
        {isOrderHistoryError ? (
          <div className="mt-4 space-y-4">
            <EmptyState
              title="Não foi possível carregar o histórico"
              description="Verifique sua conexão e tente novamente."
            />
            <div className="flex justify-center">
              <Button type="button" onClick={() => void refetchOrderHistory()}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : null}
        {!isOrderHistoryPending &&
        !isOrderHistoryError &&
        orderHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nenhum histórico disponível"
              description="Esta ordem ainda não possui snapshots registrados."
            />
          </div>
        ) : null}
        {!isOrderHistoryPending &&
        !isOrderHistoryError &&
        orderHistory.length > 0 ? (
          <ol className="mt-4 space-y-4">
            {orderHistory.map((snapshot) => {
              const snapshotStatusDetail = statusDetails[snapshot.status];
              const isSelected = snapshot.id === selectedHistoryItem?.id;
              return (
                <li key={snapshot.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedSnapshot({
                        orderId: order.id,
                        snapshotId: snapshot.id,
                      })
                    }
                    className={
                      isSelected
                        ? "bg-neutral-bg w-full rounded-ui border border-primary p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        : "bg-surface w-full rounded-ui border border-neutral-bg p-4 text-left hover:bg-neutral-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-foreground font-medium">
                        Versão {snapshot.version}
                      </span>
                      <StatusBadge variant={snapshotStatusDetail.variant}>
                        {snapshotStatusDetail.label}
                      </StatusBadge>
                    </div>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-neutral text-sm">Preservada em</dt>
                        <dd className="text-foreground mt-1 font-medium">
                          <time dateTime={snapshot.changedAt}>
                            {dateTimeFormatter.format(
                              new Date(snapshot.changedAt),
                            )}
                          </time>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral text-sm">Alterado por</dt>
                        <dd className="text-foreground mt-1 font-medium">
                          {snapshot.authorName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral text-sm">
                          Responsável naquele momento
                        </dt>
                        <dd className="text-foreground mt-1 font-medium">
                          {snapshot.responsibleName}
                        </dd>
                      </div>
                    </dl>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
    </AppLayout>
  );
}

export { OrderDetailsPage };
