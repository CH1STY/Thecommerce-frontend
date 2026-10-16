# Frontend dev guide — backend API (inventory, POS, guest checkout, categories)

> Audience: whoever builds the TheCommerce frontend pages.
> Backend state: Spring Boot API at schema **v7** (2026-10-15). Source of truth for shapes: Swagger UI
> <http://localhost:4444/swagger-ui.html> (OpenAPI JSON: `/v3/api-docs`). This guide explains **how to use** the API
> from the frontend; if it ever disagrees with Swagger, Swagger wins — please fix this file.

---

## 0. Ground rules (unchanged, but read them)

1. **Only `lib/api-client.ts` talks HTTP.** Use `api.get/post/put/patch/delete` from it. Never `fetch`/axios elsewhere.
2. **Paths are relative to `/api`.** `api.get("/products")` → browser calls `/api/products` on the Next.js server → the BFF
   (`app/api/[...slug]/route.ts`) forwards it to the backend. The browser never sees the backend URL.
3. **Auth is a cookie you can't read.** Login/register through the BFF sets the httpOnly `tc_session` cookie; the BFF adds
   the bearer token itself. Browser code never handles tokens. To know who is signed in, call `GET /auth/me`
   (401 → signed out). Sign out with `POST /auth/logout`.
4. **Every error is an `ApiError`.** Use `toApiError(error)` in `catch`, then `error.status`, `error.message`,
   `error.fieldErrors` and the helpers (`isValidationError`, `isUnauthorized`, `isForbidden`, `isNotFound`, …).
5. **Money** (`price`, `totalAmount`, `cashReceived`, …) is a JSON **number** with up to 2 decimals. Format it in the
   **shop currency** from `GET /settings` (admin-configurable) — in the app use `useSettings().money(value)`
   (`lib/settings.tsx`); never hard-code a currency. Send numbers, not strings. **Timestamps** are ISO-8601 UTC strings (`"2026-10-15T14:03:11.52Z"`).
6. Writes (`POST/PUT/PATCH/DELETE`) must be same-origin — the BFF rejects cross-site writes with 403. Normal in-app calls are fine.

---

## 1. What changed — at a glance

### New endpoints

| Method & path                                                           | Who            | Purpose                                                    |
| ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `GET /categories`                                                       | public         | Whole category tree (nested)                               |
| `GET /categories/{id}`                                                  | public         | One category + breadcrumb `path` + direct `children`       |
| `POST /categories` · `PUT /categories/{id}` · `DELETE /categories/{id}` | ADMIN, MANAGER | Manage the tree                                            |
| `POST /orders/guest`                                                    | **public**     | Checkout without an account (name + phone + address)       |
| `POST /orders/in-store`                                                 | ADMIN, MANAGER | Walk-in customer cash sale → receipt                       |
| `POST /inventory/adjustments`                                           | ADMIN, MANAGER | Add/remove stock with a reason (damaged, returned, …)      |
| `GET /inventory/movements`                                              | ADMIN, MANAGER | Stock history (ledger), filterable                         |
| `GET /settings` · `GET /settings/currencies`                            | public         | Shop settings (display currency) · accepted ISO 4217 codes |
| `PUT /settings`                                                         | ADMIN          | Change the shop currency (`{ "currency": "BDT" }`)         |

### Changed endpoints

