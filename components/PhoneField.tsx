"use client";

import { FormField, Select, TextInput } from "@/components/common";
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
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-2">
      <FormField label={`${label} — country`} error={countryError}>
        <Select
          value={value.countryCode}
          invalid={Boolean(countryError)}
          onChange={(e) => onChange({ ...value, countryCode: e.target.value })}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Number" error={numberError}>
        <TextInput
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="01712345678"
          required={required}
          value={value.number}
          invalid={Boolean(numberError)}
          onChange={(e) => onChange({ ...value, number: e.target.value })}
        />
      </FormField>
    </div>
  );
}

export const PHONE_ERROR_KEYS = ["phone", "phone.countryCode", "phone.number"];
