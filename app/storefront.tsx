"use client";

import {
  PackageSearchIcon,
  SearchIcon,
  ShoppingCartIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CategoryNav, useCategoryTree } from "@/components/categories";
import {
  EmptyState,
  ErrorBanner,
  ProductImage,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { cart, useCart } from "@/lib/cart";
import { useSettings } from "@/lib/settings";
import type { Product } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export function Storefront() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { money } = useSettings();
  const lines = useCart();

  const q = params.get("q") ?? "";
  const categoryParam = params.get("category");
  const categoryId =
    categoryParam && /^\d+$/.test(categoryParam) ? Number(categoryParam) : null;
  const inStock = params.get("inStock") === "true";
  const [search, setSearch] = useState(q);

  const categories = useCategoryTree();
  const products = useLoad(`products?${q}|${categoryId}|${inStock}`, () =>
    api.get<Product[]>("/products", {
      params: {
        q: q || undefined,
        categoryId: categoryId ?? undefined,
        inStock: inStock || undefined,
      },
    }),
  );

  function update(next: {
    q?: string;
    category?: number | null;
    inStock?: boolean;
  }) {
    const query = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null) =>
      value ? query.set(key, value) : query.delete(key);
    if (next.q !== undefined) set("q", next.q.trim() || null);
    if (next.category !== undefined)
      set("category", next.category === null ? null : String(next.category));
    if (next.inStock !== undefined)
      set("inStock", next.inStock ? "true" : null);
    const text = query.toString();
    router.push(text ? `${pathname}?${text}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: search });
  }

  function addToCart(product: Product) {
    cart.add(product);
    toast.success(`${product.name} added to your cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  const inCart = (id: number) =>
    lines.find((l) => l.productId === id)?.quantity ?? 0;
  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="grid gap-8 md:grid-cols-[230px_1fr]">
      <aside className="md:sticky md:top-20 md:self-start">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <Button
              type="button"
              size="sm"
              variant={categoryId === null ? "secondary" : "ghost"}
              aria-current={categoryId === null ? "true" : undefined}
              onClick={() => update({ category: null })}
              className={`w-full justify-start ${categoryId === null ? "" : "font-normal text-muted-foreground"}`}
            >
              All products
            </Button>
            {categories.loading && !categories.data ? (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ) : (
              categories.data && (
                <CategoryNav
                  nodes={categories.data}
                  selected={categoryId}
                  onSelect={(id) => update({ category: id })}
                />
              )
            )}
            <Separator className="my-3" />
            <Field orientation="horizontal">
              <Checkbox
                id="in-stock-only"
                checked={inStock}
                onCheckedChange={(checked) =>
                  update({ inStock: checked === true })
                }
              />
              <FieldLabel htmlFor="in-stock-only" className="font-normal">
                In stock only
              </FieldLabel>
            </Field>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {q ? `Results for “${q}”` : "Shop"}
            </h1>
            {products.data && (
              <p className="text-sm text-muted-foreground">
                {products.data.length} product
                {products.data.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <form onSubmit={onSearch} role="search" className="w-full sm:w-80">
            <InputGroup className="bg-background">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" variant="secondary">
                  Search
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>

        {products.error?.isNotFound && categoryId !== null ? (
          <EmptyState
            icon={PackageSearchIcon}
            title="Category not found"
            description="That category no longer exists."
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => update({ category: null })}
            >
              Show all products
            </Button>
          </EmptyState>
        ) : (
          <ErrorBanner error={products.error} onDismiss={products.reload} />
        )}

        {products.loading && !products.data ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i} className="pt-0">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.data && products.data.length === 0 ? (
          <EmptyState
            icon={PackageSearchIcon}
            title="No products found"
            description="Try another search or category."
          >
            {(q || categoryId !== null || inStock) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  router.push(pathname);
                }}
              >
                Clear filters
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.data?.map((product) => {
              const quantityInCart = inCart(product.id);
              const canAdd =
                product.inStock && quantityInCart < product.stockQuantity;
              return (
                <Card
                  key={product.id}
                  className="group pt-0 transition-shadow hover:shadow-md"
                >
                  <div className="relative overflow-hidden">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-48 w-full transition-transform duration-300 group-hover:scale-105"
                    />
                    {!product.inStock ? (
                      <Badge
                        variant="secondary"
                        className="absolute top-3 left-3"
                      >
                        Sold out
                      </Badge>
                    ) : (
                      product.stockQuantity <= 5 && (
                        <Badge className="absolute top-3 left-3 bg-amber-500 text-white">
                          Only {product.stockQuantity} left
                        </Badge>
                      )
                    )}
                  </div>
                  <CardHeader>
                    {product.categoryPath.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {product.categoryPath.map((c) => c.name).join(" › ")}
                      </p>
                    )}
                    <CardTitle>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="line-clamp-3 text-muted-foreground">
                      {product.description}
                    </p>
                  </CardContent>
                  <CardFooter className="justify-between gap-2 border-t-0 bg-transparent pt-0">
                    <span className="font-heading text-lg font-semibold tabular-nums">
                      {money(product.price)}
                    </span>
                    <Button
                      type="button"
                      disabled={!canAdd}
                      onClick={() => addToCart(product)}
                    >
                      <PlusIcon data-icon="inline-start" />
                      {quantityInCart > 0
                        ? `Add (${quantityInCart} in cart)`
                        : "Add to cart"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {lines.length > 0 && (
          <div className="mt-8 flex justify-end">
            <Button asChild size="lg">
              <Link href="/cart">
                <ShoppingCartIcon data-icon="inline-start" />
                Go to cart ({cartCount})
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
