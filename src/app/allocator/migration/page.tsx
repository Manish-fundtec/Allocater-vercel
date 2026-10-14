"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { useFund } from "@/contexts/fund-context";
import { PageHeader } from "@/components/allocator/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/allocator/format";
import {
  downloadMigrationTemplate,
  parseMigrationFile,
  type ParsedMigrationLine,
} from "@/lib/allocator/parseMigrationFile";

/** Format YYYY-MM-DD without UTC timezone shift. */
function formatDateOnly(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return formatDate(value);
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type MigrationLine = {
  lineId?: string;
  lineNo: number;
  investorId: string | null;
  investorName: string | null;
  partner: string | null;
  endingEquity: number | null;
  openingCapital: number | null;
  mgmtFee: number | null;
  capitalPercent: number | null;
  units: number | null;
  openingPeriod?: string | null;
  period?: string | null;
};

type MigrationUpload = {
  uploadId: string;
  fileName: string;
  period: string | null;
  status: string;
  rowCount: number;
  createdAt: string;
};

type TemplateMeta = {
  columns: string[];
  closingPeriod: string;
  openingPeriod: string;
  fundName: string;
  note: string;
  shareUnitTracking: boolean;
  reportingStartDate: string;
};

export default function MigrationPage() {
  const { fundId, selectedFund, isExistingFundSelected, loading: fundLoading } =
    useFund();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedMigrationLine[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lines, setLines] = useState<MigrationLine[]>([]);
  const [uploads, setUploads] = useState<MigrationUpload[]>([]);
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reportingStartDate =
    templateMeta?.reportingStartDate ??
    selectedFund?.reportingStartDate ??
    null;
  const shareUnitTracking =
    templateMeta?.shareUnitTracking ??
    selectedFund?.shareUnitTracking !== false;
  const canUpload = Boolean(reportingStartDate);

  const loadMigration = useCallback(async () => {
    if (!fundId) return;
    const res = await fetch(`/api/allocator/migration?fundId=${fundId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to load migration data");
    }
    const data = await res.json();
    setLines(data.lines ?? []);
    setUploads(data.uploads ?? []);
    if (data.reportingStartDate && data.closingPeriod && data.openingPeriod) {
      setTemplateMeta((prev) => ({
        columns: prev?.columns ?? [],
        fundName: selectedFund?.name ?? prev?.fundName ?? "Fund",
        note: prev?.note ?? "",
        shareUnitTracking: data.shareUnitTracking !== false,
        reportingStartDate: data.reportingStartDate,
        closingPeriod: data.closingPeriod,
        openingPeriod: data.openingPeriod,
      }));
    }
  }, [fundId, selectedFund?.name]);

  const loadTemplateMeta = useCallback(async () => {
    if (!fundId) return null;
    const res = await fetch(
      `/api/allocator/migration/template?fundId=${fundId}`,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to load template");
    }
    const data = (await res.json()) as TemplateMeta;
    setTemplateMeta(data);
    return data;
  }, [fundId]);

  useEffect(() => {
    if (!fundId || !isExistingFundSelected) {
      setLines([]);
      setUploads([]);
      setTemplateMeta(null);
      return;
    }
    Promise.all([loadMigration(), loadTemplateMeta()]).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
  }, [fundId, isExistingFundSelected, loadMigration, loadTemplateMeta]);

  async function onDownloadTemplate() {
    setError(null);
    setDownloading(true);
    try {
      const meta = templateMeta ?? (await loadTemplateMeta());
      if (!meta) throw new Error("Template metadata unavailable");
      await downloadMigrationTemplate({
        columns: meta.columns,
        closingPeriod: meta.closingPeriod,
        openingPeriod: meta.openingPeriod,
        fundName: meta.fundName || selectedFund?.name || "Fund",
        note: meta.note,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function onFileChange(file: File | null) {
    setError(null);
    setSuccess(null);
    setPreview([]);
    setFileName(null);
    if (!file) return;
    if (!reportingStartDate) {
      setError(
        "Fund reporting start date is missing. Set it on the fund before uploading migration data.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setParsing(true);
    try {
      const rows = await parseMigrationFile(file);
      if (!rows.length) {
        throw new Error("No line items found in the file");
      }
      setPreview(rows);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  async function deleteUpload(uploadId: string) {
    if (!fundId) return;
    if (
      !window.confirm(
        "Delete this migration upload and its line items? Related migration capital / opening NAV will also be removed.",
      )
    ) {
      return;
    }
    setDeletingId(uploadId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/allocator/migration/${uploadId}?fundId=${fundId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setSuccess("Migration upload deleted");
      await loadMigration();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function saveUpload() {
    if (!fundId || !fileName || !preview.length) return;
    if (!reportingStartDate) {
      setError(
        "Fund reporting start date is missing. Set it on the fund before uploading migration data.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/allocator/migration/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId,
          fileName,
          lines: preview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Migrate failed");
      setSuccess(
        `Migrated ${data.appliedCount ?? preview.length} investors: ` +
          `${data.closingPeriod} ending equity → ${data.openingPeriod} opening` +
          (data.reportingStartDate
            ? ` (money-in ${data.reportingStartDate})`
            : ""),
      );
      setPreview([]);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadMigration();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migrate failed");
    } finally {
      setSaving(false);
    }
  }

  const displayLines: MigrationLine[] = preview.length
    ? preview.map((p) => ({
        ...p,
        partner: p.partner,
        endingEquity: p.endingEquity,
        mgmtFee: p.mgmtFee,
        capitalPercent: p.capitalPercent,
      }))
    : lines;

  if (fundLoading) {
    return <p className="text-sm text-slate-500">Loading fund…</p>;
  }

  if (!isExistingFundSelected) {
    return (
      <>
        <PageHeader
          title="Migration"
          description="Available only when the selected fund has onboarding mode Existing Fund."
        />
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Select an Existing Fund to use the Migration module.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Migration"
        description="Download the template, fill prior-month ending equity, then Migrate to set next-month opening balances."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              {shareUnitTracking
                ? "Template columns: Investor Code, Units, Mgmt Fee, Ending Equity, Capital Percent."
                : "Template columns: Investor Code, Partner, Mgmt Fee, Ending Equity, Capital Percent. Each Partner (e.g. HardinRandy 001–004) is its own allocation line."}{" "}
              {templateMeta
                ? `${templateMeta.closingPeriod} ending equity becomes ${templateMeta.openingPeriod} opening. Money-in date = reporting start.`
                : "Money-in date = fund reporting start date."}
            </p>
            {selectedFund ? (
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm">
                {selectedFund.name}
              </span>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Reporting start date</Label>
                <Input
                  type="text"
                  readOnly
                  value={
                    reportingStartDate
                      ? formatDateOnly(reportingStartDate)
                      : "Not set on fund"
                  }
                  className={
                    reportingStartDate
                      ? "bg-slate-50"
                      : "bg-red-50 text-red-700"
                  }
                />
                {templateMeta ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Closing period{" "}
                    <span className="font-medium">{templateMeta.closingPeriod}</span>
                    {" → "}
                    opening{" "}
                    <span className="font-medium">{templateMeta.openingPeriod}</span>
                  </p>
                ) : !reportingStartDate ? (
                  <p className="mt-1.5 text-xs text-red-600">
                    Set reporting start date on the fund before migration can
                    start.
                  </p>
                ) : null}
              </div>
              <div>
                <Label>File</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  disabled={!canUpload}
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={onDownloadTemplate}
                disabled={downloading || !canUpload}
              >
                <Download className="h-4 w-4" />
                {downloading ? "Preparing…" : "Download template"}
              </Button>
              <Button
                onClick={saveUpload}
                disabled={
                  saving || parsing || !preview.length || !canUpload
                }
              >
                <Upload className="h-4 w-4" />
                {saving
                  ? "Migrating…"
                  : parsing
                    ? "Parsing…"
                    : "Migrate"}
              </Button>
              {fileName ? (
                <span className="text-xs text-slate-500">{fileName}</span>
              ) : null}
            </div>
            {success ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>
              {preview.length ? "Preview line items" : "Line items"}
            </CardTitle>
            {preview.length ? (
              <Badge variant="orange">{preview.length} pending migrate</Badge>
            ) : (
              <Badge variant="blue">{displayLines.length}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {displayLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No line items yet. Download the template, fill it, then upload.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Investor Code</TableHead>
                      {shareUnitTracking ? (
                        <TableHead className="text-right">Units</TableHead>
                      ) : (
                        <TableHead>Partner</TableHead>
                      )}
                      <TableHead className="text-right">Mgmt Fee</TableHead>
                      <TableHead className="text-right">Ending Equity</TableHead>
                      <TableHead className="text-right">Capital %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayLines.map((row) => (
                      <TableRow key={row.lineId ?? `preview-${row.lineNo}`}>
                        <TableCell>{row.lineNo}</TableCell>
                        <TableCell>{row.investorName ?? "—"}</TableCell>
                        {shareUnitTracking ? (
                          <TableCell className="text-right">
                            {row.units != null ? formatNumber(row.units) : "—"}
                          </TableCell>
                        ) : (
                          <TableCell>{row.partner ?? "—"}</TableCell>
                        )}
                        <TableCell className="text-right">
                          {row.mgmtFee != null
                            ? formatCurrency(row.mgmtFee)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {(row.endingEquity ?? row.openingCapital) != null
                            ? formatCurrency(
                                row.endingEquity ?? row.openingCapital ?? 0,
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.capitalPercent != null
                            ? `${formatNumber(row.capitalPercent, 2)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {uploads.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload history</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Closing period</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((u) => (
                    <TableRow key={u.uploadId}>
                      <TableCell>{u.fileName}</TableCell>
                      <TableCell>{u.period ?? "—"}</TableCell>
                      <TableCell>{u.rowCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.status === "applied"
                              ? "green"
                              : u.status === "rejected"
                                ? "orange"
                                : "blue"
                          }
                        >
                          {u.status === "uploaded" ? "pending" : u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === u.uploadId}
                          onClick={() => deleteUpload(u.uploadId)}
                          aria-label="Delete migration upload"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          {deletingId === u.uploadId ? "Deleting…" : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
