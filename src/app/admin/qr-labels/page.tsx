"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import QRCode from "qrcode";
import { apiFetcher } from "@/lib/api-client";
import { KaratBadge } from "@/components/shared/KaratBadge";
import type { ProductListResponse, Product } from "@/types/api";

export default function QRLabelsPage() {
  const { data } = useSWR<ProductListResponse>("/products?status=active&page_size=100", apiFetcher);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Product | null>(null);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (preview?.code) {
      QRCode.toDataURL(preview.code, { width: 120, margin: 1 }).then(setQrUrl);
    }
  }, [preview]);

  function toggle(product: Product) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[product.id]) { delete next[product.id]; }
      else { next[product.id] = 1; }
      return next;
    });
    setPreview(product);
  }

  const totalLabels = Object.values(selected).reduce((s, n) => s + n, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Left: product list */}
      <div className="flex-1 bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 text-sm font-semibold text-gray-700">Select Products</div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {data?.items.map((p) => (
            <div key={p.id} onClick={() => { toggle(p); }} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors">
              <input type="checkbox" checked={!!selected[p.id]} readOnly className="accent-gold" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{p.name_en}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-gray-400">{p.code}</span>
                  <KaratBadge karat={p.karat} />
                  <span className="text-xs text-gray-400">{p.weight_grams}g</span>
                </div>
              </div>
              {selected[p.id] && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setSelected((prev) => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1) }))} className="w-6 h-6 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs">−</button>
                  <span className="w-6 text-center text-sm">{selected[p.id]}</span>
                  <button onClick={() => setSelected((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 1) + 1 }))} className="w-6 h-6 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs">+</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">{totalLabels} label{totalLabels !== 1 ? "s" : ""} selected</span>
          <button onClick={handlePrint} disabled={totalLabels === 0} className="px-4 py-2 bg-gold text-white text-xs rounded hover:bg-gold-dark disabled:opacity-40 transition-colors">Print Labels</button>
        </div>
      </div>

      {/* Right: preview */}
      <div className="w-72 flex flex-col gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-5 text-center space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-widest">Label Preview (80×40mm)</div>
          {preview ? (
            <div className="border border-dashed border-gray-300 rounded p-4 space-y-2" style={{ width: "calc(80mm * 0.75)", height: "calc(40mm * 0.75)", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              {qrUrl && <img src={qrUrl} alt="QR" className="w-16 h-16" />}
              <div className="text-[9px] font-bold font-mono">{preview.code}</div>
              <div className="text-[8px] text-gray-600 text-center leading-tight">{preview.name_en}</div>
              <div className="text-[8px] text-gray-500">{preview.weight_grams}g · {preview.karat}</div>
            </div>
          ) : (
            <div className="text-gray-300 text-sm">Select a product</div>
          )}
        </div>
      </div>
    </div>
  );
}
