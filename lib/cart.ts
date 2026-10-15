"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "@/lib/types";

export interface CartLine {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  quantity: number;
}

const STORAGE_KEY = "tc_cart";
const MAX_QUANTITY = 100;
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  if (cache === null) {
    try {
      const parsed: unknown = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "[]",
      );
      cache = Array.isArray(parsed)
        ? (parsed as CartLine[]).filter(
            (l) => Number.isInteger(l?.productId) && l.quantity > 0,
          )
        : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage full/blocked: the cart still works for this tab
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function clamp(quantity: number, stock: number) {
  return Math.max(0, Math.min(quantity, stock, MAX_QUANTITY));
}

export const cart = {
  add(product: Product, quantity = 1) {
    const lines = read();
    const existing = lines.find((l) => l.productId === product.id);
    const nextQuantity = clamp(
      (existing?.quantity ?? 0) + quantity,
      product.stockQuantity,
    );
    if (nextQuantity === 0) return;
    const line: CartLine = {
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      stockQuantity: product.stockQuantity,
      quantity: nextQuantity,
    };
    write(
      existing
        ? lines.map((l) => (l.productId === product.id ? line : l))
        : [...lines, line],
    );
  },
  setQuantity(productId: number, quantity: number) {
    write(
      read()
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: clamp(quantity, l.stockQuantity) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  },
  remove(productId: number) {
    write(read().filter((l) => l.productId !== productId));
  },
  /** Refresh names/prices/stock from the catalogue; lines whose product disappeared are kept so the user sees why. */
  sync(products: Product[]) {
    const byId = new Map(products.map((p) => [p.id, p]));
    write(
      read().map((l) => {
        const p = byId.get(l.productId);
        return p
          ? {
              ...l,
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl,
              stockQuantity: p.stockQuantity,
            }
          : l;
      }),
    );
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const MAX_CART_QUANTITY = MAX_QUANTITY;
