"use client";
import { Ltr } from "@/components/shared/Ltr";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { Supplier, SupplierListResponse } from "@/types/api";

export default function SuppliersPage() {
  const { t } = useLang();
  const su = t.suppliers;
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (search) params.set("search", search);
  if (!includeInactive) params.set("is_active", "true");

  const { data, error: loadError, isValidating, mutate } = useSWR<SupplierListResponse>(
    `/suppliers?${params}`,
    apiFetcher,
  );
  const [showForm, setShowForm] = useState(false);

  async function toggleActive(s: Supplier) {
    try {
      await api.patch(`/suppliers/${s.id}`, { is_active: !s.is_active });
      mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : su.toggleFailed);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-800">{su.title}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {su.newSupplier}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          aria-label={su.searchPlaceholder}
          placeholder={su.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>{su.includeInactive}</span>
        </label>
      </div>

      {showForm && (
        <SupplierForm
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await mutate();
          }}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {loadError && !data ? (
          <ErrorState className="m-4" error={loadError} onRetry={() => mutate()} retrying={isValidating} />
        ) : !data ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.name}</th>
                  <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.contact}</th>
                  <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.phone}</th>
                  <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.terms}</th>
                  <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.status}</th>
                  <th className="px-4 py-3"><span className="sr-only">{t.common.actions}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <TableSkeleton cols={6} />
              </tbody>
            </table>
          </div>
        ) : !data.items.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">{su.empty}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.name}</th>
                <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.contact}</th>
                <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.phone}</th>
                <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{su.terms}</th>
                <th className="text-start px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">{t.common.status}</th>
                <th className="px-4 py-3"><span className="sr-only">{t.common.actions}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-gray-800 hover:text-gold">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.contact_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.phone ? <Ltr>{s.phone}</Ltr> : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{s.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_active ? su.active : su.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleActive(s)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={s.is_active ? su.deactivate : su.reactivate}
                        aria-label={s.is_active ? su.deactivate : su.reactivate}
                      >
                        {s.is_active ? <ToggleRight className="w-5 h-5 text-green-500" aria-hidden /> : <ToggleLeft className="w-5 h-5" aria-hidden />}
                      </button>
                      <Link
                        href={`/admin/suppliers/${s.id}`}
                        aria-label={su.openSupplier(s.name)}
                        className="text-gray-400 hover:text-gold transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                      </Link>
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

function SupplierForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void | Promise<void> }) {
  const { t } = useLang();
  const su = t.suppliers;
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "",
    default_currency: "USD",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/suppliers", form);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : su.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="text-sm font-medium text-gray-700">{su.newSupplier}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.common.name} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label={su.contactName} value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
        <Field label={su.phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label={su.email} value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label={su.address} value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="col-span-2" />
        <Field label={su.paymentTerms} value={form.payment_terms} onChange={(v) => setForm({ ...form, payment_terms: v })} className="col-span-2" placeholder={su.paymentTermsPlaceholder} />
        <Field label={su.notes} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} className="col-span-2" />
      </div>
      {error && <div role="alert" className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
        >
          {saving ? su.saving : su.createSupplier}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors">
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, className = "", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  // The input sits inside its <label>: a click on the text focuses the field
  // and a screen reader announces it by name, with no ids to keep in sync.
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
      />
    </label>
  );
}
