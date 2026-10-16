"use client";

import {
  ExternalLinkIcon,
  FolderIcon,
  FolderTreeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CategorySelect,
  flattenCategories,
  subtreeIds,
  useCategoryTree,
  type FlatCategory,
} from "@/components/categories";
import {
  ConfirmButton,
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  PageHeader,
  TextInput,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import type { CategoryDetail, CategoryNode } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CategoriesAdminPage() {
  const categories = useCategoryTree();
  const [editing, setEditing] = useState<FlatCategory | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const tree = categories.data ?? [];

  async function remove(category: FlatCategory) {
    setActionError(null);
    try {
      await api.delete(`/categories/${category.id}`);
      categories.reload();
      toast.success(`“${category.name}” deleted.`);
    } catch (e) {
      setActionError(toApiError(e));
    }
  }

  function saved(name: string, created: boolean) {
    setEditing(null);
    categories.reload();
    toast.success(created ? `“${name}” created.` : `“${name}” saved.`);
  }

  const flat = flattenCategories(tree);
  const childCount = new Map<number, number>();
  for (const c of flat) {
    if (c.parentId !== null)
      childCount.set(c.parentId, (childCount.get(c.parentId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description={
          categories.data
            ? `${flat.length} categor${flat.length === 1 ? "y" : "ies"} · organise products into a tree of any depth.`
            : "Organise products into a tree of any depth."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">
            New category
          </CardTitle>
          <CardDescription>
            Leave the parent empty for a top-level category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm tree={tree} onSaved={(name) => saved(name, true)} />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle className="font-heading text-lg font-semibold">
            Category tree
          </CardTitle>
          <CardDescription>
            Only empty categories (no sub-categories or products) can be
            deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-4 pt-4 empty:hidden">
            <ErrorBanner
              error={actionError ?? categories.error}
              onDismiss={() => setActionError(null)}
            />
          </div>
          {categories.loading && !categories.data ? (
            <Loading />
          ) : tree.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={FolderTreeIcon}
                title="No categories yet"
                description="Create the first one with the form."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead className="w-28">Level</TableHead>
                  <TableHead className="w-36 text-right">
                    Sub-categories
                  </TableHead>
                  <TableHead className="w-32 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flat.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="py-1.5 pl-4">
                      <span
                        className="flex min-w-0 items-center gap-2"
                        style={{ paddingLeft: `${c.depth * 1.5}rem` }}
                      >
                        {c.imageUrl ? (
                          <Image
                            src={c.imageUrl}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            className="size-6 shrink-0 rounded object-cover ring-1 ring-border"
                          />
                        ) : (
                          <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            c.depth === 0 && "font-semibold",
                          )}
                        >
                          {c.name}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.depth === 0 ? "Top level" : `Level ${c.depth + 1}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {childCount.get(c.id) ?? 0}
                    </TableCell>
                    <TableCell className="py-1.5 pr-4">
                      <span className="flex justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View ${c.name} in the shop`}
                        >
                          <Link href={`/search?category=${c.id}`} target="_blank">
                            <ExternalLinkIcon />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${c.name}`}
                          onClick={() => setEditing(c)}
                        >
                          <PencilIcon />
                        </Button>
                        <ConfirmButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${c.name}`}
                          title={`Delete “${c.name}”?`}
                          description="This can't be undone."
                          confirmLabel="Delete"
                          onConfirm={() => void remove(c)}
                        >
                          <Trash2Icon />
                        </ConfirmButton>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Rename it or move it under another parent.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <CategoryForm
              key={editing.id}
              tree={tree}
              category={editing}
              onSaved={(name) => saved(name, false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({
  tree,
  category,
  onSaved,
}: {
  tree: CategoryNode[];
  category?: FlatCategory;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState<number | null>(
    category?.parentId ?? null,
  );
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // PUT replaces parentId too, so the current parent is always sent.
      const result = category
        ? await api.put<CategoryDetail>(`/categories/${category.id}`, {
            name,
            parentId,
            imageUrl: imageUrl.trim() || null,
          })
        : await api.post<CategoryDetail>("/categories", {
            name,
            parentId,
            imageUrl: imageUrl.trim() || null,
          });
      if (!category) {
        setName("");
        setImageUrl("");
      }
      onSaved(result.name);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  const submitButton = (
    <Button type="submit" disabled={busy}>
      {busy && <Spinner data-icon="inline-start" />}
      {category ? "Save" : "Create"}
    </Button>
  );
  const fields = (
    <>
      <FormField label="Name" error={fe.name}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
      </FormField>
      <FormField label="Parent" error={fe.parentId}>
        <CategorySelect
          tree={tree}
          value={parentId}
          onChange={setParentId}
          emptyLabel="— Top level —"
          exclude={category ? subtreeIds(tree, category.id) : undefined}
        />
      </FormField>
      <FormField label="Image URL" error={fe.imageUrl}>
        <TextInput
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://... or /api/uploads/..."
          maxLength={2048}
        />
      </FormField>
    </>
  );
  const banner = (
    <ErrorBanner error={error && Object.keys(fe).length === 0 ? error : null} />
  );

  if (!category) {
    return (
      <form onSubmit={submit} noValidate>
        {banner}
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_minmax(18rem,2fr)_auto]">
          {fields}
          <div className="flex flex-col gap-2">
            {/* Keeps the button level with the inputs next to it. */}
            <span aria-hidden className="hidden text-sm leading-snug xl:block">
              &nbsp;
            </span>
            {submitButton}
          </div>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {banner}
      <FieldGroup>{fields}</FieldGroup>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        {submitButton}
      </DialogFooter>
    </form>
  );
}
