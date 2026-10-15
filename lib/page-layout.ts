// Storefront sections edited in /admin/storefront and rendered on the home and search pages.
// Saved as JSON through PUT /api/layouts/{page}; the backend checks ids, types, sizes and links,
// everything else is normalised here so a bad or older layout can never break the storefront.

import type { LayoutPage } from "@/lib/types";

export type SectionType =
  | "announcement"
  | "hero"
  | "categories"
  | "products"
  | "banners"
  | "text"
  | "similarProducts"
  | "randomProducts";

export type Tone = "brand" | "dark" | "light" | "muted";
export const TONES: Tone[] = ["brand", "dark", "light", "muted"];

interface SectionBase<T extends SectionType> {
  id: string;
  type: T;
  /** Kept in the layout but not shown. */
  hidden: boolean;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface AnnouncementSection extends SectionBase<"announcement"> {
  text: string;
  linkLabel: string;
  href: string;
  tone: Tone;
}

export interface HeroSection extends SectionBase<"hero"> {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  align: "left" | "center";
  tone: Tone;
  height: "sm" | "md" | "lg";
}

export interface CategoryTile {
  categoryId: number;
  imageUrl: string;
}

export interface CategoriesSection extends SectionBase<"categories"> {
  title: string;
  subtitle: string;
  style: "tiles" | "circles" | "chips";
  /** Empty = every top-level category. */
  items: CategoryTile[];
}

export type ProductSource =
  | "newest"
  | "category"
  | "search"
  | "manual"
  | "random"
  | "priceLow"
  | "priceHigh";

export const PRODUCT_SOURCES: { value: ProductSource; label: string }[] = [
  { value: "newest", label: "Newest products" },
  { value: "category", label: "From a category" },
  { value: "search", label: "Matching a search" },
  { value: "manual", label: "Hand-picked products" },
  { value: "random", label: "Random products" },
  { value: "priceLow", label: "Lowest price first" },
  { value: "priceHigh", label: "Highest price first" },
];

export type ProductLayout = "grid" | "carousel";

export interface ProductListOptions {
  title: string;
  subtitle: string;
  limit: number;
  layout: ProductLayout;
  /** Desktop grid columns (mobile shows 2, tablet 3). */
  columns: number;
  inStockOnly: boolean;
}

export interface ProductsSection
  extends SectionBase<"products">,
    ProductListOptions {
  source: ProductSource;
  categoryId: number | null;
  query: string;
  productIds: number[];
  showViewAll: boolean;
}

export interface BannerItem {
  title: string;
  text: string;
  imageUrl: string;
  href: string;
  ctaLabel: string;
  tone: Tone;
}

export interface BannersSection extends SectionBase<"banners"> {
  title: string;
  items: BannerItem[];
}

export interface TextSection extends SectionBase<"text"> {
  title: string;
  body: string;
  align: "left" | "center";
}

export interface SimilarProductsSection
  extends SectionBase<"similarProducts">,
    ProductListOptions {}

export interface RandomProductsSection
  extends SectionBase<"randomProducts">,
    ProductListOptions {
  /** Show only when the search found nothing similar (the "fallback" section). */
  onlyWhenNoSimilar: boolean;
}

export type Section =
  | AnnouncementSection
  | HeroSection
  | CategoriesSection
  | ProductsSection
  | BannersSection
  | TextSection
  | SimilarProductsSection
  | RandomProductsSection;

export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

export const MAX_SECTIONS = 40;
export const MAX_BANNERS = 4;
export const MAX_PRODUCTS = 24;
export const MAX_TEXT = 2000;

export const SECTION_META: Record<
  SectionType,
  { label: string; description: string; pages: LayoutPage[] }
> = {
  announcement: {
    label: "Announcement bar",
    description: "A slim full-width strip with a message and link.",
    pages: ["home", "search"],
  },
  hero: {
    label: "Hero banner",
    description: "Big headline with buttons and an optional image.",
    pages: ["home"],
  },
  categories: {
    label: "Category tiles",
    description: "Shortcuts to categories as tiles, circles or chips.",
    pages: ["home"],
  },
  products: {
    label: "Product list",
    description: "Newest, a category, a search, random or hand-picked.",
    pages: ["home", "search"],
  },
  banners: {
    label: "Promo banners",
    description: "One to four promotional tiles side by side.",
    pages: ["home", "search"],
  },
  text: {
    label: "Text block",
    description: "A heading and a paragraph.",
    pages: ["home", "search"],
  },
  similarProducts: {
    label: "Similar products",
    description: "Products related to the search (same categories, words).",
    pages: ["search"],
  },
  randomProducts: {
    label: "Random products",
    description:
      "Random picks — by default only when nothing similar was found.",
    pages: ["search"],
  },
};

export const PAGE_META: Record<
  LayoutPage,
  { label: string; description: string }
> = {
  home: {
    label: "Home page",
    description: "The landing page at /.",
  },
  search: {
    label: "Search results",
    description: "Sections shown below the results on /search.",
  },
};

export function sectionTypesFor(page: LayoutPage) {
  return (Object.keys(SECTION_META) as SectionType[]).filter((type) =>
    SECTION_META[type].pages.includes(page),
  );
}

export function newSectionId(type: SectionType) {
  // randomUUID needs a secure context; the shop may be served over plain http on a LAN.
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${type}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const base = <T extends SectionType>(id: string, type: T) => ({
  id,
  type,
  hidden: false,
  hideOnMobile: false,
  hideOnDesktop: false,
});

const listOptions = (title: string): ProductListOptions => ({
  title,
  subtitle: "",
  limit: 8,
  layout: "carousel",
  columns: 4,
  inStockOnly: false,
});

export function newBanner(): BannerItem {
  return {
    title: "Promo title",
    text: "A short line about the offer.",
    imageUrl: "",
    href: "/search",
    ctaLabel: "Shop now",
    tone: "muted",
  };
}

/** A section of `type` with sensible starting content. */
export function createSection<T extends SectionType>(
  type: T,
  id = newSectionId(type),
): SectionOf<T> {
  const sections: { [K in SectionType]: SectionOf<K> } = {
    announcement: {
      ...base(id, "announcement"),
      text: "Check out as a guest — no account needed",
      linkLabel: "Shop new arrivals",
      href: "/search?sort=NEWEST",
      tone: "brand",
    },
    hero: {
      ...base(id, "hero"),
      eyebrow: "New season",
      title: "Everything you need, all in one place",
      subtitle:
        "Browse the whole catalogue, filter by price and category, and check out in minutes.",
      imageUrl: "",
      ctaLabel: "Shop now",
      ctaHref: "/search",
      secondaryLabel: "New arrivals",
      secondaryHref: "/search?sort=NEWEST",
      align: "left",
      tone: "dark",
      height: "md",
    },
    categories: {
      ...base(id, "categories"),
      title: "Shop by category",
      subtitle: "",
      style: "tiles",
      items: [],
    },
    products: {
      ...base(id, "products"),
      ...listOptions("New arrivals"),
      source: "newest",
      categoryId: null,
      query: "",
      productIds: [],
      showViewAll: true,
    },
    banners: {
      ...base(id, "banners"),
      title: "",
      items: [newBanner(), { ...newBanner(), tone: "brand" }],
    },
    text: {
      ...base(id, "text"),
      title: "About our shop",
      body: "Tell customers what makes your shop special.",
      align: "center",
    },
    similarProducts: {
      ...base(id, "similarProducts"),
      ...listOptions("Similar products"),
    },
    randomProducts: {
      ...base(id, "randomProducts"),
      ...listOptions("You might also like"),
      layout: "grid",
      onlyWhenNoSimilar: true,
    },
  };
  return sections[type] as SectionOf<T>;
}

export function defaultSections(page: LayoutPage): Section[] {
  if (page === "search") {
    return [
      createSection("similarProducts", "similar"),
      createSection("randomProducts", "random"),
    ];
  }
  return [
    createSection("announcement", "announcement"),
    createSection("hero", "hero"),
    createSection("categories", "categories"),
    createSection("products", "new-arrivals"),
    {
      ...createSection("banners", "promos"),
      items: [
        {
          title: "Best value",
          text: "Our most affordable picks, cheapest first.",
          imageUrl: "",
          href: "/search?sort=PRICE_ASC",
          ctaLabel: "Shop deals",
          tone: "muted",
        },
        {
          title: "Ready to ship",
          text: "Everything that's in stock right now.",
          imageUrl: "",
          href: "/search?inStock=true",
          ctaLabel: "Browse in stock",
          tone: "brand",
        },
      ],
    },
    {
      ...createSection("products", "discover"),
      title: "Discover something new",
      source: "random",
      layout: "grid",
      showViewAll: false,
    },
  ];
}

// ---- Normalisation of stored JSON ---------------------------------------------------------------

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback: string) =>
  typeof value === "string" ? value.slice(0, MAX_TEXT) : fallback;

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const int = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T) {
  return options.includes(value as T) ? (value as T) : fallback;
}

