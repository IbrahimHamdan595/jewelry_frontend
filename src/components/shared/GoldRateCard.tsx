"use client";
import { useGoldRate } from "@/hooks/useGoldRate";
import { api } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import { useFormat } from "@/hooks/useFormat";
import { RetryButton } from "@/components/ui/error-state";

/**
 * Four states, in precedence order:
 *
 *   fetching   no rate yet, no error   → labelled skeleton ("slow", not "broken")
 *   failed     no rate yet, error      → explicit failure + backed-off retry
 *   feed down  rate + error            → last known values, red marker, as-of time
 *   live/stale rate, no error          → server's own is_stale flag decides
 *
 * "Feed down" means OUR api is unreachable (SWR error). "Stale" means the api
 * answered but its upstream gold feed is old (rate.is_stale). They need
 * different actions: revalidate the GET vs. ask the server to re-pull.
 */
export function GoldRateCard({ compact = false }: { compact?: boolean }) {
  const { formatDateTime } = useFormat();
  const { rate, refresh, error, isValidating } = useGoldRate();
  const { t } = useLang();

  if (!rate) {
    if (error) {
      return (
        <div
          role="alert"
          className={
            compact
              ? "flex items-center gap-3"
              : "flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span className="text-red-300 text-xs uppercase tracking-wider">{t.errors.rateUnavailable}</span>
          <RetryButton variant="dark" onRetry={() => refresh()} retrying={isValidating} />
        </div>
      );
    }
    return (
      <div
        role="status"
        className={
          compact
            ? "h-10 w-64 animate-pulse bg-white/10 rounded flex items-center justify-center"
            : "h-28 animate-pulse bg-white/10 rounded flex items-center justify-center"
        }
      >
        <span className="text-pos-gray text-[10px] uppercase tracking-widest">{t.errors.fetchingRate}</span>
      </div>
    );
  }

  const feedDown = !!error;
  const isStale = rate.is_stale || feedDown;
  const asOf = `${t.errors.rateAsOf} ${formatDateTime(rate.fetched_at)}`;
  const statusLabel = feedDown ? t.errors.rateFeedDown : isStale ? "STALE" : "LIVE";
  const dotClass = feedDown ? "bg-red-400" : isStale ? "bg-yellow-400" : "bg-green-400";
  const serverRefresh = () => api.post("/gold-price/refresh").then(() => refresh());

  if (compact) {
    return (
      <div className="flex items-center gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-pos-gray text-[10px] uppercase tracking-widest">24K</span>
          <span className="font-serif text-xl text-gold leading-none">
            {rate.rate_24k.toFixed(2)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-pos-gray text-[10px] uppercase tracking-widest">21K</span>
          <span className="text-base font-semibold text-pos-cream leading-none">
            {rate.rate_21k.toFixed(2)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-pos-gray text-[10px] uppercase tracking-widest">18K</span>
          <span className="text-base font-semibold text-pos-cream leading-none">
            {rate.rate_18k.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 ps-4 border-s border-white/10">
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          <span className={`text-[10px] uppercase tracking-wider ${feedDown ? "text-red-300" : "text-pos-gray"}`}>
            {statusLabel}
          </span>
          {feedDown ? (
            <>
              <span className="text-pos-gray text-[10px]">{asOf}</span>
              <RetryButton variant="dark" onRetry={() => refresh()} retrying={isValidating} className="ms-1" />
            </>
          ) : (
            isStale && (
              <button
                onClick={serverRefresh}
                className="ms-2 text-[10px] uppercase tracking-wider text-yellow-400 hover:text-yellow-300 underline"
              >
                Refresh
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedDown ? (
        <div
          role="alert"
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-300 text-xs"
        >
          <span>{t.errors.lastKnownRate} · {asOf}</span>
          <RetryButton variant="dark" onRetry={() => refresh()} retrying={isValidating} className="ms-auto" />
        </div>
      ) : (
        isStale && (
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/40 rounded px-3 py-2 text-yellow-400 text-xs">
            <span>Gold rate is older than 15 minutes</span>
            <button onClick={serverRefresh} className="ms-auto underline hover:no-underline">
              REFRESH
            </button>
          </div>
        )
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-pos-gray text-[10px] uppercase tracking-widest mb-2">
            24K · USD/g
          </div>
          <div className="font-serif text-3xl text-gold leading-none">
            {rate.rate_24k.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span className={`text-[10px] uppercase tracking-wider ${feedDown ? "text-red-300" : "text-pos-gray"}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-pos-gray text-[10px] uppercase tracking-widest mb-2">
            21K · USD/g
          </div>
          <div className="text-2xl font-semibold text-pos-cream leading-none">
            {rate.rate_21k.toFixed(2)}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-pos-gray text-[10px] uppercase tracking-widest mb-2">
            18K · USD/g
          </div>
          <div className="text-2xl font-semibold text-pos-cream leading-none">
            {rate.rate_18k.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
