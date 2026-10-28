"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFund } from "@/contexts/fund-context";
import { PageHeader } from "@/components/allocator/page-header";
import { SectionPage } from "@/components/allocator/section-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/allocator/format";

type FundOffering = {
  id: string;
  fundId: string;
  name: string;
  type: string;
  managementFee: string | null;
  performanceFee: string | null;
  hurdleRate: string | null;
};

type FeeConfig = {
  mgmtFeePct: number;
  perfFeePct: number;
  hurdleRate: number;
  frequency: string;
  billingTiming: string;
  postingFrequency: string;
  mgmtSettlement: string;
  gpShareReconcileFrequency: string | null;
  perfSettlement: string;
  perfGpShareReconcileFrequency: string | null;
  crystallisationFrequency: string;
  effectiveFrom: string;
};

const defaults: FeeConfig = {
  mgmtFeePct: 2,
  perfFeePct: 20,
  hurdleRate: 8,
  frequency: "monthly",
  billingTiming: "arrears",
  postingFrequency: "monthly",
  mgmtSettlement: "cash",
  gpShareReconcileFrequency: null,
  perfSettlement: "cash",
  perfGpShareReconcileFrequency: null,
  crystallisationFrequency: "yearly",
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

function applyMgmtGpShareReconcileDefaults(next: FeeConfig) {
  const settlement = next.mgmtSettlement;
  const freq = next.frequency;
  const posting = next.postingFrequency;
  if (settlement !== "gp_share") {
    next.gpShareReconcileFrequency = null;
    return;
  }
  if (freq === "quarterly" && posting === "quarterly") {
    next.gpShareReconcileFrequency = "quarterly";
    return;
  }
  if (freq === "monthly" && posting === "monthly" && !next.gpShareReconcileFrequency) {
    next.gpShareReconcileFrequency = "monthly";
  }
}

/** Perf GP-share settle timing is locked to crystallisation — not editable. */
function applyPerfSettlementFromCrystallisation(next: FeeConfig) {
  if (next.perfSettlement !== "gp_share") {
    next.perfGpShareReconcileFrequency = null;
    return;
  }
  const c = next.crystallisationFrequency || "yearly";
  next.perfGpShareReconcileFrequency =
    c === "monthly" || c === "quarterly" || c === "yearly" ? c : "yearly";
}

function crystallisationLabel(value: string | null | undefined): string {
  if (value === "monthly") return "Monthly";
  if (value === "quarterly") return "Quarterly";
  return "Annually";
}

function titleCase(value: string | undefined | null, fallback: string) {
  const v = (value ?? fallback).trim();
  if (!v) return fallback;
  if (v === "gp_share") return "GP share";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Show reconcile picker when converting to GP share (except both-quarterly). */
function needsReconcileChoice(
  settlement: string,
  frequency: string,
  posting: string,
) {
  if (settlement !== "gp_share") return false;
  if (frequency === "quarterly" && posting === "quarterly") return false;
  if (frequency === "monthly" && posting === "monthly") return true;
  if (frequency === "quarterly" && posting === "monthly") return true;
  return posting === "monthly";
}

function reconcileRequired(
  settlement: string,
  frequency: string,
  posting: string,
) {
  return (
    settlement === "gp_share" &&
    frequency === "quarterly" &&
    posting === "monthly"
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FeeStructureContent({ embedded }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fundId, selectedFund, loading: fundLoading } = useFund();
  const offeringId = searchParams.get("offeringId");

  const [offerings, setOfferings] = useState<FundOffering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [form, setForm] = useState<FeeConfig>(defaults);
  const [history, setHistory] = useState<FeeConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedOffering = useMemo(
    () => offerings.find((o) => o.id === offeringId) ?? null,
    [offerings, offeringId],
  );

  const showReconcile = useMemo(
    () =>
      needsReconcileChoice(
        form.mgmtSettlement,
        form.frequency,
        form.postingFrequency,
      ),
    [form.mgmtSettlement, form.frequency, form.postingFrequency],
  );

  const mustPickReconcile = useMemo(
    () =>
      reconcileRequired(
        form.mgmtSettlement,
        form.frequency,
        form.postingFrequency,
      ),
    [form.mgmtSettlement, form.frequency, form.postingFrequency],
  );

  const loadOfferings = useCallback(async () => {
    if (!fundId) return;
    setLoadingOfferings(true);
    try {
      const res = await fetch(`/api/allocator/offerings?fundId=${fundId}`);
      if (res.ok) {
        const data = await res.json();
        setOfferings(Array.isArray(data) ? data : []);
      } else {
        setOfferings([]);
      }
    } catch {
      setOfferings([]);
    } finally {
      setLoadingOfferings(false);
    }
  }, [fundId]);

  useEffect(() => {
    if (!fundLoading && fundId) loadOfferings();
  }, [fundId, fundLoading, loadOfferings]);

  const load = useCallback(async () => {
    if (!fundId || !offeringId) return;
    const res = await fetch(
      `/api/allocator/fees?fundId=${fundId}&offeringId=${offeringId}`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data.current) {
        setForm({
          ...defaults,
          ...data.current,
          billingTiming: data.current.billingTiming ?? "arrears",
          postingFrequency: data.current.postingFrequency ?? "monthly",
          mgmtSettlement: data.current.mgmtSettlement ?? "cash",
          gpShareReconcileFrequency:
            data.current.gpShareReconcileFrequency ?? null,
          perfSettlement: data.current.perfSettlement ?? "cash",
          perfGpShareReconcileFrequency:
            data.current.perfGpShareReconcileFrequency ?? null,
          crystallisationFrequency:
            data.current.crystallisationFrequency ?? "yearly",
        });
      } else {
        setForm(defaults);
      }
      setHistory(data.history ?? []);
    } else {
      setForm(defaults);
      setHistory([]);
    }
  }, [fundId, offeringId]);

  useEffect(() => {
    if (offeringId) {
      setSaved(false);
      setError("");
      void load();
    }
  }, [offeringId, load]);

  function setOfferingParam(nextId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) params.set("offeringId", nextId);
    else params.delete("offeringId");
    if (!params.get("tab")) params.set("tab", "structure");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function patchForm(patch: Partial<FeeConfig>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const freq = next.frequency;

      // Monthly fee frequency cannot post quarterly.
      if (freq === "monthly") {
        next.postingFrequency = "monthly";
      }

      applyMgmtGpShareReconcileDefaults(next);
      applyPerfSettlementFromCrystallisation(next);
      return next;
    });
  }

  function resolvedReconcile(
    settlement: string,
    selected: string | null,
  ): string | null {
    if (settlement !== "gp_share") return null;
    if (
      form.frequency === "quarterly" &&
      form.postingFrequency === "quarterly"
    ) {
      return "quarterly";
    }
    return selected;
  }

  async function save() {
    if (!fundId || !offeringId) return;
    setError("");
    if (
      mustPickReconcile &&
      form.gpShareReconcileFrequency !== "monthly" &&
      form.gpShareReconcileFrequency !== "quarterly"
    ) {
      setError(
        "Select management GP share reconcile timing (monthly or quarterly) — fee frequency is quarterly and posting is monthly.",
      );
      return;
    }
    const perfSettleLocked =
      form.perfSettlement === "gp_share"
        ? form.crystallisationFrequency === "monthly" ||
          form.crystallisationFrequency === "quarterly" ||
          form.crystallisationFrequency === "yearly"
          ? form.crystallisationFrequency
          : "yearly"
        : null;
    const res = await fetch("/api/allocator/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fundId,
        offeringId,
        ...form,
        hurdleRate: form.hurdleRate,
        gpShareReconcileFrequency: resolvedReconcile(
          form.mgmtSettlement,
          form.gpShareReconcileFrequency,
        ),
        // Server also enforces this; crystallisation drives settle cadence.
        perfGpShareReconcileFrequency: perfSettleLocked,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: string }).error ?? "Could not save fee structure",
      );
    }
  }

  if (!offeringId) {
    return (
      <>
        {!embedded ? <PageHeader title="Fee Structure" /> : null}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Select offering
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose GP, LP, or another offering to configure its fee
                structure.
              </p>
            </div>
            {selectedFund?.name ? (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {selectedFund.name}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="pt-5">
            {fundLoading || loadingOfferings ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading offerings…
              </p>
            ) : offerings.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                No offerings found for this fund. Sync or seed GP / LP offerings
                first.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {offerings.map((offering) => (
                  <button
                    key={offering.id}
                    type="button"
                    onClick={() => setOfferingParam(offering.id)}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[#534AB7]/40 hover:bg-[#EEEDFE]/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {offering.name || "Untitled offering"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {offering.type
                          ? titleCase(offering.type, offering.type)
                          : "Offering"}
                        {offering.managementFee
                          ? ` · Mgmt ${offering.managementFee}%`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {!embedded ? <PageHeader title="Fee Structure" /> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => setOfferingParam(null)}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          All offerings
        </Button>
        <span className="text-sm text-slate-500">
          Configuring{" "}
          <span className="font-semibold text-slate-800">
            {selectedOffering?.name ?? "offering"}
          </span>
        </span>
      </div>

      {saved ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Fee structure saved for {selectedOffering?.name ?? "offering"}.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card className="mb-5">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-slate-900">
              {selectedOffering?.name ?? "Offering"} fee terms
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Rates, schedule, and settlement for this offering.
            </p>
          </div>
          {selectedFund?.name ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              {selectedFund.name}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-5">
            <section>
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Fee rates
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Management fee (%)">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.mgmtFeePct}
                    onChange={(e) =>
                      patchForm({ mgmtFeePct: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Performance fee (%)">
                  <Input
                    type="number"
                    step="1"
                    min={0}
                    value={form.perfFeePct}
                    onChange={(e) =>
                      patchForm({ perfFeePct: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Hurdle rate (%)">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    value={form.hurdleRate}
                    onChange={(e) =>
                      patchForm({ hurdleRate: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-5">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Schedule
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Fee frequency">
                  <Select
                    value={form.frequency}
                    onValueChange={(v) => patchForm({ frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Billing timing"
                  hint="Advance = start of period · Arrears = end of period"
                >
                  <Select
                    value={form.billingTiming || "arrears"}
                    onValueChange={(v) => patchForm({ billingTiming: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arrears">Arrears</SelectItem>
                      <SelectItem value="advance">Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Posting frequency"
                  hint={
                    form.frequency === "monthly"
                      ? "Fee frequency is monthly — posting must also be monthly"
                      : form.postingFrequency === "quarterly"
                        ? "One post per quarter — advance: Jan/Apr/Jul/Oct · arrears: Mar/Jun/Sep/Dec"
                        : "Accrue each month (quarterly fee uses % ÷ 3)"
                  }
                >
                  <Select
                    value={
                      form.frequency === "monthly"
                        ? "monthly"
                        : form.postingFrequency || "monthly"
                    }
                    onValueChange={(v) => patchForm({ postingFrequency: v })}
                    disabled={form.frequency === "monthly"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      {form.frequency !== "monthly" ? (
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Effective from">
                  <Input
                    type="date"
                    value={form.effectiveFrom?.slice(0, 10)}
                    onChange={(e) =>
                      patchForm({ effectiveFrom: e.target.value })
                    }
                  />
                </Field>
              </div>
            </section>

            <div className="grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Management fee settlement
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Settlement"
                    hint="Cash = payable in cash · GP share = convert management fee into GP units"
                    className={
                      !showReconcile &&
                      !(
                        form.mgmtSettlement === "gp_share" &&
                        form.frequency === "quarterly" &&
                        form.postingFrequency === "quarterly"
                      )
                        ? "sm:col-span-2"
                        : undefined
                    }
                  >
                    <Select
                      value={form.mgmtSettlement || "cash"}
                      onValueChange={(v) => patchForm({ mgmtSettlement: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Payable in cash</SelectItem>
                        <SelectItem value="gp_share">
                          Convert to GP share
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {form.mgmtSettlement === "gp_share" &&
                  form.frequency === "quarterly" &&
                  form.postingFrequency === "quarterly" ? (
                    <Field
                      label="GP share reconcile"
                      hint="Fee frequency and posting are both quarterly — reconcile stays quarterly"
                    >
                      <Input value="Quarterly" disabled />
                    </Field>
                  ) : null}

                  {showReconcile ? (
                    <Field
                      label={
                        mustPickReconcile
                          ? "GP share reconcile timing *"
                          : "GP share reconcile timing"
                      }
                      hint={
                        mustPickReconcile
                          ? "Required: fee is quarterly but posting is monthly — choose monthly or quarterly reconcile"
                          : "Both monthly — choose whether GP share converts monthly or quarterly"
                      }
                    >
                      <Select
                        value={
                          form.gpShareReconcileFrequency === "monthly" ||
                          form.gpShareReconcileFrequency === "quarterly"
                            ? form.gpShareReconcileFrequency
                            : mustPickReconcile
                              ? undefined
                              : "monthly"
                        }
                        onValueChange={(v) =>
                          patchForm({ gpShareReconcileFrequency: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select monthly or quarterly…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}
                </div>
              </section>

              <section className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Performance fee settlement
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Settlement"
                    hint="Cash = payable in cash · GP share = convert performance fee into GP units after crystallisation"
                    className={
                      form.perfSettlement === "gp_share"
                        ? undefined
                        : "sm:col-span-2"
                    }
                  >
                    <Select
                      value={form.perfSettlement || "cash"}
                      onValueChange={(v) => patchForm({ perfSettlement: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Payable in cash</SelectItem>
                        <SelectItem value="gp_share">
                          Convert to GP share
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {form.perfSettlement === "gp_share" ? (
                    <Field
                      label="Settlement timing"
                      hint="Locked to crystallisation — performance fee settles only after it crystallises"
                    >
                      <Input
                        value={crystallisationLabel(
                          form.crystallisationFrequency,
                        )}
                        disabled
                      />
                    </Field>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="border-t border-slate-100 pt-5">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Crystallisation
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Crystallisation frequency"
                  hint={
                    form.crystallisationFrequency === "monthly"
                      ? "Performance fee crystallises every month — settlement timing follows this"
                      : form.crystallisationFrequency === "quarterly"
                        ? "Crystallises at calendar quarter end (Mar / Jun / Sep / Dec) — settlement timing follows this"
                        : "Crystallises once a year at fiscal year-end — settlement timing follows this (annually)"
                  }
                >
                  <Select
                    value={form.crystallisationFrequency || "yearly"}
                    onValueChange={(v) =>
                      patchForm({ crystallisationFrequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setForm(defaults)}>
                Reset to default
              </Button>
              <Button onClick={() => void save()}>Save changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 py-3.5">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Fee history
            {selectedOffering?.name ? (
              <span className="font-normal text-slate-500">
                {" "}
                — {selectedOffering.name}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead>Mgmt %</TableHead>
                  <TableHead>Perf %</TableHead>
                  <TableHead>Hurdle %</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Posting</TableHead>
                  <TableHead>Mgmt settlement</TableHead>
                  <TableHead>Mgmt GP reconcile</TableHead>
                  <TableHead>Perf settlement</TableHead>
                  <TableHead>Perf GP reconcile</TableHead>
                  <TableHead>Crystallisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="py-6 text-center text-sm text-slate-500"
                    >
                      No fee history yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(h.effectiveFrom)}</TableCell>
                      <TableCell>{h.mgmtFeePct}</TableCell>
                      <TableCell>{h.perfFeePct}</TableCell>
                      <TableCell>{h.hurdleRate}</TableCell>
                      <TableCell>{titleCase(h.frequency, "monthly")}</TableCell>
                      <TableCell>
                        {titleCase(h.billingTiming, "arrears")}
                      </TableCell>
                      <TableCell>
                        {titleCase(h.postingFrequency, "monthly")}
                      </TableCell>
                      <TableCell>
                        {titleCase(h.mgmtSettlement, "cash")}
                      </TableCell>
                      <TableCell>
                        {h.mgmtSettlement === "gp_share"
                          ? titleCase(h.gpShareReconcileFrequency, "—")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {titleCase(h.perfSettlement, "cash")}
                      </TableCell>
                      <TableCell>
                        {h.perfSettlement === "gp_share"
                          ? crystallisationLabel(
                              h.perfGpShareReconcileFrequency ??
                                h.crystallisationFrequency,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {crystallisationLabel(h.crystallisationFrequency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

type ImGpInvestor = {
  id: string;
  name: string;
  status?: string;
  /** portal_fund_offerings.id when investor is assigned to an offering */
  class?: string | null;
};

type GpShareRow = {
  investorId: string;
  investorName: string;
  sharePct: number;
};

type GpSharesResponse = {
  fundId: string;
  offeringId: string;
  offeringName?: string;
  imGpInInvestor: boolean;
  /** @deprecated prefer mgmtShares */
  totalSharePct?: number;
  /** @deprecated prefer mgmtShares */
  shares?: GpShareRow[];
  mgmtShares?: GpShareRow[];
  mgmtTotalSharePct?: number;
  perfShares?: GpShareRow[];
  perfTotalSharePct?: number;
};

type FeeShareKind = "mgmt" | "perf";

function rowsFromResponse(
  data: GpSharesResponse,
  kind: FeeShareKind,
): GpShareRow[] {
  if (kind === "perf") {
    return Array.isArray(data.perfShares) ? data.perfShares : [];
  }
  if (Array.isArray(data.mgmtShares)) return data.mgmtShares;
  return Array.isArray(data.shares) ? data.shares : [];
}

function shareMapFromRows(rows: GpShareRow[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const row of rows) {
    next[row.investorId] = row.sharePct > 0 ? String(row.sharePct) : "";
  }
  return next;
}

function totalFromShareMap(shares: Record<string, string>): number {
  return Object.values(shares).reduce((sum, v) => {
    const n = Number(v);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function ImGpSetupContent() {
  const { fundId, selectedFund, loading: fundLoading } = useFund();
  const [imGpInInvestor, setImGpInInvestor] = useState(false);
  const [offerings, setOfferings] = useState<FundOffering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [offeringId, setOfferingId] = useState<string>("");
  const [investors, setInvestors] = useState<ImGpInvestor[]>([]);
  const [mgmtShares, setMgmtShares] = useState<Record<string, string>>({});
  const [perfShares, setPerfShares] = useState<Record<string, string>>({});
  const [loadingShares, setLoadingShares] = useState(false);
  const [savingKind, setSavingKind] = useState<FeeShareKind | null>(null);
  const [savedKind, setSavedKind] = useState<FeeShareKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOffering = useMemo(
    () => offerings.find((o) => o.id === offeringId) ?? null,
    [offerings, offeringId],
  );

  // On open: if fund already has saved IM/GP shares, show the setup checked.
  useEffect(() => {
    if (!fundId || imGpInInvestor) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/allocator/offerings?fundId=${fundId}`);
        if (!res.ok || cancelled) return;
        const list = (await res.json()) as FundOffering[];
        if (!Array.isArray(list) || list.length === 0) return;
        const gp =
          list.find((o) => o.name.trim().toUpperCase() === "GP") ?? list[0];
        const shareRes = await fetch(
          `/api/allocator/fees/gp-shares?fundId=${fundId}&offeringId=${gp.id}`,
        );
        if (!shareRes.ok || cancelled) return;
        const data = (await shareRes.json()) as GpSharesResponse;
        const mgmt = rowsFromResponse(data, "mgmt");
        const perf = rowsFromResponse(data, "perf");
        const hasShares =
          mgmt.some((s) => s.sharePct > 0) || perf.some((s) => s.sharePct > 0);
        if (data.imGpInInvestor || hasShares) {
          setImGpInInvestor(true);
        }
      } catch {
        /* ignore bootstrap errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fundId, imGpInInvestor]);

  useEffect(() => {
    if (!imGpInInvestor || !fundId) {
      setOfferings([]);
      return;
    }
    let cancelled = false;
    setLoadingOfferings(true);
    fetch(`/api/allocator/offerings?fundId=${fundId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FundOffering[]) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setOfferings(list);
        setOfferingId((prev) => {
          if (prev && list.some((o) => o.id === prev)) return prev;
          const gp = list.find((o) => o.name.trim().toUpperCase() === "GP");
          return gp?.id ?? list[0]?.id ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) setOfferings([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOfferings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imGpInInvestor, fundId]);

  useEffect(() => {
    if (!imGpInInvestor || !fundId || !offeringId) {
      setInvestors([]);
      setMgmtShares({});
      setPerfShares({});
      return;
    }
    let cancelled = false;
    setLoadingShares(true);
    setError(null);
    setSavedKind(null);
    fetch(
      `/api/allocator/fees/gp-shares?fundId=${fundId}&offeringId=${offeringId}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Could not load IM / GP shares");
        }
        return res.json() as Promise<GpSharesResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setImGpInInvestor(data.imGpInInvestor !== false);
        const mgmtRows = rowsFromResponse(data, "mgmt");
        const perfRows = rowsFromResponse(data, "perf");
        const byId = new Map<string, ImGpInvestor>();
        for (const row of [...mgmtRows, ...perfRows]) {
          byId.set(row.investorId, {
            id: row.investorId,
            name: row.investorName,
            class: data.offeringId,
          });
        }
        setInvestors([...byId.values()]);
        setMgmtShares(shareMapFromRows(mgmtRows));
        setPerfShares(shareMapFromRows(perfRows));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setInvestors([]);
        setMgmtShares({});
        setPerfShares({});
        setError(err instanceof Error ? err.message : "Could not load shares");
      })
      .finally(() => {
        if (!cancelled) setLoadingShares(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imGpInInvestor, fundId, offeringId]);

  const mgmtTotal = useMemo(() => totalFromShareMap(mgmtShares), [mgmtShares]);
  const perfTotal = useMemo(() => totalFromShareMap(perfShares), [perfShares]);
  const mgmtRounded = Math.round(mgmtTotal * 100) / 100;
  const perfRounded = Math.round(perfTotal * 100) / 100;
  const mgmtOk = Math.abs(mgmtRounded - 100) < 0.05;
  const perfOk = Math.abs(perfRounded - 100) < 0.05;

  function setShare(kind: FeeShareKind, investorId: string, value: string) {
    const setter = kind === "mgmt" ? setMgmtShares : setPerfShares;
    setter((prev) => ({ ...prev, [investorId]: value }));
    setSavedKind(null);
    setError(null);
  }

  function onToggleImGp(checked: boolean) {
    setImGpInInvestor(checked);
    setSavedKind(null);
    setError(null);
    if (!checked) {
      setOfferingId("");
      setInvestors([]);
      setMgmtShares({});
      setPerfShares({});
    }
  }

  function onSelectOffering(id: string) {
    setOfferingId(id);
    setMgmtShares({});
    setPerfShares({});
    setSavedKind(null);
    setError(null);
  }

  async function saveKind(kind: FeeShareKind, clear = false) {
    if (!fundId || !offeringId) return;
    if (investors.length === 0) return;
    const map = kind === "mgmt" ? mgmtShares : perfShares;
    const rounded = kind === "mgmt" ? mgmtRounded : perfRounded;
    const ok = kind === "mgmt" ? mgmtOk : perfOk;
    const label = kind === "mgmt" ? "Management fee" : "Performance fee";
    if (!clear && !ok) {
      setError(`${label} shares must total 100% before saving.`);
      return;
    }
    setSavingKind(kind);
    setError(null);
    setSavedKind(null);
    try {
      const res = await fetch("/api/allocator/fees/gp-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId,
          offeringId,
          imGpInInvestor: true,
          feeType: kind,
          shares: investors.map((inv) => ({
            investorId: inv.id,
            sharePct: clear ? 0 : Number(map[inv.id]) || 0,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (GpSharesResponse & { error?: string })
        | null;
      if (!res.ok) {
        throw new Error(
          data?.error ?? `Could not save ${label.toLowerCase()} shares`,
        );
      }
      if (data) {
        const mgmtRows = rowsFromResponse(data, "mgmt");
        const perfRows = rowsFromResponse(data, "perf");
        const byId = new Map<string, ImGpInvestor>();
        for (const row of [...mgmtRows, ...perfRows]) {
          byId.set(row.investorId, {
            id: row.investorId,
            name: row.investorName,
            class: data.offeringId,
          });
        }
        if (byId.size > 0) setInvestors([...byId.values()]);
        setMgmtShares(shareMapFromRows(mgmtRows));
        setPerfShares(shareMapFromRows(perfRows));
      } else if (clear) {
        if (kind === "mgmt") setMgmtShares({});
        else setPerfShares({});
      }
      setSavedKind(kind);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not save ${label.toLowerCase()} shares`,
      );
    } finally {
      setSavingKind(null);
    }
  }

  function renderShareSection(kind: FeeShareKind) {
    const map = kind === "mgmt" ? mgmtShares : perfShares;
    const rounded = kind === "mgmt" ? mgmtRounded : perfRounded;
    const ok = kind === "mgmt" ? mgmtOk : perfOk;
    const title =
      kind === "mgmt" ? "Management fee share" : "Performance fee share";
    const blurb =
      kind === "mgmt"
        ? "Split of management fee GP subscription across IM / GP investors."
        : "Split of performance fee GP subscription across IM / GP investors.";
    const saving = savingKind === kind;
    const saved = savedKind === kind;

    return (
      <section className="border-t border-slate-100 pt-5">
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {blurb} Enter % share (e.g. 60 / 40).
            </p>
          </div>
          <p
            className={
              ok
                ? "text-sm font-semibold text-emerald-700"
                : "text-sm font-semibold text-slate-700"
            }
          >
            Total {formatNumber(rounded, 2)}%
            {!ok && rounded > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-amber-700">
                (not 100%)
              </span>
            ) : null}
          </p>
        </div>

        {saved ? (
          <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {title} saved.
          </p>
        ) : null}

        {fundLoading || loadingShares ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading investors…
          </p>
        ) : investors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            No active investors linked to{" "}
            <span className="font-medium text-slate-700">
              {selectedOffering?.name ?? "this offering"}
            </span>
            . Assign investor class / offering first.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead className="w-40 text-right">Share (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((inv) => (
                  <TableRow key={`${kind}-${inv.id}`}>
                    <TableCell className="font-medium text-slate-800">
                      {inv.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        className="ml-auto w-28 text-right"
                        placeholder="0"
                        value={map[inv.id] ?? ""}
                        onChange={(e) => setShare(kind, inv.id, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50/80">
                  <TableCell className="font-semibold text-slate-900">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {formatNumber(rounded, 2)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => void saveKind(kind, true)}
            disabled={investors.length === 0 || savingKind != null}
          >
            Clear shares
          </Button>
          <Button
            onClick={() => void saveKind(kind)}
            disabled={
              investors.length === 0 ||
              rounded <= 0 ||
              !ok ||
              savingKind != null
            }
          >
            {saving ? "Saving…" : "Save shares"}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold text-slate-900">
            IM / GP Setup
          </CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Map management and performance fee GP share across investors when
            they sit in the investor register. Saved shares drive auto GP
            subscription split on allocate.
          </p>
        </div>
        {selectedFund?.name ? (
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            {selectedFund.name}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
          <Checkbox
            checked={imGpInInvestor}
            onCheckedChange={(v) => onToggleImGp(v === true)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              IM / GP is in investor
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Check yes if the IM or GP entity is already on the investor list.
            </span>
          </span>
        </label>

        {imGpInInvestor ? (
          <>
            <section>
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Offering
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Offering
                  </Label>
                  <div className="mt-1.5">
                    <Select
                      value={offeringId || undefined}
                      onValueChange={onSelectOffering}
                      disabled={loadingOfferings || offerings.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingOfferings
                              ? "Loading…"
                              : offerings.length === 0
                                ? "No offerings"
                                : "Select offering…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {offerings.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name || "Untitled"}
                            {opt.type ? ` (${titleCase(opt.type, opt.type)})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1.5 text-xs leading-snug text-slate-500">
                    Select GP / LP to see investors for that offering.
                  </p>
                </div>
              </div>
            </section>

            {offeringId ? (
              <>
                {renderShareSection("mgmt")}
                {renderShareSection("perf")}
              </>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            If IM / GP is not on the investor list, leave this unchecked for now.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FeesPage() {
  return (
    <SectionPage
      title="Fee Structure"
      description="Fund fee terms and IM / GP setup."
      defaultTab="structure"
      tabs={[
        { id: "structure", label: "Fee Structure" },
        { id: "im-gp", label: "IM / GP Setup" },
      ]}
    >
      {(tab) =>
        tab === "im-gp" ? (
          <ImGpSetupContent />
        ) : (
          <FeeStructureContent embedded />
        )
      }
    </SectionPage>
  );
}
