"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import type { Supplier, SupplierListResponse } from "@/types/api";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (search) params.set("search", search);
  if (!includeInactive) params.set("is_active", "true");

  const { data, mutate } = useSWR<SupplierListResponse>(
    `/suppliers?${params}`,
    apiFetcher,
  );
  const [showForm, setShowForm] = useState(false);

  async function toggleActive(s: Supplier) {
    try {
      await api.patch(`/suppliers/${s.id}`, { is_active: !s.is_active });
      mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toggle failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Suppliers</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Supplier
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          placeholder="Search suppliers…"
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
          Include inactive
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
        {!data?.items.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No suppliers yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Terms</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Status</th>
                <th className="px-4 py-3" />
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
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{s.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleActive(s)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={s.is_active ? "Deactivate" : "Reactivate"}
                      >
                        {s.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <Link href={`/admin/suppliers/${s.id}`} className="text-gray-400 hover:text-gold transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SupplierForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void | Promise<void> }) {
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
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="text-sm font-medium text-gray-700">New Supplier</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Contact name" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="col-span-2" />
        <Field label="Payment terms" value={form.payment_terms} onChange={(v) => setForm({ ...form, payment_terms: v })} className="col-span-2" placeholder='e.g. "net 30, gold-for-gold preferred"' />
        <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} className="col-span-2" />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Create Supplier"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors">
          Cancel
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
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
      />
    </div>
  );
}
