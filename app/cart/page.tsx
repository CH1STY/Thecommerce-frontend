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
  ProductImage,
  TextArea,
  TextInput,
} from "@/components/common";
import {
  OTP_ERROR_KEYS,
  OtpChannelPicker,
  OtpCodeField,
  otpError,
  useOtp,
} from "@/components/OtpField";
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
import {
  isStaff,
  otpChannels,
  type Order,
  type OtpChannel,
  type Product,
} from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const lines = useCart();
  const { user } = useSession();
  const { money, settings } = useSettings();
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

  // One-time code: always for guests, for signed-in customers when the admin turned on order OTP.
  const [guestEmail, setGuestEmail] = useState("");
  const allowedChannels = otpChannels(settings.otp.mode);
  const [pickedChannel, setPickedChannel] = useState<OtpChannel | null>(null);
  const channel =
    pickedChannel && allowedChannels.includes(pickedChannel)
      ? pickedChannel
      : allowedChannels[0];
  const otp = useOtp();
  const needsOtp = guest || settings.otp.orderRequired;
  const emailRequired = guest && settings.otp.mode === "EMAIL";

  async function sendCode() {
    setError(null);
    try {
      await otp.send(
        guest
          ? {
              purpose: "GUEST_ORDER",
              channel,
              email: guestEmail.trim() || undefined,
              phone,
            }
          : {
              purpose: "ORDER",
              channel,
              phone: needsPhone ? phone : undefined,
            },
      );
    } catch (e) {
      setError(toApiError(e));
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsOtp && !otp.challenge) {
      await sendCode();
      return;
    }
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
            email: guestEmail.trim() || undefined,
            shippingAddress: addressValue,
            otp: otp.proof,
          })
        : await api.post<Order>("/orders", {
            items,
            customerName: nameValue.trim() || undefined,
            phone: needsPhone ? phone : undefined,
            shippingAddress: addressValue.trim() || undefined,
            otp: needsOtp ? otp.proof : undefined,
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
                    "flex gap-3 py-3 sm:items-center sm:gap-4 sm:py-4",
                    lineError && "-mx-2 rounded-lg bg-destructive/5 px-2",
                  )}
                >
                  <ProductImage
                    src={line.imageUrl}
                    alt={line.name}
                    className="size-14 shrink-0 rounded-lg sm:size-16"
                  />
                  <div className="flex flex-1 min-w-0 flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 sm:block">
                        <p className="truncate text-sm font-medium leading-tight sm:text-base">{line.name}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${line.name}`}
                          onClick={() => cart.remove(line.productId)}
                          className="text-muted-foreground hover:text-destructive sm:hidden shrink-0 -mr-1"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {money(line.price)} · {line.stockQuantity} in stock
                      </p>
                      {lineError && (
                        <p className="text-xs text-destructive">{lineError}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex items-center rounded-lg border bg-background shadow-2xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Decrease quantity of ${line.name}`}
                          className="size-7 rounded-none rounded-l-lg"
                          onClick={() =>
                            cart.setQuantity(line.productId, line.quantity - 1)
                          }
                        >
                          <MinusIcon className="size-3" />
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
                          className="h-7 w-9 sm:w-11 border-0 px-1 text-center text-xs tabular-nums shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Increase quantity of ${line.name}`}
                          className="size-7 rounded-none rounded-r-lg"
                          disabled={line.quantity >= max}
                          onClick={() =>
                            cart.setQuantity(line.productId, line.quantity + 1)
                          }
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                      </div>
                      <span className="text-right text-sm font-semibold tabular-nums sm:w-24 sm:font-medium">
                        {money(line.price * line.quantity)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => cart.remove(line.productId)}
                        className="hidden sm:inline-flex text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
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
                    required, and we&apos;ll send you a one-time code to
                    confirm the order.
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
                        "email",
                        ...PHONE_ERROR_KEYS,
                        ...OTP_ERROR_KEYS,
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
                {needsPhone && !otp.challenge ? (
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
                      {needsPhone
                        ? `${phone.countryCode} ${phone.number}`
                        : user?.phone}
                    </span>
                    {!otp.challenge && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setChangePhone(true)}
                      >
                        Use another
                      </Button>
                    )}
                  </div>
                )}
                {guest && (
                  <FormField
                    label={emailRequired ? "Email" : "Email (optional)"}
                    error={fe.email}
                    hint="If you create an account with this email later, the order shows up in it."
                  >
                    <TextInput
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={guestEmail}
                      disabled={otp.challenge !== null}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </FormField>
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
                {needsOtp &&
                  (otp.challenge ? (
                    <OtpCodeField
                      challenge={otp.challenge}
                      code={otp.code}
                      onCodeChange={otp.setCode}
                      error={otpError(fe)}
                      onResend={sendCode}
                      resending={otp.sending}
                      onChange={() => {
                        otp.reset();
                        setError(null);
                      }}
                      changeLabel="Change contact details"
                    />
                  ) : (
                    <OtpChannelPicker
                      mode={settings.otp.mode}
                      value={channel}
                      onChange={setPickedChannel}
                      label="Confirm the order with a code sent by"
                    />
                  ))}
                <Button type="submit" size="lg" disabled={busy || otp.sending}>
                  {(busy || otp.sending) && <Spinner data-icon="inline-start" />}
                  {needsOtp && !otp.challenge
                    ? otp.sending
                      ? "Sending code…"
                      : `Send code by ${channel === "EMAIL" ? "email" : "SMS"}`
                    : busy
                      ? "Placing order…"
                      : `Place order · ${money(total)}`}
                </Button>
                {guest && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setGuest(false);
                      otp.reset();
                    }}
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
