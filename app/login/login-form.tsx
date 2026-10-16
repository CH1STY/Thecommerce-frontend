"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorBanner, FormField, TextInput } from "@/components/common";
import {
  OTP_CHANNEL_LABEL,
  OtpCodeField,
  otpError,
  useSecondsUntil,
} from "@/components/OtpField";
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
import {
  isStaff,
  type LoginResult,
  type OtpChallenge,
  type OtpChannel,
  type SessionResponse,
  type User,
} from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  // Second step (login OTP turned on by the admin).
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [channels, setChannels] = useState<OtpChannel[]>([]);
  const [code, setCode] = useState("");
  // The backend allows one code per account every few seconds, whichever channel it goes to.
  const wait = useSecondsUntil(challenge?.resendAvailableAt);
  const canResend = wait !== null && wait <= 0;

  function signedIn(user: User) {
    setUser(user);
    router.push(safeNext(next, isStaff(user) ? "/admin" : "/"));
  }

  /** Password step; also used to resend or switch the channel of the login code. */
  async function login(otpChannel?: OtpChannel) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<LoginResult>("/auth/login", {
        email,
        password,
        otpChannel,
      });
      if (result.otpRequired) {
        setChallenge(result.otp);
        setChannels(result.otpChannels);
        setCode("");
      } else {
        signedIn(result.user);
      }
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post<SessionResponse>("/auth/login/otp", {
        challengeId: challenge.challengeId,
        code: code.trim(),
      });
      signedIn(user);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challenge) void verify();
    else void login();
  }

  const fe = error?.fieldErrors ?? {};
  const forgotHref = next
    ? `/forgot-password?next=${encodeURIComponent(next)}`
    : "/forgot-password";

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold">
          {challenge ? "Enter your code" : "Sign in"}
        </CardTitle>
        <CardDescription>
          {challenge
            ? "This shop confirms every sign-in with a one-time code."
            : "Welcome back. Enter your email and password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            {challenge ? (
              <>
                <OtpCodeField
                  challenge={challenge}
                  code={code}
                  onCodeChange={setCode}
                  error={otpError(fe)}
                  onResend={() => login(challenge.channel)}
                  resending={busy}
                  onChange={() => {
                    setChallenge(null);
                    setError(null);
                  }}
                  changeLabel="Use another account"
                />
                {channels
                  .filter((channel) => channel !== challenge.channel)
                  .map((channel) => (
                    <Button
                      key={channel}
                      type="button"
                      variant="outline"
                      disabled={busy || !canResend}
                      onClick={() => login(channel)}
                    >
                      Send the code by {OTP_CHANNEL_LABEL[channel]} instead
                      {!canResend && wait ? ` (in ${wait}s)` : ""}
                    </Button>
                  ))}
                <Button
                  type="submit"
                  disabled={busy || code.length < challenge.codeLength}
                  className="w-full"
                >
                  {busy && <Spinner data-icon="inline-start" />}
                  {busy ? "Checking…" : "Verify and sign in"}
                </Button>
              </>
            ) : (
              <>
                <FormField label="Email" error={fe.email}>
                  <TextInput
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  label="Password"
                  error={fe.password}
                  hint={
                    <Link
                      href={forgotHref}
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  }
                >
                  <TextInput
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FormField>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Spinner data-icon="inline-start" />}
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </>
            )}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground">
        No account?&nbsp;
        <Link
          href={
            next ? `/register?next=${encodeURIComponent(next)}` : "/register"
          }
          className="font-medium text-foreground underline underline-offset-4"
        >
          Register
        </Link>
      </CardFooter>
    </Card>
  );
}