const ids = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (v): v is number =>
              typeof v === "number" && Number.isInteger(v) && v > 0,
          ),
        ),
      ]
    : [];

function normalizeList(raw: Raw, fallback: ProductListOptions): ProductListOptions {
  return {
    title: str(raw.title, fallback.title),
    subtitle: str(raw.subtitle, fallback.subtitle),
    limit: int(raw.limit, fallback.limit, 1, MAX_PRODUCTS),
    layout: oneOf(raw.layout, ["grid", "carousel"] as const, fallback.layout),
    columns: int(raw.columns, fallback.columns, 3, 6),
    inStockOnly: bool(raw.inStockOnly, fallback.inStockOnly),
  };
}

function normalizeSection(raw: unknown, page: LayoutPage): Section | null {
  if (!isRecord(raw) || typeof raw.type !== "string" || typeof raw.id !== "string") return null;
  const type = raw.type as SectionType;
  if (!SECTION_META[type]?.pages.includes(page)) return null;
  const d = createSection(type, raw.id);
  const common = {
    id: raw.id,
    hidden: bool(raw.hidden, false),
    hideOnMobile: bool(raw.hideOnMobile, false),
    hideOnDesktop: bool(raw.hideOnDesktop, false),
  };
  switch (d.type) {
    case "announcement":
      return {
        ...d,
        ...common,
        text: str(raw.text, d.text),
        linkLabel: str(raw.linkLabel, d.linkLabel),
        href: str(raw.href, d.href),
        tone: oneOf(raw.tone, TONES, d.tone),
      };
    case "hero":
      return {
        ...d,
        ...common,
        eyebrow: str(raw.eyebrow, d.eyebrow),
        title: str(raw.title, d.title),
        subtitle: str(raw.subtitle, d.subtitle),
        imageUrl: str(raw.imageUrl, d.imageUrl),
        ctaLabel: str(raw.ctaLabel, d.ctaLabel),
        ctaHref: str(raw.ctaHref, d.ctaHref),
        secondaryLabel: str(raw.secondaryLabel, d.secondaryLabel),
        secondaryHref: str(raw.secondaryHref, d.secondaryHref),
        align: oneOf(raw.align, ["left", "center"] as const, d.align),
        tone: oneOf(raw.tone, TONES, d.tone),
        height: oneOf(raw.height, ["sm", "md", "lg"] as const, d.height),
      };
    case "categories":
      return {
        ...d,
        ...common,
        title: str(raw.title, d.title),
        subtitle: str(raw.subtitle, d.subtitle),
        style: oneOf(raw.style, ["tiles", "circles", "chips"] as const, d.style),
        items: Array.isArray(raw.items)
          ? raw.items
              .filter(isRecord)
              .filter((item) => Number.isInteger(item.categoryId))
              .map((item) => ({
                categoryId: item.categoryId as number,
                imageUrl: str(item.imageUrl, ""),
              }))
          : [],
      };
    case "products":
      return {
        ...d,
        ...common,
        ...normalizeList(raw, d),
        source: oneOf(
          raw.source,
          PRODUCT_SOURCES.map((s) => s.value),
          d.source,
        ),
        categoryId: Number.isInteger(raw.categoryId) ? (raw.categoryId as number) : null,
        query: str(raw.query, d.query),
        productIds: ids(raw.productIds).slice(0, MAX_PRODUCTS),
        showViewAll: bool(raw.showViewAll, d.showViewAll),
      };
    case "banners":
      return {
        ...d,
        ...common,
        title: str(raw.title, d.title),
        items: Array.isArray(raw.items)
          ? raw.items
              .filter(isRecord)
              .slice(0, MAX_BANNERS)
              .map((item) => {
                const b = newBanner();
                return {
                  title: str(item.title, ""),
                  text: str(item.text, ""),
                  imageUrl: str(item.imageUrl, ""),
                  href: str(item.href, ""),
                  ctaLabel: str(item.ctaLabel, ""),
                  tone: oneOf(item.tone, TONES, b.tone),
                };
              })
          : d.items,
      };
    case "text":
      return {
        ...d,
        ...common,
        title: str(raw.title, d.title),
        body: str(raw.body, d.body),
        align: oneOf(raw.align, ["left", "center"] as const, d.align),
      };
    case "similarProducts":
      return { ...d, ...common, ...normalizeList(raw, d) };
    case "randomProducts":
      return {
        ...d,
        ...common,
        ...normalizeList(raw, d),
        onlyWhenNoSimilar: bool(raw.onlyWhenNoSimilar, d.onlyWhenNoSimilar),
      };
  }
}

/** Sections from the API (or a preview message); `null` = the built-in default. */
export function normalizeSections(raw: unknown, page: LayoutPage): Section[] {
  if (!Array.isArray(raw)) return defaultSections(page);
  const seen = new Set<string>();
  return raw
    .map((item) => normalizeSection(item, page))
    .filter((s): s is Section => {
      if (!s || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .slice(0, MAX_SECTIONS);
}

// ---- Live preview protocol (designer ⇄ iframe, same origin only) -------------------------------

/** Query parameter that puts a storefront page into preview mode inside the designer's iframe. */
export const PREVIEW_PARAM = "__preview";

export type DesignerMessage = {
  source: "tc-designer";
  kind: "layout";
  page: LayoutPage;
  sections: Section[];
  selectedId: string | null;
};

export type PreviewMessage =
  | { source: "tc-preview"; kind: "ready" }
  | { source: "tc-preview"; kind: "select"; id: string };
