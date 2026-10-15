"use client";

import {
  ChevronRightIcon,
  PackageSearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  CategoryNav,
  flattenCategories,
  useCategoryTree,
  type FlatCategory,
} from "@/components/categories";
import {
  EmptyState,
  ErrorBanner,
  Pager,
  Select,
} from "@/components/common";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/storefront/product-card";
import { SectionList } from "@/components/storefront/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { fetchPriceRange, fetchProductsPaged } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import type { ProductSort } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { usePageLayout } from "@/lib/use-page-layout";

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "FEATURED", label: "Featured" },
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
  { value: "NAME_ASC", label: "Name: A–Z" },
];

const PAGE_SIZE = 24;

function numberParam(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

interface Filters {
  q: string;
  categoryId: number | null;
  inStock: boolean;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sort: ProductSort;
  page: number;
}

type FilterUpdate = Partial<{
  q: string;
  categoryId: number | null;
  inStock: boolean;
  price: [number | undefined, number | undefined];
  sort: ProductSort;
  page: number;
}>;

export function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryParam = params.get("category");
  const sortParam = params.get("sort") as ProductSort | null;
  const pageParam = params.get("page");
  const page = pageParam && /^\d+$/.test(pageParam) ? Math.max(0, Number(pageParam) - 1) : 0;

  const filters: Filters = {
    q: params.get("q")?.trim() ?? "",
    categoryId:
      categoryParam && /^\d+$/.test(categoryParam) ? Number(categoryParam) : null,
    inStock: params.get("inStock") === "true",
    minPrice: numberParam(params.get("minPrice")),
    maxPrice: numberParam(params.get("maxPrice")),
    sort: SORTS.some((s) => s.value === sortParam) ? sortParam! : "FEATURED",
    page,
  };
  const { q, categoryId, inStock, minPrice, maxPrice, sort } = filters;

  const categories = useCategoryTree();
  const flat = useMemo(
    () => flattenCategories(categories.data ?? []),
    [categories.data],
  );
  const categoryPath: FlatCategory[] = [];
  {
    const byId = new Map(flat.map((c) => [c.id, c]));
    let current = categoryId === null ? undefined : byId.get(categoryId);
    while (current) {
      categoryPath.unshift(current);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
  }
  const category = categoryPath.at(-1);

  const resultKey = JSON.stringify([q, categoryId, inStock, minPrice, maxPrice, sort, page]);
  const products = useLoad(`search|${resultKey}`, () =>
    fetchProductsPaged({
      q,
      categoryId: categoryId ?? undefined,
      inStock,
      minPrice,
      maxPrice,
      sort,
      page,
      size: PAGE_SIZE,
    }),
  );
  const layout = usePageLayout("search");

  const resultIds = useMemo(
    () => (products.loading ? undefined : products.data?.content.map((p) => p.id)),
    [products.loading, products.data],
  );
  const searchInfo = useMemo(
    () => ({ q, categoryId, resultIds }),
    [q, categoryId, resultIds],
  );

  function update(next: FilterUpdate) {
    const query = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null | undefined) =>
      value ? query.set(key, value) : query.delete(key);

    const isPageOnly = next.page !== undefined && Object.keys(next).length === 1;
    if (!isPageOnly) {
      query.delete("page");
    } else if (next.page !== undefined) {
      set("page", next.page > 0 ? String(next.page + 1) : null);
    }

    if (next.q !== undefined) set("q", next.q.trim() || null);
    if (next.categoryId !== undefined) {
      set("category", next.categoryId === null ? null : String(next.categoryId));
      // A price range picked for another category rarely still fits.
      query.delete("minPrice");
      query.delete("maxPrice");
    }
    if (next.inStock !== undefined) set("inStock", next.inStock ? "true" : null);
    if (next.price) {
      set("minPrice", next.price[0] === undefined ? null : String(next.price[0]));
      set("maxPrice", next.price[1] === undefined ? null : String(next.price[1]));
    }
    if (next.sort !== undefined) set("sort", next.sort === "FEATURED" ? null : next.sort);
    query.delete("__preview");
    if (params.has("__preview")) query.set("__preview", "1");
    const text = query.toString();
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  function clearAll() {
    router.push(params.has("__preview") ? `${pathname}?__preview=1` : pathname);
  }

  const title = q ? `Results for “${q}”` : category ? category.name : "All products";
  const count = products.data?.totalElements;
  const activeChips: { label: string; clear: () => void }[] = [];
  if (q) activeChips.push({ label: `“${q}”`, clear: () => update({ q: "" }) });
  if (category) activeChips.push({ label: category.name, clear: () => update({ categoryId: null }) });
  if (minPrice !== undefined || maxPrice !== undefined)
    activeChips.push({ label: "Price", clear: () => update({ price: [undefined, undefined] }) });
  if (inStock) activeChips.push({ label: "In stock", clear: () => update({ inStock: false }) });

  const panel = (
    <FilterPanel
      filters={filters}
      onUpdate={update}
      categories={
        categories.loading && !categories.data ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : categories.data && categories.data.length > 0 ? (
          <div className="space-y-0.5">
            <Button
              type="button"
              size="sm"
              variant={categoryId === null ? "secondary" : "ghost"}
              aria-current={categoryId === null ? "true" : undefined}
              onClick={() => update({ categoryId: null })}
              className={`w-full justify-start ${categoryId === null ? "" : "font-normal text-muted-foreground"}`}
            >
              All categories
            </Button>
            <CategoryNav
              nodes={categories.data}
              selected={categoryId}
              onSelect={(id) => update({ categoryId: id })}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )
      }
    />
  );

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRightIcon className="size-3" />
          <Link href="/search" className="hover:text-foreground">Shop</Link>
          {categoryPath.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRightIcon className="size-3" />
              <button
                type="button"
                onClick={() => update({ categoryId: c.id })}
                className="hover:text-foreground cursor-pointer"
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {count === undefined ? "Searching…" : `${count} product${count === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="lg:hidden">
                  <SlidersHorizontalIcon data-icon="inline-start" />
                  Filters
                  {activeChips.length > 0 && (
                    <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px]">{activeChips.length}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-[90vw] gap-0">
                <SheetHeader className="border-b">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto scroll-smooth p-4">{panel}</div>
                <SheetFooter className="border-t">
                  <Button type="button" onClick={() => setFiltersOpen(false)}>
                    Show {count ?? ""} result{count === 1 ? "" : "s"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Label htmlFor="sort" className="sr-only sm:not-sr-only sm:text-sm sm:font-normal sm:text-muted-foreground">
              Sort by
            </Label>
            <Select
              id="sort"
              value={sort}
              onChange={(e) => update({ sort: e.target.value as ProductSort })}
              className="w-44"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <Button
                key={chip.label}
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={chip.clear}
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label}
                <XIcon data-icon="inline-end" />
              </Button>
            ))}
            <Button type="button" size="sm" variant="link" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:block">{panel}</aside>

          <section className="min-w-0" aria-label="Results">
            {products.error?.isNotFound && categoryId !== null ? (
              <EmptyState
                icon={PackageSearchIcon}
                title="Category not found"
                description="That category no longer exists."
              >
                <Button type="button" variant="outline" onClick={() => update({ categoryId: null })}>
                  Show all products
                </Button>
              </EmptyState>
            ) : (
              <ErrorBanner error={products.error} onDismiss={products.reload} />
            )}

            {products.loading && !products.data ? (
              <ProductGridSkeleton count={6} columns={3} />
            ) : products.data && products.data.totalElements === 0 ? (
              <EmptyState
                icon={PackageSearchIcon}
                title="No products found"
                description={
                  q
                    ? "Check the spelling, try fewer words or remove some filters."
                    : "Try another category or remove some filters."
                }
              >
                {activeChips.length > 0 && (
                  <Button type="button" variant="outline" onClick={clearAll}>
                    Clear filters
                  </Button>
                )}
              </EmptyState>
            ) : (
              products.data && (
                <div className={products.loading ? "opacity-60 transition-opacity" : undefined}>
                  <ProductGrid products={products.data.content} columns={3} />
                  {products.data.totalPages > 1 && (
                    <div className="mt-8 flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count ?? 0)} of {count}
                      </p>
                      <Pager
                        page={page}
                        totalPages={products.data.totalPages}
                        onPage={(newPage) => {
                          update({ page: newPage });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            )}
          </section>
        </div>
      </div>

      {layout.sections && (
        <div className="border-t bg-background/40 pb-4">
          <SectionList
            sections={layout.sections}
            preview={layout.preview}
            selectedId={layout.selectedId}
            search={searchInfo}
          />
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function FilterPanel({
  filters,
  onUpdate,
  categories,
}: {
  filters: Filters;
  onUpdate: (next: FilterUpdate) => void;
  categories: ReactNode;
}) {
  const range = useLoad(
    `price-range|${filters.q}|${filters.categoryId}|${filters.inStock}`,
    () =>
      fetchPriceRange({
        q: filters.q,
        categoryId: filters.categoryId ?? undefined,
        inStock: filters.inStock,
      }),
  );
  const bounds =
    range.data && range.data.min !== null && range.data.max !== null
      ? { min: Math.floor(range.data.min), max: Math.ceil(range.data.max) }
      : null;

  return (
    <div className="space-y-6">
      <FilterGroup title="Category">{categories}</FilterGroup>
      <Separator />
      <FilterGroup title="Price">
        {range.loading && !range.data ? (
          <Skeleton className="h-16 w-full" />
        ) : bounds ? (
          <PriceFilter
            key={`${bounds.min}-${bounds.max}-${filters.minPrice}-${filters.maxPrice}`}
            bounds={bounds}
            value={[filters.minPrice, filters.maxPrice]}
            onChange={(price) => onUpdate({ price })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No prices to filter.</p>
        )}
      </FilterGroup>
      <Separator />
      <FilterGroup title="Availability">
        <Field orientation="horizontal">
          <Checkbox
            id="in-stock-only"
            checked={filters.inStock}
            onCheckedChange={(checked) => onUpdate({ inStock: checked === true })}
          />
          <FieldLabel htmlFor="in-stock-only" className="font-normal">
            In stock only
          </FieldLabel>
        </Field>
      </FilterGroup>
    </div>
  );
}

/** Two-thumb slider plus min/max inputs; the URL changes when a thumb is released or an input is committed. */
function PriceFilter({
  bounds,
  value,
  onChange,
}: {
  bounds: { min: number; max: number };
  value: [number | undefined, number | undefined];
  onChange: (price: [number | undefined, number | undefined]) => void;
}) {
  const { money } = useSettings();
  const clamp = (n: number) => Math.min(bounds.max, Math.max(bounds.min, n));
  const [range, setRange] = useState<[number, number]>([
    clamp(value[0] ?? bounds.min),
    clamp(value[1] ?? bounds.max),
  ]);
  const [inputs, setInputs] = useState([String(range[0]), String(range[1])]);
  const span = bounds.max - bounds.min;
  const step = span > 50 ? 1 : span > 5 ? 0.5 : 0.01;

  function commit(next: [number, number]) {
    const [lo, hi] = next[0] <= next[1] ? next : [next[1], next[0]];
    setRange([lo, hi]);
    setInputs([String(lo), String(hi)]);
    const price: [number | undefined, number | undefined] = [
      lo <= bounds.min ? undefined : lo,
      hi >= bounds.max ? undefined : hi,
    ];
    if (price[0] !== value[0] || price[1] !== value[1]) onChange(price);
  }

  function commitInputs() {
    const lo = Number(inputs[0]);
    const hi = Number(inputs[1]);
    commit([
      Number.isFinite(lo) && inputs[0] !== "" ? clamp(lo) : bounds.min,
      Number.isFinite(hi) && inputs[1] !== "" ? clamp(hi) : bounds.max,
    ]);
  }

  if (span <= 0) {
    return <p className="text-sm text-muted-foreground">All products cost {money(bounds.min)}.</p>;
  }

  return (
    <div className="space-y-4">
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={step}
        minStepsBetweenThumbs={0}
        value={range}
        onValueChange={(v) => {
          setRange([v[0], v[1]]);
          setInputs([String(v[0]), String(v[1])]);
        }}
        onValueCommit={(v) => commit([v[0], v[1]])}
        aria-label="Price range"
        className="py-2"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{money(range[0])}</span>
        <span>{money(range[1])}</span>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          commitInputs();
        }}
      >
        <Input
          type="number"
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          step="any"
          value={inputs[0]}
          onChange={(e) => setInputs([e.target.value, inputs[1]])}
          aria-label="Minimum price"
          className="h-8 min-w-0 px-2"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          step="any"
          value={inputs[1]}
          onChange={(e) => setInputs([inputs[0], e.target.value])}
          aria-label="Maximum price"
          className="h-8 min-w-0 px-2"
        />
        <Button type="submit" size="sm" variant="secondary">
          Go
        </Button>
      </form>
    </div>
  );
}
