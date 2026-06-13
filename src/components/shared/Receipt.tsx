"use client";
/**
 * Shared printable receipt (Phase 0).
 *
 * Renders the normalized `Receipt` shape from the backend (app/schemas/receipt.py)
 * for all three transaction types — SALE, SUPPLIER_PURCHASE, BUYBACK — through a
 * single template. The print stylesheet (A5, chrome hidden) lives here too, so
 * every receipt page prints identically. Sales, supplier, and buyback pages all
 * render <Receipt data={...} />.
 *
 * RTL: when the active language is Arabic the receipt body flips to dir="rtl";
 * Arabic store name / line descriptions are used when present.
 */
import { useLang } from "@/context/LanguageContext";
import { formatUSD, formatLBP, formatDateTime } from "@/lib/utils";
import type { Receipt as ReceiptData } from "@/types/api";

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v);
}

const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
  customer: { en: "CUSTOMER", ar: "الزبون" },
  supplier: { en: "SUPPLIER", ar: "المورّد" },
  seller: { en: "SELLER", ar: "البائع" },
};

const TYPE_TITLE: Record<string, { en: string; ar: string }> = {
  SALE: { en: "SALES RECEIPT", ar: "إيصال بيع" },
  SUPPLIER_PURCHASE: { en: "PURCHASE RECEIPT", ar: "إيصال شراء" },
  BUYBACK: { en: "BUYBACK RECEIPT", ar: "إيصال شراء ذهب" },
};

export function ReceiptPrintStyles() {
  return (
    <style jsx global>{`
      @page {
        size: A5 portrait;
        margin: 8mm;
      }
      @media print {
        html,
        body {
          background: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-print-hidden {
          display: none !important;
        }
        #receipt {
          width: 129mm !important;
          font-size: 14px !important;
          margin: 0 auto;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        #receipt .text-\\[10px\\] {
          font-size: 12px !important;
        }
        #receipt .text-\\[9px\\] {
          font-size: 11px !important;
        }
        #receipt .text-xs {
          font-size: 13px !important;
        }
        #receipt .text-sm {
          font-size: 16px !important;
        }
        #receipt .text-lg {
          font-size: 22px !important;
        }
      }
    `}</style>
  );
}

export function Receipt({ data }: { data: ReceiptData }) {
  const { lang, isRTL } = useLang();
  const isAr = lang === "ar";
  const pick = (m: { en: string; ar: string }) => (isAr ? m.ar : m.en);

  const t = data.totals;
  const hasDiscount = num(t.discount_amount) > 0;
  const hasVat = t.vat_amount != null;
  const storeName = isAr && data.store.name_ar ? data.store.name_ar : data.store.name;
  const role = ROLE_LABEL[data.party.role] ?? { en: data.party.role.toUpperCase(), ar: data.party.role };

  return (
    <div
      id="receipt"
      dir={isRTL ? "rtl" : "ltr"}
      className="bg-white text-gray-900 p-6 font-mono text-xs"
      style={{ width: "80mm" }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        {data.store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.store.logo_url} alt="" className="mx-auto mb-2 h-10 object-contain" />
        ) : null}
        <div className="font-serif text-lg font-bold tracking-widest">{storeName}</div>
        {data.store.address ? <div className="text-[10px] mt-1 text-gray-500">{data.store.address}</div> : null}
        {data.store.phone ? <div className="text-[9px] text-gray-500">{data.store.phone}</div> : null}
        {data.store.vat_number ? <div className="text-[9px] text-gray-500">VAT: {data.store.vat_number}</div> : null}
        <div className="text-[10px] mt-1 font-bold tracking-wider text-gold-dark">{pick(TYPE_TITLE[data.type])}</div>
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Metadata */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-gray-500">REF</span><span>{data.reference}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">DATE</span><span>{formatDateTime(data.issued_at)}</span></div>
        {data.cashier_name && (
          <div className="flex justify-between"><span className="text-gray-500">CASHIER</span><span>{data.cashier_name}</span></div>
        )}
        {data.party.name && (
          <div className="flex justify-between"><span className="text-gray-500">{pick(role)}</span><span>{data.party.name}</span></div>
        )}
        {data.party.phone && (
          <div className="flex justify-between"><span className="text-gray-500">PHONE</span><span>{data.party.phone}</span></div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Line items */}
      <div className="space-y-2">
        {data.lines.map((line, i) => (
          <div key={i}>
            <div className="flex justify-between">
              <span className="flex-1 truncate pr-2">
                {isAr && line.description_ar ? line.description_ar : line.description}
                {num(line.quantity) > 1 ? ` ×${num(line.quantity)}` : ""}
                {line.stone_value != null && line.stone_value > 0 ? " 💎" : ""}
              </span>
              <span className="font-bold">{formatUSD(line.line_total)}</span>
            </div>
            <div className="text-gray-400 text-[9px]">
              {[
                line.code,
                line.karat,
                line.weight_grams != null ? `${line.weight_grams}g` : null,
                line.unit_price != null && num(line.quantity) > 1 ? `@ ${formatUSD(line.unit_price)}` : null,
                line.stone_value != null && line.stone_value > 0
                  ? `${isAr ? "أحجار" : "Stones"}: ${formatUSD(line.stone_value)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Totals */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatUSD(t.subtotal)}</span></div>
        {hasVat && (
          <div className="flex justify-between"><span>VAT {num(t.vat_percent)}%</span><span>{formatUSD(t.vat_amount!)}</span></div>
        )}
        {hasDiscount && (
          <div className="flex justify-between text-status-refunded">
            <span>Discount {num(t.discount_percent) ? `${num(t.discount_percent)}%` : ""}</span>
            <span>−{formatUSD(t.discount_amount!)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1"><span>TOTAL</span><span>{formatUSD(t.total_usd)}</span></div>
        {t.total_lbp != null && num(t.total_lbp) > 0 && (
          <div className="flex justify-between text-gray-400"><span>LBP Equiv.</span><span>{formatLBP(t.total_lbp)}</span></div>
        )}
        {data.payment_method && (
          <div className="flex justify-between"><span>Payment</span><span>{data.payment_method}</span></div>
        )}
      </div>

      {data.notes ? (
        <>
          <div className="border-t border-dashed border-gray-300 my-3" />
          <div className="text-[9px] text-gray-500">{data.notes}</div>
        </>
      ) : null}

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Footer */}
      <div className="text-center text-[9px] text-gray-400 space-y-1">
        {data.store.footer ? <div>{data.store.footer}</div> : <div>Thank you — {storeName}</div>}
        <div className="mt-2 font-bold text-gray-600">{data.reference}</div>
      </div>
    </div>
  );
}

/** Convenience wrapper: dark POS frame + Print/Back actions around <Receipt />. */
export function ReceiptScreen({ data }: { data: ReceiptData }) {
  return (
    <div className="min-h-screen bg-pos-bg flex flex-col items-center justify-center py-8 print:bg-white print:min-h-0 print:py-0">
      <ReceiptPrintStyles />
      <div className="mb-4 flex gap-3 receipt-print-hidden print:hidden">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-gold text-pos-bg rounded text-sm font-medium hover:bg-gold-dark transition-colors"
        >
          Print Receipt
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 border border-white/20 rounded text-sm text-pos-cream hover:bg-white/5 transition-colors"
        >
          Back
        </button>
      </div>
      <Receipt data={data} />
    </div>
  );
}
