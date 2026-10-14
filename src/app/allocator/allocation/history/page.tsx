"use client";

import { useCallback, useEffect, useState } from "react";
import { useFund } from "@/contexts/fund-context";
import { PageHeader } from "@/components/allocator/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatPeriodLong,
  formatProfit,
} from "@/lib/allocator/format";

type Run = {
  period: string;
  totalProfit: number | null;
  status: string;
  investorCount: number;
  runAt: string | null;
  canDelete?: boolean;
};

export function AllocationHistoryContent({
  embedded,
}: {
  embedded?: boolean;
}) {
  const { fundId, loading: fundLoading } = useFund();
  const [runs, setRuns] = useState<Run[]>([]);
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!fundId) return;
    const res = await fetch(
      `/api/allocator/allocation/history?fundId=${fundId}&limit=50`,
    );
    if (res.ok) setRuns(await res.json());
  }, [fundId]);

  useEffect(() => {
    if (!fundLoading && fundId) load();
  }, [fundId, fundLoading, load]);

  async function onDelete(period: string) {
    if (!fundId || deletingPeriod) return;
    const label = formatPeriodLong(period);
    const ok = window.confirm(
      `Delete the ${label} allocation? This removes that allocation and its GL journals, and resets investor NAV for the month. You can run the allocation again afterwards.`,
    );
    if (!ok) return;
    setDeletingPeriod(period);
    setError("");
    try {
      const res = await fetch("/api/allocator/allocation/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundId, period }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Could not delete allocation",
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete allocation");
    } finally {
      setDeletingPeriod(null);
    }
  }

  return (
    <>
      {!embedded ? <PageHeader title="Allocation History" /> : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Total profit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Investors</TableHead>
              <TableHead>Run at</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.period + (run.runAt ?? "")}>
                <TableCell className="font-medium">
                  {formatPeriodLong(run.period)}
                </TableCell>
                <TableCell>
                  {run.totalProfit != null ? (
                    <span
                      className={
                        run.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatProfit(run.totalProfit)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      run.status === "completed"
                        ? "green"
                        : run.status === "failed"
                          ? "red"
                          : "orange"
                    }
                  >
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.investorCount}</TableCell>
                <TableCell>
                  {run.runAt ? formatDate(run.runAt) : "—"}
                </TableCell>
                <TableCell>
                  {run.canDelete ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingPeriod != null}
                      onClick={() => void onDelete(run.period)}
                    >
                      {deletingPeriod === run.period ? "Deleting…" : "Delete"}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function AllocationHistoryPage() {
  return <AllocationHistoryContent />;
}
