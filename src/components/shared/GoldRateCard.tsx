"use client";
import { useGoldRate } from "@/hooks/useGoldRate";
import { api } from "@/lib/api-client";

export function GoldRateCard({ compact = false }: { compact?: boolean }) {
  const { rate, refresh } = useGoldRate();

  if (!rate) return <div className="animate-pulse h-16 bg-white/10 rounded" />;

  const isStale = rate.is_stale;

  return (
    <div className="space-y-2">
      {isStale && (
        <div className="flex items-center gap-2 bg-yellow-900/40 border border-yellow-600/40 rounded px-3 py-2 text-yellow-400 text-xs">
          <span>Gold rate is older than 15 minutes</span>
          <button
            onClick={() => api.post("/gold-price/refresh").then(() => refresh())}
            className="ml-auto underline hover:no-underline"
          >
            REFRESH
          </button>
        </div>
      )}
      <div className={compact ? "flex items-center gap-4" : "grid grid-cols-3 gap-4"}>
        <div>
          <div className="text-pos-gray text-xs uppercase tracking-widest mb-1">24K USD/g</div>
          <div className="font-serif text-rate-hero text-gold leading-none">{rate.rate_24k.toFixed(2)}</div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-yellow-400" : "bg-green-400"}`} />
            <span className="text-pos-gray text-[10px] uppercase tracking-wider">{isStale ? "STALE" : "LIVE"}</span>
          </div>
        </div>
        <div>
          <div className="text-pos-gray text-xs uppercase tracking-widest mb-1">21K USD/g</div>
          <div className="text-2xl font-semibold text-pos-cream">{rate.rate_21k.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-pos-gray text-xs uppercase tracking-widest mb-1">18K USD/g</div>
          <div className="text-2xl font-semibold text-pos-cream">{rate.rate_18k.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
