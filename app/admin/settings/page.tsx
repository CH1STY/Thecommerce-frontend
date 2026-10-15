"use client";

import { useState, type FormEvent } from "react";
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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate, moneyFormatter } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import type { StoreSettings } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

function currencyLabel(code: string) {
  try {
    return `${code} — ${currencyNames.of(code) ?? code}`;
  } catch {
    return code;
  }
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
      <PageHeader title="Shop settings" />
      <Card className="max-w-xl">
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
    </div>
  );
}
