import axios, { AxiosError, type AxiosRequestConfig } from "axios";

/**
 * The ONLY module in the frontend that performs HTTP calls (axios).
 *
 * All requests go to the Next.js BFF at `/api/**` (same origin). The BFF forwards them to the
 * Spring Boot backend server-side, so the backend is never exposed to the browser.
 *
 * Every failure is normalised into an `ApiError`, whatever produced it:
 *   - Spring Boot RFC 9457 problem details  {type,title,status,detail,instance,errors}
 *   - Spring Boot legacy error bodies       {timestamp,status,error,message,path}
 *   - BFF problem details (502 / 504)       same shape as Spring
 *   - Next.js / proxy plain-text or HTML error pages
 *   - Timeouts, network failures, cancelled requests
 */

export type FieldErrors = Record<string, string>;

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: FieldErrors;
  [extension: string]: unknown;
}

export type ApiErrorKind = "http" | "network" | "timeout" | "cancelled";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status code, or 0 when no response was received. */
  readonly status: number;
  readonly title: string;
  readonly fieldErrors: FieldErrors;
  readonly problem?: ProblemDetail;

  constructor(init: {
    kind: ApiErrorKind;
    status: number;
    title: string;
    message: string;
    fieldErrors?: FieldErrors;
    problem?: ProblemDetail;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.title = init.title;
    this.fieldErrors = init.fieldErrors ?? {};
    this.problem = init.problem;
  }

  get isValidationError() {
    return this.status === 400 && Object.keys(this.fieldErrors).length > 0;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
  get isServerError() {
    return this.status >= 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "The request was invalid.",
  401: "You need to sign in to continue.",
  403: "You don't have permission to do that.",
  404: "The requested resource was not found.",
  409: "The request conflicts with the current state.",
  413: "The request is too large.",
  422: "The request could not be processed.",
  429: "Too many requests. Please try again shortly.",
  500: "Something went wrong on our side.",
  502: "The service is temporarily unavailable.",
  503: "The service is temporarily unavailable.",
  504: "The service took too long to respond.",
};

function defaultMessage(status: number) {
  return DEFAULT_MESSAGES[status] ?? (status >= 500 ? DEFAULT_MESSAGES[500] : DEFAULT_MESSAGES[400]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function toFieldErrors(value: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (isRecord(value)) {
    for (const [field, message] of Object.entries(value)) {
      const text = Array.isArray(message) ? message.filter((m) => typeof m === "string").join("; ") : asString(message);
      if (text) result[field] = text;
    }
  } else if (Array.isArray(value)) {
    // Spring's legacy `errors: [{field, defaultMessage}]` binding-result format.
    for (const item of value) {
      if (isRecord(item)) {
        const field = asString(item.field) ?? asString(item.objectName);
        const message = asString(item.defaultMessage) ?? asString(item.message);
        if (field && message) result[field] = result[field] ? `${result[field]}; ${message}` : message;
      }
    }
  }
  return result;
}

function parseBody(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function fromResponse(status: number, statusText: string, rawData: unknown, cause: unknown): ApiError {
  const data = parseBody(rawData);

  if (isRecord(data)) {
    const problem = data as ProblemDetail;
    const springError = asString(data.error);
    const title = asString(problem.title) ?? springError ?? (asString(statusText) || `HTTP ${status}`);
    const message =
      asString(problem.detail) ?? asString(data.message) ?? asString(problem.title) ?? springError ?? defaultMessage(status);
    return new ApiError({
      kind: "http",
      status,
      title,
      message,
      fieldErrors: toFieldErrors(problem.errors),
      problem,
      cause,
    });
  }

  const text = asString(data);
  const looksLikeHtml = text !== undefined && /^\s*</.test(text);
  return new ApiError({
    kind: "http",
    status,
    title: asString(statusText) ?? `HTTP ${status}`,
    message: text && !looksLikeHtml && text.length <= 300 ? text : defaultMessage(status),
    cause,
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ kind: "cancelled", status: 0, title: "Cancelled", message: "The request was cancelled.", cause: error });
  }

  if (error instanceof AxiosError) {
    if (error.response) {
      return fromResponse(error.response.status, error.response.statusText, error.response.data, error);
    }
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ kind: "timeout", status: 0, title: "Timeout", message: "The request timed out. Please try again.", cause: error });
    }
    return new ApiError({
      kind: "network",
      status: 0,
      title: "Network error",
      message: "Could not reach the server. Check your connection and try again.",
      cause: error,
    });
  }

  return new ApiError({
    kind: "network",
    status: 0,
    title: "Unexpected error",
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
    cause: error,
  });
}

const http = axios.create({
  baseURL: "/api",
  timeout: 20_000,
  headers: { Accept: "application/json, application/problem+json" },
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => http.get<T>(url, config).then((r) => r.data),
  post: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    http.post<T>(url, body, config).then((r) => r.data),
  put: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    http.put<T>(url, body, config).then((r) => r.data),
  patch: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    http.patch<T>(url, body, config).then((r) => r.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => http.delete<T>(url, config).then((r) => r.data),
};
