"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft, ClipboardCheck, Save, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, Info, Lock,
} from "lucide-react";
import { apiFetcher, api, errorMessage } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { useLang } from "@/context/LanguageContext";
import { useFormat } from "@/hooks/useFormat";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { Translations } from "@/i18n/en";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import type {
  StockTake, StockTakeLine, StockTakeRefType,
} from "@/types/stock-take";
import type { UnitTypeListResponse, UnitType } from "@/types/api";
import { describeVariance, type VarianceDescription } from "@/lib/variance";

type StockTakeStrings = Translations["stockTake"];

// lib/variance decides direction, magnitude and tone; the wording comes from
// the dictionary so the operator reads it in the interface language.
function varianceLabel(s: StockTakeStrings, v: VarianceDescription): string {
  if (v.direction === "match") return s.varianceMatch;
  return v.direction === "short" ? s.varianceShort(v.magnitude) : s.varianceOver(v.magnitude);
}

function varianceSentence(s: StockTakeStrings, name: string, counted: number, expected: number): string {
  const v = describeVariance(counted, expected);
  if (v.direction === "match") return s.sentenceMatch(name, expected);
  return v.direction === "short"
    ? s.sentenceShort(name, expected, counted, v.magnitude)
    : s.sentenceOver(name, expected, counted, v.magnitude);
}

/** What approving does to on-hand quantity: shown before the operator confirms. */
function approvalEffect(s: StockTakeStrings, counted: number, expected: number): string {
  const v = describeVariance(counted, expected);
  if (v.direction === "match") return s.effectNone;
  return v.direction === "short"
    ? s.effectDecrease(expected, counted, v.magnitude)
    : s.effectIncrease(expected, counted, v.magnitude);
}

interface Props { params: { id: string } }

