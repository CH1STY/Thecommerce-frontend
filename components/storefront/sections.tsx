"use client";

import { ArrowRightIcon, EyeOffIcon, FolderIcon } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCategoryTree } from "@/components/categories";
import {
  ProductCarousel,
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { safeLink } from "@/lib/format";
import type {
  AnnouncementSection,
  BannersSection,
  CategoriesSection,
  HeroSection,
  ProductLayout,
  ProductsSection,
  RandomProductsSection,
  Section,
  SimilarProductsSection,
  TextSection,
  Tone,
} from "@/lib/page-layout";
import {
  fetchProducts,
  fetchRandomProducts,
  fetchSimilarProducts,
} from "@/lib/products";
import type { CategoryNode, Product } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

/** What the search page knows, for the "similar" and "random" sections. */
export interface SearchInfo {
  q: string;
  categoryId: number | null;
  /** Ids of the search results; undefined while they load. */
  resultIds: number[] | undefined;
}

interface Env {
  preview: boolean;
  search: SearchInfo | null;
  /** Similar products of the current search (shared by all sections); undefined while loading or unused. */
  similar: Product[] | undefined;
}

const EnvContext = createContext<Env>({
  preview: false,
  search: null,
  similar: undefined,
});

const useEnv = () => useContext(EnvContext);

const TONE_CLASSES: Record<Tone, string> = {
  brand: "bg-brand text-brand-foreground",
  dark: "bg-zinc-950 text-zinc-50 dark:bg-zinc-900 dark:ring-1 dark:ring-white/10",
  light: "bg-card text-card-foreground ring-1 ring-border",
  muted: "bg-muted text-foreground",
};

const onDarkTone = (tone: Tone, hasImage: boolean) =>
  hasImage || tone === "brand" || tone === "dark";

export function SectionList({
  sections,
  preview = false,
  selectedId = null,
  search = null,
}: {
  sections: Section[];
  preview?: boolean;
  selectedId?: string | null;
  search?: SearchInfo | null;
}) {
  const visible = sections.filter((s) => !s.hidden);
  const similarSections = visible.filter(
    (s): s is SimilarProductsSection => s.type === "similarProducts",
  );
  const needsSimilar =
    search !== null &&
    (similarSections.length > 0 ||
      visible.some((s) => s.type === "randomProducts" && s.onlyWhenNoSimilar));
  const similarLimit = Math.max(8, ...similarSections.map((s) => s.limit));
  const similar = useLoad(
    needsSimilar && search
      ? `similar|${search.q}|${search.categoryId}|${similarLimit}`
      : null,
    () =>
      fetchSimilarProducts({
        q: search?.q,
        categoryId: search?.categoryId ?? undefined,
        limit: similarLimit,
      }),
  );
  const similarProducts = needsSimilar
    ? (similar.data ?? (similar.error ? [] : undefined))
    : undefined;
  const env: Env = { preview, search, similar: similarProducts };

  if (preview && visible.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <PreviewNote>
          No visible sections. Add one from the designer&apos;s palette.
        </PreviewNote>
      </div>
    );
  }

  return (
    <EnvContext value={env}>
      {visible.map((section) => (
        <div
          key={section.id}
          data-section-id={section.id}
          className={cn(
            section.hideOnMobile && "max-md:hidden",
            section.hideOnDesktop && "md:hidden",
            preview &&
              "relative cursor-pointer transition-[outline] hover:outline-2 hover:-outline-offset-2 hover:outline-brand/50 hover:outline-dashed",
            preview &&
              selectedId === section.id &&
              "outline-2 -outline-offset-2 outline-brand outline-solid hover:outline-solid",
          )}
        >
          <SectionView section={section} />
        </div>
      ))}
    </EnvContext>
  );
}

