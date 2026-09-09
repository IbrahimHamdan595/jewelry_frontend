"use client";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import type { GoldRate } from "@/types/api";

/**
 * The live gold rate, polled every 30s.
 *
 * On a failed poll SWR keeps the last successful `data`, so `rate` stays
 * defined while `error` is set — that pair is the "feed down, showing the
 * last known rate" state. `rate` is only undefined before the first success.
 */
export function useGoldRate() {
  const { data, mutate, error, isLoading, isValidating } = useSWR<GoldRate>("/gold-price", apiFetcher, {
    refreshInterval: 30000,
  });
  return { rate: data, refresh: mutate, error, isLoading, isValidating };
}
