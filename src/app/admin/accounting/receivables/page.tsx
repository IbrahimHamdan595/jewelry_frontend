"use client";

import { useEffect, useState } from "react";
import { ar, CustomerT } from "@/lib/accounting";
import { apiFetcher, downloadFile } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

export default function Receivables() {
  const { t, lang } = useLang();
  const a = t.accounting.receivables;
  const c = t.accounting.common;

  // AR statement PDF spans the current year to date (Phase 4 will lift the few
  // remaining hardcoded report dates into shared helpers).
  const stmtUntil = new Date().toISOString().slice(0, 10);
  const stmtFrom = `${new Date().getFullYear()}-01-01`;
  function statementPdf(cust: CustomerT) {
    downloadFile(
      `/accounting/ar/customers/${cust.id}/statement?from=${stmtFrom}&until=${stmtUntil}&format=pdf&lang=${lang}`,
      `statement-${cust.name}-${stmtUntil}.pdf`);
  }

  const [customers, setCustomers] = useState<CustomerT[]>([]);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tie, setTie] = useState<{ matches: boolean; gl_ar_balance: string; subledger_balance: string } | null>(null);
  const [aging, setAging] = useState<{ totals: Record<string, string>; grand_total: string } | null>(null);
  const [rcCust, setRcCust] = useState("");
  const [rcAmt, setRcAmt] = useState("");
  // Receipt currency is the "recorded-in" currency — it must match the invoices
  // being settled. fx_rate (LBP per USD) is the settlement-day rate; realized FX
  // is booked when it differs from the invoice's captured rate.
  const [rcCcy, setRcCcy] = useState("USD");
  const [rcRate, setRcRate] = useState("1");
  const [lbpRate, setLbpRate] = useState("1");
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      setCustomers((await ar.listCustomers()).items);
      setTie(await ar.verify());
      setAging(await ar.aging("2026-06-30"));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    apiFetcher<{ lbp_exchange_rate: number | string | null }>("/settings")
      .then((s) => { if (s.lbp_exchange_rate) setLbpRate(String(s.lbp_exchange_rate)); })
      .catch(() => {});
  }, []);

  function setRcCurrency(currency: string) {
    setRcCcy(currency);
    setRcRate(currency === "USD" ? "1" : lbpRate);
  }

  async function create() {
    setError(null);
    try { await ar.createCustomer({ name, credit_limit: limit || undefined }); setName(""); setLimit(""); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function receipt() {
    setError(null); setOk(null);
    try {
      const r = await ar.createReceipt({
        customer_id: rcCust, receipt_date: "2026-06-30", amount: rcAmt, payment_system_key: "CASH",
        currency: rcCcy, fx_rate: rcCcy === "USD" ? "1" : (rcRate || "1"),
      });
      setOk(`Receipt ${r.receipt_no} (unapplied ${r.unapplied_amount})`); setRcAmt(""); await load();
    } catch (e) { setError((e as Error).message); }
  }

  const agingCells = aging ? [
    { label: a.agingCurrent, v: aging.totals["0_30"] },
    { label: a.aging3160, v: aging.totals["31_60"] },
    { label: a.aging6190, v: aging.totals["61_90"] },
    { label: a.aging90, v: aging.totals["90_plus"] },
    { label: c.total, v: aging.grand_total },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.description}
        actions={tie && (
          <span className={`text-xs ${tie.matches ? "text-green-700" : "text-red-700"}`}>
            {tie.matches ? "✓" : "✗"} {tie.gl_ar_balance} / {tie.subledger_balance}
          </span>
        )}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      {aging && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {agingCells.map((cell, i) => (
            <div key={cell.label} className={`rounded-xl border p-4 ${i === 4 ? "border-gold/30 bg-gold/5" : "border-gray-100 bg-white"}`}>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{cell.label}</div>
              <div className="text-lg font-semibold text-gray-800"><Money value={cell.v} dash /></div>
            </div>
          ))}
        </div>
      )}

      <ActionBar hint={a.receiptHint}>
        <select value={rcCust} onChange={(e) => setRcCust(e.target.value)} className={SELECT}>
          <option value="">{c.customer}…</option>
          {customers.map((cu) => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
        </select>
        <select value={rcCcy} onChange={(e) => setRcCurrency(e.target.value)} className={SELECT}>
          <option value="USD">USD</option>
          <option value="LBP">LBP</option>
        </select>
        <Input placeholder={c.fxRate} value={rcRate} onChange={(e) => setRcRate(e.target.value)}
               disabled={rcCcy === "USD"} className="w-28 text-end disabled:bg-gray-50 disabled:text-gray-400" />
        <Input placeholder={a.amountPlaceholder} value={rcAmt} onChange={(e) => setRcAmt(e.target.value)} className="w-32 text-end" />
        <Button onClick={receipt} disabled={!rcCust || !rcAmt}>{a.recordBtn}</Button>
        {ok && <span className="text-sm text-green-700 ms-1">{ok}</span>}
      </ActionBar>

      <SectionCard title={a.title} flush>
        <DataTable
          columns={[
            { key: "name", label: a.colCustomer },
            { key: "currency", label: c.currency },
            { key: "open_balance", label: a.colOpenBalance, align: "end", render: (r: CustomerT) => <Money value={r.open_balance} dash /> },
            { key: "statement", label: c.statement, align: "end", render: (r: CustomerT) => (
              <button onClick={() => statementPdf(r)} className="text-gold hover:underline text-xs">{c.pdf}</button>
            ) },
          ]}
          rows={customers}
          rowKey={(r) => r.id}
          empty={a.empty}
        />
      </SectionCard>

      <SectionCard title={a.newCustomer}>
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder={a.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
          <Input placeholder={a.creditLimitPlaceholder} value={limit} onChange={(e) => setLimit(e.target.value)} className="w-64" />
          <Button variant="outline" onClick={create} disabled={!name}>{a.createBtn}</Button>
        </div>
      </SectionCard>
    </div>
  );
}
