"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import type { Category } from "@/types/api";
import { TableSkeleton } from "@/components/ui/skeleton";

export default function CategoriesPage() {
  const { data: categories, mutate } = useSWR<Category[]>(
    "/categories?include_inactive=true",
    apiFetcher,
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", slug: "" });
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm({ name_en: "", name_ar: "", slug: "" });
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name_en: cat.name_en, name_ar: cat.name_ar, slug: cat.slug });
    setShowForm(true);
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || autoSlug(form.name_en),
      };
      if (editing) {
        await api.patch(`/categories/${editing.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      await mutate();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cat: Category) {
    await api.patch(`/categories/${cat.id}`, { is_active: !cat.is_active });
    mutate();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="text-sm font-medium text-gray-700">{editing ? "Edit Category" : "New Category"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (English)</label>
              <input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value, slug: autoSlug(e.target.value) })}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Name (Arabic)</label>
              <input
                dir="rtl"
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold text-right"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-gold"
              placeholder="auto-generated from name"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name_en}
              className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {!categories ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Slug</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <TableSkeleton cols={4} />
              </tbody>
            </table>
          </div>
        ) : !categories?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No categories yet</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{cat.name_en}</div>
                    {cat.name_ar && <div className="text-xs text-gray-400 mt-0.5" dir="rtl">{cat.name_ar}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(cat)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {cat.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
