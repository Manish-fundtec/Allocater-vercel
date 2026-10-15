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
import {
  getFundIdFromSearch,
  getSelectedFundId,
  setSelectedFundId,
  syncAllocatorSessionCookie,
} from "@/lib/auth/session";

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

function pickInitialFundId(data: Fund[]): string | null {
  const fromUrl = getFundIdFromSearch();
  if (fromUrl && data.some((f) => f.id === fromUrl)) {
    return fromUrl;
  }
  const stored = getSelectedFundId();
  if (stored && data.some((f) => f.id === stored)) {
    return stored;
  }
  // If Tychi sent a fund_id that is not in allocator list yet, still keep it
  // so the UI can show the id until funds load / DB catch up.
  if (fromUrl) return fromUrl;
  return data[0]?.id ?? null;
}

export function FundProvider({ children }: { children: ReactNode }) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundId, setFundIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFunds = useCallback(async () => {
    syncAllocatorSessionCookie();
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
        syncAllocatorSessionCookie();
        const fromUrl = getFundIdFromSearch();
        if (fromUrl) setSelectedFundId(fromUrl);

        const data = await refreshFunds();
        if (cancelled) return;
        const initial = pickInitialFundId(data);
        setFundIdState(initial);
        if (initial) setSelectedFundId(initial);
      } catch {
        if (!cancelled) {
          setFunds([]);
          const fromUrl = getFundIdFromSearch();
          if (fromUrl) {
            setFundIdState(fromUrl);
            setSelectedFundId(fromUrl);
          }
        }
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

  const selectedFund = useMemo(() => {
    const match = funds.find((f) => f.id === fundId);
    if (match) return match;
    // Show entered fund even if /api/funds list is empty / still loading.
    if (fundId) {
      return {
        id: fundId,
        name: `Fund ${fundId.slice(0, 8)}`,
        currency: "",
      };
    }
    return null;
  }, [funds, fundId]);

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
