"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChannelBadge, StatusBadge } from "@/components/common";
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
import { formatDate } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import type { Order } from "@/lib/types";

export function OrderCard({
  order,
  actions,
  showCustomerAccount,
}: {
  order: Order;
  actions?: ReactNode;
  showCustomerAccount?: boolean;
}) {
  const { money } = useSettings();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Link
            href={`/orders/${order.id}`}
            className="cursor-pointer hover:underline hover:text-primary transition-colors"
          >
            Order #{order.id}
          </Link>
          <ChannelBadge channel={order.channel} />
          <StatusBadge status={order.status} />
        </CardTitle>
        <CardDescription>{formatDate(order.createdAt)}</CardDescription>
        <CardAction className="font-heading text-base font-semibold tabular-nums">
          {money(order.totalAmount)}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Customer:</dt>
            <dd>
              {order.customerName} · {order.customerPhone}
            </dd>
          </div>
          {showCustomerAccount && (
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Account:</dt>
              <dd>{order.customer?.email ?? "Guest (no account)"}</dd>
            </div>
          )}
          {order.shippingAddress && (
            <div className="flex gap-1 sm:col-span-2">
              <dt className="text-muted-foreground">Ship to:</dt>
              <dd>{order.shippingAddress}</dd>
            </div>
          )}
        </dl>

        <div className="rounded-lg border">
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
                  <TableCell className="whitespace-normal">
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
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(order.totalAmount)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {order.receipt && (
          <div className="space-y-0.5 rounded-lg bg-muted/60 p-3 text-sm">
            <p>
              Receipt{" "}
              <span className="font-mono">{order.receipt.receiptNumber}</span> ·{" "}
              {order.receipt.paymentMethod}
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

      <CardFooter className="no-print flex-wrap items-center justify-between gap-2 border-t bg-muted/10 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/orders/${order.id}`}>Track order</Link>
        </Button>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </CardFooter>
    </Card>
  );
}
