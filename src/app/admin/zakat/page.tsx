"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Scale, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, Save } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import type { ZakatSnapshot, ZakatSnapshotList, ZakatSummary } from "@/types/zakat";

// ── formatting helpers ────────────────────────────────────────────────────────
const usd = (n: string | number) =>
  Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const grams = (n: string | number, dp = 3) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const rate = (n: string | number) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ZakatPage() {
  const { t } = useLang();
  const z = t.zakat;

  const { data: summary, error: summaryErr, mutate: mutateSummary, isLoading: loadingSummary } =
    useSWR<ZakatSummary>("/zakat", apiFetcher);

  const { data: snapshotsData, mutate: mutateSnapshots } =
    useSWR<ZakatSnapshotList>("/zakat/snapshots?page_size=200", apiFetcher);

  const [showLatestPerDate, setShowLatestPerDate] = useState(true);
  const [snapModalOpen, setSnapModalOpen] = useState(false);
  const [snapDate, setSnapDate] = useState(todayISO());
  const [snapNotes, setSnapNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredSnapshots: ZakatSnapshot[] = useMemo(() => {
    const items = snapshotsData?.items ?? [];
    if (!showLatestPerDate) return items;
    const byDate = new Map<string, ZakatSnapshot>();
    for (const s of items) {
      const existing = byDate.get(s.assessment_date);
      if (!existing || new Date(s.taken_at) > new Date(existing.taken_at)) {
        byDate.set(s.assessment_date, s);
      }
    }
    return Array.from(byDate.values()).sort(
      (a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
    );
  }, [snapshotsData, showLatestPerDate]);

  async function handleSaveSnapshot() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/zakat/snapshots", { assessment_date: snapDate, notes: snapNotes || null });
      setSnapModalOpen(false);
      setSnapNotes("");
      await Promise.all([mutateSummary(), mutateSnapshots()]);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save snapshot");
    } finally {
      setSaving(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  if (summaryErr) {
    const msg = summaryErr.message ?? String(summaryErr);
    const isRateUnavail = msg.includes("Gold rate") || msg.toLowerCase().includes("rate");
    return (
      <div className="max-w-3xl">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800 flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium mb-1">{isRateUnavail ? z.rateUnavailable : "Error"}</div>
            <div className="text-xs text-red-700">{msg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingSummary || !summary) {
    return <div className="text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Scale className="w-5 h-5 text-gold" />
            {z.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">{z.subtitle}</p>
        </div>
        <button
          onClick={() => mutateSummary()}
          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {z.refresh}
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Au */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="text-xs text-gray-400 uppercase tracking-widest">{z.totalAuCardTitle}</div>
          <div className="text-3xl font-semibold text-gray-800 mt-2">
            {grams(summary.holdings.total_au_grams)} <span className="text-base text-gray-400">g</span>
          </div>
          <div className="text-xs text-gray-500 mt-3 flex justify-between">
            <span>{z.cashValue}</span>
            <span className="font-medium text-gray-700">{usd(summary.total_au_value_usd)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-2 flex justify-between">
            <span>{z.rateLabel}</span>
            <span>
              ${rate(summary.gold_rate_24k)}/g
              <span className="ml-1.5 inline-flex items-center gap-1 text-[10px]">
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">
                  {summary.gold_rate_source}
                </span>
                {summary.gold_rate_is_stale && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">
                    {z.staleBadge}
                  </span>
                )}
              </span>
            </span>
          </div>
        </div>

        {/* Zakat Due */}
        <div className="bg-white rounded-lg border border-gold/30 shadow-sm p-5">
          <div className="text-xs text-gold uppercase tracking-widest">{z.zakatDueCardTitle}</div>
          <div className="text-3xl font-semibold text-gray-800 mt-2">
            {grams(summary.zakat_au_grams)} <span className="text-base text-gray-400">g</span>
          </div>
          <div className="text-xs text-gray-500 mt-3 flex justify-between">
            <span>{z.zakatDueCash}</span>
            <span className="font-medium text-gold">{usd(summary.zakat_value_usd)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            2.5% × {z.totalAuCardTitle.toLowerCase()}
          </div>
        </div>

        {/* Nisab */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="text-xs text-gray-400 uppercase tracking-widest">{z.nisabCardTitle}</div>
          <div className="text-3xl font-semibold text-gray-800 mt-2">
            {grams(summary.nisab_grams)} <span className="text-base text-gray-400">g</span>
          </div>
          <div
            className={`text-xs mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded ${
              summary.meets_nisab
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {summary.meets_nisab ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            {summary.meets_nisab ? z.meetsNisab : z.belowNisab}
          </div>
          <div className="text-xs text-gray-400 mt-2">{z.nisabHint}</div>
        </div>
      </div>

      {/* Per-karat breakdown */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-2">
          <div className="text-sm font-semibold text-gray-800">{z.perKarat}</div>
          <p className="text-xs text-gray-400 mt-0.5">{z.perKaratHint}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="text-left font-normal px-5 py-2">{z.karat}</th>
                <th className="text-right font-normal px-3 py-2">{z.products}</th>
                <th className="text-right font-normal px-3 py-2">{z.coins}</th>
                <th className="text-right font-normal px-3 py-2">{z.ounces}</th>
                <th className="text-right font-normal px-3 py-2">{z.lots}</th>
                <th className="text-right font-normal px-3 py-2">{z.totalWeight}</th>
                <th className="text-right font-normal px-5 py-2">{z.auGrams}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.holdings.by_karat.map((b) => (
                <tr key={b.karat} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{b.karat}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{grams(b.grams_by_source.products)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{grams(b.grams_by_source.coins)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{grams(b.grams_by_source.ounces)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{grams(b.grams_by_source.lots)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-800 font-medium">{grams(b.total_weight_grams)}</td>
                  <td className="px-5 py-2.5 text-right text-gold font-semibold">{grams(b.au_grams)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-sm font-semibold">
                <td className="px-5 py-3 text-gray-800">{z.grandTotal}</td>
                <td colSpan={5} />
                <td className="px-5 py-3 text-right text-gold">{grams(summary.holdings.total_au_grams)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Snapshots */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-2 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">{z.snapshotsTitle}</div>
            <p className="text-xs text-gray-400 mt-0.5">{z.snapshotsHint}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <div className="text-xs flex items-center gap-1 bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setShowLatestPerDate(true)}
                className={`px-2.5 py-1 rounded ${
                  showLatestPerDate ? "bg-white shadow text-gray-800" : "text-gray-500"
                }`}
              >
                {z.latestPerDate}
              </button>
              <button
                onClick={() => setShowLatestPerDate(false)}
                className={`px-2.5 py-1 rounded ${
                  !showLatestPerDate ? "bg-white shadow text-gray-800" : "text-gray-500"
                }`}
              >
                {z.allSnapshots}
              </button>
            </div>
            <button
              onClick={() => setSnapModalOpen(true)}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-dark text-white rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {z.saveSnapshot}
            </button>
          </div>
        </div>

        {filteredSnapshots.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-400 text-center">{z.noSnapshotsYet}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="text-left font-normal px-5 py-2">{z.snapAssessment}</th>
                  <th className="text-left font-normal px-3 py-2">{z.snapTaken}</th>
                  <th className="text-right font-normal px-3 py-2">{z.snapTotalAu}</th>
                  <th className="text-right font-normal px-3 py-2">{z.snapZakatGrams}</th>
                  <th className="text-right font-normal px-3 py-2">{z.snapZakatCash}</th>
                  <th className="text-right font-normal px-3 py-2">{z.snapRate}</th>
                  <th className="text-left font-normal px-3 py-2">{z.snapSource}</th>
                  <th className="text-left font-normal px-5 py-2">{z.nisabCardTitle}</th>
                  <th className="text-center font-normal px-3 py-2">{z.snapIntegrityOk}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 font-medium text-gray-800">{s.assessment_date}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                      {new Date(s.taken_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{grams(s.total_au_grams)}</td>
                    <td className="px-3 py-2.5 text-right text-gold font-medium">{grams(s.zakat_au_grams)}</td>
                    <td className="px-3 py-2.5 text-right text-gold font-medium">{usd(s.zakat_value_usd)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">${rate(s.gold_rate_24k_usd_per_gram)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">
                        {s.gold_rate_source}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {grams(s.nisab_grams_used)}{" "}
                      {s.meets_nisab ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-gray-400">·</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {s.integrity_ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" /> {z.snapIntegrityOk}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
                          <ShieldAlert className="w-3.5 h-3.5" /> {z.snapIntegrityBad}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save snapshot modal */}
      {snapModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setSnapModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-sm p-5 space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-800">{z.saveSnapshotModalTitle}</div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                {z.assessmentDate}
              </label>
              <input
                type="date"
                value={snapDate}
                onChange={(e) => setSnapDate(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                {z.notesOptional}
              </label>
              <textarea
                rows={3}
                value={snapNotes}
                onChange={(e) => setSnapNotes(e.target.value)}
                maxLength={1000}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold resize-none"
              />
            </div>

            {saveError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {saveError}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSnapModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {z.cancel}
              </button>
              <button
                onClick={handleSaveSnapshot}
                disabled={saving || !snapDate}
                className="px-4 py-2 text-sm bg-gold hover:bg-gold-dark text-white rounded disabled:opacity-60"
              >
                {saving ? z.saving : z.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
