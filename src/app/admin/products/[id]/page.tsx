"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { Flame, Recycle, AlertCircle } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import { ProductForm } from "@/components/admin/ProductForm";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import type { Karat, Product, ProductStatus } from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, mutate } = useSWR<Product>(`/products/${id}`, apiFetcher);
  const [melting, setMelting] = useState(false);

  async function handleSave(data: any) {
    await api.patch(`/products/${id}`, data);
    router.push("/admin/products");
  }

  if (!product)
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <SkeletonText lines={10} />
          </div>
          <div className="col-span-2 space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );

  const meltable =
    product.status === "AVAILABLE" || product.status === "INACTIVE";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          {product.is_used ? "Used Product" : "Product"} — {product.code}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <StatusPill status={product.status} />
          {product.is_used && (
            <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700">Used</span>
          )}
          {product.cost_basis_usd != null && (
            <span className="text-xs text-gray-500">
              Cost basis: <span className="font-mono">{formatUSD(product.cost_basis_usd)}</span>
            </span>
          )}
          {product.source_ref_type && (
            <span className="text-xs text-gray-400 font-mono">
              from {product.source_ref_type}:{(product.source_ref_id ?? "").slice(0, 8)}…
            </span>
          )}
        </div>
      </div>

      {/* Melt action */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Recycle className="w-4 h-4 text-gray-500" />
            Melt this piece into a pure-gold lot
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Reduces the piece to {product.karat} weight {Number(product.weight_grams).toFixed(3)}g and creates a new lot.
            {!meltable && (
              <span className="text-amber-600 ml-2 inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Only AVAILABLE or INACTIVE products can be melted (status: {product.status}).
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setMelting(true)}
          disabled={!meltable}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Flame className="w-4 h-4" />
          Melt
        </button>
      </div>

      <ProductForm initial={product} onSave={handleSave} />

      {melting && (
        <MeltProductDialog
          product={product}
          onClose={() => setMelting(false)}
          onDone={async () => {
            setMelting(false);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ProductStatus }) {
  const map: Record<ProductStatus, string> = {
    AVAILABLE: "bg-green-50 text-green-700",
    SOLD: "bg-blue-50 text-blue-700",
    MELTED: "bg-amber-50 text-amber-800",
    RESERVED: "bg-indigo-50 text-indigo-700",
    INACTIVE: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function MeltProductDialog({
  product, onClose, onDone,
}: {
  product: Product;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
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
        product_id: product.id,
        override_weight_grams: overrideWeight || null,
        override_karat: overrideKarat || null,
        notes: notes || null,
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Melt failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            Melt {product.code}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Current: {product.karat} · {Number(product.weight_grams).toFixed(3)}g.
            Product status will flip to <span className="font-mono">MELTED</span>; a new lot is created.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Override weight (g)</label>
            <input
              type="number"
              step="0.001"
              value={overrideWeight}
              onChange={(e) => setOverrideWeight(e.target.value)}
              placeholder={`(keep ${Number(product.weight_grams).toFixed(3)})`}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Override karat</label>
            <select
              value={overrideKarat}
              onChange={(e) => setOverrideKarat(e.target.value as Karat | "")}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">(keep {product.karat})</option>
              {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded disabled:opacity-60"
          >
            <Flame className="w-4 h-4" />
            {saving ? "Melting…" : "Confirm melt"}
          </button>
        </div>
      </div>
    </div>
  );
}
