"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import { ProductImage } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cart, useCart } from "@/lib/cart";
import { useSettings } from "@/lib/settings";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { money } = useSettings();
  const router = useRouter();
  const lines = useCart();
  const inCart = lines.find((l) => l.productId === product.id)?.quantity ?? 0;
  const canAdd = product.inStock && inCart < product.stockQuantity;
  const category = product.categoryPath.at(-1);

  function add() {
    cart.add(product);
    toast.success(`${product.name} added to your cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  return (
    <article
      className={cn(
        "group/product flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="size-full transition-transform duration-300 group-hover/product:scale-105"
        />
        {!product.inStock ? (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Sold out
          </Badge>
        ) : (
          product.stockQuantity <= 5 && (
            <Badge className="absolute top-2 left-2 bg-brand text-brand-foreground">
              Only {product.stockQuantity} left
            </Badge>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {category && (
          <p className="truncate text-xs text-muted-foreground">{category.name}</p>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="font-heading text-base font-semibold tabular-nums">
            {money(product.price)}
          </span>
          {inCart > 0 ? (
            <div className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5 shadow-xs">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={
                  inCart === 1
                    ? `Remove ${product.name} from cart`
                    : `Decrease quantity of ${product.name}`
                }
                onClick={() => {
                  if (inCart === 1) {
                    cart.remove(product.id);
                    toast.info(`${product.name} removed from cart`);
                  } else {
                    cart.setQuantity(product.id, inCart - 1);
                  }
                }}
              >
                {inCart === 1 ? (
                  <Trash2Icon className="size-3 text-destructive" />
                ) : (
                  <MinusIcon className="size-3" />
                )}
              </Button>
              <span
                className="min-w-6 px-1 text-center font-heading text-xs font-semibold tabular-nums text-foreground"
                aria-label={`${inCart} in cart`}
              >
                {inCart}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                disabled={!canAdd}
                aria-label={`Increase quantity of ${product.name}`}
                onClick={add}
              >
                <PlusIcon className="size-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={!canAdd}
              onClick={add}
              aria-label={`Add ${product.name} to cart`}
            >
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

const GRID_COLUMNS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const CAROUSEL_WIDTHS: Record<number, string> = {
  3: "lg:basis-[calc((100%-2rem)/3)]",
  4: "lg:basis-[calc((100%-3rem)/4)]",
  5: "lg:basis-[calc((100%-4rem)/5)]",
  6: "lg:basis-[calc((100%-5rem)/6)]",
};

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: Product[];
  columns?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3",
        GRID_COLUMNS[columns] ?? GRID_COLUMNS[4],
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductCarousel({
  products,
  columns = 4,
  label,
}: {
  products: Product[];
  columns?: number;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.9,
      behavior: "smooth",
    });

  return (
    <div className="group/rail relative">
      <div
        ref={track}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 outline-none sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            className={cn(
              "shrink-0 basis-[45%] snap-start sm:basis-[calc((100%-2rem)/3)]",
              CAROUSEL_WIDTHS[columns] ?? CAROUSEL_WIDTHS[4],
            )}
          />
        ))}
      </div>
      {products.length > 2 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Scroll back"
            onClick={() => scroll(-1)}
            className="absolute top-1/3 -left-3 hidden rounded-full bg-background shadow-md md:group-hover/rail:inline-flex"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Scroll forward"
            onClick={() => scroll(1)}
            className="absolute top-1/3 -right-3 hidden rounded-full bg-background shadow-md md:group-hover/rail:inline-flex"
          >
            <ChevronRightIcon />
          </Button>
        </>
      )}
    </div>
  );
}

export function ProductGridSkeleton({
  count = 4,
  columns = 4,
}: {
  count?: number;
  columns?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3",
        GRID_COLUMNS[columns] ?? GRID_COLUMNS[4],
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
