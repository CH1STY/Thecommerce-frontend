"use client";

import { useId } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { FieldErrors } from "@/lib/api-client";
import type { PhoneInput } from "@/lib/types";

const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+91", label: "India (+91)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+1", label: "USA / Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+86", label: "China (+86)" },
];

export const EMPTY_PHONE: PhoneInput = { countryCode: "+880", number: "" };

interface PhoneFieldProps {
  label?: string;
  value: PhoneInput;
  onChange: (value: PhoneInput) => void;
  errors: FieldErrors;
  /** Key prefix used by the backend for this phone object (always `phone` today). */
  name?: string;
  required?: boolean;
}

/** Country code + local number, sent separately as the backend expects (`{countryCode, number}`). */
export function PhoneField({
  label = "Phone",
  value,
  onChange,
  errors,
  name = "phone",
  required,
}: PhoneFieldProps) {
  const countryError = errors[`${name}.countryCode`];
  const numberError = errors[`${name}.number`] ?? errors[name];
  const errorMessage = countryError || numberError;
  const inputId = useId();

  return (
    <Field data-invalid={Boolean(errorMessage) || undefined} className="w-full">
      <FieldLabel htmlFor={`${inputId}-number`}>
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <div className="flex items-center gap-2 w-full">
        <div className="w-36 sm:w-44 shrink-0">
          <NativeSelect
            id={`${inputId}-country`}
            aria-label={`${label} country code`}
            value={value.countryCode}
            aria-invalid={Boolean(countryError) || undefined}
            onChange={(e) =>
              onChange({ ...value, countryCode: e.target.value })
            }
            className="w-full"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex-1 min-w-0">
          <Input
            id={`${inputId}-number`}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="01712345678"
            required={required}
            value={value.number}
            aria-invalid={Boolean(numberError) || undefined}
            aria-label={`${label} number`}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            className="w-full"
          />
        </div>
      </div>
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </Field>
  );
}

export const PHONE_ERROR_KEYS = ["phone", "phone.countryCode", "phone.number"];
