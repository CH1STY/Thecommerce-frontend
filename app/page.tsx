"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, toApiError, type ApiError, type FieldErrors } from "@/lib/api-client";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const emptyForm = { name: "", description: "", price: "", imageUrl: "" };
type FormState = typeof emptyForm;

function ErrorBanner({ error, onDismiss }: { error: ApiError; onDismiss?: () => void }) {
  return (
    <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">
            {error.status > 0 ? `${error.status} · ${error.title}` : error.title}
          </p>
          <p className="text-sm">{error.message}</p>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="text-sm underline">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState<Product | null>(null);
  const [lookupError, setLookupError] = useState<ApiError | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await api.get<Product[]>("/products"));
      setLoadError(null);
    } catch (error) {
      setLoadError(toApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      const created = await api.post<Product>("/products", {
        ...form,
        price: form.price === "" ? null : Number(form.price),
      });
      setProducts((current) => [...current, created]);
      setForm(emptyForm);
    } catch (error) {
      const apiError = toApiError(error);
      setFieldErrors(apiError.fieldErrors);
      setSubmitError(apiError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupResult(null);
    setLookupError(null);
    try {
      setLookupResult(await api.get<Product>(`/products/${encodeURIComponent(lookupId.trim())}`));
    } catch (error) {
      setLookupError(toApiError(error));
    }
  }

  const input = (field: keyof FormState, label: string, type = "text") => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        aria-invalid={Boolean(fieldErrors[field])}
        className={`rounded border px-3 py-2 text-gray-900 ${fieldErrors[field] ? "border-red-500" : "border-gray-300"}`}
      />
      {fieldErrors[field] && <span className="text-xs text-red-600">{fieldErrors[field]}</span>}
    </label>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">TheCommerce Store</h1>

        {loadError && <ErrorBanner error={loadError} onDismiss={() => void loadProducts()} />}

        {loading ? (
          <p className="text-center text-gray-600">Loading products...</p>
        ) : products.length === 0 && !loadError ? (
          <p className="text-center text-gray-600">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col justify-between rounded-lg bg-white p-6 shadow">
                <div>
                  <h2 className="mb-2 text-xl font-semibold text-gray-700">{product.name}</h2>
                  <p className="mb-4 text-gray-600">{product.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">{price.format(product.price)}</span>
                  <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Add a product</h2>
            {submitError && !submitError.isValidationError && <ErrorBanner error={submitError} />}
            {submitError?.isValidationError && (
              <p role="alert" className="mb-4 text-sm text-red-700">{submitError.message}</p>
            )}
            <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4">
              {input("name", "Name")}
              {input("description", "Description")}
              {input("price", "Price", "number")}
              {input("imageUrl", "Image URL", "url")}
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create product"}
              </button>
            </form>
          </section>

          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Find a product by ID</h2>
            <form onSubmit={handleLookup} className="mb-4 flex gap-2">
              <input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="e.g. 1"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-gray-900"
              />
              <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700">
                Find
              </button>
            </form>
            {lookupError && <ErrorBanner error={lookupError} />}
            {lookupResult && (
              <div className="rounded border border-gray-200 p-4 text-gray-700">
                <p className="font-semibold">#{lookupResult.id} · {lookupResult.name}</p>
                <p className="text-sm">{lookupResult.description}</p>
                <p className="font-bold text-green-600">{price.format(lookupResult.price)}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
