"use client";
import { useRef, useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Sliders, DollarSign, ToggleLeft, ToggleRight, Image as ImageIcon } from "lucide-react";
import { apiFetcher, api, uploadFile } from "@/lib/api-client";
import { ErrorRow } from "@/components/ui/error-state";
import { formatUSD } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Ltr } from "@/components/shared/Ltr";
import { useLang } from "@/context/LanguageContext";
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
  /**
   * @deprecated Ignored. The catalog's wording comes from t.unitCatalog[resource]:
   * "New {singular}" and "No {plural} yet" cannot be assembled from a noun in
   * Arabic. Still accepted so existing callers compile; drop it at the call site.
   */
  singular?: string;
  /** @deprecated Ignored — see `singular`. */
  plural?: string;
}

export function UnitCatalog({ resource, adjustmentTarget }: Props) {
  const { t } = useLang();
  const u = t.unitCatalog;
  const noun = u[resource];
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (search) params.set("search", search);
  if (!includeInactive) params.set("is_active", "true");

  const { data, error: loadError, isValidating, mutate } = useSWR<UnitTypeListResponse>(
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
            placeholder={noun.search}
            aria-label={noun.search}
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
            {u.includeInactive}
          </label>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {noun.newType}
        </button>
      </div>

      {showForm && (
        <UnitTypeForm
          resource={resource}
          existing={editing}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await mutate();
          }}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 w-14" aria-label={u.photo} />
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.code}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {t.common.name}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.karat}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.weight}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.markupMargin}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.onHand}
              </th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {u.min}
              </th>
              <th className="px-4 py-3" aria-label={t.common.actions} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadError && !data ? (
              <ErrorRow cols={9} error={loadError} onRetry={() => mutate()} retrying={isValidating} />
            ) : !data ? (
              <TableSkeleton cols={9} />
            ) : !data.items.length ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 text-sm">
                  {noun.empty}
                </td>
              </tr>
            ) : (
              data.items.map((row) => {
                const low =
                  row.min_stock_qty !== null && row.on_hand_qty <= row.min_stock_qty;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {row.photo_url ? (
                        <img
                          src={row.photo_url}
                          alt={row.name_en}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-300" aria-hidden />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700"><Ltr>{row.code}</Ltr></td>
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
                        {/* One LTR run: in RTL the sign and the "/g" otherwise drift to opposite ends. */}
                        <span className="text-gray-400">±</span>{" "}
                        <Ltr>{`${Number(row.markup_per_gram) >= 0 ? "+" : ""}${Number(row.markup_per_gram).toFixed(4)}/g`}</Ltr>
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        <Ltr>
                          {row.margin_mode === "USD"
                            ? `+ ${formatUSD(Number(row.margin_value))}`
                            : `+ ${Number(row.margin_value).toFixed(2)}%`}
                        </Ltr>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        low ? "text-amber-700" : "text-gray-800"
                      }`}
                    >
                      {row.on_hand_qty}
                      {!row.is_active && (
                        <span className="ms-2 text-[10px] uppercase text-gray-400">{u.inactive}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.min_stock_qty ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {/* The same four buttons on every row: each is named after its row's code. */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPriceFor(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title={u.livePrice}
                          aria-label={u.rowAction(u.livePrice, row.code)}
                        >
                          <DollarSign className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          onClick={() => setAdjustRow(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title={u.adjustStock}
                          aria-label={u.rowAction(u.adjustStock, row.code)}
                        >
                          <Sliders className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="text-gray-400 hover:text-gold transition-colors"
                          title={t.common.edit}
                          aria-label={u.rowAction(t.common.edit, row.code)}
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          onClick={() => toggleActive(row)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title={row.is_active ? u.deactivate : u.reactivate}
                          aria-label={u.rowAction(row.is_active ? u.deactivate : u.reactivate, row.code)}
                        >
                          {row.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-500 rtl:rotate-180" aria-hidden />
                          ) : (
                            <ToggleLeft className="w-5 h-5 rtl:rotate-180" aria-hidden />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
  existing,
  onCancel,
  onSaved,
}: {
  resource: "coins" | "ounces";
  existing: UnitType | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useLang();
  const u = t.unitCatalog;
  const noun = u[resource];
  const [code, setCode] = useState(existing?.code ?? "");
  const [nameEn, setNameEn] = useState(existing?.name_en ?? "");
  const [nameAr, setNameAr] = useState(existing?.name_ar ?? "");
  const [karat, setKarat] = useState<Karat>(existing?.karat ?? "K21");
  const [weight, setWeight] = useState(existing?.weight_grams?.toString() ?? "");
  const [markup, setMarkup] = useState(existing?.markup_per_gram?.toString() ?? "0");
  const [marginMode, setMarginMode] = useState<MarginMode>(existing?.margin_mode ?? "USD");
  const [marginValue, setMarginValue] = useState(existing?.margin_value?.toString() ?? "0");
  const [minStock, setMinStock] = useState(existing?.min_stock_qty?.toString() ?? "");
  const [photoUrl, setPhotoUrl] = useState<string>(existing?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadFile<{ url: string }>("/products/upload-image", fd);
      setPhotoUrl(url);
    } catch (err: any) {
      setUploadError(err?.message ?? u.uploadFailed);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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
        photo_url: photoUrl || null,
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
      setError(err instanceof Error ? err.message : u.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="text-sm font-medium text-gray-700">
        {existing ? noun.editType : noun.newType}
      </div>
      {/* Every input sits inside its <label> (NEX-64): a click focuses the field
          and a screen reader names it, with no ids to keep in sync. Display-only
          values use a plain heading instead of a label with no control. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {existing ? (
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.code}</span>
            <input
              value={code}
              disabled
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono bg-gray-50 text-gray-500"
            />
          </label>
        ) : (
          <div>
            <div className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.code}</div>
            <div className="w-full border border-dashed border-gray-200 rounded px-3 py-2.5 text-sm ltr:font-mono text-gray-400">
              {u.autoGenerated}
            </div>
          </div>
        )}
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.karat}</span>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value as Karat)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            {KARATS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{t.common.nameEn}</span>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <label className="block col-span-2">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{t.common.nameAr}</span>
          <input
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm text-start focus:outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.weightG}</span>
          <input
            type="number"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.markupPerGram}</span>
          <input
            type="number"
            step="0.0001"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.marginMode}</span>
          <select
            value={marginMode}
            onChange={(e) => setMarginMode(e.target.value as MarginMode)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            <option value="USD">{u.flatUsd}</option>
            <option value="PERCENT">{u.percent}</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
            {marginMode === "USD" ? u.marginUsd : u.marginPercent}
          </span>
          <input
            type="number"
            step="0.01"
            value={marginValue}
            onChange={(e) => setMarginValue(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.minStockQty}</span>
          <input
            type="number"
            min="0"
            value={minStock}
            placeholder={u.none}
            onChange={(e) => setMinStock(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <div className="block text-xs text-gray-400 uppercase tracking-widest">{u.photo}</div>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <div className="relative">
              <img
                src={photoUrl}
                alt={u.photoPreview}
                className="w-20 h-20 rounded object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setPhotoUrl("")}
                className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                title={u.removePhoto}
                aria-label={u.removePhoto}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-300" aria-hidden />
            </div>
          )}
          <div className="space-y-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label={u.photo}
              onChange={onPickImage}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 border border-gray-200 text-xs rounded hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {uploading ? u.uploading : photoUrl ? u.changePhoto : u.uploadPhoto}
            </button>
            {uploadError && (
              <div role="alert" className="text-xs text-red-600">{uploadError}</div>
            )}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !nameEn || !weight}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
        >
          {saving ? u.saving : existing ? u.saveChanges : noun.createType}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          {t.common.cancel}
        </button>
      </div>
      <p className="text-xs text-gray-400">{u.formHint}</p>
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
  const { t } = useLang();
  const u = t.unitCatalog;
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
      setError(err instanceof Error ? err.message : u.adjustFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">{u.adjustStock}</div>
          {/* Monospace in LTR only: .font-mono is laid out left-to-right in RTL
              (globals.css), which would reverse a translated phrase. The code is
              the machine value, and it keeps it. */}
          <div className="text-xs text-gray-500 mt-0.5 ltr:font-mono">
            <Ltr className="font-mono">{row.code}</Ltr> · {u.onHandInline} {row.on_hand_qty}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block">
              <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.deltaQty}</span>
              <input
                type="number"
                step="1"
                placeholder={u.deltaPlaceholder}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </label>
            <p className="text-[10px] text-gray-400 mt-1">{u.wholeNumbersOnly}</p>
          </div>
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.reason}</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{u.reasons[r]}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{u.notes}</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={u.notesPlaceholder}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        {error && <div role="alert" className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !delta || !notes}
            className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
          >
            {saving ? u.saving : u.apply}
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
  const { t } = useLang();
  const u = t.unitCatalog;
  const { data, isLoading, error } = useSWR<UnitPrice>(
    `/${resource}/${row.id}/price`,
    apiFetcher,
    { refreshInterval: 30000 },
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">{u.livePrice}</div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono"><Ltr>{row.code}</Ltr></div>
        </div>
        {isLoading && <div className="text-sm text-gray-500">{u.pricing}</div>}
        {error && <div role="alert" className="text-sm text-red-600">{(error as Error).message}</div>}
        {data && (
          <>
            <div className="text-center py-3">
              <div className="text-3xl font-semibold text-gray-900">
                {formatUSD(data.final_price)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{u.perUnit} · <Ltr>{row.karat}</Ltr></div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <Row label={u.spot24k} value={`$${data.gold_rate_24k.toFixed(2)}/g`} />
              <Row
                label={u.effectiveRate}
                value={`$${Number(data.effective_rate).toFixed(2)}/g`}
                note={<>{" "}{u.markupApplied}</>}
              />
              <Row label={u.metalValue} value={formatUSD(data.metal_value)} />
              <Row label={u.margin} value={formatUSD(data.margin_amount)} />
              <Row label={u.onHand} value={String(data.on_hand_qty)} />
              <Row
                label={u.source}
                note={
                  <>
                    {u.sources[data.rate_source as keyof typeof u.sources] ?? data.rate_source}
                    {data.rate_is_stale && (
                      <span className="ms-1 text-amber-600">{u.stale}</span>
                    )}
                  </>
                }
              />
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

/**
 * `value` is a machine value (a rate, an amount, a count); `note` is translated
 * text beside it. The whole cell is monospace in LTR, as it always was. In RTL
 * only the value keeps it: .font-mono is laid out left-to-right there
 * (globals.css), which would reverse an Arabic note.
 */
function Row({ label, value, note }: { label: string; value?: string; note?: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="ltr:font-mono">
        {value !== undefined && <Ltr className="font-mono">{value}</Ltr>}
        {note}
      </span>
    </div>
  );
}
