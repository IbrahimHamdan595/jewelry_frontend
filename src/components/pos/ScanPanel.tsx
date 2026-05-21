"use client";
import { useState } from "react";
import { ScanLine, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onScan: (code: string) => Promise<void>;
  scanError: string | null;
}

export function ScanPanel({ onScan, scanError }: Props) {
  const [manual, setManual] = useState("");

  async function handleManual() {
    const code = manual.trim();
    if (!code) return;
    await onScan(code);
    setManual("");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-pos-gray text-[10px] uppercase tracking-widest">
            Capture
          </p>
          <p className="text-pos-gray/60 text-[10px] uppercase tracking-widest">
            Step 01
          </p>
        </div>

        <div
          className={`relative border rounded-xl px-6 py-10 text-center transition-colors ${
            scanError
              ? "border-red-500/60 bg-red-900/10"
              : "border-gold/30 bg-gold/5"
          }`}
        >
          {scanError ? (
            <>
              <p className="text-red-400 text-xs uppercase tracking-widest mb-2">
                Item not found
              </p>
              <p className="text-red-300/70 text-sm font-mono break-all">
                {scanError}
              </p>
            </>
          ) : (
            <>
              <ScanLine className="w-10 h-10 mx-auto text-gold/60 mb-3" />
              <p className="text-pos-cream text-sm tracking-widest uppercase">
                Ready to scan
              </p>
              <p className="text-pos-gray text-xs mt-1.5">
                Point scanner at barcode or enter code below
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <p className="text-pos-gray text-[10px] uppercase tracking-widest mb-2">
          Manual entry
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pos-gray/60 pointer-events-none" />
            <Input
              dark
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManual()}
              placeholder="Product code…"
              className="pl-9"
            />
          </div>
          <Button
            onClick={handleManual}
            disabled={!manual.trim()}
            className="shrink-0 px-5"
          >
            Find
          </Button>
        </div>
      </div>
    </div>
  );
}
