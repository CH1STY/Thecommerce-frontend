import { api } from "@/lib/api-client";
import type { Page, PriceRange, Product, ProductQuery } from "@/lib/types";

// Spring expects lists as `ids=1,2,3` (axios would send `ids[]=1&ids[]=2`).
const list = (values: number[] | undefined) =>
  values && values.length > 0 ? values.join(",") : undefined;

export function fetchProducts(query: ProductQuery = {}) {
  return api.get<Product[]>("/products", {
    params: {
      q: query.q?.trim() || undefined,
      categoryId: query.categoryId,
      inStock: query.inStock || undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      ids: list(query.ids),
      sort: query.sort && query.sort !== "FEATURED" ? query.sort : undefined,
      limit: query.limit,
    },
  });
}

export function fetchProductsPaged(query: ProductQuery = {}) {
  return api.get<Page<Product>>("/products", {
    params: {
      q: query.q?.trim() || undefined,
      categoryId: query.categoryId,
      inStock: query.inStock || undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      ids: list(query.ids),
      sort: query.sort && query.sort !== "FEATURED" ? query.sort : undefined,
      page: query.page ?? 0,
      size: query.size ?? 24,
    },
  });
}

export function fetchPriceRange(query: Pick<ProductQuery, "q" | "categoryId" | "inStock">) {
  return api.get<PriceRange>("/products/price-range", {
    params: {
      q: query.q?.trim() || undefined,
      categoryId: query.categoryId,
      inStock: query.inStock || undefined,
    },
  });
}

export function fetchSimilarProducts(query: {
  q?: string;
  categoryId?: number;
  inStock?: boolean;
  limit: number;
}) {
  return api.get<Product[]>("/products/similar", {
    params: {
      q: query.q?.trim() || undefined,
      categoryId: query.categoryId,
      inStock: query.inStock || undefined,
      limit: query.limit,
    },
  });
}

/** At most 200 ids can be excluded (backend limit). */
export function fetchRandomProducts(query: {
  limit: number;
  inStock?: boolean;
  exclude?: number[];
}) {
  return api.get<Product[]>("/products/random", {
    params: {
      limit: query.limit,
      inStock: query.inStock || undefined,
      exclude: list(query.exclude?.slice(0, 200)),
    },
  });
}
