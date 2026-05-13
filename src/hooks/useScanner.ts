"use client";
import { useEffect } from "react";

export function useScanner(onScan: (code: string) => void) {
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    const FAST_MS = 50;

    const onKey = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime > 500) buffer = "";
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 5) onScan(buffer.trim());
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onScan]);
}
