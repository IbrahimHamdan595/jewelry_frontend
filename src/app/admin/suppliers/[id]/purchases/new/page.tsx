"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { Ltr } from "@/components/shared/Ltr";
import type {
  Karat,
  Lot,
  LotListResponse,
  Supplier,
  SupplierItemKind,
  SupplierPurchaseMode,
  UnitTypeListResponse,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];

interface ItemDraft {
  item_kind: SupplierItemKind;
  unit_cost_usd: string;
  notes: string;
  // PURE_GOLD
  weight_grams: string;
  karat: Karat;
  // COIN / OUNCE
  type_id: string;
  quantity: string;
  // PRODUCT
  product: {
    name_en: string;
    name_ar: string;
    category: string;
    margin_percent: string;
    making_charge: string;
  };
}

const emptyItem = (): ItemDraft => ({
  item_kind: "PURE_GOLD",
  unit_cost_usd: "",
  notes: "",
  weight_grams: "",
  karat: "K21",
  type_id: "",
  quantity: "",
  product: {
    name_en: "",
    name_ar: "",
    category: "",
    margin_percent: "20",
    making_charge: "25",
  },
});

interface GoldPaymentDraft {
  lot_id: string;
  grams: string;
  karat: Karat;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const sp = t.supplierPurchase;
  const { data: supplier } = useSWR<{ supplier: Supplier }>(`/suppliers/${id}`, apiFetcher);

  const [mode, setMode] = useState<SupplierPurchaseMode>("CASH");
  const [tradeMarkup, setTradeMarkup] = useState("");
  const [totalCashDue, setTotalCashDue] = useState("0");
  const [totalGramsDue, setTotalGramsDue] = useState<Record<string, string>>({});
  const [cashPaidNow, setCashPaidNow] = useState("0");
  const [goldPaymentsNow, setGoldPaymentsNow] = useState<GoldPaymentDraft[]>([]);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lots for the picker — fetch all karats once, filter client-side
  const { data: lotData } = useSWR<LotListResponse>("/lots?page_size=200", apiFetcher);
  const { data: coinData } = useSWR<UnitTypeListResponse>("/coins?is_active=true&page_size=200", apiFetcher);
  const { data: ounceData } = useSWR<UnitTypeListResponse>("/ounces?is_active=true&page_size=200", apiFetcher);

  // The sentence carries an "{amount}" token so each language can place the
  // amount where its word order needs it; <Ltr> keeps "$1,234.56" intact in RTL.
  const [differenceBefore, differenceAfter = ""] = sp.cashDifference.split("{amount}");

  const goldUsesCash = mode === "MIXED" || mode === "CASH";
  const goldUsesGold = mode === "MIXED" || mode === "GOLD";

