"use client";

import { useEffect, useState } from "react";
import { bank, BankAccountT } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

export default function BankPage() {
  const { t } = useLang();
  const a = t.accounting.bank;
  const c = t.accounting.common;

  const [accounts, setAccounts] = useState<BankAccountT[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ccy, setCcy] = useState("USD");
  const [type, setType] = useState("BANK");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [destAmount, setDestAmount] = useState("");
  const [tDate, setTDate] = useState("2026-06-05");
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try { setAccounts((await bank.cashPosition()).accounts); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function adopt() { await bank.adoptSeeded(); await load(); }
  async function create() {
    setError(null);
    try { await bank.createAccount({ name, account_type: type, currency: ccy }); setName(""); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function doTransfer() {
    setError(null); setOk(null);
    try {
      const r = await bank.transfer({ from_account_id: from, to_account_id: to, amount,
        dest_amount: destAmount || undefined, memo: "transfer", entry_date: tDate });
      setOk(`Posted ${r.entry_no}`); await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.description}
        actions={<Button variant="outline" onClick={adopt}>{a.adoptSeeded}</Button>}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <SectionCard title={a.title} flush>
        <DataTable
          columns={[
            { key: "name", label: a.colAccount },
            { key: "account_type", label: a.colType },
            { key: "currency", label: a.colCcy },
            { key: "balance_money", label: a.colBalance, align: "end", render: (r: BankAccountT) => <Money value={r.balance_money} dash /> },
            { key: "balance_base", label: a.colUsdBase, align: "end", render: (r: BankAccountT) => <Money value={r.balance_base} dash /> },
            { key: "last_reconciled_at", label: a.colLastReconciled, render: (r: BankAccountT) => r.last_reconciled_at ? r.last_reconciled_at.slice(0, 10) : "—" },
          ]}
          rows={accounts}
          rowKey={(r) => r.id}
          empty={a.empty}
        />
      </SectionCard>

      <SectionCard title={a.newAccount}>
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder={a.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
          <select value={type} onChange={(e) => setType(e.target.value)} className={SELECT}>
            <option>BANK</option><option>CASH</option><option>PETTY_CASH</option>
          </select>
          <select value={ccy} onChange={(e) => setCcy(e.target.value)} className={SELECT}>
            <option>USD</option><option>LBP</option>
          </select>
          <Button variant="outline" onClick={create} disabled={!name}>{c.create}</Button>
        </div>
      </SectionCard>

      <SectionCard title={a.transfer}>
        <ActionBar hint={a.transferHint}>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={SELECT}>
            <option value="">{c.from}…</option>{accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={SELECT}>
            <option value="">{c.account}…</option>{accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
          </select>
          <Input placeholder={a.amountPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40 text-end" />
          <Input placeholder={a.destAmountPlaceholder} value={destAmount} onChange={(e) => setDestAmount(e.target.value)} className="w-48 text-end" />
          <Input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className="w-auto" />
          <Button onClick={doTransfer} disabled={!from || !to || !amount}>{a.transfer}</Button>
          {ok && <span className="text-sm text-green-700 ms-1">{ok}</span>}
        </ActionBar>
      </SectionCard>
    </div>
  );
}
