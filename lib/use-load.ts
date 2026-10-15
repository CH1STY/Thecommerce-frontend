"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { toApiError, type ApiError } from "@/lib/api-client";

interface Result<T> {
  requestKey: string;
  data?: T;
  error: ApiError | null;
}

/**
 * Loads data through `lib/api-client` whenever `key` changes (pass `null` to skip).
 * The key must encode every input of `load` (e.g. query params). Previous data stays visible while reloading.
 */
export function useLoad<T>(key: string | null, load: () => Promise<T>) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestKey = key === null ? null : `${key}#${nonce}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    if (requestKey === null) return;
    let active = true;
    run().then(
      (data) => active && setResult({ requestKey, data, error: null }),
      (error: unknown) =>
        active &&
        setResult((prev) => ({
          requestKey,
          data: prev?.data,
          error: toApiError(error),
        })),
    );
    return () => {
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (update: (current: T) => T) =>
      setResult((prev) =>
        prev && prev.data !== undefined
          ? { ...prev, data: update(prev.data) }
          : prev,
      ),
    [],
  );

  return {
    data: result?.data,
    error: result?.error ?? null,
    loading: requestKey !== null && result?.requestKey !== requestKey,
    reload,
    setData,
  };
}