  const totalPickedByKarat = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const gp of goldPaymentsNow) {
      const g = Number(gp.grams) || 0;
      acc[gp.karat] = (acc[gp.karat] || 0) + g;
    }
    return acc;
  }, [goldPaymentsNow]);

  function addItem() {
    setItems([...items, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        payment_mode: mode,
        notes: notes || null,
        items: items.map((it) => {
          const out: Record<string, unknown> = {
            item_kind: it.item_kind,
            unit_cost_usd: it.unit_cost_usd || "0",
            notes: it.notes || null,
          };
          if (it.item_kind === "PURE_GOLD") {
            out.weight_grams = it.weight_grams;
            out.karat = it.karat;
          } else if (it.item_kind === "COIN") {
            out.coin_type_id = it.type_id;
            out.quantity = Number(it.quantity);
          } else if (it.item_kind === "OUNCE") {
            out.ounce_type_id = it.type_id;
            out.quantity = Number(it.quantity);
          } else if (it.item_kind === "PRODUCT") {
            out.product = {
              name_en: it.product.name_en,
              name_ar: it.product.name_ar,
              category: it.product.category,
              karat: it.karat,
              weight_grams: it.weight_grams,
              margin_percent: it.product.margin_percent,
              making_charge: it.product.making_charge,
              photos: [],
            };
          }
          return out;
        }),
      };
      if (goldUsesCash) {
        body.total_cash_due = totalCashDue || "0";
        body.cash_paid_at_creation = cashPaidNow || "0";
      } else {
        body.total_cash_due = "0";
        body.cash_paid_at_creation = "0";
      }
      if (goldUsesGold) {
        body.total_grams_due_by_karat = totalGramsDue;
        body.gold_payments_at_creation = goldPaymentsNow.map((gp) => ({
          lot_id: gp.lot_id,
          grams: gp.grams,
          karat: gp.karat,
        }));
        if (tradeMarkup) body.trade_markup_per_gram = tradeMarkup;
      } else {
        body.total_grams_due_by_karat = {};
        body.gold_payments_at_creation = [];
      }

      await api.post(`/suppliers/${id}/purchases`, body);
      router.push(`/admin/suppliers/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : sp.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href={`/admin/suppliers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        {supplier ? sp.backTo(supplier.supplier.name) : sp.backToSupplier}
      </Link>

      <h2 className="text-lg font-semibold text-gray-800">{sp.title}</h2>

      {/* Mode */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm space-y-4">
        <div className="text-sm font-medium text-gray-700">{sp.paymentMode}</div>
        <div className="grid grid-cols-3 gap-3">
          {(["CASH", "GOLD", "MIXED"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`p-4 rounded border text-left transition-colors ${
                mode === m
                  ? "border-gold bg-gold/5 text-gold"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold">{sp.mode[m]}</div>
              <div className="text-xs text-gray-500 mt-1">
                {sp.modeHint[m]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deal totals */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm space-y-4">
        <div className="text-sm font-medium text-gray-700">{sp.dealSplit}</div>
        {/* Inputs live inside their labels: a click on the text focuses the
            field and a screen reader announces it by name, with no ids. A
            label that names several controls is a fieldset legend instead. */}
        {goldUsesCash && (
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{sp.totalCashDue}</span>
              <input
                type="number"
                step="0.01"
                value={totalCashDue}
                onChange={(e) => setTotalCashDue(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </label>
            <div>
              <label className="block">
                <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{sp.cashPaidNow}</span>
                <input
                  type="number"
                  step="0.01"
                  value={cashPaidNow}
                  onChange={(e) => setCashPaidNow(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                />
              </label>
              <p className="text-[10px] text-gray-400 mt-1">
                {differenceBefore}<Ltr>{formatUSD(Math.max(0, Number(totalCashDue) - Number(cashPaidNow)))}</Ltr>{differenceAfter}
              </p>
            </div>
          </div>
        )}

        {goldUsesGold && (
          <>
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                {sp.totalGoldDue}
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {KARATS.map((k) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-medium w-10 text-center">{k}</span>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={totalGramsDue[k] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = { ...totalGramsDue };
                        if (v === "" || v === "0") delete next[k];
                        else next[k] = v;
                        setTotalGramsDue(next);
                      }}
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                {sp.tradeMarkup}
              </span>
              <input
                type="number"
                step="0.0001"
                value={tradeMarkup}
                onChange={(e) => setTradeMarkup(e.target.value)}
                className="w-full max-w-xs border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </label>

            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{sp.goldPaidNow}</legend>
              <div className="space-y-2">
                {goldPaymentsNow.map((gp, idx) => {
                  const lot = lotData?.items.find((l) => l.id === gp.lot_id);
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                      <select
                        aria-label={sp.karat}
                        value={gp.karat}
                        onChange={(e) => {
                          const next = [...goldPaymentsNow];
                          next[idx] = { ...next[idx], karat: e.target.value as Karat, lot_id: "" };
                          setGoldPaymentsNow(next);
                        }}
                        className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
                      >
                        {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <select
                        aria-label={sp.lot}
                        value={gp.lot_id}
                        onChange={(e) => {
                          const next = [...goldPaymentsNow];
                          next[idx] = { ...next[idx], lot_id: e.target.value };
                          setGoldPaymentsNow(next);
                        }}
                        className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
                      >
                        <option value="">{sp.pickLot}</option>
                        {lotData?.items
                          .filter((l) => l.karat === gp.karat && !l.is_depleted)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {`${l.id.slice(0, 8)}… · ${Number(l.weight_remaining_grams).toFixed(3)}g`}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        max={lot ? lot.weight_remaining_grams : undefined}
                        placeholder={sp.grams}
                        aria-label={sp.grams}
                        value={gp.grams}
                        onChange={(e) => {
                          const next = [...goldPaymentsNow];
                          next[idx] = { ...next[idx], grams: e.target.value };
                          setGoldPaymentsNow(next);
                        }}
                        className="w-28 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
                      />
                      <button
                        onClick={() => setGoldPaymentsNow(goldPaymentsNow.filter((_, i) => i !== idx))}
                        aria-label={sp.removeGoldLine}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setGoldPaymentsNow([
                      ...goldPaymentsNow,
                      { lot_id: "", grams: "", karat: "K21" },
                    ])
                  }
                  className="text-xs text-gold hover:text-gold-dark"
                >
                  {sp.addGoldLine}
                </button>
              </div>

              {Object.keys(totalGramsDue).length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {sp.pickedVsDue}{" "}
                  {KARATS.map((k) => {
                    const due = Number(totalGramsDue[k] ?? 0);
                    if (due === 0) return null;
                    const picked = totalPickedByKarat[k] ?? 0;
                    const over = picked > due;
                    return (
                      <span key={k} className="mr-3">
                        {k}: <span className={`font-mono ${over ? "text-red-600" : ""}`}>{picked.toFixed(3)}</span>
                        <span className="text-gray-400"> / {due.toFixed(3)}g</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">{sp.itemsReceived}</div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold-dark"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            {sp.addItem}
          </button>
        </div>
        {items.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-6">
            {sp.noItems}
          </div>
        )}
        {items.map((it, idx) => (
          <ItemEditor
            key={idx}
            idx={idx}
            item={it}
            onChange={(patch) => updateItem(idx, patch)}
            onRemove={() => removeItem(idx)}
            coinData={coinData}
            ounceData={ounceData}
          />
        ))}
      </div>

      {/* Notes + submit */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm space-y-4">
        <label className="block">
          <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{sp.notes}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        {error && <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        <div className="flex justify-end gap-2">
          <Link href={`/admin/suppliers/${id}`} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">
            {t.common.cancel}
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="px-5 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60"
          >
            {saving ? sp.recording : sp.recordPurchase}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  idx, item, onChange, onRemove, coinData, ounceData,
}: {
  idx: number;
  item: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
  coinData?: UnitTypeListResponse;
  ounceData?: UnitTypeListResponse;
}) {
  const { t } = useLang();
  const sp = t.supplierPurchase;
  // These controls have no visible label (the placeholder is the only hint),
  // so each carries a translated aria-label; the group names the item.
  return (
    <div role="group" aria-label={sp.itemN(idx + 1)} className="border border-gray-200 rounded p-3 space-y-3 bg-gray-50/50">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">#{idx + 1}</span>
        <select
          aria-label={sp.itemKind}
          value={item.item_kind}
          onChange={(e) => onChange({ item_kind: e.target.value as SupplierItemKind })}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
        >
          <option value="PURE_GOLD">{sp.kind.PURE_GOLD}</option>
          <option value="COIN">{sp.kind.COIN}</option>
          <option value="OUNCE">{sp.kind.OUNCE}</option>
          <option value="PRODUCT">{sp.kind.PRODUCT}</option>
        </select>
        <div className="flex-1" />
        <div>
          <input
            type="number"
            step="0.01"
            placeholder={sp.unitCost}
            aria-label={sp.unitCost}
            value={item.unit_cost_usd}
            onChange={(e) => onChange({ unit_cost_usd: e.target.value })}
            className="w-36 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        <button
          onClick={onRemove}
          aria-label={sp.removeItem}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {item.item_kind === "PURE_GOLD" && (
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label={sp.karat}
            value={item.karat}
            onChange={(e) => onChange({ karat: e.target.value as Karat })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          >
            {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            type="number"
            step="0.001"
            placeholder={sp.weight}
            aria-label={sp.weight}
            value={item.weight_grams}
            onChange={(e) => onChange({ weight_grams: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
          <input
            placeholder={sp.itemNotes}
            aria-label={sp.itemNotes}
            value={item.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
      )}

      {item.item_kind === "COIN" && (
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label={sp.coinType}
            value={item.type_id}
            onChange={(e) => onChange({ type_id: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white col-span-2"
          >
            <option value="">{sp.pickCoinType}</option>
            {coinData?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.karat} · {c.weight_grams}g
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder={sp.qty}
            aria-label={sp.qty}
            value={item.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
      )}

      {item.item_kind === "OUNCE" && (
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label={sp.ounceType}
            value={item.type_id}
            onChange={(e) => onChange({ type_id: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white col-span-2"
          >
            <option value="">{sp.pickOunceType}</option>
            {ounceData?.items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.karat} · {o.weight_grams}g
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder={sp.qty}
            aria-label={sp.qty}
            value={item.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
      )}

      {item.item_kind === "PRODUCT" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            placeholder={t.common.nameEn}
            aria-label={t.common.nameEn}
            value={item.product.name_en}
            onChange={(e) => onChange({ product: { ...item.product, name_en: e.target.value } })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white col-span-2"
          />
          <input
            dir="rtl"
            placeholder={sp.nameArPlaceholder}
            aria-label={t.common.nameAr}
            value={item.product.name_ar}
            onChange={(e) => onChange({ product: { ...item.product, name_ar: e.target.value } })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white col-span-2 text-right"
          />
          <input
            placeholder={sp.category}
            aria-label={sp.category}
            value={item.product.category}
            onChange={(e) => onChange({ product: { ...item.product, category: e.target.value } })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
          <select
            aria-label={sp.karat}
            value={item.karat}
            onChange={(e) => onChange({ karat: e.target.value as Karat })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          >
            {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            type="number"
            step="0.001"
            placeholder={sp.weight}
            aria-label={sp.weight}
            value={item.weight_grams}
            onChange={(e) => onChange({ weight_grams: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
          <input
            type="number"
            step="0.01"
            placeholder={sp.margin}
            aria-label={sp.margin}
            value={item.product.margin_percent}
            onChange={(e) => onChange({ product: { ...item.product, margin_percent: e.target.value } })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
          <input
            type="number"
            step="0.01"
            placeholder={sp.makingCharge}
            aria-label={sp.makingCharge}
            value={item.product.making_charge}
            onChange={(e) => onChange({ product: { ...item.product, making_charge: e.target.value } })}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
      )}
    </div>
  );
}
