"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import type { UnitPrice, UnitTypeListResponse } from "@/types/api";

interface Props {
  kind: "COIN" | "OUNCE";
  onClose: () => void;
  onAdded: () => void;
}

export function AddUnitDialog({ kind, onClose, onAdded }: Props) {
  const resource = kind === "COIN" ? "coins" : "ounces";
  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [search, setSearch] = useState("");
  const { addItem } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: types } = useSWR<UnitTypeListResponse>(
    `/${resource}?is_active=true&page_size=200`,
    apiFetcher,
  );

  const filtered = useMemo(() => {
    const all = types?.items ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (t) => t.code.toLowerCase().includes(q) || t.name_en.toLowerCase().includes(q),
    );
  }, [types, search]);

  // Live price for the highlighted row (so cashier sees what'll land in cart)
  const { data: price } = useSWR<UnitPrice>(
    selectedId ? `/${resource}/${selectedId}/price` : null,
    apiFetcher,
  );

  const selected = types?.items.find((t) => t.id === selectedId);
  const qty = Math.max(1, Number(quantity) || 1);
  const exceedsCap = qty > 100;
  const insufficientStock = selected && selected.on_hand_qty < qty;

  async function handleAdd() {
    if (!selected || !price) return;
    setError(null);
    if (exceedsCap) {
      setError("Quantity capped at 100 per line. Add a second line for more.");
      return;
    }
    if (insufficientStock) {
      setError(`Only ${selected.on_hand_qty} on hand.`);
      return;
    }
    setAdding(true);
    try {
      addItem({
        cartId: `${selected.id}-${Date.now()}`,
        kind,
        coinTypeId: kind === "COIN" ? selected.id : undefined,
        ounceTypeId: kind === "OUNCE" ? selected.id : undefined,
        code: selected.code,
        nameEn: selected.name_en,
        karat: selected.karat,
        weightGrams: Number(selected.weight_grams),
        quantity: qty,
        goldRate24k: price.gold_rate_24k,
        unitPrice: Number(price.final_price),
        finalPrice: Number(price.final_price) * qty,
      });
      onAdded();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-pos-card border border-white/10 rounded-xl w-full max-w-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-pos-cream">
        <div>
          <div className="text-sm uppercase tracking-widest text-gold">
            Add {kind === "COIN" ? "coin" : "ounce bar"} to cart
          </div>
        </div>

        <input
          autoFocus
          placeholder={`Search ${kind === "COIN" ? "coin" : "ounce"} types…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold placeholder:text-pos-gray/50"
        />

        <div className="border border-white/10 rounded max-h-60 overflow-y-auto divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-pos-gray text-sm">
              No {kind.toLowerCase()} types found
            </div>
          ) : (
            filtered.map((t) => {
              const low = t.min_stock_qty != null && t.on_hand_qty <= t.min_stock_qty;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${
                    selectedId === t.id ? "bg-gold/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gold/15 text-gold font-mono shrink-0">
                    {t.karat}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.name_en}</div>
                    <div className="text-xs text-pos-gray font-mono mt-0.5">
                      {t.code} · {Number(t.weight_grams).toFixed(3)}g
                    </div>
                  </div>
                  <div className={`text-xs text-right shrink-0 ${low ? "text-amber-400" : "text-pos-gray"}`}>
                    on hand: <span className="font-semibold">{t.on_hand_qty}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selected && (
          <div className="bg-white/5 border border-white/10 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">{selected.name_en}</div>
                <div className="text-xs text-pos-gray font-mono">{selected.code}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-pos-gray uppercase tracking-widest">Unit price</div>
                <div className="text-lg font-semibold text-gold">
                  {price ? formatUSD(price.final_price) : "…"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-pos-gray uppercase tracking-widest">Qty</label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
              {price && (
                <span className="text-sm text-pos-gray">
                  = <span className="text-pos-cream font-semibold">{formatUSD(Number(price.final_price) * qty)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-pos-gray hover:text-pos-cream">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected || !price || adding || exceedsCap || !!insufficientStock}
            className="px-5 py-2 bg-gold hover:bg-gold-dark text-black text-sm font-semibold rounded disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding…" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
