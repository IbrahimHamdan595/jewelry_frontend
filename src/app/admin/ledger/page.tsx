"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  ChevronDown, ChevronRight, RefreshCw, CheckCircle, AlertTriangle, Bell, BellOff,
} from "lucide-react";
import { apiFetcher, api, errorMessage } from "@/lib/api-client";
import { ErrorRow } from "@/components/ui/error-state";
import { useFormat } from "@/hooks/useFormat";
import { useLang } from "@/context/LanguageContext";
import { TableSkeleton } from "@/components/ui/skeleton";
import type {
  LedgerEntry,
  LedgerListResponse,
  ReconcileResponse,
} from "@/types/api";

// Useful filter presets — admin can also free-type
const EVENT_PRESETS = [
  "LOT_CREATED", "LOT_CONSUMED", "LOT_DEPLETED",
  "MANUAL_ADJUSTMENT", "PRODUCT_STATUS_CHANGED",
  "COIN_TYPE_CREATED", "COIN_TYPE_UPDATED", "COIN_STOCK_ADJUSTED",
  "OUNCE_TYPE_CREATED", "OUNCE_TYPE_UPDATED", "OUNCE_STOCK_ADJUSTED",
  "BUYBACK_PURE_GOLD", "BUYBACK_COIN", "BUYBACK_OUNCE", "BUYBACK_USED_PRODUCT",
  "SALE_PRODUCT", "SALE_COIN", "SALE_OUNCE", "ORDER_VOID",
  "SALE_ON_STALE_RATE_ACK",
  "SUPPLIER_CREATED", "SUPPLIER_UPDATED", "SUPPLIER_PURCHASE",
  "SUPPLIER_PAYMENT_CASH", "SUPPLIER_PAYMENT_GOLD", "SUPPLIER_BALANCE_CHANGED",
  "MELT", "POLISH",
];

// A database table name: a machine identifier, shown as-is in both languages.
const BALANCES_TABLE = "supplier_balances";

const REF_TYPES = [
  "gold_lot", "coin_type", "ounce_type", "walkin_buyback", "order",
  "category", "product", "supplier", "supplier_purchase", "supplier_payment", "supplier_balance",
];

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <ReconcilePanel />
      <LedgerBrowser />
    </div>
  );
}

// ── Reconciliation panel ──────────────────────────────────────────────────────

