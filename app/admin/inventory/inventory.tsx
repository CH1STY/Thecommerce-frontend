"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ErrorBanner,
  FormField,
  Loading,
  PageHeader,
  Pager,
  SearchSelect,
  Select,
  TextInput,
  type SearchSelectOption,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate, humanize } from "@/lib/format";
import {
  ADD_REASONS,
  REMOVE_REASONS,
  STOCK_REASONS,
  type ManualStockReason,
  type Page,
  type Product,
  type StockMovement,
  type StockReason,
} from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

function toProductOptions(products: Product[]): SearchSelectOption[] {
  return products.map((p) => ({
    value: String(p.id),
    label: p.name,
    hint: `stock ${p.stockQuantity}`,
  }));
}

export function Inventory() {
  const params = useSearchParams();
  const initialProduct = params.get("product");
  const [productFilter, setProductFilter] = useState(
    initialProduct && /^\d+$/.test(initialProduct) ? initialProduct : "",
  );
  const [reasonFilter, setReasonFilter] = useState<StockReason | "">("");
  const [page, setPage] = useState(0);

  const products = useLoad("inventory-products", () =>
    api.get<Product[]>("/products"),
  );
  const movements = useLoad(
    `movements-${productFilter}-${reasonFilter}-${page}`,
    () =>
      api.get<Page<StockMovement>>("/inventory/movements", {
        params: {
          productId: productFilter || undefined,
          reason: reasonFilter || undefined,
          page,
          size: 20,
        },
      }),
  );
  const productName = (id: number) =>
    products.data?.find((p) => p.id === id)?.name ?? `#${id}`;
  const productOptions = toProductOptions(products.data ?? []);

  function recorded() {
    products.reload();
    movements.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Record deliveries, returns and losses, and review the stock ledger."
      />
      <AdjustmentForm
        products={products.data ?? []}
        defaultProduct={productFilter}
        onRecorded={recorded}
      />

      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="flex flex-wrap items-end justify-between gap-4 border-b py-4 [.border-b]:pb-4">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg font-semibold">
              Stock history
            </CardTitle>
            <CardDescription>
              Every change to stock, newest first.
              {movements.data &&
                ` ${movements.data.totalElements} movement${movements.data.totalElements === 1 ? "" : "s"}.`}
            </CardDescription>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <FormField label="Product" className="w-full sm:w-72">
              <SearchSelect
                value={productFilter}
                onChange={(value) => {
                  setProductFilter(value);
                  setPage(0);
                }}
                emptyOption="All products"
                searchPlaceholder="Search products…"
                options={productOptions}
              />
            </FormField>
            <FormField label="Reason" className="w-full sm:w-48">
              <Select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value as StockReason | "");
                  setPage(0);
                }}
              >
                <option value="">All reasons</option>
                {STOCK_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-4 pt-4 empty:hidden">
            <ErrorBanner error={movements.error} />
          </div>
          {movements.loading && !movements.data ? (
            <Loading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">When</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Stock after</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="pr-4">Note / order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn(movements.loading && "opacity-60")}>
                {movements.data?.content.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-4 text-muted-foreground tabular-nums">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    <TableCell className="min-w-56 whitespace-normal font-medium">
                      {productName(m.productId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{humanize(m.reason)}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        m.quantityChange < 0
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {m.quantityChange > 0
                        ? `+${m.quantityChange}`
                        : m.quantityChange}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {m.stockAfter}
                    </TableCell>
                    <TableCell>{m.actor?.fullName ?? "Guest/System"}</TableCell>
                    <TableCell className="min-w-48 pr-4 whitespace-normal">
                      {m.note}
                      {m.orderId !== null && (
                        <Link
                          href={`/orders/${m.orderId}`}
                          className="text-muted-foreground hover:underline"
                        >
                          {m.note ? " · " : ""}Order #{m.orderId}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No stock movements.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {movements.data && movements.data.totalPages > 1 && (
            <div className="border-t px-4 py-3">
              <Pager
                className="mt-0"
                page={movements.data.page}
                totalPages={movements.data.totalPages}
                onPage={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdjustmentForm({
  products,
  defaultProduct,
  onRecorded,
}: {
  products: Product[];
  defaultProduct: string;
  onRecorded: () => void;
}) {
  const [productId, setProductId] = useState(defaultProduct);
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<ManualStockReason>("RESTOCK");
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const reasons = direction === "add" ? ADD_REASONS : REMOVE_REASONS;
  const noteRequired = reason === "CORRECTION" || reason === "OTHER";

  function switchDirection(next: "add" | "remove") {
    setDirection(next);
    setReason(next === "add" ? "RESTOCK" : "DAMAGED");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const amount = Number(quantity);
    try {
      const movement = await api.post<StockMovement>("/inventory/adjustments", {
        productId: productId === "" ? null : Number(productId),
        quantityChange:
          quantity === "" ? null : direction === "add" ? amount : -amount,
        reason,
        note: note.trim() || undefined,
      });
      toast.success(`Recorded. New stock level: ${movement.stockAfter}.`);
      setQuantity("");
      setNote("");
      onRecorded();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold">
          Adjust stock
        </CardTitle>
        <CardDescription>
          Deliveries, returns, damaged or lost items.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBanner error={error && !error.isValidationError ? error : null} />
        <form
          onSubmit={submit}
          noValidate
          className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_auto_8rem_minmax(10rem,1fr)_minmax(12rem,2fr)_auto]"
        >
          <FormField label="Product" error={fe.productId}>
            <SearchSelect
              value={productId}
              onChange={setProductId}
              placeholder="Choose a product…"
              searchPlaceholder="Search products…"
              options={toProductOptions(products)}
            />
          </FormField>
          <Field>
            <FieldLabel id="direction-label">Direction</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={direction}
              aria-labelledby="direction-label"
              onValueChange={(value) =>
                value && switchDirection(value as "add" | "remove")
              }
              className="w-full"
            >
              <ToggleGroupItem value="add" className="flex-1">
                <PlusIcon />
                Add
              </ToggleGroupItem>
              <ToggleGroupItem value="remove" className="flex-1">
                <MinusIcon />
                Remove
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <FormField label="Quantity" error={fe.quantityChange}>
            <TextInput
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </FormField>
          <FormField label="Reason" error={fe.reason}>
            <Select
              value={reason}
              onChange={(e) => setReason(e.target.value as ManualStockReason)}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={noteRequired ? "Note (required)" : "Note (optional)"}
            error={fe.note}
          >
            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            {/* Keeps the button level with the inputs next to it. */}
            <span aria-hidden className="hidden text-sm leading-snug xl:block">
              &nbsp;
            </span>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Recording…" : "Record"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
