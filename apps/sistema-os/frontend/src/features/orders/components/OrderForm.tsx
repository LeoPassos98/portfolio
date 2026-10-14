import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { ConfirmationDialog } from "../../../components/feedback/ConfirmationDialog";
import { useUnsavedChangesGuard } from "../../../components/feedback/useUnsavedChangesGuard";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Label } from "../../../components/ui/Label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../components/ui/SearchableSelect";
import { Select } from "../../../components/ui/Select";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Textarea } from "../../../components/ui/Textarea";
import type { HttpErrorResponse } from "../../../shared/lib/http/apiClient";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import type { OrderHttpErrorResponse } from "../api/ordersApi";
import {
  getAllowedOrderStatusTransitions,
  type OrderEditPermissions,
} from "../lib/orderVisibility";
import {
  createOrderCreateSchema,
  createOrderEditSchema,
  type OrderFormValues,
} from "../schemas/orderSchema";
import type { OrderDetail } from "../types/order";

const orderStatusLabels = {
  awaiting: "Aguardando",
  "in-progress": "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
} as const;

type OrderFormProps = {
  creation?: {
    clientOptions: readonly SearchableSelectOption[];
    employeeOptions: readonly SearchableSelectOption[];
    responsibleName?: string;
    isPending: boolean;
    onCreate: (values: {
      clientId: string;
      description: string;
      value: string;
      notes?: string;
      visibility: OrderFormValues["visibility"];
      responsibleId?: string;
    }) => Promise<OrderDetail>;
    onStaleClient: () => void;
    onStaleResponsible: () => void;
    onSuccess: (order: OrderDetail) => void;
  };
  editing?: {
    employeeOptions: readonly SearchableSelectOption[];
    isPending: boolean;
    onReloadData: () => Promise<void>;
    onStaleResponsible: () => void;
    onSuccess: (order: OrderDetail) => void;
    onUpdate: (values: {
      description: string;
      value: string;
      notes?: string;
      status: OrderFormValues["status"];
      visibility: OrderFormValues["visibility"];
      responsibleId?: string;
    }) => Promise<OrderDetail>;
    permissions: OrderEditPermissions;
    order: OrderDetail;
  };
};

type PendingCriticalTransition = {
  kind: "cancel" | "complete";
  values: OrderFormValues;
};

function isOrderApiError(error: unknown, code: OrderHttpErrorResponse["code"]) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  );
}

function toFormValues(order: OrderDetail): OrderFormValues {
  return {
    clientId: order.clientId,
    responsibleId: order.responsibleEmployeeId,
    description: order.description,
    value: order.value,
    notes: order.notes ?? "",
    status: order.status,
    visibility: order.visibility,
  };
}

