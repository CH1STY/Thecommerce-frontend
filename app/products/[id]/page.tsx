"use client";

import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CreditCardIcon,
  HomeIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  Share2Icon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/common";
import { ProductImageGallery } from "@/components/storefront/product-image-gallery";
import { ProductGrid } from "@/components/storefront/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cart, useCart } from "@/lib/cart";
import { fetchProduct, fetchRandomProducts, fetchSimilarProducts } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import { useLoad } from "@/lib/use-load";

function ProductDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const productId = Number(id);
  const router = useRouter();
  const { money } = useSettings();
  const lines = useCart();

  const [quantity, setQuantity] = useState(1);

  // Load product
  const productLoad = useLoad(`product-${id}`, () => fetchProduct(productId));
  const product = productLoad.data;

  // Load similar or recommended products
  const similarLoad = useLoad(`similar-${id}-${product?.categoryId ?? "none"}`, async () => {
    if (!product) return [];
    if (product.categoryId) {
      const sim = await fetchSimilarProducts({
        categoryId: product.categoryId,
        limit: 4,
      });
      const filtered = sim.filter((p) => p.id !== product.id);
      if (filtered.length > 0) return filtered;
    }
    const rand = await fetchRandomProducts({
      limit: 4,
      exclude: [product.id],
    });
    return rand;
  });

  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const maxAvailable = product ? product.stockQuantity - inCart : 0;
  const canAdd = Boolean(product?.inStock && maxAvailable >= quantity && quantity > 0);

  function handleAddToCart() {
    if (!product || !canAdd) return;
    cart.add(product, quantity);
    toast.success(
      `${quantity} × ${product.name} added to cart`,
      {
        action: {
          label: "View Cart",
          onClick: () => router.push("/cart"),
        },
      },
    );
    setQuantity(1);
  }

  function handleBuyNow() {
    if (!product || !canAdd) return;
    cart.add(product, quantity);
    router.push("/cart");
  }

  function handleShare() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  }

  if (productLoad.loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="size-16 rounded-xl" />
              <Skeleton className="size-16 rounded-xl" />
              <Skeleton className="size-16 rounded-xl" />
            </div>
          </div>
          <div className="space-y-4 lg:col-span-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (productLoad.error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <PackageIcon className="size-7" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The product you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">
              <HomeIcon data-icon="inline-start" />
              Back to Home
            </Link>
          </Button>
          <Button asChild>
            <Link href="/search">
              Browse Catalogue
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Ensure image list always includes primary imageUrl and any secondary images
  const allImages = (
    product.images && product.images.length > 0
      ? product.images
      : [product.imageUrl]
  ).filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <HomeIcon className="size-3.5" />
          <span>Home</span>
        </Link>
        {product.categoryPath.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1.5">
            <ChevronRightIcon className="size-3 text-muted-foreground/50" />
            <Link
              href={`/search?categoryId=${crumb.id}`}
              className="hover:text-foreground transition-colors"
            >
              {crumb.name}
            </Link>
          </span>
        ))}
        <ChevronRightIcon className="size-3 text-muted-foreground/50" />
        <span className="font-medium text-foreground truncate max-w-50 sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Gallery & Magnifier */}
        <div className="lg:col-span-7">
          <ProductImageGallery
            images={allImages}
            productName={product.name}
            inStock={product.inStock}
            stockQuantity={product.stockQuantity}
          />
        </div>

        {/* Right Column: Product Info & Purchase Actions */}
        <div className="flex flex-col lg:col-span-5">
          {/* Category & Share Row */}
          <div className="flex items-center justify-between gap-2">
            {product.categoryPath.length > 0 ? (
              <Link
                href={`/search?categoryId=${product.categoryPath.at(-1)?.id}`}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {product.categoryPath.at(-1)?.name}
              </Link>
            ) : (
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Catalogue
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full text-muted-foreground hover:text-foreground"
              title="Share product link"
              onClick={handleShare}
            >
              <Share2Icon className="size-4" />
            </Button>
          </div>

          {/* Product Title */}
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {product.name}
          </h1>

          {/* Price & Stock Status */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-heading text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {money(product.price)}
            </span>
            {product.inStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" />
                {product.stockQuantity > 5
                  ? `In Stock (${product.stockQuantity} available)`
                  : `Only ${product.stockQuantity} left in stock!`}
              </span>
            ) : (
              <Badge variant="secondary">Sold out</Badge>
            )}
          </div>

          {/* Cart Quantity Info if Already in Cart */}
          {inCart > 0 && (
            <p className="mt-2 text-xs font-medium text-brand">
              ✓ You currently have {inCart} {inCart === 1 ? "unit" : "units"} in your cart
            </p>
          )}

          {/* Purchase Actions & Quantity Controls */}
          <div className="mt-6 rounded-2xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs">
            {product.inStock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </span>
                  <div className="inline-flex items-center rounded-xl border bg-background p-1 shadow-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      <MinusIcon className="size-3.5" />
                    </Button>
                    <span className="min-w-10 px-2 text-center font-heading text-sm font-semibold tabular-nums text-foreground">
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      disabled={quantity >= maxAvailable}
                      onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                      aria-label="Increase quantity"
                    >
                      <PlusIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full gap-2 rounded-xl font-semibold shadow-xs"
                    disabled={!canAdd}
                    onClick={handleAddToCart}
                  >
                    <ShoppingBagIcon className="size-4" />
                    Add to Cart
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    className="w-full gap-2 rounded-xl font-semibold bg-brand text-brand-foreground hover:bg-brand/90 shadow-xs"
                    disabled={!canAdd}
                    onClick={handleBuyNow}
                  >
                    <ZapIcon className="size-4" />
                    Buy Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="font-semibold text-sm text-muted-foreground">
                  This item is currently sold out.
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Check back later or explore similar products below.
                </p>
              </div>
            )}
          </div>

          {/* Guarantees & Value Props */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-y py-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <TruckIcon className="size-4 text-brand shrink-0" />
              <span>Fast shipping & delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-brand shrink-0" />
              <span>100% genuine guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCwIcon className="size-4 text-brand shrink-0" />
              <span>30-day hassle-free returns</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="size-4 text-brand shrink-0" />
              <span>Secure encrypted checkout</span>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-6 space-y-2">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
              Description
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
              {product.description}
            </div>
          </div>

          {/* Product Specifications */}
          <div className="mt-6 space-y-2 pt-4 border-t">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
              Product Details
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Product ID</dt>
              <dd className="font-medium text-foreground">#{product.id}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium text-foreground">
                {product.categoryPath.map((c) => c.name).join(" / ") || "General"}
              </dd>
              <dt className="text-muted-foreground">Total Photos</dt>
              <dd className="font-medium text-foreground">{allImages.length} {allImages.length === 1 ? "image" : "images"}</dd>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="font-medium text-foreground">
                {product.inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Similar / Related Products Section */}
      {similarLoad.data && similarLoad.data.length > 0 && (
        <section className="mt-16 sm:mt-20 border-t pt-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                Similar Products
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Customers interested in this item also viewed these products
              </p>
            </div>
            {product.categoryId && (
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href={`/search?categoryId=${product.categoryId}`}>
                  View all
                  <ChevronRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            )}
          </div>
          {/* Note: ProductGrid displays exactly one cover image per product and links to its PDP */}
          <ProductGrid products={similarLoad.data} columns={4} />
        </section>
      )}
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-24">
          <Loading label="Loading product…" />
        </div>
      }
    >
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
