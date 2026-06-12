"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft, ClipboardCheck, Save, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, Info, Lock,
} from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import type {
  StockTake, StockTakeLine, StockTakeRefType,
} from "@/types/stock-take";
import type { UnitTypeListResponse, UnitType } from "@/types/api";
import { describeApprovalEffect, describeVariance } from "@/lib/variance";

interface Props { params: { id: string } }

export default function StockTakeDetailPage({ params }: Props) {
  const takeId = params.id;
  const { data: take, mutate, error } = useSWR<StockTake>(
    `/stock-takes/${takeId}`,
    apiFetcher,
  );

  if (error) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800">
          {error.message ?? "Failed to load stock-take"}
        </div>
      </div>
    );
  }
  if (!take) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <TableSkeleton cols={6} rows={8} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/stock-take"
          className="text-gray-400 hover:text-gray-700 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to history
        </Link>
      </div>

      <Header take={take} />

      {take.status === "DRAFT" && (
        <DraftView take={take} onChange={mutate} />
      )}
      {take.status === "SUBMITTED" && (
        <SubmittedView take={take} onChange={mutate} />
      )}
      {take.status === "CLOSED" && (
        <ClosedView take={take} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header

function Header({ take }: { take: StockTake }) {
  const rejectedCount = take.lines.filter((l) => l.resolution === "REJECTED").length;
  const approvedCount = take.lines.filter((l) => l.resolution === "APPROVED").length;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-gold" />
            Stock-take · {take.id.slice(0, 8)}…
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Started {new Date(take.started_at).toLocaleString()}
            {take.closed_at && (
              <> · Closed {new Date(take.closed_at).toLocaleString()}</>
            )}
          </p>
          {take.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">"{take.notes}"</p>
          )}
        </div>
        <StatusBadgeLarge
          status={take.status}
          rejectedCount={rejectedCount}
          approvedCount={approvedCount}
        />
      </div>
    </div>
  );
}

