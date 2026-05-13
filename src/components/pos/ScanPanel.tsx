"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoldRateCard } from "@/components/shared/GoldRateCard";

interface Props {
  onScan: (code: string) => Promise<void>;
  scanError: string | null;
}

export function ScanPanel({ onScan, scanError }: Props) {
  const [manual, setManual] = useState("");
  const hiddenRef = useRef<HTMLInputElement>(null);

  async function handleManual() {
    const code = manual.trim();
    if (!code) return;
    await onScan(code);
    setManual("");
  }

  return (
    <div className="space-y-6">
      {/* Capture section */}
      <div>
        <p className="text-pos-gray text-[10px] uppercase tracking-widest mb-3">
          01 · CAPTURE
        </p>

        {/* Hidden input that captures barcode scanner keystrokes */}
        <input
          ref={hiddenRef}
          autoFocus
          onBlur={(e) => e.target.focus()}
          onChange={() => {}}
          className="sr-only"
          aria-label="Barcode scanner input"
        />

        {/* Visual feedback box */}
        <div
          className={`border-2 rounded-lg p-5 text-center transition-colors ${
            scanError
              ? "border-red-500/60 bg-red-900/10"
              : "border-gold/40 bg-white/3"
          }`}
        >
          {scanError ? (
            <>
              <p className="text-red-400 text-xs uppercase tracking-widest mb-1">
                ITEM NOT FOUND
              </p>
              <p className="text-red-300/60 text-xs italic font-mono">{scanError}</p>
            </>
          ) : (
            <p className="text-pos-gray text-sm tracking-wider">READY TO SCAN</p>
          )}
        </div>

        {/* Manual fallback */}
        <div className="flex gap-2 mt-3">
          <Input
            dark
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManual()}
            placeholder="Manual code…"
          />
          <Button variant="outline" size="sm" onClick={handleManual}
            className="border-white/15 text-pos-gray hover:text-white hover:border-white/30 shrink-0"
          >
            FIND
          </Button>
        </div>
      </div>

      {/* Gold rate section */}
      <div>
        <p className="text-pos-gray text-[10px] uppercase tracking-widest mb-3">
          02 · LIVE GOLD RATE
        </p>
        <GoldRateCard />
      </div>
    </div>
  );
}
