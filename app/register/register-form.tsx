"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ErrorBanner,
  FormField,
  Notice,
  OtherFieldErrors,
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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { safeNext } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Order, Page, SessionResponse } from "@/lib/types";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    shippingAddress: "",
  });
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [claimedOrders, setClaimedOrders] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post<SessionResponse>("/auth/register", {
        ...form,
        shippingAddress: form.shippingAddress.trim() || undefined,
        phone,
      });
      setUser(user);
      // Earlier guest / in-store orders with this phone are attached to the new account.
      const earlier = await api
        .get<Page<Order>>("/orders/me", { params: { size: 1 } })
        .catch(() => null);
      if (earlier && earlier.totalElements > 0)
        setClaimedOrders(earlier.totalElements);
      else router.push(next);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (claimedOrders !== null) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">
            Welcome!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Notice tone="success" className="mb-0">
            We found {claimedOrders} earlier order
            {claimedOrders === 1 ? "" : "s"} made with your phone number. They
            are now in your order history.
          </Notice>
        </CardContent>
        <CardFooter className="gap-2">
          <Button asChild>
            <Link href="/account/orders">View my orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={next}>Continue</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const fe = error?.fieldErrors ?? {};
  const set = (key: keyof typeof form) => (value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold">
          Create an account
        </CardTitle>
        <CardDescription>
          Track your orders and check out faster next time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <OtherFieldErrors
          errors={fe}
          shown={[
            "email",
            "password",
            "fullName",
            "shippingAddress",
            ...PHONE_ERROR_KEYS,
          ]}
        />
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField label="Full name" error={fe.fullName}>
              <TextInput
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => set("fullName")(e.target.value)}
              />
            </FormField>
            <FormField label="Email" error={fe.email}>
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
              />
            </FormField>
            <FormField
              label="Password"
              error={fe.password}
              hint="8–72 characters"
            >
              <TextInput
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
              />
            </FormField>
            <PhoneField value={phone} onChange={setPhone} errors={fe} required />
            {fe.phone && error?.status === 409 && (
              <p className="text-sm text-muted-foreground">
                This phone already has an account.{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Sign in instead
                </Link>
              </p>
            )}
            <FormField
              label="Shipping address (optional)"
              error={fe.shippingAddress}
            >
              <TextArea
                rows={2}
                value={form.shippingAddress}
                onChange={(e) => set("shippingAddress")(e.target.value)}
                autoComplete="street-address"
              />
            </FormField>
            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Creating account…" : "Register"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground">
        Already registered?&nbsp;
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
