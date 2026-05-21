"use client";
import { useGoldRate } from "@/hooks/useGoldRate";
import { api } from "@/lib/api-client";

export function GoldRateCard({ compact = false }: { compact?: boolean }) {
  const { rate, refresh } = useGoldRate();

  if (!rate) {
    return (
      <div
        className={
          compact
            ? "h-10 w-64 animate-pulse bg-white/10 rounded"
            : "h-24 animate-pulse bg-white/10 rounded"
        }
      />
    );
  }

  const isStale = rate.is_stale;

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
        <div className="flex items-center gap-1.5 pl-4 border-l border-white/10">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isStale ? "bg-yellow-400" : "bg-green-400"
            }`}
          />
          <span className="text-pos-gray text-[10px] uppercase tracking-wider">
            {isStale ? "STALE" : "LIVE"}
          </span>
          {isStale && (
            <button
              onClick={() => api.post("/gold-price/refresh").then(() => refresh())}
              className="ml-2 text-[10px] uppercase tracking-wider text-yellow-400 hover:text-yellow-300 underline"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isStale && (
        <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/40 rounded px-3 py-2 text-yellow-400 text-xs">
          <span>Gold rate is older than 15 minutes</span>
          <button
            onClick={() => api.post("/gold-price/refresh").then(() => refresh())}
            className="ml-auto underline hover:no-underline"
          >
            REFRESH
          </button>
        </div>
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
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isStale ? "bg-yellow-400" : "bg-green-400"
              }`}
            />
            <span className="text-pos-gray text-[10px] uppercase tracking-wider">
              {isStale ? "STALE" : "LIVE"}
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
