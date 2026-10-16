"use client";

import { PackageIcon } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ErrorBanner,
  FormField,
  OtherFieldErrors,
  PageHeader,
  TextArea,
  TextInput,
} from "@/components/common";
import { OtpCodeField, otpError, useOtp } from "@/components/OtpField";
import {
  EMPTY_PHONE,
  PHONE_ERROR_KEYS,
  PhoneField,
} from "@/components/PhoneField";
import { RequireRole } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { otpChannels, type OtpChannel, type User } from "@/lib/types";

export default function AccountPage() {
  return (
    <RequireRole roles={["ADMIN", "MANAGER", "CUSTOMER"]}>
      <AccountHeader />
      <div className="grid items-start gap-6 md:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </RequireRole>
  );
}

function AccountHeader() {
  const { user } = useSession();
  return (
    <PageHeader
      title="My account"
      description={
        <span className="flex flex-wrap items-center gap-2">
          {user?.email}
          {user && <Badge variant="secondary">{humanize(user.role)}</Badge>}
        </span>
      }
      actions={
        user?.role === "CUSTOMER" && (
          <Button asChild variant="outline">
            <Link href="/account/orders">
              <PackageIcon data-icon="inline-start" />
              My orders
            </Link>
          </Button>
        )
      }
    />
  );
}

function ProfileForm() {
  const { user, setUser } = useSession();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [address, setAddress] = useState(user?.shippingAddress ?? "");
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [changePhone, setChangePhone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patch<User>("/auth/me", {
        fullName,
        shippingAddress: address,
        phone: changePhone ? phone : undefined,
      });
      setUser(updated);
      setChangePhone(false);
      setPhone(EMPTY_PHONE);
      toast.success("Profile saved.");
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold">
          Profile
        </CardTitle>
        <CardDescription>
          Used to prefill checkout and shown on your orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <OtherFieldErrors
          errors={fe}
          shown={["fullName", "shippingAddress", ...PHONE_ERROR_KEYS]}
        />
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField label="Full name" error={fe.fullName}>
              <TextInput
                value={fullName}
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
              />
            </FormField>
            {user && (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{user.email}</span>
                  <VerifiedBadge verified={user.emailVerified} />
                </span>
                {!user.emailVerified && <VerifyContactButton channel="EMAIL" />}
              </div>
            )}
            {changePhone ? (
              <PhoneField
                value={phone}
                onChange={setPhone}
                errors={fe}
                required
              />
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  {user?.phone ?? "not set"}
                  {user?.phone && <VerifiedBadge verified={user.phoneVerified} />}
                </span>
                <span className="flex items-center">
                  {user?.phone && !user.phoneVerified && (
                    <VerifyContactButton channel="PHONE" />
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setChangePhone(true)}
                  >
                    {user?.phone ? "Change" : "Add"}
                  </Button>
                </span>
              </div>
            )}
            {changePhone && (
              <p className="text-xs text-muted-foreground">
                A new number has to be verified with a code before earlier
                orders made with it are added to your account.
              </p>
            )}
            <FormField
              label="Shipping address"
              error={fe.shippingAddress}
              hint="Leave empty to clear it."
            >
              <TextArea
                rows={3}
                value={address}
                autoComplete="street-address"
                onChange={(e) => setAddress(e.target.value)}
              />
            </FormField>
            <Button type="submit" disabled={busy} className="self-start">
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="secondary">Verified</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Not verified
    </Badge>
  );
}

/** Sends a VERIFY_CONTACT code to the user's own email / phone; shown only when the shop's OTP mode allows it. */
function VerifyContactButton({ channel }: { channel: OtpChannel }) {
  const { setUser } = useSession();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const otp = useOtp();
  const label = channel === "EMAIL" ? "Email" : "Phone";

  if (!otpChannels(settings.otp.mode).includes(channel)) return null;

  async function sendCode() {
    setError(null);
    try {
      await otp.send({ purpose: "VERIFY_CONTACT", channel });
    } catch (e) {
      setError(toApiError(e));
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ user: User; claimedOrders: number }>(
        "/auth/me/verify",
        otp.proof,
      );
      setUser(result.user);
      toast.success(
        result.claimedOrders > 0
          ? `${label} verified. ${result.claimedOrders} earlier order${result.claimedOrders === 1 ? " was" : "s were"} added to your account.`
          : `${label} verified.`,
      );
      setOpen(false);
      otp.reset();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => {
          setOpen(true);
          if (!otp.challenge) void sendCode();
        }}
      >
        Verify
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={verify} noValidate>
            <DialogHeader>
              <DialogTitle>Verify your {label.toLowerCase()}</DialogTitle>
              <DialogDescription>
                Earlier guest orders made with it will be added to your account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {error && !otpError(error.fieldErrors) && <ErrorBanner error={error} />}
              {otp.challenge ? (
                <OtpCodeField
                  challenge={otp.challenge}
                  code={otp.code}
                  onCodeChange={otp.setCode}
                  error={error ? otpError(error.fieldErrors) : undefined}
                  onResend={sendCode}
                  resending={otp.sending}
                />
              ) : (
                otp.sending && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner /> Sending code…
                  </p>
                )
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={busy || !otp.challenge || otp.code.length < otp.challenge.codeLength}
              >
                {busy && <Spinner data-icon="inline-start" />}
                Verify
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put("/auth/me/password", { currentPassword, newPassword });
      setCurrent("");
      setNew("");
      toast.success("Password changed.");
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold">
          Change password
        </CardTitle>
        <CardDescription>
          You stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField label="Current password" error={fe.currentPassword}>
              <TextInput
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </FormField>
            <FormField
              label="New password"
              error={fe.newPassword}
              hint="8–72 characters"
            >
              <TextInput
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
              />
            </FormField>
            <Button type="submit" disabled={busy} className="self-start">
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Saving…" : "Change password"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