function SectionView({ section }: { section: Section }) {
  switch (section.type) {
    case "announcement":
      return <Announcement section={section} />;
    case "hero":
      return <Hero section={section} />;
    case "categories":
      return <Categories section={section} />;
    case "products":
      return <Products section={section} />;
    case "banners":
      return <Banners section={section} />;
    case "text":
      return <TextBlock section={section} />;
    case "similarProducts":
      return <SimilarProducts section={section} />;
    case "randomProducts":
      return <RandomProducts section={section} />;
  }
}

// ---- Building blocks ------------------------------------------------------------------------------

function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-5 md:py-7", className)}>
      {children}
    </section>
  );
}

function PreviewNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
      <EyeOffIcon className="size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Internal paths use client navigation; absolute URLs open in a new tab. Unsafe links render as plain text. */
function SmartLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const safe = safeLink(href);
  if (!safe) return <span className={className}>{children}</span>;
  if (safe.startsWith("/")) {
    return (
      <Link href={safe} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
      {children}
    </a>
  );
}

function CoverImage({ src, className }: { src: string; className?: string }) {
  const safe = safeLink(src);
  if (!safe) return null;
  return (
    // Images are arbitrary URLs chosen by the admin, so next/image (remotePatterns) isn't used.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={safe} alt="" loading="lazy" className={cn("object-cover", className)} />
  );
}

function SectionHeading({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  if (!title && !subtitle && !viewAllHref) return null;
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {title && (
          <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
        )}
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Button asChild variant="link" className="shrink-0 px-0">
          <SmartLink href={viewAllHref}>
            {viewAllLabel}
            <ArrowRightIcon data-icon="inline-end" />
          </SmartLink>
        </Button>
      )}
    </div>
  );
}

function ProductList({
  products,
  layout,
  columns,
  label,
}: {
  products: Product[];
  layout: ProductLayout;
  columns: number;
  label: string;
}) {
  return layout === "carousel" ? (
    <ProductCarousel products={products} columns={columns} label={label} />
  ) : (
    <ProductGrid products={products} columns={columns} />
  );
}

// ---- Sections -------------------------------------------------------------------------------------

function Announcement({ section }: { section: AnnouncementSection }) {
  if (!section.text && !section.linkLabel) return null;
  return (
    <div className={cn(TONE_CLASSES[section.tone], "rounded-none ring-0")}>
      <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium sm:text-sm">
        {section.text}
        {section.linkLabel && section.href && (
          <SmartLink
            href={section.href}
            className="ml-2 whitespace-nowrap underline underline-offset-4 hover:opacity-80"
          >
            {section.linkLabel}
          </SmartLink>
        )}
      </p>
    </div>
  );
}

const HERO_HEIGHTS = {
  sm: "min-h-48 sm:min-h-56",
  md: "min-h-72 sm:min-h-80",
  lg: "min-h-80 sm:min-h-[28rem]",
};