| Endpoint                                    | Change                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /products`                             | New optional query params `q`, `categoryId`, `inStock`. Response items gain `categoryId`, `categoryPath`.                                         |
| `GET /products/{id}`                        | Gains `categoryId`, `categoryPath`.                                                                                                               |
| `POST /products` · `PUT /products/{id}`     | Body gains `categoryId`. ⚠ `PUT` **replaces** it: omit/null = uncategorised.                                                                      |
| `PATCH /products/{id}/stock`                | Body gains optional `note`. (Sets an absolute counted quantity.)                                                                                  |
| `POST /auth/register`                       | ⚠ **`phone` is now required** and is an **object** `{countryCode, number}`.                                                                       |
| `PATCH /auth/me`                            | ⚠ `phone` is now an object `{countryCode, number}` (was a string).                                                                                |
| `POST /users` · `PATCH /users/{id}` (admin) | ⚠ `phone` is now an object `{countryCode, number}`.                                                                                               |
| `POST /orders` (signed-in customer)         | ⚠ Body fields renamed: `shippingName` → `customerName`, `shippingPhone` (string) → `phone` (object).                                              |
| All order responses                         | ⚠ `shippingName` → `customerName`, `shippingPhone` → `customerPhone`; new `channel`, `receipt`; `customer` and `shippingAddress` may be **null**. |
| `GET /orders` (staff)                       | New optional `channel` filter (`ONLINE` / `IN_STORE`).                                                                                            |
| `GET /orders/me`                            | Now also contains guest and in-store orders made with the customer's phone.                                                                       |

---

## 2. TypeScript types (copy into e.g. `lib/types.ts`)

```ts
// ---- shared ---------------------------------------------------------------------------------
export interface Page<T> {
  content: T[];
  page: number; // 0-based
  size: number; // max 100
  totalElements: number;
  totalPages: number;
}

/** What you SEND for any phone number. Both parts are required. */
export interface PhoneInput {
  countryCode: string; // calling code, with or without "+": "+880", "880", "+1", "+44"
  number: string; // local/national part: "01712345678" (digits; spaces, - . ( ) allowed)
}
// What you RECEIVE for a phone is always a plain E.164 string, e.g. "+8801712345678".

export type Role = "ADMIN" | "MANAGER" | "CUSTOMER";

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null; // E.164
  shippingAddress: string | null;
  role: Role;
  enabled: boolean;
  createdAt: string | null;
}

// ---- catalogue ------------------------------------------------------------------------------
export interface CategoryRef {
  id: number;
  name: string;
}

export interface CategoryNode {
  // GET /categories
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryNode[]; // sorted by name, any depth
}

export interface CategoryDetail {
  // GET/POST/PUT /categories/{id}
  id: number;
  name: string;
  parentId: number | null;
  path: CategoryRef[]; // root → … → this category (breadcrumb)
  children: CategoryRef[]; // direct sub-categories only
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  inStock: boolean;
  categoryId: number | null;
  categoryPath: CategoryRef[]; // breadcrumb of the product's category; [] when uncategorised
}

export interface ProductInput {
  // POST /products, PUT /products/{id}
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity?: number; // create: initial stock (default 0). update: omit = unchanged
  categoryId?: number | null; // PUT: omit/null = REMOVES the category
}

// ---- orders ---------------------------------------------------------------------------------
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export type OrderChannel = "ONLINE" | "IN_STORE";

export interface OrderItemInput {
  productId: number;
  quantity: number;
} // quantity 1..100, max 50 lines

