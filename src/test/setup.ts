// Run every test on a UTC clock, like CI and Vercel. This machine happens to
// sit in Asia/Beirut, which would let timezone bugs pass locally by accident.
process.env.TZ = "UTC";

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Node ≥ 22 defines an experimental `localStorage` global that shadows jsdom's
// and reads as undefined without --localstorage-file. Give tests a real
// in-memory Storage so code like LanguageProvider (localStorage "lang") runs.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true, writable: true });
}
