import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { useSuccessFeedback } from "../../../components/feedback/useSuccessFeedback";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Button } from "../../../components/ui/Button";
import type { SearchableSelectOption } from "../../../components/ui/SearchableSelect";
import type { HttpErrorResponse } from "../../../shared/lib/http/apiClient";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import { employeesQueryKeys } from "../../employees/api/employeeQueryKeys";
import { listEmployees } from "../../employees/api/employeesApi";
import { OrderForm } from "../components/OrderForm";
import { ordersQueryKeys } from "../api/orderQueryKeys";
import {
  getOrder,
  updateOrder,
  type OrderHttpErrorResponse,
} from "../api/ordersApi";
import { getOrderEditPermissions } from "../lib/orderVisibility";
import type { OrderDetail } from "../types/order";

const activeEmployeesParams = { status: "active" } as const;

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

function OrderEditSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando ordem de serviço">
        <div className="h-8 w-56 rounded bg-neutral-bg" />
        <div className="bg-surface mt-6 rounded-ui border border-neutral-bg p-6">
          <div className="h-6 w-36 rounded bg-neutral-bg" />
          <div className="mt-6 h-16 rounded bg-neutral-bg" />
          <div className="mt-6 h-10 w-60 rounded bg-neutral-bg" />
          <div className="mt-8 h-6 w-44 rounded bg-neutral-bg" />
          <div className="mt-4 h-32 rounded bg-neutral-bg" />
        </div>
      </div>
    </AppLayout>
  );
}

function EmployeesDependencySkeleton() {
  return (
    <div
      aria-label="Carregando funcionários ativos"
      className="bg-surface mt-6 animate-pulse rounded-ui border border-neutral-bg p-6"
    >
      <div className="h-6 w-40 rounded bg-neutral-bg" />
      <div className="mt-6 h-10 rounded bg-neutral-bg" />
      <div className="mt-8 h-32 rounded bg-neutral-bg" />
    </div>
  );
}

type EditFormContentProps = {
  employeeOptions: readonly SearchableSelectOption[];
  onReloaded: () => void;
  order: OrderDetail;
};

function EditFormContent({
  employeeOptions,
  onReloaded,
  order,
}: EditFormContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess } = useSuccessFeedback();
  const session = useAuthSession();
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Parameters<typeof updateOrder>[1];
    }) => updateOrder(id, values),
  });

  if (!session) {
    return null;
  }

  const permissions = getOrderEditPermissions(order, session.currentUser);

  return (
    <OrderForm
      editing={{
        employeeOptions,
        isPending: updateMutation.isPending,
        permissions,
        order,
        onUpdate: async (values) => {
          const updatedOrder = await updateMutation.mutateAsync({
            id: order.id,
            values: {
              version: order.version,
              ...values,
            },
          });
          queryClient.setQueryData(
            ordersQueryKeys.detail(updatedOrder.id),
            updatedOrder,
          );
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ordersQueryKeys.lists(),
            }),
            queryClient.invalidateQueries({
              queryKey: ordersQueryKeys.history(updatedOrder.id),
            }),
          ]);
          return updatedOrder;
        },
        onStaleResponsible: () => {
          void queryClient.invalidateQueries({
            queryKey: employeesQueryKeys.list(activeEmployeesParams),
          });
        },
        onReloadData: async () => {
          const refreshedOrder = await queryClient.fetchQuery({
            queryKey: ordersQueryKeys.detail(order.id),
            queryFn: () => getOrder(order.id),
          });
          queryClient.setQueryData(
            ordersQueryKeys.detail(order.id),
            refreshedOrder,
          );
          await queryClient.invalidateQueries({
            queryKey: ordersQueryKeys.history(order.id),
          });
          onReloaded();
        },
        onSuccess: (updatedOrder) => {
          showSuccess("Ordem de serviço atualizada com sucesso.");
          navigate(`/orders/${updatedOrder.id}`);
        },
      }}
    />
  );
}

function AdminOpenOrderEditContent({
  onReloaded,
  order,
}: Omit<EditFormContentProps, "employeeOptions">) {
  const {
    data: employees = [],
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: employeesQueryKeys.list(activeEmployeesParams),
    queryFn: () => listEmployees(activeEmployeesParams),
  });

  if (isPending) {
    return <EmployeesDependencySkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-surface mt-6 rounded-ui border border-neutral-bg p-6">
        <p className="text-error" role="alert">
          Falha ao carregar Funcionários ativos.
        </p>
        <Button type="button" className="mt-4" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const employeeOptions: SearchableSelectOption[] = employees.map(
    (employee) => ({
      label: employee.name,
      searchTerms: [employee.contactEmail, employee.phone],
      value: employee.id,
    }),
  );

  if (employeeOptions.length === 0) {
    return (
      <div className="bg-surface mt-6 rounded-ui border border-neutral-bg p-6">
        <p className="text-foreground font-medium">
          Nenhum funcionário ativo disponível para assumir esta OS.
        </p>
        <p className="text-neutral mt-2 text-sm">
          Reative ou cadastre um funcionário antes de alterar o responsável.
        </p>
      </div>
    );
  }

  return (
    <EditFormContent
      order={order}
      employeeOptions={employeeOptions}
      onReloaded={onReloaded}
    />
  );
}

function OrderEditPage() {
  const session = useAuthSession();
  const { orderId } = useParams<{ orderId: string }>();
  const [formRevision, setFormRevision] = useState(0);
  const hasValidOrderId = isOrderId(orderId);
  const {
    data: order,
    error,
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ordersQueryKeys.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId!),
    enabled: hasValidOrderId,
  });
  const backLink = (
    <Link
      to="/orders"
      className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Voltar para Ordens
    </Link>
  );

  if (!hasValidOrderId || isOrderApiError(error, "ORDER_NOT_FOUND")) {
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

  if (isPending) {
    return <OrderEditSkeleton />;
  }

  if (isError || !order) {
    return (
      <AppLayout>
        {backLink}
        <div className="mt-6 space-y-4">
          <EmptyState
            title="Não foi possível carregar a ordem"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (order.status === "cancelled") {
    return <Navigate to={`/orders/${order.id}`} replace />;
  }

  if (
    !session ||
    !getOrderEditPermissions(order, session.currentUser).canEdit
  ) {
    return <Navigate to={`/orders/${order.id}`} replace />;
  }

  const isAdminEditingOpenOrder =
    session.currentUser.profile === "admin" &&
    getOrderEditPermissions(order, session.currentUser).canChangeResponsible;
  const contentKey = `${order.id}-${formRevision}`;

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">
        Editar {order.number}
      </h1>
      {isAdminEditingOpenOrder ? (
        <AdminOpenOrderEditContent
          key={contentKey}
          order={order}
          onReloaded={() => setFormRevision((revision) => revision + 1)}
        />
      ) : (
        <EditFormContent
          key={contentKey}
          order={order}
          employeeOptions={[]}
          onReloaded={() => setFormRevision((revision) => revision + 1)}
        />
      )}
    </AppLayout>
  );
}

export { OrderEditPage };
