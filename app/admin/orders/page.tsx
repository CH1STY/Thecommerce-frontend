"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ShoppingBasketIcon,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import {
  ChannelBadge,
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  PageHeader,
  Pager,
  Select,
  StatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate, humanize } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import {
  NEXT_STATUSES,
  ORDER_STATUSES,
  type Order,
  type OrderChannel,
  type OrderStatus,
  type Page,
} from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

const COLUMNS = 9;

export default function OrdersAdminPage() {
  const { money } = useSettings();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [channel, setChannel] = useState<OrderChannel | "">("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const orders = useLoad(`orders-${status}-${channel}-${page}`, () =>
    api.get<Page<Order>>("/orders", {
      params: {
        status: status || undefined,
        channel: channel || undefined,
        page,
        size: 25,
      },
    }),
  );

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  const data = orders.data;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={
          data
            ? `${data.totalElements} order${data.totalElements === 1 ? "" : "s"}`
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
      {orders.loading && !data ? (
        <Loading />
      ) : data?.content.length === 0 ? (
        <EmptyState
          icon={ShoppingBasketIcon}
          title="No orders match"
          description="Try a different status or channel."
        />
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-3">
                  <span className="sr-only">Details</span>
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden xl:table-cell">Account</TableHead>
                <TableHead>Channel · status</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Items
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn(orders.loading && "opacity-60")}>
              {data?.content.map((order) => {
                const open = expanded.has(order.id);
                const itemCount = order.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );
                return (
                  <Fragment key={order.id}>
                    <TableRow
                      data-state={open ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => toggle(order.id)}
                    >
                      <TableCell className="pl-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-expanded={open}
                          aria-label={`${open ? "Hide" : "Show"} details of order #${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(order.id);
                          }}
                        >
                          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/orders/${order.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{order.id}
                        </Link>
                        <p className="text-xs font-normal text-muted-foreground md:hidden">
                          {formatDate(order.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="min-w-48 whitespace-normal">
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {order.customerPhone}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {order.customer?.email ?? "Guest"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ChannelBadge channel={order.channel} />
                          <StatusBadge status={order.status} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {itemCount}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {money(order.totalAmount)}
                      </TableCell>
                      <TableCell
                        className="pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          {NEXT_STATUSES[order.status].map((next) =>
                            next === "CANCELLED" ? (
                              <ConfirmButton
                                key={next}
                                size="sm"
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
                                size="sm"
                                variant="outline"
                                disabled={busyId === order.id}
                                onClick={() => void move(order, next)}
                              >
                                Mark {humanize(next).toLowerCase()}
                              </Button>
                            ),
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={COLUMNS}
                          className="bg-muted/30 px-4 py-4 whitespace-normal"
                        >
                          <OrderDetails order={order} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          {data && data.totalPages > 1 && (
            <div className="border-t px-4 py-3">
              <Pager
                className="mt-0"
                page={data.page}
                totalPages={data.totalPages}
                onPage={setPage}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const { money } = useSettings();
  return (
    <div className="space-y-3">
      <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        {order.shippingAddress && (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Ship to:</dt>
            <dd>{order.shippingAddress}</dd>
          </div>
        )}
        {order.customer && (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Account:</dt>
            <dd>
              {order.customer.fullName} ({order.customer.email})
            </dd>
          </div>
        )}
        {order.receipt && (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Receipt:</dt>
            <dd>
              <span className="font-mono">{order.receipt.receiptNumber}</span>{" "}
              · cash {money(order.receipt.cashReceived)} · change{" "}
              {money(order.receipt.change)}
              {order.receipt.cashier && ` · by ${order.receipt.cashier.fullName}`}
            </dd>
          </div>
        )}
        {order.updatedAt && (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Updated:</dt>
            <dd>{formatDate(order.updatedAt)}</dd>
          </div>
        )}
        <div className="ml-auto">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Tracking page
            <ExternalLinkIcon className="size-3.5" />
          </Link>
        </div>
      </dl>
      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="pr-4 text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, index) => (
              <TableRow key={`${item.productId ?? "x"}-${index}`}>
                <TableCell className="pl-4 whitespace-normal">
                  {item.productId !== null ? (
                    <Link
                      href={`/products/${item.productId}`}
                      className="hover:underline"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    item.productName
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(item.unitPrice)}
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">
                  {money(item.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
