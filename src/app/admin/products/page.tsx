"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Image as ImageIcon } from "lucide-react";
import { apiFetcher, api, errorMessage } from "@/lib/api-client";
import { ErrorRow } from "@/components/ui/error-state";
import { formatUSD } from "@/lib/utils";
import { useGoldRate } from "@/hooks/useGoldRate";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { calculatePrice, cn, toFiniteNumber } from "@/lib/utils";
import type { ProductListResponse, Category, Product } from "@/types/api";
import { UnitCatalog } from "@/components/admin/UnitCatalog";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { useLang } from "@/context/LanguageContext";

type Tab = "products" | "coins" | "ounces";

// Inner component that reads search params (must be inside Suspense)
function ProductsPageInner() {
  const { t } = useLang();
  const TABS: { key: Tab; label: string }[] = [
    { key: "products", label: t.nav.products },
    { key: "coins", label: t.dashboard.coins },
    { key: "ounces", label: t.dashboard.ounces },
  ];
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (searchParams.get("tab") as Tab) ?? "products";

  function setTab(tab: Tab) {
    router.replace(`${pathname}?tab=${tab}`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t.nav.products}</h2>
        {activeTab === "products" && (
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> {t.products.addProduct}
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "py-3 text-sm border-b-2 transition-colors",
                activeTab === key
                  ? "border-gold text-gold font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "coins" && (
        <UnitCatalog
          resource="coins"
          adjustmentTarget="COIN_STOCK"
        />
      )}
      {activeTab === "ounces" && (
        <UnitCatalog
          resource="ounces"
          adjustmentTarget="OUNCE_STOCK"
        />
      )}
    </div>
  );
}

// Products tab extracted so its own state is self-contained
function ProductsTab() {
  const { t } = useLang();
  const pr = t.products;
  const [search, setSearch] = useState("");
  const [karat, setKarat] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const { rate } = useGoldRate();
  // A decimal string or a number (NEX-54), read once; unreadable means no live price.
  const rate24k = toFiniteNumber(rate?.rate_24k);

  const [deleting, setDeleting] = useState<Product | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const { data: categories } = useSWR<Category[]>("/categories", apiFetcher);

  const params = new URLSearchParams({ search, karat, page: String(page) });
  if (categoryId) params.set("category_id", categoryId);
  const { data, error, isValidating, mutate } = useSWR<ProductListResponse>(`/products?${params}`, apiFetcher);

  async function toggleStatus(id: string) {
    await api.patch(`/products/${id}/status`);
    mutate();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDelBusy(true);
    setDelErr(null);
    try {
      await api.delete(`/products/${deleting.id}?hard=true`);
      setDeleting(null);
      mutate();
    } catch (err) {
      setDelErr(errorMessage(err, pr.deleteFailed));
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={pr.searchPlaceholder}
          aria-label={pr.searchPlaceholder}
          className="w-full sm:w-auto sm:flex-1 sm:max-w-xs border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
        />
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          aria-label={pr.category}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
        >
          <option value="">{pr.allCategories}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name_en}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {["", "K18", "K21", "K22", "K24"].map((k) => (
            <button
              key={k}
              onClick={() => { setKarat(k); setPage(1); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${karat === k ? "bg-gold text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {k || t.orders.filterAll}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[pr.colImage, t.accounting.common.code, t.common.name, pr.category, pr.karat, pr.colWeight, pr.colStock, pr.colLivePrice, t.common.status, t.common.actions].map((h) => (
                  <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error && !data && <ErrorRow cols={10} error={error} onRetry={() => mutate()} retrying={isValidating} />}
              {!error && !data && <TableSkeleton cols={10} />}
              {data?.items.map((p) => {
                const heroUrl = p.photos?.find(x => x.isHero)?.url ?? p.photos?.[0]?.url;
                const priced = rate24k !== null ? calculatePrice({ rate24k, karat: p.karat, weightGrams: Number(p.weight_grams), marginPercent: Number(p.margin_percent), makingCharge: Number(p.making_charge) }) : null;
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {heroUrl ? (
                        <img
                          src={heroUrl}
                          loading="lazy"
                          className="w-10 h-10 rounded object-cover border border-gray-100"
                          alt={p.name_en}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{p.name_en}</span>
                        {p.is_used && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">{pr.usedBadge}</span>
                        )}
                        {p.stone_value_usd != null && p.stone_value_usd > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">💎 {pr.stones}</span>
                        )}
                        {p.status !== "AVAILABLE" && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            p.status === "SOLD" ? "bg-blue-50 text-blue-700" :
                            p.status === "MELTED" ? "bg-amber-50 text-amber-800" :
                            p.status === "RESERVED" ? "bg-indigo-50 text-indigo-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>{pr.status[p.status] ?? p.status}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.category}</td>
                    <td className="px-4 py-3"><KaratBadge karat={p.karat} /></td>
                    <td className="px-4 py-3 text-gray-600">{p.weight_grams}{t.dashboard.grams}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${
                        p.on_hand_qty === 0 ? "text-red-600" :
                        p.min_stock_qty != null && p.on_hand_qty <= p.min_stock_qty ? "text-amber-600" :
                        "text-gray-700"
                      }`}>
                        {p.on_hand_qty}
                      </span>
                      {p.min_stock_qty != null && p.on_hand_qty <= p.min_stock_qty && p.on_hand_qty > 0 && (
                        <span className="ms-1 text-[10px] text-amber-600">{pr.lowStock}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{priced ? formatUSD(priced.finalPrice) : "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(p.id)}
                        aria-label={p.is_active ? pr.deactivate : pr.activate}
                        className="text-gray-400 hover:text-gold transition-colors"
                      >
                        {p.is_active ? <ToggleRight className="w-5 h-5 text-green-500" aria-hidden /> : <ToggleLeft className="w-5 h-5" aria-hidden />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/products/${p.id}`} aria-label={t.common.edit} className="text-gray-400 hover:text-gold transition-colors"><Edit2 className="w-4 h-4" aria-hidden /></Link>
                        <button
                          onClick={() => { setDelErr(null); setDeleting(p); }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title={t.deleteDialog.confirm}
                          aria-label={t.deleteDialog.confirm}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{t.orders.showing((page - 1) * data.page_size + 1, Math.min(page * data.page_size, data.total), data.total)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">{t.orders.prev}</button>
              <button disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">{t.common.next}</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleting}
        title={deleting ? `${deleting.name_en} (${deleting.code})` : ""}
        busy={delBusy}
        error={delErr}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleting(null); setDelErr(null); }}
      />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}
