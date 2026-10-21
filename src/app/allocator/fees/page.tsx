"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFund } from "@/contexts/fund-context";
import { PageHeader } from "@/components/allocator/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDate } from "@/lib/allocator/format";

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

function applyGpShareReconcileDefaults(
  next: FeeConfig,
  settlementKey: "mgmtSettlement" | "perfSettlement",
  reconcileKey: "gpShareReconcileFrequency" | "perfGpShareReconcileFrequency",
) {
  const settlement = next[settlementKey];
  const freq = next.frequency;
  const posting = next.postingFrequency;
  if (settlement !== "gp_share") {
    next[reconcileKey] = null;
    return;
  }
  if (freq === "quarterly" && posting === "quarterly") {
    next[reconcileKey] = "quarterly";
    return;
  }
  if (freq === "monthly" && posting === "monthly" && !next[reconcileKey]) {
    next[reconcileKey] = "monthly";
  }
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
  const { fundId, selectedFund } = useFund();
  const [form, setForm] = useState<FeeConfig>(defaults);
  const [history, setHistory] = useState<FeeConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

  const showPerfReconcile = useMemo(
    () =>
      needsReconcileChoice(
        form.perfSettlement,
        form.frequency,
        form.postingFrequency,
      ),
    [form.perfSettlement, form.frequency, form.postingFrequency],
  );

  const mustPickPerfReconcile = useMemo(
    () =>
      reconcileRequired(
        form.perfSettlement,
        form.frequency,
        form.postingFrequency,
      ),
    [form.perfSettlement, form.frequency, form.postingFrequency],
  );

  const load = useCallback(async () => {
    if (!fundId) return;
    const res = await fetch(`/api/allocator/fees?fundId=${fundId}`);
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
      }
      setHistory(data.history ?? []);
    }
  }, [fundId]);

  useEffect(() => {
    load();
  }, [load]);

  function patchForm(patch: Partial<FeeConfig>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const freq = next.frequency;

      // Monthly fee frequency cannot post quarterly.
      if (freq === "monthly") {
        next.postingFrequency = "monthly";
      }

      applyGpShareReconcileDefaults(
        next,
        "mgmtSettlement",
        "gpShareReconcileFrequency",
      );
      applyGpShareReconcileDefaults(
        next,
        "perfSettlement",
        "perfGpShareReconcileFrequency",
      );
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
    if (!fundId) return;
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
    if (
      mustPickPerfReconcile &&
      form.perfGpShareReconcileFrequency !== "monthly" &&
      form.perfGpShareReconcileFrequency !== "quarterly"
    ) {
      setError(
        "Select performance GP share reconcile timing (monthly or quarterly) — fee frequency is quarterly and posting is monthly.",
      );
      return;
    }
    const res = await fetch("/api/allocator/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fundId,
        ...form,
        hurdleRate: form.hurdleRate,
        gpShareReconcileFrequency: resolvedReconcile(
          form.mgmtSettlement,
          form.gpShareReconcileFrequency,
        ),
        perfGpShareReconcileFrequency: resolvedReconcile(
          form.perfSettlement,
          form.perfGpShareReconcileFrequency,
        ),
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

  return (
    <>
      {!embedded ? <PageHeader title="Fee Structure" /> : null}

      {saved ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Fee structure saved.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card className="mb-6">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">
            Fee Structure
            {selectedFund?.name ? (
              <span className="font-normal text-slate-500">
                {" "}
                — {selectedFund.name}
              </span>
            ) : null}
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Rates, billing schedule, management / performance fee settlement,
            crystallisation frequency, and when fees post to the books.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-3xl space-y-8">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fee rates
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
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

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schedule
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
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

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Management fee settlement
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Settlement"
                  hint="Cash = payable in cash · GP share = convert management fee into GP units"
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

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Performance fee settlement
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Settlement"
                  hint="Cash = payable in cash · GP share = convert performance fee into GP units"
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

                {form.perfSettlement === "gp_share" &&
                form.frequency === "quarterly" &&
                form.postingFrequency === "quarterly" ? (
                  <Field
                    label="GP share reconcile"
                    hint="Fee frequency and posting are both quarterly — reconcile stays quarterly"
                  >
                    <Input value="Quarterly" disabled />
                  </Field>
                ) : null}

                {showPerfReconcile ? (
                  <Field
                    label={
                      mustPickPerfReconcile
                        ? "GP share reconcile timing *"
                        : "GP share reconcile timing"
                    }
                    hint={
                      mustPickPerfReconcile
                        ? "Required: fee is quarterly but posting is monthly — choose monthly or quarterly reconcile"
                        : "Both monthly — choose whether GP share converts monthly or quarterly"
                    }
                  >
                    <Select
                      value={
                        form.perfGpShareReconcileFrequency === "monthly" ||
                        form.perfGpShareReconcileFrequency === "quarterly"
                          ? form.perfGpShareReconcileFrequency
                          : mustPickPerfReconcile
                            ? undefined
                            : "monthly"
                      }
                      onValueChange={(v) =>
                        patchForm({ perfGpShareReconcileFrequency: v })
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

                <Field
                  label="Crystallisation frequency"
                  hint={
                    form.crystallisationFrequency === "monthly"
                      ? "When performance fee crystallises — every month (separate from GP share reconcile)"
                      : form.crystallisationFrequency === "quarterly"
                        ? "When performance fee crystallises — calendar quarter end (Mar / Jun / Sep / Dec)"
                        : "When performance fee crystallises — once a year at the fund fiscal year-end"
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

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
              <Button onClick={() => void save()}>Save changes</Button>
              <Button variant="secondary" onClick={() => setForm(defaults)}>
                Reset to default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">
            Fee history
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
                      className="py-8 text-center text-sm text-slate-500"
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
                          ? titleCase(h.perfGpShareReconcileFrequency, "—")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {h.crystallisationFrequency === "yearly"
                          ? "Annually"
                          : titleCase(h.crystallisationFrequency, "yearly")}
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

export default function FeesPage() {
  return <FeeStructureContent />;
}
