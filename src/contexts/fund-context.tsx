"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api-client";
import { getSelectedFundId, setSelectedFundId } from "@/lib/auth/session";

export type Fund = {
  id: string;
  name: string;
  currency: string;
  /** From funds.onboarding_mode — e.g. "new fund" | "Existing Fund". */
  onboardingMode?: string | null;
  /** From funds.reporting_start_date — migration / allocation start. */
  reportingStartDate?: string | null;
  shareUnitTracking?: boolean;
};

/** True when fund was onboarded as an existing fund. */
export function isExistingFund(onboardingMode: string | null | undefined): boolean {
  const mode = (onboardingMode ?? "").trim().toLowerCase();
  return mode === "existing" || mode === "existing fund" || mode.includes("existing");
}

type FundContextValue = {
  funds: Fund[];
  fundId: string | null;
  selectedFund: Fund | null;
  setFundId: (id: string) => void;
  loading: boolean;
  refreshFunds: () => Promise<Fund[]>;
  isExistingFundSelected: boolean;
};

const FundContext = createContext<FundContextValue | null>(null);

export function FundProvider({ children }: { children: ReactNode }) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundId, setFundIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFunds = useCallback(async () => {
    const res = await apiFetch("/api/funds", { logoutOn401: true });
    if (!res.ok) throw new Error("Failed to load funds");
    const data: Fund[] = await res.json();
    setFunds(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refreshFunds();
        if (cancelled) return;
        const stored = getSelectedFundId();
        const initial =
          stored && data.some((f) => f.id === stored)
            ? stored
            : data[0]?.id ?? null;
        setFundIdState(initial);
        if (initial) setSelectedFundId(initial);
      } catch {
        if (!cancelled) setFunds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFunds]);

  const setFundId = useCallback((id: string) => {
    setFundIdState(id);
    setSelectedFundId(id);
  }, []);

  const selectedFund = useMemo(
    () => funds.find((f) => f.id === fundId) ?? null,
    [funds, fundId],
  );

  const isExistingFundSelected = useMemo(
    () => isExistingFund(selectedFund?.onboardingMode),
    [selectedFund?.onboardingMode],
  );

  const value = useMemo(
    () => ({
      funds,
      fundId,
      selectedFund,
      setFundId,
      loading,
      refreshFunds,
      isExistingFundSelected,
    }),
    [
      funds,
      fundId,
      selectedFund,
      setFundId,
      loading,
      refreshFunds,
      isExistingFundSelected,
    ],
  );

  return (
    <FundContext.Provider value={value}>{children}</FundContext.Provider>
  );
}

export function useFund() {
  const ctx = useContext(FundContext);
  if (!ctx) {
    throw new Error("useFund must be used within FundProvider");
  }
  return ctx;
}
