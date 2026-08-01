"use client";
import { useState } from "react";
import { Gem } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { useStaleRateGuard } from "@/hooks/useStaleRateGuard";
import { StaleRateAckNotice } from "@/components/shared/StaleRateAckNotice";
import type { CartItem } from "@/hooks/useCart";
import type { PaymentMethod, StaleRateAck } from "@/types/api";

interface Props {
  open: boolean;
  items: CartItem[];
  subtotal: number;
  vat: number;
  vatPercent: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  submitting: boolean;
  error?: string | null;
  onConfirm: (ack?: StaleRateAck) => void;
  onCancel: () => void;
}

function Thumb({ url }: { url?: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="w-24 h-24 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <Gem className="w-9 h-9 text-pos-gray/50" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="w-24 h-24 rounded-lg object-cover border border-white/10 shrink-0"
    />
  );
}

export function CheckoutConfirmDialog(props: Props) {
  const { open, items, subtotal, vat, vatPercent, discountPercent, discountAmount,
          total, paymentMethod, customerName, submitting, error, onConfirm, onCancel } = props;
  // Called before the `open` early return — a hook that runs only while the
  // dialog is mounted-and-open would change the hook count when it opens.
  const guard = useStaleRateGuard();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-pos-bg border border-white/10 shadow-2xl">
        <div className="px-6 pt-5 pb-3 border-b border-white/10 shrink-0">
          <p className="font-serif text-gold text-lg">Confirm this order?</p>
          <p className="text-pos-gray text-xs mt-0.5">Review the items and quantities before completing the sale.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <StaleRateAckNotice
            required={guard.required}
            accepted={guard.accepted}
            onChange={guard.setAccepted}
            fetchedAt={guard.fetchedAt}
            action="selling"
          />

          {items.map((it) => (
            <div key={it.cartId} className="flex items-center gap-4">
              <Thumb url={it.imageUrl} />
              <div className="min-w-0 flex-1">
                <div className="text-pos-cream text-base truncate">{it.nameEn}</div>
                <div className="text-pos-gray/70 text-[11px] font-mono mt-0.5">{it.code} · {it.karat} · {it.weightGrams}g</div>
                <div className="text-pos-gray text-xs mt-1.5">{formatUSD(it.unitPrice)} ea · {formatUSD(it.finalPrice)}</div>
              </div>
              <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-gold/15 border border-gold/40 px-3.5 py-2">
                <span className="text-gold/60 text-[9px] uppercase tracking-widest leading-none">Qty</span>
                <span className="text-gold font-bold text-3xl leading-none mt-1">×{it.quantity}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-white/10 shrink-0 space-y-1.5 text-sm">
          <div className="flex justify-between text-pos-gray"><span>Subtotal</span><span>{formatUSD(subtotal)}</span></div>
          <div className="flex justify-between text-pos-gray"><span>VAT {vatPercent}%</span><span>{formatUSD(vat)}</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-gold"><span>Discount {discountPercent}%</span><span>−{formatUSD(discountAmount)}</span></div>
          )}
          <div className="flex justify-between text-pos-gray"><span>Customer</span><span>{customerName || "Walk-in"}</span></div>
          <div className="flex justify-between text-pos-gray"><span>Payment</span><span>{paymentMethod}</span></div>
          <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-white/5">
            <span className="font-serif text-pos-cream uppercase tracking-widest">Total</span>
            <span className="font-serif text-2xl font-bold text-gold">{formatUSD(total)}</span>
          </div>
        </div>

        {error && (
          <div className="px-6 pt-3 shrink-0">
            <p className="text-red-300 text-xs bg-red-500/10 border border-red-500/30 rounded p-2.5">
              {error}
            </p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-white/10 shrink-0 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded border border-white/15 text-pos-gray text-sm hover:border-white/30 hover:text-pos-cream disabled:opacity-50"
          >
            Back to edit
          </button>
          <button
            onClick={() => onConfirm(guard.ack)}
            disabled={submitting || guard.blocked}
            className="flex-1 py-3 rounded bg-gold text-pos-bg text-sm font-medium tracking-widest hover:bg-gold/90 disabled:opacity-50"
          >
            {submitting
              ? "PROCESSING…"
              : guard.blocked
                ? "CONFIRM THE RATE ABOVE"
                : "CONFIRM & COMPLETE"}
          </button>
        </div>
      </div>
    </div>
  );
}
