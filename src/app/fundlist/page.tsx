"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearAuthSession, isAuthenticated } from "@/lib/auth/session";
import { getLoginTarget } from "@/lib/auth/login-target";
import {
  enterFund,
  fetchAssignedFunds,
  type GlFund,
} from "@/lib/auth/tychi-auth";
import { ApiClientError } from "@/lib/api-client";

export default function FundListPage() {
  const router = useRouter();
  const [funds, setFunds] = useState<GlFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const loadFunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated()) {
        router.replace("/auth/sign-in?next=/fundlist");
        return;
      }
      const list = await fetchAssignedFunds();
      setFunds(list);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load funds";
      setError(message);
      if (err instanceof ApiClientError && err.status === 401) {
        clearAuthSession();
        router.replace("/auth/sign-in?next=/fundlist");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadFunds();
  }, [loadFunds]);

  async function onEnter(fundId: string) {
    setEnteringId(fundId);
    try {
      await enterFund(fundId, getLoginTarget());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open fund");
      setEnteringId(null);
    }
  }

  function onLogout() {
    clearAuthSession();
    router.replace("/auth/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#f4f5f8] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Tychi</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fundadmin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">
              Tychi <span className="text-slate-300">›</span> Fundadmin
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Fundadmin</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Assigned funds for your login. Open a fund to continue.
            </p>
          </div>

          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Loading funds...
            </p>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void loadFunds()}
              >
                Retry
              </Button>
            </div>
          ) : funds.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No funds assigned to this user.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sr. No</th>
                    <th className="px-5 py-3 font-semibold">Fund ID</th>
                    <th className="px-5 py-3 font-semibold">Fund Name</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund, index) => (
                    <tr
                      key={fund.fund_id}
                      className="border-t border-gray-100 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">
                        {fund.fund_id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {fund.fund_name}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="green">
                          {fund.fund_status || "Active"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          type="button"
                          size="icon"
                          disabled={enteringId === fund.fund_id}
                          onClick={() => void onEnter(fund.fund_id)}
                          aria-label={`Open ${fund.fund_name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
