"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { accounting } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";

export default function AccountingHome() {
  const { t } = useLang();
  const a = t.accounting;
  const [verify, setVerify] = useState<{ status: string; head_matches: boolean } | null>(null);

  useEffect(() => {
    accounting.verify().then(setVerify).catch(() => setVerify(null));
  }, []);

  const groups: { key: string; title: string; desc: string; cards: { href: string; title: string; desc: string }[] }[] = [
    {
      key: "ledger", title: a.landing.groupLedger, desc: a.landing.groupLedgerDesc,
      cards: [
        { href: "/admin/accounting/chart-of-accounts", title: a.landing.coaTitle, desc: a.landing.coaDesc },
        { href: "/admin/accounting/journal", title: a.landing.journalTitle, desc: a.landing.journalDesc },
        { href: "/admin/accounting/trial-balance", title: a.landing.trialBalanceTitle, desc: a.landing.trialBalanceDesc },
        { href: "/admin/accounting/general-ledger", title: a.landing.generalLedgerTitle, desc: a.landing.generalLedgerDesc },
      ],
    },
    {
      key: "money", title: a.landing.groupMoney, desc: a.landing.groupMoneyDesc,
      cards: [
        { href: "/admin/accounting/receivables", title: a.landing.receivablesTitle, desc: a.landing.receivablesDesc },
        { href: "/admin/accounting/payables", title: a.landing.payablesTitle, desc: a.landing.payablesDesc },
        { href: "/admin/accounting/bank", title: a.landing.bankTitle, desc: a.landing.bankDesc },
        { href: "/admin/accounting/expenses", title: a.landing.expensesTitle, desc: a.landing.expensesDesc },
        { href: "/admin/accounting/tax", title: a.landing.taxTitle, desc: a.landing.taxDesc },
      ],
    },
    {
      key: "reports", title: a.landing.groupReports, desc: a.landing.groupReportsDesc,
      cards: [
        { href: "/admin/accounting/statements", title: a.landing.statementsTitle, desc: a.landing.statementsDesc },
        { href: "/admin/accounting/kpis", title: a.landing.kpisTitle, desc: a.landing.kpisDesc },
      ],
    },
    {
      key: "controls", title: a.landing.groupControls, desc: a.landing.groupControlsDesc,
      cards: [
        { href: "/admin/accounting/periods", title: a.landing.periodsTitle, desc: a.landing.periodsDesc },
      ],
    },
  ];

  const ok = verify && verify.status === "intact" && verify.head_matches;

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title={a.landing.title}
        description={a.landing.description}
        actions={verify && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${ok ? "bg-green-50 text-green-700" : verify.status === "empty" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-700"}`}>
            {a.common.ledgerChain}: {ok ? a.common.intact : verify.status === "empty" ? "—" : a.common.broken}
          </span>
        )}
      />

      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">{g.title}</h2>
            <p className="text-xs text-gray-400">{g.desc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {g.cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="font-serif text-lg font-semibold text-gray-900">{c.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{c.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 mt-1 text-gray-300 transition-colors group-hover:text-gold rtl:rotate-180" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
