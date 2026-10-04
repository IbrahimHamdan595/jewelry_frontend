"use client";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { api } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";

export default function NewProductPage() {
  const router = useRouter();
  const { t } = useLang();

  async function handleSave(data: any) {
    await api.post("/products", data);
    router.push("/admin/products");
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">{t.products.newProduct}</h2>
      <ProductForm onSave={handleSave} />
    </div>
  );
}
