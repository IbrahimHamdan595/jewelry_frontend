"use client";

import { useEffect, useState } from "react";
import { statements, StatementLineT } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "pnl" | "bs" | "cf";

export default function Statements() {
  const { t } = useLang();
  const a = t.accounting.statements;
  const c = t.accounting.common;

  const [tab, setTab] = useState<Tab>("pnl");
  const [start, setStart] = useState("2026-06-01");
  const [end, setEnd] = useState("2026-06-30");
  const [asOf, setAsOf] = useState("2026-06-30");
  const [pnl, setPnl] = useState<Awaited<ReturnType<typeof statements.incomeStatement>> | null>(null);
  const [bs, setBs] = useState<Awaited<ReturnType<typeof statements.balanceSheet>> | null>(null);
  const [cf, setCf] = useState<Awaited<ReturnType<typeof statements.cashFlow>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      if (tab === "pnl") setPnl(await statements.incomeStatement(start, end));
      else if (tab === "bs") setBs(await statements.balanceSheet(asOf));
      else setCf(await statements.cashFlow(start, end));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  async function dl() {
    setError(null);
    try {
      if (tab === "pnl")
        await downloadFile(`/accounting/statements/income-statement?start=${start}&end=${end}&format=xlsx`, `income-statement-${start}-${end}.xlsx`);
      else if (tab === "bs")
        await downloadFile(`/accounting/statements/balance-sheet?as_of=${asOf}&format=xlsx`, `balance-sheet-${asOf}.xlsx`);
      else
        await downloadFile(`/accounting/statements/cash-flow?start=${start}&end=${end}&format=xlsx`, `cash-flow-${start}-${end}.xlsx`);
    } catch (e) { setError((e as Error).message); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "pnl", label: a.tabPnl },
    { key: "bs", label: a.tabBs },
    { key: "cf", label: a.tabCf },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <Button
            key={tb.key}
            variant={tab === tb.key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </Button>
        ))}
      </div>

      <ActionBar>
        {tab === "bs" ? (
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        ) : (
          <>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-44" />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-44" />
          </>
        )}
        <Button onClick={run}>{a.runBtn}</Button>
        <Button variant="outline" onClick={dl}>{a.downloadExcel}</Button>
      </ActionBar>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {tab === "pnl" && pnl && (
        <SectionCard flush>
          <table className="w-full text-sm">
            <tbody>
              <Section title={a.revenue} lines={pnl.revenue_lines} />
              <Total label={a.revenue} v={pnl.revenue} />
              <Section title={a.cogs} lines={pnl.cogs_lines} />
              <Total label={a.grossProfit} v={pnl.gross_profit} />
              <Section title={a.opex} lines={pnl.opex_lines} />
              <Total label={a.opex} v={pnl.operating_expenses} />
              <Total label={a.operatingProfit} v={pnl.operating_profit} />
              {pnl.other_lines.length > 0 && (
                <>
                  <Section title={a.otherIncomeExpense} lines={pnl.other_lines} />
                  <Total label={a.otherIncomeExpense} v={pnl.other_income_expense} />
                </>
              )}
              <Total label={a.netProfit} v={pnl.net_profit} bold />
            </tbody>
          </table>
        </SectionCard>
      )}

      {tab === "bs" && bs && (
        <div className="space-y-4">
          <SectionCard flush>
            <table className="w-full text-sm">
              <tbody>
                <Section title={a.assets} lines={bs.asset_lines} />
                <Total label={a.totalAssets} v={bs.total_assets} />
                <Section title={a.liabilities} lines={bs.liability_lines} />
                <Total label={a.totalLiabilities} v={bs.total_liabilities} />
                <Section title={a.equity} lines={bs.equity_lines} />
                <Total label={a.totalEquity} v={bs.total_equity} />
              </tbody>
            </table>
          </SectionCard>
          <div className={`text-sm ${bs.balanced ? "text-green-700" : "text-red-700"}`}>
            {a.balanced} {bs.balanced ? "✓" : "✗"}{bs.all_current ? ` · ${a.allCurrent}` : ""}
          </div>
          {bs.metal_position.length > 0 && (
            <SectionCard title={a.metalSchedule} flush>
              <DataTable
                columns={[
                  { key: "karat", label: a.colKarat },
                  { key: "net_grams", label: a.colNetGrams, align: "end" },
                ]}
                rows={bs.metal_position}
                rowKey={(r) => r.karat}
                empty={c.noData}
                minWidth={280}
              />
            </SectionCard>
          )}
        </div>
      )}

      {tab === "cf" && cf && (
        <SectionCard flush>
          <table className="w-full text-sm">
            <tbody>
              <Row label={a.openingCash} v={cf.opening_cash} />
              {cf.categories.map((cat) => (
                <Row key={cat.key} label={cat.label} v={cat.amount} />
              ))}
              <Row label={a.netChange} v={cf.net_change} bold />
              <Row label={a.closingCash} v={cf.closing_cash} bold />
              {!cf.reconciles && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm text-red-700">⚠ {a.reconciles}</td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}

function Section({ title, lines }: { title: string; lines: StatementLineT[] }) {
  return (
    <>
      <tr className="bg-gray-50">
        <td className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500" colSpan={2}>{title}</td>
      </tr>
      {lines.map((l) => (
        <tr key={l.code + l.name} className="border-b border-gray-50">
          <td className="px-4 py-2.5 ps-8 text-gray-700">{l.name}</td>
          <td className="px-4 py-2.5 text-end tabular-nums text-gray-700"><Money value={l.amount} dash /></td>
        </tr>
      ))}
    </>
  );
}

function Total({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <tr className={`border-b border-gray-100 ${bold ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
      <td className="px-4 py-2.5">{label}</td>
      <td className="px-4 py-2.5 text-end tabular-nums"><Money value={v} dash /></td>
    </tr>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <tr className={`border-b border-gray-50 ${bold ? "font-medium text-gray-900" : "text-gray-700"}`}>
      <td className="px-4 py-2.5">{label}</td>
      <td className="px-4 py-2.5 text-end tabular-nums"><Money value={v} dash /></td>
    </tr>
  );
}
