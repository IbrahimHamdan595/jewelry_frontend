"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  ChevronDown, ChevronRight, RefreshCw, CheckCircle, AlertTriangle, Bell, BellOff,
} from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
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
  "SUPPLIER_CREATED", "SUPPLIER_UPDATED", "SUPPLIER_PURCHASE",
  "SUPPLIER_PAYMENT_CASH", "SUPPLIER_PAYMENT_GOLD", "SUPPLIER_BALANCE_CHANGED",
  "MELT", "POLISH",
];

const REF_TYPES = [
  "gold_lot", "coin_type", "ounce_type", "walkin_buyback", "order",
  "product", "supplier", "supplier_purchase", "supplier_payment", "supplier_balance",
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
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReconcileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withAlert, setWithAlert] = useState(false);

  async function runReconcile() {
    setRunning(true);
    setError(null);
    try {
      const data = await api.get<ReconcileResponse>(
        `/inventory/reconcile?alert=${withAlert}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconcile failed");
    } finally {
      setRunning(false);
    }
  }

  const drifts = result?.supplier_balance_drifts ?? [];

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-700">Supplier balance reconciliation</div>
          <div className="text-xs text-gray-500 mt-1 max-w-xl">
            Replays purchases and payments to verify the running <span className="font-mono">supplier_balances</span>{" "}
            projection. Mismatch indicates either a bug or out-of-band data edits.
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setWithAlert(!withAlert)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            title="Toggle Discord alert on drift"
          >
            {withAlert ? <Bell className="w-3.5 h-3.5 text-gold" /> : <BellOff className="w-3.5 h-3.5" />}
            {withAlert ? "Alert on drift" : "Silent"}
          </button>
          <button
            onClick={runReconcile}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Running…" : "Run reconcile"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {result && (
        <>
          {result.drift_count === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle className="w-4 h-4" />
              All supplier balances reconcile against purchase + payment history.
              {result.discord_alerted && <span className="text-xs text-green-600 ml-2">(no alert needed)</span>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
                <AlertTriangle className="w-4 h-4" />
                {result.drift_count} drift{result.drift_count !== 1 ? "s" : ""} detected.
                {result.discord_alerted && (
                  <span className="text-xs ml-2">Discord alerted.</span>
                )}
              </div>
              <div className="bg-white rounded border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">Supplier</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">Unit</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">Stored</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">Computed</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-widest font-medium">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drifts.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-800">{d.supplier_name ?? d.supplier_id.slice(0, 8) + "…"}</td>
                        <td className="px-4 py-2 text-xs">
                          {d.unit === "CASH" ? "CASH" : `GOLD K${d.karat}`}
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

  const { data, isLoading } = useSWR<LedgerListResponse>(
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
        <h3 className="text-sm font-semibold text-gray-700">Audit ledger</h3>
        {(eventType || refType || refId) && (
          <button onClick={resetFilters} className="text-xs text-gold hover:text-gold-dark">
            Reset filters
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Event type</label>
          <input
            list="event-presets"
            value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(1); }}
            placeholder="any"
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
          />
          <datalist id="event-presets">
            {EVENT_PRESETS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Ref type</label>
          <select
            value={refType}
            onChange={(e) => { setRefType(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">any</option>
            {REF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Ref id</label>
          <input
            value={refId}
            onChange={(e) => { setRefId(e.target.value); setPage(1); }}
            placeholder="exact UUID"
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="w-6" />
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Event</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Ref</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Actor</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Occurred</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-gray-400">No events match these filters.</td>
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
            Page {data.page} of {Math.ceil(data.total / data.page_size)} · {data.total} events
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= Math.ceil(data.total / data.page_size)}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
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
          <td />
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