export default function StockTakeDetailPage({ params }: Props) {
  const takeId = params.id;
  const { t } = useLang();
  const { data: take, mutate, error, isValidating } = useSWR<StockTake>(
    `/stock-takes/${takeId}`,
    apiFetcher,
  );

  if (error && !take) {
    return (
      <div className="max-w-4xl">
        <ErrorState error={error} onRetry={() => mutate()} retrying={isValidating} />
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
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t.stockTake.backToHistory}
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
  const { t } = useLang();
  const s = t.stockTake;
  const { formatDateTime } = useFormat();
  const rejectedCount = take.lines.filter((l) => l.resolution === "REJECTED").length;
  const approvedCount = take.lines.filter((l) => l.resolution === "APPROVED").length;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-gold" />
            {t.nav.stockTake} · {take.id.slice(0, 8)}…
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {s.startedAt(formatDateTime(take.started_at))}
            {take.closed_at && (
              <> · {s.closedAt(formatDateTime(take.closed_at))}</>
            )}
          </p>
          {take.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">&quot;{take.notes}&quot;</p>
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
  const { t } = useLang();
  const s = t.stockTake;
  if (status === "CLOSED" && rejectedCount > 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-end">
        <div className="text-xs uppercase tracking-widest text-red-700 font-semibold flex items-center gap-1.5 justify-end">
          <ShieldAlert className="w-3.5 h-3.5" />
          {s.statusClosedRejected}
        </div>
        <div className="text-xs text-red-700/80 mt-1 max-w-xs">
          {s.rejectedExplain(rejectedCount)}
        </div>
      </div>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {s.statusClosed}
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        {s.statusSubmitted}
      </span>
    );
  }
  return (
    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded inline-flex items-center gap-1.5">
      {s.statusDraft}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT — counting screen

function DraftView({ take, onChange }: { take: StockTake; onChange: () => void }) {
  const { t } = useLang();
  const s = t.stockTake;
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
      setError(s.countInvalid);
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
    } catch (e) {
      setError(errorMessage(e, s.saveFailed));
    } finally {
      setSavingKey(null);
    }
  }

  async function removeLine(lineId: string) {
    try {
      await api.delete(`/stock-takes/${take.id}/lines/${lineId}`);
      onChange();
    } catch (e) {
      setError(errorMessage(e, s.removeFailed));
    }
  }

  async function handleSubmit() {
    if (take.lines.length === 0) {
      setError(s.needOneLine);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/stock-takes/${take.id}/submit`);
      onChange();
    } catch (e) {
      setError(errorMessage(e, s.submitFailed));
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
          <div className="font-medium">{s.stepsTitle}</div>
          <ol className="text-xs text-blue-800/90 mt-1.5 list-decimal list-inside space-y-0.5">
            <li>
              <span className="font-medium">{s.saveCount}</span> {s.step1Body}
            </li>
            <li>
              <span className="font-medium">{s.step2Title}</span> {s.step2Body}
            </li>
            <li>
              <span className="font-medium">{s.step3Title}</span> {s.step3Body}
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
        title={t.dashboard.coins}
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
        title={s.ounceBars}
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
            {s.linesCounted(take.lines.length)}
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            {s.submitNote}{" "}
            <span className="font-medium">{s.submitNoteStrong}</span>
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || take.lines.length === 0}
          className="px-4 py-2.5 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <Lock className="w-4 h-4" />
          {submitting ? s.submitting : s.submitForReview}
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
  const { t } = useLang();
  const s = t.stockTake;
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
              <th className="text-start px-4 py-2">{t.accounting.common.code}</th>
              <th className="text-start px-4 py-2">{t.common.name}</th>
              <th className="text-end px-4 py-2">{s.colSystemSays}</th>
              <th className="text-start px-4 py-2 w-32">{s.colCounted}</th>
              <th className="text-start px-4 py-2 w-40">{t.common.status}</th>
              <th className="px-4 py-2 w-32"><span className="sr-only">{t.common.actions}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((unit) => {
              const key = `${refType}:${unit.id}`;
              const line = lineByKey.get(key);
              const raw = counts[key] ?? "";
              const dirty =
                line === undefined
                  ? raw !== ""
                  : raw !== String(line.counted_qty);
              return (
                <tr key={unit.id}>
                  <td className="px-4 py-2 font-mono text-xs">{unit.code}</td>
                  <td className="px-4 py-2 text-gray-700">{unit.name_en}</td>
                  <td className="px-4 py-2 text-end text-gray-800 tabular-nums">
                    {unit.on_hand_qty}
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
                      aria-label={s.countFor(unit.name_en)}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {line ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {s.savedCount(line.counted_qty)}
                      </span>
                    ) : (
                      <span className="text-gray-400">{s.notCounted}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-end">
                    {dirty && (
                      <button
                        onClick={() => onSave(refType, unit.id)}
                        disabled={savingKey === key}
                        className="px-2.5 py-1 bg-gray-800 text-white text-xs rounded hover:bg-black disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        {savingKey === key ? "…" : s.saveCount}
                      </button>
                    )}
                    {!dirty && line && (
                      <button
                        onClick={() => onRemove(line.id)}
                        className="text-xs text-gray-400 hover:text-red-700"
                      >
                        {s.remove}
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
  const { t } = useLang();
  const s = t.stockTake;
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
    const ok = window.confirm(
      s.approveConfirm(
        varianceSentence(s, nameForLine(s, line), counted, expected),
        approvalEffect(s, counted, expected),
      ),
    );
    if (!ok) return;
    setError(null);
    setActingLineId(line.id);
    try {
      await api.post(`/stock-takes/${take.id}/lines/${line.id}/approve`);
      onChange();
    } catch (e) {
      setError(errorMessage(e, s.approveFailed));
    } finally {
      setActingLineId(null);
    }
  }

  async function handleReject() {
    if (!rejectingLine) return;
    if (rejectReason.trim().length < 3) {
      setError(s.reasonRequired);
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
    } catch (e) {
      setError(errorMessage(e, s.rejectFailed));
    } finally {
      setActingLineId(null);
    }
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">{s.awaitingTitle}</div>
          <p className="text-xs text-amber-800/90 mt-1">
            {s.awaitingBody}
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
          title={s.pendingTitle(pending.length)}
          lines={pending}
          isPending
          actingLineId={actingLineId}
          onApprove={handleApprove}
          onRejectClick={(l) => setRejectingLine(l)}
        />
      )}

      {resolved.length > 0 && (
        <VarianceTable
          title={s.resolvedTitle}
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
  const { t } = useLang();
  const s = t.stockTake;
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
                {s.rejectedTitle(rejected.length)}
              </div>
              <p className="text-xs text-red-800/90 mt-1 max-w-2xl">
                {s.rejectedBody}
              </p>
            </div>
          </div>
          <div className="bg-white rounded border border-red-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50/50">
                <tr className="text-xs text-red-700 uppercase tracking-widest font-medium">
                  <th className="text-start px-4 py-2">{s.colItem}</th>
                  <th className="text-end px-4 py-2">{s.colSystemSaid}</th>
                  <th className="text-end px-4 py-2">{s.colCounted}</th>
                  <th className="text-start px-4 py-2">{s.colVariance}</th>
                  <th className="text-start px-4 py-2">{s.colRejectReason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {rejected.map((l) => {
                  const v = describeVariance(l.counted_qty, l.expected_qty_at_submit ?? 0);
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-xs">
                        <KindBadge ref_type={l.ref_type} />
                        <span className="ms-1.5 font-mono">{l.ref_id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-2 text-end text-gray-800">{l.expected_qty_at_submit}</td>
                      <td className="px-4 py-2 text-end text-gray-800">{l.counted_qty}</td>
                      <td className="px-4 py-2 text-red-800 font-medium">{varianceLabel(s, v)}</td>
                      <td className="px-4 py-2 text-xs text-red-900 italic">
                        &quot;{l.rejection_reason}&quot;
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
          title={s.approvedTitle(approved.length)}
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
            {s.matchedTitle(noVariance.length)}
          </div>
          <div className="px-5 py-3 text-xs text-gray-500">
            {s.matchedBody(noVariance.length)}
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
  const { t } = useLang();
  const s = t.stockTake;
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50">
            <tr className="text-xs text-gray-400 uppercase tracking-widest font-medium">
              <th className="text-start px-4 py-2">{s.colItem}</th>
              <th className="text-end px-4 py-2">{s.colSystemSaid}</th>
              <th className="text-end px-4 py-2">{s.colCounted}</th>
              <th className="text-start px-4 py-2">{s.colVariancePlain}</th>
              <th className="text-start px-4 py-2">{t.common.status}</th>
              {isPending && <th className="text-end px-4 py-2 w-48">{s.colAction}</th>}
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
                    <span className="ms-1.5 font-mono">{l.ref_id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-2 text-end text-gray-800 tabular-nums">{expected}</td>
                  <td className="px-4 py-2 text-end text-gray-800 tabular-nums">{l.counted_qty}</td>
                  <td className="px-4 py-2">
                    <VarianceLabel counted={l.counted_qty} expected={expected} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <ResolutionBadge resolution={l.resolution} />
                    {l.resolution === "REJECTED" && l.rejection_reason && (
                      <div className="text-[11px] text-red-700/80 italic mt-0.5 max-w-xs">
                        &quot;{l.rejection_reason}&quot;
                      </div>
                    )}
                  </td>
                  {isPending && (
                    <td className="px-4 py-2 text-end">
                      <div role="group" aria-label={s.colAction} className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onApprove(l)}
                          disabled={actingLineId === l.id}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {s.approve}
                        </button>
                        <button
                          onClick={() => onRejectClick(l)}
                          disabled={actingLineId === l.id}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          {s.reject}
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
  const { t } = useLang();
  const v = describeVariance(counted, expected);
  const cls =
    v.tone === "shortage"
      ? "text-red-700 font-semibold"
      : v.tone === "surplus"
      ? "text-amber-700 font-semibold"
      : "text-gray-400";
  return <span className={cls}>{varianceLabel(t.stockTake, v)}</span>;
}

function ResolutionBadge({ resolution }: { resolution: StockTakeLine["resolution"] }) {
  const { t } = useLang();
  const s = t.stockTake;
  const map = {
    PENDING: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: AlertTriangle, label: s.resPending },
    APPROVED: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: ShieldCheck, label: s.resApproved },
    REJECTED: { cls: "bg-red-50 text-red-800 border-red-200", icon: ShieldAlert, label: s.resRejected },
    NO_VARIANCE: { cls: "bg-gray-100 text-gray-600 border-gray-200", icon: CheckCircle2, label: s.resNoVariance },
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
  const { t } = useLang();
  return (
    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wide rounded">
      {ref_type === "COIN_STOCK" ? t.stockTake.kindCoin : t.stockTake.kindOunce}
    </span>
  );
}

function nameForLine(s: StockTakeStrings, l: StockTakeLine): string {
  return `${l.ref_type === "COIN_STOCK" ? s.kindCoin : s.kindOunce} ${l.ref_id.slice(0, 8)}…`;
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
  const { t } = useLang();
  const s = t.stockTake;
  const expected = line.expected_qty_at_submit ?? 0;
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // A modal dialog: focus moves to its one field when it opens, Tab stays
  // inside it, and focus goes back to whatever opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reasonRef.current?.focus();
    return () => opener?.focus();
  }, []);
  useFocusTrap(panelRef);

  // Escape closes it, like the backdrop and Cancel: not while a rejection is
  // being submitted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [submitting, onCancel]);

  return (
    // The backdrop is not a control: it only catches clicks that land outside
    // the dialog. Escape and the Cancel button are the keyboard path.
    <div
      role="presentation"
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.rejectVariance}
        className="bg-white rounded-lg w-full max-w-md p-5 space-y-4 shadow-lg"
      >
        <div className="text-sm font-semibold text-gray-800">
          {s.rejectVariance}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
          <div className="font-medium mb-1">{varianceSentence(s, nameForLine(s, line), line.counted_qty, expected)}</div>
          <div className="text-amber-800/90">
            {s.rejectEffect(expected, line.counted_qty)}
          </div>
        </div>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            {s.reasonLabel}
          </span>
          <textarea
            ref={reasonRef}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold resize-none"
            placeholder={s.reasonPlaceholder}
          />
        </label>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || reason.trim().length < 3}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
          >
            {submitting ? s.rejecting : s.rejectVariance}
          </button>
        </div>
      </div>
    </div>
  );
}