function StatusBadgeLarge({
  status, rejectedCount, approvedCount,
}: { status: "DRAFT" | "SUBMITTED" | "CLOSED"; rejectedCount: number; approvedCount: number }) {
  if (status === "CLOSED" && rejectedCount > 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
        <div className="text-xs uppercase tracking-widest text-red-700 font-semibold flex items-center gap-1.5 justify-end">
          <ShieldAlert className="w-3.5 h-3.5" />
          Closed with rejection
        </div>
        <div className="text-xs text-red-700/80 mt-1 max-w-xs">
          {rejectedCount} variance{rejectedCount !== 1 ? "s" : ""} were
          rejected — system stays knowingly different from physical count
          on those lines.
        </div>
      </div>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Closed
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        Awaiting review
      </span>
    );
  }
  return (
    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded inline-flex items-center gap-1.5">
      Draft
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT — counting screen

function DraftView({ take, onChange }: { take: StockTake; onChange: () => void }) {
  const { data: coinData } = useSWR<UnitTypeListResponse>(
    "/coins?page_size=200&is_active=true",
    apiFetcher,
  );
  const { data: ounceData } = useSWR<UnitTypeListResponse>(
    "/ounces?page_size=200&is_active=true",
    apiFetcher,
  );

  const coinTypes = coinData?.items ?? [];
  const ounceTypes = ounceData?.items ?? [];

  // Map of existing lines (so we can show what's already counted in this
  // session and pre-fill the input). Keyed by `${ref_type}:${ref_id}`.
  const lineByKey = useMemo(() => {
    const m = new Map<string, StockTakeLine>();
    for (const l of take.lines) m.set(`${l.ref_type}:${l.ref_id}`, l);
    return m;
  }, [take.lines]);

  // Counts in progress (local UI state, before persisting via add/edit line).
  const [counts, setCounts] = useState<Record<string, string>>({});

  useEffect(() => {
    // Hydrate inputs from any existing lines on first load.
    const next: Record<string, string> = {};
    for (const l of take.lines) {
      next[`${l.ref_type}:${l.ref_id}`] = String(l.counted_qty);
    }
    setCounts(next);
  }, [take.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveLine(refType: StockTakeRefType, refId: string) {
    const key = `${refType}:${refId}`;
    const raw = counts[key];
    if (raw === undefined || raw === "") return;
    const counted = Number(raw);
    if (!Number.isInteger(counted) || counted < 0) {
      setError(`Counted quantity must be a non-negative integer.`);
      return;
    }
    setError(null);
    setSavingKey(key);
    try {
      const existing = lineByKey.get(key);
      if (existing) {
        await api.patch(`/stock-takes/${take.id}/lines/${existing.id}`, {
          counted_qty: counted,
        });
      } else {
        await api.post(`/stock-takes/${take.id}/lines`, {
          ref_type: refType,
          ref_id: refId,
          counted_qty: counted,
        });
      }
      onChange();
    } catch (e: any) {
      setError(e.message ?? "Failed to save count");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeLine(lineId: string) {
    try {
      await api.delete(`/stock-takes/${take.id}/lines/${lineId}`);
      onChange();
    } catch (e: any) {
      setError(e.message ?? "Failed to remove line");
    }
  }

  async function handleSubmit() {
    if (take.lines.length === 0) {
      setError("Add at least one counted line before submitting.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/stock-takes/${take.id}/submit`);
      onChange();
    } catch (e: any) {
      setError(e.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* The two-stage workflow is loudly explained so the operator never
         thinks "saved" or "submitted" means "applied to inventory". */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 flex gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">Two distinct steps</div>
          <ol className="text-xs text-blue-800/90 mt-1.5 list-decimal list-inside space-y-0.5">
            <li>
              <span className="font-medium">Save count</span> per row — records what
              you physically counted. Does NOT change inventory.
            </li>
            <li>
              <span className="font-medium">Submit for review</span> — freezes the
              count and computes variances. Still does NOT change inventory.
            </li>
            <li>
              <span className="font-medium">Approve each variance</span> on the next
              screen — this is the ONLY step that mutates on-hand quantity.
              Each approval is recorded as a fully-audited adjustment.
            </li>
          </ol>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <CountTable
        title="Coins"
        refType="COIN_STOCK"
        types={coinTypes}
        counts={counts}
        setCounts={setCounts}
        lineByKey={lineByKey}
        savingKey={savingKey}
        onSave={saveLine}
        onRemove={removeLine}
      />
      <CountTable
        title="Ounce bars"
        refType="OUNCE_STOCK"
        types={ounceTypes}
        counts={counts}
        setCounts={setCounts}
        lineByKey={lineByKey}
        savingKey={savingKey}
        onSave={saveLine}
        onRemove={removeLine}
      />

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">
            {take.lines.length} {take.lines.length === 1 ? "line" : "lines"} counted so far
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            Submitting will freeze these counts and compute variances. You'll
            then review each variance on the next screen and approve or reject
            individually. <span className="font-medium">Inventory is NOT
            changed by submit — only by approving variances afterwards.</span>
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || take.lines.length === 0}
          className="px-4 py-2.5 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <Lock className="w-4 h-4" />
          {submitting ? "Submitting…" : "Submit count for review"}
        </button>
      </div>
    </>
  );
}

function CountTable({
  title, refType, types, counts, setCounts, lineByKey, savingKey, onSave, onRemove,
}: {
  title: string;
  refType: StockTakeRefType;
  types: UnitType[];
  counts: Record<string, string>;
  setCounts: (c: Record<string, string>) => void;
  lineByKey: Map<string, StockTakeLine>;
  savingKey: string | null;
  onSave: (rt: StockTakeRefType, id: string) => void;
  onRemove: (lineId: string) => void;
}) {
  if (types.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50">
            <tr className="text-xs text-gray-400 uppercase tracking-widest font-medium">
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-right px-4 py-2">System says</th>
              <th className="text-left px-4 py-2 w-32">Counted</th>
              <th className="text-left px-4 py-2 w-40">Status</th>
              <th className="px-4 py-2 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((t) => {
              const key = `${refType}:${t.id}`;
              const line = lineByKey.get(key);
              const raw = counts[key] ?? "";
              const dirty =
                line === undefined
                  ? raw !== ""
                  : raw !== String(line.counted_qty);
              return (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-2 text-gray-700">{t.name_en}</td>
                  <td className="px-4 py-2 text-right text-gray-800 tabular-nums">
                    {t.on_hand_qty}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={raw}
                      onChange={(e) =>
                        setCounts({ ...counts, [key]: e.target.value })
                      }
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {line ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved (count = {line.counted_qty})
                      </span>
                    ) : (
                      <span className="text-gray-400">Not yet counted</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {dirty && (
                      <button
                        onClick={() => onSave(refType, t.id)}
                        disabled={savingKey === key}
                        className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded hover:bg-black disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        {savingKey === key ? "…" : "Save count"}
                      </button>
                    )}
                    {!dirty && line && (
                      <button
                        onClick={() => onRemove(line.id)}
                        className="text-xs text-gray-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMITTED — review screen

function SubmittedView({ take, onChange }: { take: StockTake; onChange: () => void }) {
  // Group lines by resolution status; PENDING surfaces at the top.
  const pending = take.lines.filter((l) => l.resolution === "PENDING");
  const resolved = take.lines.filter((l) => l.resolution !== "PENDING");

  const [actingLineId, setActingLineId] = useState<string | null>(null);
  const [rejectingLine, setRejectingLine] = useState<StockTakeLine | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(line: StockTakeLine) {
    const counted = line.counted_qty;
    const expected = line.expected_qty_at_submit ?? 0;
    const v = describeVariance(counted, expected);
    const effect = describeApprovalEffect(counted, expected);
    const refLabel = nameForLine(line);
    const ok = window.confirm(
      `Approve this variance?\n\n${v.sentence(refLabel)}\n\n${effect}\n\nThis writes a permanent adjustment to the audit ledger.`,
    );
    if (!ok) return;
    setError(null);
    setActingLineId(line.id);
    try {
      await api.post(`/stock-takes/${take.id}/lines/${line.id}/approve`);
      onChange();
    } catch (e: any) {
      setError(e.message ?? "Approve failed");
    } finally {
      setActingLineId(null);
    }
  }

  async function handleReject() {
    if (!rejectingLine) return;
    if (rejectReason.trim().length < 3) {
      setError("Reason is required (min 3 characters).");
      return;
    }
    setError(null);
    setActingLineId(rejectingLine.id);
    try {
      await api.post(
        `/stock-takes/${take.id}/lines/${rejectingLine.id}/reject`,
        { reason: rejectReason.trim() },
      );
      setRejectingLine(null);
      setRejectReason("");
      onChange();
    } catch (e: any) {
      setError(e.message ?? "Reject failed");
    } finally {
      setActingLineId(null);
    }
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">Variances awaiting decision</div>
          <p className="text-xs text-amber-800/90 mt-1">
            Each variance is described in plain words below
            (e.g. "short by 2", "over by 1"). Approving applies the
            adjustment to inventory; rejecting leaves the system
            knowingly different from your physical count and records the
            reason. Both actions are permanent and audited.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {pending.length > 0 && (
        <VarianceTable
          title={`${pending.length} pending variance${pending.length !== 1 ? "s" : ""}`}
          lines={pending}
          isPending
          actingLineId={actingLineId}
          onApprove={handleApprove}
          onRejectClick={(l) => setRejectingLine(l)}
        />
      )}

      {resolved.length > 0 && (
        <VarianceTable
          title="Already resolved"
          lines={resolved}
          isPending={false}
          actingLineId={null}
          onApprove={() => {}}
          onRejectClick={() => {}}
        />
      )}

      {rejectingLine && (
        <RejectModal
          line={rejectingLine}
          reason={rejectReason}
          setReason={setRejectReason}
          submitting={actingLineId === rejectingLine.id}
          onCancel={() => {
            setRejectingLine(null);
            setRejectReason("");
            setError(null);
          }}
          onConfirm={handleReject}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSED — read-only, rejected lines loud

function ClosedView({ take }: { take: StockTake }) {
  const rejected = take.lines.filter((l) => l.resolution === "REJECTED");
  const approved = take.lines.filter((l) => l.resolution === "APPROVED");
  const noVariance = take.lines.filter((l) => l.resolution === "NO_VARIANCE");

  return (
    <>
      {/* Rejected lines get a dedicated, can't-miss callout above
         everything else. Even on a "Closed" stock-take, a rejected
         variance means inventory stays knowingly wrong on that line.
         The B1 reconcile-units endpoint will continue to report this
         drift on every run. */}
      {rejected.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5">
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">
                {rejected.length} variance{rejected.length !== 1 ? "s" : ""} were
                rejected — inventory stays knowingly different from physical count
              </div>
              <p className="text-xs text-red-800/90 mt-1 max-w-2xl">
                These differences were physically observed but not corrected
                in the system. They will continue to surface in
                Inventory → Reconcile as drift until a future stock-take
                approves an adjustment or the underlying issue is fixed.
              </p>
            </div>
          </div>
          <div className="bg-white rounded border border-red-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50/50">
                <tr className="text-xs text-red-700 uppercase tracking-widest font-medium">
                  <th className="text-left px-4 py-2">Item</th>
                  <th className="text-right px-4 py-2">System said</th>
                  <th className="text-right px-4 py-2">Counted</th>
                  <th className="text-left px-4 py-2">Variance</th>
                  <th className="text-left px-4 py-2">Reason for rejecting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {rejected.map((l) => {
                  const v = describeVariance(l.counted_qty, l.expected_qty_at_submit ?? 0);
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-xs">
                        <KindBadge ref_type={l.ref_type} />
                        <span className="ml-1.5 font-mono">{l.ref_id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-800">{l.expected_qty_at_submit}</td>
                      <td className="px-4 py-2 text-right text-gray-800">{l.counted_qty}</td>
                      <td className="px-4 py-2 text-red-800 font-medium">{v.label}</td>
                      <td className="px-4 py-2 text-xs text-red-900 italic">
                        "{l.rejection_reason}"
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <VarianceTable
          title={`${approved.length} approved adjustment${approved.length !== 1 ? "s" : ""}`}
          lines={approved}
          isPending={false}
          actingLineId={null}
          onApprove={() => {}}
          onRejectClick={() => {}}
        />
      )}

      {noVariance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {noVariance.length} matched (no variance)
          </div>
          <div className="px-5 py-3 text-xs text-gray-500">
            Physical count matched system on these {noVariance.length} items —
            no action needed.
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits

function VarianceTable({
  title, lines, isPending, actingLineId, onApprove, onRejectClick,
}: {
  title: string;
  lines: StockTakeLine[];
  isPending: boolean;
  actingLineId: string | null;
  onApprove: (l: StockTakeLine) => void;
  onRejectClick: (l: StockTakeLine) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50">
            <tr className="text-xs text-gray-400 uppercase tracking-widest font-medium">
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-right px-4 py-2">System said</th>
              <th className="text-right px-4 py-2">Counted</th>
              <th className="text-left px-4 py-2">Variance (plain)</th>
              <th className="text-left px-4 py-2">Status</th>
              {isPending && <th className="text-right px-4 py-2 w-48">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((l) => {
              const expected = l.expected_qty_at_submit ?? 0;
              const v = describeVariance(l.counted_qty, expected);
              return (
                <tr key={l.id} className={v.tone === "shortage" ? "bg-red-50/30" : ""}>
                  <td className="px-4 py-2 text-xs">
                    <KindBadge ref_type={l.ref_type} />
                    <span className="ml-1.5 font-mono">{l.ref_id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800 tabular-nums">{expected}</td>
                  <td className="px-4 py-2 text-right text-gray-800 tabular-nums">{l.counted_qty}</td>
                  <td className="px-4 py-2">
                    <VarianceLabel counted={l.counted_qty} expected={expected} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <ResolutionBadge resolution={l.resolution} />
                    {l.resolution === "REJECTED" && l.rejection_reason && (
                      <div className="text-[11px] text-red-700/80 italic mt-0.5 max-w-xs">
                        "{l.rejection_reason}"
                      </div>
                    )}
                  </td>
                  {isPending && (
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onApprove(l)}
                          disabled={actingLineId === l.id}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => onRejectClick(l)}
                          disabled={actingLineId === l.id}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VarianceLabel({ counted, expected }: { counted: number; expected: number }) {
  const v = describeVariance(counted, expected);
  const cls =
    v.tone === "shortage"
      ? "text-red-700 font-semibold"
      : v.tone === "surplus"
      ? "text-amber-700 font-semibold"
      : "text-gray-400";
  return <span className={cls}>{v.label}</span>;
}

function ResolutionBadge({ resolution }: { resolution: StockTakeLine["resolution"] }) {
  const map = {
    PENDING: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: AlertTriangle, label: "Pending" },
    APPROVED: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: ShieldCheck, label: "Approved" },
    REJECTED: { cls: "bg-red-50 text-red-800 border-red-200", icon: ShieldAlert, label: "Rejected" },
    NO_VARIANCE: { cls: "bg-gray-100 text-gray-600 border-gray-200", icon: CheckCircle2, label: "No variance" },
  } as const;
  const m = map[resolution];
  return (
    <span className={`px-2 py-0.5 ${m.cls} border text-xs rounded inline-flex items-center gap-1`}>
      <m.icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function KindBadge({ ref_type }: { ref_type: StockTakeRefType }) {
  return (
    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wide rounded">
      {ref_type === "COIN_STOCK" ? "Coin" : "Ounce"}
    </span>
  );
}

function nameForLine(l: StockTakeLine): string {
  return `${l.ref_type === "COIN_STOCK" ? "Coin" : "Ounce"} ${l.ref_id.slice(0, 8)}…`;
}

function RejectModal({
  line, reason, setReason, submitting, onCancel, onConfirm,
}: {
  line: StockTakeLine;
  reason: string;
  setReason: (r: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const v = describeVariance(line.counted_qty, line.expected_qty_at_submit ?? 0);
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={() => !submitting && onCancel()}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md p-5 space-y-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold text-gray-800">
          Reject variance
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
          <div className="font-medium mb-1">{v.sentence(nameForLine(line))}</div>
          <div className="text-amber-800/90">
            Rejecting leaves the system at {line.expected_qty_at_submit} (not
            {line.counted_qty}). This drift will continue to show up on
            Inventory → Reconcile until resolved.
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Reason (required, recorded in audit log)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold resize-none"
            placeholder="e.g. acceptable shrinkage, suspected miscount — investigating"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || reason.trim().length < 3}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
          >
            {submitting ? "Rejecting…" : "Reject variance"}
          </button>
        </div>
      </div>
    </div>
  );
}
