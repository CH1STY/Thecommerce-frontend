const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** `currency` is the shop's ISO 4217 code from `GET /settings` (admin-configurable). */
export function moneyFormatter(currency: string) {
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat("en-US", { style: "currency", currency });
  } catch {
    format = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return (value: number | null | undefined) => format.format(value ?? 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTime.format(date);
}

/** "IN_STORE_SALE" → "In store sale" */
export function humanize(value: string) {
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Jane van Doe" → "JD" (avatar fallback). */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/** Only same-site relative paths are allowed as post-login redirects. */
export function safeNext(value: string | null | undefined, fallback = "/") {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : fallback;
}

/**
 * Links and images set in the storefront designer: a site path (`/search?q=…`) or an absolute http(s) URL.
 * Anything else (`javascript:`, `//host`, …) gives `undefined`. Mirrors the backend's check.
 */
export function safeLink(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return undefined;
  if (/\s/.test(text) || text.includes("\\")) return undefined;
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  return /^https?:\/\/[^\s<>"]+$/i.test(text) ? text : undefined;
}
