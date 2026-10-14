"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useFund } from "@/contexts/fund-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  downloadInvestorRegisterXlsx,
  formatRegisterDate,
  formatRegisterMoney,
  formatRegisterUnits,
  type InvestorRegisterReport,
} from "@/lib/allocator/investorRegister";

const COLUMNS = [
  "S. No.",
  "Investor ID",
  "Investor Name",
  "Class",
  "Transaction Type",
  "Units",
  "Gross Amount",
  "Transaction Charges",
  "Net Amount",
  "Application Date",
  "Funding Date",
  "Dealing Date",
  "NAV Per Unit",
  "Total Value",
] as const;

export function InvestorRegisterReportContent() {
  const { fundId, selectedFund } = useFund();
  const [dealingDate, setDealingDate] = useState("all");
  const [dealingDates, setDealingDates] = useState<string[]>([]);
  const [report, setReport] = useState<InvestorRegisterReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ fundId });
    if (dealingDate !== "all") params.set("dealingDate", dealingDate);
    const res = await fetch(
      `/api/allocator/reports/investor-register?${params}`,
    );
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setReport(null);
      setError(
        (data as { error?: string }).error ?? "Could not build investor register",
      );
      return;
    }
    const data = (await res.json()) as InvestorRegisterReport;
    setReport(data);
    setDealingDates(data.dealingDates ?? []);
  }, [fundId, dealingDate]);

  useEffect(() => {
    setReport(null);
    setError("");
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    setDealingDate("all");
  }, [fundId]);

  async function onDownload() {
    if (!report) return;
    setDownloading(true);
    try {
      await downloadInvestorRegisterXlsx(report);
    } finally {
      setDownloading(false);
    }
  }

  const lines = report?.lines ?? [];
  const totals = report?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-[220px]">
            <p className="mb-1.5 text-sm text-gray-500">Dealing date</p>
            <Select value={dealingDate} onValueChange={setDealingDate}>
              <SelectTrigger>
                <SelectValue placeholder="All dealings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealings</SelectItem>
                {dealingDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {formatRegisterDate(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-gray-500">Fund</p>
            <p className="pt-2 font-medium text-slate-900">
              {report?.fundName ?? selectedFund?.name ?? "—"}
            </p>
          </div>
        </div>
        <Button onClick={() => void onDownload()} disabled={!report || downloading}>
          <Download className="h-4 w-4" />
          {downloading ? "Preparing…" : "Download Excel"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Building investor register…</p>
      ) : null}

      {!loading && !error && report ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{report.fundName}</p>
            <p className="text-sm text-slate-700">Investor Register</p>
            <p className="text-xs text-slate-500">{report.asOfLabel}</p>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <table className="min-w-max border-collapse text-[12px] leading-tight">
              <thead className="sticky top-0 z-20">
                <tr>
                  {COLUMNS.map((label) => (
                    <th
                      key={label}
                      className="border border-slate-300 bg-[#d6e3f0] px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800 whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={`${line.investorId}-${line.dealingDate}-${line.serialNo}`}>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                      {line.serialNo}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {line.investorCode || "—"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap font-medium text-slate-900">
                      {line.investorName}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center">
                      {line.shareClass ?? "—"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">
                      {line.transactionType}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterUnits(line.units)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(line.grossAmount)}
                    </td>
                    <td
                      className={cn(
                        "border border-slate-200 px-2 py-1.5 text-right tabular-nums",
                        line.transactionCharges > 0 && "text-red-700",
                      )}
                    >
                      {line.transactionCharges > 0
                        ? formatRegisterMoney(line.transactionCharges, true)
                        : "–"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(line.netAmount)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">
                      {formatRegisterDate(line.applicationDate)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">
                      {formatRegisterDate(line.fundingDate)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">
                      {formatRegisterDate(line.dealingDate)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(line.navPerUnit)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums font-medium">
                      {formatRegisterMoney(line.totalValue)}
                    </td>
                  </tr>
                ))}
                {totals ? (
                  <tr className="bg-[#d6e3f0]/60 font-semibold">
                    <td className="border border-slate-300 px-2 py-1.5" colSpan={5}>
                      Total
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterUnits(totals.units)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(totals.grossAmount)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-red-700">
                      {totals.transactionCharges > 0
                        ? formatRegisterMoney(totals.transactionCharges, true)
                        : "–"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(totals.netAmount)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5" colSpan={4} />
                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                      {formatRegisterMoney(totals.totalValue)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
