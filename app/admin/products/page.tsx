"use client";

import {
  HistoryIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ClipboardCheckIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CategorySelect, useCategoryTree } from "@/components/categories";
import {
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  Notice,
  OtherFieldErrors,
  PageHeader,
  ProductImage,
  TextArea,
  TextInput,
} from "@/components/common";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductImageField } from "@/components/ProductImageField";
import { ProductCard } from "@/components/storefront/product-card";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/settings";
import type { CategoryNode, Product, ProductInput } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

type Editing =
  | { mode: "create" }
  | { mode: "edit"; product: Product }
  | { mode: "count"; product: Product }
  | null;

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (quantity <= 5)
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
        {quantity} left
      </Badge>
    );
  return (
    <Badge variant="secondary" className="tabular-nums">
      {quantity}
    </Badge>
  );
}

export default function ProductsAdminPage() {
  const { money } = useSettings();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const categories = useCategoryTree();
  const products = useLoad(`admin-products-${query}`, () =>
    api.get<Product[]>("/products", { params: { q: query || undefined } }),
  );

  function saved(product: Product) {
    const created = editing?.mode === "create";
    setEditing(null);
    products.setData((list) =>
      list.some((p) => p.id === product.id)
        ? list.map((p) => (p.id === product.id ? product : p))
        : [...list, product],
    );
    toast.success(
      created ? `“${product.name}” created.` : `“${product.name}” saved.`,
    );
  }

  async function remove(product: Product) {
    setActionError(null);
    try {
      await api.delete(`/products/${product.id}`);
      products.setData((list) => list.filter((p) => p.id !== product.id));
      toast.success(`“${product.name}” deleted.`);
    } catch (e) {
      setActionError(toApiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description={
          products.data
            ? `${products.data.length} product${products.data.length === 1 ? "" : "s"}`
            : "Your catalogue."
        }
        actions={
          <Button type="button" onClick={() => setEditing({ mode: "create" })}>
            <PlusIcon data-icon="inline-start" />
            New product
          </Button>
        }
      />

      <form
        role="search"
        className="max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
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

      <ErrorBanner
        error={actionError ?? products.error}
        onDismiss={() => setActionError(null)}
      />
      {products.loading && !products.data ? (
        <Loading />
      ) : products.data?.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No products found"
          description={
            query ? "Try another search." : "Create your first product."
          }
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-10 shrink-0 rounded-md"
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          #{product.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.categoryPath.length > 0
                      ? product.categoryPath.map((c) => c.name).join(" › ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(product.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StockBadge quantity={product.stockQuantity} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${product.name}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => setEditing({ mode: "edit", product })}
                        >
                          <PencilIcon />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setEditing({ mode: "count", product })
                          }
                        >
                          <ClipboardCheckIcon />
                          Stock count
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/inventory?product=${product.id}`}>
                            <HistoryIcon />
                            Stock history
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleting(product)}
                        >
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={editing?.mode === "create" || editing?.mode === "edit"}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
          {(editing?.mode === "create" || editing?.mode === "edit") && (
            <ProductForm
              key={editing.mode === "edit" ? editing.product.id : "new"}
              tree={categories.data ?? []}
              product={editing.mode === "edit" ? editing.product : undefined}
              onSaved={saved}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing?.mode === "count"}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editing?.mode === "count" && (
            <StockCountForm
              key={editing.product.id}
              product={editing.product}
              onSaved={saved}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its stock history is deleted too. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && void remove(deleting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductForm({
  tree,
  product,
  onSaved,
}: {
  tree: CategoryNode[];
  product?: Product;
  onSaved: (product: Product) => void;
}) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    imageUrl: product?.imageUrl ?? "",
    stockQuantity: "",
  });
  const [categoryId, setCategoryId] = useState<number | null>(
    product?.categoryId ?? null,
  );
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  function findCategory(nodes: CategoryNode[], id: number | null): CategoryNode | null {
    if (id === null) return null;
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findCategory(node.children, id);
      if (found) return found;
    }
    return null;
  }
  const selectedCat = findCategory(tree, categoryId);
  const parsedPrice = parseFloat(form.price);
  const parsedStock =
    form.stockQuantity === ""
      ? (product?.stockQuantity ?? 10)
      : Number(form.stockQuantity);

  const previewProduct: Product = {
    id: product?.id ?? 9999,
    name: form.name.trim() || "Product Name Preview",
    description: form.description.trim() || "Product description preview...",
    price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
    imageUrl: form.imageUrl.trim(),
    stockQuantity: Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0,
    inStock: product ? product.inStock : parsedStock > 0,
    categoryId,
    categoryPath: selectedCat
      ? [{ id: selectedCat.id, name: selectedCat.name }]
      : [],
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // PUT replaces categoryId, so it's always sent; stock is only sent on create (use adjustments/counts afterwards).
    const body: ProductInput = {
      name: form.name,
      description: form.description,
      price: form.price === "" ? null : Number(form.price),
      imageUrl: form.imageUrl,
      categoryId,
      ...(product
        ? {}
        : {
            stockQuantity:
              form.stockQuantity === "" ? 0 : Number(form.stockQuantity),
          }),
    };
    try {
      onSaved(
        product
          ? await api.put<Product>(`/products/${product.id}`, body)
          : await api.post<Product>("/products", body),
      );
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  const set = (key: keyof typeof form) => (value: string) =>
    setForm({ ...form, [key]: value });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DialogHeader className="text-left">
          <DialogTitle>
            {product ? `Edit product #${product.id}` : "New product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Change details, price or category. Use a stock count or Inventory to change stock."
              : "Add a product to the catalogue."}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1.5 self-start text-xs"
        >
          {showPreview ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
          {showPreview ? "Hide card preview" : "Card preview"}
        </Button>
      </div>
      <div className={cn("grid gap-6", showPreview && "lg:grid-cols-[1fr_260px]")}>
        <div className="space-y-4">
          <ErrorBanner error={error && !error.isValidationError ? error : null} />
          <OtherFieldErrors
            errors={fe}
            shown={[
              "name",
              "description",
              "price",
              "imageUrl",
              "stockQuantity",
              "categoryId",
            ]}
          />
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <FormField label="Name" error={fe.name}>
              <TextInput
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </FormField>
            <FormField label={`Price (${settings.currency})`} error={fe.price}>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set("price")(e.target.value)}
              />
            </FormField>
            <FormField
              label="Description"
              error={fe.description}
              className="md:col-span-2"
            >
              <TextArea
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </FormField>
            <FormField
              label="Product Image"
              error={fe.imageUrl}
              className="md:col-span-2"
            >
              <ProductImageField
                value={form.imageUrl}
                onChange={(url) => set("imageUrl")(url)}
                error={fe.imageUrl}
              />
            </FormField>
            <FormField label="Category" error={fe.categoryId}>
              <CategorySelect
                tree={tree}
                value={categoryId}
                onChange={setCategoryId}
                emptyLabel="— Uncategorised —"
              />
            </FormField>
            {!product && (
              <FormField label="Initial stock" error={fe.stockQuantity}>
                <TextInput
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => set("stockQuantity")(e.target.value)}
                />
              </FormField>
            )}
          </FieldGroup>
        </div>

        {showPreview && (
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 h-fit lg:sticky lg:top-0">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <EyeIcon className="size-3.5 text-primary" />
                Storefront Card Preview
              </span>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                Live
              </Badge>
            </div>
            <div className="mx-auto w-full max-w-[240px]">
              <ProductCard product={previewProduct} />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Live preview of how shoppers see this card while surfing the store.
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function StockCountForm({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: (p: Product) => void;
}) {
  const [quantity, setQuantity] = useState(String(product.stockQuantity));
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await api.patch<Product>(`/products/${product.id}/stock`, {
          stockQuantity: quantity === "" ? null : Number(quantity),
          note: note.trim() || undefined,
        }),
      );
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Stock count · {product.name}</DialogTitle>
        <DialogDescription>
          Currently {product.stockQuantity} in stock.
        </DialogDescription>
      </DialogHeader>
      <div>
        <Notice>
          Overwrite the stock with what was physically counted. For deliveries
          or damages use Inventory instead.
        </Notice>
        <ErrorBanner error={error && !error.isValidationError ? error : null} />
        <FieldGroup>
          <FormField label="Counted quantity" error={fe.stockQuantity}>
            <TextInput
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </FormField>
          <FormField label="Note (optional)" error={fe.note}>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </FieldGroup>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          Save count
        </Button>
      </DialogFooter>
    </form>
  );
}
