"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GalleryHorizontalIcon,
  GripVerticalIcon,
  ImageIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Redo2Icon,
  RotateCcwIcon,
  ShuffleIcon,
  SparklesIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { flattenCategories, useCategoryTree } from "@/components/categories";
import { ConfirmButton, ErrorBanner, Loading, PageHeader } from "@/components/common";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, toApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import {
  createSection,
  MAX_SECTIONS,
  newSectionId,
  normalizeSections,
  PAGE_META,
  SECTION_META,
  sectionTypesFor,
  type Section,
  type SectionType,
} from "@/lib/page-layout";
import type { LayoutPage, PageLayoutResponse } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";
import { PreviewFrame } from "./preview-frame";
import { LINK_SUGGESTIONS_ID, linkError, SectionEditor } from "./section-editors";

export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  announcement: MegaphoneIcon,
  hero: ImageIcon,
  categories: LayoutGridIcon,
  products: GalleryHorizontalIcon,
  banners: SparklesIcon,
  text: TypeIcon,
  similarProducts: SparklesIcon,
  randomProducts: ShuffleIcon,
};

const LIST_ID = "section-list";
const PALETTE_PREFIX = "palette:";
const HISTORY_LIMIT = 100;

interface PageState {
  saved: Section[];
  customized: boolean;
  updatedAt: string | null;
  draft: Section[];
  past: Section[][];
  future: Section[][];
}

function fromResponse(response: PageLayoutResponse, page: LayoutPage): PageState {
  const saved = normalizeSections(response.sections, page);
  return {
    saved,
    customized: response.sections !== null,
    updatedAt: response.updatedAt,
    draft: saved,
    past: [],
    future: [],
  };
}

function sectionSummary(section: Section): string {
  switch (section.type) {
    case "announcement":
      return section.text;
    case "hero":
    case "categories":
    case "products":
    case "text":
    case "similarProducts":
    case "randomProducts":
      return section.title;
    case "banners":
      return section.title || section.items.map((i) => i.title).filter(Boolean).join(" · ");
  }
}

/** Client-side check of every link/image before publishing (the backend checks again). */
function findLinkProblem(sections: Section[]): string | null {
  for (const section of sections) {
    const label = `${SECTION_META[section.type].label}${sectionSummary(section) ? ` “${sectionSummary(section)}”` : ""}`;
    const values: string[] = [];
    if (section.type === "announcement") values.push(section.href);
    if (section.type === "hero") values.push(section.imageUrl, section.ctaHref, section.secondaryHref);
    if (section.type === "categories") values.push(...section.items.map((i) => i.imageUrl));
    if (section.type === "banners") section.items.forEach((i) => values.push(i.imageUrl, i.href));
    if (values.some((v) => linkError(v))) return `${label} has a link or image that isn't a site path or http(s) URL.`;
  }
  return null;
}

