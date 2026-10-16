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
  otp: {
    mode: "EMAIL",
    loginRequired: false,
    orderRequired: false,
    guestOrderRequired: true,
    registerRequired: true,
  },
};

interface SettingsContextValue {
  settings: StoreSettings;
  /** False until the real settings arrived (the defaults are shown meanwhile). */
  loaded: boolean;
  setSettings: (settings: StoreSettings) => void;
  /** Formats an amount in the shop currency. */
  money: (value: number | null | undefined) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api.get<StoreSettings>("/settings").then(
      (fetched) => {
        if (!active) return;
        setSettings({ ...DEFAULT_SETTINGS, ...fetched });
        setLoaded(true);
      },
      () => active && setLoaded(true), // keep the defaults; prices still render
    );
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loaded,
      setSettings,
      money: moneyFormatter(settings.currency),
    }),
    [settings, loaded],
  );
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return value;
}
