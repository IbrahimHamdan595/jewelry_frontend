"use client";
import { useState } from "react";
import { CheckCircle, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Ltr } from "@/components/shared/Ltr";
import { useLang } from "@/context/LanguageContext";
import { useFormat } from "@/hooks/useFormat";

/** The column this page audits: a machine identifier shown as-is, not copy. */
const STOCK_FIELD = "on_hand_qty";
/** Stands in for a styled element while a sentence is built, so it can be split back out. */
const SLOT = "\u0000";

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
  const { t } = useLang();
  const r = t.reconcile;
  const { formatDateTime } = useFormat();
  // Each sentence decides where its styled element goes; split it there, so the
  // element can be styled without fixing its position for every language.
  const [introBefore, introAfter = ""] = r.intro(SLOT).split(SLOT);
  const [idleBefore, idleAfter = ""] = r.idleHint(SLOT).split(SLOT);
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
    } catch (e) {
      setError(errorMessage(e, r.failed));
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
              {r.title}
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              {introBefore}<span className="font-mono">{STOCK_FIELD}</span>{introAfter}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {r.readOnlyNote}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => runReconcile(false)}
              disabled={loading}
              className="px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} aria-hidden />
              {loading ? r.running : r.run}
            </button>
            <button
              onClick={() => runReconcile(true)}
              disabled={loading}
              className="px-4 py-2 border border-amber-300 text-amber-700 text-xs rounded hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
              {r.runAndAlert}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data !== null && (
        <>
          <div className="text-xs text-gray-400">
            {ranAt && <>{r.lastRun} {formatDateTime(ranAt)}</>}
            {data.discord_alerted && <> · {r.discordAlertSent}</>}
          </div>

          {data.drift_count === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" aria-hidden />
              <div className="text-sm font-medium text-gray-800">
                {r.allMatch}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {r.zeroDrift}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <div className="text-sm font-medium text-amber-900">
                    {r.driftCount(data.drift_count)}
                  </div>
                  <div className="text-xs text-amber-800/80 mt-0.5">
                    {r.driftHint}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{r.kind}</th>
                      <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{r.code}</th>
                      <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.name}</th>
                      <th className="text-end px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{r.stored}</th>
                      <th className="text-end px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{r.computed}</th>
                      <th className="text-end px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{r.drift}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.unit_drifts.map((d) => (
                      <tr key={`${d.kind}-${d.id}`}>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs uppercase tracking-wide text-gray-600">
                            {r.kinds[d.kind]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs"><Ltr>{d.code}</Ltr></td>
                        <td className="px-4 py-3 text-gray-700">{d.name_en}</td>
                        {/* Signed counts stay left-to-right: in RTL a bare "+2" or "-1"
                            renders with its sign on the far side ("2+", "1-"). The replayed
                            count can itself be negative when an event is missing. */}
                        <td className="px-4 py-3 text-end text-gray-800"><Ltr>{d.stored}</Ltr></td>
                        <td className="px-4 py-3 text-end text-gray-800"><Ltr>{d.computed}</Ltr></td>
                        <td className="px-4 py-3 text-end">
                          <Ltr
                            className={
                              d.drift > 0
                                ? "text-amber-700 font-medium"
                                : "text-red-700 font-medium"
                            }
                          >
                            {d.drift > 0 ? "+" : ""}
                            {d.drift}
                          </Ltr>
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
          {idleBefore}<span className="font-medium">{r.run}</span>{idleAfter}
        </div>
      )}
    </div>
  );
}
