"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, Sliders, History } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import type {
  Karat,
  Lot,
  LotListResponse,
  LotTotalsResponse,
  LotSource,
  AdjustmentReason,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];
const REASONS: AdjustmentReason[] = ["LOSS", "THEFT", "GIFT", "SAMPLE", "CORRECTION"];

export default function LotsPage() {
  const [karatFilter, setKaratFilter] = useState<string>("");
  const [includeDepleted, setIncludeDepleted] = useState(false);

  const listParams = new URLSearchParams({ page: "1", page_size: "50" });
  if (karatFilter) listParams.set("karat", karatFilter);
  if (includeDepleted) listParams.set("include_depleted", "true");

  const { data, mutate } = useSWR<LotListResponse>(
    `/lots?${listParams}`,
    apiFetcher,
  );
  const { data: totals, mutate: mutateTotals } = useSWR<LotTotalsResponse>(
    "/lots/totals",
    apiFetcher,
  );

  const [showForm, setShowForm] = useState(false);
  const [adjustLot, setAdjustLot] = useState<Lot | null>(null);

  async function refreshAll() {
    await Promise.all([mutate(), mutateTotals()]);
  }

  return (
    <div className="space-y-5">
      {/* Per-karat pool totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KARATS.map((k) => {
          const row = totals?.by_karat.find((r) => r.karat === k);
          return (
            <div
              key={k}
              className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
            >
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                {k} pool
              </div>
              <div className="text-2xl font-semibold text-gray-800">
                {row ? Number(row.total_remaining_grams).toFixed(3) : "0.000"}
                <span className="text-sm text-gray-400 ml-1">g</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {row ? `${row.lot_count} lot${row.lot_count !== 1 ? "s" : ""}` : "0 lots"}
                {row && Number(row.cost_basis_remaining_usd) > 0 && (
                  <span className="ml-2 text-gray-400">
                    · {formatUSD(row.cost_basis_remaining_usd)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={karatFilter}
            onChange={(e) => setKaratFilter(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          >
            <option value="">All karats</option>
            {KARATS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeDepleted}
              onChange={(e) => setIncludeDepleted(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include depleted
          </label>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Lot
        </button>
      </div>

      {showForm && (
        <NewLotForm
          onCancel={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            await refreshAll();
          }}
        />
      )}

      {/* Lot list */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {!data?.items.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No lots {karatFilter ? `in ${karatFilter}` : "yet"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Karat
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Remaining / Original
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Source
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Cost basis
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Acquired
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((lot) => (
                <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-gold/10 text-gold text-xs font-medium">
                      {lot.karat}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="text-gray-800">
                      {Number(lot.weight_remaining_grams).toFixed(3)}g
                    </span>
                    <span className="text-gray-400">
                      {" "}/ {Number(lot.weight_grams).toFixed(3)}g
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{lot.source}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatUSD(Number(lot.cost_basis_usd))}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(lot.acquired_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        lot.is_depleted
                          ? "bg-gray-100 text-gray-500"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {lot.is_depleted ? "Depleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustLot(lot)}
                      disabled={lot.is_depleted}
                      className="text-gray-400 hover:text-gold disabled:opacity-40 transition-colors"
                      title="Manual adjustment"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjustLot && (
        <AdjustLotDialog
          lot={adjustLot}
          onClose={() => setAdjustLot(null)}
          onAdjusted={async () => {
            setAdjustLot(null);
            await refreshAll();
          }}
        />
      )}
    </div>
  );
}

// ── New lot form ───────────────────────────────────────────────────────────────

function NewLotForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [karat, setKarat] = useState<Karat>("K21");
  const [weight, setWeight] = useState("");
  const [source, setSource] = useState<LotSource>("SEED");
  const [costBasis, setCostBasis] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/lots", {
        karat,
        weight_grams: weight,
        source,
        cost_basis_usd: costBasis || "0",
        notes: notes || null,
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="text-sm font-medium text-gray-700">New Pure-Gold Lot</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Karat
          </label>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value as Karat)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            {KARATS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Weight (g)
          </label>
          <input
            type="number"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LotSource)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            <option value="SEED">SEED</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Cost basis (USD)
          </label>
          <input
            type="number"
            step="0.01"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
          Notes (optional)
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !weight}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Create Lot"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Lots from buybacks, supplier purchases, and melts are created automatically by those flows — only SEED or
        ADJUSTMENT origin allowed here.
      </p>
    </div>
  );
}

// ── Adjust dialog ──────────────────────────────────────────────────────────────

function AdjustLotDialog({
  lot,
  onClose,
  onAdjusted,
}: {
  lot: Lot;
  onClose: () => void;
  onAdjusted: () => void | Promise<void>;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("CORRECTION");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/adjustments", {
        target_type: "LOT",
        target_id: lot.id,
        delta,
        reason,
        notes,
      });
      await onAdjusted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">Adjust lot</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">
            {lot.karat} · remaining {Number(lot.weight_remaining_grams).toFixed(3)}g
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
              Delta (g)
            </label>
            <input
              type="number"
              step="0.001"
              placeholder="e.g. -2.500"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
            <p className="text-[10px] text-gray-400 mt-1">Negative reduces, positive adds.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Notes (required)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            placeholder="What happened?"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !delta || !notes}
            className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
