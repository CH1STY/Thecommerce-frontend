// Backend API shapes (see docs/backend-api-guide.md; Swagger at /v3/api-docs is the source of truth).

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** What we SEND for a phone. Responses always carry an E.164 string instead. */
export interface PhoneInput {
  countryCode: string;
  number: string;
}

export type Role = "ADMIN" | "MANAGER" | "CUSTOMER";
export const ROLES: Role[] = ["ADMIN", "MANAGER", "CUSTOMER"];

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  shippingAddress: string | null;
  role: Role;
  enabled: boolean;
  createdAt: string | null;
  /** Proven with a one-time code (or set by an admin). */
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface SessionResponse {
  user: User;
  expiresAt: string;
}

/** `POST /auth/login`: signed in, or (login OTP on) a code was sent and `POST /auth/login/otp` finishes it. */
export type LoginResult =
  | (SessionResponse & { otpRequired?: false })
  | { otpRequired: true; otp: OtpChallenge; otpChannels: OtpChannel[] };

/** Where the shop sends one-time codes (admin setting). */
export type OtpMode = "PHONE" | "EMAIL" | "EMAIL_OR_PHONE";
export type OtpChannel = "EMAIL" | "PHONE";
export type OtpPurpose =
  | "REGISTER"
  | "LOGIN"
  | "GUEST_ORDER"
  | "ORDER"
  | "PASSWORD_RESET"
  | "VERIFY_CONTACT";

export interface OtpChallenge {
  challengeId: string;
  purpose: OtpPurpose;
  channel: OtpChannel;
  /** Masked, e.g. a•••@example.com */
  destination: string;
  codeLength: number;
  expiresAt: string;
  resendAvailableAt: string;
}

/** Sent with the action a code protects. */
export interface OtpProof {
  challengeId: string;
  code: string;
}

export interface OtpSettings {
  mode: OtpMode;
  loginRequired: boolean;
  orderRequired: boolean;
  /** Always true. */
  guestOrderRequired: boolean;
  /** Always true. */
  registerRequired: boolean;
}

/** Channels a mode allows, email first. */
export function otpChannels(mode: OtpMode): OtpChannel[] {
  if (mode === "EMAIL") return ["EMAIL"];
  if (mode === "PHONE") return ["PHONE"];
  return ["EMAIL", "PHONE"];
}

export interface CategoryRef {
  id: number;
  name: string;
  imageUrl?: string | null;
}

export interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  imageUrl?: string | null;
  children: CategoryNode[];
}

export interface CategoryDetail {
  id: number;
  name: string;
  parentId: number | null;
  imageUrl?: string | null;
  path: CategoryRef[];
  children: CategoryRef[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images?: string[];
  stockQuantity: number;
  inStock: boolean;
  categoryId: number | null;
  categoryPath: CategoryRef[];
}

export type ProductSort =
  | "FEATURED"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "NAME_ASC";

/** Query of `GET /api/products` (all optional). */
export interface ProductQuery {
  q?: string;
  categoryId?: number;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  ids?: number[];
  sort?: ProductSort;
  limit?: number;
  page?: number;
  size?: number;
}

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export type LayoutPage = "home" | "search";

export interface PageLayoutResponse {
  page: LayoutPage;
  /** null = the page uses the built-in default layout. */
  sections: unknown[] | null;
  updatedAt: string | null;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number | null;
  imageUrl: string;
  images?: string[];
  stockQuantity?: number;
  categoryId?: number | null;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export type OrderChannel = "ONLINE" | "IN_STORE";

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export interface OrderItem {
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Receipt {
  receiptNumber: string;
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
  customerPhone: string;
  /** Lower-case; null for walk-in sales and guests who gave none. */
  customerEmail?: string | null;
  shippingAddress: string | null;
  customer: { id: number; email: string; fullName: string } | null;
  items: OrderItem[];
  receipt: Receipt | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ManualStockReason =
  | "RESTOCK"
  | "RETURNED"
  | "DAMAGED"
  | "LOST"
  | "EXPIRED"
  | "CORRECTION"
  | "OTHER";
export type StockReason =
  | ManualStockReason
  | "INITIAL_STOCK"
  | "STOCK_COUNT"
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "IN_STORE_SALE";

export const STOCK_REASONS: StockReason[] = [
  "RESTOCK",
  "RETURNED",
  "DAMAGED",
  "LOST",
  "EXPIRED",
  "CORRECTION",
  "OTHER",
  "INITIAL_STOCK",
  "STOCK_COUNT",
  "ORDER_PLACED",
  "ORDER_CANCELLED",
  "IN_STORE_SALE",
];

export const ADD_REASONS: ManualStockReason[] = [
  "RESTOCK",
  "RETURNED",
  "CORRECTION",
  "OTHER",
];
export const REMOVE_REASONS: ManualStockReason[] = [
  "DAMAGED",
  "LOST",
  "EXPIRED",
  "CORRECTION",
  "OTHER",
];

export interface StockMovement {
  id: number;
  productId: number;
  reason: StockReason;
  quantityChange: number;
  stockAfter: number;
  note: string | null;
  orderId: number | null;
  actor: { id: number; fullName: string } | null;
  createdAt: string | null;
}

export interface StoreSettings {
  currency: string;
  currencyFractionDigits: number;
  updatedAt: string | null;
  otp: OtpSettings;
}

export function isStaff(user: User | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "MANAGER";
}
