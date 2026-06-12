"use client";

import { useEffect, useState } from "react";
import { tax, TaxCodeT } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { StatTile } from "@/components/accounting/StatTile";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

type VatTxn = { entry_no: string; date: string; kind: string; vat: string };

export default function Tax() {
  const { t } = useLang();
  const a = t.accounting.tax;
  const c = t.accounting.common;

  const [codes, setCodes] = useState<TaxCodeT[]>([]);
  const [loading, setLoading] = useState(true);
  const [ret, setRet] = useState<Awaited<ReturnType<typeof tax.vatReturn>> | null>(null);
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState(2);
  const [error, setError] = useState<string | null>(null);

  async function loadCodes() {
    try { setCodes((await tax.listCodes()).items); } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadCodes(); }, []);

  async function seed() { await tax.seedCodes(); await loadCodes(); }
  async function runReturn() {
    setError(null);
    try { setRet(await tax.vatReturn(year, quarter)); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <SectionCard
        title={a.taxCodes}
        actions={codes.length === 0 && <Button variant="outline" onClick={seed}>{a.seedCodes}</Button>}
        flush
      >
        <DataTable
          columns={[
            { key: "code", label: a.colCode, className: "font-mono", render: (r: TaxCodeT) => r.code },
            { key: "name", label: a.colName },
            { key: "rate", label: a.colRate, align: "end" },
          ]}
          rows={codes}
          rowKey={(r) => r.id}
          empty={c.noData}
          loading={loading}
        />
      </SectionCard>

      <ActionBar hint={a.cashSplitHint}>
        <span className="text-sm font-medium text-gray-700 me-1">{a.vatReturn}</span>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
        />
        <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className={SELECT}>
          <option value={1}>Q1</option>
          <option value={2}>Q2</option>
          <option value={3}>Q3</option>
          <option value={4}>Q4</option>
        </select>
        <Button onClick={runReturn}>{a.runBtn}</Button>
        {ret && (
          <Button variant="outline" onClick={() => downloadFile(
            `/accounting/tax/vat-return?year=${year}&quarter=${quarter}&format=xlsx`,
            `vat-return-${year}-Q${quarter}.xlsx`)}>{c.downloadExcel}</Button>
        )}
      </ActionBar>

      {ret && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label={a.outputVat} value={<Money value={ret.output_vat} dash />} />
            <StatTile label={a.inputVat} value={<Money value={ret.input_vat} dash />} />
            <StatTile label={`${a.netLabel} ${ret.direction}`} value={<Money value={ret.net_payable} dash />} />
          </div>

          {ret.cash_split && (
            <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-gold-dark">
              <Money value={ret.cash_split.cash_75} /> ({a.cashSplitHint}) +{" "}
              <Money value={ret.cash_split.transfer_25} /> — {ret.cash_split.bdl_account}
              <div className="text-xs mt-1 text-gold-dark/70">{ret.cash_split.note}</div>
            </div>
          )}

          <SectionCard title={a.vatReturn} flush>
            <DataTable
              columns={[
                { key: "entry_no", label: a.colEntry, className: "font-mono", render: (r: VatTxn) => r.entry_no },
                { key: "date", label: a.colDate },
                { key: "kind", label: a.colKind },
                { key: "vat", label: a.colVat, align: "end", render: (r: VatTxn) => <Money value={r.vat} dash /> },
              ]}
              rows={ret.transactions}
              rowKey={(_, i) => String(i)}
              empty={a.empty}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