function ReconcilePanel() {
  const { t } = useLang();
  const l = t.inventoryLedger;
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReconcileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withAlert, setWithAlert] = useState(false);
  // Whether the alert option was on for the run whose result is on screen.
  const [alertRequested, setAlertRequested] = useState(false);

  async function runReconcile() {
    setRunning(true);
    setError(null);
    const requested = withAlert;
    try {
      const data = await api.get<ReconcileResponse>(
        `/inventory/reconcile?alert=${requested}`,
      );
      setResult(data);
      setAlertRequested(requested);
    } catch (err) {
      setError(errorMessage(err, l.reconcileFailed));
    } finally {
      setRunning(false);
    }
  }

  const drifts = result?.supplier_balance_drifts ?? [];
  // The sentence carries a "{table}" token so each language can place the
  // table name where its word order needs it.
  const [helpBefore, helpAfter = ""] = l.reconcileHelp.split("{table}");

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-700">{l.reconcileTitle}</div>
          <div className="text-xs text-gray-500 mt-1 max-w-xl">
            {helpBefore}<span className="font-mono">{BALANCES_TABLE}</span>{helpAfter}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setWithAlert(!withAlert)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            title={l.alertToggleTitle}
          >
            {withAlert ? <Bell className="w-3.5 h-3.5 text-gold" aria-hidden /> : <BellOff className="w-3.5 h-3.5" aria-hidden />}
            {withAlert ? l.alertOn : l.alertOff}
          </button>
          <button
            onClick={runReconcile}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} aria-hidden />
            {running ? l.running : l.runReconcile}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {result && (
        <>
          {result.drift_count === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle className="w-4 h-4" aria-hidden />
              {l.allReconciled}
              {/* The server only alerts when it finds drift, so "no alert
                  needed" is about what this run asked for, not what it sent. */}
              {alertRequested && <span className="text-xs text-green-600 ms-2">{l.noAlertNeeded}</span>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
                <AlertTriangle className="w-4 h-4" aria-hidden />
                {l.driftsDetected(result.drift_count)}
                {result.discord_alerted && (
                  <span className="text-xs ms-2">{l.discordAlerted}</span>
                )}
              </div>
              <div className="bg-white rounded border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-start px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colSupplier}</th>
                      <th className="text-start px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colUnit}</th>
                      <th className="text-start px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colStored}</th>
                      <th className="text-start px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colComputed}</th>
                      <th className="text-start px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colDrift}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drifts.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-800">{d.supplier_name ?? d.supplier_id.slice(0, 8) + "…"}</td>
                        <td className="px-4 py-2 text-xs">
                          {d.unit === "CASH" ? l.unitCash : l.unitGold(d.karat)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{d.stored}</td>
                        <td className="px-4 py-2 font-mono text-xs">{d.computed}</td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-red-600">{d.drift}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Ledger browser ────────────────────────────────────────────────────────────

function LedgerBrowser() {
  const { t } = useLang();
  const l = t.inventoryLedger;
  const [eventType, setEventType] = useState("");
  const [refType, setRefType] = useState("");
  const [refId, setRefId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (eventType) params.set("event_type", eventType);
  if (refType) params.set("ref_type", refType);
  if (refId) params.set("ref_id", refId);

  const { data, error, isLoading, isValidating, mutate } = useSWR<LedgerListResponse>(
    `/ledger?${params}`,
    apiFetcher,
  );

  function resetFilters() {
    setEventType("");
    setRefType("");
    setRefId("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{l.title}</h3>
        {(eventType || refType || refId) && (
          <button onClick={resetFilters} className="text-xs text-gold hover:text-gold-dark">
            {l.resetFilters}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm grid grid-cols-3 gap-3">
        {/* Inputs live inside their labels: a click on the text focuses the
            field and a screen reader announces it by name, with no ids. The
            datalist stays outside its label so the presets are not read as
            part of the field's name. */}
        <div>
          <label className="block">
            <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">{l.eventType}</span>
            <input
              list="event-presets"
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              placeholder={l.any}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
            />
          </label>
          <datalist id="event-presets">
            {EVENT_PRESETS.map((p) => <option key={p} value={p} aria-label={p} />)}
          </datalist>
        </div>
        <label className="block">
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">{l.refType}</span>
          <select
            value={refType}
            onChange={(e) => { setRefType(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">{l.any}</option>
            {REF_TYPES.map((refTypeCode) => <option key={refTypeCode} value={refTypeCode}>{refTypeCode}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">{l.refId}</span>
          <input
            value={refId}
            onChange={(e) => { setRefId(e.target.value); setPage(1); }}
            placeholder={l.refIdPlaceholder}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
          />
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="w-6"><span className="sr-only">{l.colDetails}</span></th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colEvent}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colRef}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colActor}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{l.colOccurred}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {error && !data ? (
              <ErrorRow cols={5} error={error} onRetry={() => mutate()} retrying={isValidating} />
            ) : isLoading ? (
              <TableSkeleton cols={5} />
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-gray-400">{l.noEvents}</td>
              </tr>
            ) : (
              data.items.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > pageSize && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {l.pageSummary(data.page, Math.ceil(data.total / data.page_size), data.total)}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              {l.prev}
            </button>
            <button
              disabled={page >= Math.ceil(data.total / data.page_size)}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              {l.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const { formatDateTime } = useFormat();
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 rtl:rotate-180" />
          )}
        </td>
        <td className="px-4 py-3">
          <EventBadge event={entry.event_type} />
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          <span className="text-gray-500">{entry.ref_type}</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-gray-700">{entry.ref_id.slice(0, 12)}…</span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-500">
          {entry.actor_user_id.slice(0, 8)}…
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(entry.occurred_at)}</td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/60">
          <td aria-hidden="true" />
          <td colSpan={4} className="px-4 py-3">
            <pre className="text-[11px] font-mono text-gray-700 bg-white border border-gray-100 rounded p-3 overflow-x-auto">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function EventBadge({ event }: { event: string }) {
  let color = "bg-gray-100 text-gray-700";
  if (event.startsWith("LOT_")) color = "bg-gold/10 text-gold";
  // Before the SALE_ prefix branch, which would otherwise swallow it and paint
  // "someone knowingly traded on a stale price" the same green as a routine sale.
  else if (event === "SALE_ON_STALE_RATE_ACK") color = "bg-red-50 text-red-700";
  else if (event.startsWith("SALE_")) color = "bg-green-50 text-green-700";
  else if (event.startsWith("BUYBACK_")) color = "bg-blue-50 text-blue-700";
  else if (event.startsWith("SUPPLIER_PAYMENT")) color = "bg-emerald-50 text-emerald-700";
  else if (event.startsWith("SUPPLIER_")) color = "bg-violet-50 text-violet-700";
  else if (event === "MELT" || event === "POLISH") color = "bg-amber-50 text-amber-800";
  else if (event === "ORDER_VOID") color = "bg-red-50 text-red-700";
  else if (event.startsWith("COIN_") || event.startsWith("OUNCE_")) color = "bg-indigo-50 text-indigo-700";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${color}`}>
      {event}
    </span>
  );
}
