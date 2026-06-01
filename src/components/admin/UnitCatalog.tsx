"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Sliders, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import type {
  Karat,
  MarginMode,
  UnitType,
  UnitTypeListResponse,
  UnitPrice,
  AdjustmentReason,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];
const REASONS: AdjustmentReason[] = ["LOSS", "THEFT", "GIFT", "SAMPLE", "CORRECTION"];

interface Props {
  /** API resource path segment, e.g. "coins" or "ounces" */
  resource: "coins" | "ounces";
  /** Adjustment target_type for stock changes */
  adjustmentTarget: "COIN_STOCK" | "OUNCE_STOCK";
  /** Display label, e.g. "Coin Type" / "Ounce Type" */
  singular: string;
  /** Display label, e.g. "Coin Types" / "Ounce Types" */
  plural: string;
}

export function UnitCatalog({ resource, adjustmentTarget, singular, plural }: Props) {
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (search) params.set("search", search);
  if (!includeInactive) params.set("is_active", "true");

  const { data, mutate } = useSWR<UnitTypeListResponse>(
    `/${resource}?${params}`,
    apiFetcher,
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UnitType | null>(null);
  const [adjustRow, setAdjustRow] = useState<UnitType | null>(null);
  const [priceFor, setPriceFor] = useState<UnitType | null>(null);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(row: UnitType) {
    setEditing(row);
    setShowForm(true);
  }

  async function toggleActive(row: UnitType) {
    await api.patch(`/${resource}/${row.id}`, { is_active: !row.is_active });
    mutate();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            placeholder={`Search ${plural.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold w-64"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include inactive
          </label>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New {singular}
        </button>
      </div>

      {showForm && (
        <UnitTypeForm
          resource={resource}
          singular={singular}
          existing={editing}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await mutate();
          }}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {!data?.items.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No {plural.toLowerCase()} yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Code
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Karat
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Weight
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Markup / Margin
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  On hand
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Min
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((row) => {
                const low =
                  row.min_stock_qty !== null && row.on_hand_qty <= row.min_stock_qty;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{row.name_en}</div>
                      {row.name_ar && (
                        <div className="text-xs text-gray-400 mt-0.5" dir="rtl">
                          {row.name_ar}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-gold/10 text-gold text-xs font-medium">
                        {row.karat}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {Number(row.weight_grams).toFixed(3)}g
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div>
                        <span className="text-gray-400">±</span>{" "}
                        {Number(row.markup_per_gram) >= 0 ? "+" : ""}
                        {Number(row.markup_per_gram).toFixed(4)}/g
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {row.margin_mode === "USD"
                          ? `+ ${formatUSD(Number(row.margin_value))}`
                          : `+ ${Number(row.margin_value).toFixed(2)}%`}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        low ? "text-amber-700" : "text-gray-800"
                      }`}
                    >
                      {row.on_hand_qty}
                      {!row.is_active && (
                        <span className="ml-2 text-[10px] uppercase text-gray-400">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.min_stock_qty ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPriceFor(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title="Live price"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAdjustRow(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title="Adjust stock"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(row)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title={row.is_active ? "Deactivate" : "Reactivate"}
                        >
                          {row.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adjustRow && (
        <StockAdjustDialog
          row={adjustRow}
          adjustmentTarget={adjustmentTarget}
          onClose={() => setAdjustRow(null)}
          onSaved={async () => {
            setAdjustRow(null);
            await mutate();
          }}
        />
      )}
      {priceFor && (
        <LivePriceDialog
          resource={resource}
          row={priceFor}
          onClose={() => setPriceFor(null)}
        />
      )}
    </div>
  );
}

// ── New / Edit form ────────────────────────────────────────────────────────────

function UnitTypeForm({
  resource,
  singular,
  existing,
  onCancel,
  onSaved,
}: {
  resource: "coins" | "ounces";
  singular: string;
  existing: UnitType | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [code, setCode] = useState(existing?.code ?? "");
  const [nameEn, setNameEn] = useState(existing?.name_en ?? "");
  const [nameAr, setNameAr] = useState(existing?.name_ar ?? "");
  const [karat, setKarat] = useState<Karat>(existing?.karat ?? "K21");
  const [weight, setWeight] = useState(existing?.weight_grams?.toString() ?? "");
  const [markup, setMarkup] = useState(existing?.markup_per_gram?.toString() ?? "0");
  const [marginMode, setMarginMode] = useState<MarginMode>(existing?.margin_mode ?? "USD");
  const [marginValue, setMarginValue] = useState(existing?.margin_value?.toString() ?? "0");
  const [minStock, setMinStock] = useState(existing?.min_stock_qty?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const common = {
        name_en: nameEn,
        name_ar: nameAr,
        karat,
        weight_grams: weight,
        markup_per_gram: markup || "0",
        margin_mode: marginMode,
        margin_value: marginValue || "0",
        min_stock_qty: minStock === "" ? null : Number(minStock),
      };
      if (existing) {
        // Code is immutable once created; never PATCH it.
        await api.patch(`/${resource}/${existing.id}`, common);
      } else {
        // Omit `code` — backend auto-generates FN-COIN/OZ-{karat}-NNNN.
        await api.post(`/${resource}`, common);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="text-sm font-medium text-gray-700">
        {existing ? `Edit ${singular}` : `New ${singular}`}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {existing ? (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Code</label>
            <input
              value={code}
              disabled
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono bg-gray-50 text-gray-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Code</label>
            <div className="w-full border border-dashed border-gray-200 rounded px-3 py-2.5 text-sm font-mono text-gray-400">
              auto-generated
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Karat</label>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value as Karat)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            {KARATS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (English)</label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (Arabic)</label>
          <input
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm text-right focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Weight (g)</label>
          <input
            type="number"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Markup / g (±)</label>
          <input
            type="number"
            step="0.0001"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Margin mode</label>
          <select
            value={marginMode}
            onChange={(e) => setMarginMode(e.target.value as MarginMode)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            <option value="USD">Flat USD</option>
            <option value="PERCENT">Percent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            Margin {marginMode === "USD" ? "(USD)" : "(%)"}
          </label>
          <input
            type="number"
            step="0.01"
            value={marginValue}
            onChange={(e) => setMarginValue(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Min stock qty</label>
          <input
            type="number"
            min="0"
            value={minStock}
            placeholder="(none)"
            onChange={(e) => setMinStock(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !nameEn || !weight}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : existing ? "Save Changes" : `Create ${singular}`}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Stock changes go through the adjust button — the catalog form only edits type definitions.
      </p>
    </div>
  );
}

// ── Stock adjust dialog ────────────────────────────────────────────────────────

function StockAdjustDialog({
  row,
  adjustmentTarget,
  onClose,
  onSaved,
}: {
  row: UnitType;
  adjustmentTarget: "COIN_STOCK" | "OUNCE_STOCK";
  onClose: () => void;
  onSaved: () => void | Promise<void>;
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
        target_type: adjustmentTarget,
        target_id: row.id,
        delta,
        reason,
        notes,
      });
      await onSaved();
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
          <div className="text-sm font-medium text-gray-800">Adjust stock</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">
            {row.code} · on hand {row.on_hand_qty}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Delta (qty)</label>
            <input
              type="number"
              step="1"
              placeholder="e.g. -2 or 10"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
            <p className="text-[10px] text-gray-400 mt-1">Whole numbers only.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened?"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
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

// ── Live price dialog ──────────────────────────────────────────────────────────

function LivePriceDialog({
  resource,
  row,
  onClose,
}: {
  resource: "coins" | "ounces";
  row: UnitType;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useSWR<UnitPrice>(
    `/${resource}/${row.id}/price`,
    apiFetcher,
    { refreshInterval: 30000 },
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">Live price</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">{row.code}</div>
        </div>
        {isLoading && <div className="text-sm text-gray-500">Pricing…</div>}
        {error && <div className="text-sm text-red-600">{(error as Error).message}</div>}
        {data && (
          <>
            <div className="text-center py-3">
              <div className="text-3xl font-semibold text-gray-900">
                {formatUSD(data.final_price)}
              </div>
              <div className="text-xs text-gray-500 mt-1">per unit · {row.karat}</div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <Row label="Spot 24K" value={`$${data.gold_rate_24k.toFixed(2)}/g`} />
              <Row
                label="Effective rate"
                value={`$${Number(data.effective_rate).toFixed(2)}/g (markup applied)`}
              />
              <Row label="Metal value" value={formatUSD(data.metal_value)} />
              <Row label="Margin" value={formatUSD(data.margin_amount)} />
              <Row label="On hand" value={String(data.on_hand_qty)} />
              <Row
                label="Source"
                value={
                  <span className="text-gray-600">
                    {data.rate_source}
                    {data.rate_is_stale && (
                      <span className="ml-1 text-amber-600">(stale)</span>
                    )}
                  </span>
                }
              />
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
