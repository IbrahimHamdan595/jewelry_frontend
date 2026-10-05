"use client";
import { Ltr } from "@/components/shared/Ltr";
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
 *
 * i18n (NEX-64): the receipt prints in the active language, like the rest of
 * the UI — none of its text is fixed or bilingual. Every label comes from
 * t.receipt / t.checkout; store name, address, footer, party and line
 * descriptions are data and print as stored.
 */
import { useLang } from "@/context/LanguageContext";
import { formatUSD, formatLBP } from "@/lib/utils";
import { useFormat } from "@/hooks/useFormat";
import type { Receipt as ReceiptData } from "@/types/api";

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v);
}

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
  const { formatDateTime } = useFormat();
  // `t` is already the totals below, so the dictionary goes by `tr` here.
  const { lang, isRTL, t: tr } = useLang();
  const r = tr.receipt;
  const isAr = lang === "ar";

  const t = data.totals;
  const hasDiscount = num(t.discount_amount) > 0;
  const hasVat = t.vat_amount != null;
  const storeName = isAr && data.store.name_ar ? data.store.name_ar : data.store.name;
  // Roles and payment methods arrive as plain strings: translate the ones the
  // dictionary knows, print anything else as the server sent it.
  const roleLabel =
    (r.roles as Record<string, string>)[data.party.role] ?? (isAr ? data.party.role : data.party.role.toUpperCase());
  const paymentLabel = data.payment_method
    ? (tr.checkout.paymentMethods as Record<string, string>)[data.payment_method] ?? data.payment_method
    : null;

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
        {data.store.phone ? <div className="text-[9px] text-gray-500"><Ltr>{data.store.phone}</Ltr></div> : null}
        {data.store.vat_number ? <div className="text-[9px] text-gray-500">{r.vatNumber} <Ltr>{data.store.vat_number}</Ltr></div> : null}
        <div className="text-[10px] mt-1 font-bold tracking-wider text-gold-dark">{r.titles[data.type]}</div>
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Metadata */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-gray-500">{r.ref}</span><span><Ltr>{data.reference}</Ltr></span></div>
        <div className="flex justify-between"><span className="text-gray-500">{r.date}</span><span>{formatDateTime(data.issued_at)}</span></div>
        {data.cashier_name && (
          <div className="flex justify-between"><span className="text-gray-500">{r.cashier}</span><span>{data.cashier_name}</span></div>
        )}
        {data.party.name && (
          <div className="flex justify-between"><span className="text-gray-500">{roleLabel}</span><span>{data.party.name}</span></div>
        )}
        {data.party.phone && (
          <div className="flex justify-between"><span className="text-gray-500">{r.phone}</span><span><Ltr>{data.party.phone}</Ltr></span></div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Line items */}
      <div className="space-y-2">
        {data.lines.map((line, i) => {
          // Code, karat, weight and unit price are one machine run; the stones
          // note is copy and follows it.
          const machine = [
            line.code,
            line.karat,
            line.weight_grams != null ? `${line.weight_grams}g` : null,
            line.unit_price != null && num(line.quantity) > 1 ? `@ ${formatUSD(line.unit_price)}` : null,
          ].filter(Boolean).join(" · ");
          const stones = line.stone_value != null && line.stone_value > 0 ? r.stonesLine(formatUSD(line.stone_value)) : null;
          return (
            <div key={i}>
              <div className="flex justify-between">
                <span className="flex-1 truncate pe-2">
                  {isAr && line.description_ar ? line.description_ar : line.description}
                  {num(line.quantity) > 1 ? ` ×${num(line.quantity)}` : ""}
                  {line.stone_value != null && line.stone_value > 0 ? " 💎" : ""}
                </span>
                <span className="font-bold">{formatUSD(line.line_total)}</span>
              </div>
              <div className="text-gray-400 text-[9px]">
                {machine ? <Ltr>{machine}</Ltr> : null}
                {machine && stones ? " · " : null}
                {stones}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Totals */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span>{tr.common.subtotal}</span><span>{formatUSD(t.subtotal)}</span></div>
        {hasVat && (
          <div className="flex justify-between"><span>{tr.checkout.vatLine(num(t.vat_percent))}</span><span>{formatUSD(t.vat_amount!)}</span></div>
        )}
        {hasDiscount && (
          <div className="flex justify-between text-status-refunded">
            {/* The percentage is printed only when there is one: a null or zero
                discount_percent leaves the bare label, never "0%". */}
            <span>{num(t.discount_percent) ? tr.checkout.discountLine(num(t.discount_percent)) : tr.checkout.discount}</span>
            <span>−{formatUSD(t.discount_amount!)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1"><span>{r.total}</span><span>{formatUSD(t.total_usd)}</span></div>
        {t.total_lbp != null && num(t.total_lbp) > 0 && (
          <div className="flex justify-between text-gray-400"><span>{r.lbpEquiv}</span><span>{formatLBP(t.total_lbp)}</span></div>
        )}
        {paymentLabel && (
          <div className="flex justify-between"><span>{tr.checkout.payment}</span><span>{paymentLabel}</span></div>
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
        {data.store.footer ? <div>{data.store.footer}</div> : <div>{r.thankYou(storeName)}</div>}
        <div className="mt-2 font-bold text-gray-600"><Ltr>{data.reference}</Ltr></div>
      </div>
    </div>
  );
}

/** Convenience wrapper: dark POS frame + Print/Back actions around <Receipt />. */
export function ReceiptScreen({ data }: { data: ReceiptData }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-pos-bg flex flex-col items-center justify-center py-8 print:bg-white print:min-h-0 print:py-0">
      <ReceiptPrintStyles />
      <div className="mb-4 flex gap-3 receipt-print-hidden print:hidden">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-gold text-pos-bg rounded text-sm font-medium hover:bg-gold-dark transition-colors"
        >
          {t.receipt.printReceipt}
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 border border-white/20 rounded text-sm text-pos-cream hover:bg-white/5 transition-colors"
        >
          {t.common.back}
        </button>
      </div>
      <Receipt data={data} />
    </div>
  );
}
