"use client";

import { ShoppingBasketIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  PageHeader,
  Pager,
  Select,
} from "@/components/common";
import { OrderCard } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import {
  NEXT_STATUSES,
  ORDER_STATUSES,
  type Order,
  type OrderChannel,
  type OrderStatus,
  type Page,
} from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function OrdersAdminPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [channel, setChannel] = useState<OrderChannel | "">("");
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const orders = useLoad(`orders-${status}-${channel}-${page}`, () =>
    api.get<Page<Order>>("/orders", {
      params: {
        status: status || undefined,
        channel: channel || undefined,
        page,
        size: 20,
      },
    }),
  );

  async function move(order: Order, next: OrderStatus) {
    setBusyId(order.id);
    setActionError(null);
    try {
      const updated = await api.patch<Order>(`/orders/${order.id}/status`, {
        status: next,
      });
      orders.setData((current) => ({
        ...current,
        content: current.content.map((o) =>
          o.id === updated.id ? updated : o,
        ),
      }));
      toast.success(
        `Order #${order.id} is now ${humanize(updated.status).toLowerCase()}.`,
      );
    } catch (e) {
      setActionError(toApiError(e));
      orders.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={
          orders.data
            ? `${orders.data.totalElements} order${orders.data.totalElements === 1 ? "" : "s"}`
            : "Online and in-store orders."
        }
        actions={
          <>
            <FormField label="Status" className="w-40">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as OrderStatus | "");
                  setPage(0);
                }}
              >
                <option value="">All</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Channel" className="w-40">
              <Select
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as OrderChannel | "");
                  setPage(0);
                }}
              >
                <option value="">All</option>
                <option value="ONLINE">Online</option>
                <option value="IN_STORE">In store</option>
              </Select>
            </FormField>
          </>
        }
      />
      <ErrorBanner
        error={actionError ?? orders.error}
        onDismiss={() => setActionError(null)}
      />
      {orders.loading && !orders.data ? (
        <Loading />
      ) : orders.data?.content.length === 0 ? (
        <EmptyState
          icon={ShoppingBasketIcon}
          title="No orders match"
          description="Try a different status or channel."
        />
      ) : (
        orders.data?.content.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            showCustomerAccount
            actions={
              NEXT_STATUSES[order.status].length === 0
                ? undefined
                : NEXT_STATUSES[order.status].map((next) =>
                    next === "CANCELLED" ? (
                      <ConfirmButton
                        key={next}
                        variant="destructive"
                        disabled={busyId === order.id}
                        title={`Cancel order #${order.id}?`}
                        description="The order is cancelled and its stock is returned."
                        confirmLabel="Cancel order"
                        cancelLabel="Keep order"
                        onConfirm={() => void move(order, next)}
                      >
                        Cancel
                      </ConfirmButton>
                    ) : (
                      <Button
                        key={next}
                        type="button"
                        variant="outline"
                        disabled={busyId === order.id}
                        onClick={() => void move(order, next)}
                      >
                        Mark {humanize(next).toLowerCase()}
                      </Button>
                    ),
                  )
            }
          />
        ))
      )}
      {orders.data && (
        <Pager
          page={orders.data.page}
          totalPages={orders.data.totalPages}
          onPage={setPage}
        />
      )}
    </div>
  );
}
