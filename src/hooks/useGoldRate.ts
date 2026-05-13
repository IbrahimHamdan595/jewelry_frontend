"use client";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import type { GoldRate } from "@/types/api";

export function useGoldRate() {
  const { data, mutate, error } = useSWR<GoldRate>("/gold-price", apiFetcher, {
    refreshInterval: 30000,
  });
  return { rate: data, refresh: mutate, error };
}