function OrderForm({ creation, editing }: OrderFormProps) {
  const session = useAuthSession();
  const [pendingCriticalTransition, setPendingCriticalTransition] =
    useState<PendingCriticalTransition | null>(null);
  const [isConfirmingCriticalTransition, setIsConfirmingCriticalTransition] =
    useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [canReloadData, setCanReloadData] = useState(false);
  const [isReloadingData, setIsReloadingData] = useState(false);
  const isEditing = editing !== undefined;
  const isEmployee = session?.currentUser.profile === "employee";
  const order = editing?.order;
  const fieldPrefix = isEditing ? "edit-order" : "new-order";
  const canChangeResponsible = isEditing
    ? editing.permissions.canChangeResponsible
    : !isEmployee;
  const allowedStatusTransitions =
    isEditing && order && session
      ? getAllowedOrderStatusTransitions(order, session.currentUser)
      : [];
  const statusOptions =
    order && allowedStatusTransitions.length > 0
      ? [
          order.status,
          ...allowedStatusTransitions.filter(
            (status) => status !== order.status,
          ),
        ]
      : [];
  const canChangeStatus = statusOptions.length > 0;
  const schema = isEditing
    ? createOrderEditSchema(canChangeResponsible)
    : createOrderCreateSchema(!isEmployee);
  const {
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: order
      ? toFormValues(order)
      : {
          clientId: "",
          responsibleId: isEmployee
            ? (session?.currentUser.employeeId ?? "")
            : "",
          description: "",
          value: "",
          notes: "",
          status: "awaiting",
          visibility: "private",
        },
  });
  const { confirmationDialog } = useUnsavedChangesGuard(isDirty);

  function normalizeNotes(notes: string): string | undefined {
    return notes === "" ? undefined : notes;
  }

  async function submitEditing(values: OrderFormValues) {
    if (!editing || editing.isPending) {
      return;
    }

    setFormError(null);
    setCanReloadData(false);
    clearErrors("responsibleId");

    try {
      const updatedOrder = await editing.onUpdate({
        description: values.description,
        value: values.value,
        notes: normalizeNotes(values.notes),
        status: values.status,
        visibility: values.visibility,
        ...(canChangeResponsible
          ? { responsibleId: values.responsibleId }
          : {}),
      });
      reset(toFormValues(updatedOrder));
      editing.onSuccess(updatedOrder);
    } catch (error) {
      if (isOrderApiError(error, "ORDER_VERSION_CONFLICT")) {
        setFormError(
          "Esta OS foi alterada por outra pessoa enquanto você a editava. Recarregue os dados antes de salvar novamente.",
        );
        setCanReloadData(true);
        return;
      }

      if (isOrderApiError(error, "ORDER_UPDATE_FORBIDDEN")) {
        setFormError("Você não possui mais permissão para alterar esta OS.");
        setCanReloadData(true);
        return;
      }

      if (isOrderApiError(error, "ORDER_UPDATE_INVALID_FOR_STATE")) {
        setFormError(
          "O estado atual desta OS não permite esta alteração. Recarregue os dados.",
        );
        setCanReloadData(true);
        return;
      }

      if (isOrderApiError(error, "ORDER_RESPONSIBLE_CHANGE_FORBIDDEN")) {
        setFormError(
          "Não é permitido alterar o responsável desta OS no estado atual.",
        );
        return;
      }

      if (isOrderApiError(error, "ORDER_RESPONSIBLE_INACTIVE")) {
        editing.onStaleResponsible();
        setError("responsibleId", {
          type: "server",
          message: "O funcionário selecionado não está mais ativo.",
        });
        return;
      }

      if (isOrderApiError(error, "ORDER_RESPONSIBLE_NOT_FOUND")) {
        editing.onStaleResponsible();
        setError("responsibleId", {
          type: "server",
          message: "O funcionário selecionado não está mais disponível.",
        });
        return;
      }

      setFormError(
        "Não foi possível atualizar a ordem de serviço. Tente novamente.",
      );
    }
  }

  async function onSubmit(values: OrderFormValues) {
    if (creation) {
      if (creation.isPending) {
        return;
      }

      setFormError(null);
      clearErrors(["clientId", "responsibleId"]);

      try {
        const createdOrder = await creation.onCreate({
          clientId: values.clientId,
          description: values.description,
          value: values.value,
          notes: normalizeNotes(values.notes),
          visibility: values.visibility,
          ...(isEmployee ? {} : { responsibleId: values.responsibleId }),
        });
        reset();
        creation.onSuccess(createdOrder);
      } catch (error) {
        if (isOrderApiError(error, "ORDER_CLIENT_INACTIVE")) {
          creation.onStaleClient();
          setError("clientId", {
            type: "server",
            message:
              "Este cliente está inativo. Solicite a um administrador que o reative para criar uma nova OS.",
          });
          return;
        }

        if (isOrderApiError(error, "ORDER_CLIENT_NOT_FOUND")) {
          creation.onStaleClient();
          setError("clientId", {
            type: "server",
            message: "O cliente selecionado não está mais disponível.",
          });
          return;
        }

        if (isOrderApiError(error, "ORDER_RESPONSIBLE_REQUIRED")) {
          setError("responsibleId", {
            type: "server",
            message: "Selecione um responsável ativo.",
          });
          return;
        }

        if (isOrderApiError(error, "ORDER_RESPONSIBLE_INACTIVE")) {
          creation.onStaleResponsible();
          setError("responsibleId", {
            type: "server",
            message: "O funcionário selecionado não está mais ativo.",
          });
          return;
        }

        if (isOrderApiError(error, "ORDER_RESPONSIBLE_NOT_FOUND")) {
          creation.onStaleResponsible();
          setError("responsibleId", {
            type: "server",
            message: "O funcionário selecionado não está mais disponível.",
          });
          return;
        }

        setFormError(
          "Não foi possível criar a ordem de serviço. Tente novamente.",
        );
      }

      return;
    }

    if (!editing || !order) {
      return;
    }

    const isCancellingOrder =
      order.status !== "cancelled" && values.status === "cancelled";
    const isCompletingOrder =
      (order.status === "awaiting" || order.status === "in-progress") &&
      values.status === "completed";

    if (isCancellingOrder) {
      setPendingCriticalTransition({ kind: "cancel", values });
      return;
    }

    if (isCompletingOrder) {
      setPendingCriticalTransition({ kind: "complete", values });
      return;
    }

    await submitEditing(values);
  }

  async function reloadData() {
    if (!editing || isReloadingData) {
      return;
    }

    setIsReloadingData(true);
    try {
      await editing.onReloadData();
    } catch {
      setFormError(
        "Não foi possível recarregar os dados da ordem de serviço. Tente novamente.",
      );
    } finally {
      setIsReloadingData(false);
    }
  }

  const responsibleName = creation?.responsibleName ?? order?.responsibleName;
  const responsibleHelperText = isEditing
    ? "O responsável não pode ser alterado neste estado."
    : "Definido automaticamente como responsável pela OS.";
  const isCriticalTransitionPending =
    isConfirmingCriticalTransition || editing?.isPending === true;
  const criticalTransitionDialog =
    pendingCriticalTransition?.kind === "complete"
      ? {
          title: "Concluir esta OS?",
          description:
            "Após a conclusão, ela ficará somente leitura para Funcionários. Apenas um administrador poderá corrigi-la ou reabri-la.",
          confirmLabel: "Confirmar conclusão",
        }
      : {
          title: "Cancelar esta OS?",
          description:
            "Após o cancelamento, ela ficará somente leitura e apenas um administrador poderá reabri-la.",
          confirmLabel: "Confirmar cancelamento",
        };

  async function confirmCriticalTransition() {
    if (!pendingCriticalTransition || isCriticalTransitionPending) {
      return;
    }

    setIsConfirmingCriticalTransition(true);
    try {
      await submitEditing(pendingCriticalTransition.values);
      setPendingCriticalTransition(null);
    } finally {
      setIsConfirmingCriticalTransition(false);
    }
  }

  return (
    <form
      noValidate
      className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <section aria-labelledby={`${fieldPrefix}-client-title`}>
        <h2
          id={`${fieldPrefix}-client-title`}
          className="text-foreground text-lg font-bold"
        >
          Cliente
        </h2>

        {isEditing && order ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-neutral text-sm">Cliente vinculado</dt>
              <dd className="text-foreground mt-1 font-medium">
                {order.clientName}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Número da OS</dt>
              <dd className="text-foreground mt-1 font-medium">
                {order.number}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-4 space-y-2">
            <Label htmlFor={`${fieldPrefix}-client`}>Cliente</Label>
            <SearchableSelect
              id={`${fieldPrefix}-client`}
              name="clientId"
              options={creation?.clientOptions ?? []}
              placeholder="Pesquisar cliente"
              emptyMessage="Nenhum cliente ativo encontrado."
              ariaInvalid={Boolean(errors.clientId)}
              ariaDescribedBy={
                errors.clientId ? `${fieldPrefix}-client-error` : undefined
              }
              onValueChange={(value) => {
                setValue("clientId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {errors.clientId?.message ? (
              <p
                id={`${fieldPrefix}-client-error`}
                className="text-error text-sm"
              >
                {errors.clientId.message}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby={`${fieldPrefix}-service-title`}>
        <h2
          id={`${fieldPrefix}-service-title`}
          className="text-foreground text-lg font-bold"
        >
          Dados do serviço
        </h2>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-description`}>Descrição</Label>
            <Textarea
              id={`${fieldPrefix}-description`}
              rows={5}
              className="min-h-32"
              aria-invalid={Boolean(errors.description)}
              aria-required="true"
              aria-describedby={
                errors.description
                  ? `${fieldPrefix}-description-error`
                  : undefined
              }
              {...register("description")}
            />
            {errors.description?.message ? (
              <p
                id={`${fieldPrefix}-description-error`}
                className="text-error text-sm"
              >
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="max-w-xs space-y-2">
            <Label htmlFor={`${fieldPrefix}-value`}>Valor</Label>
            <Input
              id={`${fieldPrefix}-value`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-invalid={Boolean(errors.value)}
              aria-required="true"
              aria-describedby={
                errors.value ? `${fieldPrefix}-value-error` : undefined
              }
              {...register("value")}
            />
            {errors.value?.message ? (
              <p
                id={`${fieldPrefix}-value-error`}
                className="text-error text-sm"
              >
                {errors.value.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-notes`}>
              Observações (opcional)
            </Label>
            <Textarea
              id={`${fieldPrefix}-notes`}
              rows={4}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={
                errors.notes ? `${fieldPrefix}-notes-error` : undefined
              }
              {...register("notes")}
            />
            {errors.notes?.message ? (
              <p
                id={`${fieldPrefix}-notes-error`}
                className="text-error text-sm"
              >
                {errors.notes.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby={`${fieldPrefix}-configuration-title`}>
        <h2
          id={`${fieldPrefix}-configuration-title`}
          className="text-foreground text-lg font-bold"
        >
          Configuração
        </h2>

        <div className="mt-4 space-y-6">
          {!canChangeResponsible ? (
            <dl className="rounded-ui bg-neutral-bg p-4">
              <div>
                <dt className="text-neutral text-sm">Responsável</dt>
                <dd className="text-foreground mt-1 font-medium">
                  {responsibleName}
                </dd>
                <p className="text-neutral mt-1 text-sm">
                  {responsibleHelperText}
                </p>
              </div>
            </dl>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`${fieldPrefix}-responsible`}>Responsável</Label>
              <SearchableSelect
                id={`${fieldPrefix}-responsible`}
                name="responsibleId"
                defaultValue={order?.responsibleEmployeeId}
                options={
                  creation?.employeeOptions ?? editing?.employeeOptions ?? []
                }
                placeholder="Pesquisar responsável"
                emptyMessage="Nenhum funcionário ativo encontrado."
                ariaInvalid={Boolean(errors.responsibleId)}
                ariaDescribedBy={
                  errors.responsibleId
                    ? `${fieldPrefix}-responsible-error`
                    : undefined
                }
                onValueChange={(value) => {
                  setValue("responsibleId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              {errors.responsibleId?.message ? (
                <p
                  id={`${fieldPrefix}-responsible-error`}
                  className="text-error text-sm"
                >
                  {errors.responsibleId.message}
                </p>
              ) : null}
            </div>
          )}

          {isEditing && canChangeStatus ? (
            <div className="space-y-2">
              <Label htmlFor={`${fieldPrefix}-status`}>Status</Label>
              <Select
                id={`${fieldPrefix}-status`}
                aria-invalid={Boolean(errors.status)}
                aria-required="true"
                aria-describedby={
                  errors.status ? `${fieldPrefix}-status-error` : undefined
                }
                {...register("status")}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {orderStatusLabels[status]}
                  </option>
                ))}
              </Select>
              {errors.status?.message ? (
                <p
                  id={`${fieldPrefix}-status-error`}
                  className="text-error text-sm"
                >
                  {errors.status.message}
                </p>
              ) : null}
            </div>
          ) : isEditing && order ? (
            <dl className="rounded-ui bg-neutral-bg p-4">
              <div>
                <dt className="text-neutral text-sm">Status</dt>
                <dd className="mt-2">
                  <StatusBadge
                    variant={
                      order.status === "completed" ? "success" : "neutral"
                    }
                  >
                    {orderStatusLabels[order.status]}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
          ) : null}

          <fieldset>
            <legend className="text-foreground text-sm font-medium">
              Visibilidade
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(["public", "private"] as const).map((visibility) => (
                <label
                  key={visibility}
                  className="has-[:checked]:border-primary has-[:checked]:bg-neutral-bg flex cursor-pointer items-center gap-3 rounded-ui border border-neutral-bg p-3"
                >
                  <input
                    type="radio"
                    value={visibility}
                    className="h-4 w-4 accent-primary"
                    aria-invalid={Boolean(errors.visibility)}
                    aria-describedby={
                      errors.visibility
                        ? `${fieldPrefix}-visibility-error`
                        : undefined
                    }
                    {...register("visibility")}
                  />
                  <span className="text-foreground font-medium">
                    {visibility === "public" ? "Pública" : "Privada"}
                  </span>
                </label>
              ))}
            </div>
            {errors.visibility?.message ? (
              <p
                id={`${fieldPrefix}-visibility-error`}
                className="text-error mt-2 text-sm"
              >
                {errors.visibility.message}
              </p>
            ) : null}
          </fieldset>

          {isEditing && order ? (
            <p className="text-neutral text-sm">
              Versão atual: {order.version}
            </p>
          ) : (
            <dl className="grid gap-4 rounded-ui bg-neutral-bg p-4 sm:grid-cols-2">
              <div>
                <dt className="text-neutral text-sm">Status inicial</dt>
                <dd className="mt-2">
                  <StatusBadge variant="warning">Aguardando</StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-neutral text-sm">Número da OS</dt>
                <dd className="text-foreground mt-1 font-medium">
                  Gerado automaticamente após a criação
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={creation?.isPending || isCriticalTransitionPending}
        >
          {isEditing
            ? isCriticalTransitionPending
              ? "Salvando..."
              : "Salvar alterações"
            : creation?.isPending
              ? "Criando..."
              : "Criar OS"}
        </Button>
        <Link
          to={isEditing && order ? `/orders/${order.id}` : "/orders"}
          className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar
        </Link>
      </div>

      {formError ? (
        <p className="text-error text-sm" role="alert">
          {formError}
        </p>
      ) : null}
      {canReloadData ? (
        <Button
          type="button"
          disabled={isReloadingData}
          onClick={() => void reloadData()}
        >
          {isReloadingData ? "Recarregando dados..." : "Recarregar dados"}
        </Button>
      ) : null}

      <ConfirmationDialog
        isOpen={pendingCriticalTransition !== null}
        isPending={isCriticalTransitionPending}
        title={criticalTransitionDialog.title}
        description={criticalTransitionDialog.description}
        confirmLabel={criticalTransitionDialog.confirmLabel}
        onCancel={() => {
          if (!isCriticalTransitionPending) {
            setPendingCriticalTransition(null);
          }
        }}
        onConfirm={() => void confirmCriticalTransition()}
      />
      {confirmationDialog}
    </form>
  );
}

export { OrderForm };
