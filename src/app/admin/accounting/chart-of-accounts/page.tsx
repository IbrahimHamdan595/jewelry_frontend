"use client";

import { useEffect, useState } from "react";
import { accounting, GLAccount } from "@/lib/accounting";

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await accounting.listAccounts();
      setAccounts(r.items);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function seed() {
    await accounting.seedCoa();
    await load();
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
        {accounts.length === 0 && (
          <button onClick={seed} className="px-4 py-2 rounded bg-amber-600 text-white">Seed system accounts</button>
        )}
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2">Code</th><th className="text-left p-2">Name</th>
            <th className="text-left p-2">Type</th><th className="text-left p-2">Denom.</th>
            <th className="text-left p-2">Normal</th><th className="text-left p-2">Currency</th>
            <th className="text-left p-2">System key</th><th className="text-left p-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2 font-mono">{a.code}</td><td className="p-2">{a.name}</td>
              <td className="p-2">{a.type}</td><td className="p-2">{a.denomination}</td>
              <td className="p-2">{a.normal_balance}</td><td className="p-2">{a.currency ?? "—"}</td>
              <td className="p-2 font-mono text-xs">{a.system_key ?? ""}</td>
              <td className="p-2">{a.is_active ? "✓" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
