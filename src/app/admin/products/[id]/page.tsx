"use client";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/types/api";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product } = useSWR<Product>(`/products/${id}`, apiFetcher);

  async function handleSave(data: any) {
    await api.patch(`/products/${id}`, data);
    router.push("/admin/products");
  }

  if (!product) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Edit Product — {product.code}</h2>
      <ProductForm initial={product} onSave={handleSave} />
    </div>
  );
}
