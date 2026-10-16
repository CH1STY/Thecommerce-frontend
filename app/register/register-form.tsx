"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ErrorBanner,
  FormField,
  Loading,
  Notice,
  OtherFieldErrors,
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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { safeNext } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import {
  otpChannels,
  type OtpChannel,
  type Order,
  type Page,
  type SessionResponse,
} from "@/lib/types";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const { settings, loaded } = useSettings();
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
  const allowed = otpChannels(settings.otp.mode);
  const [picked, setPicked] = useState<OtpChannel | null>(null);
  const channel = picked && allowed.includes(picked) ? picked : allowed[0];
  const otp = useOtp();

  // Step 1: send the code (the backend also reports an email / phone that is already registered).
  async function sendCode() {
    setError(null);
    try {
      await otp.send({
        purpose: "REGISTER",
        channel,
        email: form.email,
        phone,
      });
    } catch (e) {
      setError(toApiError(e));
    }
  }

  // Step 2: create the account with the code.
  async function register() {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post<SessionResponse>("/auth/register", {
        ...form,
        shippingAddress: form.shippingAddress.trim() || undefined,
        phone,
        otp: otp.proof,
      });
      setUser(user);
      // Earlier guest / in-store orders with the verified email / phone are attached to the new account.
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.challenge) void register();
    else void sendCode();
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
            {claimedOrders === 1 ? "" : "s"} made with your verified{" "}
            {otp.challenge?.channel === "PHONE" ? "phone number" : "email address"}.
            They are now in your order history.
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
  // The code belongs to this email / phone, so they are locked until "Change".
  const locked = otp.challenge !== null;

  if (!loaded) return <Loading />;

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold">
          Create an account
        </CardTitle>
        <CardDescription>
          Track your orders and check out faster next time. We&apos;ll send you
          a one-time code to confirm your{" "}
          {allowed.length > 1
            ? "email or phone"
            : channel === "EMAIL"
              ? "email address"
              : "phone number"}
          .
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
            "channel",
            ...PHONE_ERROR_KEYS,
            ...OTP_ERROR_KEYS,
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
                disabled={locked}
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
            {locked ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  {phone.countryCode} {phone.number}
                </span>
              </div>
            ) : (
              <PhoneField value={phone} onChange={setPhone} errors={fe} required />
            )}
            {(fe.phone || fe.email) && error?.status === 409 && (
              <p className="text-sm text-muted-foreground">
                This {fe.email ? "email" : "phone"} already has an account.{" "}
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
            {otp.challenge ? (
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
                changeLabel="Change email / phone"
              />
            ) : (
              <OtpChannelPicker mode={settings.otp.mode} value={channel} onChange={setPicked} />
            )}
            <Button
              type="submit"
              disabled={busy || otp.sending}
              className="w-full"
            >
              {(busy || otp.sending) && <Spinner data-icon="inline-start" />}
              {otp.challenge
                ? busy
                  ? "Creating account…"
                  : "Verify and create account"
                : otp.sending
                  ? "Sending code…"
                  : `Send code by ${channel === "EMAIL" ? "email" : "SMS"}`}
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
