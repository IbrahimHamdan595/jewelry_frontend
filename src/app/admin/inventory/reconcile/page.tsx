"use client";
import { useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api-client";

interface UnitDrift {
  kind: "COIN" | "OUNCE";
  id: string;
  code: string;
  name_en: string;
  stored: number;
  computed: number;
  drift: number;
}

interface ReconcileResponse {
  unit_drifts: UnitDrift[];
  drift_count: number;
  discord_alerted: boolean;
}

export default function InventoryReconcilePage() {
  const [data, setData] = useState<ReconcileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  async function runReconcile(alert: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReconcileResponse>(
        `/inventory/reconcile-units${alert ? "?alert=true" : ""}`,
      );
      setData(res);
      setRanAt(new Date());
    } catch (e: any) {
      setError(e.message ?? "Reconcile failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Coin &amp; Ounce Stock Reconciliation
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Replays every event that mutates <span className="font-mono">on_hand_qty</span>{" "}
              (supplier purchases, walk-in buybacks, manual adjustments,
              completed &amp; refunded sales) and compares the result against the
              stored quantity. Drift means the stored value disagrees with what
              the audit history implies.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Read-only. Resolving drift is a separate step — find the missing
              event in code, or run a physical stock-take and post a manual
              adjustment for the variance.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => runReconcile(false)}
              disabled={loading}
              className="px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
              {loading ? "Running…" : "Run Reconcile"}
            </button>
            <button
              onClick={() => runReconcile(true)}
              disabled={loading}
              className="px-4 py-2 border border-amber-300 text-amber-700 text-xs rounded hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Run &amp; alert on drift
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data !== null && (
        <>
          <div className="text-xs text-gray-400">
            {ranAt && <>Last run: {ranAt.toLocaleString()}</>}
            {data.discord_alerted && <> · Discord alert sent.</>}
          </div>

          {data.drift_count === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <div className="text-sm font-medium text-gray-800">
                All coin &amp; ounce stock matches the ledger replay.
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Zero drift across every active type.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-900">
                    {data.drift_count} type{data.drift_count !== 1 ? "s" : ""} with stock drift
                  </div>
                  <div className="text-xs text-amber-800/80 mt-0.5">
                    Stored on-hand quantity disagrees with the replayed event history.
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Kind</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Code</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Name</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Stored</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Computed</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.unit_drifts.map((d) => (
                      <tr key={`${d.kind}-${d.id}`}>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs uppercase tracking-wide text-gray-600">
                            {d.kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                        <td className="px-4 py-3 text-gray-700">{d.name_en}</td>
                        <td className="px-4 py-3 text-right text-gray-800">{d.stored}</td>
                        <td className="px-4 py-3 text-right text-gray-800">{d.computed}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              d.drift > 0
                                ? "text-amber-700 font-medium"
                                : "text-red-700 font-medium"
                            }
                          >
                            {d.drift > 0 ? "+" : ""}
                            {d.drift}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {data === null && !loading && (
        <div className="text-xs text-gray-400">
          Click <span className="font-medium">Run Reconcile</span> to compute the current state.
        </div>
      )}
    </div>
  );
}
