export type ReportNumberFormat =
  | "money"
  | "shares"
  | "percent"
  | "nav"
  | "navPrecise"
  | "text"
  | "date"
  | "days";

export type AllocationColumnKey =
  | "investorCode"
  | "investorName"
  | "termsTitle"
  | "openingYtdShares"
  | "openingYtdNavPerShare"
  | "openingYtdNet"
  | "openingYtdGross"
  | "openingMtdShares"
  | "openingMtdNavPerShare"
  | "openingMtdNet"
  | "openingMtdGross"
  | "subRedShares"
  | "subRedIssuePrice"
  | "subRedAmount"
  | "equalizationCredit"
  | "adjShares"
  | "adjNavPerShare"
  | "adjNet"
  | "adjGross"
  | "priorHighWaterMark"
  | "adjHighWaterMark"
  | "allocationPct"
  | "openingYtdPnl"
  | "realizedPnl"
  | "unrealizedPnl"
  | "onboardingFee"
  | "brokerageExpense"
  | "researchExpense"
  | "kycAmlFee"
  | "bankFees"
  | "administrationFee"
  | "professionalFees"
  | "interestIncome"
  | "interestExpense"
  | "organizationalExpenses"
  | "withholdingTaxExpense"
  | "miscellaneousExpense"
  | "borrowFee"
  | "dividendIncome"
  | "dividendExpense"
  | "overdraftFees"
  | "grossMtdPnl"
  | "closingYtdPnl"
  | "navPrior"
  | "openingYtdMgmtFees"
  | "mtdMgmtFees"
  | "netMtdPnl"
  | "netYtdPnl"
  | "gav"
  | "subscriptionDate"
  | "navDate"
  | "hurdleDays"
  | "hurdleBase"
  | "hurdleCrossed"
  | "adjustedPnl"
  | "tier1"
  | "tier2"
  | "perfFeesAccrual"
  | "perfFeesAccrued"
  | "perfFeesPnl"
  | "openingAccruedPerfFee"
  | "perfFeePaid"
  | "eqEligible"
  | "eqSharesPre"
  | "eqNavPre"
  | "eqNetCapital"
  | "eqClassNav"
  | "eqShareAdj"
  | "eqSharesPost"
  | "closingShares"
  | "closingNavPerShare"
  | "closingNet"
  | "closingGross"
  | "netMtdReturn"
  | "grossMtdReturn"
  | "absYtdReturn"
  | "netYtdCompounded"
  | "grossYtdReturn";

export type InvestorAllocationRow = Record<string, string | number | null | undefined> & {
  investorId: string;
  plLines?: Record<string, number | null>;
};

export type PlColumnDef = {
  key: string;
  label: string;
  glCode?: string;
};

export type AllocationColumn = {
  key: string;
  label: string;
  format: ReportNumberFormat;
};

export type AllocationGroup = {
  key: string;
  label: string;
  columns: AllocationColumn[];
};

