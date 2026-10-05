"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { LogOut, Coins, Layers, Recycle, Sparkles, Scale } from "lucide-react";
import { GoldRateCard } from "@/components/shared/GoldRateCard";
import { TodayInBeirut } from "@/components/shared/TodayInBeirut";
import { PosModeTabs } from "@/components/pos/PosModeTabs";
import { api, apiFetcher, staleRateError } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { formatUSD } from "@/lib/utils";
import { logout, getStoredUser } from "@/lib/auth";
import { useStaleRateGuard } from "@/hooks/useStaleRateGuard";
import { useLang } from "@/context/LanguageContext";
import { StaleRateAckNotice } from "@/components/shared/StaleRateAckNotice";
import type {
  BuybackKind,
  Karat,
  UnitType,
  UnitTypeListResponse,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];

interface QuoteOut {
  rate_24k: string | number;
  rate_source: string;
  rate_is_stale: boolean;
  karat: string;
  purity_rate: string | number;
  weight_grams: string | number;
  margin_mode: string;
  margin_value: string | number;
  effective_rate_per_gram: string | number;
  buy_price: string | number;
}

// Labels live in the dictionary (t.posBuyback.kinds), keyed by the enum value.
const KIND_OPTIONS: { value: BuybackKind; icon: typeof Recycle }[] = [
  { value: "PURE_GOLD", icon: Scale },
  { value: "COIN", icon: Coins },
  { value: "OUNCE", icon: Layers },
  { value: "USED_PRODUCT", icon: Sparkles },
];

