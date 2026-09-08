import type { AuthenticatedUser } from "../../auth/types/authenticatedSession";
import type { OrderDetail, OrderStatus } from "../types/order";

type OrderVisibilityViewer = Pick<AuthenticatedUser, "employeeId" | "profile">;

type OrderEditPermissions = {
  canEdit: boolean;
  canChangeResponsible: boolean;
  canChangeStatus: boolean;
};

const readOnlyOrderPermissions: OrderEditPermissions = {
  canEdit: false,
  canChangeResponsible: false,
  canChangeStatus: false,
};

const allOrderStatuses: readonly OrderStatus[] = [
  "awaiting",
  "in-progress",
  "completed",
  "cancelled",
];
const reopenableOrderStatuses: readonly OrderStatus[] = [
  "awaiting",
  "in-progress",
];

function getOrderEditPermissions(
  order: OrderDetail,
  viewer: OrderVisibilityViewer,
): OrderEditPermissions {
  const isOpen = order.status === "awaiting" || order.status === "in-progress";

  if (viewer.profile === "employee") {
    if (order.responsibleEmployeeId !== viewer.employeeId || !isOpen) {
      return readOnlyOrderPermissions;
    }

    return {
      canEdit: true,
      canChangeResponsible: false,
      canChangeStatus: true,
    };
  }

  if (order.status === "cancelled") {
    return readOnlyOrderPermissions;
  }

  if (order.status === "completed") {
    return {
      canEdit: true,
      canChangeResponsible: false,
      canChangeStatus: true,
    };
  }

  return {
    canEdit: true,
    canChangeResponsible: true,
    canChangeStatus: true,
  };
}

function getAllowedOrderStatusTransitions(
  order: OrderDetail,
  viewer: OrderVisibilityViewer,
): readonly OrderStatus[] {
  const editPermissions = getOrderEditPermissions(order, viewer);

  if (!editPermissions.canChangeStatus) {
    return [];
  }

  if (order.status === "completed") {
    return ["awaiting", "in-progress"];
  }

  return allOrderStatuses;
}

function canReopenOrder(order: OrderDetail, viewer: OrderVisibilityViewer) {
  return viewer.profile === "admin" && order.status === "cancelled";
}

function getAllowedOrderReopenStatuses(
  order: OrderDetail,
  viewer: OrderVisibilityViewer,
): readonly OrderStatus[] {
  return canReopenOrder(order, viewer) ? reopenableOrderStatuses : [];
}

export {
  canReopenOrder,
  getAllowedOrderReopenStatuses,
  getAllowedOrderStatusTransitions,
  getOrderEditPermissions,
};
export type { OrderEditPermissions };