export function allocationGroups(opts: {
  hurdleRate: number;
  perfFeePct: number;
  perfTierPct?: number;
  /** Extra P&L columns from fund COA / fetched snapshot (dynamic GLs). */
  plColumns?: PlColumnDef[];
}): AllocationGroup[] {
  const hurdle = Number.isFinite(opts.hurdleRate) && opts.hurdleRate > 0 ? opts.hurdleRate : 5;
  const tier =
    Number.isFinite(opts.perfTierPct) && (opts.perfTierPct ?? 0) > 0
      ? Number(opts.perfTierPct)
      : 30;
  const groups: AllocationGroup[] = [
    {
      key: "details",
      label: "Details",
      columns: [
        { key: "investorCode", label: "Investor ID", format: "text" },
        { key: "investorName", label: "Investor Name", format: "text" },
        { key: "termsTitle", label: "Terms Title", format: "text" },
      ],
    },
    {
      key: "openingYtd",
      label: "Opening YTD",
      columns: [
        { key: "openingYtdShares", label: "Number of Shares", format: "shares" },
        { key: "openingYtdNavPerShare", label: "NAV Per Share", format: "nav" },
        { key: "openingYtdNet", label: "Net Capital Balance", format: "money" },
        { key: "openingYtdGross", label: "Gross Capital Balance", format: "money" },
      ],
    },
    {
      key: "openingMtd",
      label: "Opening MTD",
      columns: [
        { key: "openingMtdShares", label: "Number of Shares", format: "shares" },
        { key: "openingMtdNavPerShare", label: "NAV Per Share", format: "nav" },
        { key: "openingMtdNet", label: "Net Capital Balance", format: "money" },
        { key: "openingMtdGross", label: "Gross Capital Balance", format: "money" },
      ],
    },
    {
      key: "subRed",
      label: "Subscription/Redemption",
      columns: [
        { key: "subRedShares", label: "Number of shares", format: "shares" },
        { key: "subRedIssuePrice", label: "Issue Price/Share", format: "navPrecise" },
        { key: "subRedAmount", label: "Amount", format: "money" },
        { key: "equalizationCredit", label: "Equalization Credit", format: "money" },
      ],
    },
    {
      key: "adjusted",
      label: "Adjusted Opening",
      columns: [
        { key: "adjShares", label: "Number of Shares", format: "shares" },
        { key: "adjNavPerShare", label: "NAV Per Share", format: "nav" },
        { key: "adjNet", label: "Net Capital Balance", format: "money" },
        { key: "adjGross", label: "Gross Capital Balance", format: "money" },
        { key: "priorHighWaterMark", label: "Prior High Water Mark", format: "money" },
        { key: "adjHighWaterMark", label: "Adj High Water Mark", format: "money" },
        { key: "allocationPct", label: "Allocation %", format: "percent" },
      ],
    },
    {
      key: "pnl",
      label: "P&L",
      columns: [
        { key: "openingYtdPnl", label: "Opening YTD P&L", format: "money" },
        { key: "realizedPnl", label: "Realized P&L", format: "money" },
        { key: "unrealizedPnl", label: "Unrealized P&L", format: "money" },
        { key: "onboardingFee", label: "Investor Onboarding Fees", format: "money" },
        { key: "borrowFee", label: "Borrow Fee", format: "money" },
        { key: "brokerageExpense", label: "Brokerage Expense", format: "money" },
        { key: "researchExpense", label: "Research Expense", format: "money" },
        { key: "kycAmlFee", label: "Investor KYC/AML Fees", format: "money" },
        { key: "bankFees", label: "Bank Fees", format: "money" },
        { key: "administrationFee", label: "Administration Fee", format: "money" },
        { key: "professionalFees", label: "Professional Fees", format: "money" },
        { key: "interestIncome", label: "Interest Income", format: "money" },
        { key: "interestExpense", label: "Interest Expense", format: "money" },
        { key: "organizationalExpenses", label: "Organizational Expenses", format: "money" },
        { key: "withholdingTaxExpense", label: "Withholding Tax Expense", format: "money" },
        { key: "miscellaneousExpense", label: "Other Expense", format: "money" },
        { key: "dividendIncome", label: "Dividend Income", format: "money" },
        { key: "dividendExpense", label: "Dividend Expense", format: "money" },
        { key: "overdraftFees", label: "Overdraft Fees", format: "money" },
        { key: "grossMtdPnl", label: "Gross MTD P&L", format: "money" },
        { key: "closingYtdPnl", label: "Closing YTD P&L", format: "money" },
      ],
    },
    {
      key: "mgmt",
      label: "Management Fees",
      columns: [
        { key: "navPrior", label: "GAV_Prior Mgmt Fees", format: "money" },
        { key: "openingYtdMgmtFees", label: "Opening YTD Mgmt Fees", format: "money" },
        { key: "mtdMgmtFees", label: "MTD Mgmt Fees", format: "money" },
        { key: "netMtdPnl", label: "Net MTD P&L", format: "money" },
        { key: "netYtdPnl", label: "Net YTD P&L", format: "money" },
      ],
    },
    {
      key: "perf",
      label: "Performance Fees",
      columns: [
        { key: "gav", label: "GAV", format: "money" },
        { key: "subscriptionDate", label: "Subscription Date", format: "date" },
        { key: "navDate", label: "NAV Date", format: "date" },
        { key: "hurdleDays", label: "Number of Days", format: "days" },
        {
          key: "hurdleCrossed",
          label: `Hurdle Base (up ${hurdle}%)`,
          format: "text",
        },
        { key: "hurdleBase", label: "Hurdle Base", format: "money" },
        { key: "adjustedPnl", label: "Excess Over Hurdle", format: "money" },
        {
          key: "tier1",
          label: `Tier 1 (up ${tier}% Net P&L)`,
          format: "money",
        },
        {
          key: "tier2",
          label: `Tier 2 (above ${tier}% Net P&L)`,
          format: "money",
        },
        { key: "perfFeesAccrual", label: "Performance Fee Crystallised", format: "money" },
      ],
    },
    {
      key: "perfAccrued",
      label: "Performance Fee Accrued",
      columns: [
        { key: "perfFeesAccrued", label: "Accrued Performance Fees", format: "money" },
      ],
    },
    {
      key: "perfPnl",
      label: "Performance Fees",
      columns: [
        { key: "perfFeesPnl", label: "Performance Fees (P&L)", format: "money" },
        {
          key: "openingAccruedPerfFee",
          label: "Opening Accrued Performance Fee",
          format: "money",
        },
        { key: "perfFeePaid", label: "Performance Fee Paid", format: "money" },
      ],
    },
    {
      key: "equalisation",
      label: "Equalisation",
      columns: [
        { key: "eqEligible", label: "Eligibility Status", format: "text" },
        { key: "eqSharesPre", label: "Shares (Pre-Equalisation)", format: "shares" },
        { key: "eqNavPre", label: "NAV per Share (Pre-Equalisation)", format: "nav" },
        { key: "eqNetCapital", label: "Net Capital Balance", format: "money" },
        { key: "eqClassNav", label: "Applicable Class NAV per Share", format: "nav" },
        { key: "eqShareAdj", label: "Equalisation Share Adjustment", format: "shares" },
        { key: "eqSharesPost", label: "Shares (Post-Equalisation)", format: "shares" },
      ],
    },
    {
      key: "closing",
      label: "Closing",
      columns: [
        { key: "closingShares", label: "Number of Shares", format: "shares" },
        { key: "closingNavPerShare", label: "NAV Per Share", format: "nav" },
        { key: "closingNet", label: "Net Capital Balance", format: "money" },
        { key: "closingGross", label: "Gross Capital Balance", format: "money" },
      ],
    },
    {
      key: "returns",
      label: "Rate of Return (%)",
      columns: [
        { key: "netMtdReturn", label: "Net MTD", format: "percent" },
        { key: "grossMtdReturn", label: "Gross MTD", format: "percent" },
        { key: "absYtdReturn", label: "Abs YTD", format: "percent" },
        {
          key: "netYtdCompounded",
          label: "Net YTD (compounded Return)",
          format: "percent",
        },
        { key: "grossYtdReturn", label: "Gross YTD", format: "percent" },
      ],
    },
  ];

  // P&L section columns come from fetched pl_reports rows (plColumns), not a
  // hard-coded GL catalogue. Keep Opening/Gross/Closing YTD wrappers.
  const pnlGroup = groups.find((g) => g.key === "pnl");
  if (pnlGroup && opts.plColumns?.length) {
    const fromSnapshot: AllocationColumn[] = opts.plColumns.map((c) => ({
      key: c.key,
      label: c.label || c.key,
      format: "money" as const,
    }));
    pnlGroup.columns = [
      { key: "openingYtdPnl", label: "Opening YTD P&L", format: "money" },
      ...fromSnapshot,
      { key: "grossMtdPnl", label: "Gross MTD P&L", format: "money" },
      { key: "closingYtdPnl", label: "Closing YTD P&L", format: "money" },
    ];
  }

  return groups;
}