export default function BuybackPage() {
  const router = useRouter();
  const { t } = useLang();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const [kind, setKind] = useState<BuybackKind>("PURE_GOLD");

  return (
    // flex-1, not h-screen: the POS layout is a column with a definite height,
    // so this page claims exactly what the stale-rate banner leaves it. min-h-0
    // lets the inner scroll pane shrink instead of overflowing the wrapper.
    <div className="flex flex-col flex-1 min-h-0 bg-pos-bg">
      <header className="h-16 border-b border-white/10 flex items-center px-6 shrink-0 gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-serif text-gold text-xl tracking-widest">{t.appName}</span>
          <span className="text-pos-gray/40 text-xs">·</span>
          <span className="text-pos-gray text-xs uppercase tracking-widest">{t.pos.pointOfSale}</span>
        </div>
        <PosModeTabs />
        <div className="hidden lg:flex flex-1 justify-center">
          <GoldRateCard compact />
        </div>
        <div className="ml-auto flex items-center gap-5 shrink-0">
          <div className="hidden md:flex flex-col items-end">
            <TodayInBeirut className="text-pos-gray text-[10px] uppercase tracking-widest" />
            {mounted && user && (
              <span className="text-pos-cream text-xs mt-0.5">{user.name}</span>
            )}
          </div>
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex items-center gap-1.5 text-pos-gray hover:text-pos-cream text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t.pos.signOut}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 text-pos-cream">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <p className="text-pos-gray text-[10px] uppercase tracking-widest">{t.posBuyback.eyebrow}</p>
            <h2 className="font-serif text-2xl text-gold mt-1">{t.posBuyback.title}</h2>
          </div>

          {/* Kind selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {KIND_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setKind(value)}
                className={`p-4 rounded-lg border transition-colors text-left ${
                  kind === value
                    ? "border-gold bg-gold/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${kind === value ? "text-gold" : "text-pos-gray"}`} />
                <div className={`text-sm ${kind === value ? "text-gold" : "text-pos-cream"}`}>
                  {t.posBuyback.kinds[value]}
                </div>
              </button>
            ))}
          </div>

          {kind === "PURE_GOLD" && <PureGoldForm />}
          {kind === "COIN" && <UnitForm kind="COIN" />}
          {kind === "OUNCE" && <UnitForm kind="OUNCE" />}
          {kind === "USED_PRODUCT" && <UsedProductForm />}
        </div>
      </div>
    </div>
  );
}

// ── Shared seller fields ──────────────────────────────────────────────────────

interface SellerFields {
  sellerName: string;
  sellerPhone: string;
  setSellerName: (v: string) => void;
  setSellerPhone: (v: string) => void;
}

function useSellerFields(): SellerFields {
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  return { sellerName, sellerPhone, setSellerName, setSellerPhone };
}

function SellerBlock({ seller }: { seller: SellerFields }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t.posBuyback.sellerName}>
        <input
          value={seller.sellerName}
          onChange={(e) => seller.setSellerName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </Field>
      <Field label={t.posBuyback.phone}>
        <input
          value={seller.sellerPhone}
          onChange={(e) => seller.setSellerPhone(e.target.value)}
          placeholder="+961…"
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-gold"
        />
      </Field>
    </div>
  );
}

/**
 * The control sits inside its label (NEX-64): no ids to keep in sync, a click
 * on the text focuses the field, and a screen reader announces it by name.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-pos-gray mb-1">{label}</span>
      {children}
    </label>
  );
}

// ── PURE_GOLD form ────────────────────────────────────────────────────────────

function PureGoldForm() {
  const router = useRouter();
  const { t } = useLang();
  const seller = useSellerFields();
  const [karat, setKarat] = useState<Karat>("K21");
  const [weight, setWeight] = useState("");
  const [priceMode, setPriceMode] = useState<"FORMULA" | "MANUAL">("FORMULA");
  const [manualPrice, setManualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guard = useStaleRateGuard();

  const quoteKey =
    priceMode === "FORMULA" && weight && Number(weight) > 0
      ? `/buybacks/quote?karat=${karat}&weight_grams=${weight}`
      : null;
  const { data: quote, error: quoteError, isValidating: quoteValidating, mutate: mutateQuote } = useSWR<QuoteOut>(quoteKey, apiFetcher);

  async function submit() {
    if (!seller.sellerName || !seller.sellerPhone) {
      setError(t.posBuyback.sellerRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        seller_name: seller.sellerName,
        seller_phone: seller.sellerPhone,
        kind: "PURE_GOLD",
        karat,
        weight_grams: weight,
        notes: notes || null,
      };
      if (priceMode === "MANUAL") {
        body.manual_price = manualPrice;
      } else if (quote) {
        body.expected_rate = quote.rate_24k;
      }
      if (guard.ack) body.stale_rate_ack = guard.ack;
      const result = await api.post<{ id: string }>("/buybacks", body);
      router.push(`/pos/buyback-receipt/${result.id}`);
    } catch (err) {
      const stale = staleRateError(err);
      // Pull market_closed immediately; don't wait for the 30s poll.
      if (stale) guard.refresh();
      setError(
        stale ? stale.message : err instanceof Error ? err.message : "Buyback failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
      <SellerBlock seller={seller} />

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.products.karat}>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value as Karat)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label={t.products.weightGrams}>
          <input
            type="number"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </Field>
      </div>

      <PriceModeToggle priceMode={priceMode} setPriceMode={setPriceMode} />

      {priceMode === "FORMULA" && quote ? (
        <QuoteCard quote={quote} />
      ) : priceMode === "FORMULA" && quoteError ? (
        <ErrorState variant="dark" className="p-4" error={quoteError} onRetry={() => mutateQuote()} retrying={quoteValidating} />
      ) : priceMode === "FORMULA" ? (
        <div className="text-xs text-pos-gray italic">
          {t.posBuyback.enterWeightHint}
        </div>
      ) : (
        <Field label={t.posBuyback.manualPriceUsd}>
          <input
            type="number"
            step="0.01"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </Field>
      )}

      <Field label={t.posBuyback.notesOptional}>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </Field>

      {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>}

      <StaleRateAckNotice
        required={guard.required}
        accepted={guard.accepted}
        onChange={guard.setAccepted}
        fetchedAt={guard.fetchedAt}
        action="buying"
      />

      <SubmitButton
        label={t.posBuyback.record}
        onClick={submit}
        disabled={submitting || !weight || (priceMode === "MANUAL" && !manualPrice) || guard.blocked}
        submitting={submitting}
      />
    </div>
  );
}

// ── COIN / OUNCE form ─────────────────────────────────────────────────────────

function UnitForm({ kind }: { kind: "COIN" | "OUNCE" }) {
  const router = useRouter();
  const { t } = useLang();
  const seller = useSellerFields();
  const resource = kind === "COIN" ? "coins" : "ounces";
  const [typeId, setTypeId] = useState("");
  const [qty, setQty] = useState("1");
  const [priceMode, setPriceMode] = useState<"FORMULA" | "MANUAL">("FORMULA");
  const [manualPrice, setManualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guard = useStaleRateGuard();

  const { data: types } = useSWR<UnitTypeListResponse>(
    `/${resource}?is_active=true&page_size=200`,
    apiFetcher,
  );
  const selected: UnitType | undefined = types?.items.find((u) => u.id === typeId);

  const quoteKey =
    priceMode === "FORMULA" && selected
      ? `/buybacks/quote?karat=${selected.karat}&weight_grams=${selected.weight_grams}`
      : null;
  const { data: perUnitQuote, error: perUnitQuoteError, isValidating: perUnitQuoteValidating, mutate: mutatePerUnitQuote } = useSWR<QuoteOut>(quoteKey, apiFetcher);

  const quantity = Math.max(1, Number(qty) || 1);
  const totalQuote =
    perUnitQuote && Number(perUnitQuote.buy_price) * quantity;

  async function submit() {
    if (!seller.sellerName || !seller.sellerPhone) {
      setError(t.posBuyback.sellerRequired);
      return;
    }
    if (!typeId) {
      setError(`Pick a ${kind.toLowerCase()} type.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        seller_name: seller.sellerName,
        seller_phone: seller.sellerPhone,
        kind,
        quantity,
        notes: notes || null,
      };
      if (kind === "COIN") body.coin_type_id = typeId;
      else body.ounce_type_id = typeId;
      if (priceMode === "MANUAL") body.manual_price = manualPrice;
      else if (perUnitQuote) body.expected_rate = perUnitQuote.rate_24k;
      if (guard.ack) body.stale_rate_ack = guard.ack;

      const result = await api.post<{ id: string }>("/buybacks", body);
      router.push(`/pos/buyback-receipt/${result.id}`);
    } catch (err) {
      const stale = staleRateError(err);
      // Pull market_closed immediately; don't wait for the 30s poll.
      if (stale) guard.refresh();
      setError(
        stale ? stale.message : err instanceof Error ? err.message : "Buyback failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
      <SellerBlock seller={seller} />

      <Field label={kind === "COIN" ? t.posBuyback.coinType : t.posBuyback.ounceType}>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        >
          <option value="">{t.posBuyback.selectPlaceholder}</option>
          {types?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {/* A data line — code, karat, weight, name: the unit symbol stays with its number */}
              {u.code} · {u.karat} · {`${Number(u.weight_grams).toFixed(3)}g`} · {u.name_en}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t.common.quantity}>
        <input
          type="number"
          min={1}
          max={100}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-32 bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </Field>

      <PriceModeToggle priceMode={priceMode} setPriceMode={setPriceMode} />

      {priceMode === "FORMULA" && perUnitQuoteError && !perUnitQuote && (
        <ErrorState variant="dark" className="p-4" error={perUnitQuoteError} onRetry={() => mutatePerUnitQuote()} retrying={perUnitQuoteValidating} />
      )}
      {priceMode === "FORMULA" && perUnitQuote && (
        <div className="bg-white/5 border border-white/10 rounded p-4 space-y-1.5 text-xs">
          <Row label={t.posBuyback.perUnitFormula} value={formatUSD(perUnitQuote.buy_price)} />
          <Row label={t.common.quantity} value={`× ${quantity}`} />
          <Row
            label={t.posBuyback.totalBuyPrice}
            value={
              <span className="text-gold font-semibold text-base">
                {formatUSD(totalQuote ?? 0)}
              </span>
            }
          />
          <Row
            label={t.posBuyback.rate}
            value={t.posBuyback.rateLine(Number(perUnitQuote.rate_24k).toFixed(2), perUnitQuote.rate_source, perUnitQuote.rate_is_stale)}
          />
        </div>
      )}

      {priceMode === "MANUAL" && (
        <Field label={t.posBuyback.manualPriceUsdTotal}>
          <input
            type="number"
            step="0.01"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </Field>
      )}

      <Field label={t.posBuyback.notesOptional}>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </Field>

      {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>}

      <StaleRateAckNotice
        required={guard.required}
        accepted={guard.accepted}
        onChange={guard.setAccepted}
        fetchedAt={guard.fetchedAt}
        action="buying"
      />

      <SubmitButton
        label={t.posBuyback.record}
        onClick={submit}
        disabled={submitting || !typeId || (priceMode === "MANUAL" && !manualPrice) || guard.blocked}
        submitting={submitting}
      />
    </div>
  );
}

