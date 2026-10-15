"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";
import { moneyFormatter } from "@/lib/format";
import type { StoreSettings } from "@/lib/types";

const DEFAULT_SETTINGS: StoreSettings = {
  currency: "USD",
  currencyFractionDigits: 2,
  updatedAt: null,
};

interface SettingsContextValue {
  settings: StoreSettings;
  setSettings: (settings: StoreSettings) => void;
  /** Formats an amount in the shop currency. */
  money: (value: number | null | undefined) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    api.get<StoreSettings>("/settings").then(
      (loaded) => active && setSettings(loaded),
      () => undefined, // keep the default; prices still render
    );
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ settings, setSettings, money: moneyFormatter(settings.currency) }),
    [settings],
  );
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return value;
}
