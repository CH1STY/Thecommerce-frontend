"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ErrorBanner, FormField, Loading, TextInput } from "@/components/common";
import {
  OtpChannelPicker,
  OtpCodeField,
  otpError,
  useOtp,
} from "@/components/OtpField";
import { EMPTY_PHONE, PhoneField } from "@/components/PhoneField";
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
import { useSettings } from "@/lib/settings";
import { otpChannels, type OtpChannel } from "@/lib/types";

export function ForgotPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { settings, loaded } = useSettings();
  const mode = settings.otp.mode;
  const [picked, setPicked] = useState<OtpChannel | null>(null);
  const allowed = otpChannels(mode);
  const channel = picked && allowed.includes(picked) ? picked : allowed[0];
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const otp = useOtp();

  async function sendCode() {
    setError(null);
    try {
      await otp.send({
        purpose: "PASSWORD_RESET",
        channel,
        email: channel === "EMAIL" ? email : undefined,
        phone: channel === "PHONE" ? phone : undefined,
      });
    } catch (e) {
      setError(toApiError(e));
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/password-reset", { otp: otp.proof, newPassword });
      toast.success("Password changed. Sign in with your new password.");
      router.push(next ? `/login?next=${encodeURIComponent(safeNext(next))}` : "/login");
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.challenge) void reset();
    else void sendCode();
  }

  const fe = error?.fieldErrors ?? {};

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold">
          Reset your password
        </CardTitle>
        <CardDescription>
          {otp.challenge
            ? "If an account uses this address, a code is on its way. Enter it with your new password."
            : `We'll send a one-time code to the ${channel === "EMAIL" ? "email address" : "phone number"} of your account.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <Loading />
        ) : (
          <>
            <ErrorBanner error={error} />
            <form onSubmit={submit} noValidate>
              <FieldGroup>
                {otp.challenge ? (
                  <>
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
                    />
                    <FormField
                      label="New password"
                      error={fe.newPassword}
                      hint="8–72 characters"
                    >
                      <TextInput
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </FormField>
                    <Button type="submit" disabled={busy} className="w-full">
                      {busy && <Spinner data-icon="inline-start" />}
                      {busy ? "Saving…" : "Set new password"}
                    </Button>
                  </>
                ) : (
                  <>
                    <OtpChannelPicker
                      mode={mode}
                      value={channel}
                      onChange={setPicked}
                      label="Send the code by"
                    />
                    {channel === "EMAIL" ? (
                      <FormField label="Email" error={fe.email}>
                        <TextInput
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </FormField>
                    ) : (
                      <PhoneField value={phone} onChange={setPhone} errors={fe} required />
                    )}
                    <Button type="submit" disabled={otp.sending} className="w-full">
                      {otp.sending && <Spinner data-icon="inline-start" />}
                      {otp.sending ? "Sending…" : "Send code"}
                    </Button>
                  </>
                )}
              </FieldGroup>
            </form>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground">
        Remembered it?&nbsp;
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
