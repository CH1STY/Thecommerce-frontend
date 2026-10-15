import { connection, NextResponse, type NextRequest } from "next/server";

/**
 * Backend-For-Frontend proxy.
 *
 * The browser only ever talks to this Next.js server at `/api/**`. This handler forwards the call
 * server-side to the Spring Boot backend over the private Docker network (`thecommerce-net`);
 * browser code never calls the backend directly.
 *
 *   browser ──> https://<frontend>/api/products/1 ──> (BFF) ──> http://thecommerce-backend:8080/api/products/1
 *
 * Auth: `/api/auth/login` and `/api/auth/register` return a JWT from the backend. The BFF moves it into
 * an httpOnly cookie (never visible to browser JS) and attaches it as `Authorization: Bearer` on every
 * later call. `POST /api/auth/logout` is answered here by clearing the cookie.
 *
 * Backend responses (including Spring's RFC 9457 `application/problem+json` errors) are passed
 * through unchanged. When the backend can't be reached, the BFF answers with its own problem
 * details (502/504) in the same shape, so the client handles every error the same way.
 */

const UPSTREAM_TIMEOUT_MS = 15_000;
const SESSION_COOKIE = "tc_session";
const TOKEN_ISSUING_PATHS = new Set(["auth/login", "auth/register"]);
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// `authorization` and `cookie` are deliberately not forwarded: the backend only trusts the token the BFF attaches.
const REQUEST_HEADERS_TO_FORWARD = [
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "x-request-id",
];

const RESPONSE_HEADERS_TO_RETURN = [
  "cache-control",
  "content-disposition",
  "content-language",
  "content-type",
  "etag",
  "last-modified",
  "x-request-id",
];

function problem(status: number, title: string, detail: string, instance: string) {
  return NextResponse.json(
    { type: "about:blank", title, status, detail, instance },
    { status, headers: { "content-type": "application/problem+json" } },
  );
}

function isHttps(request: NextRequest) {
  return request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
}

/** CSRF guard for cookie-authenticated writes: browsers always send `Origin` on cross-site unsafe requests. */
function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function setSessionCookie(request: NextRequest, response: NextResponse, token: string, expiresAt: string) {
  const expires = new Date(expiresAt);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

async function forward(request: NextRequest, ctx: RouteContext<"/api/[...slug]">) {
  // Opt into request-time execution so BACKEND_URL is read at runtime, never baked in at build.
  await connection();

  const instance = request.nextUrl.pathname;
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    console.error("[bff] BACKEND_URL is not set");
    return problem(500, "Internal Server Error", "The API gateway is not configured.", instance);
  }

  const { slug } = await ctx.params;
  if (slug.some((segment) => segment === "." || segment === ".." || segment.trim() === "")) {
    return problem(400, "Bad Request", "Invalid API path.", instance);
  }
  const path = slug.join("/");

  if (UNSAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return problem(403, "Forbidden", "Cross-site requests are not allowed.", instance);
  }

  if (path === "auth/logout") {
    if (request.method !== "POST") {
      return problem(405, "Method Not Allowed", "Use POST to sign out.", instance);
    }
    const response = new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  }

  const target = new URL(
    `/api/${slug.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
    backendUrl,
  );

  const headers = new Headers();
  for (const name of REQUEST_HEADERS_TO_FORWARD) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error(`[bff] ${request.method} ${target.pathname} failed:`, error);
    return timedOut
      ? problem(504, "Gateway Timeout", "The backend service did not respond in time.", instance)
      : problem(502, "Bad Gateway", "The backend service is unavailable.", instance);
  }

  // Swap the token for the httpOnly cookie so browser JS never sees it.
  if (TOKEN_ISSUING_PATHS.has(path) && request.method === "POST" && upstream.ok) {
    let session: { accessToken?: unknown; expiresAt?: unknown; user?: unknown };
    try {
      session = await upstream.json();
    } catch {
      session = {};
    }
    if (typeof session.accessToken !== "string") {
      console.error(`[bff] ${target.pathname} returned no access token`);
      return problem(502, "Bad Gateway", "The backend returned an invalid sign-in response.", instance);
    }
    const response = NextResponse.json(
      { user: session.user, expiresAt: session.expiresAt },
      { status: upstream.status, headers: { "cache-control": "no-store" } },
    );
    setSessionCookie(request, response, session.accessToken, String(session.expiresAt));
    return response;
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS_TO_RETURN) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
  // Expired/revoked token (or disabled account): drop the stale cookie so the client is cleanly signed out.
  if (upstream.status === 401 && sessionToken) clearSessionCookie(response);
  return response;
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
