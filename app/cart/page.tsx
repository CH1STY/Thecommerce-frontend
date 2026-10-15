"use client";

import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  Notice,
  OtherFieldErrors,
  PageHeader,
  ProductImage,
  TextArea,
  TextInput,
} from "@/components/common";
import {
  EMPTY_PHONE,
  PHONE_ERROR_KEYS,
  PhoneField,
} from "@/components/PhoneField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { MAX_CART_QUANTITY, cart, useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { isStaff, type Order, type Product } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const lines = useCart();
  const { user } = useSession();
  const { money } = useSettings();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [guest, setGuest] = useState(false);

  const products = useLoad("cart-products", () =>
    api.get<Product[]>("/products").then((list) => {
      cart.sync(list);
      return list;
    }),
  );
  const known = new Set(products.data?.map((p) => p.id));
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const stockErrors = error?.status === 409 ? error.fieldErrors : {};
  const fe = error && error.status !== 409 ? error.fieldErrors : {};

  // Prefilled from the profile; empty fields fall back to the profile on the server.
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [changePhone, setChangePhone] = useState(false);

  const nameValue = name ?? user?.fullName ?? "";
  const addressValue = address ?? user?.shippingAddress ?? "";
  const needsPhone = guest || !user?.phone || changePhone;

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const items = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));
    try {
      const order = guest
        ? await api.post<Order>("/orders/guest", {
            items,
            customerName: nameValue,
            phone,
            shippingAddress: addressValue,
          })
        : await api.post<Order>("/orders", {
            items,
            customerName: nameValue.trim() || undefined,
            phone: needsPhone ? phone : undefined,
            shippingAddress: addressValue.trim() || undefined,
          });
      cart.clear();
      router.push(`/orders/${order.id}`);
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      if (apiError.status === 409) products.reload();
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCartIcon}
        title="Your cart is empty"
        description="Browse the shop and add something you like."
        className="mx-auto max-w-lg"
      >
        <Button asChild>
          <Link href="/">Browse products</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">
            Cart
          </CardTitle>
          <CardDescription>
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockErrors && Object.keys(stockErrors).length > 0 && (
            <Notice tone="warning">
              {error?.message} Adjust the highlighted items and try again.
            </Notice>
          )}
          <ul className="divide-y">
            {lines.map((line) => {
              const gone =
                products.data !== undefined && !known.has(line.productId);
              const lineError =
                stockErrors[String(line.productId)] ??
                (gone ? "This product is no longer available." : undefined);
              const max = Math.min(line.stockQuantity, MAX_CART_QUANTITY);
              return (
                <li
                  key={line.productId}
                  className={cn(
                    "flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap",
                    lineError && "-mx-2 rounded-lg bg-destructive/5 px-2",
                  )}
                >
                  <ProductImage
                    src={line.imageUrl}
                    alt={line.name}
                    className="size-16 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {money(line.price)} · {line.stockQuantity} in stock
                    </p>
                    {lineError && (
                      <p className="text-xs text-destructive">{lineError}</p>
                    )}
                  </div>
                  <div className="flex items-center rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Decrease quantity of ${line.name}`}
                      onClick={() =>
                        cart.setQuantity(line.productId, line.quantity - 1)
                      }
                    >
                      <MinusIcon />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={max}
                      value={line.quantity}
                      onChange={(e) =>
                        cart.setQuantity(line.productId, Number(e.target.value))
                      }
                      aria-label={`Quantity of ${line.name}`}
                      className="h-7 w-12 border-0 px-1 text-center tabular-nums shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Increase quantity of ${line.name}`}
                      disabled={line.quantity >= max}
                      onClick={() =>
                        cart.setQuantity(line.productId, line.quantity + 1)
                      }
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  <span className="w-24 text-right font-medium tabular-nums">
                    {money(line.price * line.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => cart.remove(line.productId)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
        <CardFooter className="flex-col items-end gap-1">
          <p className="font-heading text-lg font-semibold tabular-nums">
            Total: {money(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Final prices and stock are confirmed when you place the order.
          </p>
        </CardFooter>
      </Card>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">
            Checkout
          </CardTitle>
          <CardDescription>
            {money(total)} · {itemCount} item{itemCount === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user === undefined ? (
            <Loading />
          ) : isStaff(user) ? (
            <p className="text-sm text-muted-foreground">
              Staff accounts can&apos;t place online orders. Use the{" "}
              <Link
                href="/admin/pos"
                className="text-foreground underline underline-offset-4"
              >
                point of sale
              </Link>{" "}
              for walk-in customers.
            </p>
          ) : user === null && !guest ? (
            <FieldGroup className="gap-3">
              <Button asChild>
                <Link href="/login?next=/cart">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register?next=/cart">Create an account</Link>
              </Button>
              <FieldSeparator>or</FieldSeparator>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGuest(true)}
              >
                Continue as guest
              </Button>
            </FieldGroup>
          ) : (
            <form onSubmit={placeOrder} noValidate>
              <FieldGroup>
                {guest && (
                  <Notice className="mb-0">
                    Checking out as a guest. Name, phone and address are
                    required.
                  </Notice>
                )}
                {error && error.status !== 409 && (
                  <div>
                    <ErrorBanner error={error} />
                    <OtherFieldErrors
                      errors={fe}
                      shown={[
                        "customerName",
                        "shippingAddress",
                        ...PHONE_ERROR_KEYS,
                      ]}
                    />
                  </div>
                )}
                <FormField label="Name" error={fe.customerName}>
                  <TextInput
                    value={nameValue}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </FormField>
                {needsPhone ? (
                  <PhoneField
                    value={phone}
                    onChange={setPhone}
                    errors={fe}
                    required
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {user?.phone}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setChangePhone(true)}
                    >
                      Use another
                    </Button>
                  </div>
                )}
                <FormField label="Shipping address" error={fe.shippingAddress}>
                  <TextArea
                    rows={3}
                    value={addressValue}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                </FormField>
                <Separator />
                <Button type="submit" size="lg" disabled={busy}>
                  {busy && <Spinner data-icon="inline-start" />}
                  {busy ? "Placing order…" : `Place order · ${money(total)}`}
                </Button>
                {guest && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setGuest(false)}
                  >
                    Sign in instead
                  </Button>
                )}
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
