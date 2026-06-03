"use client";

import { useEffect, useState } from "react";
import { statements } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";

type Tab = "pnl" | "bs" | "cf";

export default function Statements() {
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Financial Statements</h1>
      <div className="flex gap-2">
        {(["pnl", "bs", "cf"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded ${tab === t ? "bg-amber-600 text-white" : "bg-gray-100"}`}>
            {t === "pnl" ? "P&L" : t === "bs" ? "Balance Sheet" : "Cash Flow"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {tab === "bs" ? (
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border rounded px-3 py-2" />
        ) : (
          <>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-3 py-2" />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-3 py-2" />
          </>
        )}
        <button onClick={run} className="px-4 py-2 rounded bg-amber-600 text-white">Run</button>
        <button onClick={dl} className="px-4 py-2 rounded border">Download Excel</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}

      {tab === "pnl" && pnl && (
        <table className="w-full text-sm border">
          <tbody>
            <Section title="Revenue" lines={pnl.revenue_lines} />
            <Total label="Revenue" v={pnl.revenue} />
            <Section title="COGS" lines={pnl.cogs_lines} />
            <Total label="Gross profit" v={pnl.gross_profit} />
            <Section title="Operating expenses" lines={pnl.opex_lines} />
            <Total label="Net profit" v={pnl.net_profit} bold />
          </tbody>
        </table>
      )}

      {tab === "bs" && bs && (
        <div className="space-y-4">
          <table className="w-full text-sm border">
            <tbody>
              <Section title="Assets" lines={bs.asset_lines} />
              <Total label="Total assets" v={bs.total_assets} />
              <Section title="Liabilities" lines={bs.liability_lines} />
              <Total label="Total liabilities" v={bs.total_liabilities} />
              <Section title="Equity" lines={bs.equity_lines} />
              <Total label="Total equity" v={bs.total_equity} />
            </tbody>
          </table>
          <div className={bs.balanced ? "text-green-700 text-sm" : "text-red-700 text-sm"}>
            A = L + E {bs.balanced ? "✓" : "✗"} {bs.all_current ? "· all assets treated as current" : ""}
          </div>
          {bs.metal_position.length > 0 && (
            <table className="text-sm border">
              <thead className="bg-gray-50"><tr><th className="p-2">Karat</th><th className="p-2">Net grams</th></tr></thead>
              <tbody>{bs.metal_position.map((m) => (
                <tr key={m.karat} className="border-t"><td className="p-2">{m.karat}</td><td className="p-2 text-right">{m.net_grams}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === "cf" && cf && (
        <table className="w-full text-sm border">
          <tbody>
            <tr className="border-t"><td className="p-2">Opening cash</td><td className="p-2 text-right">{cf.opening_cash}</td></tr>
            {cf.categories.map((c) => (
              <tr key={c.key} className="border-t"><td className="p-2">{c.label}</td><td className="p-2 text-right">{c.amount}</td></tr>
            ))}
            <tr className="border-t font-medium"><td className="p-2">Net change</td><td className="p-2 text-right">{cf.net_change}</td></tr>
            <tr className="border-t font-medium"><td className="p-2">Closing cash</td><td className="p-2 text-right">{cf.closing_cash}</td></tr>
            {!cf.reconciles && <tr><td colSpan={2} className="p-2 text-red-700">⚠ does not reconcile to cash balance</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Section({ title, lines }: { title: string; lines: { code: string; name: string; amount: string }[] }) {
  return (
    <>
      <tr className="bg-gray-50"><td className="p-2 font-medium" colSpan={2}>{title}</td></tr>
      {lines.map((l) => (
        <tr key={l.code + l.name} className="border-t"><td className="p-2 pl-6">{l.name}</td><td className="p-2 text-right">{l.amount}</td></tr>
      ))}
    </>
  );
}

function Total({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <tr className={`border-t ${bold ? "font-bold" : "font-medium"}`}>
      <td className="p-2">{label}</td><td className="p-2 text-right">{v}</td>
    </tr>
  );
}
