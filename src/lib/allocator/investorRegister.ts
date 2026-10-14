export type InvestorRegisterLine = {
  serialNo: number;
  investorId: string;
  investorCode: string;
  investorName: string;
  shareClass: string | null;
  transactionType: string;
  units: number;
  grossAmount: number;
  transactionCharges: number;
  netAmount: number;
  applicationDate: string | null;
  fundingDate: string | null;
  dealingDate: string | null;
  navPerUnit: number | null;
  totalValue: number;
};

export type InvestorRegisterReport = {
  fundId: string;
  fundName: string;
  dealingDates: string[];
  dealingDate: string | null;
  asOfLabel: string;
  lineCount: number;
  investorCount: number;
  lines: InvestorRegisterLine[];
  totals: {
    units: number;
    grossAmount: number;
    transactionCharges: number;
    netAmount: number;
    totalValue: number;
  };
};

export function formatRegisterDate(value: string | null | undefined): string {
  if (!value) return "–";
  const day = value.trim().slice(0, 10);
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return value;
  const suffix =
    date % 10 === 1 && date !== 11
      ? "st"
      : date % 10 === 2 && date !== 12
        ? "nd"
        : date % 10 === 3 && date !== 13
          ? "rd"
          : "th";
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  });
  return `${String(date).padStart(2, "0")}${suffix} ${monthLabel} ${year}`;
}

export function formatRegisterMoney(
  value: number | null | undefined,
  parenIfNegative = false,
): string {
  if (value == null || !Number.isFinite(value)) return "–";
  const abs = Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (parenIfNegative && value > 0) return `(${abs})`;
  if (value < 0) return `(${abs})`;
  return abs;
}

export function formatRegisterUnits(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export async function downloadInvestorRegisterXlsx(report: InvestorRegisterReport) {
  const XLSX = await import("xlsx");
  const header = [
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
  ];

  const dataRows = report.lines.map((line) => [
    line.serialNo,
    line.investorCode,
    line.investorName,
    line.shareClass,
    line.transactionType,
    line.units,
    line.grossAmount,
    line.transactionCharges ? -line.transactionCharges : null,
    line.netAmount,
    formatRegisterDate(line.applicationDate),
    formatRegisterDate(line.fundingDate),
    formatRegisterDate(line.dealingDate),
    line.navPerUnit,
    line.totalValue,
  ]);

  const totalRow = [
    "",
    "",
    "Total",
    "",
    "",
    report.totals.units,
    report.totals.grossAmount,
    report.totals.transactionCharges ? -report.totals.transactionCharges : null,
    report.totals.netAmount,
    "",
    "",
    "",
    "",
    report.totals.totalValue,
  ];

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [report.fundName],
    ["Investor Register"],
    [report.asOfLabel],
    [],
    header,
    ...dataRows,
    totalRow,
  ]);
  sheet["!cols"] = header.map((label) => ({
    wch: Math.max(14, Math.min(22, label.length + 2)),
  }));
  XLSX.utils.book_append_sheet(wb, sheet, "Investor Register");
  XLSX.writeFile(
    wb,
    `${report.fundName.replace(/\s+/g, "-")}-investor-register.xlsx`,
  );
}
