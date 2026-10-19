"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  effectiveFrom: string;
};

const defaults: FeeConfig = {
  mgmtFeePct: 2,
  perfFeePct: 20,
  hurdleRate: 8,
  frequency: "monthly",
  billingTiming: "arrears",
  postingFrequency: "monthly",
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

function titleCase(value: string | undefined, fallback: string) {
  const v = (value ?? fallback).trim();
  if (!v) return fallback;
  return v.charAt(0).toUpperCase() + v.slice(1);
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
        });
      }
      setHistory(data.history ?? []);
    }
  }, [fundId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!fundId) return;
    const res = await fetch("/api/allocator/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fundId, ...form, hurdleRate: form.hurdleRate }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
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
            Rates, billing schedule, and when fees post to the books.
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
                      setForm((f) => ({
                        ...f,
                        mgmtFeePct: Number(e.target.value),
                      }))
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
                      setForm((f) => ({
                        ...f,
                        perfFeePct: Number(e.target.value),
                      }))
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
                      setForm((f) => ({
                        ...f,
                        hurdleRate: Number(e.target.value),
                      }))
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
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, frequency: v }))
                    }
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
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, billingTiming: v }))
                    }
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
                    form.postingFrequency === "quarterly"
                      ? "One post per quarter — advance: Jan/Apr/Jul/Oct · arrears: Mar/Jun/Sep/Dec"
                      : "Accrue each month (quarterly fee uses % ÷ 3)"
                  }
                >
                  <Select
                    value={form.postingFrequency || "monthly"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, postingFrequency: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Effective from">
                  <Input
                    type="date"
                    value={form.effectiveFrom?.slice(0, 10)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        effectiveFrom: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
              <Button onClick={save}>Save changes</Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
