"use client";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { api } from "@/lib/api-client";

export default function NewProductPage() {
  const router = useRouter();

  async function handleSave(data: any) {
    await api.post("/products", data);
    router.push("/admin/products");
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">New Product</h2>
      <ProductForm onSave={handleSave} />
    </div>
  );
}
