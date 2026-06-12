"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Plus, Banknote, Coins } from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import { Skeleton, SkeletonText, CardSkeleton } from "@/components/ui/skeleton";
import type {
  Karat,
  Lot,
  LotListResponse,
  SupplierDetail,
  SupplierPayment,
  SupplierPurchase,
} from "@/types/api";

const KARATS: Karat[] = ["K18", "K21", "K22", "K24"];

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate } = useSWR<SupplierDetail>(`/suppliers/${id}`, apiFetcher);
  const [payCash, setPayCash] = useState(false);
  const [payGold, setPayGold] = useState(false);

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-36" />
        <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <SkeletonText lines={6} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
            <SkeletonText lines={4} />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
            <SkeletonText lines={4} />
          </div>
        </div>
      </div>
    );
  }

  const { supplier, balances, purchases, payments } = data;
  const cashBalance = balances.find((b) => b.unit === "CASH");
  const goldBalances = balances.filter((b) => b.unit === "GOLD");
  const hasDebt = balances.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to suppliers
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{supplier.name}</h2>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-600">
              {supplier.contact_name && <Meta label="Contact" value={supplier.contact_name} />}
              {supplier.phone && <Meta label="Phone" value={supplier.phone} />}
              {supplier.email && <Meta label="Email" value={supplier.email} />}
              {supplier.payment_terms && <Meta label="Terms" value={supplier.payment_terms} />}
            </div>
            {supplier.address && (
              <div className="text-xs text-gray-500 mt-2">{supplier.address}</div>
            )}
            {supplier.notes && (
              <div className="text-xs text-gray-500 mt-1 italic">{supplier.notes}</div>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${supplier.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {supplier.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard
          icon={<Banknote className="w-5 h-5" />}
          label="Cash owed"
          value={cashBalance ? formatUSD(Number(cashBalance.balance)) : formatUSD(0)}
          accent={cashBalance && Number(cashBalance.balance) > 0}
          action={
            <button
              onClick={() => setPayCash(true)}
              className="text-xs text-gold hover:text-gold-dark"
            >
              Record cash payment →
            </button>
          }
        />
        <BalanceCard
          icon={<Coins className="w-5 h-5" />}
          label="Gold owed (grams by karat)"
          value={
            goldBalances.length === 0 ? (
              <span className="text-lg text-gray-400">None</span>
            ) : (
              <div className="space-y-1">
                {goldBalances.map((b) => (
                  <div key={b.karat ?? "k"} className="flex items-baseline gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-medium">{b.karat}</span>
                    <span className="text-lg font-semibold text-gray-800">
                      {Number(b.balance).toFixed(3)}
                      <span className="text-xs text-gray-400 ml-1">g</span>
                    </span>
                  </div>
                ))}
              </div>
            )
          }
          accent={goldBalances.length > 0}
          action={
            <button
              onClick={() => setPayGold(true)}
              disabled={goldBalances.length === 0}
              className="text-xs text-gold hover:text-gold-dark disabled:text-gray-400 disabled:hover:text-gray-400"
            >
              Record gold payment →
            </button>
          }
        />
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Actions</div>
            {hasDebt && (
              <div className="text-xs text-amber-600 mb-2">
                Cannot deactivate while debt is outstanding.
              </div>
            )}
          </div>
          <Link
            href={`/admin/suppliers/${id}/purchases/new`}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Purchase
          </Link>
        </div>
      </div>

      {/* Purchases */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Purchase history</h3>
        <PurchasesTable purchases={purchases} />
      </section>

      {/* Payments */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Payment history</h3>
        <PaymentsTable payments={payments} />
      </section>

      {payCash && (
        <PaymentDialog
          supplierId={id}
          unit="CASH"
          outstanding={cashBalance ? Number(cashBalance.balance) : 0}
          onClose={() => setPayCash(false)}
          onSaved={async () => {
            setPayCash(false);
            await mutate();
          }}
        />
      )}
      {payGold && (
        <GoldPaymentDialog
          supplierId={id}
          goldBalances={goldBalances}
          onClose={() => setPayGold(false)}
          onSaved={async () => {
            setPayGold(false);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 uppercase tracking-widest text-[10px] mr-1">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function BalanceCard({
  icon, label, value, accent, action,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm p-5 ${accent ? "border-gold/40" : "border-gray-100"}`}>
      <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest mb-2">
        <span className="text-gray-500">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold text-gray-800">{value}</div>
      {action && <div className="mt-3 pt-3 border-t border-gray-100">{action}</div>}
    </div>
  );
}

function PurchasesTable({ purchases }: { purchases: SupplierPurchase[] }) {
  if (purchases.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        No purchases yet
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Date</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Mode</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Cash due / paid</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Gold due / paid</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Items</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Notes</th>
            <th className="text-right px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {purchases.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-600">{new Date(p.occurred_at).toLocaleString()}</td>
              <td className="px-4 py-3"><ModePill mode={p.payment_mode} /></td>
              <td className="px-4 py-3 text-xs font-mono text-gray-700">
                {formatUSD(Number(p.total_cash_due))} / {formatUSD(Number(p.cash_paid_at_creation))}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-gray-700">
                {Object.keys(p.total_grams_due_by_karat).length === 0 ? (
                  "—"
                ) : (
                  Object.entries(p.total_grams_due_by_karat).map(([k, due]) => {
                    const paid = p.grams_paid_at_creation_by_karat?.[k] ?? "0";
                    return (
                      <div key={k}>
                        <span className="text-gray-500">{k}</span>{" "}
                        {Number(due).toFixed(3)}g / {Number(paid).toFixed(3)}g
                      </div>
                    );
                  })
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {p.items.length} item{p.items.length !== 1 ? "s" : ""}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs">{p.notes ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/admin/suppliers/purchases/${p.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:text-gold-dark"
                >
                  Receipt →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: SupplierPayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        No payments yet
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Date</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Unit</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Amount</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Source lots</th>
            <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-600">{new Date(p.paid_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                {p.unit === "CASH" ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">CASH</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold">{p.karat}</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                {p.unit === "CASH" ? formatUSD(Number(p.amount)) : `${Number(p.amount).toFixed(3)}g`}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-gray-500">
                {p.source_lot_ids?.length ? p.source_lot_ids.map((l) => l.slice(0, 8) + "…").join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs">{p.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModePill({ mode }: { mode: "CASH" | "GOLD" | "MIXED" }) {
  const colors: Record<typeof mode, string> = {
    CASH: "bg-emerald-50 text-emerald-700",
    GOLD: "bg-gold/10 text-gold",
    MIXED: "bg-violet-50 text-violet-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${colors[mode]}`}>{mode}</span>;
}

// ── Cash payment dialog ────────────────────────────────────────────────────────

function PaymentDialog({
  supplierId, unit, outstanding, onClose, onSaved,
}: {
  supplierId: string;
  unit: "CASH";
  outstanding: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/suppliers/${supplierId}/payments`, { unit, amount, notes });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">Record cash payment</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Outstanding: <span className="font-mono">{formatUSD(outstanding)}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Amount (USD)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !amount} className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60">
            {saving ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gold payment dialog (lot picker) ───────────────────────────────────────────

function GoldPaymentDialog({
  supplierId,
  goldBalances,
  onClose,
  onSaved,
}: {
  supplierId: string;
  goldBalances: { karat: string | null; balance: number }[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const firstKarat = (goldBalances[0]?.karat ?? "K21") as Karat;
  const [karat, setKarat] = useState<Karat>(firstKarat);
  const [picks, setPicks] = useState<{ lot_id: string; grams: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active lots in the chosen karat
  const { data: lots } = useSWR<LotListResponse>(
    `/lots?karat=${karat}&page_size=100`,
    apiFetcher,
  );

  const outstandingForKarat = Number(
    goldBalances.find((b) => b.karat === karat)?.balance ?? 0,
  );

  const totalGrams = picks.reduce((acc, p) => acc + (Number(p.grams) || 0), 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/suppliers/${supplierId}/payments`, {
        unit: "GOLD",
        karat,
        amount: totalGrams.toString(),
        gold_payments: picks.map((p) => ({
          lot_id: p.lot_id,
          grams: p.grams,
          karat,
        })),
        notes,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-800">Record gold payment</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Choose which lot(s) the gold leaves from.
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Karat</label>
            <select
              value={karat}
              onChange={(e) => {
                setKarat(e.target.value as Karat);
                setPicks([]);
              }}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
            >
              {KARATS.map((k) => {
                const owed = Number(goldBalances.find((b) => b.karat === k)?.balance ?? 0);
                return (
                  <option key={k} value={k} disabled={owed === 0}>
                    {k} {owed > 0 ? `(owe ${owed.toFixed(3)}g)` : "(none owed)"}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded px-4 py-2 text-xs">
            <span className="text-gray-500">Outstanding {karat}:</span>
            <span className="font-mono font-semibold text-gray-800">{outstandingForKarat.toFixed(3)}g</span>
            <span className="text-gray-500">Total picked:</span>
            <span className={`font-mono font-semibold ${totalGrams > outstandingForKarat ? "text-red-600" : "text-gray-800"}`}>
              {totalGrams.toFixed(3)}g
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded p-3 space-y-2 max-h-72 overflow-y-auto">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Pick lot(s)</div>
          {!lots?.items.length ? (
            <div className="text-xs text-gray-400">No active {karat} lots</div>
          ) : (
            lots.items.map((lot: Lot) => {
              const pickIdx = picks.findIndex((p) => p.lot_id === lot.id);
              const picked = pickIdx >= 0;
              return (
                <div key={lot.id} className={`flex items-center gap-3 p-2 rounded ${picked ? "bg-gold/5" : "hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={picked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPicks([...picks, { lot_id: lot.id, grams: "" }]);
                      } else {
                        setPicks(picks.filter((p) => p.lot_id !== lot.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-mono">{lot.id.slice(0, 12)}…</div>
                    <div className="text-gray-500">
                      remaining {Number(lot.weight_remaining_grams).toFixed(3)}g · {lot.source}
                    </div>
                  </div>
                  {picked && (
                    <input
                      type="number"
                      step="0.001"
                      max={lot.weight_remaining_grams}
                      placeholder="grams"
                      value={picks[pickIdx]?.grams ?? ""}
                      onChange={(e) => {
                        const newPicks = [...picks];
                        newPicks[pickIdx] = { ...newPicks[pickIdx], grams: e.target.value };
                        setPicks(newPicks);
                      }}
                      className="w-28 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || picks.length === 0 || totalGrams <= 0 || totalGrams > outstandingForKarat}
            className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : `Pay ${totalGrams.toFixed(3)}g ${karat}`}
          </button>
        </div>
      </div>
    </div>
  );
}
