"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorBanner, FormField, TextInput } from "@/components/common";
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
import { isStaff, type SessionResponse } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post<SessionResponse>("/auth/login", {
        email,
        password,
      });
      setUser(user);
      router.push(safeNext(next, isStaff(user) ? "/admin" : "/"));
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold">
          Sign in
        </CardTitle>
        <CardDescription>
          Welcome back. Enter your email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error} />
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField label="Email" error={error?.fieldErrors.email}>
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Password" error={error?.fieldErrors.password}>
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
