"use client";

import { ShieldCheckIcon } from "lucide-react";
import { useState, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  ErrorBanner,
  FormField,
  Notice,
  PageHeader,
  Select,
} from "@/components/common";
import { RequireRole } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate, moneyFormatter } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import type { OtpMode, OtpSettings, StoreSettings } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

function currencyLabel(code: string) {
  try {
    return `${code} — ${currencyNames.of(code) ?? code}`;
  } catch {
    return code;
  }
}

/** Scrolls to a settings section; the plain hash jump gets cut short while the page is still settling. */
function jumpTo(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };
}

export default function SettingsPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <SettingsForm />
    </RequireRole>
  );
}

function SettingsForm() {
  const { settings, setSettings } = useSettings();
  const currencies = useLoad("currencies", () =>
    api.get<string[]>("/settings/currencies"),
  );
  const [currency, setCurrency] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = currency ?? settings.currency;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.put<StoreSettings>("/settings", {
        currency: selected,
      });
      setSettings(updated);
      setCurrency(null);
      toast.success(`Settings saved. Prices now show in ${updated.currency}.`);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Shop settings"
        description="Display currency and how customers verify their email or phone with one-time codes (OTP)."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href="#currency" onClick={jumpTo("currency")}>
                Currency
              </a>
            </Button>
            <Button asChild size="sm">
              <a href="#otp" onClick={jumpTo("otp")}>
                <ShieldCheckIcon data-icon="inline-start" />
                Verification codes (OTP)
              </a>
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card id="currency" className="scroll-mt-36">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">
              Currency
            </CardTitle>
            <CardDescription>
              Last changed: {formatDate(settings.updatedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner error={error ?? currencies.error} />
            <form onSubmit={submit}>
              <FieldGroup>
                <FormField
                  label="Currency"
                  error={error?.fieldErrors.currency}
                  hint={`Example: ${moneyFormatter(selected)(1234.5)}`}
                >
                  <Select
                    value={selected}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {(currencies.data ?? [settings.currency]).map((code) => (
                      <option key={code} value={code}>
                        {currencyLabel(code)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Notice tone="warning" className="mb-0">
                  Changing the currency only changes how prices are displayed.
                  Existing product prices and past orders are{" "}
                  <strong>not converted</strong> — update product prices yourself
                  if needed.
                </Notice>
                <Button
                  type="submit"
                  disabled={busy || selected === settings.currency}
                  className="self-start"
                >
                  {busy && <Spinner data-icon="inline-start" />}
                  {busy ? "Saving…" : "Save"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <OtpSettingsForm />
      </div>
    </div>
  );
}

const OTP_MODES: { value: OtpMode; label: string; description: string }[] = [
  { value: "PHONE", label: "Phone (SMS)", description: "Codes are sent to the customer's phone." },
  { value: "EMAIL", label: "Email", description: "Codes are sent to the customer's email address." },
  {
    value: "EMAIL_OR_PHONE",
    label: "Email or phone",
    description: "The customer chooses email or SMS each time.",
  },
];

function OtpSettingsForm() {
  const { settings, setSettings } = useSettings();
  const [draft, setDraft] = useState<Pick<OtpSettings, "mode" | "loginRequired" | "orderRequired"> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const current = draft ?? settings.otp;
  const changed =
    current.mode !== settings.otp.mode ||
    current.loginRequired !== settings.otp.loginRequired ||
    current.orderRequired !== settings.otp.orderRequired;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.put<StoreSettings>("/settings", {
        otp: {
          mode: current.mode,
          loginRequired: current.loginRequired,
          orderRequired: current.orderRequired,
        },
      });
      setSettings(updated);
      setDraft(null);
      toast.success("OTP settings saved.");
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const update = (patch: Partial<typeof current>) => setDraft({ ...current, ...patch });

  return (
    <Card id="otp" className="scroll-mt-36">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold">
          Verification codes (OTP)
        </CardTitle>
        <CardDescription>
          Choose how codes are sent (SMS, email, or let the customer pick) and when customers must enter one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <form onSubmit={submit}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">How codes are sent</FieldLegend>
              <div className="grid gap-2 sm:grid-cols-3">
                {OTP_MODES.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      current.mode === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="otp-mode"
                        value={option.value}
                        checked={current.mode === option.value}
                        onChange={() => update({ mode: option.value })}
                        className="accent-primary"
                      />
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </label>
                ))}
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend variant="label">When to ask for a code</FieldLegend>
              <OtpToggle
                id="otp-login"
                title="Login"
                description="After the password, every sign-in needs a code (staff too). Accounts without a phone get it by email."
                checked={current.loginRequired}
                onChange={(loginRequired) => update({ loginRequired })}
              />
              <OtpToggle
                id="otp-order"
                title="Orders by signed-in customers"
                description="Every checkout is confirmed with a code."
                checked={current.orderRequired}
                onChange={(orderRequired) => update({ orderRequired })}
              />
              <OtpToggle
                id="otp-always"
                title="Sign-up, guest checkout and forgot password"
                description="Always on: an account is only created, a guest order only placed and a password only reset with a valid code."
                checked
                disabled
              />
            </FieldSet>

            {current.mode !== "EMAIL" && (
              <Notice tone="warning" className="mb-0">
                No SMS gateway is connected yet. Until one is set up on the server, SMS codes are only
                written to the backend log, so customers can&apos;t receive them.
              </Notice>
            )}
            <Notice className="mb-0">
              Real email needs the SMTP settings (<code>SPRING_MAIL_*</code>) on the backend. Until they
              are set, emails are caught by the Mailpit test inbox on the server (port 4446) and don&apos;t
              reach customers.
            </Notice>
            <Button type="submit" disabled={busy || !changed} className="self-start">
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Saving…" : "Save OTP settings"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function OtpToggle({
  id,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{title}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </Field>
  );
}