export interface OrderItem {
  productId: number | null; // null if the product was deleted later
  productName: string; // snapshot at order time
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Receipt {
  // only on IN_STORE orders
  receiptNumber: string; // "R-00000042"
  paymentMethod: "CASH";
  cashReceived: number;
  change: number;
  cashier: { id: number; fullName: string } | null;
}

export interface Order {
  id: number;
  channel: OrderChannel;
  status: OrderStatus;
  totalAmount: number;
  customerName: string;
  customerPhone: string; // E.164
  shippingAddress: string | null; // null for IN_STORE
  customer: { id: number; email: string; fullName: string } | null; // null = guest/walk-in phone with no account (yet)
  items: OrderItem[];
  receipt: Receipt | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ---- inventory ------------------------------------------------------------------------------
export type ManualStockReason =
  | "RESTOCK"
  | "RETURNED" // must be positive
  | "DAMAGED"
  | "LOST"
  | "EXPIRED" // must be negative
  | "CORRECTION"
  | "OTHER"; // either sign, note REQUIRED
export type StockReason =
  | ManualStockReason
  | "INITIAL_STOCK"
  | "STOCK_COUNT"
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "IN_STORE_SALE"; // system-recorded

export interface StockMovement {
  id: number;
  productId: number;
  reason: StockReason;
  quantityChange: number; // signed: +3 added, -2 removed
  stockAfter: number;
  note: string | null;
  orderId: number | null; // set for ORDER_PLACED / ORDER_CANCELLED / IN_STORE_SALE
  actor: { id: number; fullName: string } | null; // who did it (null for guest orders / seed data)
  createdAt: string | null;
}
```

---

## 3. Phone numbers (used by register, profile, guest checkout, walk-in sale, admin users)

**UI:** two inputs — a country-code selector (e.g. `+880 Bangladesh`, `+1 USA/Canada`, `+44 UK`, …) and a local
number field. Send them **separately**:

```json
{ "countryCode": "+880", "number": "01712345678" }
```

- The backend validates the pair with Google's libphonenumber (real numbering plans per country), strips the national
  trunk prefix (the leading `0` in `01712…`) and stores/returns **E.164**: `"+8801712345678"`.
- `"880"` and `"+880"` are both fine; spaces/dashes/brackets in `number` are ignored. A `+` inside `number` is rejected.
- Show phones from responses as-is, or pretty-print them yourself (they're always E.164).
- Optional: pre-validate in the browser with a library such as `libphonenumber-js` for instant feedback — but the
  server's answer is final. (Adding a dependency is a frontend decision; follow the repo's version rules.)

**Errors** come back as 400 with **dotted keys** in `fieldErrors`:

| Key                 | Meaning                                                 | Show it under    |
| ------------------- | ------------------------------------------------------- | ---------------- |
| `phone`             | phone object missing                                    | the phone group  |
| `phone.countryCode` | not a calling code / unknown country                    | country selector |
| `phone.number`      | not a valid number for that country (or bad characters) | number input     |

```ts
const err = toApiError(e);
const countryError = err.fieldErrors["phone.countryCode"];
const numberError = err.fieldErrors["phone.number"] ?? err.fieldErrors["phone"];
```

**One phone = one account.** Registering or changing a profile to a phone another account already uses → **409** with
`fieldErrors.phone = "is already registered to another account"`. Suggest "Sign in instead".

**Why phones matter:** orders are matched to customers by phone (see §5.3).

---

## 4. Catalogue: products, search, categories

### 4.1 Product list / search

```ts
// lib/products.ts wraps these (lists are sent as `ids=1,2,3`, not axios' `ids[]=`).
fetchProducts({
  q,
  categoryId,
  inStock: true,
  minPrice: 10,
  maxPrice: 50,
  sort: "PRICE_ASC",
  limit: 24,
});
```

| Param                  | Meaning                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `q`                    | case-insensitive "contains" on name **and** description; `%` and `_` are literal characters                    |
| `categoryId`           | that category **plus every sub-category below it** (any depth)                                                 |
| `inStock=true`         | hide sold-out products (`stockQuantity === 0`)                                                                 |
| `minPrice`, `maxPrice` | inclusive price bounds (≥ 0; `maxPrice < minPrice` → 400 `fieldErrors.maxPrice`)                               |
| `ids=3,1,7`            | only these products (max 100); with the default sort they come back **in the given order**                     |
| `sort`                 | `FEATURED` (default, catalogue order) · `NEWEST` · `PRICE_ASC` · `PRICE_DESC` · `NAME_ASC`; other values → 400 |
| `limit`                | 1–100 (otherwise 400 `fieldErrors.limit`); omitted = everything                                                |

- All optional and combinable. Response is a plain **array** (not paged).
- Unknown `categoryId` → **404** (e.g. a stale link) — show "category not found" and fall back to all products.
- Use `product.inStock` to disable "Add to cart"; use `stockQuantity` to cap the quantity selector and to show
  "Only 3 left". Stock can change at any time — the order call is the real check (see §5.4).
- Keep filters in the URL (`/search?q=mug&category=12&minPrice=5&sort=PRICE_ASC`) so results are shareable and back-button friendly.

Search-page helpers (all public, same `q` / `categoryId` / `inStock` meaning as above):

| Call                                                    | Returns                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /products/price-range?q=&categoryId=&inStock=`     | `{ min, max }` of the matches (both `null` when nothing matches) — bounds for a price slider                                                                                                      |
| `GET /products/similar?q=&categoryId=&inStock=&limit=8` | products **not** in the results, from the matches' own/sibling categories, categories named like a search word, or matching single words; random order, in-stock first; `[]` when nothing relates |
| `GET /products/random?limit=8&inStock=&exclude=1,2,3`   | random products, never the `exclude` ids (max 200)                                                                                                                                                |

### 4.1b Storefront layouts (designer)

```ts
api.get<PageLayoutResponse>("/layouts/home"); // public: { page, sections: [...] | null, updatedAt }
api.put("/layouts/home", { sections }); // ADMIN: publish
api.delete("/layouts/home"); // ADMIN: back to the built-in default (204)
```

- Pages: `home`, `search` (anything else → 404). `sections: null` = not customised → use `defaultSections(page)`.
- The section model, defaults and normaliser live in `lib/page-layout.ts`; always run stored JSON through
  `normalizeSections` before rendering.
- The backend checks only the envelope: ≤ 40 sections, unique `id` (`[A-Za-z0-9_-]{1,64}`), a `type` allowed on the
  page, strings ≤ 2000 chars, ≤ 100 000 chars of JSON, and every `href` / `*Href` / `*Url` value must be `""`, a site
  path (`/…`, not `//…`) or an `http(s)://` URL → otherwise 400 with keys like `sections[2].ctaHref`.

### 4.2 Category navigation

```ts
const tree = await api.get<CategoryNode[]>("/categories"); // top-level nodes with nested children
```

- Fetch once and cache (it's small). Render as a sidebar/mega-menu; recursion handles any depth.
- **Breadcrumbs:** a product carries `categoryPath` (e.g. `Clothing › Shoes › Sneakers`); a category page can use
  `GET /categories/{id}` → `path` + `children` ("Shop by sub-category").
- Clicking any level filters with `categoryId=<that id>` — sub-categories are included automatically, so **don't**
  collect descendant ids yourself.

---

## 5. Customer flows

### 5.1 Register / sign in

```ts
// register (phone REQUIRED now)
const { user, expiresAt } = await api.post<{ user: User; expiresAt: string }>(
  "/auth/register",
  {
    email,
    password,
    fullName,
    phone: { countryCode: "+880", number: "01712345678" },
    shippingAddress, // optional
  },
);
// login is unchanged: { email, password }
```

- Through the BFF the response is `{ user, expiresAt }` (the token goes into the cookie, not to you).
- 409 `fieldErrors.email` → email taken; 409 `fieldErrors.phone` → phone taken.
- ✨ After registering, **any earlier guest or in-store orders made with that phone appear in "My orders"**
  automatically. Worth telling the user ("We found 2 earlier orders for this number").

### 5.2 Profile

```ts
await api.patch<User>("/auth/me", { fullName?, phone?: PhoneInput, shippingAddress? });
```

- Omitted fields are unchanged; `shippingAddress: ""` clears it. The phone can be changed but not removed.
- Changing the phone also claims unowned orders made with the new number.

### 5.3 Checkout — two paths

```text
            cart ready
               │
     GET /auth/me ──200 (CUSTOMER)──► POST /orders            (signed-in checkout)
               │
              401 ──► offer:  [Sign in / Register]  or  [Continue as guest] ──► POST /orders/guest
```

**Signed-in customer** — everything except items is optional and falls back to the profile:

```ts
await api.post<Order>("/orders", {
  items: [{ productId: 1, quantity: 2 }],
  customerName: "Ann", // optional (default: profile name)
  phone: { countryCode: "+880", number: "01712345678" }, // optional (default: profile phone)
  shippingAddress: "1 Main St, Dhaka", // optional (default: profile address)
});
```

- 400 `fieldErrors.phone` / `fieldErrors.shippingAddress` = "is required (none saved on your profile)" → show those inputs.
  Pre-fill the form from `GET /auth/me` so this rarely happens.
- The first order saves phone/address to the profile if the profile had none.
- Staff accounts get **403** here (staff use the POS, §6.1).

**Guest (no account)** — name, phone and address are all required:

```ts
await api.post<Order>("/orders/guest", {
  items: [{ productId: 1, quantity: 2 }],
  customerName: "Gina",
  phone: { countryCode: "+880", number: "01812345678" },
  shippingAddress: "5 Guest Rd, Dhaka",
});
```

- Works signed out. If an account already owns that phone, the response has `customer` filled — the order is
  already in that account's history ("Sign in to track it").
- Otherwise `customer` is `null`. **Guests cannot view or cancel the order later without an account** — so on the
  confirmation page show the order number and offer "Create an account with this phone number to track this order".

### 5.4 Out-of-stock at checkout (both paths)

Stock is checked and taken **at the moment the order is placed**. If anything is short you get **409**:

```json
{
  "status": 409,
  "detail": "Some items are unavailable.",
  "errors": {
    "2": "Only 1 of \"Tee\" left in stock.",
    "7": "Product 7 no longer exists."
  }
}
```

`fieldErrors` is keyed by **productId** → highlight those cart lines, show the messages, let the user adjust, and
re-fetch the products. Nothing was taken (all-or-nothing).

### 5.5 Orders & tracking

```ts
api.get<Page<Order>>("/orders/me", { params: { page: 0, size: 20 } }); // newest first (CUSTOMER)
api.get<Order>(`/orders/${id}`); // public order tracking (anyone with the link / SMS)
api.post<Order>(`/orders/${id}/cancel`); // cancel own pending order (CUSTOMER)
```

- `GET /orders/{id}` is public so customer order tracking links (sent via SMS or opened after checkout) can be accessed by anyone with the order id without requiring login.
- The list in `/orders/me` mixes online orders, guest orders and in-store purchases made with the user's phone. Show a badge from
  `channel` (`ONLINE` → "Online", `IN_STORE` → "In store") and, for in-store ones, the `receipt` (§6.1).
- **Cancel** button only when `status === "PENDING"` (otherwise 409). Stock is returned automatically. Ownership is enforced on cancel.

---

## 6. Staff screens (role `ADMIN` or `MANAGER`)

Read the role from `GET /auth/me` to show/hide staff UI; the backend still enforces it (403).

### 6.1 Point of sale — walk-in cash sale

```ts
const sale = await api.post<Order>("/orders/in-store", {
  items: [{ productId: 3, quantity: 2 }],
  customerName: "Rahim", // required
  phone: { countryCode: "+880", number: "01812345678" }, // required
  cashReceived: 100, // required, must cover the total
});
// sale.channel === "IN_STORE", sale.status === "DELIVERED", sale.receipt = { receiptNumber, cashReceived, change, cashier, ... }
```

Suggested screen: product search (`GET /products?q=…&inStock=true`) → basket with quantities → running total →
customer name + phone → "Cash received" → live "Change: …" preview → **Complete sale** → printable receipt.

- Compute the total/change client-side **only as a preview**; the server recalculates from current prices and its
  `receipt.change` is what you print.
- 400 `fieldErrors.cashReceived` = "must be at least the total of 60.50" → ask for more cash.
- 409 keyed by productId → not enough stock (same as §5.4). Nothing is taken on any error.
- If an account uses that phone, `sale.customer` is filled and the purchase appears in that customer's "My orders";
  if not, it will appear once they register with that phone.
- The sale is final (`DELIVERED`): it can't be cancelled. To correct a mistake, use a stock adjustment (§6.2).
- **Receipt** fields: `receipt.receiptNumber`, `createdAt`, `items[]` (`productName`, `quantity`, `unitPrice`,
  `lineTotal`), `totalAmount`, `receipt.cashReceived`, `receipt.change`, `receipt.cashier.fullName`, `customerName`,
  `customerPhone`. Use `window.print()` with a print stylesheet.

### 6.2 Inventory — re-enter / remove stock

```ts
await api.post<StockMovement>("/inventory/adjustments", {
  productId: 5,
  quantityChange: -2, // signed, not 0: + adds / re-enters, − removes
  reason: "DAMAGED",
  note: "Dropped in storage", // optional except for CORRECTION / OTHER (max 500 chars)
});
```

| Reason       | Sign | Use for                                        |
| ------------ | ---- | ---------------------------------------------- |
| `RESTOCK`    | +    | New delivery from a supplier                   |
| `RETURNED`   | +    | Item re-entered (customer return, found again) |
| `DAMAGED`    | −    | Broken / unsellable                            |
| `LOST`       | −    | Missing / stolen                               |
| `EXPIRED`    | −    | Past its date                                  |
| `CORRECTION` | ±    | Fixing a mistake — **note required**           |
| `OTHER`      | ±    | Anything else — **note required**              |

UI tip: a "Add stock / Remove stock" toggle + a positive quantity + a reason list filtered by the toggle; send the
signed number. Errors: 400 `fieldErrors.quantityChange` (wrong sign / 0), `fieldErrors.reason`, `fieldErrors.note`;
**409** when removing more than is in stock. The response's `stockAfter` is the new level.

**Stock count** (overwrite with what was physically counted):

```ts
await api.patch<Product>(`/products/${id}/stock`, {
  stockQuantity: 42,
  note: "Monthly count",
});
```

**Stock history (ledger):**

```ts
api.get<Page<StockMovement>>("/inventory/movements", {
  params: { productId, reason, page, size },
}); // all optional, newest first
```

Show it on the product admin page (`productId=…`) and as a global report (e.g. `reason=DAMAGED` for a damages
report). Render `quantityChange` with a sign and colour, link `orderId` to the order, show `actor?.fullName ?? "Guest/System"`.

### 6.3 Products admin

- Create: `stockQuantity` = initial stock (recorded as `INITIAL_STOCK`), `categoryId` from a tree picker.
- Edit (`PUT`): ⚠ send the **current `categoryId`** every time — omitting it un-categorises the product. Omit
  `stockQuantity` unless you really want to overwrite stock (prefer §6.2).
- 400 `fieldErrors.categoryId` → category doesn't exist (someone deleted it).

### 6.4 Categories admin

```ts
api.post<CategoryDetail>("/categories", { name: "Sneakers", parentId: 12 }); // parentId null/omitted = top level
api.put<CategoryDetail>(`/categories/${id}`, { name, parentId }); // rename and/or move (whole subtree moves)
api.delete(`/categories/${id}`);
```

| Response                   | Meaning                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| 409 `fieldErrors.name`     | a sibling already has that name (case-insensitive)                                |
| 400 `fieldErrors.parentId` | parent doesn't exist, or you tried to move a category under itself/its descendant |
| 409 on delete              | it still has sub-categories or products — move them first                         |

`PUT` replaces `parentId` too: send the current parent when you only rename.

### 6.5 Orders admin

```ts
api.get<Page<Order>>("/orders", { params: { status, channel, page, size } }); // both filters optional
api.patch<Order>(`/orders/${id}/status`, { status: "CONFIRMED" });
```

Allowed moves (anything else → 409):

| From                     | To                       |
| ------------------------ | ------------------------ |
| `PENDING`                | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED`              | `SHIPPED`, `CANCELLED`   |
| `SHIPPED`                | `DELIVERED`              |
| `DELIVERED`, `CANCELLED` | — (final)                |

Cancelling returns stock automatically. `IN_STORE` orders are already `DELIVERED` → show them read-only with their
receipt. Show `customer?.email ?? "Guest (no account)"` plus `customerName` / `customerPhone`.

### 6.6 Users admin (ADMIN)

Same as before, except `phone` in `POST /users` and `PATCH /users/{id}` is now a `PhoneInput` object, it must be unique
(409 `fieldErrors.phone`), and a user who recorded in-store sales (cashier) can't be deleted — disable instead (409).

### 6.7 Shop settings (ADMIN)

```ts
api.get<StoreSettings>("/settings"); // public: { currency: "USD", currencyFractionDigits: 2, updatedAt }
api.get<string[]>("/settings/currencies"); // public: sorted ISO 4217 codes the backend accepts
api.put<StoreSettings>("/settings", { currency: "BDT" }); // ADMIN only; case-insensitive
```

- 400 `fieldErrors.currency` → unknown / pseudo currency (e.g. `XXX`).
- Changing the currency only changes **display**; stored prices and past orders are not converted.
- `PUT /settings` is a partial update: send `{ currency }` and/or `{ otp: { mode, loginRequired, orderRequired } }` (see §6.8).

### 6.8 One-time codes (OTP)

The admin picks **where** codes go (`otp.mode`: `PHONE` = SMS, `EMAIL`, `EMAIL_OR_PHONE` = customer chooses) and **when**
(`otp.loginRequired`, `otp.orderRequired`). Sign-up, guest checkout and "forgot password" **always** need a code.
Read the rules from `GET /settings` → `otp` (`useSettings().settings.otp`). UI helpers: `components/OtpField.tsx`
(`useOtp`, `OtpChannelPicker`, `OtpCodeField`, `otpError`).

```ts
// 1. send a code → OtpChallenge { challengeId, channel, destination (masked), codeLength, expiresAt, resendAvailableAt }
api.post<OtpChallenge>("/otp/send", { purpose, channel, email?, phone? });
//    purpose: REGISTER | GUEST_ORDER | PASSWORD_RESET (public) · ORDER | VERIFY_CONTACT (signed in; own email / phone)
// 2. send the proof with the protected action: otp: { challengeId, code }
api.post("/auth/register", { ...form, phone, otp });          // code to that email or phone
api.post("/orders/guest", { ...order, email?, otp });         // email required when mode = EMAIL
api.post("/orders", { items, ..., otp });                     // only when otp.orderRequired
api.post("/auth/password-reset", { otp, newPassword });        // 204, then sign in
api.post("/auth/me/verify", otp);                              // → { user, claimedOrders }
// Login: POST /auth/login answers either a session or { otpRequired: true, otp, otpChannels };
// then POST /auth/login/otp { challengeId, code } → session (the BFF sets the cookie). Re-post /auth/login with
// otpChannel to resend or switch channel.
```

- Code errors: 400 `fieldErrors["otp.code"]` (wrong — "n tries left", expired, used, sent elsewhere); `fieldErrors.otp`
  when the code is missing. A code is consumed only when the action succeeds (e.g. a stock 409 keeps it usable).
- 429 (+ `Retry-After`, body `retryAfterSeconds`) when codes are requested too often: **90 s pause** per email/phone
  (any purpose) **and** per account (any channel — e.g. login "send by SMS instead"), 5 per email/phone per hour,
  10 per shopper IP per 10 min (the BFF forwards the IP as `X-Client-IP`); concurrent sends are serialised.
  503 when the email/SMS provider fails. Respect `resendAvailableAt` in the UI (`useSecondsUntil` in `OtpField.tsx`).
- Codes live 10 min, 5 wrong tries. `PASSWORD_RESET` answers the same whether or not an account exists.
- **Verified contacts:** `User.emailVerified` / `phoneVerified`. Guest / walk-in orders are linked to an account only
  through a **verified** phone or email (immediately if the account already verified it, otherwise when it gets
  verified: sign-up, login code, order code, password reset or "Verify" on the account page). A verified phone is
  taken from an account that only typed the same number. Changing the phone in the profile makes it unverified.
- Without SMTP settings, emails go to the bundled Mailpit test inbox: open <http://localhost:4446> to read OTP emails.
  If SMTP is unreachable, or for SMS (no gateway yet), the backend writes the code to its log (`docker logs thecommerce-backend`).

---

## 7. Who can do what (for showing/hiding UI)

| Feature                                         | Signed out | CUSTOMER | MANAGER |  ADMIN  |
| ----------------------------------------------- | :--------: | :------: | :-----: | :-----: |
| Browse/search products & categories             |     ✅     |    ✅    |   ✅    |   ✅    |
| Guest checkout `/orders/guest`                  |     ✅     |   ✅\*   |  ✅\*   |  ✅\*   |
| Order tracking `/orders/{id}`                   |     ✅     |    ✅    |   ✅    |   ✅    |
| Account checkout `/orders`, My orders, cancel   |     –      |    ✅    |    –    |    –    |
| POS `/orders/in-store`                          |     –      |    –     |   ✅    |   ✅    |
| Products, categories, stock, ledger, all orders |     –      |    –     |   ✅    |   ✅    |
| Users                                           |     –      |    –     |    –    |   ✅    |
| Shop settings (currency) — read                 |     ✅     |    ✅    |   ✅    |   ✅    |
| Shop settings (currency) — change               |     –      |    –     |    –    |   ✅    |
| Storefront layouts — read / publish & reset     |   ✅ / –   |  ✅ / –  | ✅ / –  | ✅ / ✅ |

\* Allowed but pointless for signed-in users — use the account checkout for customers and the POS for staff.

---

## 8. Error cheat sheet

| Status                                         | Typical cause in these features                                                      | What to show                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 400 + `fieldErrors`                            | validation (phone parts, required fields, wrong stock sign, not enough cash)         | messages next to fields (keys can be dotted: `phone.number`, `items[0].quantity`) |
| 401                                            | not signed in / session expired (cookie already cleared by the BFF)                  | sign-in prompt                                                                    |
| 403                                            | wrong role, or a cross-site write                                                    | "You don't have permission"                                                       |
| 404                                            | unknown product/category/order, or someone else's order                              | not-found state                                                                   |
| 409 + `fieldErrors` keyed by productId         | not enough stock (checkout, POS, or removing more stock than exists)                 | highlight cart lines / the product                                                |
| 409 + `fieldErrors.phone` / `.email` / `.name` | duplicate phone / email / sibling category name                                      | message on that field                                                             |
| 409 (no fields)                                | illegal status change, deleting a non-empty category, cancelling a non-pending order | `error.message` (server text is user-friendly)                                    |
| 502 / 504                                      | backend down / slow (from the BFF)                                                   | retry banner                                                                      |

---

## 9. Known limitations (design around them)

- Phone/email ownership is proven by OTP (§6.8); there is no SMS gateway yet, so SMS codes only reach the backend log.
- Guest orders can't be looked up or cancelled without creating an account with that phone.
- In-store sales can't be refunded/voided via the API yet.
- `GET /products` is not paginated (fine for now; may change if the catalogue grows).
- The public guest checkout has no captcha; OTP sends are rate-limited per email/phone, per account and per IP
  (set `TRUSTED_PROXY_HOPS` when a reverse proxy sits in front of the frontend, or every shopper shares one IP limit).

---

## 10. Trying things out

- Swagger UI: <http://localhost:4444/swagger-ui.html> — "Authorize" with a token from `POST /api/auth/login` to try staff calls.
- Through the BFF (what the app uses): `http://localhost:4445/api/...`. For writes from curl/PowerShell add an
  `Origin: http://localhost:4445` header, otherwise the BFF returns 403.
- Existing products start with stock 0 — give them stock first (`POST /inventory/adjustments` with `RESTOCK`).
