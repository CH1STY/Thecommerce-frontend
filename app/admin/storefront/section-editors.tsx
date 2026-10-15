"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { CategorySelect, useCategoryTree } from "@/components/categories";
import {
  FormField,
  ProductImage,
  Select,
  TextArea,
  TextInput,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { humanize, safeLink } from "@/lib/format";
import {
  MAX_BANNERS,
  MAX_PRODUCTS,
  newBanner,
  PRODUCT_SOURCES,
  TONES,
  type BannerItem,
  type ProductListOptions,
  type ProductSource,
  type Section,
  type Tone,
} from "@/lib/page-layout";
import { fetchProducts } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import { useLoad } from "@/lib/use-load";

export const LINK_SUGGESTIONS_ID = "tc-designer-links";

type Patch<S extends Section> = (patch: Partial<S>) => void;

/** Shown when a link/image field holds something the storefront would refuse to render. */
export function linkError(value: string) {
  return value.trim() && !safeLink(value)
    ? "Use a site path like /search?q=shoes or a full https:// URL."
    : undefined;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  multiline?: boolean;
}) {
  return (
    <FormField label={label} hint={hint}>
      {multiline ? (
        <TextArea
          value={value}
          maxLength={2000}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextInput
          value={value}
          maxLength={500}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}

function LinkInput({
  label,
  value,
  onChange,
  image,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  image?: boolean;
}) {
  return (
    <FormField
      label={label}
      error={linkError(value)}
      hint={image ? "Full image URL (https://…). Leave empty for a plain colour." : "A site path (/search?…) or https:// URL."}
    >
      <TextInput
        value={value}
        maxLength={2000}
        list={image ? undefined : LINK_SUGGESTIONS_ID}
        placeholder={image ? "https://…" : "/search"}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-normal">{label}</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        className="w-full"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="flex-1">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

const TONE_SWATCH: Record<Tone, string> = {
  brand: "bg-brand",
  dark: "bg-zinc-950",
  light: "bg-card ring-1 ring-border",
  muted: "bg-muted",
};

function TonePicker({ value, onChange }: { value: Tone; onChange: (tone: Tone) => void }) {
  return (
    <div className="space-y-2">
      <Label className="font-normal">Colour</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value}
        onValueChange={(v) => v && onChange(v as Tone)}
        className="flex-wrap"
      >
        {TONES.map((tone) => (
          <ToggleGroupItem key={tone} value={tone} aria-label={humanize(tone)}>
            <span className={`size-3 rounded-full ${TONE_SWATCH[tone]}`} />
            {humanize(tone)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <FormField label={label} hint={`${min}–${max}`}>
      <TextInput
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </FormField>
  );
}

function MoveButtons({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUpIcon />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDownIcon />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={onRemove} className="text-destructive hover:text-destructive">
        <Trash2Icon />
      </Button>
    </div>
  );
}

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---- Product list options shared by products / similar / random --------------------------------

function ListOptions({
  section,
  update,
}: {
  section: ProductListOptions;
  update: (patch: Partial<ProductListOptions>) => void;
}) {
  return (
    <Group title="Display">
      <Choice
        label="Layout"
        value={section.layout}
        options={[
          { value: "carousel", label: "Carousel" },
          { value: "grid", label: "Grid" },
        ]}
        onChange={(layout) => update({ layout })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Products" value={section.limit} min={1} max={MAX_PRODUCTS} onChange={(limit) => update({ limit })} />
        <NumberField label="Desktop columns" value={section.columns} min={3} max={6} onChange={(columns) => update({ columns })} />
      </div>
      <Toggle
        label="In-stock products only"
        checked={section.inStockOnly}
        onChange={(inStockOnly) => update({ inStockOnly })}
      />
    </Group>
  );
}

function ProductPicker({ ids, onChange }: { ids: number[]; onChange: (ids: number[]) => void }) {
  const { money } = useSettings();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const picked = useLoad(ids.length > 0 ? `picked|${ids.join(",")}` : null, () => fetchProducts({ ids }));
  const results = useLoad(term ? `pick-search|${term}` : null, () => fetchProducts({ q: term, limit: 8 }));
  const byId = new Map((picked.data ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-3">
      <Label className="font-normal">Products ({ids.length}/{MAX_PRODUCTS})</Label>
      {ids.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {ids.map((id, index) => {
            const product = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 p-1.5 pl-2 text-sm">
                <ProductImage src={product?.imageUrl ?? ""} alt="" className="size-8 shrink-0 rounded" />
                <span className="min-w-0 flex-1 truncate">
                  {product?.name ?? (picked.loading ? "Loading…" : `Product #${id} (deleted)`)}
                </span>
                <MoveButtons
                  index={index}
                  count={ids.length}
                  label={product?.name ?? `product ${id}`}
                  onMove={(from, to) => onChange(move(ids, from, to))}
                  onRemove={() => onChange(ids.filter((x) => x !== id))}
                />
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(text.trim());
        }}
      >
        <TextInput value={text} placeholder="Find products to add…" onChange={(e) => setText(e.target.value)} aria-label="Find products" />
        <Button type="submit" variant="outline" size="icon" aria-label="Search products">
          <SearchIcon />
        </Button>
      </form>
      {results.data && (
        <ul className="max-h-64 divide-y overflow-y-auto scroll-smooth rounded-lg border">
          {results.data.length === 0 && <li className="p-2 text-sm text-muted-foreground">No matches.</li>}
          {results.data.map((p) => (
            <li key={p.id} className="flex items-center gap-2 p-1.5 pl-2 text-sm">
              <ProductImage src={p.imageUrl} alt="" className="size-8 shrink-0 rounded" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{money(p.price)}</span>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={ids.includes(p.id) || ids.length >= MAX_PRODUCTS}
                onClick={() => onChange([...ids, p.id])}
              >
                {ids.includes(p.id) ? "Added" : "Add"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryTilesEditor({
  items,
  onChange,
}: {
  items: { categoryId: number; imageUrl: string }[];
  onChange: (items: { categoryId: number; imageUrl: string }[]) => void;
}) {
  const tree = useCategoryTree();
  const roots = tree.data ?? [];
  const firstUnused = () => {
    const used = new Set(items.map((i) => i.categoryId));
    const walk = (nodes: typeof roots): number | undefined => {
      for (const n of nodes) {
        if (!used.has(n.id)) return n.id;
        const hit = walk(n.children);
        if (hit !== undefined) return hit;
      }
    };
    return walk(roots);
  };

  return (
    <div className="space-y-3">
      <Toggle
        label="Choose categories"
        description="Off: every top-level category, in A–Z order."
        checked={items.length > 0}
        onChange={(on) => {
          const id = firstUnused();
          onChange(on && id !== undefined ? [{ categoryId: id, imageUrl: "" }] : []);
        }}
      />
      {roots.length === 0 && !tree.loading && (
        <p className="text-xs text-muted-foreground">Create categories in Staff area → Categories first.</p>
      )}
      {items.map((item, index) => (
        <div key={`${item.categoryId}-${index}`} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategorySelect
                tree={roots}
                value={item.categoryId}
                emptyLabel="— Pick a category —"
                onChange={(id) =>
                  id !== null &&
                  onChange(items.map((it, i) => (i === index ? { ...it, categoryId: id } : it)))
                }
              />
            </div>
            <MoveButtons
              index={index}
              count={items.length}
              label="category"
              onMove={(from, to) => onChange(move(items, from, to))}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
            />
          </div>
          <LinkInput
            label="Image"
            image
            value={item.imageUrl}
            onChange={(imageUrl) => onChange(items.map((it, i) => (i === index ? { ...it, imageUrl } : it)))}
          />
        </div>
      ))}
      {items.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={firstUnused() === undefined}
          onClick={() => {
            const id = firstUnused();
            if (id !== undefined) onChange([...items, { categoryId: id, imageUrl: "" }]);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add category
        </Button>
      )}
    </div>
  );
}

function BannerItemsEditor({ items, onChange }: { items: BannerItem[]; onChange: (items: BannerItem[]) => void }) {
  const set = (index: number, patch: Partial<BannerItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="space-y-4 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">
              Banner {index + 1}
              {item.title && <span className="font-normal text-muted-foreground"> · {item.title}</span>}
            </p>
            <MoveButtons
              index={index}
              count={items.length}
              label={`banner ${index + 1}`}
              onMove={(from, to) => onChange(move(items, from, to))}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
            />
          </div>
          <Text label="Title" value={item.title} onChange={(title) => set(index, { title })} />
          <Text label="Text" value={item.text} onChange={(text) => set(index, { text })} />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Button label" value={item.ctaLabel} onChange={(ctaLabel) => set(index, { ctaLabel })} />
            <LinkInput label="Link" value={item.href} onChange={(href) => set(index, { href })} />
          </div>
          <LinkInput label="Background image" image value={item.imageUrl} onChange={(imageUrl) => set(index, { imageUrl })} />
          <TonePicker value={item.tone} onChange={(tone) => set(index, { tone })} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={items.length >= MAX_BANNERS}
        onClick={() => onChange([...items, newBanner()])}
      >
        <PlusIcon data-icon="inline-start" />
        Add banner ({items.length}/{MAX_BANNERS})
      </Button>
    </div>
  );
}

// ---- The editor for one section ------------------------------------------------------------------

export function SectionEditor({ section, onChange }: { section: Section; onChange: (section: Section) => void }) {
  const update = ((patch: Partial<Section>) => onChange({ ...section, ...patch } as Section)) as Patch<Section>;

  return (
    <div className="space-y-6">
      <ContentEditor section={section} update={update} />
      <Separator />
      <Group title="Visibility">
        <Toggle
          label="Hide this section"
          description="Keeps it in the layout without showing it."
          checked={section.hidden}
          onChange={(hidden) => update({ hidden })}
        />
        <Toggle
          label="Hide on phones"
          description="Screens narrower than 768 px."
          checked={section.hideOnMobile}
          onChange={(hideOnMobile) => update({ hideOnMobile })}
        />
        <Toggle
          label="Hide on tablets and desktops"
          checked={section.hideOnDesktop}
          onChange={(hideOnDesktop) => update({ hideOnDesktop })}
        />
      </Group>
    </div>
  );
}

function ContentEditor({ section, update }: { section: Section; update: Patch<Section> }) {
  switch (section.type) {
    case "announcement": {
      const set = update as Patch<typeof section>;
      return (
        <Group title="Content">
          <Text label="Message" value={section.text} onChange={(text) => set({ text })} />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Link label" value={section.linkLabel} onChange={(linkLabel) => set({ linkLabel })} />
            <LinkInput label="Link" value={section.href} onChange={(href) => set({ href })} />
          </div>
          <TonePicker value={section.tone} onChange={(tone) => set({ tone })} />
        </Group>
      );
    }
    case "hero": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Small heading" value={section.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
            <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" multiline value={section.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <div className="grid grid-cols-2 gap-3">
              <Text label="Main button" value={section.ctaLabel} onChange={(ctaLabel) => set({ ctaLabel })} />
              <LinkInput label="Main button link" value={section.ctaHref} onChange={(ctaHref) => set({ ctaHref })} />
              <Text label="Second button" value={section.secondaryLabel} onChange={(secondaryLabel) => set({ secondaryLabel })} />
              <LinkInput label="Second button link" value={section.secondaryHref} onChange={(secondaryHref) => set({ secondaryHref })} />
            </div>
          </Group>
          <Separator />
          <Group title="Style">
            <LinkInput label="Background image" image value={section.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
            <TonePicker value={section.tone} onChange={(tone) => set({ tone })} />
            <Choice
              label="Alignment"
              value={section.align}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Centre" },
              ]}
              onChange={(align) => set({ align })}
            />
            <Choice
              label="Height"
              value={section.height}
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
              onChange={(height) => set({ height })}
            />
          </Group>
        </>
      );
    }
    case "categories": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" value={section.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <Choice
              label="Style"
              value={section.style}
              options={[
                { value: "tiles", label: "Tiles" },
                { value: "circles", label: "Circles" },
                { value: "chips", label: "Chips" },
              ]}
              onChange={(style) => set({ style })}
            />
          </Group>
          <Separator />
          <Group title="Categories">
            <CategoryTilesEditor items={section.items} onChange={(items) => set({ items })} />
          </Group>
        </>
      );
    }
    case "products": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" value={section.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <Toggle label="“View all” link" checked={section.showViewAll} onChange={(showViewAll) => set({ showViewAll })} />
          </Group>
          <Separator />
          <Group title="Which products">
            <FormField label="Source">
              <Select value={section.source} onChange={(e) => set({ source: e.target.value as ProductSource })}>
                {PRODUCT_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {section.source === "category" && <CategoryField value={section.categoryId} onChange={(categoryId) => set({ categoryId })} />}
            {section.source === "search" && (
              <Text label="Search words" value={section.query} placeholder="e.g. mug" onChange={(query) => set({ query })} />
            )}
            {section.source === "manual" && (
              <ProductPicker ids={section.productIds} onChange={(productIds) => set({ productIds })} />
            )}
          </Group>
          <Separator />
          <ListOptions section={section} update={set} />
        </>
      );
    }
    case "banners": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Title above the banners" value={section.title} onChange={(title) => set({ title })} />
          </Group>
          <Separator />
          <Group title="Banners">
            <BannerItemsEditor items={section.items} onChange={(items) => set({ items })} />
          </Group>
        </>
      );
    }
    case "text": {
      const set = update as Patch<typeof section>;
      return (
        <Group title="Content">
          <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
          <Text label="Text" multiline value={section.body} onChange={(body) => set({ body })} />
          <Choice
            label="Alignment"
            value={section.align}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
            ]}
            onChange={(align) => set({ align })}
          />
        </Group>
      );
    }
    case "similarProducts": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" value={section.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <p className="text-xs text-muted-foreground">
              Shows products from the same or neighbouring categories as the results, or matching single search
              words. Hidden when nothing is similar.
            </p>
          </Group>
          <Separator />
          <ListOptions section={section} update={set} />
        </>
      );
    }
    case "randomProducts": {
      const set = update as Patch<typeof section>;
      return (
        <>
          <Group title="Content">
            <Text label="Title" value={section.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" value={section.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <Toggle
              label="Only when nothing similar is found"
              description="Off: always show random picks (never the search results themselves)."
              checked={section.onlyWhenNoSimilar}
              onChange={(onlyWhenNoSimilar) => set({ onlyWhenNoSimilar })}
            />
          </Group>
          <Separator />
          <ListOptions section={section} update={set} />
        </>
      );
    }
  }
}

function CategoryField({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const tree = useCategoryTree();
  return (
    <FormField label="Category" hint="Includes all of its sub-categories.">
      <CategorySelect tree={tree.data ?? []} value={value} emptyLabel="— Pick a category —" onChange={onChange} />
    </FormField>
  );
}
