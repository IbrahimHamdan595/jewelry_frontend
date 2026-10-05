"use client";
import { Trash2, Minus, Plus } from "lucide-react";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { formatRate, formatUSD } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { Ltr } from "@/components/shared/Ltr";
import type { CartItem as CartItemType } from "@/hooks/useCart";

interface Props {
  item: CartItemType;
  onRemove: (id: string) => void;
  onQuantityChange?: (id: string, quantity: number) => void;
}

export function CartItem({ item, onRemove, onQuantityChange }: Props) {
  const { t } = useLang();
  const cap = item.available != null ? Math.min(item.available, 100) : 100;
  const atMax = item.quantity >= cap;

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 animate-slide-in">
      <KaratBadge karat={item.karat} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-pos-cream truncate flex items-center gap-2">
          {item.nameEn}
          {item.kind !== "PRODUCT" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-mono">
              {t.checkout.itemKinds[item.kind]}
            </span>
          )}
        </div>
        <div className="text-xs text-pos-gray mt-0.5">
          {/* A data line — code, weight and rate with their unit symbols — kept as one
              isolated left-to-right run in either language; only the per-piece note is copy. */}
          <Ltr>{`${item.code} · ${item.weightGrams}g @ ${formatRate(item.goldRate24k)}/g`}</Ltr>
          {item.quantity > 1 && <span className="ms-1">· {t.checkout.perEach(formatUSD(item.unitPrice))}</span>}
        </div>
      </div>

      {/* Quantity stepper */}
      {onQuantityChange ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onQuantityChange(item.cartId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="w-6 h-6 flex items-center justify-center rounded border border-white/15 text-pos-cream hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label={t.checkout.decreaseQty(item.nameEn)}
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center text-sm text-pos-cream tabular-nums">{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(item.cartId, item.quantity + 1)}
            disabled={atMax}
            title={atMax ? t.checkout.onlyInStock(cap) : undefined}
            className="w-6 h-6 flex items-center justify-center rounded border border-white/15 text-pos-cream hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label={t.checkout.increaseQty(item.nameEn)}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ) : (
        item.quantity > 1 && <span className="text-[11px] text-pos-cream/70 shrink-0">×{item.quantity}</span>
      )}

      <span className="font-semibold text-sm text-pos-cream shrink-0 w-20 text-end">
        {formatUSD(item.finalPrice)}
      </span>
      <button
        onClick={() => onRemove(item.cartId)}
        className="text-pos-gray hover:text-red-400 transition-colors shrink-0"
        aria-label={t.checkout.removeItem(item.nameEn)}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
