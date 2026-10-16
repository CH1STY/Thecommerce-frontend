"use client";

import { MailIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FormField, Notice, TextInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api-client";
import {
  otpChannels,
  type OtpChallenge,
  type OtpChannel,
  type OtpMode,
  type OtpProof,
  type OtpPurpose,
  type PhoneInput,
} from "@/lib/types";

export const OTP_CHANNEL_LABEL: Record<OtpChannel, string> = {
  EMAIL: "Email",
  PHONE: "SMS",
};

/** Field-error keys the backend uses for a wrong / expired code. */
export const OTP_ERROR_KEYS = ["otp", "otp.code", "otp.challengeId", "code", "challengeId"];

export function otpError(errors: Record<string, string>) {
  return OTP_ERROR_KEYS.map((key) => errors[key]).find(Boolean);
}

export interface SendOtpBody {
  purpose: Exclude<OtpPurpose, "LOGIN">;
  channel: OtpChannel;
  email?: string;
  phone?: PhoneInput;
}

/** Holds the current code challenge and what the user typed. Sending errors are thrown to the caller. */
export function useOtp() {
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);

  async function send(body: SendOtpBody) {
    setSending(true);
    try {
      const sent = await api.post<OtpChallenge>("/otp/send", body);
      setChallenge(sent);
      setCode("");
      return sent;
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setChallenge(null);
    setCode("");
  }

  const proof: OtpProof | undefined = challenge
    ? { challengeId: challenge.challengeId, code: code.trim() }
    : undefined;

  return { challenge, setChallenge, code, setCode, sending, send, reset, proof };
}

/** Email / SMS choice; renders nothing when the shop allows only one channel. */
export function OtpChannelPicker({
  mode,
  value,
  onChange,
  disabled,
  label = "Send the verification code by",
}: {
  mode: OtpMode;
  value: OtpChannel;
  onChange: (channel: OtpChannel) => void;
  disabled?: boolean;
  label?: string;
}) {
  const channels = otpChannels(mode);
  if (channels.length < 2) return null;
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={value}
        disabled={disabled}
        onValueChange={(next) => next && onChange(next as OtpChannel)}
      >
        {channels.map((channel) => (
          <ToggleGroupItem key={channel} value={channel} className="px-4">
            {channel === "EMAIL" ? <MailIcon /> : <MessageSquareIcon />}
            {OTP_CHANNEL_LABEL[channel]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

/** Seconds until [isoTime], ticking every second (0 once passed). Never reads the clock during render. */
function useSecondsUntil(isoTime: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!isoTime) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isoTime]);
  if (!isoTime || now === null) return null;
  return Math.max(0, Math.ceil((new Date(isoTime).getTime() - now) / 1000));
}

/** "We sent a code to …" + the code input + resend (after the cooldown) + optional "change". */
export function OtpCodeField({
  challenge,
  code,
  onCodeChange,
  error,
  onResend,
  resending,
  onChange,
  changeLabel = "Change",
  autoFocus = true,
}: {
  challenge: OtpChallenge;
  code: string;
  onCodeChange: (code: string) => void;
  error?: string;
  onResend?: () => void;
  resending?: boolean;
  /** e.g. go back and edit the email / phone. */
  onChange?: () => void;
  changeLabel?: string;
  autoFocus?: boolean;
}) {
  const wait = useSecondsUntil(challenge.resendAvailableAt);
  const via = challenge.channel === "EMAIL" ? "by email" : "by SMS";
  return (
    <div className="flex flex-col gap-3">
      <Notice className="mb-0">
        We sent a {challenge.codeLength}-digit code {via} to{" "}
        <strong className="whitespace-nowrap">{challenge.destination}</strong>.
        {challenge.channel === "EMAIL" && " Check your spam folder if it doesn't arrive."}
      </Notice>
      <FormField label="Verification code" error={error}>
        <TextInput
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={challenge.codeLength}
          placeholder={"•".repeat(challenge.codeLength)}
          className="font-mono text-lg tracking-[0.4em]"
          value={code}
          autoFocus={autoFocus}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {onResend && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            disabled={resending || wait === null || wait > 0}
            onClick={onResend}
          >
            {resending && <Spinner data-icon="inline-start" />}
            {wait && wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </Button>
        )}
        {onChange && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-muted-foreground"
            onClick={onChange}
          >
            {changeLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
