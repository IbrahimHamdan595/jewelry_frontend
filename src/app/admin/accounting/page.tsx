"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { accounting } from "@/lib/accounting";

export default function AccountingHome() {
  const [verify, setVerify] = useState<{ status: string; head_matches: boolean } | null>(null);

  useEffect(() => {
    accounting.verify().then(setVerify).catch(() => setVerify(null));
  }, []);

  const cards = [
    { href: "/admin/accounting/chart-of-accounts", title: "Chart of Accounts", desc: "Accounts tree, balances, system keys" },
    { href: "/admin/accounting/journal", title: "Journal Entries", desc: "Post & review double-entry journals" },
    { href: "/admin/accounting/trial-balance", title: "Trial Balance", desc: "As-of money + per-karat metal position" },
    { href: "/admin/accounting/bank", title: "Cash & Bank", desc: "Accounts, transfers, reconciliation" },
    { href: "/admin/accounting/receivables", title: "Accounts Receivable", desc: "Customers, credit sales, receipts, aging" },
    { href: "/admin/accounting/payables", title: "Accounts Payable", desc: "Supplier debt, aging, tie-out" },
    { href: "/admin/accounting/expenses", title: "Expenses", desc: "Vendor bills, payments, expense reports" },
    { href: "/admin/accounting/tax", title: "Tax / VAT", desc: "Tax codes + quarterly VAT return" },
    { href: "/admin/accounting/statements", title: "Financial Statements", desc: "P&L, Balance Sheet, Cash Flow" },
    { href: "/admin/accounting/kpis", title: "Financial KPIs", desc: "DSI, turnover, DSO/DPO/CCC, margins, ratios" },
    { href: "/admin/accounting/periods", title: "Periods", desc: "Open / close monthly periods" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounting</h1>
        {verify && (
          <span className={`text-sm px-3 py-1 rounded-full ${verify.status === "intact" && verify.head_matches ? "bg-green-100 text-green-700" : verify.status === "empty" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>
            Ledger chain: {verify.status}{verify.head_matches ? " ✓" : " ✗"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block rounded-xl border p-5 hover:shadow-md transition">
            <div className="text-lg font-medium">{c.title}</div>
            <div className="text-sm text-gray-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
