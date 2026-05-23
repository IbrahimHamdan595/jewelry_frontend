"use client";
import useSWR from "swr";
import Link from "next/link";
import { Banknote, Coins, Users } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import type { AccountsPayable } from "@/types/api";

export default function AccountsPayablePage() {
  const { data } = useSWR<AccountsPayable>("/accounts-payable", apiFetcher, {
    refreshInterval: 60000,
  });

  if (!data) {
    return <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />;
  }

  const goldKarats = Object.entries(data.total_grams_owed_by_karat).filter(
    ([, g]) => Number(g) > 0,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Accounts Payable</h2>

      {/* Headline totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Banknote className="w-5 h-5" />}
          label="Cash owed (store-wide)"
          value={formatUSD(data.total_cash_owed)}
        />
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest mb-2">
            <Coins className="w-5 h-5 text-gray-500" />
            Gold owed
          </div>
          {goldKarats.length === 0 ? (
            <div className="text-lg text-gray-400">None</div>
          ) : (
            <div className="space-y-1.5">
              {goldKarats.map(([k, g]) => (
                <div key={k} className="flex items-baseline gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-medium">{k}</span>
                  <span className="text-xl font-semibold text-gray-800">
                    {Number(g).toFixed(3)}
                    <span className="text-xs text-gray-400 ml-1">g</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Suppliers with debt"
          value={String(data.suppliers.length)}
        />
      </div>

      {/* Per-supplier breakdown */}
      {data.suppliers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          No outstanding supplier debt
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Supplier
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Cash
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Gold
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.suppliers.map((s) => {
                const cash = s.balances.find((b) => b.unit === "CASH");
                const gold = s.balances.filter((b) => b.unit === "GOLD");
                return (
                  <tr key={s.supplier_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/suppliers/${s.supplier_id}`}
                        className="font-medium text-gray-800 hover:text-gold"
                      >
                        {s.supplier_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {cash ? (
                        <span className="text-gray-800 font-semibold">{formatUSD(Number(cash.balance))}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {gold.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        gold.map((b) => (
                          <div key={b.karat ?? "k"}>
                            <span className="text-gray-500 mr-2">{b.karat}</span>
                            <span className="text-gray-800 font-semibold">{Number(b.balance).toFixed(3)}g</span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/suppliers/${s.supplier_id}`}
                        className="text-xs text-gold hover:text-gold-dark"
                      >
                        Settle →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest mb-2">
        <span className="text-gray-500">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold text-gray-800">{value}</div>
    </div>
  );
}