function Hero({ section }: { section: HeroSection }) {
  const hasImage = Boolean(safeLink(section.imageUrl));
  const inverted = onDarkTone(section.tone, hasImage);
  const center = section.align === "center";
  return (
    <Container className="py-3 md:py-4">
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-2xl",
          TONE_CLASSES[section.tone],
          hasImage && "bg-zinc-950 text-zinc-50 ring-0",
        )}
      >
        {hasImage && (
          <>
            <CoverImage src={section.imageUrl} className="absolute inset-0 -z-10 size-full" />
            <div
              className={cn(
                "absolute inset-0 -z-10",
                center
                  ? "bg-black/50"
                  : "bg-linear-to-r from-black/75 via-black/45 to-black/10",
              )}
            />
          </>
        )}
        <div
          className={cn(
            "flex flex-col justify-center gap-4 p-6 sm:p-10 lg:p-14",
            HERO_HEIGHTS[section.height],
            center ? "items-center text-center" : "max-w-2xl",
          )}
        >
          {section.eyebrow && (
            <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">
              {section.eyebrow}
            </p>
          )}
          {section.title && (
            <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {section.title}
            </h2>
          )}
          {section.subtitle && (
            <p
              className={cn(
                "max-w-xl text-sm text-pretty sm:text-base",
                inverted ? "opacity-85" : "text-muted-foreground",
              )}
            >
              {section.subtitle}
            </p>
          )}
          {(section.ctaLabel || section.secondaryLabel) && (
            <div className={cn("flex flex-wrap gap-3 pt-2", center && "justify-center")}>
              {section.ctaLabel && (
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "h-10 px-5",
                    inverted && "bg-white text-zinc-950 hover:bg-white/90",
                  )}
                >
                  <SmartLink href={section.ctaHref}>{section.ctaLabel}</SmartLink>
                </Button>
              )}
              {section.secondaryLabel && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={cn(
                    "h-10 px-5",
                    inverted &&
                      "border-white/40 bg-transparent text-current hover:bg-white/10 hover:text-current dark:bg-transparent",
                  )}
                >
                  <SmartLink href={section.secondaryHref}>{section.secondaryLabel}</SmartLink>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function Categories({ section }: { section: CategoriesSection }) {
  const { preview } = useEnv();
  const tree = useCategoryTree();
  const byId = useMemo(() => {
    const map = new Map<number, CategoryNode>();
    const walk = (nodes: CategoryNode[]) =>
      nodes.forEach((n) => {
        map.set(n.id, n);
        walk(n.children);
      });
    walk(tree.data ?? []);
    return map;
  }, [tree.data]);

  const tiles = (
    section.items.length > 0
      ? section.items.map((item) => ({
          node: byId.get(item.categoryId),
          imageUrl:
            item.imageUrl || byId.get(item.categoryId)?.imageUrl || "",
        }))
      : (tree.data ?? []).map((node) => ({
          node,
          imageUrl: node.imageUrl || "",
        }))
  ).filter((t): t is { node: CategoryNode; imageUrl: string } => t.node !== undefined);

  if (tree.loading && !tree.data) {
    return (
      <Container>
        <Skeleton className="mb-4 h-7 w-48" />
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-4/3 rounded-xl" />
          ))}
        </div>
      </Container>
    );
  }
  if (tiles.length === 0) {
    return preview ? (
      <Container>
        <PreviewNote>
          “{section.title || "Category tiles"}” is hidden: there are no categories to show yet.
        </PreviewNote>
      </Container>
    ) : null;
  }

  const href = (id: number) => `/search?category=${id}`;
  return (
    <Container>
      <SectionHeading title={section.title} subtitle={section.subtitle} />
      {section.style === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {tiles.map(({ node }) => (
            <Button key={node.id} asChild variant="outline" className="rounded-full">
              <Link href={href(node.id)}>{node.name}</Link>
            </Button>
          ))}
        </div>
      ) : section.style === "circles" ? (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:gap-6 scroll-smooth">
          {tiles.map(({ node, imageUrl }) => (
            <Link
              key={node.id}
              href={href(node.id)}
              className="group/tile flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-24"
            >
              <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border transition group-hover/tile:ring-2 group-hover/tile:ring-foreground sm:size-24">
                {safeLink(imageUrl) ? (
                  <CoverImage src={imageUrl} className="size-full" />
                ) : (
                  <span className="font-heading text-2xl font-semibold text-muted-foreground">
                    {node.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-xs font-medium sm:text-sm">{node.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map(({ node, imageUrl }) => (
            <Link
              key={node.id}
              href={href(node.id)}
              className="group/tile relative isolate flex aspect-4/3 items-end overflow-hidden rounded-xl bg-muted ring-1 ring-border"
            >
              {safeLink(imageUrl) ? (
                <>
                  <CoverImage
                    src={imageUrl}
                    className="absolute inset-0 -z-10 size-full transition-transform duration-300 group-hover/tile:scale-105"
                  />
                  <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/70 to-transparent" />
                </>
              ) : (
                <FolderIcon className="absolute top-3 right-3 size-5 text-muted-foreground/60" />
              )}
              <span
                className={cn(
                  "w-full p-3 text-sm font-semibold",
                  safeLink(imageUrl) ? "text-white" : "group-hover/tile:underline",
                )}
              >
                {node.name}
                {node.children.length > 0 && (
                  <span
                    className={cn(
                      "block text-xs font-normal",
                      safeLink(imageUrl) ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    {node.children.length} sub-categor{node.children.length === 1 ? "y" : "ies"}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

function viewAllHref(section: ProductsSection) {
  switch (section.source) {
    case "newest":
      return "/search?sort=NEWEST";
    case "category":
      return section.categoryId ? `/search?category=${section.categoryId}` : "/search";
    case "search":
      return section.query.trim()
        ? `/search?q=${encodeURIComponent(section.query.trim())}`
        : "/search";
    case "priceLow":
      return "/search?sort=PRICE_ASC";
    case "priceHigh":
      return "/search?sort=PRICE_DESC";
    default:
      return "/search";
  }
}

function Products({ section }: { section: ProductsSection }) {
  const { preview } = useEnv();
  const missing =
    section.source === "category" && section.categoryId === null
      ? "Pick a category for this list."
      : section.source === "manual" && section.productIds.length === 0
        ? "Pick the products to show."
        : null;

  const key = missing
    ? null
    : `section-products|${JSON.stringify([
        section.source,
        section.categoryId,
        section.query,
        section.productIds,
        section.limit,
        section.inStockOnly,
      ])}`;
  const products = useLoad(key, () => {
    const common = { limit: section.limit, inStock: section.inStockOnly };
    switch (section.source) {
      case "random":
        return fetchRandomProducts(common);
      case "category":
        return fetchProducts({ ...common, categoryId: section.categoryId ?? undefined });
      case "search":
        return fetchProducts({ ...common, q: section.query });
      case "manual":
        return fetchProducts({ ...common, ids: section.productIds });
      case "priceLow":
        return fetchProducts({ ...common, sort: "PRICE_ASC" });
      case "priceHigh":
        return fetchProducts({ ...common, sort: "PRICE_DESC" });
      default:
        return fetchProducts({ ...common, sort: "NEWEST" });
    }
  });

  if (missing || (products.data && products.data.length === 0) || (products.error && !products.data)) {
    return preview ? (
      <Container>
        <PreviewNote>
          “{section.title || "Product list"}” is hidden:{" "}
          {missing ?? (products.error ? products.error.message : "no products match it.")}
        </PreviewNote>
      </Container>
    ) : null;
  }

  return (
    <Container>
      <SectionHeading
        title={section.title}
        subtitle={section.subtitle}
        viewAllHref={section.showViewAll ? viewAllHref(section) : undefined}
      />
      {products.data ? (
        <ProductList
          products={products.data}
          layout={section.layout}
          columns={section.columns}
          label={section.title || "Products"}
        />
      ) : (
        <ProductGridSkeleton count={Math.min(section.columns, section.limit)} columns={section.columns} />
      )}
    </Container>
  );
}

const BANNER_COLUMNS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

function Banners({ section }: { section: BannersSection }) {
  const { preview } = useEnv();
  if (section.items.length === 0) {
    return preview ? (
      <Container>
        <PreviewNote>“{section.title || "Promo banners"}” has no banners yet.</PreviewNote>
      </Container>
    ) : null;
  }
  return (
    <Container>
      <SectionHeading title={section.title} />
      <div className={cn("grid gap-4", BANNER_COLUMNS[section.items.length])}>
        {section.items.map((item, index) => {
          const hasImage = Boolean(safeLink(item.imageUrl));
          const inverted = onDarkTone(item.tone, hasImage);
          const content = (
            <>
              {hasImage && (
                <>
                  <CoverImage
                    src={item.imageUrl}
                    className="absolute inset-0 -z-10 size-full transition-transform duration-300 group-hover/banner:scale-105"
                  />
                  <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
                </>
              )}
              {item.title && (
                <h3 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                  {item.title}
                </h3>
              )}
              {item.text && (
                <p className={cn("text-sm", inverted ? "opacity-85" : "text-muted-foreground")}>
                  {item.text}
                </p>
              )}
              {item.ctaLabel && (
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover/banner:underline">
                  {item.ctaLabel}
                  <ArrowRightIcon className="size-4" />
                </span>
              )}
            </>
          );
          const className = cn(
            "group/banner relative isolate flex min-h-44 flex-col justify-end gap-1 overflow-hidden rounded-2xl p-6 sm:min-h-52",
            TONE_CLASSES[item.tone],
            hasImage && "bg-zinc-950 text-zinc-50 ring-0",
          );
          return safeLink(item.href) ? (
            <SmartLink key={index} href={item.href} className={className}>
              {content}
            </SmartLink>
          ) : (
            <div key={index} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </Container>
  );
}

function TextBlock({ section }: { section: TextSection }) {
  if (!section.title && !section.body) return null;
  return (
    <Container>
      <div className={cn("max-w-3xl", section.align === "center" ? "mx-auto text-center" : "")}>
        {section.title && (
          <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {section.title}
          </h2>
        )}
        {section.body && (
          <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground sm:text-base">
            {section.body}
          </p>
        )}
      </div>
    </Container>
  );
}

function SimilarProducts({ section }: { section: SimilarProductsSection }) {
  const { preview, search, similar } = useEnv();
  if (!search) {
    return preview ? (
      <Container>
        <PreviewNote>Similar products only appear on the search page.</PreviewNote>
      </Container>
    ) : null;
  }
  const products = similar
    ?.filter((p) => !section.inStockOnly || p.inStock)
    .slice(0, section.limit);
  if (products && products.length === 0) {
    return preview ? (
      <Container>
        <PreviewNote>
          “{section.title || "Similar products"}” is hidden: nothing similar to this search.
        </PreviewNote>
      </Container>
    ) : null;
  }
  return (
    <Container>
      <SectionHeading title={section.title} subtitle={section.subtitle} />
      {products ? (
        <ProductList
          products={products}
          layout={section.layout}
          columns={section.columns}
          label={section.title || "Similar products"}
        />
      ) : (
        <ProductGridSkeleton count={section.columns} columns={section.columns} />
      )}
    </Container>
  );
}

function RandomProducts({ section }: { section: RandomProductsSection }) {
  const { preview, search, similar } = useEnv();
  const waitingForSimilar = section.onlyWhenNoSimilar && search !== null && similar === undefined;
  const suppressed = section.onlyWhenNoSimilar && similar !== undefined && similar.length > 0;
  const exclude = [...(search?.resultIds ?? []).slice(0, 150), ...(similar ?? []).map((p) => p.id)];
  const ready = !waitingForSimilar && !suppressed && (!search || search.resultIds !== undefined);

  const products = useLoad(
    ready ? `random|${section.id}|${section.limit}|${section.inStockOnly}|${exclude.join(",")}` : null,
    () => fetchRandomProducts({ limit: section.limit, inStock: section.inStockOnly, exclude }),
  );

  if (suppressed || (products.data && products.data.length === 0)) {
    return preview ? (
      <Container>
        <PreviewNote>
          “{section.title || "Random products"}” is hidden:{" "}
          {suppressed
            ? "similar products were found (it only shows when there are none)."
            : "there are no other products."}
        </PreviewNote>
      </Container>
    ) : null;
  }
  if (products.error && !products.data) return null;
  return (
    <Container>
      <SectionHeading title={section.title} subtitle={section.subtitle} />
      {products.data ? (
        <ProductList
          products={products.data}
          layout={section.layout}
          columns={section.columns}
          label={section.title || "Products"}
        />
      ) : (
        <ProductGridSkeleton count={section.columns} columns={section.columns} />
      )}
    </Container>
  );
}

/** Skeleton shown while a page's layout loads. */
export function SectionsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