/** Excel only fills Hurdle Base ($) on rows that crossed the hurdle. */
export function reportCellValue(
  row: InvestorAllocationRow,
  col: AllocationColumn,
): string | number | null {
  if (
    col.key === "hurdleBase" &&
    row.hurdleCrossed !== "Yes" &&
    row.investorId !== "total"
  ) {
    return null;
  }
  const fromPl =
    row.plLines && col.key in row.plLines ? row.plLines[col.key] : undefined;
  const raw = fromPl !== undefined ? fromPl : row[col.key];
  if (col.key === "hurdleCrossed" && raw === "No") return null;
  if (col.key === "perfFeesAccrual") {
    const n = Number(raw);
    if (raw == null || raw === "" || !Number.isFinite(n) || Math.abs(n) < 0.005) {
      return null;
    }
  }
  return raw == null || raw === "" ? null : raw;
}

function formatIsoDate(value: string): string | null {
  const s = value.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

export function formatReportCell(
  value: string | number | null | undefined,
  format: ReportNumberFormat,
): string {
  if (value == null || value === "") return "–";
  if (format === "text") {
    return String(value);
  }
  if (format === "date") {
    return formatIsoDate(String(value)) ?? "–";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  if (format === "percent") {
    const pct = n * 100;
    const abs = Math.abs(pct).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return pct < 0 ? `(${abs}%)` : `${abs}%`;
  }
  const fractionDigits =
    format === "navPrecise" || format === "shares" ? 8 : format === "nav" ? 4 : 2;
  const abs = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  });
  return n < 0 ? `(${abs})` : abs;
}

