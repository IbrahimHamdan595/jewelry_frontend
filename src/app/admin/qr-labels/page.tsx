"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import JsBarcode from "jsbarcode";
import { apiFetcher } from "@/lib/api-client";
import { KaratBadge } from "@/components/shared/KaratBadge";
import type { ProductListResponse, Product } from "@/types/api";

function generateBarcode(code: string): string {
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, code, {
      format: "CODE128",
      width: 2,
      height: 80,
      displayValue: false,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export default function QRLabelsPage() {
  const { data } = useSWR<ProductListResponse>(
    "/products?status=active&page_size=100",
    apiFetcher
  );
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Product | null>(null);
  const [previewBarcode, setPreviewBarcode] = useState("");
  const [barcodeCache, setBarcodeCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (preview?.code) {
      setPreviewBarcode(generateBarcode(preview.code));
    }
  }, [preview]);

  // Pre-generate barcodes for every selected product so they exist in the DOM at print time.
  useEffect(() => {
    if (!data?.items) return;
    setBarcodeCache((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(selected)) {
        const product = data.items.find((p) => p.id === id);
        if (!product) continue;
        if (!next[product.code]) {
          next[product.code] = generateBarcode(product.code);
        }
      }
      return next;
    });
  }, [selected, data]);

  function toggle(product: Product) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = 1;
      return next;
    });
    setPreview(product);
  }

  const totalLabels = Object.values(selected).reduce((s, n) => s + n, 0);
  const allSelected =
    !!data?.items.length && data.items.every((p) => selected[p.id]);

  function toggleSelectAll() {
    if (!data?.items) return;
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, number> = {};
      for (const p of data.items) next[p.id] = selected[p.id] ?? 1;
      setSelected(next);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Build flat list of labels to print (one entry per copy).
  const labelsToPrint: Product[] = [];
  for (const [id, qty] of Object.entries(selected)) {
    const product = data?.items.find((p) => p.id === id);
    if (!product) continue;
    for (let i = 0; i < qty; i++) labelsToPrint.push(product);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: 80mm 40mm;
          margin: 0;
        }
        @media print {
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          #print-sheet, #print-sheet * {
            visibility: visible !important;
          }
          #print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-label {
            width: 80mm;
            height: 40mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            padding: 2mm 3mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1mm;
            overflow: hidden;
          }
          .print-label:last-child {
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="flex gap-6 h-[calc(100vh-10rem)] print:hidden">
        {/* Left: product list */}
        <div className="flex-1 bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Select Products</span>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="accent-gold"
              />
              Select all{data?.items.length ? ` (${data.items.length})` : ""}
            </label>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {data?.items.map((p) => (
              <div
                key={p.id}
                onClick={() => toggle(p)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!selected[p.id]}
                  readOnly
                  className="accent-gold"
                />
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
                    <button
                      onClick={() =>
                        setSelected((prev) => ({
                          ...prev,
                          [p.id]: Math.max(1, (prev[p.id] ?? 1) - 1),
                        }))
                      }
                      className="w-6 h-6 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{selected[p.id]}</span>
                    <button
                      onClick={() =>
                        setSelected((prev) => ({
                          ...prev,
                          [p.id]: (prev[p.id] ?? 1) + 1,
                        }))
                      }
                      className="w-6 h-6 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {totalLabels} label{totalLabels !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handlePrint}
              disabled={totalLabels === 0}
              className="px-4 py-2 bg-gold text-white text-xs rounded hover:bg-gold-dark disabled:opacity-40 transition-colors"
            >
              Print Labels
            </button>
          </div>
        </div>

        {/* Right: preview */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white border border-gray-100 rounded-lg p-5 text-center space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-widest">
              Label Preview (80×40mm)
            </div>
            {preview ? (
              <div
                className="border border-dashed border-gray-300 rounded mx-auto flex flex-col items-center justify-center gap-1 p-2"
                style={{ width: "75mm", height: "37mm" }}
              >
                {previewBarcode && (
                  <img
                    src={previewBarcode}
                    alt={preview.code}
                    style={{ width: "70mm", height: "16mm", objectFit: "fill" }}
                  />
                )}
                <div className="text-[10px] font-bold font-mono leading-tight tracking-wider">
                  {preview.code}
                </div>
                <div className="text-[9px] text-gray-700 leading-tight line-clamp-1">
                  {preview.name_en}
                </div>
                <div className="text-[9px] text-gray-500">
                  {preview.weight_grams}g · {preview.karat}
                </div>
              </div>
            ) : (
              <div className="text-gray-300 text-sm">Select a product</div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 leading-relaxed">
            <strong className="block mb-1">Format: CODE128 (1D)</strong>
            Compatible with any standard 1D barcode scanner. The cashier scans the bars; the product code below is a fallback for manual entry.
          </div>
        </div>
      </div>

      {/* Hidden print-only sheet — visible only when printing */}
      <div id="print-sheet" className="hidden print:block">
        {labelsToPrint.map((p, i) => (
          <div key={`${p.id}-${i}`} className="print-label">
            {barcodeCache[p.code] && (
              <img
                src={barcodeCache[p.code]}
                alt={p.code}
                style={{ width: "72mm", height: "18mm", objectFit: "fill" }}
              />
            )}
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "10pt",
                fontWeight: 700,
                letterSpacing: "1px",
                lineHeight: 1,
              }}
            >
              {p.code}
            </div>
            <div
              style={{
                fontSize: "8pt",
                lineHeight: 1.1,
                color: "#111",
                textAlign: "center",
                maxWidth: "74mm",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {p.name_en}
            </div>
            <div style={{ fontSize: "7.5pt", color: "#555" }}>
              {p.weight_grams}g · {p.karat}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