export function StorefrontDesigner() {
  const [page, setPage] = useState<LayoutPage>("home");
  const [pages, setPages] = useState<Partial<Record<LayoutPage, PageState>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const router = useRouter();
  const lastEdit = useRef({ at: 0, key: "" });

  const loaded = useLoad(`designer-layout:${page}`, () => api.get<PageLayoutResponse>(`/layouts/${page}`));
  if (loaded.data && loaded.data.page === page && !pages[page]) {
    setPages((all) => ({ ...all, [page]: fromResponse(loaded.data!, page) }));
  }

  const state = pages[page];
  const dirty = (p: LayoutPage) => {
    const s = pages[p];
    return !!s && JSON.stringify(s.draft) !== JSON.stringify(s.saved);
  };
  const anyDirty = dirty("home") || dirty("search");

  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  // In-app links navigate without unloading the page, so they get their own "leave without publishing?" check.
  useEffect(() => {
    if (!anyDirty) return;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [anyDirty]);

  /** Applies a change to the current page's draft; quick edits of the same field are merged into one undo step. */
  const change = useCallback(
    (update: (draft: Section[]) => Section[], mergeKey?: string) => {
      setPages((all) => {
        const current = all[page];
        if (!current) return all;
        const draft = update(current.draft);
        if (draft === current.draft) return all;
        const now = Date.now();
        const merge = mergeKey !== undefined && lastEdit.current.key === mergeKey && now - lastEdit.current.at < 800;
        lastEdit.current = { at: now, key: mergeKey ?? "" };
        return {
          ...all,
          [page]: {
            ...current,
            draft,
            past: merge ? current.past : [...current.past, current.draft].slice(-HISTORY_LIMIT),
            future: [],
          },
        };
      });
    },
    [page],
  );

  const undo = useCallback(() => {
    setPages((all) => {
      const s = all[page];
      if (!s || s.past.length === 0) return all;
      lastEdit.current = { at: 0, key: "" };
      return { ...all, [page]: { ...s, draft: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.draft, ...s.future] } };
    });
  }, [page]);

  const redo = useCallback(() => {
    setPages((all) => {
      const s = all[page];
      if (!s || s.future.length === 0) return all;
      lastEdit.current = { at: 0, key: "" };
      return { ...all, [page]: { ...s, draft: s.future[0], past: [...s.past, s.draft], future: s.future.slice(1) } };
    });
  }, [page]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const addSection = (type: SectionType, index?: number) => {
    if (!state || state.draft.length >= MAX_SECTIONS) {
      toast.error(`A page can have at most ${MAX_SECTIONS} sections.`);
      return;
    }
    const section = createSection(type);
    change((draft) => {
      const next = [...draft];
      next.splice(index ?? next.length, 0, section);
      return next;
    });
    setHighlightId(section.id);
  };

  const updateSection = (section: Section) =>
    change((draft) => draft.map((s) => (s.id === section.id ? section : s)), `edit:${section.id}`);

  const removeSection = (id: string) => {
    change((draft) => draft.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const duplicateSection = (id: string) =>
    change((draft) => {
      const index = draft.findIndex((s) => s.id === id);
      if (index < 0 || draft.length >= MAX_SECTIONS) return draft;
      const copy = { ...structuredClone(draft[index]), id: newSectionId(draft[index].type) };
      return [...draft.slice(0, index + 1), copy, ...draft.slice(index + 1)];
    });

  const toggleHidden = (id: string) =>
    change((draft) => draft.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)));

  const moveSection = (from: number, to: number) => change((draft) => arrayMove(draft, from, to));

  async function save() {
    if (!state) return;
    const problem = findLinkProblem(state.draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy("save");
    try {
      const response = await api.put<PageLayoutResponse>(`/layouts/${page}`, { sections: state.draft });
      setPages((all) => ({ ...all, [page]: { ...fromResponse(response, page), past: state.past, future: [] } }));
      toast.success(`${PAGE_META[page].label} published`);
    } catch (error) {
      const apiError = toApiError(error);
      const details = Object.entries(apiError.fieldErrors)
        .slice(0, 3)
        .map(([field, message]) => `${field}: ${message}`)
        .join("\n");
      toast.error(apiError.message, { description: details || undefined });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    try {
      await api.delete(`/layouts/${page}`);
      setPages((all) => ({
        ...all,
        [page]: fromResponse({ page, sections: null, updatedAt: null }, page),
      }));
      setEditingId(null);
      toast.success(`${PAGE_META[page].label} reset to the default layout`);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setBusy(null);
    }
  }

  const discard = () =>
    change(() => state?.saved ?? []);

  const editing = state?.draft.find((s) => s.id === editingId) ?? null;
  const onPreviewSelect = useCallback((id: string) => {
    setEditingId(id);
    setHighlightId(id);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Storefront designer"
        description="Drag sections to build the home page and the search results page. Changes go live when you publish."
        className="mb-0"
        actions={
          <>
            <Button type="button" variant="ghost" size="icon" aria-label="Undo (Ctrl+Z)" disabled={!state?.past.length} onClick={undo}>
              <Undo2Icon />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Redo (Ctrl+Shift+Z)" disabled={!state?.future.length} onClick={redo}>
              <Redo2Icon />
            </Button>
            <ConfirmButton
              variant="outline"
              disabled={!state?.customized || busy !== null}
              title={`Reset the ${PAGE_META[page].label.toLowerCase()}?`}
              description="The published layout is replaced by the built-in default. This cannot be undone."
              confirmLabel="Reset to default"
              cancelLabel="Cancel"
              onConfirm={() => void reset()}
            >
              {busy === "reset" ? <Spinner data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
              Reset to default
            </ConfirmButton>
            <Button type="button" variant="outline" disabled={!dirty(page) || busy !== null} onClick={discard}>
              Discard changes
            </Button>
            <Button type="button" disabled={!dirty(page) || busy !== null} onClick={() => void save()}>
              {busy === "save" && <Spinner data-icon="inline-start" />}
              Publish
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={page}
          onValueChange={(value) => {
            setPage(value as LayoutPage);
            setEditingId(null);
            setHighlightId(null);
          }}
        >
          <TabsList>
            {(Object.keys(PAGE_META) as LayoutPage[]).map((p) => (
              <TabsTrigger key={p} value={p} className="gap-1.5">
                {PAGE_META[p].label}
                {dirty(p) && <span className="size-1.5 rounded-full bg-brand" aria-label="unsaved changes" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {state && (
          <p className="text-xs text-muted-foreground">
            {dirty(page) ? (
              <Badge variant="secondary" className="mr-2">Unsaved changes</Badge>
            ) : null}
            {state.customized
              ? `Published ${formatDate(state.updatedAt)}`
              : "Using the built-in default layout"}
          </p>
        )}
      </div>

      <ErrorBanner error={loaded.error} onDismiss={loaded.reload} />
      <LinkSuggestions />
      <AlertDialog open={leaveTo !== null} onOpenChange={(open) => !open && setLeaveTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without publishing?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unpublished storefront changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (leaveTo) router.push(leaveTo);
                setLeaveTo(null);
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!state ? (
        <Loading label="Loading layout…" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="gap-0 py-0 xl:sticky xl:top-28 xl:h-[calc(100vh-8.5rem)] xl:overflow-y-auto scroll-smooth">
            {editing ? (
              <div>
                <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-card px-2 py-2">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Back to sections" onClick={() => setEditingId(null)}>
                    <ArrowLeftIcon />
                  </Button>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{SECTION_META[editing.type].label}</p>
                  <SectionActions
                    section={editing}
                    onToggleHidden={() => toggleHidden(editing.id)}
                    onDuplicate={() => duplicateSection(editing.id)}
                    onRemove={() => removeSection(editing.id)}
                  />
                </div>
                <div className="p-4">
                  <SectionEditor section={editing} onChange={updateSection} />
                </div>
              </div>
            ) : (
              <SectionsPanel
                page={page}
                sections={state.draft}
                highlightId={highlightId}
                onAdd={addSection}
                onMove={moveSection}
                onEdit={(id) => {
                  setEditingId(id);
                  setHighlightId(id);
                }}
                onToggleHidden={toggleHidden}
                onDuplicate={duplicateSection}
                onRemove={removeSection}
              />
            )}
          </Card>
          <div className="h-[75vh] min-h-[28rem] xl:sticky xl:top-28 xl:h-[calc(100vh-8.5rem)]">
            <PreviewFrame
              page={page}
              sections={state.draft}
              selectedId={editingId ?? highlightId}
              onSelect={onPreviewSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Suggestions for link fields: common storefront pages and every category. */
function LinkSuggestions() {
  const tree = useCategoryTree();
  const categories = useMemo(() => flattenCategories(tree.data ?? []), [tree.data]);
  return (
    <datalist id={LINK_SUGGESTIONS_ID}>
      <option value="/">Home</option>
      <option value="/search">All products</option>
      <option value="/search?sort=NEWEST">New arrivals</option>
      <option value="/search?inStock=true">In stock</option>
      <option value="/search?sort=PRICE_ASC">Lowest price first</option>
      <option value="/register">Create an account</option>
      {categories.map((c) => (
        <option key={c.id} value={`/search?category=${c.id}`}>
          {c.name}
        </option>
      ))}
    </datalist>
  );
}

function SectionActions({
  section,
  onToggleHidden,
  onDuplicate,
  onRemove,
}: {
  section: Section;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={section.hidden ? "Show section" : "Hide section"}
        aria-pressed={section.hidden}
        onClick={onToggleHidden}
      >
        {section.hidden ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={onDuplicate}>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            <Trash2Icon />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ---- Palette + sortable section list (drag and drop) -----------------------------------------------

function SectionsPanel({
  page,
  sections,
  highlightId,
  onAdd,
  onMove,
  onEdit,
  onToggleHidden,
  onDuplicate,
  onRemove,
}: {
  page: LayoutPage;
  sections: Section[];
  highlightId: string | null;
  onAdd: (type: SectionType, index?: number) => void;
  onMove: (from: number, to: number) => void;
  onEdit: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [active, setActive] = useState<{ id: string; label: string } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const fromPalette = active?.id.startsWith(PALETTE_PREFIX) ?? false;

  // Prefer the row under the pointer; fall back to the list itself (drop at the end), then to the closest row.
  const collisions: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    const rows = within.filter((c) => c.id !== LIST_ID);
    if (rows.length > 0) return rows;
    if (within.length > 0) return within;
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => c.id !== LIST_ID),
    });
  };

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const label = id.startsWith(PALETTE_PREFIX)
      ? SECTION_META[id.slice(PALETTE_PREFIX.length) as SectionType].label
      : SECTION_META[sections.find((s) => s.id === id)?.type ?? "text"].label;
    setActive({ id, label });
  }

  function onDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    setActive(null);
    setOverId(null);
    if (!over) return;
    const overIndex = over === LIST_ID ? sections.length : sections.findIndex((s) => s.id === over);
    if (activeId.startsWith(PALETTE_PREFIX)) {
      onAdd(activeId.slice(PALETTE_PREFIX.length) as SectionType, overIndex < 0 ? sections.length : overIndex);
      return;
    }
    const from = sections.findIndex((s) => s.id === activeId);
    const to = overIndex >= sections.length ? sections.length - 1 : overIndex;
    if (from >= 0 && to >= 0 && from !== to) onMove(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisions}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
        setOverId(null);
      }}
    >
      <div className="space-y-5 p-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add a section</p>
          <p className="mb-3 text-xs text-muted-foreground">Drag into the list below, or click to add at the end.</p>
          <div className="grid grid-cols-2 gap-2">
            {sectionTypesFor(page).map((type) => (
              <PaletteItem key={type} type={type} onAdd={() => onAdd(type)} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Sections on the page ({sections.length})
          </p>
          <SectionDropList showEndMarker={fromPalette && overId === LIST_ID}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section, index) => (
                <SortableRow
                  key={section.id}
                  section={section}
                  index={index}
                  count={sections.length}
                  highlighted={highlightId === section.id}
                  insertBefore={fromPalette && overId === section.id}
                  onEdit={() => onEdit(section.id)}
                  onToggleHidden={() => onToggleHidden(section.id)}
                  onDuplicate={() => onDuplicate(section.id)}
                  onRemove={() => onRemove(section.id)}
                />
              ))}
            </SortableContext>
            {sections.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No sections yet — drag one here.
              </p>
            )}
          </SectionDropList>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="flex items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-sm font-medium shadow-lg">
            <GripVerticalIcon className="size-4 text-muted-foreground" />
            {active.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteItem({ type, onAdd }: { type: SectionType; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${PALETTE_PREFIX}${type}` });
  const Icon = SECTION_ICONS[type];
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onAdd}
      title={SECTION_META[type].description}
      aria-label={`Add ${SECTION_META[type].label}`}
      className={cn(
        "flex cursor-grab touch-none items-center gap-2 rounded-lg border bg-background p-2 text-left text-xs font-medium transition-colors hover:border-foreground/30 hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">{SECTION_META[type].label}</span>
      <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SectionDropList({ children, showEndMarker }: { children: ReactNode; showEndMarker: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: LIST_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn("space-y-1.5 rounded-lg pb-6 transition-colors", isOver && "bg-muted/40")}
    >
      {children}
      {showEndMarker && <div className="h-0.5 rounded-full bg-brand" />}
    </div>
  );
}

function SortableRow({
  section,
  index,
  count,
  highlighted,
  insertBefore,
  onEdit,
  onToggleHidden,
  onDuplicate,
  onRemove,
}: {
  section: Section;
  index: number;
  count: number;
  highlighted: boolean;
  insertBefore: boolean;
  onEdit: () => void;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const Icon = SECTION_ICONS[section.type];
  const summary = sectionSummary(section);
  const devices = [section.hideOnMobile && "not on phones", section.hideOnDesktop && "phones only"].filter(Boolean);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-60")}
    >
      {insertBefore && <div className="absolute -top-1 right-0 left-0 h-0.5 rounded-full bg-brand" />}
      <div
        className={cn(
          "group/row flex items-center gap-1 rounded-lg border bg-background py-1 pr-1 pl-0.5 transition-colors hover:border-foreground/30",
          highlighted && "border-brand ring-1 ring-brand",
          section.hidden && "opacity-60",
        )}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Reorder ${SECTION_META[section.type].label} (position ${index + 1} of ${count})`}
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{SECTION_META[section.type].label}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {[section.hidden ? "Hidden" : null, ...devices, summary].filter(Boolean).join(" · ") || "—"}
            </span>
          </span>
        </button>
        <div className="flex items-center opacity-100 transition-opacity xl:opacity-0 xl:group-focus-within/row:opacity-100 xl:group-hover/row:opacity-100">
          <SectionActions
            section={section}
            onToggleHidden={onToggleHidden}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}
