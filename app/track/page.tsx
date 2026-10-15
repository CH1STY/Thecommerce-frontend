"use client";

import { PackageSearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanId = orderId.trim().replace(/^#/, "");
    if (!cleanId) return;
    router.push(`/orders/${cleanId}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <PageHeader
        title="Track your order"
        description="Enter your order number to check current order status and delivery updates."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearchIcon className="size-5 text-muted-foreground" />
            Order Lookup
          </CardTitle>
          <CardDescription>
            You can find your order number in your confirmation or SMS message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="order-id">Order Number</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="order-id"
                  name="orderId"
                  placeholder="e.g. 12"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" disabled={!orderId.trim()}>
                  Track
                </Button>
              </div>
            </Field>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
