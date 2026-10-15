"use client";

import {
  FolderIcon,
  FolderTreeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
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
import { api, toApiError, type ApiError } from "@/lib/api-client";
import type { CategoryDetail, CategoryNode } from "@/lib/types";

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

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organise products into a tree of any depth."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[340px_1fr]">
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
            <CategoryForm
              tree={tree}
              onSaved={(name) => saved(name, true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">
              Category tree
            </CardTitle>
            <CardDescription>
              Only empty categories (no sub-categories or products) can be
              deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner
              error={actionError ?? categories.error}
              onDismiss={() => setActionError(null)}
            />
            {categories.loading && !categories.data ? (
              <Loading />
            ) : tree.length === 0 ? (
              <EmptyState
                icon={FolderTreeIcon}
                title="No categories yet"
                description="Create the first one with the form."
              />
            ) : (
              <ul className="divide-y rounded-lg border">
                {flattenCategories(tree).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 py-1.5 pr-2 hover:bg-muted/50"
                    style={{ paddingLeft: `${0.75 + c.depth * 1.25}rem` }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {c.imageUrl ? (
                        <Image
                          src={c.imageUrl}
                          alt=""
                          width={20}
                          height={20}
                          unoptimized
                          className="size-5 shrink-0 rounded object-cover ring-1 ring-border"
                        />
                      ) : (
                        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
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
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <ErrorBanner
        error={error && Object.keys(fe).length === 0 ? error : null}
      />
      <FieldGroup>
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
        {!category && submitButton}
      </FieldGroup>
      {category && (
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {submitButton}
        </DialogFooter>
      )}
    </form>
  );
}