export function isNegativeReportValue(
  value: string | number | null | undefined,
  format: ReportNumberFormat,
): boolean {
  if (format === "text" || format === "date" || value == null || value === "")
    return false;
  const n = Number(value);
  return Number.isFinite(n) && n < 0;
}

export type InvestorAllocationReport = {
  fundId: string;
  fundName: string;
  period: string;
  asOfDate: string;
  hurdleRate: number;
  perfFeePct: number;
  perfTierPct?: number;
  allocated?: boolean;
  plColumns?: PlColumnDef[];
  rows: InvestorAllocationRow[];
  totals: InvestorAllocationRow;
  check?: InvestorAllocationRow | null;
};

function colLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function excelNumFmt(format: ReportNumberFormat): string | undefined {
  if (format === "text" || format === "date") return undefined;
  if (format === "percent") return "0.00####%;(0.00####%)";
  if (format === "navPrecise") return "#,##0.00######;(#,##0.00######)";
  return "#,##0.00;(#,##0.00)";
}

export async function downloadInvestorAllocationXlsx(
  report: InvestorAllocationReport,
) {
  const XLSX = await import("xlsx");
  const groups = allocationGroups({
    hurdleRate: report.hurdleRate,
    perfFeePct: report.perfFeePct,
    perfTierPct: report.perfTierPct,
    plColumns: report.plColumns,
  });
  const columns = groups.flatMap((g) => g.columns);
  const asOf = new Date(`${report.asOfDate}T00:00:00`);
  const asOfLabel = Number.isNaN(asOf.getTime())
    ? report.asOfDate
    : asOf.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const groupRow: (string | number | null)[] = [];
  const headerRow: (string | number | null)[] = [];
  for (const group of groups) {
    group.columns.forEach((col, i) => {
      groupRow.push(i === 0 ? group.label : "");
      headerRow.push(col.label);
    });
  }

  function rowValues(row: InvestorAllocationRow): (string | number | null)[] {
    return columns.map((col) => {
      const raw = reportCellValue(row, col);
      if (raw == null || raw === "") return null;
      if (col.format === "text") {
        const s = String(raw);
        return s === "No" ? null : s;
      }
      if (col.format === "date") return formatIsoDate(String(raw));
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    });
  }

  const aoa: (string | number | null)[][] = [
    [report.fundName],
    ["Investor Allocation"],
    [asOfLabel],
    [],
    groupRow,
    headerRow,
    ...report.rows.map(rowValues),
    rowValues(report.totals),
    ...(report.check ? [rowValues(report.check)] : []),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] =
    [];
  let col = 0;
  for (const group of groups) {
    const start = col;
    const end = col + group.columns.length - 1;
    if (end > start) {
      merges.push({ s: { r: 4, c: start }, e: { r: 4, c: end } });
    }
    col = end + 1;
  }
  ws["!merges"] = merges;
  ws["!cols"] = columns.map((c) => ({
    wch: Math.max(12, Math.min(28, c.label.length + 2)),
  }));

  const dataStart = 6;
  const dataEnd =
    dataStart + report.rows.length + (report.check ? 1 : 0);
  for (let r = dataStart; r <= dataEnd; r++) {
    columns.forEach((col, c) => {
      const fmt = excelNumFmt(col.format);
      if (!fmt) return;
      const addr = `${colLetter(c)}${r + 1}`;
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmt;
      }
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Investor Allocation");
  const safeFund = report.fundName.replace(/[^\w-]+/g, "_");
  XLSX.writeFile(wb, `${safeFund}_Investor_Allocation_${report.period}.xlsx`);
}
