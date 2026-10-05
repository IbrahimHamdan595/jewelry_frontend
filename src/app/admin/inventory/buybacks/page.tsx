"use client";
import { useState } from "react";
import useSWR from "swr";
import { Sparkles, Flame, AlertCircle } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { ErrorRow } from "@/components/ui/error-state";
import { cn, formatUSD } from "@/lib/utils";
import { useFormat } from "@/hooks/useFormat";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Ltr } from "@/components/shared/Ltr";
import { useLang } from "@/context/LanguageContext";
import type {
  BuybackKind,
  BuybackListResponse,
  Karat,
  WalkinBuyback,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];

export default function BuybacksTab() {
  const { t } = useLang();
  const b = t.buybacks;
  const [kindFilter, setKindFilter] = useState<BuybackKind | "">("");
  const [pendingOnly, setPendingOnly] = useState(false);

  const params = new URLSearchParams({ page: "1", page_size: "50" });
  if (kindFilter) params.set("kind", kindFilter);

  const { data, error: loadError, isValidating, mutate } = useSWR<BuybackListResponse>(
    `/buybacks?${params}`,
    apiFetcher,
  );

  const items = (data?.items ?? []).filter((b) => {
    if (!pendingOnly) return true;
    // Pending = USED_PRODUCT that hasn't been polished or melted yet.
    return b.kind === "USED_PRODUCT" && !b.product_id && !b.result_lot_id;
  });

  const [polishFor, setPolishFor] = useState<WalkinBuyback | null>(null);
  const [meltFor, setMeltFor] = useState<WalkinBuyback | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as BuybackKind | "")}
          aria-label={b.filterByKind}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
        >
          <option value="">{b.allKinds}</option>
          <option value="PURE_GOLD">{b.kinds.PURE_GOLD}</option>
          <option value="COIN">{b.kinds.COIN}</option>
          <option value="OUNCE">{b.kinds.OUNCE}</option>
          <option value="USED_PRODUCT">{b.kinds.USED_PRODUCT}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          {b.pendingOnly}
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.when}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.kind}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.seller}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.detail}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.pricePaid}</th>
              <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{b.outcome}</th>
              <th className="px-4 py-3" aria-label={t.common.actions} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadError && !data ? (
              <ErrorRow cols={7} error={loadError} onRetry={() => mutate()} retrying={isValidating} />
            ) : !data ? (
              <TableSkeleton cols={7} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-gray-400">
                  {b.empty(kindFilter ? b.kindPills[kindFilter] : "", pendingOnly)}
                </td>
              </tr>
            ) : (
              items.map((b) => (
                <BuybackRow
                  key={b.id}
                  buyback={b}
                  onPolish={() => setPolishFor(b)}
                  onMelt={() => setMeltFor(b)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {polishFor && (
        <PolishDialog
          buyback={polishFor}
          onClose={() => setPolishFor(null)}
          onDone={async () => {
            setPolishFor(null);
            await mutate();
          }}
        />
      )}
      {meltFor && (
        <MeltBuybackDialog
          buyback={meltFor}
          onClose={() => setMeltFor(null)}
          onDone={async () => {
            setMeltFor(null);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

function BuybackRow({
  buyback, onPolish, onMelt,
}: {
  buyback: WalkinBuyback;
  onPolish: () => void;
  onMelt: () => void;
}) {
  const { t } = useLang();
  const b = t.buybacks;
  const { formatDateTime } = useFormat();
  const when = formatDateTime(buyback.occurred_at);
  const isPendingUsed =
    buyback.kind === "USED_PRODUCT" && !buyback.product_id && !buyback.result_lot_id;

  // Lot ids and signed quantities stay left-to-right inside the translated
  // phrase. The first outcome is monospace in LTR only: .font-mono is laid out
  // left-to-right in RTL (globals.css), which would reverse the phrase, so in
  // Arabic only the id keeps it.
  let outcome: React.ReactNode = <span className="text-gray-400">—</span>;
  if (buyback.kind === "PURE_GOLD" && buyback.result_lot_id) {
    outcome = (
      <span className="text-xs text-gray-600 ltr:font-mono">
        {b.toLot} <Ltr className="font-mono">{buyback.result_lot_id.slice(0, 8)}…</Ltr>
      </span>
    );
  } else if (buyback.kind === "COIN" || buyback.kind === "OUNCE") {
    outcome = <span className="text-xs text-emerald-700">{b.stock} <Ltr>+{buyback.quantity ?? "?"}</Ltr></span>;
  } else if (buyback.kind === "USED_PRODUCT") {
    if (buyback.product_id) {
      outcome = <span className="text-xs text-green-700">{b.polishedToProduct}</span>;
    } else if (buyback.result_lot_id) {
      outcome = <span className="text-xs text-amber-700">{b.meltedToLot} <Ltr>{buyback.result_lot_id.slice(0, 8)}…</Ltr></span>;
    } else {
      outcome = <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" aria-hidden />{b.pending}</span>;
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-xs text-gray-500">{when}</td>
      <td className="px-4 py-3">
        <KindPill kind={buyback.kind} />
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-800">{buyback.seller_name}</div>
        <div className="text-xs text-gray-400 font-mono"><Ltr>{buyback.seller_phone}</Ltr></div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-700">
        {buyback.karat && <span className="inline-block px-2 py-0.5 rounded bg-gold/10 text-gold font-medium me-1">{buyback.karat}</span>}
        {buyback.weight_grams && <span>{Number(buyback.weight_grams).toFixed(3)}g</span>}
        {buyback.quantity && <span> × {buyback.quantity}</span>}
      </td>
      <td className="px-4 py-3 font-semibold text-gray-800">{formatUSD(buyback.buy_price_usd)}</td>
      <td className="px-4 py-3">{outcome}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end items-center gap-2">
          {isPendingUsed && (
            <>
              {/* One Polish / Melt / Receipt per row: each is named after its row. */}
              <button
                onClick={onPolish}
                aria-label={b.polishRow(buyback.seller_name, when)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                {b.polish}
              </button>
              <button
                onClick={onMelt}
                aria-label={b.meltRow(buyback.seller_name, when)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
              >
                <Flame className="w-3.5 h-3.5" aria-hidden />
                {b.melt}
              </button>
            </>
          )}
          <a
            href={`/pos/buyback-receipt/${buyback.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={b.receiptRow(buyback.seller_name, when)}
            className="text-xs text-gold hover:text-gold-dark"
          >
            {b.receipt}
          </a>
        </div>
      </td>
    </tr>
  );
}

function KindPill({ kind }: { kind: BuybackKind }) {
  const { t } = useLang();
  const colors: Record<BuybackKind, string> = {
    PURE_GOLD: "bg-gold/10 text-gold",
    COIN: "bg-indigo-50 text-indigo-700",
    OUNCE: "bg-blue-50 text-blue-700",
    USED_PRODUCT: "bg-violet-50 text-violet-700",
  };
  // Monospace in LTR only: the Arabic label is a word, not a code.
  return <span className={`text-[11px] px-2 py-0.5 rounded ltr:font-mono ${colors[kind]}`}>{t.buybacks.kindPills[kind]}</span>;
}

// ── Polish dialog ──────────────────────────────────────────────────────────────

function PolishDialog({
  buyback, onClose, onDone,
}: {
  buyback: WalkinBuyback;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { t } = useLang();
  const b = t.buybacks;
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState("");
  const [margin, setMargin] = useState("20");
  const [making, setMaking] = useState("25");
  const [overrideWeight, setOverrideWeight] = useState("");
  const [overrideKarat, setOverrideKarat] = useState<Karat | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/polish", {
        walkin_buyback_id: buyback.id,
        name_en: nameEn,
        name_ar: nameAr,
        category,
        margin_percent: margin,
        making_charge: making,
        photos: [],
        override_weight_grams: overrideWeight || null,
        override_karat: overrideKarat || null,
        notes: notes || null,
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : b.polishFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" aria-hidden />
            {b.polishTitle}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {b.original} <Ltr>{buyback.karat}</Ltr> · <Ltr>{Number(buyback.weight_grams ?? 0).toFixed(3)}g</Ltr> · {b.paid} <Ltr>{formatUSD(buyback.buy_price_usd)}</Ltr>
            <span className="text-gray-400"> {b.costBasisCarries}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.common.nameEn} value={nameEn} onChange={setNameEn} />
          <Field label={t.common.nameAr} value={nameAr} onChange={setNameAr} dir="rtl" />
          <Field label={b.category} value={category} onChange={setCategory} />
          <Field label={b.marginPct} value={margin} onChange={setMargin} type="number" step="0.01" />
          <Field label={b.makingCharge} value={making} onChange={setMaking} type="number" step="0.01" />
          <div />
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{b.overrideWeightOptional}</span>
            <input
              type="number"
              step="0.001"
              value={overrideWeight}
              onChange={(e) => setOverrideWeight(e.target.value)}
              placeholder={b.keep(Number(buyback.weight_grams ?? 0).toFixed(3))}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{b.overrideKaratOptional}</span>
            <select
              value={overrideKarat}
              onChange={(e) => setOverrideKarat(e.target.value as Karat | "")}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">{b.keep(buyback.karat ?? "")}</option>
              {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>

        <Field label={b.notesOptional} value={notes} onChange={setNotes} className="col-span-2" />

        {error && <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">{t.common.cancel}</button>
          <button
            onClick={submit}
            disabled={saving || !nameEn || !category}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {saving ? b.polishing : b.polishAndList}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Melt dialog (for USED_PRODUCT buyback) ────────────────────────────────────

function MeltBuybackDialog({
  buyback, onClose, onDone,
}: {
  buyback: WalkinBuyback;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { t } = useLang();
  const b = t.buybacks;
  const [overrideWeight, setOverrideWeight] = useState("");
  const [overrideKarat, setOverrideKarat] = useState<Karat | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/melts", {
        walkin_buyback_id: buyback.id,
        override_weight_grams: overrideWeight || null,
        override_karat: overrideKarat || null,
        notes: notes || null,
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : b.meltFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" aria-hidden />
            {b.meltTitle}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {b.original} <Ltr>{buyback.karat}</Ltr> · <Ltr>{Number(buyback.weight_grams ?? 0).toFixed(3)}g</Ltr> · {b.paid} <Ltr>{formatUSD(buyback.buy_price_usd)}</Ltr>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{b.overrideWeight}</span>
            <input
              type="number"
              step="0.001"
              value={overrideWeight}
              onChange={(e) => setOverrideWeight(e.target.value)}
              placeholder={b.keep(Number(buyback.weight_grams ?? 0).toFixed(3))}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{b.overrideKarat}</span>
            <select
              value={overrideKarat}
              onChange={(e) => setOverrideKarat(e.target.value as Karat | "")}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">{b.keep(buyback.karat ?? "")}</option>
              {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>

        <Field label={b.notesOptional} value={notes} onChange={setNotes} />

        {error && <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">{t.common.cancel}</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded disabled:opacity-60"
          >
            <Flame className="w-4 h-4" aria-hidden />
            {saving ? b.melting : b.melt}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, className = "", type = "text", step, dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
  step?: string;
  dir?: "ltr" | "rtl";
}) {
  // The input sits inside its <label> (NEX-64): a click focuses it and a
  // screen reader names it, with no ids to keep in sync.
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</span>
      <input
        type={type}
        step={step}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold ${dir === "rtl" ? "text-start" : ""}`}
      />
    </label>
  );
}
