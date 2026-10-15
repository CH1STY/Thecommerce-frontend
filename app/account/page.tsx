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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

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
            {changePhone ? (
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
                  {user?.phone ?? "not set"}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setChangePhone(true)}
                >
                  {user?.phone ? "Change" : "Add"}
                </Button>
              </div>
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