// ── USED_PRODUCT form (manual only) ───────────────────────────────────────────

function UsedProductForm() {
  const router = useRouter();
  const { t } = useLang();
  const seller = useSellerFields();
  const [karat, setKarat] = useState<Karat>("K21");
  const [weight, setWeight] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guard = useStaleRateGuard();

  async function submit() {
    if (!seller.sellerName || !seller.sellerPhone) {
      setError(t.posBuyback.sellerRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ id: string }>("/buybacks", {
        seller_name: seller.sellerName,
        seller_phone: seller.sellerPhone,
        kind: "USED_PRODUCT",
        karat,
        weight_grams: weight,
        manual_price: manualPrice,
        notes: notes || null,
        stale_rate_ack: guard.ack ?? null,
      });
      router.push(`/pos/buyback-receipt/${result.id}`);
    } catch (err) {
      const stale = staleRateError(err);
      // Pull market_closed immediately; don't wait for the 30s poll.
      if (stale) guard.refresh();
      setError(
        stale ? stale.message : err instanceof Error ? err.message : "Buyback failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
      <div className="text-xs text-pos-gray italic">
        {t.posBuyback.usedPieceHint((word) => <span key={word} className="text-gold">{word}</span>)}
      </div>

      <SellerBlock seller={seller} />

      <div className="grid grid-cols-3 gap-3">
        <Field label={t.products.karat}>
          <select
            value={karat}
            onChange={(e) => setKarat(e.target.value as Karat)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          >
            {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label={t.products.weightGrams}>
          <input
            type="number"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </Field>
        <Field label={t.posBuyback.pricePaidUsd}>
          <input
            type="number"
            step="0.01"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </Field>
      </div>

      <Field label={t.posBuyback.notes}>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
        />
      </Field>

      {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>}

      <StaleRateAckNotice
        required={guard.required}
        accepted={guard.accepted}
        onChange={guard.setAccepted}
        fetchedAt={guard.fetchedAt}
        action="buying"
      />

      <SubmitButton
        label={t.posBuyback.record}
        onClick={submit}
        disabled={submitting || !weight || !manualPrice || guard.blocked}
        submitting={submitting}
      />
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function PriceModeToggle({
  priceMode, setPriceMode,
}: {
  priceMode: "FORMULA" | "MANUAL";
  setPriceMode: (m: "FORMULA" | "MANUAL") => void;
}) {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit">
      {(["FORMULA", "MANUAL"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setPriceMode(m)}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded transition-colors ${
            priceMode === m ? "bg-gold text-black font-semibold" : "text-pos-gray hover:text-pos-cream"
          }`}
        >
          {m === "FORMULA" ? t.posBuyback.priceModeAuto : t.posBuyback.priceModeManual}
        </button>
      ))}
    </div>
  );
}

function QuoteCard({ quote }: { quote: QuoteOut }) {
  const { t } = useLang();
  const perGram = t.products.perGram;
  return (
    <div className="bg-white/5 border border-white/10 rounded p-4 space-y-1.5 text-xs">
      <Row label={t.posBuyback.spot24k} value={`$${Number(quote.rate_24k).toFixed(2)}${perGram}`} />
      <Row label={t.products.purityRate} value={`$${Number(quote.purity_rate).toFixed(2)}${perGram} (${quote.karat})`} />
      <Row label={t.posBuyback.buybackMargin} value={`${quote.margin_mode === "USD_PER_GRAM" ? "−$" : ""}${Number(quote.margin_value).toFixed(2)}${quote.margin_mode === "PERCENT" ? "%" : perGram}`} />
      <Row label={t.posBuyback.effective} value={`$${Number(quote.effective_rate_per_gram).toFixed(2)}${perGram}`} />
      <Row
        label={t.posBuyback.paySeller}
        value={
          <span className="text-gold font-semibold text-base">
            {formatUSD(quote.buy_price)}
          </span>
        }
      />
      {quote.rate_is_stale && (
        <div className="text-[10px] text-amber-400 mt-1">
          {t.posBuyback.staleQuote}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-pos-gray">{label}</span>
      <span className="font-mono text-pos-cream">{value}</span>
    </div>
  );
}

function SubmitButton({
  label, onClick, disabled, submitting,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  submitting: boolean;
}) {
  const { t } = useLang();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-5 py-3 bg-gold hover:bg-gold-dark text-black text-sm font-semibold rounded disabled:opacity-50 transition-colors"
    >
      {submitting ? t.posBuyback.recording : label}
    </button>
  );
}
