"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { getStoredUser } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import type { LedgerVerify, Settings } from "@/types/api";

type ChainState = "loading" | "error" | "empty" | "intact" | "broken";
type AutoPostState = "on" | "off" | "unknown";

export default function AccountingHome() {
  const { t } = useLang();
  const a = t.accounting;
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: settings } = useSWR<Settings>("/settings", apiFetcher);
  const { data: verify, error: verifyError } = useSWR<LedgerVerify>("/accounting/ledger/verify", apiFetcher);

  // The three states the hub must keep apart: empty, broken, and "could not
  // check". Only the last two are problems; an empty ledger is a fact.
  const chain: ChainState =
    verifyError && !verify ? "error"
    : !verify ? "loading"
    : verify.status === "empty" ? "empty"
    : verify.status === "intact" && verify.head_matches ? "intact"
    : "broken";

  // Absent ≠ off. Until the backend exposes the flag (NEX-52) we say so.
  const flag = settings?.accounting_auto_post_enabled;
  const autoPost: AutoPostState = flag === true ? "on" : flag === false ? "off" : "unknown";

  const description =
    autoPost === "on" ? a.landing.descriptionOn
    : autoPost === "off" ? a.landing.descriptionOff
    : a.landing.descriptionUnknown;

  const chainLabel: Record<ChainState, string> = {
    loading: "…",
    error: a.landing.couldNotVerify,
    empty: a.landing.noEntriesYet,
    intact: a.common.intact,
    broken: a.common.broken,
  };
  const badgeClass: Record<ChainState, string> = {
    loading: "bg-gray-100 text-gray-400",
    error: "bg-amber-50 text-amber-700",
    empty: "bg-gray-100 text-gray-600",
    intact: "bg-green-50 text-green-700",
    broken: "bg-red-50 text-red-700",
  };
  const autoPostLabel: Record<AutoPostState, string> = {
    on: a.landing.on,
    off: a.landing.off,
    unknown: a.landing.notReported,
  };

  const canOpenSettings = !!user && canAccess(user.role, "/admin/settings");

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

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title={a.landing.title}
        description={description}
        actions={chain !== "loading" && (
          <span data-testid="chain-badge" className={`text-xs px-3 py-1 rounded-full font-medium ${badgeClass[chain]}`}>
            {a.common.ledgerChain}: {chainLabel[chain]}
          </span>
        )}
      />

      {/* Ledger state — the honest summary the description above is based on. */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">{a.landing.stateTitle}</h2>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400">{a.landing.entriesLabel}</dt>
                <dd data-testid="ledger-entries" className="font-semibold text-gray-800">{verify ? verify.head_row_count : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{a.landing.chainLabel}</dt>
                <dd className={`font-semibold ${chain === "broken" ? "text-red-600" : chain === "error" ? "text-amber-700" : "text-gray-800"}`}>
                  {chainLabel[chain]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">{a.landing.autoPostLabel}</dt>
                <dd data-testid="ledger-autopost" className={`font-semibold ${autoPost === "on" ? "text-green-700" : autoPost === "off" ? "text-amber-700" : "text-gray-500"}`}>
                  {autoPostLabel[autoPost]}
                </dd>
              </div>
            </dl>
          </div>
          {canOpenSettings && (
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              {a.landing.openSettings}
            </Link>
          )}
        </div>
      </section>

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
