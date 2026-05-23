// Mirrors the FastAPI response schemas in app/schemas/zakat.py.
// Decimals come over as strings; the UI formats them at render time.

export type KaratCode = "K18" | "K21" | "K22" | "K24";
export type ZakatSource = "products" | "coins" | "ounces" | "lots";

export interface KaratBucket {
  karat: KaratCode;
  grams_by_source: Record<ZakatSource, string>;
  total_weight_grams: string;
  au_grams: string;
}

export interface ZakatHoldings {
  by_karat: KaratBucket[];
  total_au_grams: string;
}

export interface ZakatSummary {
  holdings: ZakatHoldings;
  gold_rate_24k: string;
  gold_rate_source: string;
  gold_rate_is_stale: boolean;
  gold_rate_fetched_at: string;
  nisab_grams: string;
  meets_nisab: boolean;
  total_au_value_usd: string;
  zakat_au_grams: string;
  zakat_value_usd: string;
}

export interface ZakatSnapshot {
  id: string;
  taken_at: string;
  assessment_date: string;
  taken_by_user_id: string;
  notes: string | null;
  gold_rate_24k_usd_per_gram: string;
  gold_rate_source: string;
  nisab_grams_used: string;
  total_au_grams: string;
  total_au_value_usd: string;
  zakat_au_grams: string;
  zakat_value_usd: string;
  meets_nisab: boolean;
  breakdown_by_karat: Record<string, Record<string, string>>;
  integrity_hash: string;
  integrity_ok: boolean;
}

export interface ZakatSnapshotList {
  items: ZakatSnapshot[];
  total: number;
}
