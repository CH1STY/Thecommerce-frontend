"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ErrorBanner,
  FormField,
  Loading,
  PageHeader,
  Pager,
  Select,
  TextInput,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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

  function recorded() {
    products.reload();
    movements.reload();
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Record deliveries, returns and losses, and review the stock ledger."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[340px_1fr]">
        <AdjustmentForm
          products={products.data ?? []}
          defaultProduct={productFilter}
          onRecorded={recorded}
        />

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">
              Stock history
            </CardTitle>
            <CardDescription>Every change to stock, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Product">
                <Select
                  value={productFilter}
                  onChange={(e) => {
                    setProductFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All products</option>
                  {products.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock {p.stockQuantity})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Reason">
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
            <ErrorBanner error={movements.error} />
            {movements.loading && !movements.data ? (
              <Loading />
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Note / order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.data?.content.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(m.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
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
                        <TableCell>
                          {m.actor?.fullName ?? "Guest/System"}
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal">
                          {m.note}
                          {m.orderId !== null && (
                            <span className="text-muted-foreground">
                              {" "}
                              Order #{m.orderId}
                            </span>
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
              </div>
            )}
            {movements.data && (
              <Pager
                page={movements.data.page}
                totalPages={movements.data.totalPages}
                onPage={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
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
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField label="Product" error={fe.productId}>
              <Select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Choose a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock {p.stockQuantity})
                  </option>
                ))}
              </Select>
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
                  Add stock
                </ToggleGroupItem>
                <ToggleGroupItem value="remove" className="flex-1">
                  <MinusIcon />
                  Remove stock
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
            <Button type="submit" disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {busy ? "Recording…" : "Record"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
