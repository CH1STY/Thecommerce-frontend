"use client";

import { PackageIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Loading,
  PageHeader,
  Pager,
} from "@/components/common";
import { OrderCard } from "@/components/OrderCard";
import { RequireRole } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import type { Order, Page } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function MyOrdersPage() {
  return (
    <RequireRole roles={["CUSTOMER"]}>
      <MyOrders />
    </RequireRole>
  );
}

function MyOrders() {
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const orders = useLoad(`my-orders-${page}`, () =>
    api.get<Page<Order>>("/orders/me", { params: { page, size: 10 } }),
  );

  async function cancel(order: Order) {
    setActionError(null);
    try {
      const updated = await api.post<Order>(`/orders/${order.id}/cancel`);
      orders.setData((current) => ({
        ...current,
        content: current.content.map((o) =>
          o.id === updated.id ? updated : o,
        ),
      }));
      toast.success(`Order #${order.id} cancelled.`);
    } catch (e) {
      setActionError(toApiError(e));
      orders.reload();
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My orders"
        description="Includes online orders and in-store or guest purchases made with your phone number."
      />
      <ErrorBanner
        error={actionError ?? orders.error}
        onDismiss={() => setActionError(null)}
      />
      {orders.loading && !orders.data ? (
        <Loading />
      ) : orders.data?.content.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No orders yet"
          description="When you place an order it will show up here."
        >
          <Button asChild>
            <Link href="/">Start shopping</Link>
          </Button>
        </EmptyState>
      ) : (
        orders.data?.content.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            actions={
              order.status === "PENDING" && (
                <ConfirmButton
                  variant="destructive"
                  title={`Cancel order #${order.id}?`}
                  description="The order will be cancelled. This can't be undone."
                  confirmLabel="Cancel order"
                  cancelLabel="Keep order"
                  onConfirm={() => void cancel(order)}
                >
                  Cancel order
                </ConfirmButton>
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
