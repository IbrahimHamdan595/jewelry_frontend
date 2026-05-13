"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react";
import { useGoldRate } from "@/hooks/useGoldRate";
import { apiFetcher, uploadFile } from "@/lib/api-client";
import { calculatePrice, formatUSD, KARAT_LABEL } from "@/lib/utils";
import type { Category, Product, Settings } from "@/types/api";

interface Photo {
  url: string;
  isHero: boolean;
  order: number;
}

interface FormValues {
  name_en: string;
  name_ar: string;
  category: string;
  category_id: string;
  karat: string;
  weight_grams: number;
  margin_percent: number;
  making_charge: number;
}

interface Props {
  initial?: Product;
  onSave: (data: FormValues & { photos: Photo[] }) => Promise<void>;
}

export function ProductForm({ initial, onSave }: Props) {
  const { rate } = useGoldRate();
  const { data: categories } = useSWR<Category[]>("/categories", apiFetcher);
  const { data: settings } = useSWR<Settings>("/settings", apiFetcher);

  const [photos, setPhotos] = useState<Photo[]>(
    initial?.photos?.map((p: any, i: number) => ({
      url: p.url,
      isHero: p.isHero ?? i === 0,
      order: p.order ?? i,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: initial
      ? {
          name_en: initial.name_en,
          name_ar: initial.name_ar,
          category: initial.category,
          category_id: initial.category_id ?? "",
          karat: initial.karat,
          weight_grams: Number(initial.weight_grams),
          margin_percent: Number(initial.margin_percent),
          making_charge: Number(initial.making_charge),
        }
      : { karat: "K21", margin_percent: 15, making_charge: 25, weight_grams: 0, category_id: "" },
  });

  const watched = useWatch({ control });

  const markupMap: Record<string, number> = {
    K18: Number(settings?.markup_k18 ?? 0),
    K21: Number(settings?.markup_k21 ?? 0),
    K24: Number(settings?.markup_k24 ?? 0),
  };

  const priced = rate && watched.karat && watched.weight_grams
    ? calculatePrice({
        rate24k: rate.rate_24k,
        karat: watched.karat,
        weightGrams: Number(watched.weight_grams),
        marginPercent: Number(watched.margin_percent ?? 0),
        makingCharge: Number(watched.making_charge ?? 0),
        karatMarkup: markupMap[watched.karat ?? ""] ?? 0,
      })
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError("");
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const { url } = await uploadFile<{ url: string }>("/products/upload-image", fd);
        setPhotos((prev) => [
          ...prev,
          { url, isHero: prev.length === 0, order: prev.length },
        ]);
      }
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setHero(url: string) {
    setPhotos((prev) => prev.map((p) => ({ ...p, isHero: p.url === url })));
  }

  function removePhoto(url: string) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.url !== url).map((p, i) => ({ ...p, order: i }));
      if (next.length && !next.some((p) => p.isHero)) next[0].isHero = true;
      return next;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (fileRef.current) {
      fileRef.current.files = dt.files;
      fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      <form
        onSubmit={handleSubmit((data) => onSave({ ...data, photos }))}
        className="col-span-3 space-y-5"
      >
        {initial && (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Item Code</label>
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2.5 text-sm font-mono text-gray-500">{initial.code}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (English)</label>
            <input {...register("name_en", { required: true })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (Arabic)</label>
            <input {...register("name_ar")} dir="rtl" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold text-right" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Category</label>
          {categories?.length ? (
            <select
              {...register("category_id")}
              onChange={(e) => {
                const cat = categories.find((c) => c.id === e.target.value);
                setValue("category_id", e.target.value);
                setValue("category", cat?.name_en ?? "");
              }}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold bg-white"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_en}</option>
              ))}
            </select>
          ) : (
            <input {...register("category", { required: true })} placeholder="Bracelets, Rings, Necklaces…" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
          )}
          <input type="hidden" {...register("category")} />
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">Karat</label>
          <div className="flex gap-2">
            {["K18", "K21", "K24"].map((k) => (
              <label key={k} className="flex-1">
                <input type="radio" value={k} {...register("karat")} className="sr-only" />
                <span className={`block text-center py-2.5 rounded border cursor-pointer text-sm font-medium transition-colors ${watched.karat === k ? "border-gold bg-gold-light text-gold-dark" : "border-gray-200 hover:border-gray-300"}`}>
                  {KARAT_LABEL[k]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Weight (g)</label>
            <input type="number" step="0.001" {...register("weight_grams", { valueAsNumber: true })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Margin %</label>
            <input type="number" step="0.01" {...register("margin_percent", { valueAsNumber: true })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Making (USD)</label>
            <input type="number" step="0.01" {...register("making_charge", { valueAsNumber: true })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">Product Images</label>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gold hover:bg-gold/5 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6 text-gray-300" />
            )}
            <span className="text-xs text-gray-400">
              {uploading ? "Uploading…" : "Click or drag images here"}
            </span>
            <span className="text-[10px] text-gray-300">JPG, PNG, WEBP — max 10 MB each</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {photos.map((p) => (
                <div key={p.url} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  {p.isHero && (
                    <div className="absolute top-1 left-1 bg-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" /> Hero
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!p.isHero && (
                      <button
                        type="button"
                        onClick={() => setHero(p.url)}
                        title="Set as hero"
                        className="bg-gold text-white rounded p-1"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p.url)}
                      title="Remove"
                      className="bg-red-500 text-white rounded p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting || uploading} className="bg-gold hover:bg-gold-dark text-white px-6 py-2.5 rounded text-sm font-medium disabled:opacity-60 transition-colors">
            {isSubmitting ? "Saving…" : "Save Product"}
          </button>
        </div>
      </form>

      {/* Live preview */}
      <div className="col-span-2">
        <div className="bg-admin-sidebar rounded-lg p-6 space-y-4 sticky top-0">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs uppercase tracking-widest">Live Preview</span>
            {watched.karat && <span className="bg-gold/20 text-gold text-[10px] font-bold tracking-wider px-2 py-0.5 rounded">{KARAT_LABEL[watched.karat]}</span>}
          </div>

          {/* Hero image preview */}
          {photos.find((p) => p.isHero) ? (
            <img
              src={photos.find((p) => p.isHero)!.url}
              alt="Hero"
              className="w-full aspect-square object-cover rounded-lg"
            />
          ) : (
            <div className="w-full aspect-square bg-white/5 rounded-lg flex items-center justify-center">
              <ImagePlus className="w-8 h-8 text-white/10" />
            </div>
          )}

          <div>
            <div className="text-white/60 text-sm">{watched.name_en || "Product name"}</div>
            {watched.name_ar && <div className="text-white/40 text-sm mt-0.5" dir="rtl">{watched.name_ar}</div>}
          </div>
          {priced && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-white/40">
                <span>24K market rate</span>
                <span>${rate?.rate_24k.toFixed(2)}/g</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Purity rate ({watched.karat ?? ""})</span>
                <span>${priced.purityRate.toFixed(2)}/g</span>
              </div>
              {(markupMap[watched.karat ?? ""] ?? 0) > 0 && (
                <div className="flex justify-between text-gold/60">
                  <span>Markup</span>
                  <span>+${(markupMap[watched.karat ?? ""] ?? 0).toFixed(2)}/g</span>
                </div>
              )}
              {(markupMap[watched.karat ?? ""] ?? 0) > 0 && (
                <div className="flex justify-between text-white/60">
                  <span>Effective rate</span>
                  <span>${priced.effectiveRate.toFixed(2)}/g</span>
                </div>
              )}
              <div className="flex justify-between text-white/40">
                <span>Metal value</span>
                <span>{formatUSD(priced.metalValue)}</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Margin {watched.margin_percent}%</span>
                <span>+{formatUSD(priced.marginAmount)}</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Making charge</span>
                <span>+{formatUSD(Number(watched.making_charge ?? 0))}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-gold font-serif text-lg font-bold">
                <span>Retail Price</span>
                <span>{formatUSD(priced.finalPrice)}</span>
              </div>
            </div>
          )}
          {!priced && <div className="text-white/20 text-xs">Enter weight and rates to see price</div>}
        </div>
      </div>
    </div>
  );
}
