"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Edit2, Trash2, QrCode, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD, KARAT_LABEL } from "@/lib/utils";
import { useGoldRate } from "@/hooks/useGoldRate";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { calculatePrice } from "@/lib/utils";
import type { ProductListResponse } from "@/types/api";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [karat, setKarat] = useState("");
  const [page, setPage] = useState(1);
  const { rate } = useGoldRate();

  const params = new URLSearchParams({ search, karat, page: String(page) });
  const { data, mutate } = useSWR<ProductListResponse>(`/products?${params}`, apiFetcher);

  async function toggleStatus(id: string) {
    await api.patch(`/products/${id}/status`);
    mutate();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Products</h2>
        <Link href="/admin/products/new" className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or code…"
          className="flex-1 max-w-xs border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
        />
        <div className="flex gap-1">
          {["", "K18", "K21", "K22", "K24"].map((k) => (
            <button
              key={k}
              onClick={() => { setKarat(k); setPage(1); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${karat === k ? "bg-gold text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {k || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Code", "Name", "Category", "Karat", "Weight", "Live Price", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>
            ))}
            {data?.items.map((p) => {
              const priced = rate ? calculatePrice({ rate24k: rate.rate_24k, karat: p.karat, weightGrams: Number(p.weight_grams), marginPercent: Number(p.margin_percent), makingCharge: Number(p.making_charge) }) : null;
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{p.name_en}</span>
                      {p.is_used && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">USED</span>
                      )}
                      {p.status !== "AVAILABLE" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          p.status === "SOLD" ? "bg-blue-50 text-blue-700" :
                          p.status === "MELTED" ? "bg-amber-50 text-amber-800" :
                          p.status === "RESERVED" ? "bg-indigo-50 text-indigo-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{p.status}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.category}</td>
                  <td className="px-4 py-3"><KaratBadge karat={p.karat} /></td>
                  <td className="px-4 py-3 text-gray-600">{p.weight_grams}g</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{priced ? formatUSD(priced.finalPrice) : "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(p.id)} className="text-gray-400 hover:text-gold transition-colors">
                      {p.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/${p.id}`} className="text-gray-400 hover:text-gold transition-colors"><Edit2 className="w-4 h-4" /></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Showing {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} of {data.total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Prev</button>
              <button disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
