"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import type { Settings, Staff } from "@/types/api";

export default function SettingsPage() {
  const { data: settings, mutate } = useSWR<Settings>("/settings", apiFetcher);
  const { data: staff, mutate: mutateStaff } = useSWR<Staff[]>("/staff", apiFetcher);
  const [tab, setTab] = useState<"store" | "pricing" | "receipt" | "staff" | "security">("store");
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/settings", form);
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStaff() {
    await api.post("/staff", newStaff);
    mutateStaff();
    setNewStaff({ name: "", email: "", password: "" });
    setShowAdd(false);
  }

  async function handleChangePassword() {
    setPwError("");
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError("New passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ current_password: "", new_password: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e.message ?? "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  }

  const tabs = [
    { id: "store" as const, label: "Store Info" },
    { id: "pricing" as const, label: "Default Pricing" },
    { id: "receipt" as const, label: "Receipt" },
    { id: "staff" as const, label: "Staff" },
    { id: "security" as const, label: "Security" },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        {tab !== "staff" && tab !== "security" && (
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${tab === t.id ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 space-y-5">
        {tab === "store" && (
          <>
            {(["store_name", "address", "phone", "vat_number"] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{f.replace(/_/g, " ")}</label>
                <input value={(form as any)[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>
            ))}
          </>
        )}

        {tab === "pricing" && (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
              Existing products are not affected. Editing a product overrides these defaults.
            </div>
            {(["default_margin_pct", "default_making_charge", "vat_percent", "lbp_exchange_rate"] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{f.replace(/_/g, " ")}</label>
                <input type="number" step="0.01" value={(form as any)[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>
            ))}

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-widest">Buyback Pricing</div>
              <p className="text-xs text-gray-400">Default spread the shop applies when buying gold back from customers. Per-transaction override is available on the buyback POS form.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Margin Mode</label>
                  <select
                    value={form.default_buyback_margin_mode ?? "USD_PER_GRAM"}
                    onChange={(e) => setForm({ ...form, default_buyback_margin_mode: e.target.value as "USD_PER_GRAM" | "PERCENT" })}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold bg-white"
                  >
                    <option value="USD_PER_GRAM">USD per gram</option>
                    <option value="PERCENT">Percent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Margin Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(form.default_buyback_margin_value as any) ?? ""}
                    onChange={(e) => setForm({ ...form, default_buyback_margin_value: e.target.value })}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Max Drift %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(form.buyback_rate_drift_pct_max as any) ?? ""}
                    onChange={(e) => setForm({ ...form, buyback_rate_drift_pct_max: e.target.value })}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-widest">Per-Karat Gold Markup (USD / gram)</div>
              <p className="text-xs text-gray-400">Added to the karat purity rate before calculating metal value. Example: K21 markup = $5 means the K21 rate used in pricing is (market × 87.5%) + $5/g.</p>
              <div className="grid grid-cols-3 gap-3">
                {(["markup_k18", "markup_k21", "markup_k24"] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                      {f === "markup_k18" ? "18K" : f === "markup_k21" ? "21K" : "24K"} Markup
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 inset-y-0 flex items-center text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(form as any)[f] ?? "0"}
                        onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                        className="w-full border border-gray-200 rounded pl-6 pr-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "receipt" && (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Footer Message</label>
            <textarea rows={3} value={form.receipt_footer ?? ""} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none" />
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-800">Change Password</div>
            {pwSuccess && <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded p-3">Password changed successfully.</div>}
            {pwError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">{pwError}</div>}
            {(["current_password", "new_password", "confirm"] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">
                  {f === "current_password" ? "Current Password" : f === "new_password" ? "New Password" : "Confirm New Password"}
                </label>
                <input
                  type="password"
                  value={pwForm[f]}
                  onChange={(e) => setPwForm({ ...pwForm, [f]: e.target.value })}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                  placeholder="••••••••"
                />
              </div>
            ))}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !pwForm.current_password || !pwForm.new_password || !pwForm.confirm}
              className="px-5 py-2.5 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60 transition-colors"
            >
              {pwSaving ? "Saving…" : "Update Password"}
            </button>
          </div>
        )}

        {tab === "staff" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cashiers</span>
              <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-gold text-white text-xs rounded hover:bg-gold-dark">Add Cashier</button>
            </div>
            {showAdd && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                {(["name", "email", "password"] as const).map((f) => (
                  <input key={f} placeholder={f} type={f === "password" ? "password" : "text"} value={newStaff[f]} onChange={(e) => setNewStaff({ ...newStaff, [f]: e.target.value })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold" />
                ))}
                <div className="flex gap-2">
                  <button onClick={handleAddStaff} className="px-4 py-2 bg-gold text-white text-xs rounded">Save</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded text-xs">Cancel</button>
                </div>
              </div>
            )}
            <div className="divide-y divide-gray-100">
              {staff?.map((s) => (
                <div key={s.id} className="flex items-center py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.is_active ? "Active" : "Disabled"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
