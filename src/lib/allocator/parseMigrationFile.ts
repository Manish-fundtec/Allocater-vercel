export type ParsedMigrationLine = {
  lineNo: number;
  investorId: string | null;
  /** Investor code / group label (e.g. HardinRandy) — NOT unique alone. */
  investorName: string | null;
  /** Unique partner account (e.g. HardinRandy 001) — one allocation line each. */
  partner: string | null;
  classDescription: string | null;
  period: string | null;
  openingCapital: number | null;
  endingEquity: number | null;
  mgmtFee: number | null;
  capitalPercent: number | null;
  units: number | null;
  navPerShare: number | null;
  raw: Record<string, unknown>;
};

function normHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_./]+/g, " ");
}

function cellStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

function cellNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/,/g, "").replace(/%/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const hit = entries.find(([k]) => normHeader(k) === alias);
    if (hit) return hit[1];
  }
  return undefined;
}

/** Map a sheet.js row object into a migration line item. */
export function mapMigrationRow(
  row: Record<string, unknown>,
  lineNo: number,
): ParsedMigrationLine {
  const endingEquity = cellNum(
    pick(row, [
      "ending equity",
      "endingequity",
      "closing balance",
      "closing capital",
      "closing equity",
      "opening capital",
      "net capital",
      "capital",
    ]),
  );

  // Partners Details sheet: Investor Code + Investor Name (partner account).
  // Template: Investor Code + Partner.
  const investorCode = cellStr(
    pick(row, ["investor code", "investorcode", "code", "lp code"]),
  );
  const partner = cellStr(
    pick(row, [
      "partner",
      "partner name",
      "partner code",
      "investor name",
      "class",
      "class description",
    ]),
  );
  // Fallback if sheet only has one name column
  const nameOnly = cellStr(pick(row, ["name", "investor", "lp name"]));

  return {
    lineNo,
    investorId: cellStr(
      pick(row, [
        "investor id",
        "investorid",
        "external investor id",
        "external id",
      ]),
    ),
    investorName: investorCode ?? (!partner ? nameOnly : null),
    partner: partner ?? (!investorCode ? nameOnly : null),
    classDescription: partner ?? investorCode ?? nameOnly,
    period: cellStr(pick(row, ["period", "reporting period", "month"])),
    openingCapital: endingEquity,
    endingEquity,
    mgmtFee: cellNum(
      pick(row, ["mgmt fee", "management fee", "mgmtfee", "managementfee"]),
    ),
    capitalPercent: cellNum(
      pick(row, [
        "capital percent",
        "capital %",
        "capital pct",
        "capitalpercentage",
        "%",
      ]),
    ),
    units: cellNum(
      pick(row, ["units", "shares", "opening shares", "closing shares"]),
    ),
    navPerShare: cellNum(
      pick(row, ["nav per share", "nav/share", "nav", "issue price"]),
    ),
    raw: row,
  };
}

export async function parseMigrationFile(
  file: File,
): Promise<ParsedMigrationLine[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  return rows
    .map((row, i) => mapMigrationRow(row, i + 1))
    .filter((line) => {
      const label = String(line.investorName ?? line.partner ?? "")
        .trim()
        .toLowerCase();
      if (label === "total") return false;
      return (
        line.investorId ||
        line.investorName ||
        line.partner ||
        line.endingEquity != null ||
        line.units != null
      );
    });
}

export async function downloadMigrationTemplate(meta: {
  columns: string[];
  closingPeriod: string;
  openingPeriod: string;
  fundName: string;
  note: string;
}) {
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [
    meta.columns,
    meta.columns.map(() => ""),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Migration");
  const safe = meta.fundName.replace(/\s+/g, "_").replace(/[^\w.-]+/g, "");
  XLSX.writeFile(
    wb,
    `${safe || "fund"}_migration_${meta.closingPeriod}_to_${meta.openingPeriod}.xlsx`,
  );
}
