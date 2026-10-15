"use client";

import {
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  SearchIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  ErrorBanner,
  FormField,
  Notice,
  OtherFieldErrors,
  PageHeader,
  TextInput,
} from "@/components/common";
import { OrderCard } from "@/components/OrderCard";
import {
  EMPTY_PHONE,
  PHONE_ERROR_KEYS,
  PhoneField,
} from "@/components/PhoneField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/settings";
import type { Order, Product } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

interface BasketLine {
  product: Product;
  quantity: number;
}

export default function PointOfSalePage() {
  const { money } = useSettings();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [cash, setCash] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sale, setSale] = useState<Order | null>(null);

  const products = useLoad(`pos-${query}`, () =>
    api.get<Product[]>("/products", {
      params: { q: query || undefined, inStock: true },
    }),
  );

  const total = basket.reduce(
    (sum, l) => sum + l.product.price * l.quantity,
    0,
  );
  const cashNumber = cash === "" ? null : Number(cash);
  const change = cashNumber === null ? null : cashNumber - total;
  const stockErrors = error?.status === 409 ? error.fieldErrors : {};
  const fe = error && error.status !== 409 ? error.fieldErrors : {};

  function add(product: Product) {
    setBasket((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      if (!existing) return [...lines, { product, quantity: 1 }];
      return lines.map((l) =>
        l.product.id === product.id
          ? {
              ...l,
              quantity: Math.min(l.quantity + 1, product.stockQuantity, 100),
            }
          : l,
      );
    });
  }

  function setQuantity(productId: number, quantity: number) {
    setBasket((lines) =>
      lines
        .map((l) =>
          l.product.id === productId
            ? {
                ...l,
                quantity: Math.min(
                  Math.max(0, quantity),
                  l.product.stockQuantity,
                  100,
                ),
              }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>("/orders/in-store", {
        items: basket.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
        customerName,
        phone,
        cashReceived: cashNumber,
      });
      setSale(order);
      products.reload();
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      if (apiError.status === 409) products.reload();
    } finally {
      setBusy(false);
    }
  }

  function newSale() {
    setSale(null);
    setBasket([]);
    setCustomerName("");
    setPhone(EMPTY_PHONE);
    setCash("");
    setError(null);
  }

  if (sale) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="no-print flex gap-2">
          <Button type="button" onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            Print receipt
          </Button>
          <Button type="button" variant="outline" onClick={newSale}>
            New sale
          </Button>
        </div>
        {sale.customer && (
          <Notice tone="success" className="no-print">
            Linked to the account of {sale.customer.fullName} (
            {sale.customer.email}).
          </Notice>
        )}
        <OrderCard order={sale} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Point of sale"
        description="Record a walk-in cash sale. Only products in stock are listed."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search.trim());
              }}
            >
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products in stock…"
                  aria-label="Search products in stock"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" variant="secondary">
                    Search
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </CardHeader>
          <CardContent>
            <ErrorBanner error={products.error} />
            {products.loading && !products.data ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ul className="divide-y">
                {products.data?.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {money(p.price)} · {p.stockQuantity} in stock
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => add(p)}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Add
                    </Button>
                  </li>
                ))}
                {products.data?.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No products in stock match.
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">
              Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={complete} noValidate>
              <FieldGroup>
                {error && error.status !== 409 && (
                  <div>
                    <ErrorBanner error={error} />
                    <OtherFieldErrors
                      errors={fe}
                      shown={[
                        "customerName",
                        "cashReceived",
                        ...PHONE_ERROR_KEYS,
                      ]}
                    />
                  </div>
                )}
                {Object.keys(stockErrors).length > 0 && (
                  <Notice tone="warning" className="mb-0">
                    {error?.message}
                  </Notice>
                )}
                {basket.length === 0 ? (
                  <Empty className="border border-dashed p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ReceiptIcon />
                      </EmptyMedia>
                      <EmptyDescription>
                        Add products from the list.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ul className="divide-y rounded-lg border text-sm">
                    {basket.map((l) => {
                      const lineError = stockErrors[String(l.product.id)];
                      return (
                        <li
                          key={l.product.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2",
                            lineError && "bg-destructive/5",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">
                              {l.product.name}
                            </span>
                            {lineError && (
                              <span className="block text-xs text-destructive">
                                {lineError}
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Decrease quantity of ${l.product.name}`}
                            onClick={() =>
                              setQuantity(l.product.id, l.quantity - 1)
                            }
                          >
                            <MinusIcon />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            max={l.product.stockQuantity}
                            value={l.quantity}
                            onChange={(e) =>
                              setQuantity(l.product.id, Number(e.target.value))
                            }
                            aria-label={`Quantity of ${l.product.name}`}
                            className="h-6 w-12 px-1 text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Increase quantity of ${l.product.name}`}
                            disabled={
                              l.quantity >=
                              Math.min(l.product.stockQuantity, 100)
                            }
                            onClick={() =>
                              setQuantity(l.product.id, l.quantity + 1)
                            }
                          >
                            <PlusIcon />
                          </Button>
                          <span className="w-20 text-right tabular-nums">
                            {money(l.product.price * l.quantity)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-heading text-xl font-semibold tabular-nums">
                    {money(total)}
                  </span>
                </div>
                <Separator />
                <FormField label="Customer name" error={fe.customerName}>
                  <TextInput
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </FormField>
                <PhoneField
                  value={phone}
                  onChange={setPhone}
                  errors={fe}
                  required
                />
                <FormField
                  label="Cash received"
                  error={fe.cashReceived}
                  hint={
                    change === null ? undefined : change < 0 ? (
                      <span className="text-destructive">
                        Short by {money(-change)}
                      </span>
                    ) : (
                      `Change (preview): ${money(change)}`
                    )
                  }
                >
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                  />
                </FormField>
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy || basket.length === 0}
                >
                  {busy && <Spinner data-icon="inline-start" />}
                  {busy ? "Recording…" : `Complete sale · ${money(total)}`}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
