"use client";

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  PackageCheckIcon,
  PackageSearchIcon,
  Share2Icon,
  ShoppingBagIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense, use, useState } from "react";
import { toast } from "sonner";
import {
  ChannelBadge,
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  Loading,
  Notice,
  PageHeader,
  StatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import type { Order, OrderStatus } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

const ORDER_STEPS: {
  status: OrderStatus;
  label: string;
  icon: typeof ClockIcon;
}[] = [
  { status: "PENDING", label: "Order Placed", icon: ClockIcon },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckCircle2Icon },
  { status: "SHIPPED", label: "Shipped", icon: TruckIcon },
  { status: "DELIVERED", label: "Delivered", icon: PackageCheckIcon },
];

const STEP_ORDER: Record<OrderStatus, number> = {
  PENDING: 1,
  CONFIRMED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 0,
};

function TrackingStepper({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <XCircleIcon className="size-6 shrink-0" />
        <div>
          <p className="font-semibold">Order Cancelled</p>
          <p className="text-sm opacity-90">
            This order was cancelled. Reserved items have been returned to
            inventory.
          </p>
        </div>
      </div>
    );
  }

  const currentStep = STEP_ORDER[status] ?? 1;

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ORDER_STEPS.map((step, idx) => {
          const stepNumber = idx + 1;
          const isDone = currentStep >= stepNumber;
          const isCurrent = currentStep === stepNumber;
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className={cn(
                "flex flex-col items-center gap-2 text-center",
                isCurrent && "font-semibold text-primary",
                isDone && !isCurrent && "text-foreground",
                !isDone && "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border-2 transition-all",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold sm:text-sm">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isCurrent ? "In progress" : isDone ? "Completed" : "Pending"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderTrackingContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { money } = useSettings();
  const { user } = useSession();
  const [cancelError, setCancelError] = useState<ApiError | null>(null);

  const orderLoad = useLoad(`order-${id}`, () =>
    api.get<Order>(`/orders/${id}`),
  );

  async function cancelOrder() {
    setCancelError(null);
    try {
      const updated = await api.post<Order>(`/orders/${id}/cancel`);
      orderLoad.setData(() => updated);
      toast.success(`Order #${id} has been cancelled.`);
    } catch (e) {
      setCancelError(toApiError(e));
    }
  }

  function copyTrackingLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Tracking link copied to clipboard!");
    }
  }

  if (orderLoad.loading && !orderLoad.data) {
    return <Loading label="Loading order tracking details..." />;
  }

  if (orderLoad.error || !orderLoad.data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <EmptyState
          icon={PackageSearchIcon}
          title="Order not found"
          description={`We couldn't locate order #${id}. Please check the order number or link.`}
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/track">Track another order</Link>
            </Button>
            <Button asChild>
              <Link href="/">Back to shop</Link>
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  const order = orderLoad.data;
  const isOwner = Boolean(
    user && order.customer && order.customer.id === user.id,
  );
  const canCancel =
    isOwner && order.status === "PENDING" && user?.role === "CUSTOMER";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/">
            <ArrowLeftIcon data-icon="inline-start" />
            Continue shopping
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyTrackingLink}
          className="gap-1.5"
        >
          <CopyIcon className="size-3.5" />
          Copy tracking link
        </Button>
      </div>

      <PageHeader
        title={`Order #${order.id}`}
        description={`Placed on ${formatDate(order.createdAt)}`}
        className="mb-2"
        actions={
          <div className="flex items-center gap-2">
            <ChannelBadge channel={order.channel} />
            <StatusBadge status={order.status} />
          </div>
        }
      />

      <ErrorBanner error={cancelError} onDismiss={() => setCancelError(null)} />

      {order.customer === null ? (
        <Notice>
          This is your public tracking link. Keep order number{" "}
          <strong>#{order.id}</strong> or bookmark this page. To view all your
          orders in one place,{" "}
          <Link href="/register">
            create an account with your phone number ({order.customerPhone})
          </Link>
          .
        </Notice>
      ) : user ? (
        <Notice tone="success">
          You can also find this order anytime under{" "}
          <Link href="/account/orders">My orders</Link>.
        </Notice>
      ) : (
        <Notice tone="success">
          This order is linked to an account with phone {order.customerPhone}.{" "}
          <Link href="/login?next=/account/orders">Sign in</Link> to view your
          full history.
        </Notice>
      )}

      {/* Stepper tracking progress */}
      <TrackingStepper status={order.status} />

      {/* Order info & items */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery & Contact Details</CardTitle>
          <CardDescription>Order recipient information</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Recipient Name</dt>
              <dd className="font-medium">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone Number</dt>
              <dd className="font-medium">{order.customerPhone}</dd>
            </div>
            {order.shippingAddress && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Shipping Address</dt>
                <dd className="font-medium">{order.shippingAddress}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {order.items.reduce((s, it) => s + it.quantity, 0)} item
            {order.items.length === 1 ? "" : "s"} ordered
          </CardDescription>
          <CardAction className="font-heading text-lg font-bold tabular-nums">
            {money(order.totalAmount)}
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={`${item.productId ?? "x"}-${index}`}>
                    <TableCell className="font-medium whitespace-normal">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Grand Total</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {money(order.totalAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {order.receipt && (
            <div className="mt-4 space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
              <p>
                Receipt{" "}
                <span className="font-mono font-medium">
                  {order.receipt.receiptNumber}
                </span>{" "}
                · {order.receipt.paymentMethod}
              </p>
              <p className="text-muted-foreground">
                Cash received {money(order.receipt.cashReceived)} · Change{" "}
                {money(order.receipt.change)}
              </p>
              {order.receipt.cashier && (
                <p className="text-muted-foreground">
                  Cashier: {order.receipt.cashier.fullName}
                </p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="no-print flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">
                <ShoppingBagIcon data-icon="inline-start" />
                Continue shopping
              </Link>
            </Button>
            {user?.role === "CUSTOMER" && (
              <Button asChild variant="ghost">
                <Link href="/account/orders">View all my orders</Link>
              </Button>
            )}
          </div>

          {canCancel && (
            <ConfirmButton
              variant="outline"
              title="Cancel this order?"
              description="Are you sure you want to cancel this order? Reserved stock will be restored immediately."
              confirmLabel="Yes, cancel order"
              onConfirm={cancelOrder}
            >
              Cancel order
            </ConfirmButton>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Loading label="Loading order tracking..." />}>
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}
