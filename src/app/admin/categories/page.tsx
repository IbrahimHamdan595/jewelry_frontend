"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import type { Category } from "@/types/api";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { useLang } from "@/context/LanguageContext";

export default function CategoriesPage() {
  const { t } = useLang();
  const c = t.categories;
  const { data: categories, error: loadError, isValidating, mutate } = useSWR<Category[]>(
    "/categories?include_inactive=true",
    apiFetcher,
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", slug: "" });
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

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

  async function confirmDelete() {
    if (!deleting) return;
    setDelBusy(true);
    setDelErr(null);
    try {
      await api.delete(`/categories/${deleting.id}?hard=true`);
      setDeleting(null);
      await mutate();
    } catch (err) {
      setDelErr(err instanceof Error ? err.message : c.deleteFailed);
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{c.title}</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {c.addCategory}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="text-sm font-medium text-gray-700">{editing ? c.editCategory : c.newCategory}</div>
          {/* Every input sits inside its <label> (NEX-64): a click focuses the field
              and a screen reader names it, with no ids to keep in sync. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{t.common.nameEn}</span>
              <input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value, slug: autoSlug(e.target.value) })}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{t.common.nameAr}</span>
              <input
                dir="rtl"
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold text-right"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{c.slug}</span>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-gold"
              placeholder={c.slugPlaceholder}
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name_en}
              className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
            >
              {saving ? c.saving : t.common.save}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {loadError && !categories ? (
          <ErrorState className="m-4" error={loadError} onRetry={() => mutate()} retrying={isValidating} />
        ) : !categories ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.name}</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{c.slug}</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.status}</th>
                  <th className="px-4 py-3" aria-label={t.common.actions} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <TableSkeleton cols={4} />
              </tbody>
            </table>
          </div>
        ) : !categories?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">{c.empty}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.name}</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{c.slug}</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.status}</th>
                <th className="px-4 py-3" aria-label={t.common.actions} />
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
                      {cat.is_active ? c.active : c.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cat)} aria-label={t.common.edit} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Pencil className="w-4 h-4" aria-hidden />
                      </button>
                      <button onClick={() => handleToggle(cat)} aria-label={cat.is_active ? c.deactivate : c.activate} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {cat.is_active ? <ToggleRight className="w-5 h-5 text-green-500" aria-hidden /> : <ToggleLeft className="w-5 h-5" aria-hidden />}
                      </button>
                      <button
                        onClick={() => { setDelErr(null); setDeleting(cat); }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title={c.deletePermanently}
                        aria-label={c.deletePermanently}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
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

      <ConfirmDeleteDialog
        open={!!deleting}
        title={deleting ? deleting.name_en : ""}
        busy={delBusy}
        error={delErr}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleting(null); setDelErr(null); }}
      />
    </div>
  );
}
